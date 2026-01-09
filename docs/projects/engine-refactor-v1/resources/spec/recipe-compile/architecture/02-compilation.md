# Compilation Pipeline

This document defines the mechanics of the recipe compiler: phase ordering,
op envelope handling, and normalization rules.

### 1.9 Canonical compilation pipeline (definitive ordering)

This is the definitive ordering for the landing.

#### Phase A — Stage-level “public → internal” (optional)

For each stage:

1. Normalize stage config input via schema:
   - Always validate/default/clean against the stage’s computed `surfaceSchema` (the single author-facing schema: `knobs` + fields).
   - For internal-as-public stages, step fields are `unknown` at this phase; strict step validation happens later.
2. Convert to internal plumbing shape deterministically via `stage.toInternal({ env, stageConfig })`:
   - Extract `knobs` from the stage config object.
   - Produce `rawSteps`:
     - If stage has `public`: `rawSteps = stage.compile({ env, knobs, config: configPart })`
     - Else: `rawSteps = omit(stageConfig, "knobs")` (identity on the step-map portion; `knobs` is not part of the step map)

At the end of Phase A for each stage:

```ts
rawInternalStage: Partial<Record<stepId, unknown>>
knobs: unknown
```

#### Phase B — Step canonicalization (always)

For each step, in deterministic order:

1. `rawStep = rawInternalStage[stepId] ?? undefined`
2. Prefill op defaults (top-level keys only; keys are discovered from `step.contract.ops`)
3. Normalize step config via strict schema normalization (default + clean + unknown-key errors)
4. Apply `step.normalize` (value-only) if present; re-normalize via schema
5. Apply mechanical op normalization pass (top-level only); re-normalize via schema

Output:
- a total, canonical internal per-step config map for the stage

This pipeline is recipe-owned; the engine receives only the compiled internal configs.

---

### 1.10 Mechanical op envelopes (discovery rules, helpers, and “top-level only”)

Non-negotiable invariants:

- Op envelopes are discovered **only** via `step.contract.ops`.
- Op envelopes are **top-level properties** in the step config object: `stepConfig[opKey]`.
- “Mega-ops” are treated as single ops (internal composition is domain-private).

Strict schema normalization helper (compiler-only) mirrors existing engine behavior (default + clean + unknown-key errors), but runs in compilation, not engine planning:

```ts
// NEW (planned): compiler-only helper.
//
// Baseline today: `normalizeStepConfig(...)` in `packages/mapgen-core/src/engine/execution-plan.ts`
// (uses `findUnknownKeyErrors(...)` + `Value.Default(...)` + `Value.Clean(...)` + `Value.Errors(...)`).
//
// NEW (planned): `CompileErrorItem` is a compiler-owned error surface (no baseline type exists today;
// baseline uses `ExecutionPlanCompileErrorItem` in `packages/mapgen-core/src/engine/execution-plan.ts`).
function normalizeStrict<T>(schema: TSchema, rawValue: unknown, path: string): { value: T; errors: CompileErrorItem[] } { /* ... */ }
```

Prefill op defaults (compiler-only; not schema defaulting):

```ts
// NEW (planned): `StepModuleAny` is a future step-module surface for the compiler pipeline.
// Baseline today:
// - authoring step module type: `StepModule` in `packages/mapgen-core/src/authoring/types.ts`
// - engine step type: `MapGenStep` in `packages/mapgen-core/src/engine/types.ts`
function prefillOpDefaults(step: StepModuleAny, rawStepConfig: unknown, path: string): { value: Record<string, unknown>; errors: CompileErrorItem[] } { /* ... */ }
```

Mechanical op normalization pass (strategy-selected, schema-driven):

```ts
function normalizeOpsTopLevel(
  step: StepModuleAny,
  stepConfig: Record<string, unknown>,
  ctx: NormalizeCtx<Env, Knobs>,
  path: string
): { value: Record<string, unknown>; errors: CompileErrorItem[] } { /* ... */ }
```

Why “top-level only” is a hard model constraint:
- The normalization layer is a wiring layer, not an AST layer.
- Nested traversal encourages config DSL creep and mega-op patterns; it is out-of-scope by design.

---

### 1.11 Ops-derived step schema (DX shortcut; constrained scope)

This is in-scope for this landing (explicit decision):

- **NEW (planned)**: if `defineStepContract` is called with `ops` and **no explicit schema**, auto-generate a strict step schema where:
  - each op key becomes a required property whose schema is the op envelope schema
  - `additionalProperties: false` is defaulted inside the factory

Important: `schema` is not required just because `ops` exists:
- If the step is “ops-only” (no extra top-level config keys), the derived `schema` removes boilerplate (no duplicate schema authoring).
- If the step needs extra top-level fields, the author provides an explicit `schema`. Factories still derive and overwrite op-key property schemas from `ops`, but factories do not add any new non-op keys “for you” (O3: no “derive + extras” hybrid).
- In both cases, there is still only one step schema; there is no separate step `inputSchema`.

Concretely, the v1 authoring surface supports (and only supports) these shapes:
- `defineStepContract({ ..., schema })` — explicit schema-owned step config (no ops-derived schema).
- `defineStepContract({ ..., ops })` — ops-only step config; schema is derived from op envelopes (DX shortcut).
- `defineStepContract({ ..., ops, schema })` — explicit hybrid schema (author-owned); `ops` declares which envelope keys exist, and factories overwrite those op keys with their derived envelope schemas (authors do not duplicate envelope schemas).

Contract-level helper (no op impl bundling):

```ts
// Baseline today (repo-verified): shared envelope derivation exists:
// - `buildOpEnvelopeSchema(...)`: `packages/mapgen-core/src/authoring/op/envelope.ts`
//
// NEW (planned): `defineStepContract({ ops, schema? })` derives op-envelope schemas from the provided
// op contracts and (optionally) auto-derives the step schema when `schema` is omitted.
//
// DX intent:
// - authors do NOT need to call `opRef(...)` directly
// - they declare the op contracts; factories derive `OpRef` + envelope schemas using the shared builder
```

Binding helper (op refs → implementations):

```ts
// Canonical binding API: see §1.14.
//
// Key properties:
// - binds by op id (declared in contracts)
// - produces compile vs runtime op surfaces
// - runtime surface is structurally stripped (no normalize/defaultConfig/strategies)
```

Inline schema strictness (factory-only):
- If schema is supplied as an inline field-map object, factories wrap it with `additionalProperties: false`.
- If schema is supplied as an arbitrary `TSchema`, factories do not mutate it.

---

### 1.18 Single rule: where compile-time normalization is allowed

Rule (crisp):

> Only the compiler pipeline and its helpers may call `step.normalize` and op strategy normalize. Runtime code never can, because it never has access to the compile op surface.

Enforcement mechanisms (structural, not policy):

- runtime ops are bound using `bindRuntimeOps`, which returns `DomainOpRuntime` that has no normalize members
- engine step interface remains `run(ctx, cfg)`; step.normalize is not part of engine runtime shape
- compiler modules are not exported in runtime-facing entrypoints

---

