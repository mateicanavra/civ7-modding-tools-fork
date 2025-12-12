# MapGen Config — Agent Router

Scope: `packages/mapgen-core/src/config/**`

- Owns the canonical `MapGenConfig` schema, defaults, and loader.
- Keep config shapes centralized here; layers should not invent parallel schemas.
- Changes here affect mods and tooling; run package + workspace checks after edits.

Docs:
- `docs/system/libs/mapgen/architecture.md` (configuration model)
- `docs/system/libs/mapgen/design.md`

