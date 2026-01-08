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
- If a step contract declares `ops` and omits `schema`, the factory may derive a strict step schema from op envelope schemas (with a constrained “extras” story; see O3).

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
  └── exports a domain registry/router (op implementations by id)

Step (internal node; orchestration)
  └── defines internal schema (required)
  └── declares which op envelopes exist (optional; via op refs)
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

This is the target “code reality” the proposals converge toward. Names and paths are chosen to match existing repo conventions.

#### `Env` (runtime envelope)

Move `EnvSchema`/`Env` out of engine-only ownership:

- `packages/mapgen-core/src/runtime/env.ts`
  - `export const EnvSchema = Type.Object(...)`
  - `export type Env = Static<typeof EnvSchema>`

Engine imports `EnvSchema`; authoring/domain may import `Env` without importing engine.

#### Domain ops (contract-first, op envelopes)

Op contracts remain contract-first. Implementations expose:

```ts
type DomainOpAny = {
  id: string;
  config: TSchema;        // envelope schema
  defaultConfig: unknown; // default envelope
  strategies: Record<string, { config: TSchema; normalize?: (cfg: any, ctx: any) => any }>;
  normalize?: (cfg: unknown, ctx: unknown) => unknown; // optional value-only (envelope-level)
  runValidated: (input: any, cfg: any) => any;
};
```

#### Step contracts + step modules (ops injected, implementations bound by id)

Step contracts:
- **`schema` is required conceptually**, but can be derived (DX shortcut) when ops are declared.
- `ops` is optional; when present it declares which op envelopes exist as top-level properties.

Contract-level op references (to avoid bundling implementations into contracts):

```ts
type OpRef = Readonly<{ id: string; config: TSchema }>;
type OpsMap = Readonly<Record<string, OpRef>>;
```

Step module binding (conceptual):
- step contract imports `OpRef`s (cheap)
- step module binds `OpRef.id` → actual op implementation from the domain registry/router
- runtime step implementation receives bound ops injected (does not import them directly)

#### Stage definition (single stage surface, optional public)

Stage-level “public view” remains optional and is the only “public” concept in-scope:

- If stage defines `public`, it must define `compile`.
- If stage omits `public`, stage input is internal-as-public (step-id keyed map).

For knobs:
- Stage author input is always one object with `knobs` as a field; there is no separate knobs parameter at the recipe boundary.
- Internally, the stage exposes a computed strict `surfaceSchema` (single author-facing schema) and a deterministic `toInternal(...)`:

```ts
type StageToInternalResult = {
  knobs: unknown;
  rawSteps: Partial<Record<string, unknown>>; // stepId-keyed partial step configs
};

type StageRuntime = {
  id: string;
  // strict schema: knobs + (public fields OR step ids)
  // (TypeBox object schema with `additionalProperties: false`)
  surfaceSchema: TObject;
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

- `packages/mapgen-core/src/compiler/recipe-compile.ts`
  - `compileRecipeConfig({ env, recipe, config }): CompiledRecipeConfig`
  - returns a total (per-step) canonical internal tree

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

4. `rawStep = rawInternalStage[stepId] ?? undefined`
5. Prefill op defaults (top-level keys only; keys are discovered from `step.contract.ops`)
6. Normalize step config via strict schema normalization (default + clean + unknown-key errors)
7. Apply `step.normalize` (value-only) if present; re-normalize via schema
8. Apply mechanical op normalization pass (top-level only); re-normalize via schema

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
function normalizeStrict<T>(schema: TSchema, rawValue: unknown, path: string): { value: T; errors: CompileErrorItem[] } { /* ... */ }
```

Prefill op defaults (compiler-only; not schema defaulting):

