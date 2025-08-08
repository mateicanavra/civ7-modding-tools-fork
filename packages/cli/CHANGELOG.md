# @civ7-modding/cli Changelog

All notable changes to this package will be documented in this file.

## 0.1.0 — 2025-08-08

- feat: Split monolithic crawler into modular files under `tools/crawler/`
  - `xml-indexer.ts` (formerly `database-indexer.ts`)
  - `expanders.ts`, `queries.ts`, `constants.ts`, `types.ts`, `crawler.ts`, `seed.ts`, `index.ts`
- feat: Add `tools/graph/` with `export.ts` (DOT/JSON) and `viewer.ts` (HTML SVG viewer)
- chore: Remove legacy `tools/civ7-xml-crawler.ts` and old viewer/constants
- docs: Move `FEATURES.md` into CLI package and archive the XML-first crawl plan under `.archives/`
- build: Update imports in commands to new module structure; build remains green
