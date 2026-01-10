### 1.12 File-level reconciliation (what changes where; grounded in repo)

Every item below is repo-verified against the current codebase.

Core engine:
- `packages/mapgen-core/src/core/env.ts`
  - `EnvSchema` / `Env` live in core (moved out of engine-only ownership)
- `packages/mapgen-core/src/engine/execution-plan.ts`
  - runtime envelope uses `env` and imports `EnvSchema`
  - no step-config default/clean mutation during plan compilation
  - no calls to `step.resolveConfig(...)`
  - plan compilation validates step identity only (duplicate ids, unknown steps)
- `packages/mapgen-core/src/engine/PipelineExecutor.ts`
  - runtime execution uses plan configs as-is (no config synthesis or mutation)
- `packages/mapgen-core/src/engine/types.ts`
  - runtime contexts use `env` (no `RunSettings` types remain)
  - engine-facing step interface excludes compile-time normalization hooks
- `packages/mapgen-core/src/core/types.ts`
  - `ExtendedMapContext.env` stores the runtime envelope

Compiler:
- `packages/mapgen-core/src/compiler/normalize.ts` (compiler-only normalization helpers; wraps TypeBox `Value.*` from `typebox/value`)
- `packages/mapgen-core/src/compiler/recipe-compile.ts` (owns stage compile + step/op canonicalization pipeline)

Authoring:
- `packages/mapgen-core/src/authoring/bindings.ts` (canonical `bindCompileOps` / `bindRuntimeOps` helpers; structural runtime surface)
- `packages/mapgen-core/src/authoring/step/create.ts` (enforces explicit step schemas via `createStep`)
- `packages/mapgen-core/src/authoring/stage.ts` (asserts step schemas and builds `surfaceSchema` + `toInternal`)
- `packages/mapgen-core/src/authoring/types.ts`
  - step/op shapes expose `normalize` only for compile-time
  - step contracts remain schema-only
- `packages/mapgen-core/src/authoring/op/*`
  - `normalize` is the compile-time op hook (value-only)

Mod wiring (example):
- `mods/mod-swooper-maps/src/maps/_runtime/standard-entry.ts`
  - runtime envelope uses `env`
  - ensure recipe compilation happens before engine plan compilation

---

#### Engine identity-only behavior (pinned; implementation-adjacent)

This is a behavior spec for the planner and executor changes referenced above.

Planner (`packages/mapgen-core/src/engine/execution-plan.ts`):

- Validates:
  - step existence in the registry (unknown step errors)
  - duplicate step ids in the recipe
- Must not:
  - call `Value.Default(...)`, `Value.Convert(...)`, or `Value.Clean(...)` on step configs (no mutation)
  - call `step.resolveConfig(...)`
- Error surface:
  - continues to throw `ExecutionPlanCompileError` with `errors: ExecutionPlanCompileErrorItem[]`
  - `ExecutionPlanCompileErrorItem` remains `{ code, path, message, stepId? }` (shape in `packages/mapgen-core/src/engine/execution-plan.ts`)
  - only `code: "runRequest.invalid"` (duplicate step id) and `code: "step.unknown"` are emitted today

Executor (`packages/mapgen-core/src/engine/PipelineExecutor.ts`):

- `executePlan(...)` / `executePlanAsync(...)` continue to use `node.config` as-is.

---

#### Current state (repo-verified)

- Compiler entrypoint and helpers exist in `packages/mapgen-core/src/compiler/*` and are invoked by `createRecipe.compileConfig(...)`.
- Stage authoring uses `createStage(...)` with a computed `surfaceSchema` and deterministic `toInternal(...)` plumbing.
- Step contracts are schema-only (`defineStepContract` enforces kebab-case ids and schema conventions).
- Domain entrypoints export `compileOpsById` and `runtimeOpsById` registries and are used by step modules for binding.
- Engine plan compilation validates step identity only; runtime execution consumes compiled configs as-is.

---

#### Compile-time normalization hook (`normalize`)

Current state:

- `normalize` is the only supported compile-time hook name for steps and ops.
- Engine plan compilation does not call compile-time normalization hooks; compilation is the only place defaulting/cleaning/canonicalization occurs.

Downstream usage (examples; not exhaustive):

- Step modules: `mods/mod-swooper-maps/src/recipes/**/steps/**` (e.g. `normalize: (config, { env, knobs }) => ...`)
- Op strategies: `mods/mod-swooper-maps/src/domain/**/ops/**/strategies/**` (strategy-level `normalize(config, ctx)` hooks)
