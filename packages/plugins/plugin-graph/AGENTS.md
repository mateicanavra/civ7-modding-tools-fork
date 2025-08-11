# @civ7/plugin-graph — Agents Guide

This package hosts the XML crawler and graph utilities used by the CLI and other apps. It exposes pure, reusable functions for indexing Civilization-style XML, crawling dependency graphs, exporting DOT/JSON, rendering SVG via WebAssembly Graphviz, and emitting a minimal HTML viewer.

## Development notes
- Language: TypeScript (strict) compiled with `tsup` to ESM and CJS.
- Runtime: Node.js >= 20.
- `fast-xml-parser` is a peer dependency; consumers must provide it.
- No CLI-specific side effects or file-system writes—functions should accept inputs and return data.
- When modifying code here, run:
  ```bash
  pnpm -F @civ7/plugin-graph build
  pnpm -F @civ7/plugin-graph lint
  pnpm -F @civ7/plugin-graph test
  ```
  (tests are currently minimal; add coverage for new logic—see `TESTING.md`.)

## Key modules
- `src/crawler/` — XML indexer, BFS crawler, seed parsing, expander rules.
- `src/graph.ts` — `graphToDot`, `graphToJson`.
- `src/render.ts` — `renderSvg` via WebAssembly Graphviz.
- `src/pipelines/` — `crawlGraph` and `exploreGraph` orchestrate crawling and rendering without side effects.
- `src/viewer.ts` — `buildGraphViewerHtml` for local interactive SVG.
- `src/index.ts` — re-exports all utilities for consumers.

`crawlGraph` and `exploreGraph` accept an optional `log` callback for progress messages and wrap lower-level failures with descriptive errors. Keep this package framework-agnostic and focused on reusable graph logic.
