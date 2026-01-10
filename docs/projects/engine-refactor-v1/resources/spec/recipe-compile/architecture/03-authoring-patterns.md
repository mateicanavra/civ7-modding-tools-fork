# Authoring Patterns

This document defines the canonical patterns for authoring steps, binding
ops, and the type-level split between author input and compiled output.

### 1.13 Canonical Step Module Pattern

#### Purpose

Define the single recommended, repo-realistic authoring pattern for a step module that:

- Declares op contracts once in a module-scope `opContracts` map and uses them for binding.
- Binds ops **inside the step module closure**, not in the stage factory.
- Ensures runtime cannot call compile-time normalization hooks (runtime ops surface is structurally stripped; compile registries are compile-only and lint-restricted).
- Keeps step contracts schema-only (explicit schema required) and uses schema defaults or step normalization for canonicalization.

#### Canonical exports for a step module

A step module should export:

- `contract`: `StepContract<...>`
- `step`: the engine-facing step module created by `createStep(contract, impl)`
- Optionally: `type Config = Static<typeof contract.schema>` (local clarity only; `Static` comes from core authoring)

#### Canonical imports for a step module

A step module should import:

- `Type`/`Static` + `defineStepContract` from core authoring
- `createStep` from the bound authoring entrypoint (`@mapgen/authoring/steps` in mods)
- `bindRuntimeOps` and `bindCompileOps` from core authoring (compile ops are used inside `step.normalize`)
- Domain **contracts** for op declarations (IDs + schemas), imported via the domain contract surface (`@mapgen/domain/<domain>/contracts`)
- Domain **runtimeOpsById** registry for runtime binding (by id), imported only via the domain public surface (`@mapgen/domain/<domain>`)
- No compiler helpers and no TypeBox `Value.*` inside runtime `run`

#### Domain entrypoint shape (canonical; pinned)

The spec assumes each domain exports:

- A domain public surface (`@mapgen/domain/<domain>`) (no deep imports into internal `ops/**` / `strategies/**`), with:
  - `contracts` — op contracts only (stable, used by step contracts)
  - `ops` — compile-surface ops (developer convenience; optional)
  - `compileOpsById` — deterministic registry keyed by `op.id` returning **compile-surface ops** (required by compiler)
  - `runtimeOpsById` — deterministic registry keyed by `op.id` returning **runtime-surface ops** (required by step module binding)
- A domain contract surface (`@mapgen/domain/<domain>/contracts`) that is contract-only (no implementations), for step contracts and schema/type-only consumers.

Inline example:

```ts
// mods/mod-swooper-maps/src/domain/ecology/index.ts

import type { DomainOpCompileAny, DomainOpRuntime, OpsById } from "@swooper/mapgen-core/authoring";
import { runtimeOp } from "@swooper/mapgen-core/authoring";

import { planTreeVegetationContract } from "./ops/plan-tree-vegetation/contract.js";
import { planShrubVegetationContract } from "./ops/plan-shrub-vegetation/contract.js";

import { planTreeVegetation } from "./ops/plan-tree-vegetation/index.js";
import { planShrubVegetation } from "./ops/plan-shrub-vegetation/index.js";

export const contracts = {
  planTreeVegetation: planTreeVegetationContract,
  planShrubVegetation: planShrubVegetationContract,
} as const;

export const ops = {
  planTreeVegetation,
  planShrubVegetation,
} as const;

type EcologyOp = (typeof ops)[keyof typeof ops];

export const compileOpsById: OpsById<EcologyOp> = buildOpsById(ops);
export const runtimeOpsById: OpsById<DomainOpRuntime<EcologyOp>> = buildRuntimeOpsById(ops);

function buildOpsById<const TOps extends Record<string, DomainOpCompileAny>>(
  input: TOps
): OpsById<TOps[keyof TOps]> {
  const out: Partial<OpsById<TOps[keyof TOps]>> = {};
  for (const op of Object.values(input) as Array<TOps[keyof TOps]>) {
    out[op.id as TOps[keyof TOps]["id"]] = op as OpsById<TOps[keyof TOps]>[TOps[keyof TOps]["id"]];
  }
  return out as OpsById<TOps[keyof TOps]>;
}

function buildRuntimeOpsById<const TOps extends Record<string, DomainOpCompileAny>>(
  input: TOps
): OpsById<DomainOpRuntime<TOps[keyof TOps]>> {
  const out: Partial<OpsById<DomainOpRuntime<TOps[keyof TOps]>>> = {};
  for (const op of Object.values(input) as Array<TOps[keyof TOps]>) {
    const runtime = runtimeOp(op);
    out[runtime.id as DomainOpRuntime<TOps[keyof TOps]>["id"]] =
      runtime as OpsById<DomainOpRuntime<TOps[keyof TOps]>>[DomainOpRuntime<TOps[keyof TOps]>["id"]];
  }
  return out as OpsById<DomainOpRuntime<TOps[keyof TOps]>>;
}
```

