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

---

#### Engine “validate-only” behavior (pinned; implementation-adjacent)

This is a behavior spec for the planner and executor changes referenced above.

Planner (`packages/mapgen-core/src/engine/execution-plan.ts`):

- Must still validate:
  - the run request envelope (`env` / formerly `settings`)
  - step existence in the registry (unknown step errors)
  - compiled step configs against `step.configSchema` (including unknown key errors)
- Must not:
  - call `Value.Default(...)`, `Value.Convert(...)`, or `Value.Clean(...)` on step configs (no mutation)
  - call `step.resolveConfig(...)` (removed entirely)
- Error surface:
  - continues to throw `ExecutionPlanCompileError` with `errors: ExecutionPlanCompileErrorItem[]`
  - `ExecutionPlanCompileErrorItem` remains `{ code, path, message, stepId? }` (baseline shape in `packages/mapgen-core/src/engine/execution-plan.ts`)
  - `code: "step.resolveConfig.failed"` becomes obsolete once `resolveConfig` is removed

Executor (`packages/mapgen-core/src/engine/PipelineExecutor.ts`):

- `executePlan(...)` / `executePlanAsync(...)` continue to use `node.config` as-is.
- `execute(...)` / `executeAsync(...)` are the only remaining sources of runtime config synthesis today (via `resolveStepConfig(...)`), so they must be removed or made internal-only once compilation is mandatory.

---

#### Migration ordering (suggested slices)

This is a sequencing suggestion to avoid breaking the repo with an “all-at-once” cutover.

1. Land compiler-owned helpers + entrypoint skeleton (`packages/mapgen-core/src/compiler/*` **NEW (planned)**) with unit tests for normalization + envelope prefill.
2. Land `packages/mapgen-core/src/authoring/bindings.ts` (**NEW (planned)**) and update step contract factories for ops-derived schema behavior (O3 constraints unchanged).
3. Update one stage end-to-end (single-stage migration slice):
   - stage `surfaceSchema` + `toInternal`
   - `compileRecipeConfig` used by that stage’s recipe entry before engine plan compilation
4. Remove executor-side defaulting:
   - make `PipelineExecutor.execute*` internal-only or delete it
   - keep `executePlan*` as the only supported executor entrypoint
5. Switch engine planner to validate-only and remove `step.resolveConfig` calls.
6. Rename `settings` → `env` across engine/core/recipes once the compiler is the sole normalizer.

---

#### Rename: `resolveConfig` → `normalize` (baseline grounding + migration note)

Authoring/engine baseline touchpoints (repo-real):

- Step-level `resolveConfig`:
  - signature lives in `packages/mapgen-core/src/authoring/types.ts`
  - invoked during plan compilation in `packages/mapgen-core/src/engine/execution-plan.ts` (`buildNodeConfig(...)`)
- Op-level `resolveConfig`:
  - shape lives in `packages/mapgen-core/src/authoring/op/types.ts`
  - dispatcher is constructed in `packages/mapgen-core/src/authoring/op/create.ts` (calls per-strategy `resolveConfig` when present)

Downstream usage exists in mods (examples; not exhaustive):

- Step modules: `mods/mod-swooper-maps/src/recipes/**/steps/**` (e.g. `resolveConfig: (config, settings) => ...`)
- Op strategies: `mods/mod-swooper-maps/src/domain/**/ops/**/strategies/**` (e.g. `resolveConfig(config)` inside strategy modules)

Migration note (pinned intent):

- During the compiler landing, `normalize` becomes the only supported compile-time normalization hook name.
- A short transitional period may keep `resolveConfig` as an alias for `normalize` in authoring surfaces to avoid breaking downstream domains/steps immediately.
- The engine must not call either name once validate-only behavior is in place.
