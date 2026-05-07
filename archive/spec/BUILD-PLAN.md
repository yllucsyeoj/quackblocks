# DataSQL Plugin — Build Plan

This is the implementation plan for the DataSQL Obsidian plugin. It's designed to be followed sequentially in Claude Code, working directly in the plugin directory at `.obsidian/plugins/datasql/`.

---

## Pre-requisites

The spike POC at `.obsidian/plugins/datasql-spike/` has validated:

1. DuckDB WASM runs inside Obsidian's Electron process
2. Inline SVG renders correctly in Obsidian's PDF export
3. The specific Electron workarounds needed (Blob URL workers, Buffer shim, Blob URL WASM)

Reference `datasql-plugin/SPIKE-RESULTS.md` for the full details of these workarounds — they must be carried forward into the real build.

---

## Project Scaffold

```
.obsidian/plugins/datasql/
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── main.ts                  # Plugin entry point
├── src/
│   ├── db.ts                # DuckDB WASM lifecycle (init, connections, table loading)
│   ├── parser.ts            # Code block info string parser (chart type, options)
│   ├── frontmatter.ts       # Frontmatter parser (datasources, plotDefaults)
│   ├── renderer-table.ts    # HTML table renderer
│   ├── renderer-chart.ts    # Observable Plot SVG renderer
│   └── types.ts             # Shared type definitions
├── duckdb-eh.wasm           # Copied from node_modules at build time
└── duckdb-browser-eh.worker.js  # Copied from node_modules at build time
```

---

## Phase 1: Foundation

**Goal:** Restructure the spike into a clean, extensible plugin architecture. No new features — just the same table rendering from the spike, but with proper separation of concerns.

### Tasks

#### 1.1 — Scaffold the project

- Initialise `package.json` with dependencies: `@duckdb/duckdb-wasm`, `esbuild`, `obsidian` (types)
- Create `tsconfig.json` targeting ES2020, strict mode
- Create `esbuild.config.mjs` with:
  - `--platform=browser`
  - `--external:obsidian --external:electron --external:fs --external:path`
  - `--format=cjs`
  - Post-build step to copy WASM files into plugin root
- Create `manifest.json` with `isDesktopOnly: true`

#### 1.2 — Extract DuckDB lifecycle into `src/db.ts`

- Export a `DuckDBManager` class that owns:
  - DuckDB WASM instance init (with all Electron workarounds from the spike)
  - Connection pooling (single connection for now)
  - Table registration from parquet files
  - Query execution (takes SQL string, returns typed result rows + column names)
- The Electron workarounds to carry forward:
  - Read worker JS from disk via `fs.readFileSync`
  - Inject Buffer shim class (extending Uint8Array) at top of worker script
  - Regex-patch worker: replace `).Buffer,` → `).Buffer || globalThis.Buffer,`
  - Create worker via Blob URL (`URL.createObjectURL`)
  - Read WASM binary from disk, create Blob URL, pass URL to `db.instantiate()`
- Plugin directory path resolution via `this.app.vault.adapter.basePath + manifest.dir`
- Expose a clean async interface: `init()`, `loadParquet(tableName, filePath)`, `query(sql)`, `close()`

#### 1.3 — Extract table renderer into `src/renderer-table.ts`

- Export a function: `renderTable(el: HTMLElement, columns: string[], rows: any[][]): void`
- Move the HTML table rendering logic from the spike
- Style with inline styles (no external CSS dependency)

#### 1.4 — Extract error renderer

- Export a function: `renderError(el: HTMLElement, message: string): void`
- The red box error display from the spike
- Also export: `renderEmpty(el: HTMLElement): void` for zero-row results
- Also export: `renderLoading(el: HTMLElement): void` for the loading state

#### 1.5 — Wire up in `main.ts`

- Register `datasql` code block processor
- On render: parse frontmatter for datasources, ensure DuckDB is initialised, load tables, execute SQL, render table
- Verify this matches the spike's behaviour exactly before proceeding

#### 1.6 — Validation

- Test with the existing `_spikes/datasql-spike-test.md` note
- Confirm: basic SELECT renders table, aggregation works, error shows red box, empty result shows message
- Confirm: plugin loads/unloads cleanly (no leaked workers or connections)

---

## Phase 2: Parquet Data Loading

**Goal:** Load real parquet files declared in frontmatter into DuckDB tables.

### Tasks

#### 2.1 — Implement `src/frontmatter.ts`

- Export a function: `parseFrontmatter(frontmatter: any): { datasources: Record<string, string>, plotDefaults: Record<string, any> }`
- Extract `datasources` map (table name → relative file path)
- Extract `plotDefaults` object (or empty object if absent)
- Validate: all paths end in `.parquet`, table names are valid SQL identifiers

#### 2.2 — Implement parquet file loading in `src/db.ts`

- Add method: `loadParquet(tableName: string, absolutePath: string): Promise<void>`
- Read the parquet file from disk via `fs.readFileSync`
- Register the file in DuckDB's virtual filesystem via `db.registerFileBuffer()`
- Create the table: `CREATE TABLE {tableName} AS SELECT * FROM read_parquet('{filename}')`
- Track which tables are already loaded to avoid re-registration on re-renders