#### Canonical step module shape

```ts
// mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-vegetation/index.ts

import { Type, bindCompileOps, bindRuntimeOps, defineStepContract } from "@swooper/mapgen-core/authoring";
import { createStep } from "@mapgen/authoring/steps";

// Domain public surface (canonical): step modules never deep-import op files.
import * as ecology from "@mapgen/domain/ecology";
import * as ecologyContracts from "@mapgen/domain/ecology/contracts";

export const contract = defineStepContract({
  id: "plot-vegetation",
  phase: "ecology",
  requires: ["artifact:biomes", "artifact:heightfield"],
  provides: ["artifact:vegetationIntents"],
  // Schema is explicit and schema-only; op envelopes are included via op.config schemas.
  schema: Type.Object(
    {
      densityBias: Type.Number({ minimum: -1, maximum: 1, default: 0 }),
      trees: ecology.ops.planTreeVegetation.config,
      shrubs: ecology.ops.planShrubVegetation.config,
    },
    { additionalProperties: false, default: {} }
  ),
} as const);

const opContracts = {
  trees: ecologyContracts.planTreeVegetation,
  shrubs: ecologyContracts.planShrubVegetation,
} as const;

const compileOps = bindCompileOps(opContracts, ecology.compileOpsById);
const runtimeOps = bindRuntimeOps(opContracts, ecology.runtimeOpsById);

export const step = createStep(contract, {
  // Compile-time step normalize hook (optional).
  // NOTE: This runs only in the compiler pipeline, not at runtime.
  normalize: (cfg, ctx) => {
    // e.g. apply knobs-derived bias into envelopes in a shape-preserving way
    const bias = cfg.densityBias;
    return {
      ...cfg,
      trees: applyDensityBias(compileOps.trees.normalize(cfg.trees, ctx), bias),
      shrubs: applyDensityBias(compileOps.shrubs.normalize(cfg.shrubs, ctx), bias),
    };
  },

  run: async (ctx, cfg) => {
    // Runtime: can only call runtime ops surface (run), cannot call normalize.
    const input = buildVegetationInput(ctx);
    const trees = runtimeOps.trees.run(input, cfg.trees);
    const shrubs = runtimeOps.shrubs.run(input, cfg.shrubs);

    ctx.artifacts.set("artifact:vegetationIntents", { trees, shrubs });
  },
});
```

Key invariants enforced by this pattern:

- `run(ctx, cfg)` has no access to compiler utilities and no access to compile-only op hooks.
- Ops are listed once (module-scope contracts) and bound once (runtime binder).
- `normalize` exists but is not callable at runtime because step modules bind only against `runtimeOpsById` (structurally stripped). Importing compile registries into runtime modules is forbidden by lint boundaries.

---
### 1.14 Binding helpers

#### Purpose

Provide one canonical binding API that:

