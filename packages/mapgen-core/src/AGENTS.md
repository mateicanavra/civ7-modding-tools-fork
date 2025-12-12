# MapGen Core Sources — Agent Router

Scope: `packages/mapgen-core/src/**`

- Engine implementation. Keep logic organized by architectural phase and data products.
- Steps/layers should be deterministic from `MapGenContext` + validated config, and write results only through the context.
- Do not introduce mod‑specific entrypoints or Civ7 runtime imports here.

Tooling: validate with this package’s `pnpm` scripts.

Docs:
- `docs/system/libs/mapgen/architecture.md`
- `docs/system/libs/mapgen/design.md`

