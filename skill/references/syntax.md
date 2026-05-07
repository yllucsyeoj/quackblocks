# QuackBlocks Syntax Reference

## Frontmatter

Every QuackBlocks document starts with YAML frontmatter declaring parquet datasources.

```yaml
---
datasources:
  sales: data/sales.parquet
  products: data/products.parquet
plotDefaults:
  width: 600
  height: 350
---
```

- `datasources` (required): Maps table names to `.parquet` file paths. Keys become DuckDB table names.
- `plotDefaults` (optional): Default Observable Plot options applied to all charts. Per-block options override these.

### Paths

- **Relative paths** resolve from the note's location: if note is in `reports/` and data in `data/`, use `../data/file.parquet`
- **Absolute paths** are supported for data outside the vault: `/Users/joey/datasets/big.parquet`
- **`~` expansion** resolves to the user's home directory: `~/datasets/big.parquet`

## Code Blocks

Use ` ```quack ` fenced code blocks. Two modes:

### Table (default)

No directive line — entire content is SQL:

````
```quack
SELECT region, SUM(amount) as total
FROM revenue
GROUP BY region
ORDER BY total DESC
```
````

### Chart

Directive on the FIRST LINE of the block content, SQL on subsequent lines:

````
```quack
chart=bar { "x": "region", "y": "total", "fill": "region" }
SELECT region, SUM(amount) as total
FROM revenue
GROUP BY region
ORDER BY total DESC
```
````

**IMPORTANT:** The directive MUST be the first line inside the code block, NOT on the opening fence. This is required for PDF export compatibility.

## Chart Types

| Directive | Observable Plot Mark | Best for |
|-----------|---------------------|----------|
| `chart=bar` | `Plot.barY()` | Categorical comparisons, rankings |
| `chart=barX` | `Plot.barX()` | Horizontal bars, long category names |
| `chart=line` | `Plot.lineY()` | Trends over time, sequences |
| `chart=area` | `Plot.areaY()` | Volume over time, distributions |
| `chart=dot` | `Plot.dot()` | Scatter plots, correlations |
| `chart=cell` | `Plot.cell()` | Heatmaps, matrices, cross-tabulations |
| `chart=rect` | `Plot.rect()` | Histograms, 2D binning |
| `chart=boxY` | `Plot.boxY()` | Distribution comparison (vertical box plots) |
| `chart=boxX` | `Plot.boxX()` | Distribution comparison (horizontal box plots) |
| `chart=waffleY` | `Plot.waffleY()` | Part-of-whole (vertical waffle) |
| `chart=waffleX` | `Plot.waffleX()` | Part-of-whole (horizontal waffle) |
| `chart=text` | `Plot.text()` | Label placement on charts |

## Chart Options

The JSON object after `chart=<type>` contains both mark-level and plot-level options. The plugin separates them automatically.

### Mark-level options (data mapping)

- `"x"` — column for x-axis (string = column name)
- `"y"` — column for y-axis (string = column name)
- `"fill"` — column for color-coding areas/bars, or a fixed CSS color string
- `"stroke"` — column for line/border color, or a fixed CSS color string
- `"r"` — dot radius (number or column name)
- `"opacity"` — 0 to 1
- `"sort"` — e.g. `{ "x": "y" }` sorts x-axis by y values
- `"tip"` — `true` to enable hover tooltips (supported marks only)

### Plot-level options (chart container)

- `"width"`, `"height"` — dimensions in pixels
- `"marginLeft"`, `"marginRight"`, `"marginTop"`, `"marginBottom"` — padding in pixels (default marginLeft is 60; use 100+ for heatmaps with long y-axis labels)
- `"grid"` — `true` to show gridlines
- `"title"`, `"subtitle"`, `"caption"` — chart annotations
- `"facet"` — faceting config object

### Color scale options

The `"color"` key controls the color scale. Pass an object for plot-level config:

- `"color": { "scheme": "ylgnbu" }` — use a named color scheme (continuous or categorical)
- `"color": { "legend": true }` — show a color legend
- `"color": { "scheme": "blues", "legend": true }` — both
- `"color": { "domain": ["A", "B", "C"] }` — fix the domain

Common schemes: `"ylgnbu"`, `"blues"`, `"reds"`, `"greens"`, `"viridis"`, `"magma"`, `"turbo"`, `"spectral"`, `"rdylgn"`, `"tableau10"`, `"observable10"`

When no scheme is specified, the plugin uses a built-in 20-color Tableau-inspired palette.

### Dual keys

`"x"`, `"y"`, `"fx"`, `"fy"`, and `"color"` are context-sensitive:
- **String value** → mark-level (column mapping): `"x": "species"`
- **Object value** → plot-level (axis/scale config): `"x": { "label": "Species Name" }`

## SQL Engine

DuckDB SQL with full analytical capabilities:

- **Aggregates:** SUM, AVG, COUNT, MIN, MAX, MEDIAN, STDDEV, QUANTILE
- **Window functions:** ROW_NUMBER(), RANK(), LAG(), LEAD(), NTILE()
- **String:** CONCAT, LOWER, UPPER, REGEXP_MATCHES, REGEXP_EXTRACT
- **Date:** DATE_TRUNC, DATE_PART, STRFTIME, DATE_DIFF
- **Math:** ROUND, ABS, CEIL, FLOOR, LN, LOG, POWER
- **CTEs:** WITH ... AS (...) SELECT ...
- **Joins:** All types — tables from the same note's datasources can see each other
- **Other:** CAST, COALESCE, CASE WHEN, UNNEST, GENERATE_SERIES

## Constraints

- **Parquet only** — no CSV or JSON
- **Table names come from frontmatter** — `datasources.sales` → `FROM sales`
- **Charts need numeric y-axis** — ensure aggregated/computed values are numbers
- **No cross-note queries** — each note's datasources are scoped to that note
- **Desktop only** — DuckDB WASM requires Electron (Obsidian desktop)
