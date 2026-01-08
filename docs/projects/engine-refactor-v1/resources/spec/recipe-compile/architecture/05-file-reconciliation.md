### 1.12 File-level reconciliation (what changes where; grounded in repo)

Every item below is either repo-verified (exists today) or explicitly marked **NEW (planned)**.

Core engine:
- `packages/mapgen-core/src/engine/execution-plan.ts`
  - rename runtime “settings” → `env`
  - remove step-config default/clean mutation during plan compilation
  - remove all calls to `step.resolveConfig(...)`
  - validate-only behavior
  - grounding (baseline today): `compileExecutionPlan(...)` performs defaulting/cleaning via `Value.Default(...)` + `Value.Clean(...)` and calls `step.resolveConfig(...)` from `buildNodeConfig(...)`
- `packages/mapgen-core/src/engine/PipelineExecutor.ts`
  - remove runtime config synthesis in `execute(...)` / `executeAsync(...)` (`resolveStepConfig(...)` currently does `Value.Default(...)` + `Value.Convert(...)` + `Value.Clean(...)`)
  - runtime execution must receive canonical configs via the compiled plan (or a compiler-owned execution request), never by defaulting at runtime
- `packages/mapgen-core/src/engine/types.ts`
  - move/rename `RunSettings` → `Env`
  - remove `resolveConfig` from the engine-facing step interface (if present)
  - rename `settings` → `env` across relevant types
- `packages/mapgen-core/src/core/types.ts`
  - rename `ExtendedMapContext.settings` → `ExtendedMapContext.env`

Compiler (new):
- `packages/mapgen-core/src/compiler/normalize.ts` **NEW (planned)** (compiler-only normalization helpers; wraps TypeBox `Value.*` from `typebox/value`)
- `packages/mapgen-core/src/compiler/recipe-compile.ts` **NEW (planned)** (owns stage compile + step/op canonicalization pipeline)

Authoring:
- `packages/mapgen-core/src/authoring/bindings.ts` **NEW (planned)** (canonical `bindCompileOps` / `bindRuntimeOps` helpers; structural runtime surface)
- `packages/mapgen-core/src/authoring/types.ts`
  - remove/forbid runtime `resolveConfig` surfaces from authoring step/op shapes
  - add/reshape factories to support ops-derived step schema + strictness defaults
- `packages/mapgen-core/src/authoring/op/*`
  - rename `resolveConfig` → `normalize` (value-only; compile-time only)
  - ensure runtime `runValidated` stays validate+execute only

Mod wiring (example):
- `mods/mod-swooper-maps/src/maps/_runtime/standard-entry.ts`
  - rename `settings` → `env`
  - ensure recipe compilation happens before engine plan compilation

