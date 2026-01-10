# Proposal: Composition-first recipe compiler (canonical architecture)

This document is a **canonical consolidation pass** for the “composition-first recipe compiler” work. It is intended to replace “read 3–4 versions and reconcile mentally” with **one** coherent read.

**Primary sources (verbatim or near-verbatim, selectively merged):**
- `gpt-pro-recipe-compile-v4.md` (single-mode stage `public`, mechanical op envelope normalization, ops-derived step schema, “no runtime defaulting”, knobs lock-in)
- `gpt-pro-recipe-compile-v3.md` (layering diagram, type surfaces, end-to-end examples, risk-sliced implementation outline)
- `gpt-pro-recipe-compile-v2.md` (ground-truth baseline references + “what changes where” file mapping)

---

## 1) Canonical Architecture

### 1.1 Goals (what this architecture is for)

- **Composition-first**: recipe/stage composition produces a fully canonical internal execution shape.
- **No engine-time config resolution**: engine plan compilation validates; it does not default/clean/mutate configs and does not call any config “resolver”.
- **No runtime schema defaulting/cleaning**: runtime handlers (`step.run`, `strategy.run`) treat configs as already canonical.
- **One canonical internal config shape** at runtime:
  - stage boundary uses **step-id keyed internal step config maps**
  - op envelopes are **top-level properties** in step configs (keyed by `step.contract.ops`)
- **Incremental adoption is per-stage**, without recipe-wide “modes” and without runtime branching/mode detection.

Non-goals for this landing:
- A recipe-level global “public facade” schema (deferred).
- A step-level “public input schema pass” (e.g. `inputSchema`, or “canonical schema but everything Optional”) (deferred).
- Nested op-envelope discovery (“op AST”, nested paths, arrays) (explicitly out of model).

---

### 1.2 Invariants (must not be violated)

This section is the **curated “rules of the road”**. If a future change violates one of these, it must be treated as a design change (not a refactor) and re-justified explicitly.

#### I1 — Single-mode configuration (no recipe-wide modes)

- There is exactly **one** configuration model:
  - per-stage optional `public` view + `compile` hook, otherwise internal-as-public
  - no recipe-wide variant flags, and no runtime mode detection/branching
- Recipe-owned global facade (“Variant C”) is explicitly **deferred**.

#### I2 — No runtime config resolution/defaulting

- Runtime handlers (`step.run`, `strategy.run`) must not default/clean/normalize configs.
- Engine plan compilation validates; it must not mutate config objects and must not call any step/op “resolver”.
- All schema defaulting/cleaning lives in compiler-only modules, owned by the recipe compiler pipeline.

#### I3 — `compile` vs `normalize` semantics are strict

- `compile` is **shape-changing** and exists only to map **stage public → internal step-id keyed map**.
- `normalize` is **shape-preserving** (value-only canonicalization) and must return a value validating against the same schema shape.
- The compiler always runs the full canonicalization pipeline; “public === internal” never means “skip compilation”.

#### I4 — Stage surface + knobs (single author-facing surface, compiler-threaded)

- Knobs are always a field on the stage config object: `stageConfig.knobs`.
- The compiler extracts knobs **once** and threads them into step/op normalization via ctx: `{ env, knobs }`.
- Step configs do not embed a `knobs` field.
- Reserved key rule: `"knobs"` cannot be a step id and cannot be a stage public field name.

#### I5 — Stage public vs stage surface schema

- If a stage defines a `public` view, it defines the schema for the **non-knob** portion of the stage surface.
- The stage’s single author-facing schema is a computed **stage surface schema** that includes:
  - `knobs` (validated by the stage’s knobs schema, defaulting to `{}`), and
  - either stage public fields (when `public` is present) or step-id keys (for internal-as-public stages).
- Internal-as-public stage surface validation must not validate step configs (step fields are `unknown`); strict step validation happens later during step canonicalization (after op-prefill).
- Stage exposes a deterministic `toInternal(...)` plumbing hook: no “shape detection”.

#### I6 — Op envelope discovery is contract-driven and top-level only

- Op envelopes are discovered **only** via `step.contract.ops`.
- Op envelopes are top-level properties in step configs: `stepConfig[opKey]`.
- No nested traversal, arrays, or scanning config shapes to infer ops.

#### I7 — Inline schema strictness + ops-derived step schema (DX)

- Inline schema field-map shorthands are supported only inside definition factories, and default to `additionalProperties: false`.
- If a step contract declares `ops` and omits `schema`, the factory may derive a strict step schema from op envelope schemas.
- There is no separate “input schema” for step configs in v1; author-input partiality is handled by the compiler pipeline (op-prefill before strict validation) plus type-level author input types (O2).
- This landing does **not** support adding “extra” top-level keys on top of an ops-derived schema; authors must provide an explicit schema (and include any op envelope keys they want) if they need extra keys.

---

### 1.3 Four channels (mental model)

This architecture becomes tractable once these are treated as distinct channels:

1. **`env`** — runtime envelope (Civ7 / runner supplied; not author config)
2. **`knobs`** — author-facing, cross-cutting tuning used during compilation/normalization
3. **`config`** — canonical internal configs (stable shapes; value-only normalization)
4. **`inputs`** — runtime artifacts (maps, buffers, intermediates) produced/consumed by steps and ops

---

### 1.4 Layering and dependency boundaries

```
Domain (ops + strategies + contracts)
  └── exports `contracts` (contract-only) and `ops` (implementations), plus a deterministic id index (built, not hand-maintained)

Step (internal node; orchestration)
  └── defines internal schema (required)
  └── declares which op envelopes exist (optional; declared as op contracts, derived to op refs)
  └── optional value-only normalize hook
  └── runtime run handler can call ops (injected), without importing implementations directly

Stage (author-facing unit)
  └── owns optional stage-level public view (schema + compile hook)
  └── otherwise stage input is internal-as-public

Recipe (composition + compilation orchestrator)
  └── composes stages
  └── owns the compile pipeline (stage public→internal if present, then step/op canonicalization)
  └── instantiates engine recipe only from compiled internal configs

Engine (execution plan + executor)
  └── validates runtime envelope + compiled step configs
  └── builds plan + executes
  └── must not default/clean/mutate config
```

Hard boundary:
- Domain code must not import engine plan compilation internals. `env` must live in a shared runtime module, not in engine-only types.

---

### 1.5 Canonical configuration model (single mode, per-stage optional `public`)

There is exactly **one** configuration model:

- A recipe is composed of stages.
- Each stage always has an **internal** config surface derived from its steps (always exists).
- A stage may optionally define a **public** schema + `compile` function:
  - If present: stage config input is **public**, and `compile` maps public → internal step-id keyed configs.
  - If absent: stage config input is assumed to already be **internal** (*public = internal* for that stage).

Stage config surface shape (always):
- Stage config is a single object.
- `knobs` is always a field on that object (`stageConfig.knobs`).
- Stage `public` schema (when present) is the schema for the **non-knob** portion; the full author-facing schema is the computed stage surface schema (`knobs` + fields).

Explicitly deferred (not implemented now):
- **Recipe-owned global facade** (the old “Variant C”).

Resulting “variant” surface (compile-time only):
> “stage has explicit public schema” vs “stage uses internal schema as public schema.”

There is no recipe-wide mode flag and no runtime branching/mode detection.

---

### 1.6 Knobs model (single author surface, ctx-threaded to step normalization)

This section is a detailed mechanics expansion of invariants I4/I5 (knobs + stage surface).

#### K1 — Knobs are always a field in the stage config surface

- Knobs live at `stageConfig.knobs`.
- There is exactly **one** author-facing surface per stage: the stage config object contains:
  - `knobs` (optional), and
  - step configs keyed by step id (partial allowed), or stage public fields (if stage defines a public view).
