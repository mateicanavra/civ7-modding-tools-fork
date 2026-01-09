### 1.12 File-level reconciliation (what changes where; grounded in repo)

Every item below is either repo-verified (exists today) or explicitly marked **NEW (planned)**.

Core engine:
- `packages/mapgen-core/src/core/env.ts`
  - `EnvSchema` / `Env` live in core (moved out of engine-only ownership)
- `packages/mapgen-core/src/engine/execution-plan.ts`
  - runtime envelope uses `env` and imports `EnvSchema`
  - remove step-config default/clean mutation during plan compilation
  - remove all calls to `step.resolveConfig(...)`
  - validate-only behavior
  - grounding (baseline today): `compileExecutionPlan(...)` performs defaulting/cleaning via `Value.Default(...)` + `Value.Clean(...)` and calls `step.resolveConfig(...)` from `buildNodeConfig(...)`
- `packages/mapgen-core/src/engine/PipelineExecutor.ts`
  - remove runtime config synthesis in `execute(...)` / `executeAsync(...)` (`resolveStepConfig(...)` currently does `Value.Default(...)` + `Value.Convert(...)` + `Value.Clean(...)`)
  - runtime execution must receive canonical configs via the compiled plan (or a compiler-owned execution request), never by defaulting at runtime
- `packages/mapgen-core/src/engine/types.ts`
  - runtime contexts use `env` (no `RunSettings` types remain)
  - engine-facing step interface excludes compile-time normalization hooks
- `packages/mapgen-core/src/core/types.ts`
  - `ExtendedMapContext.env` stores the runtime envelope

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
  - runtime envelope uses `env`
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

This section is intentionally aligned with the M7 cutover milestone sequencing (DX-first, risk-later).

Slice 1 — Compiler + authoring scaffolding (no behavior cutover yet)

1. Land compiler-owned helpers + entrypoint skeleton (`packages/mapgen-core/src/compiler/*` **NEW (planned)**) with unit tests for:
   - strict schema normalization (`normalizeStrict`)
   - op envelope default prefilling (`prefillOpDefaults`)
   - top-level op normalization pass (`normalizeOpsTopLevel`)
   - compiler error aggregation behavior (no silent short-circuiting)
2. Land authoring scaffolding (new, non-invasive surfaces; not yet wired into runtime):
   - `packages/mapgen-core/src/authoring/bindings.ts` **NEW (planned)** (`bindCompileOps` / `bindRuntimeOps`)
   - step contract factory upgrades (ops-derived step schema; O3 constraint unchanged)
   - stage factory Option A surfaces (computed `surfaceSchema`, standard `toInternal`, kebab-case step id enforcement)
   - op hook rename scaffolding (`op.resolveConfig` → `op.normalize` dispatching by `envelope.strategy`) in authoring types/factories

Slice 2 — Recipe boundary adoption + non-ecology staged migrations

3. Introduce recipe boundary compilation at the mod/recipe entrypoints:
   - `compileRecipeConfig` runs before `compileExecutionPlan`
   - recipe-owned assembly of `compileOpsById` (merge domain registries) is explicit and local to the recipe boundary
4. Migrate stages incrementally (per-stage slice; keep repo runnable after each stage):
   - convert stage authoring to Option A (optional `public` + `compile`; internal-as-public otherwise)
   - convert step modules to kebab-case ids and ops-declared contracts (ops listed once; compiler prefills envelopes)
   - ensure all config defaulting/cleaning/canonicalization happens in the compiler (not in steps/ops at runtime)

Slice 3 — Engine validate-only flip (high-risk churn; land after compiler adoption)

5. Remove executor-side runtime config synthesis:
   - make `PipelineExecutor.execute*` internal-only or delete it
   - keep `executePlan*` as the only supported executor entrypoint
6. Switch engine planner to validate-only and remove `step.resolveConfig` calls:
   - remove step-config default/convert/clean mutation during plan compilation
   - keep validation (run request envelope + step existence + compiled step configs) and preserve error surface shape

Slice 4 — Ecology exemplar migration + polish

7. Refactor the ecology domain to the canonical domain entrypoint shape (`contracts`, `compileOpsById`, `runtimeOpsById`), and migrate its steps/stages to the canonical authoring patterns.

Slice 5 — Cleanup (no legacy left)

8. Do not introduce compatibility shims; if any internal-only bridge was unavoidable to keep the repo runnable between slices, delete it here (explicit deletion pass).
9. Rename `settings` → `env` across engine/core/recipes (done; no legacy alias remains).

---

#### Rename: `resolveConfig` → `normalize` (baseline grounding + migration note)

Authoring/engine baseline touchpoints (repo-real):

- Step-level `resolveConfig`:
  - signature lives in `packages/mapgen-core/src/authoring/types.ts`
  - invoked during plan compilation in `packages/mapgen-core/src/engine/execution-plan.ts` (`buildNodeConfig(...)`)
- Op-level `resolveConfig`:
  - shape lives in `packages/mapgen-core/src/authoring/op/types.ts`
  - dispatcher is constructed in `packages/mapgen-core/src/authoring/op/create.ts` (calls per-strategy `resolveConfig` when present; renamed to `normalize` in the target architecture)

Downstream usage exists in mods (examples; not exhaustive):

- Step modules: `mods/mod-swooper-maps/src/recipes/**/steps/**` (e.g. `normalize: (config, { env, knobs }) => ...`)
- Op strategies: `mods/mod-swooper-maps/src/domain/**/ops/**/strategies/**` (e.g. `resolveConfig(config)` inside strategy modules)

Migration note (pinned intent):

- During the compiler landing, `normalize` becomes the only supported compile-time normalization hook name.
- There is no supported dual-path: `resolveConfig` is removed from authoring/runtime surfaces. Downstream steps/ops must be updated as part of the cutover.
- The engine must not call compile-time normalization hooks once validate-only behavior is in place; compilation is the only place defaulting/cleaning/canonicalization occurs.
