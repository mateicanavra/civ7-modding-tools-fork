# MapGen Engine Core — Agent Router

Scope: `packages/mapgen-core/**`

## What This Package Is

- Shared MapGen engine/library used by map mods.
- Pure TypeScript domain logic: algorithms, phases/layers, config schema, orchestration glue.
- `dist/` is generated build output; treat it as read‑only.

## Tooling Rules

- Use package scripts via `pnpm` for build, type‑checks, and tests (`pnpm -F @swooper/mapgen-core <script>`).
- Run workspace‑wide validation from repo root when changing cross‑package contracts.

## Domain Rules

- No direct Civ7 engine imports here; all engine interaction goes through `@civ7/adapter` and `MapGenContext.adapter`.
- Avoid global mutable state; steps/layers communicate only via `MapGenContext`.

## Canonical Docs

- Engine architecture & phases: `docs/system/libs/mapgen/architecture.md`
- Design notes & invariants: `docs/system/libs/mapgen/design.md`
- Foundation & climate concepts: `docs/system/libs/mapgen/foundation.md`, `docs/system/libs/mapgen/climate.md`
- Testing overview: `docs/system/TESTING.md`