- There is **no** separate “knobs input” at the recipe/engine API boundary.

#### K2 — The compiler extracts knobs once and threads them through normalization via ctx

- The compiler performs stage config normalization, extracts `knobs`, then runs step/op canonicalization.
- Steps receive `{ env, knobs }` via a normalization context argument (compile-time only).
- Knobs do not become a runtime execution surface; they are compile-time normalization context.

#### K3 — Step configs do not contain knobs fields

- Per-step configs do not embed a `knobs` field.

#### K4 — Reserved key rule

- No step id may be `"knobs"`.

Illustrative types:

```ts
type NormalizeCtx<Env, Knobs> = { env: Env; knobs: Knobs };

type StepNormalize<TConfig, Env, Knobs> =
  (config: TConfig, ctx: NormalizeCtx<Env, Knobs>) => TConfig;

type StageInternalInput<StepId extends string, Knobs> =
  Partial<Record<StepId, unknown>> & { knobs?: Knobs };
// invariant: no step id may be "knobs"
```

Mechanical extraction (always-on):

```ts
const { knobs = {}, ...rawStepMap } = stageConfig;
// rawStepMap keyed by step id
// step.normalize(stepConfig, { env, knobs })
```

Important clarification for *public === internal*:
- Identity only applies to the **step-map portion** of the stage config.
- Compilation is not “skipped”; the compiler still extracts knobs and runs canonicalization.

---

### 1.7 Hook semantics (compile vs normalize)

Terminology is intentionally strict:

- **`compile`** (shape-changing): maps a stage’s **public** view (non-knob portion) into an internal step-id keyed map (and may consult `knobs` and `env`).
  - Only required when `public !== internal` for that stage.
- **`normalize`** (shape-preserving): value-only canonicalization; must return the same shape it receives.
  - Used for step-level and op-level canonicalization inside the compiler pipeline.

Runtime handlers (`step.run`, `strategy.run`) must not default/clean/normalize; they execute with already-canonical configs.

---

### 1.8 Canonical type surfaces (planned signatures + module layout)

This is the target “code reality” the proposals converge toward.

Grounding note:
- Any file path or symbol marked **NEW (planned)** does not exist in the repo baseline today.
- Where relevant, baseline owners are called out explicitly (file + symbol names).

#### `Env` (runtime envelope)

**NEW (planned)**: move the runtime envelope out of engine-only ownership by introducing `EnvSchema`/`Env`.

Planned location (does not exist today):
- `packages/mapgen-core/src/core/env.ts` **NEW (planned)** (env is core-owned so authoring/compiler/engine can share it without importing plan compiler internals)
  - `export const EnvSchema = Type.Object(...)`
  - `export type Env = Static<typeof EnvSchema>`

Baseline today (repo-verified):
- Runtime envelope schema/type live in `packages/mapgen-core/src/engine/execution-plan.ts`:
  - `RunSettingsSchema`
  - `RunSettings`
- Runtime envelope is threaded as `settings: RunSettings`:
  - engine plan compilation: `compileExecutionPlan(runRequest, registry)` in `packages/mapgen-core/src/engine/execution-plan.ts`
  - context storage: `ExtendedMapContext.settings: RunSettings` in `packages/mapgen-core/src/core/types.ts`

In the target architecture, engine imports `EnvSchema`; authoring/domain may import `Env` without importing engine.

TypeScript (copy-paste ready; baseline-derived):
- See Appendix A.1 (`packages/mapgen-core/src/core/env.ts`) for the exact `EnvSchema`/`Env` definition (lifted verbatim from baseline `RunSettingsSchema`/`RunSettings`).

#### Domain ops (contract-first, op envelopes)

Op contracts remain contract-first. Implementations expose:

```ts
// Baseline today (repo-verified): `DomainOp` in `packages/mapgen-core/src/authoring/op/types.ts`
//
// Notes:
// - Envelope schema is `DomainOp["config"]` (an `OpConfigSchema<Strategies>` which is a `TSchema`).
// - `resolveConfig(cfg, settings)` is a compile-time normalization hook; this proposal later renames it
//   to `normalize` (NEW (planned)).
type DomainOpAny = DomainOp<TSchema, TSchema, Record<string, { config: TSchema }>>;
```

TypeScript (pinned surfaces):
- Runtime steps must never see compile-time normalization hooks on ops. The runtime-facing op surface is explicitly narrowed (no `resolveConfig` / `normalize`), even if the underlying op implementation type still contains it.
- See §1.14 and Appendix A.2 for the canonical binding helpers (`bindCompileOps` / `bindRuntimeOps`) and the structural runtime-surface stripping rule (`runtimeOp(...)`).

#### Step contracts + step modules (ops injected, implementations bound by id)

Step contracts:
- Baseline today (repo-verified):
  - `StepContract` / `defineStep(...)`: `packages/mapgen-core/src/authoring/step/contract.ts`
  - `createStep(...)` enforces an explicit `contract.schema`: `packages/mapgen-core/src/authoring/step/create.ts`
  - step module hook today is `resolveConfig(config, settings: RunSettings)` (not `normalize`): `packages/mapgen-core/src/authoring/types.ts`
- **NEW (planned)**:
  - allow an ops-derived `schema` when ops are declared (DX shortcut; see 1.11)
  - add `ops` (e.g. `step.contract.ops`) to declare which op envelopes exist as top-level properties
  - rename step hook from `resolveConfig` → `normalize` (value-only; compile-time only)

Explicit decision (from this proposal’s v1 scope):
- There is no `inputSchema` / “optionalized mirror schema” for steps. A step has one canonical schema (`contract.schema`) representing plan-truth shape.
- Author-input “omitting envelopes” is handled by the compiler ordering:
  1) prefill missing op envelopes (from op contract defaults) and then
  2) strict schema normalization/validation against `contract.schema`.
- **NEW (planned)** (type-level): for steps that declare `ops`, the author-input config type treats op envelope keys as optional (since the compiler prefills before strict validation), while the compiled config type remains total/canonical.

Contract-level op declarations (to avoid bundling implementations into contracts):

```ts
// Baseline today (repo-verified):
// - `OpRef` and `opRef(...)`: `packages/mapgen-core/src/authoring/op/ref.ts`
type OpContractAny = OpContract<any, any, any, any, any>;

// NEW (planned): preserve literal op ids in references for DX (no `string` widening).
type OpRefOf<C extends OpContractAny> = Readonly<{ id: C["id"]; config: TSchema }>;

// NEW (planned): authors declare ops as contracts (DX); the factory derives OpRefs internally.
// The keys are the top-level op envelope keys in the step config (I6).
type StepOpsDecl = Readonly<Record<string, OpContractAny>>;

// NEW (planned): the compiled contract surface stores OpRefs (cheap to import; no impl bundling).
type StepOpsOf<TDecl extends StepOpsDecl> = Readonly<{ [K in keyof TDecl & string]: OpRefOf<TDecl[K]> }>;
```

Step module binding (conceptual):
- step contract declares ops as contracts; `defineStep` derives envelope schemas/refs for compiler use (cheap; no impl bundling)
- step module binds contract ids → actual op implementations from the domain registry (see §1.14)
- runtime step implementation uses bound runtime ops via module-scope closure (see §1.13), not via engine signatures

#### Stage definition (single stage surface, optional public)

Stage-level “public view” remains optional and is the only “public” concept in-scope:

- If stage defines `public`, it must define `compile`.
- If stage omits `public`, stage input is internal-as-public (step-id keyed map).

