# QuackBlocks — Next Up

## 1. External parquet file support
Verify and ensure parquet files outside the vault still load correctly (e.g. `~/datasets/big-file.parquet`). Users may not want to sync large data files via iCloud/Obsidian Sync. Test with absolute paths in frontmatter `datasources`.

## 2. Rename code block trigger: `datasql` → `quack`
Change `registerMarkdownCodeBlockProcessor("datasql", ...)` to `"quack"`. Update:
- `main.ts` — processor registration
- `src/parser.ts` — any references
- `quackblocks-test.md` — all code fences
- `~/.claude/skills/quackblocks-research/` — SKILL.md and references/syntax.md
- Memory/CLAUDE.md references

## 3. Additional chart types
Investigate what Observable Plot marks we can add beyond bar, barX, line, area, dot:
- **Heatmap** — `Plot.cell()` with color scale (great for correlation matrices, time×category)
- **Histogram** — `Plot.rectY()` with `Plot.binX()`
- **Box plot** — if Observable Plot supports it
- **Waffle** — `Plot.waffle()` for part-of-whole
- Any others that make sense for data analysis

## 4. Chart-level configuration
Ensure users can control chart features via the directive JSON:
- Legends (Observable Plot's `color: { legend: true }`)
- Axis labels / titles
- Custom color schemes (`color: { scheme: "blues" }`)
- Grid lines
- Faceting (`fx`, `fy`)
- Document what's already possible vs what needs code changes

## 5. Better example dataset
Replace the toy revenue/regions/products data with a well-known multi-table dataset. Candidates:
- **Iris / Palmer Penguins** — classic ML hello-world, good for scatter/dot plots
- **Gapminder** — countries × years, great for line/bubble charts
- **Northwind** — orders/products/customers, classic relational dataset
- **NYC taxi sample** — trips with pickup/dropoff, timestamps, fares
- **TPC-H subset** — standard analytical benchmark (orders, lineitems, customers, nations)

Pick one that shows off joins, time series, categorical comparisons, and correlations. Generate as parquet via the `scripts/generate-test-data.py` pattern. Update `quackblocks-test.md` to use it.

## 6. Test the quackblocks-research skill
Run the skill in a fresh Claude Code session:
- Ask Claude to generate a research document from existing parquet files
- Verify it triggers correctly (skill description matching)
- Check that it inspects schemas before writing SQL
- Confirm output renders correctly in Obsidian (tables + charts)
- Confirm PDF export works
- Iterate on SKILL.md if needed

---

*Spec folder (`spec/`) can be archived or deleted — all 5 build phases are complete.*
