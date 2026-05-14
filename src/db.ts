import * as duckdb from "@duckdb/duckdb-wasm";
import * as fs from "fs";
import { requestUrl } from "obsidian";
import type { QueryResult, CellValue } from "./types";

class QuackLogger implements duckdb.Logger {
  constructor(private debug: boolean) {}
  log(entry: duckdb.LogEntryVariant): void {
    const label = duckdb.getLogLevelLabel(entry.level);
    if (entry.level >= duckdb.LogLevel.WARNING) {
      console.warn(`[quackblocks/duckdb] ${label}`);
    } else if (this.debug) {
      console.debug(`[quackblocks/duckdb] ${label}`);
    }
  }
}

export class DuckDBManager {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;
  private initPromise: Promise<void> | null = null;
  private blobUrls: string[] = [];
  private loadedTables = new Map<string, string>(); // tableName -> absolutePath
  private queryCache = new Map<string, QueryResult>();
  private debug = false;

  async init(debug = false): Promise<void> {
    if (this.conn) return;
    this.debug = debug;
    if (!this.initPromise) {
      this.initPromise = this._init(debug);
    }
    await this.initPromise;
  }

  private async _init(debug = false): Promise<void> {
    if (debug) console.debug("[quackblocks] Initializing DuckDB WASM...");

    try {
      // ============================================================
      // Load DuckDB bundles from jsDelivr CDN (BRAT-compatible)
      // ============================================================
      const bundles = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(bundles);

      if (!bundle.mainWorker || !bundle.mainModule) {
        throw new Error("DuckDB bundle selection failed: missing worker or module URL");
      }

      // ============================================================
      // CRITICAL: Electron Workaround #1 — Buffer Shim
      // ============================================================
      const fullBufferShim = `
// Full Buffer shim for DuckDB worker in Electron Blob context
(function() {
  if (typeof globalThis.Buffer !== 'undefined') return;

  class FakeBuffer extends Uint8Array {
    static from(data, encodingOrOffset, length) {
      if (typeof data === 'string') {
        return new FakeBuffer(new TextEncoder().encode(data));
      }
      if (data instanceof ArrayBuffer) {
        return new FakeBuffer(data);
      }
      if (ArrayBuffer.isView(data)) {
        return new FakeBuffer(data.buffer, data.byteOffset, data.byteLength);
      }
      if (Array.isArray(data)) {
        return new FakeBuffer(data);
      }
      return new FakeBuffer(data);
    }
    static alloc(size, fill) {
      const buf = new FakeBuffer(size);
      if (fill !== undefined) buf.fill(fill);
      return buf;
    }
    static allocUnsafe(size) {
      return new FakeBuffer(size);
    }
    static isBuffer(obj) {
      return obj instanceof FakeBuffer;
    }
    static concat(list, totalLength) {
      if (!totalLength) totalLength = list.reduce((a, b) => a + b.length, 0);
      const result = new FakeBuffer(totalLength);
      let offset = 0;
      for (const buf of list) {
        result.set(buf, offset);
        offset += buf.length;
      }
      return result;
    }
    toString(encoding) {
      return new TextDecoder().decode(this);
    }
  }

  globalThis.Buffer = FakeBuffer;
})();
`;

      // ============================================================
      // CRITICAL: Electron Workaround #2 — Fetch & patch worker
      // ============================================================
      const workerResponse = await requestUrl({ url: bundle.mainWorker });
      let workerScript = workerResponse.text;

      // Patch every ).Buffer, to ).Buffer || globalThis.Buffer,
      workerScript = workerScript.replace(
        /\)\.Buffer,/g,
        ').Buffer || globalThis.Buffer,'
      );

      const workerBlob = new Blob(
        [fullBufferShim + workerScript],
        { type: "application/javascript" }
      );
      const workerUrl = URL.createObjectURL(workerBlob);
      this.blobUrls.push(workerUrl);

      const logger = new QuackLogger(debug);
      const worker = new Worker(workerUrl);
      this.db = new duckdb.AsyncDuckDB(logger, worker);

      // ============================================================
      // CRITICAL: Electron Workaround #3 — Blob URL for WASM
      // ============================================================
      const wasmResponse = await requestUrl({ url: bundle.mainModule });
      const wasmBuffer = wasmResponse.arrayBuffer;
      const wasmBlob = new Blob([wasmBuffer], { type: "application/wasm" });
      const wasmUrl = URL.createObjectURL(wasmBlob);
      this.blobUrls.push(wasmUrl);

      await this.db.instantiate(wasmUrl);
      this.conn = await this.db.connect();

      if (debug) console.debug("[quackblocks] DuckDB initialized");
    } catch (err) {
      console.error("[quackblocks] DuckDB init failed:", err);
      this.initPromise = null;
      throw err;
    }
  }

  async loadParquet(tableName: string, absolutePath: string): Promise<void> {
    // Skip if already loaded from the same path
    if (this.loadedTables.get(tableName) === absolutePath) return;
    if (!this.db || !this.conn) {
      throw new Error("DuckDB not initialized");
    }

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    const buffer: Buffer = fs.readFileSync(absolutePath);
    const fileName = `${tableName}.parquet`;
    await this.db.registerFileBuffer(fileName, new Uint8Array(buffer));
    await this.conn.query(
      `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM read_parquet('${fileName}')`
    );
    this.loadedTables.set(tableName, absolutePath);
    // Clear query cache when tables change
    this.queryCache.clear();
    if (this.debug) console.debug(`[quackblocks] Loaded table "${tableName}" from ${absolutePath}`);
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.conn) {
      throw new Error("DuckDB not initialized");
    }

    // Return cached result if SQL hasn't changed
    const cached = this.queryCache.get(sql);
    if (cached) return cached;

    const result = await this.conn.query(sql);

    const columns = result.schema.fields.map((f) => f.name);
    const rows: CellValue[][] = [];

    for (let i = 0; i < result.numRows; i++) {
      const row: CellValue[] = [];
      for (const col of columns) {
        const colData = result.getChild(col);
        let val: unknown = colData?.get(i);
        // DuckDB Arrow returns BigInt for integer columns — coerce to Number
        if (typeof val === "bigint") {
          val = Number(val);
        }
        row.push(val as CellValue);
      }
      rows.push(row);
    }

    const queryResult = { columns, rows };
    this.queryCache.set(sql, queryResult);
    return queryResult;
  }

  async close(): Promise<void> {
    if (this.conn) {
      await this.conn.close();
      this.conn = null;
    }
    if (this.db) {
      await this.db.terminate();
      this.db = null;
    }
    for (const url of this.blobUrls) {
      URL.revokeObjectURL(url);
    }
    this.blobUrls = [];
    this.loadedTables.clear();
    this.queryCache.clear();
    this.initPromise = null;
  }
}
