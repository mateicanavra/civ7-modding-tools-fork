# Civ7 Engine Adapter — Agent Router

Scope: `packages/civ7-adapter/**`

- Sole boundary for importing Civ7 engine globals / `base-standard` APIs.
- Exposes stable `EngineAdapter` implementations consumed by MapGen and mods.
- Keep this package thin: translate engine calls to adapter methods; no MapGen algorithms or mod logic.

Tooling: use this package’s `pnpm` scripts for build/check.

Docs:
- `docs/system/libs/mapgen/architecture.md` (adapter boundary)