```ts
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

- If `defineStepContract` is called with `ops` and **no explicit schema**, auto-generate a strict step schema where:
  - each op key becomes a required property whose schema is the op envelope schema
  - `additionalProperties: false` is defaulted inside the factory

Contract-level helper (no op impl bundling):

```ts
function opRef(contract: OpContractAny): OpRef { /* derives envelope schema from contract */ }
```

Binding helper (op refs → implementations):

```ts
function bindOps(ops: OpsMap, domain: { byId: Record<string, DomainOpAny> }): Record<string, DomainOpAny> { /* ... */ }
```

Inline schema strictness (factory-only):
- If schema is supplied as an inline field-map object, factories wrap it with `additionalProperties: false`.
- If schema is supplied as an arbitrary `TSchema`, factories do not mutate it.

---

### 1.12 File-level reconciliation (what changes where; grounded in repo)

Every file named below exists today; this is a grounding map, not a final implementation plan.

Core engine:
- `packages/mapgen-core/src/engine/execution-plan.ts`
  - rename runtime “settings” → `env`
  - remove step-config default/clean mutation during plan compilation
  - remove all calls to `step.resolveConfig(...)`
  - validate-only behavior
- `packages/mapgen-core/src/engine/types.ts`
  - move/rename `RunSettings` → `Env`
  - remove `resolveConfig` from the engine-facing step interface (if present)
  - rename `settings` → `env` across relevant types
- `packages/mapgen-core/src/core/types.ts`
  - rename `ExtendedMapContext.settings` → `ExtendedMapContext.env`

Compiler (new):
- `packages/mapgen-core/src/compiler/normalize.ts` (compiler-only normalization helpers; wraps TypeBox Value.*)
- `packages/mapgen-core/src/compiler/recipe-compile.ts` (owns stage compile + step/op canonicalization pipeline)

Authoring:
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

## 2) Illustrative Examples

These examples are meant to show the *full chain* and reinforce the invariants above. They are consolidated from existing proposal examples and updated minimally for consistency with the locked knobs model.

### Example A — Mixed stages (one stage adds `public`, another is internal-as-public)

Recipe config input is a stage-id keyed map. Each stage config is a single object that may include `knobs`:

```ts
const config = {
  foundation: {
    knobs: { /* optional */ },
    plates: { /* internal step config */ },
    heightmap: { /* internal step config */ },
  },
  ecology: {
    knobs: { /* optional */ },
    vegetation: { density: 0.4, shrubsEnabled: true }, // public fields (ecology has stage public)
    biomeEdges: { strength: 0.55, passes: 3 },
  }
};
```

Compilation behavior:
- `foundation` has no `public` → the non-knob portion is treated as internal step-map input.
- `ecology` has `public` → stage `compile` maps the public view to `{ [stepId]: stepConfig }`.
- Both stages run Phase B canonicalization; both thread `{ env, knobs }` into step normalization.

### Example B — Mechanical op envelope normalization (top-level only)

Assume a step has:

```ts
contract.ops = { trees: opRef(...), shrubs: opRef(...) };
boundOps = { trees: ecology.ops.planTreeVegetation, shrubs: ecology.ops.planShrubVegetation };
```

Raw step config input:

```ts
const rawStepConfig = {
  densityBias: 0.1,
  trees: { strategy: "default", config: { density: 0.4 } },
  // shrubs omitted entirely
};
```

Compiler execution (Phase B excerpt):
- `prefillOpDefaults` injects missing `shrubs` envelope from `boundOps.shrubs.defaultConfig`.
- `normalizeStrict(step.schema, prefilled)` default/cleans all step fields.
- `step.normalize(cfg, { env, knobs })` may bias values (value-only); then re-normalize via schema.
- `normalizeOpsTopLevel(...)` normalizes envelopes for `trees` and `shrubs` by contract ops keys only (no nested traversal).

### Example C — Ops injection into steps (avoid importing op implementations in step runtime modules)

Canonical step creation pattern:
- contracts declare `ops` as `OpRef` (contract-level)
- step module binds op refs to implementations from the domain registry/router
- runtime `step.run` receives bound ops injected

This keeps contract modules light and prevents bundling op implementations into contracts.

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
- Lint rule: forbid importing `@sinclair/typebox/value` (or any schema default/clean helper) in:
  - `mods/**/domain/**`
  - `mods/**/recipes/**/steps/**`
  - `packages/**/src/engine/**`
  - `packages/**/src/core/**`
  - allow only under `packages/**/src/compiler/**`

### 3.2 Reserved key: `"knobs"`

- Lint/check at stage construction time:
  - disallow step ids named `"knobs"`
  - disallow stage public field named `"knobs"`

### 3.3 Factories default `additionalProperties: false` for inline schema definitions

- Enforce that inline schema field-map shorthands (only within factories) become strict object schemas by default.
- Do not introduce a globally reusable “schema builder” type that can be used ad hoc.

### 3.4 No nested op envelope scanning

- Any helper that attempts to discover ops by scanning config objects (nested paths/arrays) is a violation.
- Op envelopes are discovered only via `step.contract.ops` keys.

---

## 4) Open Questions / Ambiguities (existing, not new)

These are the remaining major “known unknowns” already surfaced in prior versions.

### O1 — Envelope schema derivation for `OpRef`

We need one authoritative way to derive an envelope schema from an op contract so `opRef(contract)` does not create a second forever-maintained schema builder.

### O2 — Exact author-input typing for internal-as-public stages

Mechanically, internal-as-public should accept partial step maps; existing recipe config typing may be total in places because engine defaulting historically masked it. Decide and encode:
- separate `RecipeConfigInputOf<T>` (partial) vs `CompiledRecipeConfigOf<T>` (total), or
- accept boilerplate `{ stepId: {} }` and keep total types (worse DX).

### O3 — Ops-derived schema “extras” ergonomics vs TS complexity

We can support inline “extra step fields” merged with ops-derived fields, but perfect compile-time collision prevention can be deferred; ensure runtime collision throws happen at module initialization time, not mid-run.