For knobs:
- Stage author input is always one object with `knobs` as a field; there is no separate knobs parameter at the recipe boundary.
- Internally, the stage exposes a computed strict `surfaceSchema` (single author-facing schema) and a deterministic `toInternal(...)`:

```ts
// NEW (planned): stage “public view” + knobs are not present in the repo baseline stage API today.
// Baseline today:
// - `Stage`/`StageModule` is `{ id, steps }`: `packages/mapgen-core/src/authoring/types.ts`
// - `createStage(...)` validates each `step.schema` exists: `packages/mapgen-core/src/authoring/stage.ts`
type StageToInternalResult = {
  knobs: unknown;
  rawSteps: Partial<Record<string, unknown>>; // stepId-keyed partial step configs (shape unknown at Phase A)
};

type StageRuntime = {
  id: string;
  // strict schema: knobs + (public fields OR step ids)
  // (TypeBox object schema with `additionalProperties: false`)
  surfaceSchema: import("typebox").TObject;
  toInternal: (args: { env: Env; stageConfig: unknown /* already normalized by surfaceSchema */ }) => StageToInternalResult;
};
```

- If stage defines a public view, `compile` is invoked with the **non-knob** portion (validated) plus knobs and env:

```ts
compile: (args: { env: Env; knobs: unknown; config: unknown }) => Partial<Record<string, unknown>>;
```

Stage authors do not need to define `compile` merely because knobs exist; knobs are extracted and threaded mechanically for normalization in the compiler pipeline.

Concrete `toInternal(...)` mechanics (code-like, deterministic; no “shape detection”):

```ts
function toInternal({ env, stageConfig }: { env: Env; stageConfig: any }): StageToInternalResult {
  const { knobs = {}, ...configPart } = stageConfig;
  if (stage.public) return { knobs, rawSteps: stage.compile({ env, knobs, config: configPart }) };
  return { knobs, rawSteps: configPart };
}
```

#### Recipe compiler (owns compilation)

Add a compiler module that produces a fully canonical internal execution shape:

- `packages/mapgen-core/src/compiler/recipe-compile.ts` **NEW (planned)** (note: `packages/mapgen-core/src/compiler/` does not exist today)
  - `compileRecipeConfig({ env, recipe, config }): CompiledRecipeConfigOf<...>` **NEW (planned)**
  - returns a total (per-step) canonical internal tree

Baseline today (repo-verified):
- recipe orchestration is in `packages/mapgen-core/src/authoring/recipe.ts` (`createRecipe(...)`)
  - author input typing is partial via `RecipeConfigInputOf<...>` in `packages/mapgen-core/src/authoring/types.ts`
  - total/compiled typing is represented by `CompiledRecipeConfigOf<...>` (currently an alias) in `packages/mapgen-core/src/authoring/types.ts`
- engine plan compilation is `compileExecutionPlan(runRequest, registry)` in `packages/mapgen-core/src/engine/execution-plan.ts`

#### Engine plan compilation (validates only)

Modify the existing planner:

- `packages/mapgen-core/src/engine/execution-plan.ts`
  - removes config defaulting/cleaning/mutation and removes `step.resolveConfig` calls
  - validates `env` and compiled step configs only

---

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

- **NEW (planned)**: if `defineStep` is called with `ops` and **no explicit schema**, auto-generate a strict step schema where:
  - each op key becomes a required property whose schema is the op envelope schema
  - `additionalProperties: false` is defaulted inside the factory

Important: `schema` is not required just because `ops` exists:
- If the step is “ops-only” (no extra top-level config keys), the derived `schema` removes boilerplate (no duplicate schema authoring).
- If the step needs extra top-level fields, the author provides an explicit `schema`. Factories still derive and overwrite op-key property schemas from `ops`, but factories do not add any new non-op keys “for you” (O3: no “derive + extras” hybrid).
- In both cases, there is still only one step schema; there is no separate step `inputSchema`.

Concretely, the v1 authoring surface supports (and only supports) these shapes:
- `defineStep({ ..., schema })` — explicit schema-owned step config (no ops-derived schema).
- `defineStep({ ..., ops })` — ops-only step config; schema is derived from op envelopes (DX shortcut).
- `defineStep({ ..., ops, schema })` — explicit hybrid schema (author-owned); `ops` declares which envelope keys exist, and factories overwrite those op keys with their derived envelope schemas (authors do not duplicate envelope schemas).

Contract-level helper (no op impl bundling):

```ts
// Baseline today (repo-verified): shared envelope derivation exists:
// - `buildOpEnvelopeSchema(...)`: `packages/mapgen-core/src/authoring/op/envelope.ts`
//
// NEW (planned): `defineStep({ ops, schema? })` derives op-envelope schemas from the provided
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

### 1.13 Canonical Step Module Pattern

#### Purpose

Define the single recommended, repo-realistic authoring pattern for a step module that:

- Lists ops once in the contract as **op contracts** (not `OpRef`) and derives refs/envelopes internally.
- Binds ops **inside the step module closure**, not in the stage factory.
- Ensures runtime cannot call compile-time normalization hooks (structural separation, not “policy by convention”).
- Supports `StepConfigInputOf` (author can omit op envelopes; compiler prefills).

#### Canonical exports for a step module

A step module should export:

- `contract`: `StepContract<...>`
- `step`: the engine-facing step module created by `createStep(contract, impl)`
- Optionally: `type ConfigInput = StepConfigInputOf<typeof contract>` and `type Config = StepConfigOf<typeof contract>` (local clarity only)

#### Canonical imports for a step module

A step module should import:

- `defineStep` and `createStep` from authoring (core)
- `bindRuntimeOps` (and sometimes `bindCompileOps` in compiler-only code; not used by runtime `run`)
- Domain **contracts** for op declarations (IDs + schemas)
- Domain **ops registry** for runtime binding (by id)
- No compiler helpers and no TypeBox `Value.*` inside runtime `run`

#### Canonical step module shape

```ts
// mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-vegetation/index.ts

import { Type } from "typebox";

import { defineStep, createStep } from "@swooper/mapgen-core/authoring";
import { bindRuntimeOps } from "@swooper/mapgen-core/authoring/bindings";

// Domain contracts (pure) — used only for ops declaration + schema derivation
import { PlanTreeVegetationContract } from "@mapgen/domain/ecology/ops/plan-tree-vegetation/contract";
import { PlanShrubVegetationContract } from "@mapgen/domain/ecology/ops/plan-shrub-vegetation/contract";

// Domain runtime ops registry (impl) — used only for runtime binding
import { ecologyOpsById } from "@mapgen/domain/ecology/ops-by-id";

export const contract = defineStep({
  id: "plot-vegetation",
  phase: "ecology",
  requires: ["artifact:biomes", "artifact:heightfield"],
  provides: ["artifact:vegetationIntents"],

  // Ops declared as contracts (single source of truth)
  ops: {
    trees: PlanTreeVegetationContract,
    shrubs: PlanShrubVegetationContract,
  },

  // O3: if you need non-op fields, you MUST provide an explicit schema.
  // Here we have `densityBias`, so we author the schema explicitly.
  //
  // `defineStep` overwrites the op keys (`trees`, `shrubs`) with their derived
  // envelope schemas (see §1.15 + Appendix A), so authors do not duplicate envelope schemas.
  schema: Type.Object(
    {
      densityBias: Type.Number({ minimum: -1, maximum: 1, default: 0 }),
      trees: Type.Any(), // overwritten by derived envelope schema
      shrubs: Type.Any(), // overwritten by derived envelope schema
    },
    { additionalProperties: false, default: {} }
  ),
} as const);

// Runtime ops are structurally stripped (no normalize/defaultConfig/strategies)
const ops = bindRuntimeOps(contract.ops, ecologyOpsById);