#### 2.3 — Resolve file paths relative to the note

- In the code block processor, get the current note's path from the `MarkdownPostProcessorContext`
- Resolve datasource paths relative to the note's directory, not the vault root
- Use Node `path.resolve()` with the vault base path

#### 2.4 — Handle missing files and bad parquet

- If a declared parquet file doesn't exist: render an error in any code block that queries the missing table
- If a file exists but isn't valid parquet: catch DuckDB's error and render it in the error box
- Don't block other queries — if `revenue.parquet` fails to load but `users.parquet` succeeds, queries against `users` should still work

#### 2.5 — Validation

- Create a test parquet file (use Python/pandas or DuckDB CLI to convert a small CSV to parquet)
- Create a test note with frontmatter declaring the parquet source
- Confirm: queries against the loaded table return correct data
- Confirm: missing file shows clear error
- Confirm: multiple datasources in one note work independently

---

## Phase 3: Chart Rendering

**Goal:** Parse chart directives from code block info strings and render Observable Plot SVG charts inline.

### Tasks

#### 3.1 — Add Observable Plot dependency

- Install `@observablehq/plot` (and its peer dep `d3` if needed)
- Verify it bundles correctly with esbuild
- Observable Plot's `Plot.plot()` returns an SVG element — confirm this works in Obsidian's DOM

#### 3.2 — Implement `src/parser.ts`

- Export a function: `parseDirectives(infoString: string): { chartType: string | null, chartOptions: Record<string, any> }`
- Parse the code block info string after `datasql`
- Extract `chart=<type>` if present
- Extract the JSON/JS object literal if present (everything between `{` and `}`)
- Use a lenient parser for the options object — either `JSON5` library or `new Function('return ' + str)()`
- If no `chart=` directive, return `{ chartType: null, chartOptions: {} }`

#### 3.3 — Implement chart type mapping

- Map short names to Observable Plot marks:
  - `bar` → `Plot.barY`
  - `barX` → `Plot.barX`
  - `line` → `Plot.lineY`
  - `area` → `Plot.areaY`
  - `dot` → `Plot.dot`
- The mapping should be a simple lookup object, easily extensible

#### 3.4 — Implement `src/renderer-chart.ts`

- Export a function: `renderChart(el: HTMLElement, data: any[], chartType: string, markOptions: Record<string, any>, plotDefaults: Record<string, any>): void`
- Deep-merge `plotDefaults` with per-block options (block wins)
- Separate mark-level options (`x`, `y`, `fill`, `stroke`, `sort`, etc.) from plot-level options (`width`, `height`, `margin*`, `color`, `style`)
- Construct the Plot call:
  ```typescript
  const mark = Plot[chartTypeMapping[chartType]](data, markOptions);
  const svg = Plot.plot({ ...plotLevelOptions, marks: [mark] });
  el.appendChild(svg);
  ```
- The SVG is inserted directly into the DOM — no image conversion needed

#### 3.5 — Wire chart rendering into `main.ts`

- In the code block processor: parse directives, then branch
  - No chart type → render table (existing path)
  - Chart type present → render chart (new path)
- Pass `plotDefaults` from frontmatter into the chart renderer

#### 3.6 — Validation

- Create a test note with parquet data and chart blocks:
  ```
  ```datasql chart=bar { "x": "month", "y": "amount" }
  SELECT month, amount FROM revenue ORDER BY month
  ```
  ```
- Confirm: bar chart renders as inline SVG
- Confirm: line, area, dot charts work
- Confirm: chart options (fill, stroke, sort) pass through correctly
- Confirm: plotDefaults from frontmatter apply
- Confirm: per-block options override plotDefaults
- **Confirm: PDF export captures the SVG chart correctly**
- Test: what happens when chart options reference a column that doesn't exist in the query result?

---

## Phase 4: Polish and Edge Cases

**Goal:** Handle real-world usage patterns and improve robustness.

### Tasks

#### 4.1 — DuckDB instance lifecycle

- Decide: one DuckDB instance per vault (shared) or per note?
  - Recommendation: one global instance, tables namespaced or re-registered per note
  - Risk: table name collisions across notes. Mitigation: prefix table names with note ID, or use DuckDB schemas
- Implement proper cleanup on plugin unload (terminate worker, revoke Blob URLs)
- Handle the case where the user edits frontmatter datasources mid-session (tables need re-registration)

#### 4.2 — Performance

- Debounce code block re-rendering to avoid redundant query execution during rapid edits in Live Preview
- Cache query results keyed by SQL string hash — if the SQL hasn't changed, don't re-execute
- Lazy-load DuckDB: don't initialise until the first `datasql` code block is actually encountered
- Consider: is 34MB WASM binary a problem for plugin size? DuckDB WASM ships an MVP bundle (~10MB) as an alternative, with slightly lower performance

#### 4.3 — Observable Plot SVG and Reading View

