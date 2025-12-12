# MapGen Layers — Agent Router

Scope: `packages/mapgen-core/src/layers/**`

- Generation layers/steps for foundation → placement phases.
- Read from `MapGenContext`/validated config and write back to context fields/artifacts.
- No global state or I/O; keep behavior deterministic for a given seed/context.

Docs:
- `docs/system/libs/mapgen/architecture.md`
- `docs/system/libs/mapgen/foundation.md`
- `docs/system/libs/mapgen/climate.md`