- Maps from module-scope op contract maps to implementation registries by id.
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

- `compileOpsById` and `runtimeOpsById` from the domain public surface (e.g. `import * as ecology from "@mapgen/domain/ecology"; ecology.compileOpsById` / `ecology.runtimeOpsById`)

Pinned ownership/flow (no implicit globals):
- The recipe compiler entrypoint receives a recipe-owned `compileOpsById` registry (compile-surface ops, by `op.id`).
- `compileOpsById` is assembled at the recipe boundary by merging the domain registries for the domains used by the recipe/stages.
- Step modules bind only against `runtimeOpsById` (runtime-surface ops, by `op.id`); runtime code must not depend on compile-surface registries.

Illustrative assembly (end-to-end callers only):

```ts
import * as ecology from "@mapgen/domain/ecology";
import * as hydrology from "@mapgen/domain/hydrology";

const compileOpsById = {
  ...ecology.compileOpsById,
  ...hydrology.compileOpsById,
} as const;
```

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
  registryById: Record<string, DomainOpRuntimeAny>
): { [K in keyof Decl]: DomainOpRuntimeAny };
```

Structural stripping (compile → runtime):

```ts
export function runtimeOp(op: DomainOpCompileAny): DomainOpRuntimeAny {
  return {
    id: op.id,
    kind: op.kind,
    run: op.run,
  } as const;
}
```

Binding behavior and constraints:

- Throw if a contract references an op id not present in the registry.
- Preserve decl keys for IDE completion (`as const` + const generics).

Testing usage (no per-step factories as primitives):

```ts
const fakeCompileOpsById = {
  "ecology/planTreeVegetation": makeFakeOp(),
  "ecology/planShrubVegetation": makeFakeOp(),
};

const fakeRuntimeOpsById = buildRuntimeOpsById(fakeCompileOpsById);
const opContracts = {
  trees: ecologyContracts.planTreeVegetation,
  shrubs: ecologyContracts.planShrubVegetation,
} as const;
const ops = bindRuntimeOps(opContracts, fakeRuntimeOpsById);
// step.run uses ops closure binding; you can invoke it under a mocked ctx/config
```

No bespoke `createPlotVegetationStep` factory is introduced as an architectural primitive.

---
### 1.15 Author input vs compiled typing

#### Purpose

Pin the exact type split and how it ties to the compiler pipeline and normalization behavior.

This must satisfy:

- Author config is shaped by step schemas (no step-level `inputSchema`)
- Compiled config drops knobs (no runtime knob channel)
- Op envelope defaults are handled by schema defaults or step normalization

#### Canonical types

Step-level types:

- Runtime config type (strict, canonical): `StepConfigOf<C> = Static<C["schema"]>`
- Author input type is the same shape as the step schema (defaults are applied by the compiler)

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

#### Canonicalization + strict validation interaction (mechanics)

Compiler pipeline order (per step):

1. Start with raw step config input (stage output, partial by stage)
2. If the compiler has op metadata (`step.contract.ops`), prefill missing op envelopes
3. Run strict `normalizeStrict(step.schema)` (unknown keys error + default/clean)
4. Run `step.normalize(cfg, ctx)` if present (shape-preserving)
5. If `step.contract.ops` is declared, run the mechanical op normalization pass:
   - normalize envelopes using compile op surface
6. Re-run strict `normalizeStrict(step.schema)`
7. Output is `StepConfigOf` (canonical runtime config)

This guarantees:

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
   - `plan = engine.compileExecutionPlan(runRequest)` (identity-only; no default/clean)
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
- `run` and the compile-time `normalize` hook

Runtime op shape (step.run-visible) must include only:

- `id`, `kind`
- `run`
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
  run: Function;
};

export type DomainOpRuntime = Pick<DomainOpCompile, "id" | "kind" | "run">;
```

Structural stripping is via `runtimeOp(op)` (see §1.14).

---
