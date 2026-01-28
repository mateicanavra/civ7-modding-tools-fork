# @civ7/plugin-graph — Agents Guide

This package hosts the XML crawler and graph utilities used by the CLI and other apps. It exposes pure, reusable functions for indexing Civilization-style XML, crawling dependency graphs, exporting DOT/JSON, rendering SVG via WebAssembly Graphviz, and emitting a minimal HTML viewer.

## Development notes
- Language: TypeScript (strict) compiled with `tsup` to ESM and CJS.
- Runtime: Node.js >= 20.
- Uses `fast-xml-parser` for XML parsing and `@hpcc-js/wasm` for Graphviz rendering.
- No CLI-specific side effects or file-system writes—functions should accept inputs and return data.
- When modifying code here, run:
  ```bash
  bun run --filter @civ7/plugin-graph build
  bun run --filter @civ7/plugin-graph lint
  bun run --filter @civ7/plugin-graph test
  ```
  (tests are currently minimal; add coverage for new logic—see `TESTING.md`.)

## Key modules
- `src/crawler/` — XML indexer, BFS crawler, seed parsing, expander rules.
- `src/graph.ts` — `graphToDot`, `graphToJson`.
- `src/render.ts` — `renderSvg` via WebAssembly Graphviz.
- `src/workflows/` — `crawlGraph` and `exploreGraph` orchestrate crawling and rendering without side effects.
- `src/viewer.ts` — `buildGraphViewerHtml` for local interactive SVG.
- `src/index.ts` — re-exports all utilities for consumers.

`crawlGraph` and `exploreGraph` accept an optional `log` callback for progress messages and wrap lower-level failures with descriptive errors. Keep this package framework-agnostic and focused on reusable graph logic.

### Testing imports for this package
- Within this package, tests should import from the local source (e.g., `../src`) to avoid package self-resolution issues during workspace tests. External packages (like the CLI) should import from the published entry point (`@civ7/plugin-graph`).