- Test: does plugin-injected SVG (via code block processor DOM insertion) bypass Obsidian's Reading View SVG sanitization?
- If yes: gradients and complex SVG features work everywhere
- If no: configure Observable Plot to avoid `<defs>`, gradients, and `url()` references in its SVG output (use flat fills only)

#### 4.4 — Error quality

- Improve error messages for common issues:
  - "Table 'x' not found" → "Table 'x' not found. Is it declared in frontmatter datasources?"
  - "File not found" → include the resolved absolute path so the user can debug
  - Parquet type mismatches → surface DuckDB's error with context

#### 4.5 — Theme awareness

- Detect Obsidian's current theme (light/dark)
- Set Observable Plot's `style.color` to `currentColor` and `style.background` to `transparent` by default
- This makes charts inherit the note's text color and background, matching both light and dark themes
- Table styling should also adapt (border colors, text colors)

#### 4.6 — Logging

- Replace `ConsoleLogger` with a filtered logger that suppresses DuckDB's verbose lifecycle events
- Keep errors and warnings visible
- Add a debug mode toggle (e.g., a plugin setting) for troubleshooting

---

## Phase 5: Developer Experience

**Goal:** Make the plugin pleasant to develop with and easy to extend.

### Tasks

#### 5.1 — Plugin settings

- Add a settings tab with:
  - Debug logging toggle
  - Default chart dimensions (fallback when no `plotDefaults` in frontmatter)
  - DuckDB WASM bundle choice (EH vs MVP — tradeoff between size and performance)

#### 5.2 — Hot reload in development

- `npm run dev` should watch for changes and rebuild
- Obsidian's hot reload plugin can pick up the new `main.js` without full restart
- Document the dev workflow in README

#### 5.3 — Test parquet generation utility

- Include a small script (Python or Node) that generates sample parquet files for testing
- Or: include a pre-built test parquet file in the repo

#### 5.4 — README and documentation

- Installation instructions
- Document format reference (frontmatter schema, code block syntax)
- Chart type reference with examples
- Link to Observable Plot docs for chart options
- Known limitations

---

## Implementation Notes for Claude Code

### Critical Electron Workarounds

These are non-negotiable — DuckDB WASM will not work in Obsidian without them. See `SPIKE-RESULTS.md` for full context.

1. **Worker must be loaded as Blob URL.** Read `duckdb-browser-eh.worker.js` from disk with `fs.readFileSync`, create `new Blob([script])`, then `URL.createObjectURL(blob)`. Do not try `new Worker('file://...')` — it fails with cross-origin error.

2. **Worker script must be patched at runtime.** The browser worker bundle has a broken Buffer stub. Prepend a full Buffer shim class (extending Uint8Array with `from`, `alloc`, `allocUnsafe`, `isBuffer`, `concat`, `toString` methods). Then regex-replace `).Buffer,` with `).Buffer || globalThis.Buffer,` throughout the script.

3. **WASM binary must be loaded as Blob URL.** Read `duckdb-eh.wasm` from disk, wrap in `new Blob([buffer], { type: "application/wasm" })`, create URL, pass to `db.instantiate(url)`. Do not pass ArrayBuffer directly — the worker tries to `fetch()` it.

4. **esbuild must use `--platform=browser`** with `--external:fs --external:path` so Node modules are available via Electron but not bundled.

5. **WASM files must be copied into the plugin directory** at build time. They are not bundled by esbuild.

### Observable Plot Integration

- `@observablehq/plot` returns SVG DOM elements from `Plot.plot()`
- These can be appended directly to the code block processor's `el` container
- The SVG should have explicit `width` and `height` attributes for PDF export sizing
- For the options object parser, `JSON5` is preferred over `new Function` eval — it's safer and handles trailing commas, unquoted keys, and single quotes

### File Path Resolution

```typescript
// ctx is MarkdownPostProcessorContext
const noteFile = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
const noteDir = noteFile?.parent?.path || "";
const adapter = this.app.vault.adapter as any;
const basePath = adapter.basePath;
const absolutePath = path.join(basePath, noteDir, relativePath);
```

### Frontmatter Access

```typescript
// In the code block processor, access frontmatter via:
const cache = this.app.metadataCache.getCache(ctx.sourcePath);
const frontmatter = cache?.frontmatter;
const datasources = frontmatter?.datasources || {};
const plotDefaults = frontmatter?.plotDefaults || {};
```

---

## Definition of Done

The plugin is ready for personal use when:

- [ ] A markdown note with parquet datasources in frontmatter can execute SQL queries
- [ ] Query results render as tables by default
- [ ] `chart=bar|line|area|dot` renders Observable Plot SVG inline
- [ ] Chart options pass through to Observable Plot correctly
- [ ] `plotDefaults` in frontmatter apply to all charts in the note
- [ ] Errors render as red boxes with helpful messages
- [ ] PDF export captures both tables and charts correctly
- [ ] Plugin loads/unloads cleanly without leaked resources
- [ ] Works in both light and dark Obsidian themes
