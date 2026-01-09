Got it. I’m going to choose **Option B** (targeted drop-in synthesis), because a full rewrite risks losing nuance already present in the canonical doc + Alt 1. Everything below is written to be **pasted directly into the four stubs (1.13–1.16)** plus a couple of small “supporting inserts” (runtime/compile op shapes + normalization rule) that you can place near the ops/steps sections.

A quick heads-up: some earlier uploads in this project have expired; I’m working off the **currently attached** repo snapshot and docs you referenced. If you want me to quote or diff against an older artifact that isn’t present, re-upload it.

---

# 1.13 Canonical Step Module Pattern

## Purpose

Define the single recommended, repo-realistic authoring pattern for a step module that:

* Lists ops **once** in the contract as **op contracts** (not OpRef) and derives refs internally (Decision #1).
* Binds ops **inside the step module closure**, not in the stage factory (Decision #3).
* Ensures runtime cannot call compile-time normalize hooks (Decision #2).
* Supports StepConfigInputOf (author can omit op envelopes; compiler prefills) (Decision #4).

## Canonical exports for a step module

A step module should export:

* `contract`: `StepContract<...>`
* `step`: the engine-facing step module created by `createStep(contract, impl)`
* Optionally: `type ConfigInput = StepConfigInputOf<typeof contract>` and `type Config = StepConfigOf<typeof contract>` (for local clarity)

## Canonical imports for a step module

A step module should import:

* `defineStepContract` and `createStep` from authoring (core)
* `bindRuntimeOps` and `bindCompileOps` binding helpers
* Domain **contracts** for op declarations (IDs + schemas)
* Domain **ops registry** for runtime binding (by id) if the step needs ops at runtime
* No compiler helpers and no TypeBox `Value.*` inside runtime `run`

## Canonical step module shape

```ts
// mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-vegetation/index.ts

import { Type } from "typebox";

import { defineStepContract, createStep } from "@mapgen/authoring/step";
import { bindRuntimeOps } from "@mapgen/authoring/bindings";

// Domain contracts (pure) — used only for ops declaration + schema derivation
import { PlanTreeVegetationContract } from "@mapgen/domain/ecology/ops/plan-tree-vegetation/contract";
import { PlanShrubVegetationContract } from "@mapgen/domain/ecology/ops/plan-shrub-vegetation/contract";

// Domain runtime ops registry (impl) — used only for runtime binding
import { ecologyOpsById } from "@mapgen/domain/ecology/ops-by-id"; // recommended registry shape

export const contract = defineStepContract({
  id: "plot-vegetation",
  phase: "ecology",
  requires: ["artifact:biomes", "artifact:heightfield"],
  provides: ["artifact:vegetationIntents"],

  // Decision #1: ops declared as contracts (single source of truth)
  ops: {
    trees: PlanTreeVegetationContract,
    shrubs: PlanShrubVegetationContract,
  },

  // O3: if you need extra non-op fields, you MUST provide explicit schema.
  // Here we have densityBias, so we author schema explicitly.
  schema: Type.Object(
    {
      densityBias: Type.Number({ minimum: -1, maximum: 1, default: 0 }),
      trees: Type.Any(),  // will be replaced by derived envelope schema (see defineStepContract rules)
      shrubs: Type.Any(), // replaced by derived envelope schema
    },
    { additionalProperties: false, default: {} }
  ),
} as const);

// Runtime ops are structurally stripped (no normalize)
const ops = bindRuntimeOps(contract.ops, ecologyOpsById);

export const step = createStep(contract, {
  // compile-time step normalize hook (optional)
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

### Key invariants enforced by this pattern

* `run(ctx,cfg)` has no access to compiler utilities and no access to compile-only op hooks.
* Ops are listed once (contracts) and bound once (runtime binder).
* `normalize` exists but is not callable at runtime because `createStep` does not expose it to the engine runtime surface.

---

# 1.14 Binding helpers

## Purpose

Provide one canonical binding API that:

* Maps from contract-declared ops (contracts) to implementation registries by id.
* Produces **two** surfaces:

  * compile surface (includes normalize/defaultConfig/schema access)
  * runtime surface (structurally stripped; cannot normalize)

**Decision #2:** structural enforcement, not type-only.

## Canonical location

`packages/mapgen-core/src/authoring/bindings.ts`

(Exports used by both steps and compiler; does not import engine plan compiler.)

## Canonical types

### Op registry shape

To make binding safe and predictable, define a single registry pattern per domain:

```ts
export type OpId = string;

export type OpsById<Op> = Readonly<Record<OpId, Op>>;
```

Domain packages should export:

* `ecologyOpsById` for runtime ops (DomainOpCompile objects are fine; runtime binder strips)
* optionally `ecologyContracts` for contracts (not required for binding)

### Compile vs runtime op shapes (see “Exact shapes” section below)

* `DomainOpCompile` (has normalize hook, config schema, defaultConfig, runValidated)
* `DomainOpRuntime` (no normalize; run/runValidated only)

## Canonical APIs

### `bindCompileOps`

Used only by the compiler pipeline (or step normalize compilation) when it needs access to normalize/defaultConfig.

```ts
export function bindCompileOps<
  const Decl extends Record<string, { id: string }>,
  Registry extends Record<string, DomainOpCompileAny>
>(
  decl: Decl,
  registry: Registry
): { [K in keyof Decl]: DomainOpCompileAny };
```

### `bindRuntimeOps`

Used inside step module closure (Decision #3).

```ts
export function bindRuntimeOps<
  const Decl extends Record<string, { id: string }>,
  Registry extends Record<string, DomainOpCompileAny>
>(
  decl: Decl,
  registry: Registry
): { [K in keyof Decl]: DomainOpRuntimeAny };
```

### Implementation spec (structural stripping)

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

### Binding behavior and constraints

* Error if:

  * contract references an op id not present in registry
  * `decl` contains key `"knobs"` (should not happen; reserved key is stage-level)
* Preserve decl keys for IDE completion (`as const` + const generics)

## Canonical binding helpers file (copy-pasteable)

```ts
// packages/mapgen-core/src/authoring/bindings.ts

import type { DomainOpCompileAny, DomainOpRuntimeAny } from "./op/shapes";

export function runtimeOp(op: DomainOpCompileAny): DomainOpRuntimeAny {
  return {
    id: op.id,
    kind: op.kind,
    run: op.run,
    validate: op.validate,
    runValidated: op.runValidated,
  };
}

export function bindCompileOps<
  const Decl extends Record<string, { id: string }>
>(
  decl: Decl,
  registryById: Record<string, DomainOpCompileAny>
): { [K in keyof Decl]: DomainOpCompileAny } {
  const out: any = {};
  for (const k of Object.keys(decl)) {
    const id = decl[k].id;
    const op = registryById[id];
    if (!op) throw new Error(`bindCompileOps: missing op id "${id}" for key "${k}"`);
    out[k] = op;
  }
  return out;
}

export function bindRuntimeOps<
  const Decl extends Record<string, { id: string }>
>(
  decl: Decl,
  registryById: Record<string, DomainOpCompileAny>
): { [K in keyof Decl]: DomainOpRuntimeAny } {
  const out: any = {};
  for (const k of Object.keys(decl)) {
    const id = decl[k].id;
    const op = registryById[id];
    if (!op) throw new Error(`bindRuntimeOps: missing op id "${id}" for key "${k}"`);
    out[k] = runtimeOp(op);
  }
  return out;
}
```

## Testing usage (no per-step factories as primitives)

In tests you can bind fake ops:

```ts
const fakeOpsById = {
  "ecology/planTreeVegetation": makeFakeOp(),
  "ecology/planShrubVegetation": makeFakeOp(),
};

const ops = bindRuntimeOps(contract.ops, fakeOpsById);
// step.run uses ops closure binding; you can invoke it under a mocked ctx/config
```

No bespoke `createPlotVegetationStep` required.

---

# 1.15 Author input vs compiled typing

## Purpose

Spell out the exact type split and how it ties to the compiler pipeline and envelope prefill.

This must satisfy:

* Decision #4: StepConfigInputOf split
* Decision #5: compiled config drops knobs
* O3: ops-derived schema cannot have extra fields (if you need extras, you author schema)
* No step `inputSchema` concept required

## Canonical types

### Step-level types

Let:

* `StepContract` has:

  * `schema`: internal step schema (canonical runtime config)
  * `ops`: declared as op contracts

Then:

**Runtime config type (strict, total, canonical):**

```ts
type StepConfigOf<C extends StepContractAny> = Static<C["schema"]>;
```

**Author input type (allows omitted envelopes for declared ops):**

```ts
type StepConfigInputOf<C extends StepContractAny> =
  OmitPartialOps<Static<C["schema"]>, keyof C["ops"]>;
```

Concrete definition:

```ts
type OmitPartialOps<T, K extends PropertyKey> =
  T extends object ? Omit<T, Extract<K, keyof T>> & Partial<Pick<T, Extract<K, keyof T>>> : T;
```

Meaning:

* If `ops` declares `{ trees, shrubs }`, then in author input you can omit `trees` and `shrubs`.
* The compiler prefills them before strict validation.

### Stage config input

Single author-facing object per stage:

* always has optional `knobs`
* has either:

  * stage public fields (if stage defines public), or
  * internal step-id keyed configs (if not)

Types:

```ts
type StageInternalInputOf<TStage> =
  Partial<{ [stepId in StepIdsOf<TStage>]: StepConfigInputOf<StepById<TStage, stepId>> }>;

type StageConfigInputOf<TStage> =
  (TStage has public ? Static<TStage.public> : StageInternalInputOf<TStage>)
  & { knobs?: Partial<Static<TStage.knobs>> };
```

### Recipe input vs compiled output (O2)

**Author input (partial, ergonomic):**

```ts
type RecipeConfigInputOf<TRecipe> =
  Partial<{ [stageId in StageIds]: StageConfigInputOf<StageById<stageId>> }>;
```

**Compiled output (total, canonical, no knobs):**

```ts
type CompiledRecipeConfigOf<TRecipe> =
  { [stageId in StageIds]:
      { [stepId in StepIdsOfStage]: StepConfigOf<StepById<...>> } };
```

**Decision #5:** compiled drops knobs. If you want observability, compiler can return a separate trace artifact:

```ts
type CompilationTrace = {
  stages: Record<string, { knobs: unknown; warnings: string[] }>;
};
```

## Prefill + strict validation interaction (mechanics)

Compiler pipeline order (per step):

1. Start with raw step config input (may omit op keys)
2. Prefill op envelopes for each `opKey` in `step.contract.ops`:

   * Build envelope schema + default envelope via shared envelope builder (O1)
   * If `raw[opKey]` missing, insert default envelope
3. Run strict `normalizeStrict(step.schema)` (unknown keys errors + default/clean)
4. Run `step.normalize(cfg, ctx)` if present (shape-preserving)
5. Run op normalization pass for each opKey:

   * normalize envelope (strategy config normalize) using compile op surface
6. Re-run strict `normalizeStrict(step.schema)`
7. Output is `StepConfigOf` (canonical runtime config)

This guarantees:

* author can omit envelopes (StepConfigInputOf)
* runtime sees fully concrete config (StepConfigOf)
* no runtime defaulting needed

---

# 1.16 Call chain

## Purpose

Pin one authoritative “who calls what” to avoid dual paths, fallback behavior, or engine improvisation.

## Canonical call chain (single authoritative flow)

### Textual (authoritative)

1. Runtime entrypoint constructs:

   * `env` (Civ7 runtime inputs)
   * `recipeConfigInput` (author config; stage objects include `knobs` field)
2. Runtime calls **only**:

   * `recipe.run({ context, env, config: recipeConfigInput })`
3. Inside `recipe.run`:

   * `compiled = recipe.compileConfig({ env, config })`
   * `runRequest = recipe.runRequest({ env, compiled })`
   * `plan = engine.compileExecutionPlan(runRequest)` (validate-only; no default/clean)
   * `executor.executePlan(context, plan)` (no default/clean; uses plan.configs as-is)
4. Steps run with `run(ctx, config)` only; ops are available through module-bound runtime bindings, not passed through engine.

### Bullet diagram

* `standard-entry.ts` (or equivalent)

  * builds `env`
  * builds `config`
  * calls `recipe.run(...)`
* `authoring/createRecipe.ts`

  * `compileConfig(...)` → calls `compiler/compileRecipeConfig(...)`
  * `instantiate(compiled)` → builds `RecipeV2`
  * `runRequest(env, recipeV2)` → builds `RunRequest`
  * `engine.compileExecutionPlan(runRequest)` → validate-only plan
  * `executor.executePlan(context, plan)` → runs steps
* `engine/PipelineExecutor`

  * runs plan nodes with config
  * **never** defaults/cleans
* `step.run`

  * uses canonical config only
  * uses runtime ops via `bindRuntimeOps` closure binding
  * cannot call normalize (runtime op surface stripped)

## Explicit “no fallback” statements (must be in doc)

* There is no path where:

  * engine defaults missing configs
  * executor defaults missing configs
  * step.run defaults configs
* If compilation fails, the run fails with `RecipeCompileError` before engine plan compile.

---

# Additional required drop-ins (not part of stubs, but must be added nearby)

These close the remaining open items.

---

## A) Exact compile op shape vs runtime op shape

### Compile op shape (compiler-visible)

`DomainOpCompile` must include:

* `id`, `kind`
* `config` envelope schema
* `defaultConfig` envelope value
* `strategies` including optional `normalize` hooks per strategy
* `runValidated` (optional but recommended; already used in baseline)
* `validate`

### Runtime op shape (step.run-visible)

`DomainOpRuntime` must include only:

* `id`, `kind`
* `run` and/or `runValidated` and `validate`
* **must NOT include** `normalize`, `defaultConfig`, or `strategies`

Canonical TS:

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

Structural stripping is via `runtimeOp(op)` (Decision #2).

---

## B) Single rule: where compile-time normalization is allowed

**Rule (crisp):**

> Only the **compiler pipeline** and its helpers may call `step.normalize` and `op strategy normalize`. Runtime code never can, because it never has access to the compile op surface.

Enforcement mechanisms (structural, not policy):

* runtime ops are bound using `bindRuntimeOps`, which returns `DomainOpRuntime` that has no normalize members
* engine step interface remains `run(ctx, cfg)`; step.normalize is not part of engine runtime shape
* compiler modules are not exported in runtime-facing entrypoints

---

## C) Reconciliation of review items (1–16) with final choices

Here’s what’s now resolved by the decisions (so no further choices remain):

* (4) Step ops declaration: **contracts + derived refs** (Decision #1)
* (5) Runtime-vs-compile op separation: **structural stripping** (Decision #2)
* (6) Ops binding locus: **step module closure**, using binding helpers (Decision #3)
* (9) StepConfigInputOf split: **kept** (Decision #4)
* (11) Compiled config drops knobs: **yes** (Decision #5)
* (2) Env location: **core/env.ts** (Decision #6)
* Knobs reserved key constant: **authoring/stage/constants.ts** (Decision #6)
* (13) Call chain pinned: **Section 1.16**
* (15) Naming unify: compile-time hook is `normalize`, not `resolveConfig`

Remaining small spec cleanup items that must be applied when you paste:

* Ensure any reference to `opRef` in step contracts is removed (Decision #1)
* Ensure any appendices that show “compiled config contains knobs” are corrected (Decision #5)
* Ensure canonical doc references `bindCompileOps/bindRuntimeOps` as the only binding API (Section 1.14)

---

# One last note on “bind in step module closure” (Decision #3) without per-step factories

This is the canonical author pattern:

* Step module is a plain module file.
* It declares `contract` and `step`.
* It binds runtime ops at module initialization via `bindRuntimeOps(contract.ops, domainOpsById)`.

No bespoke `createPlotVegetationStep` factory is introduced as an architectural primitive.

If you want a DI seam for tests, you can:

* expose `makeStep(deps)` as a local helper **inside the test**, not as a pattern we document as canonical
* or provide a test helper that swaps the op registry.

---

## If you want me to go further

If you paste (or point me to) the exact 1–16 list inside your canonical doc working tree, I can produce a **mechanical edit checklist** mapping each item to:

* “resolved by Decision #x”
* “needs doc edit at section y”
* “needs new signature z”
