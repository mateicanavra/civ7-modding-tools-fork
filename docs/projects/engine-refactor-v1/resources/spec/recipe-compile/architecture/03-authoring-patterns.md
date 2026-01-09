# Authoring Patterns

This document defines the canonical patterns for authoring steps, binding
ops, and the type-level split between author input and compiled output.

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

- `defineStepContract` from core authoring
- `createStep` from the mod’s stable authoring alias (`@mapgen/authoring/steps`) so the mod’s `ExtendedMapContext` typing is centralized
- `bindRuntimeOps` (and sometimes `bindCompileOps` in compiler-only code; not used by runtime `run`)
- Domain **contracts** for op declarations (IDs + schemas), imported only via the domain public surface (`@mapgen/domain/<domain>`)
- Domain **opsById** registry for runtime binding (by id), imported only via the domain public surface (`@mapgen/domain/<domain>`)
- No compiler helpers and no TypeBox `Value.*` inside runtime `run`

#### Canonical step module shape

```ts
// mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-vegetation/index.ts

import { Type } from "typebox";

import { defineStepContract } from "@swooper/mapgen-core/authoring";
import { bindRuntimeOps } from "@swooper/mapgen-core/authoring/bindings";
import { createStep } from "@mapgen/authoring/steps";

// Domain public surface (canonical): step modules never deep-import op files.
import * as ecology from "@mapgen/domain/ecology";

export const contract = defineStepContract({
  id: "plot-vegetation",
  phase: "ecology",
  requires: ["artifact:biomes", "artifact:heightfield"],
  provides: ["artifact:vegetationIntents"],

  // Ops declared as contracts (single source of truth)
  ops: {
    trees: ecology.contracts.planTreeVegetation,
    shrubs: ecology.contracts.planShrubVegetation,
  },

  // O3: if you need non-op fields, you MUST provide an explicit schema.
  // Here we have `densityBias`, so we author the schema explicitly.
  //
  // `defineStepContract` overwrites the op keys (`trees`, `shrubs`) with their derived
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

// Runtime ops are structurally stripped (no normalize/defaultConfig/strategies).
// Note: binding is by op id via the domain registry; decl keys are preserved for IDE completion.
const ops = bindRuntimeOps(contract.ops, ecology.opsById);

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

- `opsById` from the domain public surface (e.g. `import * as ecology from "@mapgen/domain/ecology"; ecology.opsById`)

DX rule (pinned): step modules / recipes / tests must not deep-import domain internals (e.g. no `@mapgen/domain/ecology/ops-by-id` import). The domain entrypoint is the only allowed cross-module import path.

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

