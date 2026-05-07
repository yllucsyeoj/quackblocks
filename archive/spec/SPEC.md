# DataSQL Plugin — Specification

## Vision

An Obsidian plugin that turns markdown notes into executable analytical documents. Users write SQL in fenced code blocks, and the plugin renders query results as inline tables or SVG charts. The rendered output survives PDF export, creating self-contained analytical reports that combine prose, data, and visualization.

---

## Core Principles

1. **Thin translation layer** — The plugin connects DuckDB (query engine) and Observable Plot (charting) with minimal abstraction. It does not invent its own query language or charting DSL.
2. **Parquet-only data** — No CSV, no JSON, no ETL. Users are expected to provide clean, typed data in parquet format. This eliminates an entire class of type inference and data quality bugs.
3. **Observable Plot is the API** — Chart configuration uses Observable Plot's native options object syntax. Observable Plot's documentation is this plugin's charting documentation.
4. **PDF-first output** — All rendering decisions prioritize correct PDF export over interactive features.
5. **Local-only** — All data stays on disk. No network calls, no cloud dependencies.

---

## Document Format

A DataSQL document is a standard Obsidian markdown note with two additions: frontmatter datasource declarations, and `datasql` fenced code blocks.

### Frontmatter

```yaml
---
datasources:
  revenue: data/revenue.parquet
  users: data/users.parquet
  events: ../shared-data/events.parquet

plotDefaults:
  width: 500
  height: 300
  color:
    scheme: "blues"
  style:
    fontSize: "14px"
    fontFamily: "Inter, sans-serif"
    background: "transparent"
---
```

#### `datasources` (required for any queries)

Maps table names to parquet file paths. Paths are **relative to the note's location** in the vault.

- Keys become DuckDB table names (e.g., `revenue` → `SELECT * FROM revenue`)
- Values are file paths to `.parquet` files
- Only `.parquet` files are supported
- Files are loaded into DuckDB on first query execution for that document
- If a file doesn't exist or isn't valid parquet, the relevant query blocks show an error

#### `plotDefaults` (optional)

Default options applied to all chart renders in the document. These map directly to `Plot.plot()` options from Observable Plot. Per-block chart options are deep-merged on top of these defaults (block options win on conflict).

Common defaults:
- `width` / `height` — Chart dimensions in pixels
- `color` — Color scale configuration (e.g., `{ scheme: "blues" }`)
- `style` — CSS properties applied to the SVG (e.g., font, background)
- `marginLeft`, `marginRight`, `marginTop`, `marginBottom` — Plot margins

Any valid `Plot.plot()` option can be specified here. See: https://observablehq.com/plot/features/plots

---

### Code Blocks

#### Table output (default)

````
```datasql
SELECT region, SUM(amount) as total
FROM revenue
GROUP BY region
ORDER BY total DESC
```
````

When no `chart=` directive is present, the query result renders as a styled HTML table.

#### Chart output

````
```datasql chart=bar { "x": "month", "y": "amount", "fill": "region" }
SELECT month, amount, region
FROM revenue
```
````

The first line of the code block info string contains:
1. `datasql` — The language tag (registers the code block processor)
2. `chart=<type>` — The chart type (optional, triggers chart rendering)
3. `{ ... }` — Observable Plot mark options as a JSON/JS object literal (optional, only relevant when chart type is specified)

#### Chart Type Mapping

| Directive | Observable Plot Mark | Notes |
|-----------|---------------------|-------|
| `chart=bar` | `Plot.barY()` | Vertical bars (most common) |
| `chart=barX` | `Plot.barX()` | Horizontal bars |
| `chart=line` | `Plot.lineY()` | Line chart |
| `chart=area` | `Plot.areaY()` | Area chart |
| `chart=dot` | `Plot.dot()` | Scatter plot |

Additional Plot mark types can be added later by extending this mapping.

#### Chart Options

The JSON object after `chart=<type>` is passed directly to the Observable Plot mark constructor. This means:

- `{ "x": "month", "y": "amount" }` → `Plot.barY(data, { x: "month", y: "amount" })`
- Any valid Observable Plot mark option works: `fill`, `stroke`, `opacity`, `sort`, `tip`, `r`, `fx`, `fy`, etc.
- Nested options work: `{ "x": "month", "y": "amount", "sort": { "x": "y" } }`
- Plot-level options (`width`, `height`, `margin*`, `color`, `style`) can also be included and will be passed to `Plot.plot()`

The plugin uses a lenient parser (JSON5 or equivalent) so users can write unquoted keys and single quotes for convenience:

````
```datasql chart=line { x: "date", y: "revenue", stroke: "#4f46e5" }
SELECT date, revenue FROM metrics ORDER BY date
```
````

#### Rendering Details

**Tables:**
- Rendered as styled HTML `<table>` elements
- Column headers from query result column names
- Basic styling: borders, padding, monospace values

**Charts:**
- Rendered as inline SVG via Observable Plot
- SVG is inserted directly into the DOM (no image files)
- Default dimensions from `plotDefaults` or Observable Plot defaults
- SVG works in Edit Mode, Reading View, and PDF export

**Errors:**
- Rendered as a styled red box with monospace error text
- Includes the DuckDB error message (which often includes helpful suggestions)
- The code block remains editable — user fixes the SQL and the output re-renders

**Empty results:**
- Rendered as a subtle "Query returned 0 rows" message

---

## Execution Model

### Data Loading

1. On first query execution in a document, the plugin reads the `datasources` frontmatter
2. For each declared source, it reads the parquet file from the vault using Obsidian's vault adapter / Node `fs`
3. Each file is registered as a DuckDB table with the declared name
4. Tables are cached for the lifetime of the DuckDB instance (per-document or global — see Architecture)

### Query Execution

1. When a `datasql` code block is rendered (entering Reading View, or on edit in live preview), the code block processor fires
2. The SQL is extracted from the code block content
3. The directive line is parsed for `chart=<type>` and options JSON
4. SQL is executed against the DuckDB connection
5. Results are rendered as a table or chart depending on directives

### Refresh Behaviour

- Queries re-execute when Obsidian re-renders the code block (e.g., switching to Reading View, or edits in Live Preview)
- No keystroke-level reactivity — rendering happens on Obsidian's standard markdown re-render cycle
- DuckDB instance and loaded tables persist across re-renders within the same session
- No file watching on parquet sources — if data changes, user reloads the note or restarts the plugin

---

## Non-Goals (v1)

- **No interactivity** — No filtering, dropdowns, or parameter inputs. This is a static rendering plugin.
- **No CSV/JSON support** — Parquet only. Clean data is a user responsibility.
- **No cross-note queries** — Each note's datasources are scoped to that note.
- **No data export** — The plugin renders results, it doesn't export them.
- **No custom SQL functions** — Whatever DuckDB WASM supports natively.
- **No mobile support** — DuckDB WASM requires desktop Electron. `isDesktopOnly: true`.
