---
name: quackblocks
description: Write Obsidian markdown documents that use QuackBlocks — an Obsidian plugin that executes SQL (DuckDB) against parquet files and renders inline tables and charts. Use this skill when the user wants to create documents with SQL queries, analyse parquet data, build reports with charts and tables, or mentions QuackBlocks or quack code blocks.
---

# QuackBlocks

QuackBlocks is an Obsidian plugin. Code blocks tagged `quack` execute SQL against parquet files and render results as tables or Observable Plot SVG charts, inline in the note. Documents export cleanly to PDF.

Read `references/syntax.md` for the full syntax reference — chart types, options, color schemes, and SQL capabilities.

## What you produce

A single `.md` file with:
- YAML frontmatter declaring parquet datasources
- `quack` code blocks containing SQL (tables) or chart directives + SQL (charts)
- A `table-of-contents` code block for auto-generated TOC
- Standard Obsidian markdown around them — prose, headings, callouts, lists, footnotes, whatever suits the content

## Before writing SQL

Always inspect the parquet files first so you know the columns, types, and data values:

```bash
python3 -c "
import pyarrow.parquet as pq
schema = pq.read_schema('/absolute/path/to/file.parquet')
print(f'Rows: {pq.read_metadata(\"/absolute/path/to/file.parquet\").num_rows}')
for field in schema:
    print(f'  {field.name}: {field.type}')
"
```

```bash
python3 -c "
import pyarrow.parquet as pq
t = pq.read_table('/absolute/path/to/file.parquet')
print(t.to_pandas().head(10).to_string())
"
```

If pyarrow is unavailable, fall back to DuckDB CLI:
```bash
duckdb -c "DESCRIBE SELECT * FROM read_parquet('/path/to/file.parquet')"
duckdb -c "SELECT * FROM read_parquet('/path/to/file.parquet') LIMIT 10"
```

## Quick reference

### Frontmatter

```yaml
---
datasources:
  table_name: relative/path/to/file.parquet
  other_table: /absolute/path/to/external.parquet
  home_data: ~/datasets/file.parquet
plotDefaults:
  width: 600
  height: 350
---
```

Paths can be relative (from the note's location), absolute (`/Users/joey/data/file.parquet`), or use `~` home directory expansion (`~/data/file.parquet`).

### Table block

````
```quack
SELECT species, COUNT(*) as n, ROUND(AVG(mass), 0) as avg_mass
FROM animals
GROUP BY species
ORDER BY avg_mass DESC
```
````

### Chart block

````
```quack
chart=bar { "x": "species", "y": "avg_mass", "fill": "species", "color": { "scheme": "ylgnbu", "legend": true } }
SELECT species, ROUND(AVG(mass), 0) as avg_mass
FROM animals
GROUP BY species
ORDER BY avg_mass DESC
```
````

The directive is always the **first line** of the code block content. SQL follows on subsequent lines.

### Captions

Add `caption="..."` to any block for a styled caption beneath the output:

````
```quack
chart=bar caption="Revenue by region" { "x": "region", "y": "total", "fill": "region" }
SELECT region, SUM(amount) as total FROM revenue GROUP BY region
```
````

````
```quack
caption="Summary statistics"
SELECT species, COUNT(*) as n FROM animals GROUP BY species
```
````

### Table of contents

An auto-generated TOC is available via a separate plugin. Add an empty code block:

````
```table-of-contents
```
````

Section numbering is handled automatically by another plugin — just write headings normally.

### Chart type cheat sheet

| Type | Directive | When to use |
|------|-----------|-------------|
| Vertical bars | `chart=bar` | Comparing categories |
| Horizontal bars | `chart=barX` | Long category names, rankings |
| Line | `chart=line` | Time series, trends |
| Area | `chart=area` | Volume, distributions |
| Scatter | `chart=dot` | Correlations, two numeric vars |
| Heatmap | `chart=cell` | Cross-tabulations, matrices |
| Box plot | `chart=boxY` | Distribution spread by group |
| Histogram | `chart=rect` | Frequency distributions |
| Waffle | `chart=waffleY` | Part-of-whole comparisons |

### Common options

- `"fill": "column"` — color by a column
- `"stroke": "column"` — line color by column
- `"r": 5` — dot radius
- `"color": { "scheme": "ylgnbu" }` — color scheme
- `"color": { "legend": true }` — show legend
- `"marginLeft": 100` — more space for y-axis labels (useful for heatmaps)
- `"grid": true` — show gridlines
- `"tip": true` — enable hover tooltips
- `"fx": "column"` / `"fy": "column"` — facet into small multiples

Schemes: `ylgnbu`, `blues`, `reds`, `viridis`, `magma`, `turbo`, `spectral`, `tableau10`, `observable10`

## Guidelines

**SQL:**
- Always alias computed columns: `SUM(x) as total`
- Use `ROUND()` for decimals
- Always `ORDER BY` for meaningful sort
- Use CTEs over nested subqueries
- Joins work across all tables declared in frontmatter

**Charts vs tables:**
- Tables when exact numbers matter or many columns
- Charts when the shape/trend/comparison is the point
- Add context before each block (what are we looking at?) and interpretation after (what does it show?)

**Heatmaps (`chart=cell`):**
- Use `"fill"` with a numeric column for the color intensity
- Set `"color": { "scheme": "..." }` — without a scheme, continuous fills default to black
- Add `"marginLeft": 100` when y-axis labels are long

**Area/rect charts:**
- These get a default fill color automatically if you don't specify `"fill"` or `"stroke"`
- For colored area by category, set `"fill": "column_name"`

## Saving

Default location: `reports/` in the vault root. Use descriptive filenames like `penguin-morphometrics.md`.

After saving, tell the user to open it in Obsidian to see live results, and that they can export to PDF.
