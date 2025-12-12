# MapGen Mod (Swooper Maps) — Agent Router

Scope: `mods/mod-swooper-maps/**`

## What This Directory Is

- The Swooper Maps / MapGen mod package.
- `src/` holds the TypeScript game‑facing entry files.
- `mod/` is generated build output for Civ VII; treat it as read‑only.

## Tooling Rules

- Use `pnpm` scripts for build, type‑checks, and mod deployment in this package (see `mods/mod-swooper-maps/package.json`).
- Prefer regenerating `mod/` via `pnpm build` over editing build artifacts.
- Run broader tests from the repo root (`pnpm test`) or the MapGen core package when needed.

## Canonical Docs

- Mod architecture & presets: `docs/system/mods/swooper-maps/architecture.md`
- MapGen engine architecture/config: `docs/system/libs/mapgen/architecture.md`
- Testing overview: `docs/system/TESTING.md`
