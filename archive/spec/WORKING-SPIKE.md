# Working Spike Plugin — Reference Code

This is the complete, tested, working spike plugin that runs DuckDB WASM inside Obsidian. It was validated on 2026-03-13 in Obsidian on macOS (Apple Silicon) with an iCloud-synced vault.

**This code works.** Use it as the starting point for the real build. The Electron workarounds in `_initDB()` are hard-won — do not simplify or "clean up" the worker loading, Buffer shim, or WASM Blob URL patterns without testing.

---

## Files

### manifest.json

```json
{
  "id": "datasql-spike",
  "name": "DataSQL Spike",
  "version": "0.0.1",
  "minAppVersion": "1.0.0",
  "description": "Spike test: DuckDB WASM in a code block processor",
  "author": "Joey",
  "isDesktopOnly": true
}
```

### package.json

```json
{
  "name": "datasql-spike",
  "version": "0.0.1",
  "description": "Spike: DuckDB WASM in Obsidian code block",
  "main": "main.js",
  "scripts": {
    "build": "esbuild main.ts --bundle --outfile=main.js --platform=browser --external:obsidian --external:electron --external:fs --external:path --format=cjs --target=es2020 && npm run copy-wasm",
    "copy-wasm": "cp node_modules/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm . && cp node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js .",
    "dev": "esbuild main.ts --bundle --outfile=main.js --platform=browser --external:obsidian --external:electron --external:fs --external:path --format=cjs --target=es2020 --watch"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "esbuild": "^0.20.0"
  },
  "dependencies": {
    "@duckdb/duckdb-wasm": "^1.32.0"
  }
}
```

### main.ts

