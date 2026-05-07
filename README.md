# QuackBlocks

Executable SQL code blocks for Obsidian, powered by DuckDB WASM. Query local Parquet files and render results as inline tables or charts.

## Features

- **DuckDB WASM** — run analytical SQL directly inside Obsidian, no external server
- **Parquet datasources** — load tables from frontmatter-declared `.parquet` files
- **Inline tables** — query results render as formatted HTML tables
- **Inline charts** — visualize with Observable Plot (bar, line, area, dot, heatmap, box, waffle, and more)
- **Per-block options** — configure charts with a compact directive syntax
- **PDF export compatible** — charts use explicit SVG dimensions for reliable export

## Installation

### Manual install

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Copy them into your vault's `.obsidian/plugins/quackblocks/` folder
3. Enable **QuackBlocks** in Obsidian's Community Plugins settings

### BRAT

Add `joey/quackblocks` (or your repo path) to the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin list.

## Usage

### 1. Declare datasources in frontmatter

```yaml
---
datasources:
  sales: ./data/sales.parquet
  customers: ./data/customers.parquet
plotDefaults:
  color:
    legend: true
---
```

Paths are resolved relative to the note's directory. Absolute paths outside the vault are also supported.

### 2. Write `quack` code blocks

#### Table output

````markdown
```quack
SELECT region, SUM(amount) AS revenue
FROM sales
GROUP BY region
ORDER BY revenue DESC
```
````

#### Chart output

````markdown
```quack
chart=bar caption="Revenue by region" { "x": "region", "y": "revenue" }
SELECT region, SUM(amount) AS revenue
FROM sales
GROUP BY region
```
````

### Directive syntax

The first line of a `quack` block can contain directives:

| Directive | Description |
|-----------|-------------|
| `chart=<type>` | Render as a chart (see supported types below) |
| `caption="..."` | Add a caption/figure label |
| `{ ... }` | JSON options passed to Observable Plot |

Example with full options:

````markdown
```quack
chart=bar caption="Monthly revenue" { "x": "month", "y": "revenue", "color": { "scheme": "blues" } }
SELECT month, revenue FROM sales
```
````

### Supported chart types

| Type | Observable Plot mark |
|------|---------------------|
| `bar` | `Plot.barY` |
| `barX` | `Plot.barX` |
| `line` | `Plot.lineY` |
| `area` | `Plot.areaY` |
| `dot` | `Plot.dot` |
| `cell` | `Plot.cell` |
| `rect` | `Plot.rect` |
| `boxY` | `Plot.boxY` |
| `boxX` | `Plot.boxX` |
| `waffleY` | `Plot.waffleY` |
| `waffleX` | `Plot.waffleX` |
| `text` | `Plot.text` |

### Plot defaults

Set global defaults in frontmatter under `plotDefaults`. These are merged with per-block options (block wins).

```yaml
---
plotDefaults:
  width: 800
  height: 400
  color:
    legend: true
    scheme: "blues"
---
```

## Settings

| Setting | Description |
|---------|-------------|
| **Debug logging** | Log DuckDB lifecycle and query details to the developer console |
| **Default chart width** | Default width in pixels (overridable per block) |
| **Default chart height** | Default height in pixels (overridable per block) |

## Requirements

- Obsidian desktop app (uses Node.js `fs` for Parquet I/O)
- Parquet files for datasources

## Development

```bash
npm install
npm run build
```

`npm run dev` watches `main.ts` and rebuilds on change.

## License

MIT
