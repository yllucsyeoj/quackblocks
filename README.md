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

Paths are resolved relative to the note's directory. Absolute paths and `~` home directory expansion are also supported:

```yaml
---
datasources:
  sales: ./data/sales.parquet        # relative to note
  bigdata: ~/datasets/large.parquet  # expands to $HOME/datasets/large.parquet
  external: /mnt/data/file.parquet   # absolute path
---
```

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

### Chart configuration

Chart options inside `{ ... }` are passed to [Observable Plot](https://obsidian.md/plot). Most options work exactly as documented there. QuackBlocks automatically separates **plot-level** options (axes, margins, size) from **mark-level** options (data encodings like `x`, `y`, `fill`).

#### Plot-level options

| Option | Description |
|--------|-------------|
| `width` / `height` | Chart size in pixels |
| `marginLeft` / `marginRight` / `marginTop` / `marginBottom` | Margin overrides |
| `title` / `subtitle` / `caption` | Chart titles |
| `grid` | Show grid lines (`true` or axis name) |
| `style` | CSS styles object |
| `facet` | Faceting configuration |

#### Mark-level options

| Option | Description |
|--------|-------------|
| `x` / `y` | Column name or axis config object for the mark |
| `fx` / `fy` | Facet column names |
| `stroke` / `fill` | Column name for color encoding |
| `r` | Dot radius column or constant |
| `tip` | Enable tooltips (`true`) |

When a dual-purpose key like `x` or `color` is a **string**, it maps to a column (mark-level). When it's an **object**, it becomes plot-level axis configuration:

```quack
chart=bar { "x": "month", "y": "revenue", "color": { "scheme": "blues", "legend": true } }
```

#### Color

QuackBlocks injects a 20-color categorical palette by default. You can override it:

```quack
chart=dot { "x": "x", "y": "y", "stroke": "category", "color": { "range": ["#e41a1c", "#377eb8"] } }
```

Or use a continuous scheme:

```quack
chart=cell { "x": "x", "y": "y", "fill": "value", "color": { "scheme": "blues" } }
```

#### Faceting

Split charts into small multiples with `fx` or `fy`:

```quack
chart=dot { "x": "bill_length", "y": "bill_depth", "fx": "species", "stroke": "sex" }
```

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

## Examples

See the [`examples/`](examples/) folder for a complete Palmer Penguins demo note with tables, bar charts, dot plots, box plots, and faceted charts.

## Claude Code Skill

A companion [Claude Code skill](https://docs.anthropic.com/en/docs/agents/skills) is included in [`skill/`](skill/). Install it to generate QuackBlocks reports from parquet files with natural language prompts.

```bash
# Copy the skill into your Claude skills directory
cp -r skill ~/.claude/skills/quackblocks
```

Then ask Claude: *"Analyze the sales data in ~/datasets/sales.parquet and create a QuackBlocks report with monthly revenue charts."*

## Development

```bash
npm install
npm run build
```

`npm run dev` watches `main.ts` and rebuilds on change.

## License

MIT