export const step = createStep(contract, {
  // Compile-time step normalize hook (optional).
  // NOTE: This runs only in the compiler pipeline, not at runtime.
  normalize: (cfg, ctx) => {
    // e.g. apply knobs-derived bias into envelopes in a shape-preserving way
    const bias = cfg.densityBias;
    return {
      ...cfg,
      trees: applyDensityBias(cfg.trees, bias),
      shrubs: applyDensityBias(cfg.shrubs, bias),
    };
  },

  run: async (ctx, cfg) => {
    // Runtime: can only call runtime ops surface (run/runValidated), cannot call normalize.
    const input = buildVegetationInput(ctx);
    const trees = ops.trees.runValidated(input, cfg.trees);
    const shrubs = ops.shrubs.runValidated(input, cfg.shrubs);

    ctx.artifacts.set("artifact:vegetationIntents", { trees, shrubs });
  },
});
```

Key invariants enforced by this pattern:

- `run(ctx, cfg)` has no access to compiler utilities and no access to compile-only op hooks.
- Ops are listed once (contracts) and bound once (runtime binder).
- `normalize` exists but is not callable at runtime because `createStep` does not expose it to the engine runtime surface, and `bindRuntimeOps` strips normalize hooks structurally.

---

### 1.14 Binding helpers

#### Purpose

Provide one canonical binding API that:

- Maps from contract-declared ops (contracts) to implementation registries by id.
- Produces **two** surfaces:
  - compile surface (includes normalize/defaultConfig/schema access)
  - runtime surface (structurally stripped; cannot normalize)

This is structural enforcement (not TS-only).

#### Canonical location

`packages/mapgen-core/src/authoring/bindings.ts`

(Exports are used by both steps and compiler; must not import engine plan compiler internals.)

#### Canonical types

Op registry shape:

```ts
export type OpId = string;
export type OpsById<Op> = Readonly<Record<OpId, Op>>;
```

Domain packages should export a deterministic registry (built, not hand-maintained), e.g.:

- `ecologyOpsById` for runtime ops (compile ops are fine as input; runtime binder strips)

#### Canonical APIs

`bindCompileOps` — used only by compiler pipeline helpers that need access to normalize/defaultConfig:

```ts
export function bindCompileOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: Record<string, DomainOpCompileAny>
): { [K in keyof Decl]: DomainOpCompileAny };
```

`bindRuntimeOps` — used inside step module closure:

```ts
export function bindRuntimeOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: Record<string, DomainOpCompileAny>
): { [K in keyof Decl]: DomainOpRuntimeAny };
```

Structural stripping (compile → runtime):

```ts
export function runtimeOp(op: DomainOpCompileAny): DomainOpRuntimeAny {
  return {
    id: op.id,
    kind: op.kind,
    run: op.run,
    validate: op.validate,
    runValidated: op.runValidated,
  } as const;
}
```

Binding behavior and constraints:

- Throw if a contract references an op id not present in the registry.
- Preserve decl keys for IDE completion (`as const` + const generics).

Testing usage (no per-step factories as primitives):

```ts
const fakeOpsById = {
  "ecology/planTreeVegetation": makeFakeOp(),
  "ecology/planShrubVegetation": makeFakeOp(),
};

const ops = bindRuntimeOps(contract.ops, fakeOpsById);
// step.run uses ops closure binding; you can invoke it under a mocked ctx/config
```

No bespoke `createPlotVegetationStep` factory is introduced as an architectural primitive.

---

### 1.15 Author input vs compiled typing

#### Purpose

Pin the exact type split and how it ties to the compiler pipeline and envelope prefill.

This must satisfy:

- Author config may omit op envelopes (`StepConfigInputOf`)
- Compiled config drops knobs (no runtime knob channel)
- O3: ops-derived schema cannot have extra fields (extras require explicit schema)
- No step `inputSchema` concept required

#### Canonical types

Step-level types:

- Runtime config type (strict, canonical): `StepConfigOf<C> = Static<C["schema"]>`
- Author input type: treat op envelope keys as optional:

```ts
type StepConfigInputOf<C extends StepContractAny> =
  OmitPartialOps<Static<C["schema"]>, keyof C["ops"]>;

type OmitPartialOps<T, K extends PropertyKey> =
  T extends object ? Omit<T, Extract<K, keyof T>> & Partial<Pick<T, Extract<K, keyof T>>> : T;
```

Stage config input:

- Single author-facing object per stage
- Always has optional `knobs`
- Has either:
  - stage public fields (if stage defines public), or
  - internal step-id keyed configs (if not)

Recipe input vs compiled output:

- Author input (partial, ergonomic): `RecipeConfigInputOf<T>`
- Compiled output (total, canonical, no knobs): `CompiledRecipeConfigOf<T>`

If observability is needed, compiler can return a separate trace artifact:

```ts
type CompilationTrace = {
  stages: Record<string, { knobs: unknown; warnings: string[] }>;
};
```

#### Prefill + strict validation interaction (mechanics)

Compiler pipeline order (per step):

1. Start with raw step config input (may omit op keys)
2. Prefill op envelopes for each `opKey` in `step.contract.ops`
3. Run strict `normalizeStrict(step.schema)` (unknown keys error + default/clean)
4. Run `step.normalize(cfg, ctx)` if present (shape-preserving)
5. Run op normalization pass for each opKey:
   - normalize envelope using compile op surface
6. Re-run strict `normalizeStrict(step.schema)`
7. Output is `StepConfigOf` (canonical runtime config)

This guarantees:

- author can omit envelopes (`StepConfigInputOf`)
- runtime sees fully concrete config (`StepConfigOf`)
- no runtime defaulting needed

---

### 1.16 Call chain

#### Purpose

Pin one authoritative “who calls what” to avoid dual paths, fallback behavior, or engine improvisation.

#### Canonical call chain (single authoritative flow)

Textual (authoritative):

1. Runtime entrypoint constructs:
   - `env` (Civ7 runtime inputs)
   - `recipeConfigInput` (author config; stage objects include `knobs` field)
2. Runtime calls only:
   - `recipe.run({ context, env, config: recipeConfigInput })`
3. Inside `recipe.run`:
   - `compiled = recipe.compileConfig({ env, config })`
   - `runRequest = recipe.runRequest({ env, compiled })`
   - `plan = engine.compileExecutionPlan(runRequest)` (validate-only; no default/clean)
   - `executor.executePlan(context, plan)` (no default/clean; uses plan configs as-is)
4. Steps run with `run(ctx, config)` only; ops are available through module-bound runtime bindings, not passed through engine.

Explicit “no fallback” statements:

- There is no path where:
  - engine defaults missing configs
  - executor defaults missing configs
  - step.run defaults configs
- If compilation fails, the run fails with `RecipeCompileError` before engine plan compile.

---

### 1.17 Exact compile op shape vs runtime op shape

Compile op shape (compiler-visible) must include:

- `id`, `kind`
- `config` envelope schema
- `defaultConfig` envelope value
- `strategies` including optional `normalize` hooks per strategy
- `validate`, `runValidated`, `run`

Runtime op shape (step.run-visible) must include only:

- `id`, `kind`
- `run` and/or `runValidated` and `validate`
- must not include `normalize`, `defaultConfig`, or `strategies`

Canonical TS (shape intent):

```ts
export type DomainOpCompile = {
  id: string;
  kind: string;
  config: TSchema;
  defaultConfig: unknown;
  strategies: Record<string, { config: TSchema; normalize?: Function; run: Function }>;
  normalize?: (envelope: unknown, ctx: { env: Env; knobs: unknown }) => unknown;
  validate: Function;
  runValidated: Function;
  run: Function;
};

