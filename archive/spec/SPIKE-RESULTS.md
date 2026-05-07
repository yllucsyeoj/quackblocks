# DataSQL Plugin — Spike Results

## Overview

Two spikes were run to validate the core technical unknowns before committing to the full build. Both passed.

---

## Spike 1: Inline SVG in Obsidian PDF Export

**Question:** Does Obsidian's native PDF export correctly render inline SVG elements embedded in markdown?

**Method:** Created a test note with three inline SVGs — a simple bar chart with flat fills, a bar chart with `<defs>` gradients and rounded corners, and a styled error box. Tested rendering in Edit Mode, Reading View, and PDF export.

**Results:**

| Context | Simple SVG | Gradients | Error Box |
|---------|-----------|-----------|-----------|
| Edit Mode | ✅ Renders | ✅ Renders | ✅ Renders |
| Reading View | ✅ Renders | ❌ Stripped | ✅ Renders |
| PDF Export | ✅ Renders | ✅ Renders | ✅ Renders |

**Key Finding:** Obsidian's Reading View sanitizes SVG — it strips `<defs>` blocks and `url()` references (likely a security measure against embedded scripts). However, PDF export works perfectly for all SVG features including gradients. Importantly, SVG rendered by a plugin's code block processor may bypass this sanitization since the plugin controls DOM insertion directly — this needs verification during the real build.

**Implication:** Inline SVG is confirmed as the rendering strategy. Observable Plot's default output (flat fills, strokes, text) will work everywhere. Gradient features may only display correctly in PDF export and Edit Mode unless the plugin rendering path bypasses sanitization.

---

## Spike 2: DuckDB WASM in an Obsidian Plugin

**Question:** Can DuckDB WASM initialize and execute queries inside an Obsidian plugin's code block processor?

**Method:** Built a minimal Obsidian plugin that registers a `datasql` code block processor, boots DuckDB WASM, seeds a test table, and renders query results as HTML tables.

**Results:** ✅ Working after resolving three Electron-specific issues.

### Issues Encountered and Solutions

#### Issue 1: `require.resolve` is not a function

**Cause:** `require.resolve` is a Node.js API unavailable in Obsidian's Electron renderer context. The initial approach tried to use it to locate WASM bundle files.

**Solution:** Read files from disk using Node's `fs` module (available in Electron) and reference them by filesystem path instead of module resolution.

#### Issue 2: Worker cannot be loaded from `file://` URL

**Error:** `Failed to construct 'Worker': Script at 'file:///...' cannot be accessed from origin 'app://obsidian.md'`

**Cause:** Electron's Chromium security model blocks cross-origin Worker instantiation. The `app://obsidian.md` origin cannot load Workers from `file://` URLs.

**Solution:** Read the worker JavaScript file from disk via `fs.readFileSync()`, wrap it in a `Blob`, and create a `blob:` URL via `URL.createObjectURL()`. Electron allows Workers from `blob:` URLs.

```typescript
const workerScript = fs.readFileSync(workerFilePath, "utf-8");
const workerBlob = new Blob([patchedScript], { type: "application/javascript" });
const workerUrl = URL.createObjectURL(workerBlob);
const worker = new Worker(workerUrl);
```

#### Issue 3: `Cannot read properties of undefined (reading 'from')` — Buffer shim

**Error:** The DuckDB browser worker bundle crashed on `Hc().Buffer.from(...)`.

**Cause:** The browser build of duckdb-wasm stubs out the Node `buffer` module as an empty function (`Hc=pr(()=>{})`), but a bundled SHA-256 implementation still tries to access `Buffer` through this internal module resolver. Running as a Blob URL worker means no Node globals are inherited, so `Buffer` is undefined through both `globalThis` and the internal module path.

**Solution:** Two-part fix:
1. Inject a full `Buffer` class shim (extending `Uint8Array`) at the top of the worker script before creating the Blob
2. Regex-patch the worker script to add a fallback: replace all occurrences of `).Buffer,` with `).Buffer || globalThis.Buffer,`

This ensures that when the internal module resolver returns an empty object, the code falls back to the global shim.

#### Issue 4: `Failed to construct 'Request': Failed to parse URL from [object ArrayBuffer]`

**Cause:** The `db.instantiate()` method was receiving a raw ArrayBuffer, but the worker internally tries to `fetch()` the WASM binary. It expects a URL string, not a buffer.

**Solution:** Wrap the WASM binary in a Blob URL, same pattern as the worker:

```typescript
const wasmBuffer = fs.readFileSync(wasmFilePath);
const wasmBlob = new Blob([wasmBuffer], { type: "application/wasm" });
const wasmUrl = URL.createObjectURL(wasmBlob);
await this.db.instantiate(wasmUrl);
```

### Final Working Architecture

```
Plugin loads
  → fs.readFileSync(worker.js) 
  → Inject Buffer shim + regex patch
  → Blob URL for worker
  → fs.readFileSync(wasm)
  → Blob URL for WASM
  → new Worker(workerBlobUrl)
  → db.instantiate(wasmBlobUrl)
  → DuckDB ready
  → Code block processor executes SQL
  → Results rendered as HTML table
```

### Build Configuration

- **esbuild platform:** `browser` (not `node`)
- **External modules:** `obsidian`, `electron`, `fs`, `path`
- **WASM files:** Must be copied from `node_modules/@duckdb/duckdb-wasm/dist/` into the plugin directory alongside `main.js`
- **Required files in plugin dir:** `main.js`, `manifest.json`, `duckdb-eh.wasm`, `duckdb-browser-eh.worker.js`

### Performance Notes

- WASM binary is ~34MB — first load takes a couple of seconds
- Subsequent queries execute near-instantly (DuckDB instance is cached)
- The `ConsoleLogger` emits verbose DuckDB lifecycle events — should be suppressed or filtered in production

---

## Spike Test Notes

The following test notes are available in the vault:

- `_spikes/svg-pdf-export-test.md` — SVG rendering tests (Spike 1)
- `_spikes/datasql-spike-test.md` — DuckDB query tests (Spike 2)
