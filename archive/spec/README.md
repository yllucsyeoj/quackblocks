# DataSQL Obsidian Plugin — Project Package

This folder contains the specification, spike results, and build plan for the DataSQL Obsidian plugin: an executable markdown environment that renders SQL query results as tables and charts inline, with PDF export support.

## Contents

- `SPEC.md` — Full plugin specification and design decisions
- `BUILD-PLAN.md` — Phased implementation plan for Claude Code
- `WORKING-SPIKE.md` — **Complete working spike plugin code** (tested, validated — start here)
- `SPIKE-RESULTS.md` — Findings from the two proof-of-concept spikes
- `spike-test-svg-pdf-export.md` — SVG PDF export test note (Spike 1)
- `spike-test-datasql.md` — DuckDB WASM test note (Spike 2)

## Development Workflow

The working spike is already installed at `.obsidian/plugins/datasql-spike/`. For the real build:

```bash
# Create the real plugin directory
mkdir .obsidian/plugins/datasql
cd .obsidian/plugins/datasql

# Initialise from the spike code in WORKING-SPIKE.md
# Then follow BUILD-PLAN.md phase by phase
npm install
npm run dev   # watch mode
```

## For Claude Code

Point Claude Code at `BUILD-PLAN.md` and `SPEC.md`. The build plan references `WORKING-SPIKE.md` for the critical Electron workarounds that must be carried forward. Phase 1 restructures the working spike into a clean architecture — no new features, just separation of concerns.