export type DomainOpRuntime = Pick<DomainOpCompile, "id" | "kind" | "validate" | "runValidated" | "run">;
```

Structural stripping is via `runtimeOp(op)` (see §1.14).

---

### 1.18 Single rule: where compile-time normalization is allowed

Rule (crisp):

> Only the compiler pipeline and its helpers may call `step.normalize` and op strategy normalize. Runtime code never can, because it never has access to the compile op surface.

Enforcement mechanisms (structural, not policy):

- runtime ops are bound using `bindRuntimeOps`, which returns `DomainOpRuntime` that has no normalize members
- engine step interface remains `run(ctx, cfg)`; step.normalize is not part of engine runtime shape
- compiler modules are not exported in runtime-facing entrypoints

---

## 2) Illustrative Examples

These examples are meant to show the *full chain* and reinforce the invariants above. They are consolidated from existing proposal examples and updated minimally for consistency with the locked knobs model.

### Example A — Ecology stage: single author-facing surface (`knobs` + config), optional stage `public`

This example uses ecology to illustrate the canonical “single surface” model:

- the stage author-facing config is one object
- `knobs` is always a field on that object
- the stage may optionally define a `public` view that compiles into an internal step-id keyed map

Author input (recipe config is stage-id keyed; each stage config is a single object):

```ts
const config = {
  ecology: {
    knobs: {
      // stage-scoped author controls that may influence step normalization,
      // but are not part of any step config shape:
      vegetationDensityBias: 0.15,
    },

    // If ecology defines a stage `public` view, these are *public fields* (not step ids).
    // (If ecology is internal-as-public, the non-knob portion would instead be step ids.)
    vegetation: { /* public vegetation-facing fields */ },
    wetlands: { /* public wetlands-facing fields */ },
  },

  // A second stage in the same recipe may be internal-as-public. The non-knob portion is
  // treated as a (partial) step-id keyed map at compile-time (no recipe-wide mode flag).
  placement: {
    knobs: { /* optional */ },
    derivePlacementInputs: { /* internal step config (shape unknown at Phase A) */ },
    placement: { /* internal step config */ },
  },
};
```

Phase A output for `ecology` (conceptual, after `surfaceSchema` validation and `toInternal(...)`):

```ts
{
  knobs: { vegetationDensityBias: 0.15 },
  rawSteps: {
    // NEW (planned): this is the intended domain-modeling shape:
    // ecology exposes multiple focused ops and composes them in a step named `plotVegetation`
    plotVegetation: {
      trees: { /* op envelope */ },
      shrubs: { /* op envelope */ },
      groundCover: { /* op envelope */ },
    },
    plotWetlands: { /* ... */ },
  }
}
```

Note:
- The stage `public` view (if present) is a compile-time authoring UX affordance; the engine only ever sees the compiled internal step map.
- This stage example intentionally avoids “mega-op” modeling (see Example B).

### Example B — Ecology “plot-vegetation” step: multiple focused ops (not a mega-op) + top-level envelope normalization

Why this example exists:
- If each step only wraps one giant “plan vegetation” op, ops injection and envelope normalization look like indirection “for no reason”.
- The domain modeling guidelines explicitly prefer **multiple focused ops** + a step that orchestrates them (e.g. `plot-vegetation`).
- Baseline note (repo reality): ecology currently includes composite ops such as `mods/mod-swooper-maps/src/domain/ecology/ops/features-plan-vegetation/index.ts` (`planVegetation`). That shape is treated as a legacy “mega-op” smell in the target modeling.

Contract (NEW (planned) step; op contracts may already exist in split form or may be introduced during domain refactors):

```ts
import { defineStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";

// NEW (planned): export `contracts` from the domain entrypoint alongside `ops`.
// Baseline today: `ecology.ops` exists; individual op modules export contracts, but there is no
// consolidated `ecology.contracts` yet.

export const PlotVegetationContract = defineStep({
  id: "plotVegetation",
  phase: "ecology",
  // Ops are declared as contracts (DX); `defineStep` derives `OpRef`s internally.
  ops: {
    // Example “focused ops” (preferred):
    // - plan-tree-vegetation
    // - plan-shrub-vegetation
    // - plan-ground-cover
    //
    // Repo note: the precise contracts are a domain-refactor deliverable. Today, ecology already has
    // several focused op contracts under `mods/mod-swooper-maps/src/domain/ecology/ops/**`, but the
    // canonical target is to keep splitting toward these focused “plan-*” ops.
    //
    // DX model: domains export contracts separately from implementations:
    // - `ecology.contracts.*` are contract-only (safe to import in step contracts)
    // - `ecology.ops.*` are runtime implementations (used only in step modules)
    trees: ecology.contracts.planTreeVegetation,
    shrubs: ecology.contracts.planShrubVegetation,
    groundCover: ecology.contracts.planGroundCover,
  },
  // If schema is omitted here, an ops-derived schema is allowed (I7) and will be strict:
  // - required: `trees`, `shrubs`, `groundCover` (prefilled before schema normalization)
  // - no extra top-level keys (O3: no “extras” hybrid for v1)
});
```

Note on keys:
- The `ops` keys (`trees`, `shrubs`, `groundCover`) are the authoritative **top-level envelope keys** in the step config (I6).
- The compiler discovers envelopes from `step.contract.ops` keys only; it does not scan nested config objects.

Raw internal step config input (what Phase A produces for `plotVegetation`; op envelopes are **top-level keys** only):

```ts
const rawStepConfig = {
  trees: { strategy: "default", config: { density: 0.40 } },
  // shrubs omitted entirely (allowed in author input; will be prefilled)
  groundCover: { strategy: "default", config: { density: 0.15 } },
};
```

Compiler execution (Phase B excerpt; with stage knobs threaded via ctx):
- `prefillOpDefaults` injects missing `shrubs` envelope from op contract defaults (via `buildOpEnvelopeSchema(contract.id, contract.strategies).defaultConfig`), before strict schema validation.
- `normalizeStrict(step.schema, prefilled)` default/cleans the step fields and rejects unknown keys.
- `step.normalize(cfg, { env, knobs })` may bias envelope values using `knobs` (value-only, shape-preserving).
  - Example: apply `knobs.vegetationDensityBias` by adjusting `trees.config.density` and `groundCover.config.density`.
- `normalizeOpsTopLevel(...)` normalizes envelopes for `trees`, `shrubs`, `groundCover` by contract ops keys only (no nested traversal).
  - Op normalization consults the op’s compile-time normalization hook (baseline today: `DomainOp.resolveConfig(cfg, settings)`; planned rename to `normalize`).

### Example C — Ops injection into `plot-vegetation` (why “bind ops” is not just indirection)

Canonical pattern:
- step **contracts** depend only on op contracts (cheap; no op impl bundling)
- step **modules** bind op contracts to implementations from the domain registry (by id)
- runtime `step.run` uses injected ops; it does not import op implementations directly

One plausible (NEW (planned)) step module shape:

```ts
import { createStep } from "@swooper/mapgen-core/authoring";
import { bindRuntimeOps } from "@swooper/mapgen-core/authoring/bindings";

import { ecologyOpsById } from "@mapgen/domain/ecology/ops-by-id";

// Module-scope closure binding (canonical): ops are not passed through engine signatures.
const ops = bindRuntimeOps(PlotVegetationContract.ops, ecologyOpsById);

export default createStep(PlotVegetationContract, {
  // Compile-time only normalization hook; sees `{ env, knobs }`.
  normalize: (config, { env, knobs }) => {
    void env;
    if (knobs.vegetationDensityBias != null) {
      // value-only adjustment; must not add/remove keys
      return {
        ...config,
        trees: {
          ...config.trees,
          config: {
            ...config.trees.config,
            density: config.trees.config.density + knobs.vegetationDensityBias,
          },
        },
      };
    }
    return config;
  },

  // Runtime handler: uses injected ops and canonical config; no defaulting/cleaning here.
  run: (context, config) => {
    const treePlacements = ops.trees.runValidated(/* input */, config.trees);
    const shrubPlacements = ops.shrubs.runValidated(/* input */, config.shrubs);
    const coverPlacements = ops.groundCover.runValidated(/* input */, config.groundCover);
    // apply/publish effects (step boundary)
    void treePlacements;
    void shrubPlacements;
    void coverPlacements;
    void context;
  },
});
```

This example shows the *intended* reason ops are injected:
- steps orchestrate multiple focused ops and own effects
- ops remain pure, reusable, testable contracts
- contracts remain light and do not bundle implementations

---

## 3) Lint Boundaries / Enforcement

This section is intentionally small but explicit: the architecture is brittle without enforcement.

### 3.1 No runtime defaulting/cleaning

Policy:
- `step.run(...)` and `strategy.run(...)` are runtime and must not default/clean configs.
- All defaulting/cleaning happens in compilation (stage/step/op normalization).

Enforcement (minimal, real):
- Keep defaulting utilities in compiler-only modules, e.g. `packages/mapgen-core/src/compiler/normalize.ts`.
- Do not re-export compiler helpers from runtime-facing entrypoints.
- Lint rule: forbid importing `typebox/value` (or any schema default/clean helper) in:
  - `mods/**/domain/**`
  - `mods/**/recipes/**/steps/**`
  - `packages/**/src/engine/**`
  - `packages/**/src/core/**`
  - allow only under `packages/**/src/compiler/**`

### 3.2 Reserved key: `"knobs"`

Pinned enforcement (hard throw; not lint-only):
- Enforce at stage construction time (e.g. inside `createStage(...)` / `defineStage(...)`):
  - throw if any step id is exactly `"knobs"`
  - throw if stage `public` schema declares a top-level field named `"knobs"`

TypeScript (copy-paste ready):
- See Appendix A.4 for the exact `assertNoReservedStageKeys(...)` helper + how stage generics exclude `"knobs"` at the type level.

### 3.3 Factories default `additionalProperties: false` for inline schema definitions

- Enforce that inline schema field-map shorthands (only within factories) become strict object schemas by default.
- Do not introduce a globally reusable “schema builder” type that can be used ad hoc.

### 3.4 No nested op envelope scanning

- Any helper that attempts to discover ops by scanning config objects (nested paths/arrays) is a violation.
- Op envelopes are discovered only via `step.contract.ops` keys.

---

## 4) Open Questions / Ambiguities (remaining)

O1/O2/O3 were previously tracked as “known unknowns”, but are now **locked in** and should not be treated as open:

- **O1 (closed)**: shared op envelope derivation is implemented and used by both `createOp(...)` and `opRef(...)` via `packages/mapgen-core/src/authoring/op/envelope.ts`.
- **O2 (closed)**: recipe config typing is split into author input vs compiled output via `RecipeConfigInputOf<...>` and `CompiledRecipeConfigOf<...>` in `packages/mapgen-core/src/authoring/types.ts` (baseline note: `CompiledRecipeConfigOf` is currently an alias; the split is a locked design requirement for v1).
- **O3 (closed)**: no “derive ops schema + add extra top-level fields implicitly” hybrid. If you want non-op fields, you must provide an explicit step schema (op-key schemas are still overwritten from `ops` contracts so authors don’t duplicate envelope schemas).

No additional open questions are tracked in this document yet.

---

## Appendix A) TypeScript surface definitions (copy-paste ready)

This appendix makes every “pinned / canonical” statement above mechanically implementable in TypeScript without inventing names at implementation time.

### A.1 `Env` module (NEW (planned))

File: `packages/mapgen-core/src/core/env.ts` **NEW (planned)**

```ts
import { Type, type Static } from "typebox";

// Lifted verbatim from baseline `packages/mapgen-core/src/engine/execution-plan.ts`:
// - `RunSettingsSchema` → `EnvSchema`
// - `RunSettings` → `Env`

const UnknownRecord = Type.Record(Type.String(), Type.Unknown(), { default: {} });

export const TraceLevelSchema = Type.Union([
  Type.Literal("off"),
  Type.Literal("basic"),
  Type.Literal("verbose"),
]);

export const TraceConfigSchema = Type.Object(
  {
    enabled: Type.Optional(
      Type.Boolean({
        description: "Master tracing switch.",
      })
    ),
    steps: Type.Optional(
      Type.Record(Type.String(), TraceLevelSchema, {
        default: {},
        description: "Per-step trace verbosity (off/basic/verbose).",
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

export const EnvSchema = Type.Object(
  {
    seed: Type.Number(),
    dimensions: Type.Object(
      {
        width: Type.Number(),
        height: Type.Number(),
      },
      { additionalProperties: false }
    ),
    latitudeBounds: Type.Object(
      {
        topLatitude: Type.Number(),
        bottomLatitude: Type.Number(),
      },
      { additionalProperties: false }
    ),
    wrap: Type.Object(
      {
        wrapX: Type.Boolean(),
        wrapY: Type.Boolean(),
      },
      { additionalProperties: false }
    ),
    directionality: Type.Optional(UnknownRecord),
    metadata: Type.Optional(UnknownRecord),
    trace: Type.Optional(TraceConfigSchema),
  },
  { additionalProperties: false }
);

export type Env = Static<typeof EnvSchema>;
```

### A.2 Ops: contracts, shared envelopes, and compile vs runtime surfaces (pinned)

Files:
- `packages/mapgen-core/src/authoring/op/contract.ts` (baseline; unchanged)
- `packages/mapgen-core/src/authoring/op/envelope.ts` (baseline; shared envelope derivation)
- `packages/mapgen-core/src/authoring/op/create.ts` (baseline; uses shared envelope derivation)
- `packages/mapgen-core/src/authoring/op/ref.ts` (baseline; convenience ref, not required by step authors)
- `packages/mapgen-core/src/authoring/bindings.ts` **NEW (planned)** (canonical binding helpers; structural runtime surface)

```ts
import type { TSchema } from "typebox";

import type { OpContract } from "../op/contract.js";
import type { DomainOp } from "../op/types.js";

type OpContractAny = OpContract<any, any, any, any, any>;
type DomainOpAny = DomainOp<TSchema, TSchema, Record<string, { config: TSchema }>>;

// Compile-visible op surface (includes normalize/defaultConfig/strategies access via DomainOp shape).
export type DomainOpCompileAny = DomainOpAny & Readonly<{ id: string; kind: string }>;

// Runtime-visible op surface (structurally stripped; cannot normalize).
export type DomainOpRuntimeAny = Pick<
  DomainOpCompileAny,
  "id" | "kind" | "run" | "validate" | "runValidated"
>;

export function runtimeOp(op: DomainOpCompileAny): DomainOpRuntimeAny {
  return {
    id: op.id,
    kind: op.kind,
    run: op.run,
    validate: op.validate,
    runValidated: op.runValidated,
  };
}

export type StepOpsDecl = Readonly<Record<string, OpContractAny>>;

export function bindCompileOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: Readonly<Record<string, DomainOpCompileAny>>
): { [K in keyof Decl]: DomainOpCompileAny } {
  const out: any = {};
  for (const k of Object.keys(decl)) {
    const id = (decl as any)[k].id;
    const op = registryById[id];
    if (!op) throw new Error(`bindCompileOps: missing op id "${id}" for key "${k}"`);
    out[k] = op;
  }
  return out;
}

export function bindRuntimeOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: Readonly<Record<string, DomainOpCompileAny>>
): { [K in keyof Decl]: DomainOpRuntimeAny } {
  const out: any = {};
  for (const k of Object.keys(decl)) {
    const id = (decl as any)[k].id;
    const op = registryById[id];
    if (!op) throw new Error(`bindRuntimeOps: missing op id "${id}" for key "${k}"`);
    out[k] = runtimeOp(op);
  }
  return out;
}
```

### A.3 Steps: contracts, config input vs compiled config, and module surfaces (pinned)

Files:
- `packages/mapgen-core/src/authoring/step/contract.ts` (baseline; extended)
- `packages/mapgen-core/src/authoring/step/create.ts` (baseline; extended)
- `packages/mapgen-core/src/authoring/types.ts` (baseline; step/module typing tightened)

```ts
import { Type, type Static, type TObject, type TSchema } from "typebox";

import type { DependencyTag, GenerationPhase } from "@mapgen/engine/index.js";

import type { Env } from "../../core/env.js";
import type { OpContract } from "../op/contract.js";
import { buildOpEnvelopeSchema } from "../op/envelope.js";

type OpContractAny = OpContract<any, any, any, any, any>;
export type StepOpsDecl = Readonly<Record<string, OpContractAny>>;

type ObjectKeys<T> = keyof T & string;
type OptionalizeKeys<T, K extends PropertyKey> =
  T extends object ? Omit<T, Extract<keyof T, K>> & Partial<Pick<T, Extract<keyof T, K>>> : T;

export type NormalizeCtx<Knobs> = Readonly<{ env: Env; knobs: Knobs }>;

type OpRefOf<C extends OpContractAny> = Readonly<{ id: C["id"]; config: TSchema }>;
type StepOpRefsOf<TDecl extends StepOpsDecl> = Readonly<{ [K in keyof TDecl & string]: OpRefOf<TDecl[K]> }>;

export type StepContractBase<Id extends string> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
}>;

// v1 authoring surface (and only these shapes):
// - schema-only
// - ops-only (schema derived)
// - ops+schema hybrid (schema author-owned; op keys are overwritten with derived envelope schemas)
export type StepContractSchemaOnly<Schema extends TSchema, Id extends string> =
  StepContractBase<Id> & Readonly<{ schema: Schema }>;

export type StepContractOpsOnly<TDecl extends StepOpsDecl, Id extends string> =
  StepContractBase<Id> &
    Readonly<{
      ops: TDecl;
      opRefs: StepOpRefsOf<TDecl>;
      schema: TObject; // derived from op envelopes (strict object)
    }>;

export type StepContractHybrid<TDecl extends StepOpsDecl, Schema extends TObject, Id extends string> =
  StepContractBase<Id> &
    Readonly<{
      ops: TDecl;
      opRefs: StepOpRefsOf<TDecl>;
      schema: Schema; // explicit, author-owned; must include op keys (see below)
    }>;

export type StepContractAny =
  | StepContractSchemaOnly<TSchema, string>
  | StepContractOpsOnly<StepOpsDecl, string>
  | StepContractHybrid<StepOpsDecl, TObject, string>;

export type StepConfigOf<C extends StepContractAny> = Static<C["schema"]>;

// Pinned: author-input type treats op envelope keys as optional (no inputSchema).
export type StepConfigInputOf<C extends StepContractAny> = C extends { ops: infer TDecl extends StepOpsDecl }
  ? OptionalizeKeys<StepConfigOf<C>, ObjectKeys<TDecl>>
  : StepConfigOf<C>;

type SchemaIncludesKeys<Schema extends TObject, Keys extends string> =
  Exclude<Keys, keyof Schema["properties"] & string> extends never ? Schema : never;

function deriveOpsSchemaProperties(ops: StepOpsDecl): Record<string, TSchema> {
  const out: Record<string, TSchema> = {};
  for (const key of Object.keys(ops)) {
    const contract = ops[key] as OpContractAny;
    out[key] = buildOpEnvelopeSchema(contract.id, contract.strategies).schema;
  }
  return out;
}

function deriveOpRefs<const TDecl extends StepOpsDecl>(ops: TDecl): StepOpRefsOf<TDecl> {
  const out: Record<string, OpRefOf<OpContractAny>> = {};
  for (const key of Object.keys(ops)) {
    const contract = ops[key] as OpContractAny;
    out[key] = { id: contract.id, config: buildOpEnvelopeSchema(contract.id, contract.strategies).schema };
  }
  return out as StepOpRefsOf<TDecl>;
}

export function defineStep<const Schema extends TSchema, const Id extends string>(
  def: StepContractSchemaOnly<Schema, Id>
): StepContractSchemaOnly<Schema, Id>;

export function defineStep<const TDecl extends StepOpsDecl, const Id extends string>(
  def: StepContractBase<Id> & Readonly<{ ops: TDecl; schema?: undefined }>
): StepContractOpsOnly<TDecl, Id>;

export function defineStep<
  const TDecl extends StepOpsDecl,
  const Schema extends TObject,
  const Id extends string,
>(
  def: StepContractBase<Id> &
    Readonly<{
      ops: TDecl;
      // Pinned: hybrid authors explicitly include the op envelope keys; factories overwrite the
      // op-key schemas from ops contracts so authors don't duplicate envelope schema definitions.
      schema: SchemaIncludesKeys<Schema, keyof TDecl & string>;
    }>
): StepContractHybrid<TDecl, Schema, Id>;

export function defineStep(def: any): any {
  if ("ops" in def && def.ops) {
    const opRefs = deriveOpRefs(def.ops);
    // If schema omitted: derive strict object schema from op envelopes (DX shortcut).
    if (!("schema" in def)) {
      const properties = deriveOpsSchemaProperties(def.ops);
      return {
        ...(def as any),
        opRefs,
        schema: Type.Object(properties, { additionalProperties: false }),
      };
    }

    // If schema provided: overwrite op-key property schemas with their derived envelope schemas.
    // This keeps "extras require explicit schema" while avoiding duplicated envelope schemas.
    const derived = deriveOpsSchemaProperties(def.ops);
    const schema = def.schema as TObject;
    const merged = Type.Object(
      { ...(schema as any).properties, ...derived },
      {
        additionalProperties: (schema as any).additionalProperties ?? false,
        default: (schema as any).default ?? {},
      }
    );
    return { ...(def as any), opRefs, schema: merged };
  }
  return def;
}

export type StepModule<
  C extends StepContractAny,
  TContext,
  Knobs
> = Readonly<{
  contract: C;
  // Compile-time only normalization hook (value-only; shape-preserving).
  normalize?: (config: StepConfigOf<C>, ctx: NormalizeCtx<Knobs>) => StepConfigOf<C>;
  // Runtime handler (pinned signature).
  run: (context: TContext, config: StepConfigOf<C>) => void | Promise<void>;
}>;

type StepImpl<C extends StepContractAny, TContext, Knobs> = Readonly<
  {
    normalize?: StepModule<C, TContext, Knobs>["normalize"];
    run: StepModule<C, TContext, Knobs>["run"];
  }
>;

// Factory surface (pinned):
// - step module always owns `contract`
// - runtime-facing `run(context, config)` stays baseline
// - ops are module-owned (closure) rather than a third `run` arg
export function createStep<const C extends StepContractAny, TContext, Knobs>(
  contract: C,
  impl: StepImpl<C, TContext, Knobs>
): StepModule<C, TContext, Knobs> {
  return { contract, ...(impl as any) } as StepModule<C, TContext, Knobs>;
}

export type CreateStepFor<TContext> = <const C extends StepContractAny, Knobs = unknown>(
  contract: C,
  impl: StepImpl<C, TContext, Knobs>
) => StepModule<C, TContext, Knobs>;

export function createStepFor<TContext>(): CreateStepFor<TContext> {
  return (contract, impl) => createStep(contract, impl);
}

// Engine-facing step surface (pinned boundary):
// - no compile-time hooks (`normalize` is compile-time only)
// - no op binding surface (`ops` are step-module private; `run` already closes over them)
export type EngineStep<TContext, C extends StepContractAny> = Readonly<{
  id: string; // fully-qualified execution id (namespace.recipe.stage.step)
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  configSchema: C["schema"];
  run: (context: TContext, config: StepConfigOf<C>) => void | Promise<void>;
}>;
```

### A.4 Stages: single surface schema, reserved key enforcement, and knobs threading (pinned)

Files:
- `packages/mapgen-core/src/authoring/stage.ts` (baseline; extended)
- `packages/mapgen-core/src/authoring/types.ts` (baseline; stage/recipe typing extended)

```ts
import { Type, type Static, type TObject } from "typebox";

import type { Env } from "../core/env.js";
import type { StepContractAny, StepModule, StepConfigInputOf } from "./step/contract.js";

export const RESERVED_STAGE_KEY = "knobs" as const;
export type ReservedStageKey = typeof RESERVED_STAGE_KEY;

export type StageToInternalResult<StepId extends string, Knobs> = Readonly<{
  knobs: Knobs;
  rawSteps: Partial<Record<StepId, unknown>>;
}>;

export function assertNoReservedStageKeys(input: {
  stageId: string;
  stepIds: readonly string[];
  publicSchema?: TObject | undefined;
}): void {
  if (input.stepIds.includes(RESERVED_STAGE_KEY)) {
    throw new Error(`stage("${input.stageId}") contains reserved step id "${RESERVED_STAGE_KEY}"`);
  }
  const props = (input.publicSchema as any)?.properties as Record<string, unknown> | undefined;
  if (props && Object.prototype.hasOwnProperty.call(props, RESERVED_STAGE_KEY)) {
    throw new Error(`stage("${input.stageId}") public schema contains reserved key "${RESERVED_STAGE_KEY}"`);
  }
}

type StepsArray<TContext, Knobs> = readonly StepModule<StepContractAny, TContext, Knobs>[];

type StepIdOf<TSteps extends StepsArray<any, any>> = TSteps[number]["contract"]["id"] & string;
type NonReservedStepIdOf<TSteps extends StepsArray<any, any>> = Exclude<
  StepIdOf<TSteps>,
  ReservedStageKey
>;

type StepContractById<
  TSteps extends StepsArray<any, any>,
  Id extends StepIdOf<TSteps>,
> = Extract<TSteps[number], { contract: { id: Id } }>["contract"];

type StepConfigInputById<
  TSteps extends StepsArray<any, any>,
  Id extends NonReservedStepIdOf<TSteps>,
> = StepConfigInputOf<StepContractById<TSteps, Id>>;

// NEW (planned): stage public schema is always an object schema (non-knob portion).
export type StageContract<
  Id extends string,
  TContext,
  KnobsSchema extends TObject,
  Knobs = Static<KnobsSchema>,
  TSteps extends StepsArray<TContext, Knobs> = StepsArray<TContext, Knobs>,
  PublicSchema extends TObject | undefined = undefined,
  SurfaceSchema extends TObject = TObject,
> = Readonly<{
  id: Id;
  steps: TSteps;
  knobsSchema: KnobsSchema;
  public?: PublicSchema;
  // Computed strict author-facing schema: knobs + (public fields OR step ids).
  surfaceSchema: SurfaceSchema;
  // Deterministic “public → internal” mapping: extracts knobs and produces raw step map.
  toInternal: (args: { env: Env; stageConfig: Static<SurfaceSchema> }) => StageToInternalResult<
    NonReservedStepIdOf<TSteps>,
    Knobs
  >;
}>;

// Factory surface (pinned):
// - reserved key enforcement is a hard throw
// - stage schemas are strict object schemas (surfaceSchema always a TObject)
export function createStage<const TStage extends StageContract<string, any, any, any, any, any, any>>(
  stage: TStage
): TStage {
  assertNoReservedStageKeys({
    stageId: stage.id,
    stepIds: stage.steps.map((s) => s.contract.id),
    publicSchema: stage.public,
  });
  return stage;
}

export type StageConfigInputOf<TStage extends StageContract<any, any, any, any, any, any>> =
  // Knobs are always present as a field (defaulting handled by `surfaceSchema`).
  Readonly<{ knobs?: Partial<Static<TStage["knobsSchema"]>> }> &
    (TStage["public"] extends TObject
      ? Static<TStage["public"]>
      : Partial<{
          [K in NonReservedStepIdOf<TStage["steps"]>]: StepConfigInputById<TStage["steps"], K>;
        }>
    );
```

Notes:
- `StageContract.surfaceSchema` is typed as `TObject` (R8) because it must always be an object schema with strictness behavior.
- Reserved-key enforcement is a hard throw (R7); it is not acceptable to leave this as lint-only.

### A.5 Recipes: author input vs compiled output typing (O2 pinned)

Files:
- `packages/mapgen-core/src/authoring/types.ts` (baseline; recipe typing reworked for stage-surface configs)
- `packages/mapgen-core/src/compiler/recipe-compile.ts` **NEW (planned)** (compiler entrypoint signature)

```ts
import type { Static } from "typebox";

import type { Env } from "../core/env.js";
import type { StageContract, StageConfigInputOf } from "../authoring/stage.js";
import type { StepConfigOf } from "../authoring/step/contract.js";

type AnyStage = StageContract<string, any, any, any, any, any, any>;

type StageIdOf<TStages extends readonly AnyStage[]> = TStages[number]["id"] & string;

type StageById<TStages extends readonly AnyStage[], Id extends StageIdOf<TStages>> = Extract<
  TStages[number],
  { id: Id }
>;

type StepsOf<TStage extends AnyStage> = TStage["steps"];
type StepIdOf<TStage extends AnyStage> = StepsOf<TStage>[number]["contract"]["id"] & string;

type StepById<TStage extends AnyStage, Id extends StepIdOf<TStage>> = Extract<
  StepsOf<TStage>[number],
  { contract: { id: Id } }
>;

// Author-facing recipe input: stage-id keyed; each stage config is a *single object* (knobs + fields).
export type RecipeConfigInputOf<TStages extends readonly AnyStage[]> = Readonly<
  Partial<{
    [K in StageIdOf<TStages>]: StageConfigInputOf<StageById<TStages, K>>;
  }>
>;

// Compiler output: fully canonical internal step config tree.
//
// Shape intent:
// - total by stage id
// - total by step id
// - step configs are canonical `Static<contract.schema>` (op envelopes present; strict keys)
// - knobs are consumed during compilation and are not part of the runtime config tree
export type CompiledRecipeConfigOf<TStages extends readonly AnyStage[]> = Readonly<{
  [K in StageIdOf<TStages>]: Readonly<{
    [S in StepIdOf<StageById<TStages, K>>]: StepConfigOf<StepById<StageById<TStages, K>, S>["contract"]>;
  }>;
}>;

// NEW (planned): compiler-owned entrypoint.
//
// Pinned behavior:
// - always-on pipeline (even when stage public === internal)
// - no runtime defaulting/cleaning: this produces canonical configs pre-runtime
// - ordering matches §1.9 Phase A/B
export declare function compileRecipeConfig<const TStages extends readonly AnyStage[]>(args: {
  env: Env;
  recipe: Readonly<{ stages: TStages }>;
  config: RecipeConfigInputOf<TStages> | null | undefined;
}): CompiledRecipeConfigOf<TStages>;
```