```typescript
import { Plugin, normalizePath } from "obsidian";
import * as duckdb from "@duckdb/duckdb-wasm";

export default class DataSQLSpikePlugin extends Plugin {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;
  private initPromise: Promise<void> | null = null;

  // Get the absolute filesystem path to this plugin's directory
  private getPluginDir(): string {
    const adapter = this.app.vault.adapter as any;
    const basePath = adapter.basePath || adapter.getBasePath?.();
    return `${basePath}/${this.manifest.dir}`;
  }

  async onload() {
    console.log("[datasql-spike] Loading plugin...");
    console.log("[datasql-spike] Plugin dir:", this.manifest.dir);

    this.registerMarkdownCodeBlockProcessor(
      "datasql",
      async (source: string, el: HTMLElement, ctx) => {
        await this.renderQueryBlock(source.trim(), el);
      }
    );

    console.log("[datasql-spike] Code block processor registered for 'datasql'");
  }

  private async ensureDB(): Promise<duckdb.AsyncDuckDBConnection> {
    if (this.conn) return this.conn;

    if (!this.initPromise) {
      this.initPromise = this._initDB();
    }
    await this.initPromise;
    return this.conn!;
  }

  private async _initDB(): Promise<void> {
    console.log("[datasql-spike] Initializing DuckDB WASM...");

    try {
      const pluginDir = this.getPluginDir();
      console.log("[datasql-spike] Resolved plugin dir:", pluginDir);

      const fs = require("fs");
      const path = require("path");

      const wasmFilePath = path.join(pluginDir, "duckdb-eh.wasm");
      const workerFilePath = path.join(pluginDir, "duckdb-browser-eh.worker.js");

      console.log("[datasql-spike] Reading WASM from:", wasmFilePath);

      // ============================================================
      // CRITICAL: Electron Workaround #1 — Buffer Shim
      // ============================================================
      // The DuckDB browser worker bundle stubs out Node's buffer module
      // as an empty function: Hc=pr(()=>{})
      // But a bundled SHA-256 lib still does: var L = Hc().Buffer
      // which returns undefined. We inject a full Buffer class shim.
      const workerScript = fs.readFileSync(workerFilePath, "utf-8");

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
      // CRITICAL: Electron Workaround #2 — Regex patch Buffer fallback
      // ============================================================
      // The internal module resolver returns {} for the buffer module.
      // Code does Hc().Buffer which is undefined.
      // We patch every ).Buffer, to ).Buffer || globalThis.Buffer,
      // so the code falls back to our global shim.
      let patchedScript = workerScript;
      patchedScript = patchedScript.replace(
        /\)\.Buffer,/g,
        ').Buffer || globalThis.Buffer,'
      );

      // ============================================================
      // CRITICAL: Electron Workaround #3 — Blob URL for Worker
      // ============================================================
      // Electron's app://obsidian.md origin cannot load Workers from
      // file:// URLs (cross-origin restriction). We read the worker
      // script from disk and create a blob: URL instead.
      console.log("[datasql-spike] Patched worker script, creating Blob URL...");

      const workerBlob = new Blob(
        [fullBufferShim + patchedScript],
        { type: "application/javascript" }
      );
      const workerUrl = URL.createObjectURL(workerBlob);

      const logger = new duckdb.ConsoleLogger();
      const worker = new Worker(workerUrl);
      this.db = new duckdb.AsyncDuckDB(logger, worker);

      // ============================================================
      // CRITICAL: Electron Workaround #4 — Blob URL for WASM
      // ============================================================
      // The worker tries to fetch() the WASM binary. It expects a URL,
      // not an ArrayBuffer. We create a blob: URL from the file contents.
      const wasmBuffer = fs.readFileSync(wasmFilePath);
      console.log("[datasql-spike] WASM loaded, size:", wasmBuffer.byteLength);
      const wasmBlob = new Blob([wasmBuffer], { type: "application/wasm" });
      const wasmUrl = URL.createObjectURL(wasmBlob);
      console.log("[datasql-spike] WASM Blob URL created:", wasmUrl);
      await this.db.instantiate(wasmUrl);

      // Open a connection and seed test data
      this.conn = await this.db.connect();

      await this.conn.query(`
        CREATE TABLE revenue (
          month VARCHAR,
          amount INTEGER,
          region VARCHAR
        )
      `);

      await this.conn.query(`
        INSERT INTO revenue VALUES
          ('Jan', 12000, 'APAC'),
          ('Feb', 18500, 'APAC'),
          ('Mar', 9200, 'EU'),
          ('Apr', 24000, 'NA'),
          ('May', 15700, 'APAC')
      `);

      console.log("[datasql-spike] DuckDB initialized with test data");
    } catch (err) {
      console.error("[datasql-spike] DuckDB init failed:", err);
      this.initPromise = null; // allow retry
      throw err;
    }
  }

  private async renderQueryBlock(sql: string, el: HTMLElement): Promise<void> {
    el.innerHTML = `<div style="padding: 8px; color: #6b7280; font-family: monospace; font-size: 12px;">Running query...</div>`;

    if (!sql) {
      this.renderError(el, "Empty query — write some SQL!");
      return;
    }

    try {
      const conn = await this.ensureDB();
      const result = await conn.query(sql);

      const columns = result.schema.fields.map((f) => f.name);
      const rows: any[][] = [];

      for (let i = 0; i < result.numRows; i++) {
        const row: any[] = [];
        for (const col of columns) {
          const colData = result.getChild(col);
          row.push(colData?.get(i));
        }
        rows.push(row);
      }

      if (rows.length === 0) {
        el.innerHTML = `<div style="padding: 8px; color: #6b7280; font-style: italic;">Query returned 0 rows</div>`;
        return;
      }

      this.renderTable(el, columns, rows);
    } catch (err: any) {
      this.renderError(el, err.message || String(err));
    }
  }

  private renderTable(
    el: HTMLElement,
    columns: string[],
    rows: any[][]
  ): void {
    const table = el.createEl("table", {
      attr: {
        style:
          "border-collapse: collapse; font-family: sans-serif; font-size: 13px; width: 100%;",
      },
    });

    const thead = table.createEl("thead");
    const headerRow = thead.createEl("tr");
    for (const col of columns) {
      headerRow.createEl("th", {
        text: col,
        attr: {
          style:
            "text-align: left; padding: 6px 10px; border-bottom: 2px solid #d1d5db; color: #374151; font-weight: 600;",
        },
      });
    }

    const tbody = table.createEl("tbody");
    for (const row of rows) {
      const tr = tbody.createEl("tr");
      for (const val of row) {
        tr.createEl("td", {
          text: String(val ?? ""),
          attr: {
            style:
              "padding: 4px 10px; border-bottom: 1px solid #e5e7eb; color: #4b5563;",
          },
        });
      }
    }
  }

  private renderError(el: HTMLElement, message: string): void {
    el.innerHTML = "";
    const box = el.createEl("div", {
      attr: {
        style:
          "background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px 14px; font-family: monospace;",
      },
    });
    box.createEl("div", {
      text: "SQL Error",
      attr: {
        style: "font-size: 12px; font-weight: bold; color: #dc2626; margin-bottom: 4px;",
      },
    });
    box.createEl("div", {
      text: message,
      attr: { style: "font-size: 11px; color: #991b1b;" },
    });
  }

  async onunload() {
    console.log("[datasql-spike] Unloading...");
    if (this.conn) {
      await this.conn.close();
      this.conn = null;
    }
    if (this.db) {
      await this.db.terminate();
      this.db = null;
    }
    this.initPromise = null;
  }
}
```

---

## Setup Instructions

```bash
cd .obsidian/plugins/datasql-spike
npm install
npm run build
# Restart Obsidian, enable "DataSQL Spike" in Community Plugins
```

After build, the plugin directory should contain:
- `main.js` (built by esbuild)
- `manifest.json`
- `duckdb-eh.wasm` (~34MB, copied by build script)
- `duckdb-browser-eh.worker.js` (copied by build script)

## What This Spike Proves

1. DuckDB WASM boots inside Obsidian's Electron process
2. SQL queries execute and return results via Apache Arrow
3. Results render in code block processors as HTML tables
4. Error handling works (invalid SQL shows red error box)
5. The four Electron workarounds (Buffer shim, regex patch, Blob URL worker, Blob URL WASM) are necessary and sufficient
