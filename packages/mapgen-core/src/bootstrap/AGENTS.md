# MapGen Bootstrap — Agent Router

Scope: `packages/mapgen-core/src/bootstrap/**`

- Configuration bootstrap and tunables publishing.
- This layer prepares validated config/context; it should not contain map‑generation algorithms.
- Avoid direct Civ7 engine calls; use the adapter only when bootstrapping requires it.

Docs:
- `docs/system/libs/mapgen/architecture.md`
- `docs/system/libs/mapgen/design.md`

