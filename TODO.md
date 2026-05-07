# QuackBlocks — Next Up

## Done

- **External parquet file support** — Verified. `~/` paths expand correctly using `process.env.HOME` with fallbacks to `os.homedir()` and vault path derivation.
- **Code block trigger renamed** — Already using `"quack"` in `main.ts`.
- **Additional chart types** — `cell`, `rect`, `boxY`, `boxX`, `waffleY`, `waffleX`, `text` already supported in `src/renderer-chart.ts`.
- **Chart-level configuration** — Works via directive JSON and `plotDefaults` frontmatter. Documented in README.
- **Better example dataset** — Palmer Penguins (60 rows) + islands dimension table in `examples/`.

## Still open

- **Test the quackblocks-research skill** — Skill-side task. Run in a fresh Claude Code session and verify it triggers, inspects schemas, renders output, and exports to PDF.
