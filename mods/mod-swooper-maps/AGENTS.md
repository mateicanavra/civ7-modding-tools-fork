# MapGen Mod (Swooper Maps) — Agent Router

Scope: `mods/mod-swooper-maps/**`

## What This Directory Is

- The Swooper Maps / MapGen mod package.
- `src/` holds the TypeScript game‑facing entry files.
- `mod/` is generated build output for Civ VII; treat it as read‑only.

## Tooling Rules

- Use `pnpm` scripts for build, type‑checks, and mod deployment in this package (see `mods/mod-swooper-maps/package.json`).
- Prefer regenerating `mod/` via `pnpm build` over editing build artifacts.
- Build `@swooper/mapgen-core` first (`pnpm -C packages/mapgen-core build`) before running this package’s type checks so dist exports resolve.
- Run broader tests from the repo root (`pnpm test`) or the MapGen core package when needed.
- Placement domain follows the op-per-concern pattern (plan wonders, floodplains, starts); placement step orchestrates multiple ops rather than a single monolith.

## Ecology domain

- Ecology ops live under `src/domain/ecology/ops`; step schemas should import op configs/defaults directly (no re-authored wrappers).
- The biomes step publishes `artifact:ecology.biomeClassification` (biome symbols, vegetation density, moisture/temp). Downstream feature logic expects this artifact plus `field:biomeId`.
- Pedology + resource basin planning now run before biomes: `artifact:ecology.soils` feeds `artifact:ecology.resourceBasins` and feature planning publishes `artifact:ecology.featureIntents` before the apply step writes features to the engine.

## Canonical Docs

- Mod architecture & presets: `docs/system/mods/swooper-maps/architecture.md`
- MapGen engine architecture/config: `docs/system/libs/mapgen/architecture.md`
- Testing overview: `docs/system/TESTING.md`
