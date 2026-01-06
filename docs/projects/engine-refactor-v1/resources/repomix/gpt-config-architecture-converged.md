# GPT-Pro Config Architecture Converged

## 1. Canonical Architecture

### Problem

- Operation authoring needs contract-first structure so strategy implementations can be authored out of line with full type inference.
- Steps must stay simple contracts that orchestrate ops without owning or declaring op graphs.
- The bridge between steps and ops must be function calls with validated values, not structural coupling or mechanical compilation.

### Design goals

- Contract-first and declarative.
- Compile-time availability for all important artifacts (schemas, config shapes, defaults).
- Domain and recipe separation: steps do not own or expose op bindings; ops remain pure functions.
- Strategy selection stays a local op detail using the envelope `{ strategy, config }`.

### Conceptual model: operations, strategies, rules, steps, stages

**Operations**
- Defined by their **contracts** (inputs/outputs) and represent **observable units of work** in a domain.
- Must have a **coherent, stable input shape**. If inputs diverge across use cases, split into multiple ops.
- Use operations for planning, analysis, or any pure computation you want to inspect independently.

**Strategies**
- Algorithmic variants of the **same operation**.
- Same input and output contract; different internal computation.
- If the IO contract needs to change, that is **not** a strategy—define a new op.

**Rules**
- Small, discrete policy/decision units (checks, scores, thresholds).
- Split into focused files under `rules/` and composed inside strategies.

**Steps**
- **Action boundaries**: orchestrate ops and then **do** something with the results (apply changes, publish artifacts).
- Steps are not planning units. Planning belongs inside ops/strategies.
- A step can call multiple ops, collect outputs, and emit a coherent artifact.

**Stages**
- Organize steps into recipe phases and dependency boundaries.
- Pure orchestration; no domain semantics or op wiring.

**Vegetation example framing**
- A step named `plan-vegetation` is a smell: planning belongs to ops, not steps.
- The correct shape is a `plot-vegetation` step that orchestrates multiple **planning ops**
  (trees, shrubs, groundcover, embellishments) and then publishes a coherent artifact.
- If one “plan vegetation” op keeps growing new input needs, split it into focused ops with stable inputs.

### Core model

**Operation**
- A focused, pure domain capability: `run(input, config) -> output`.
- Contract owns IO schemas and per-strategy config schemas.
- Strategy implementations are attached to the contract using `createStrategy`.
- Runtime op is created by `createOp(contract, { strategies })`, which derives:
  - `op.config` as a union over strategy envelopes
  - `op.defaultConfig` from the default strategy schema
  - `op.resolveConfig` as a per-strategy resolver hook (compile-time only)
- `types.ts` exports a **single type bag** derived from the contract via `OpTypeBag`; callers select types via indexing (e.g. `OpTypes["input"]`, `OpTypes["config"]["default"]`).

**Step**
- **Contract** is metadata only: `id`, `phase`, `requires`, `provides`, and `schema`.
- **Implementation** is attached by a bound factory:
  - `const createStep = createStepFor<TContext>()`
  - `createStep(contract, { resolveConfig?, run })`
- Bound factories live in `src/authoring/steps.ts` and are the only entrypoint for step implementations.
- Contract is authored with `defineStepContract` and exported independently of implementation.
- `resolveConfig` is implementation-only; the contract file never contains runtime code.
- Config schema is owned by the step and can reuse op config schemas for convenience.
- Steps call ops with validated values and do not declare op bindings or graphs.
- A step is the action boundary; ops do planning and analysis.

**Bridge**
- Steps build op inputs from context, resolve config with `op.resolveConfig`, and call `op.runValidated`.
- Recipe v2 and step registry compilation remain unchanged; the only wiring change is passing step `resolveConfig` through when registering steps.
- `createStepFor<TContext>()` is required to lock step context typing and provide full autocomplete in `run`/`resolveConfig`.

**Shared utilities**
- Shared math, noise, RNG, grid, and other cross-cutting helpers must come from the core SDK.
- Prefer root re-exports from `@swooper/mapgen-core` when available to avoid churn.
- If a helper is broadly useful but missing, add it to the core SDK and import it from there.
- If a helper is truly local to one op/step, keep it local and do not promote it.

### Canonical file layout for ops and domains

```
mods/mod-swooper-maps/src/domain/
  <domain>/
    index.ts
    ops/
      index.ts
      <op-slug>/
        contract.ts
        types.ts
        rules/
          index.ts
          <rule>.ts
        strategies/
          index.ts
          <strategy>.ts
        index.ts
```

### Import direction rules for ops

- `contract.ts` is the single runtime schema truth and does **not** import from `rules/**` or `strategies/**`.
- `types.ts` is type-only: import `OpTypeBag` from the core authoring package and reference the contract via `typeof import("./contract.js")`.
- Optional convenience types (e.g., `Placement` helpers) live in `types.ts` and must remain type-only.
- `rules/**`:
  - **Never** import `../contract.js` (lint-enforced, no exceptions).
  - Import types from `../types.js` using `import type`.
  - Import shared utilities only from core SDK packages (e.g., `@swooper/mapgen-core`).
  - Do not export or re-export types from helper modules; all shared types live in `types.ts`.
- `rules/index.ts` is the runtime barrel for rules and should only export runtime helpers.
- `strategies/**` import `../contract.js`, `../rules/index.js`, and optionally `../types.js` for type annotations.
- `strategies/index.ts` is the runtime barrel for strategies.
- `index.ts` imports only the contract and the strategies barrel, calls `createOp`, and re-exports `*` from `./contract.js` plus `type *` from `./types.js`.
- No `schemas/`, `context.ts`, or alternate entrypoints for ops.

### Path aliasing rules

- Use stable path aliases for cross-module imports:
  - `@mapgen/domain/*` → `mods/mod-swooper-maps/src/domain/*`
  - `@mapgen/authoring/*` → `mods/mod-swooper-maps/src/authoring/*`
- Keep relative imports within a single op or step directory (e.g., `./rules/...`, `./strategies/...`).
- Do not force aliasing on local helpers; use aliases only when crossing module boundaries.

### Canonical file layout for steps

```
mods/mod-swooper-maps/src/recipes/<recipe>/stages/<stage>/steps/
  <step-slug>/
    contract.ts
    index.ts
    lib/
      <helper>.ts
```

### Canonical file layout for bound step factories

```
mods/mod-swooper-maps/src/authoring/
  steps.ts
```

### Canonical authoring API (files)

The following files are the canonical authoring surface for contract-first ops and contract-first steps.

`packages/mapgen-core/src/authoring/op/contract.ts`
```ts
import type { TSchema } from "typebox";

import type { DomainOpKind } from "./types.js";

export type StrategyConfigSchemas = Readonly<Record<string, TSchema>>;

export type OpContract<
  Kind extends DomainOpKind,
  Id extends string,
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Strategies extends StrategyConfigSchemas & { default: TSchema },
> = Readonly<{
  kind: Kind;
  id: Id;
  input: InputSchema;
  output: OutputSchema;
  strategies: Strategies;
}>;

export function defineOpContract<
  const Kind extends DomainOpKind,
  const Id extends string,
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  const Strategies extends StrategyConfigSchemas & { default: TSchema },
>(def: OpContract<Kind, Id, InputSchema, OutputSchema, Strategies>): typeof def {
  return def;
}
```

`packages/mapgen-core/src/authoring/op/types.ts`
```ts
import type { Static, TSchema } from "typebox";

export type OpContractLike = Readonly<{
  input: TSchema;
  output: TSchema;
  strategies: Readonly<Record<string, TSchema>>;
}>;

export type OpStrategyId<TContract extends OpContractLike> =
  keyof TContract["strategies"] & string;

export type OpTypeBag<TContract extends OpContractLike> = Readonly<{
  input: Static<TContract["input"]>;
  output: Static<TContract["output"]>;
  strategyId: OpStrategyId<TContract>;
  config: Readonly<{
    [K in OpStrategyId<TContract>]: Static<TContract["strategies"][K]>;
  }>;
  envelope: {
    [K in OpStrategyId<TContract>]: Readonly<{
      strategy: K;
      config: Static<TContract["strategies"][K]>;
    }>;
  }[OpStrategyId<TContract>];
}>;
```

`mods/mod-swooper-maps/src/domain/<domain>/ops/<op-slug>/types.ts`
```ts
import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").SomeOpContract;

export type SomeOpTypes = OpTypeBag<Contract>;
```

Caller usage is via a single type bag import and direct indexing:

```ts
import type { SomeOpTypes } from "./types.js";

type Input = SomeOpTypes["input"];
type Output = SomeOpTypes["output"];
type StrategyId = SomeOpTypes["strategyId"];
type DefaultConfig = SomeOpTypes["config"]["default"];
type Envelope = SomeOpTypes["envelope"];
```

`packages/mapgen-core/src/authoring/op/strategy.ts`
```ts
import type { Static, TSchema } from "typebox";

import type { RunSettings } from "@mapgen/engine/execution-plan.js";
import type { OpContract } from "./contract.js";

type NoInfer<T> = [T][T extends any ? 0 : never];

export type OpStrategy<ConfigSchema extends TSchema, Input, Output> = Readonly<{
  config: ConfigSchema;
  resolveConfig?: (
    config: Static<NoInfer<ConfigSchema>>,
    settings: RunSettings
  ) => Static<NoInfer<ConfigSchema>>;
  run: (input: Input, config: Static<NoInfer<ConfigSchema>>) => Output;
}>;

export type StrategyImpl<ConfigSchema extends TSchema, Input, Output> = Readonly<{
  resolveConfig?: (
    config: Static<NoInfer<ConfigSchema>>,
    settings: RunSettings
  ) => Static<NoInfer<ConfigSchema>>;
  run: (input: Input, config: Static<NoInfer<ConfigSchema>>) => Output;
}>;

export type StrategyImplFor<
  C extends OpContract<any, any, any, any, any>,
  Id extends keyof C["strategies"] & string,
> = StrategyImpl<
  C["strategies"][Id],
  Static<C["input"]>,
  Static<C["output"]>
>;

export type StrategyImplMapFor<C extends OpContract<any, any, any, any, any>> = Readonly<{
  [K in keyof C["strategies"] & string]: StrategyImplFor<C, K>;
}>;

export function createStrategy<
  const C extends OpContract<any, any, any, any, any>,
  const Id extends keyof C["strategies"] & string,
>(
  contract: C,
  id: Id,
  impl: StrategyImplFor<C, Id>
): StrategyImplFor<C, Id> {
  void contract;
  void id;
  return impl;
}

type StrategyConfigSchemaOf<T> = T extends { config: infer C extends TSchema } ? C : never;

export type StrategySelection<
  Strategies extends Record<string, { config: TSchema }>,
> = {
  [K in keyof Strategies & string]: Readonly<{
    strategy: K;
    config: Static<StrategyConfigSchemaOf<Strategies[K]>>;
  }>;
}[keyof Strategies & string];
```

`packages/mapgen-core/src/authoring/op/create.ts`
```ts
import { Type, type Static, type TSchema } from "typebox";

import type { RunSettings } from "@mapgen/engine/execution-plan.js";
import type { CustomValidateFn } from "../validation.js";
import type {
  OpStrategy,
  StrategyImplMapFor,
  StrategySelection,
} from "./strategy.js";
import type { DomainOp, OpConfigSchema } from "./types.js";
import type { OpContract } from "./contract.js";
import { buildDefaultConfigValue } from "./defaults.js";
import { attachValidationSurface } from "./validation-surface.js";

type RuntimeStrategiesForContract<C extends OpContract<any, any, any, any, any>> = Readonly<{
  [K in keyof C["strategies"] & string]: OpStrategy<
    C["strategies"][K],
    Static<C["input"]>,
    Static<C["output"]>
  >;
}>;

type StrategySelectionForContract<C extends OpContract<any, any, any, any, any>> =
  StrategySelection<RuntimeStrategiesForContract<C>>;

type OpImpl<C extends OpContract<any, any, any, any, any>> = Readonly<{
  strategies: StrategyImplMapFor<C>;
  customValidate?: CustomValidateFn<Static<C["input"]>, StrategySelectionForContract<C>>;
}>;

export function createOp<const C extends OpContract<any, any, any, any, any>>(
  contract: C,
  impl: OpImpl<C>
): DomainOp<C["input"], C["output"], RuntimeStrategiesForContract<C>>;

export function createOp(contract: any, impl: any): any {
  const strategySchemas = contract?.strategies as Record<string, TSchema> | undefined;
  const strategyImpls = impl?.strategies as
    | Record<string, { resolveConfig?: Function; run?: Function }>
    | undefined;

  if (!strategySchemas) {
    throw new Error(`createOp(${contract?.id ?? "unknown"}) requires a contract`);
  }

  if (!strategyImpls) {
    throw new Error(`createOp(${contract?.id ?? "unknown"}) requires strategies`);
  }

  if (!Object.prototype.hasOwnProperty.call(strategySchemas, "default")) {
    throw new Error(`createOp(${contract?.id}) missing required "default" strategy`);
  }

  const ids = Object.keys(strategySchemas);
  if (ids.length === 0) {
    throw new Error(`createOp(${contract?.id}) received empty strategies`);
  }

  const runtimeStrategies: Record<string, OpStrategy<TSchema, unknown, unknown>> = {};
  for (const id of ids) {
    const implStrategy = strategyImpls[id];
    if (!implStrategy) {
      throw new Error(`createOp(${contract?.id}) missing strategy "${id}"`);
    }
    runtimeStrategies[id] = {
      config: strategySchemas[id]!,
      resolveConfig: implStrategy.resolveConfig as any,
      run: implStrategy.run as any,
    };
  }

  for (const id of Object.keys(strategyImpls)) {
    if (!Object.prototype.hasOwnProperty.call(strategySchemas, id)) {
      throw new Error(`createOp(${contract?.id}) has unknown strategy "${id}"`);
    }
  }

  const defaultInnerConfig = buildDefaultConfigValue(strategySchemas.default) as Record<
    string,
    unknown
  >;
  const defaultConfig = { strategy: "default", config: defaultInnerConfig };

  const configCases = ids.map((id) =>
    Type.Object(
      {
        strategy: Type.Literal(id),
        config: strategySchemas[id]!,
      },
      { additionalProperties: false }
    )
  );

  const config = Type.Union(configCases as any, {
    default: defaultConfig,
  }) as unknown as OpConfigSchema<typeof runtimeStrategies>;

  const resolveConfig = (cfg: StrategySelection<typeof runtimeStrategies>, settings: RunSettings) => {
    if (!cfg || typeof cfg.strategy !== "string") {
      throw new Error(`createOp(${contract?.id}) resolveConfig requires a strategy`);
    }
    const selected = runtimeStrategies[cfg.strategy];
    if (!selected) {
      throw new Error(`createOp(${contract?.id}) unknown strategy "${cfg.strategy}"`);
    }
    if (!selected.resolveConfig) {
      return cfg;
    }
    return {
      strategy: cfg.strategy,
      config: selected.resolveConfig(cfg.config, settings),
    };
  };

  const domainOp = {
    kind: contract.kind,
    id: contract.id,
    input: contract.input,
    output: contract.output,
    strategies: runtimeStrategies,
    config,
    defaultConfig,
    resolveConfig,
    run: (input: any, cfg: any) => {
      if (!cfg || typeof cfg.strategy !== "string") {
        throw new Error(`createOp(${contract?.id}) requires config.strategy`);
      }
      const selected = runtimeStrategies[cfg.strategy];
      if (!selected) {
        throw new Error(`createOp(${contract?.id}) unknown strategy "${cfg.strategy}"`);
      }
      return selected.run(input, cfg.config);
    },
  } as const;

  return attachValidationSurface(domainOp, impl.customValidate);
}
```

`packages/mapgen-core/src/authoring/op/index.ts`
```ts
export { defineOpContract } from "./contract.js";
export { createOp } from "./create.js";
export { createStrategy } from "./strategy.js";

export type { OpContract, StrategyConfigSchemas } from "./contract.js";
export type { OpContractLike, OpStrategyId, OpTypeBag } from "./types.js";
export type { DomainOp, DomainOpKind } from "./types.js";
export type {
  OpStrategy,
  StrategyImpl,
  StrategyImplFor,
  StrategyImplMapFor,
  StrategySelection,
} from "./strategy.js";
```

`packages/mapgen-core/src/authoring/step/contract.ts`
```ts
import type { TSchema } from "typebox";

import type { DependencyTag, GenerationPhase } from "@mapgen/engine/index.js";

export type StepContract<Schema extends TSchema, Id extends string> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  schema: Schema;
}>;

export function defineStepContract<const Schema extends TSchema, const Id extends string>(
  def: StepContract<Schema, Id>
): typeof def {
  return def;
}
```

`packages/mapgen-core/src/authoring/step/create.ts`
```ts
import type { Static } from "typebox";

import type { RunSettings } from "@mapgen/engine/index.js";
import type { StepContract } from "./contract.js";
import type { StepModule } from "../types.js";

type StepConfigOf<C extends StepContract<any, any>> = Static<C["schema"]>;

type StepImpl<TContext, TConfig> = Readonly<{
  resolveConfig?: (config: TConfig, settings: RunSettings) => TConfig;
  run: (context: TContext, config: TConfig) => void | Promise<void>;
}>;

export function createStep<
  const C extends StepContract<any, any>,
  TContext = unknown,
>(
  contract: C,
  impl: StepImpl<TContext, StepConfigOf<C>>
): StepModule<TContext, StepConfigOf<C>> {
  if (!contract?.schema) {
    const label = contract?.id ? `step "${contract.id}"` : "step";
    throw new Error(`createStep requires an explicit schema for ${label}`);
  }
  return {
    ...contract,
    ...impl,
  };
}

export type CreateStepFor<TContext> = <
  const C extends StepContract<any, any>,
>(
  contract: C,
  impl: StepImpl<TContext, StepConfigOf<C>>
) => StepModule<TContext, StepConfigOf<C>>;

export function createStepFor<TContext>(): CreateStepFor<TContext> {
  return (contract, impl) => createStep(contract, impl);
}
```

`packages/mapgen-core/src/authoring/step/index.ts`
```ts
export { defineStepContract } from "./contract.js";
export { createStep, createStepFor } from "./create.js";

export type { StepContract } from "./contract.js";
```

`packages/mapgen-core/src/authoring/index.ts`
```ts
export { createStep, createStepFor, defineStepContract } from "./step/index.js";
export { createStage } from "./stage.js";
export { createRecipe } from "./recipe.js";
export { createOp, createStrategy, defineOpContract } from "./op/index.js";
export { applySchemaDefaults, defineOpSchema } from "./schema.js";
export { TypedArraySchemas } from "./typed-array-schemas.js";
export { OpValidationError } from "./validation.js";
export { Type } from "typebox";
export {
  assertFloat32Array,
  assertInt16Array,
  assertInt32Array,
  assertInt8Array,
  assertTypedArrayOf,
  assertUint16Array,
  assertUint8Array,
  expectedGridSize,
  isFloat32Array,
  isInt16Array,
  isInt32Array,
  isInt8Array,
  isTypedArrayOf,
  isUint16Array,
  isUint8Array,
} from "./typed-arrays.js";

export type {
  RecipeConfig,
  RecipeConfigOf,
  RecipeDefinition,
  RecipeModule,
  Stage,
  StageModule,
  Step,
  StepModule,
} from "./types.js";
export type { StepContract } from "./step/index.js";
export type {
  DomainOp,
  DomainOpKind,
  OpContract,
  OpContractLike,
  OpStrategy,
  OpStrategyId,
  OpTypeBag,
  StrategyImpl,
  StrategyImplFor,
  StrategyImplMapFor,
  StrategySelection,
} from "./op/index.js";
export type { Static, TSchema } from "typebox";
export type {
  CustomValidateFn,
  OpRunValidatedOptions,
  OpValidateOptions,
  ValidationError,
} from "./validation.js";
```

`packages/mapgen-core/src/authoring/recipe.ts`
```ts
import {
  compileExecutionPlan,
  createTraceSessionFromPlan,
  PipelineExecutor,
  StepRegistry,
  TagRegistry,
  type DependencyTagDefinition,
  type ExecutionPlan,
  type MapGenStep,
  type RecipeV2,
  type RunRequest,
  type RunSettings,
} from "@mapgen/engine/index.js";

import { createConsoleTraceSink } from "@mapgen/trace/index.js";
import type { TraceSession, TraceSink } from "@mapgen/trace/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type {
  RecipeConfig,
  RecipeConfigOf,
  RecipeDefinition,
  RecipeModule,
  Stage,
  Step,
} from "./types.js";

type AnyStage<TContext> = Stage<TContext, readonly Step<TContext, any>[]>;

type StepOccurrence<TContext> = {
  stageId: string;
  stepId: string;
  step: MapGenStep<TContext, unknown>;
};

function assertTagDefinitions(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error("createRecipe requires tagDefinitions (may be an empty array)");
  }
}

function inferTagKind(id: string): DependencyTagDefinition<unknown>["kind"] {
  if (id.startsWith("artifact:")) return "artifact";
  if (id.startsWith("field:")) return "field";
  if (id.startsWith("effect:")) return "effect";
  throw new Error(`Invalid dependency tag "${id}" (expected artifact:/field:/effect:)`);
}

function computeFullStepId(input: {
  namespace?: string;
  recipeId: string;
  stageId: string;
  stepId: string;
}): string {
  const base = input.namespace ? `${input.namespace}.${input.recipeId}` : input.recipeId;
  return `${base}.${input.stageId}.${input.stepId}`;
}

function finalizeOccurrences<TContext extends ExtendedMapContext>(input: {
  namespace?: string;
  recipeId: string;
  stages: readonly AnyStage<TContext>[];
}): StepOccurrence<TContext>[] {
  const out: StepOccurrence<TContext>[] = [];

  for (const stage of input.stages) {
    for (const authored of stage.steps) {
      const stepId = authored.id;
      const fullId = computeFullStepId({
        namespace: input.namespace,
        recipeId: input.recipeId,
        stageId: stage.id,
        stepId,
      });

      out.push({
        stageId: stage.id,
        stepId,
        step: {
          id: fullId,
          phase: authored.phase,
          requires: authored.requires,
          provides: authored.provides,
          configSchema: authored.schema,
          resolveConfig: authored.resolveConfig as MapGenStep<TContext, unknown>["resolveConfig"],
          run: authored.run as MapGenStep<TContext, unknown>["run"],
        },
      });
    }
  }

  return out;
}

function collectTagDefinitions<TContext>(
  occurrences: readonly StepOccurrence<TContext>[],
  explicit: readonly DependencyTagDefinition<TContext>[]
): DependencyTagDefinition<TContext>[] {
  const defs = new Map<string, DependencyTagDefinition<TContext>>();

  const tagIds = new Set<string>();
  for (const occ of occurrences) {
    for (const tag of occ.step.requires) tagIds.add(tag);
    for (const tag of occ.step.provides) tagIds.add(tag);
  }
  for (const id of tagIds) {
    defs.set(id, { id, kind: inferTagKind(id) } as DependencyTagDefinition<TContext>);
  }

  for (const def of explicit) {
    defs.set(def.id, def);
  }

  return Array.from(defs.values());
}

function buildRegistry<TContext extends ExtendedMapContext>(
  occurrences: readonly StepOccurrence<TContext>[],
  tagDefinitions: readonly DependencyTagDefinition<TContext>[]
): StepRegistry<TContext> {
  const tags = new TagRegistry<TContext>();
  tags.registerTags(collectTagDefinitions(occurrences, tagDefinitions));

  const registry = new StepRegistry<TContext>({ tags });
  for (const occ of occurrences) registry.register(occ.step);
  return registry;
}

function toStructuralRecipeV2<TContext>(
  id: string,
  occurrences: readonly StepOccurrence<TContext>[]
): RecipeV2 {
  return {
    schemaVersion: 2,
    id,
    steps: occurrences.map((occ) => ({
      id: occ.step.id,
    })),
  };
}

export function createRecipe<
  TContext extends ExtendedMapContext,
  const TStages extends readonly AnyStage<TContext>[],
>(input: RecipeDefinition<TContext, TStages>): RecipeModule<TContext, RecipeConfigOf<TStages> | null> {
  assertTagDefinitions(input.tagDefinitions);

  const occurrences = finalizeOccurrences({
    namespace: input.namespace,
    recipeId: input.id,
    stages: input.stages,
  });
  const registry = buildRegistry(occurrences, input.tagDefinitions);
  const recipe = toStructuralRecipeV2(input.id, occurrences);

  function instantiate(config?: RecipeConfigOf<TStages> | null): RecipeV2 {
    const cfg = (config ?? null) as RecipeConfig | null;
    return {
      ...recipe,
      steps: occurrences.map((occ) => ({
        id: occ.step.id,
        config: cfg
          ? (cfg[occ.stageId]?.[occ.stepId] as Record<string, unknown> | undefined)
          : undefined,
      })),
    };
  }

  function runRequest(settings: RunSettings, config?: RecipeConfigOf<TStages> | null): RunRequest {
    return { recipe: instantiate(config), settings };
  }

  function compile(settings: RunSettings, config?: RecipeConfigOf<TStages> | null): ExecutionPlan {
    return compileExecutionPlan(runRequest(settings, config), registry);
  }

  function run(
    context: TContext,
    settings: RunSettings,
    config?: RecipeConfigOf<TStages> | null,
    options: { trace?: TraceSession | null; traceSink?: TraceSink | null; log?: (message: string) => void } = {}
  ): void {
    const plan = compile(settings, config);
    context.settings = plan.settings;
    const traceSession =
      options.trace !== undefined
        ? options.trace
        : createTraceSessionFromPlan(
            plan,
            options.traceSink !== undefined ? options.traceSink : createConsoleTraceSink()
          );
    const executor = new PipelineExecutor(registry, {
      log: options.log,
      logPrefix: `[recipe:${input.id}]`,
    });
    executor.executePlan(context, plan, { trace: traceSession ?? null });
  }

  return { id: input.id, recipe, instantiate, runRequest, compile, run };
}
```

## 2. End-to-End Example(s)

### Use case

Plot vegetation in the ecology phase by orchestrating focused planning ops:
- `planTreeVegetation` with `default` and `clustered` strategies.
- `planShrubVegetation` with `default` and `arid` strategies.

A single `plotVegetation` step orchestrates the ops, validates config, resolves strategy-specific settings, and publishes a coherent vegetation artifact. The step owns its schema and has no op bindings or structural coupling beyond function calls.

This is the corrected model for the previous “plan vegetation” step: the step does the work boundary
(publish/apply), and the planning work is split into separate ops whose input contracts can evolve
independently.

### Domain module files

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/contract.ts`
```ts
import { Type, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
import { defineOpContract } from "@swooper/mapgen-core/authoring";

export const PlanTreeVegetationContract = defineOpContract({
  kind: "plan",
  id: "ecology/vegetation/plan-trees",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      biomeId: TypedArraySchemas.u8({ description: "Biome index per tile." }),
      moisture: TypedArraySchemas.u8({ description: "Moisture per tile (0..255)." }),
      elevation: TypedArraySchemas.i16({ description: "Elevation per tile (meters)." }),
      landMask: TypedArraySchemas.u8({ description: "Land mask (1=land, 0=water)." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      placements: Type.Array(
        Type.Object(
          {
            plot: Type.Integer({ minimum: 0 }),
            density: Type.Number({ minimum: 0, maximum: 1 }),
          },
          { additionalProperties: false }
        )
      ),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        density: Type.Number({ minimum: 0, maximum: 1, default: 0.6 }),
        minMoisture: Type.Number({ minimum: 0, maximum: 1, default: 0.3 }),
        maxElevation: Type.Integer({ default: 1500 }),
      },
      { additionalProperties: false }
    ),
    clustered: Type.Object(
      {
        density: Type.Number({ minimum: 0, maximum: 1, default: 0.5 }),
        minMoisture: Type.Number({ minimum: 0, maximum: 1, default: 0.3 }),
        maxElevation: Type.Integer({ default: 1500 }),
        clusterRadius: Type.Integer({ minimum: 1, default: 3 }),
        clusterBoost: Type.Number({ minimum: 0, maximum: 1, default: 0.25 }),
      },
      { additionalProperties: false }
    ),
  },
} as const);
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/types.ts`
```ts
import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanTreeVegetationContract;

export type PlanTreeVegetationTypes = OpTypeBag<Contract>;
export type TreeConfig =
  PlanTreeVegetationTypes["config"][keyof PlanTreeVegetationTypes["config"]];
export type TreePlacement = PlanTreeVegetationTypes["output"]["placements"][number];
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/rules/normalize.ts`
```ts
import { clamp01 } from "@swooper/mapgen-core";
import type { TreeConfig } from "../types.js";

export function normalizeTreeConfig(config: TreeConfig): TreeConfig {
  return {
    ...config,
    density: clamp01(config.density),
    minMoisture: clamp01(config.minMoisture),
  };
}
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/rules/placements.ts`
```ts
import { clamp01 } from "@swooper/mapgen-core";
import type { PlanTreeVegetationTypes, TreeConfig, TreePlacement } from "../types.js";

type PlanTreeVegetationInput = PlanTreeVegetationTypes["input"];
type TreeClusteredConfig = PlanTreeVegetationTypes["config"]["clustered"];

export function buildTreePlacements(
  input: PlanTreeVegetationInput,
  config: TreeConfig
): TreePlacement[] {
  const placements: TreePlacement[] = [];
  const size = input.width * input.height;
  const hasCluster = "clusterRadius" in config;
  for (let plot = 0; plot < size; plot += 1) {
    if (input.landMask[plot] === 0) continue;
    if (input.elevation[plot] > config.maxElevation) continue;
    const moisture = input.moisture[plot] / 255;
    if (moisture < config.minMoisture) continue;
    let density = config.density;
    if (hasCluster) {
      const clusterRadius = (config as TreeClusteredConfig).clusterRadius;
      const clusterBoost = (config as TreeClusteredConfig).clusterBoost;
      if (plot % clusterRadius === 0) {
        density = clamp01(density + clusterBoost);
      }
    }
    placements.push({ plot, density });
  }
  return placements;
}
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/rules/index.ts`
```ts
export { normalizeTreeConfig } from "./normalize.js";
export { buildTreePlacements } from "./placements.js";
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/strategies/default.ts`
```ts
import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanTreeVegetationContract } from "../contract.js";
import { buildTreePlacements, normalizeTreeConfig } from "../rules/index.js";

export const defaultStrategy = createStrategy(PlanTreeVegetationContract, "default", {
  resolveConfig: (config) => normalizeTreeConfig(config),
  run: (input, config) => ({ placements: buildTreePlacements(input, config) }),
});
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/strategies/clustered.ts`
```ts
import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanTreeVegetationContract } from "../contract.js";
import { buildTreePlacements, normalizeTreeConfig } from "../rules/index.js";

export const clusteredStrategy = createStrategy(PlanTreeVegetationContract, "clustered", {
  resolveConfig: (config) => normalizeTreeConfig(config),
  run: (input, config) => ({ placements: buildTreePlacements(input, config) }),
});
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/strategies/index.ts`
```ts
export { defaultStrategy } from "./default.js";
export { clusteredStrategy } from "./clustered.js";
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/index.ts`
```ts
import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanTreeVegetationContract } from "./contract.js";
import { clusteredStrategy, defaultStrategy } from "./strategies/index.js";

export const planTreeVegetation = createOp(PlanTreeVegetationContract, {
  strategies: {
    default: defaultStrategy,
    clustered: clusteredStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/contract.ts`
```ts
import { Type, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
import { defineOpContract } from "@swooper/mapgen-core/authoring";

export const PlanShrubVegetationContract = defineOpContract({
  kind: "plan",
  id: "ecology/vegetation/plan-shrubs",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      biomeId: TypedArraySchemas.u8({ description: "Biome index per tile." }),
      moisture: TypedArraySchemas.u8({ description: "Moisture per tile (0..255)." }),
      elevation: TypedArraySchemas.i16({ description: "Elevation per tile (meters)." }),
      landMask: TypedArraySchemas.u8({ description: "Land mask (1=land, 0=water)." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      placements: Type.Array(
        Type.Object(
          {
            plot: Type.Integer({ minimum: 0 }),
            density: Type.Number({ minimum: 0, maximum: 1 }),
          },
          { additionalProperties: false }
        )
      ),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        density: Type.Number({ minimum: 0, maximum: 1, default: 0.45 }),
        minMoisture: Type.Number({ minimum: 0, maximum: 1, default: 0.2 }),
        maxElevation: Type.Integer({ default: 1800 }),
      },
      { additionalProperties: false }
    ),
    arid: Type.Object(
      {
        density: Type.Number({ minimum: 0, maximum: 1, default: 0.35 }),
        minMoisture: Type.Number({ minimum: 0, maximum: 1, default: 0.1 }),
        maxElevation: Type.Integer({ default: 1800 }),
        aridBoost: Type.Number({ minimum: 0, maximum: 1, default: 0.15 }),
      },
      { additionalProperties: false }
    ),
  },
} as const);
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/types.ts`
```ts
import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanShrubVegetationContract;

export type PlanShrubVegetationTypes = OpTypeBag<Contract>;
export type ShrubConfig =
  PlanShrubVegetationTypes["config"][keyof PlanShrubVegetationTypes["config"]];
export type ShrubPlacement = PlanShrubVegetationTypes["output"]["placements"][number];
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/rules/normalize.ts`
```ts
import { clamp01 } from "@swooper/mapgen-core";
import type { ShrubConfig } from "../types.js";

export function normalizeShrubConfig(config: ShrubConfig): ShrubConfig {
  return {
    ...config,
    density: clamp01(config.density),
    minMoisture: clamp01(config.minMoisture),
  };
}
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/rules/placements.ts`
```ts
import { clamp01 } from "@swooper/mapgen-core";
import type { PlanShrubVegetationTypes, ShrubConfig, ShrubPlacement } from "../types.js";

type PlanShrubVegetationInput = PlanShrubVegetationTypes["input"];
type ShrubAridConfig = PlanShrubVegetationTypes["config"]["arid"];

export function buildShrubPlacements(
  input: PlanShrubVegetationInput,
  config: ShrubConfig
): ShrubPlacement[] {
  const placements: ShrubPlacement[] = [];
  const size = input.width * input.height;
  const hasAridBoost = "aridBoost" in config;
  for (let plot = 0; plot < size; plot += 1) {
    if (input.landMask[plot] === 0) continue;
    if (input.elevation[plot] > config.maxElevation) continue;
    const moisture = input.moisture[plot] / 255;
    let density = config.density;
    if (hasAridBoost && moisture < config.minMoisture) {
      density = clamp01(density + (config as ShrubAridConfig).aridBoost);
    }
    if (moisture < config.minMoisture) continue;
    placements.push({ plot, density });
  }
  return placements;
}
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/rules/index.ts`
```ts
export { normalizeShrubConfig } from "./normalize.js";
export { buildShrubPlacements } from "./placements.js";
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/strategies/default.ts`
```ts
import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanShrubVegetationContract } from "../contract.js";
import { buildShrubPlacements, normalizeShrubConfig } from "../rules/index.js";

export const defaultStrategy = createStrategy(PlanShrubVegetationContract, "default", {
  resolveConfig: (config) => normalizeShrubConfig(config),
  run: (input, config) => ({ placements: buildShrubPlacements(input, config) }),
});
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/strategies/arid.ts`
```ts
import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanShrubVegetationContract } from "../contract.js";
import { buildShrubPlacements, normalizeShrubConfig } from "../rules/index.js";

export const aridStrategy = createStrategy(PlanShrubVegetationContract, "arid", {
  resolveConfig: (config) => normalizeShrubConfig(config),
  run: (input, config) => ({ placements: buildShrubPlacements(input, config) }),
});
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/strategies/index.ts`
```ts
export { defaultStrategy } from "./default.js";
export { aridStrategy } from "./arid.js";
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/index.ts`
```ts
import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanShrubVegetationContract } from "./contract.js";
import { aridStrategy, defaultStrategy } from "./strategies/index.js";

export const planShrubVegetation = createOp(PlanShrubVegetationContract, {
  strategies: {
    default: defaultStrategy,
    arid: aridStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";
```

`mods/mod-swooper-maps/src/domain/ecology/ops/index.ts`
```ts
export { planTreeVegetation } from "./plan-tree-vegetation/index.js";
export { planShrubVegetation } from "./plan-shrub-vegetation/index.js";
```

`mods/mod-swooper-maps/src/domain/ecology/index.ts`
```ts
export * as ops from "./ops/index.js";
```

### Step orchestration

`mods/mod-swooper-maps/src/authoring/steps.ts`
```ts
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStepFor } from "@swooper/mapgen-core/authoring";

export const createStep = createStepFor<ExtendedMapContext>();
```

`mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-vegetation/contract.ts`
```ts
import { Type, defineStepContract, type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";

const VEGETATION_DEPENDENCIES = [
  "field:biomeId@v1",
  "field:rainfall@v1",
  "field:elevation@v1",
  "artifact:climateField@v1",
];

const VEGETATION_PROVIDES = ["artifact:ecology.vegetation@v1"];

export const PlotVegetationStepContract = defineStepContract({
  id: "plot-vegetation",
  phase: "ecology",
  requires: VEGETATION_DEPENDENCIES,
  provides: VEGETATION_PROVIDES,
  schema: Type.Object(
    {
      trees: ecology.ops.planTreeVegetation.config,
      shrubs: ecology.ops.planShrubVegetation.config,
      densityBias: Type.Number({ minimum: -1, maximum: 1, default: 0 }),
    },
    {
      additionalProperties: false,
      default: {
        trees: ecology.ops.planTreeVegetation.defaultConfig,
        shrubs: ecology.ops.planShrubVegetation.defaultConfig,
        densityBias: 0,
      },
    }
  ),
} as const);

export type PlotVegetationStepConfig = Static<typeof PlotVegetationStepContract.schema>;
```

`mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-vegetation/lib/vegetation.ts`
```ts
import { clamp01, type ExtendedMapContext } from "@swooper/mapgen-core";

export function applyDensityBias<
  T extends { strategy: string; config: { density: number } },
>(envelope: T, bias: number): T {
  return {
    ...envelope,
    config: {
      ...envelope.config,
      density: clamp01(envelope.config.density + bias),
    },
  };
}

export function buildVegetationInput(context: ExtendedMapContext) {
  const { width, height } = context.dimensions;
  return {
    width,
    height,
    biomeId: context.fields.biomeId!,
    moisture: context.buffers.climate.humidity,
    elevation: context.fields.elevation!,
    landMask: context.buffers.heightfield.landMask,
  };
}
```

`mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-vegetation/index.ts`
```ts
import { clamp01 } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import * as ecology from "@mapgen/domain/ecology";

import { PlotVegetationStepContract } from "./contract.js";
import {
  applyDensityBias,
  buildVegetationInput,
} from "./lib/vegetation.js";

export default createStep(PlotVegetationStepContract, {
  resolveConfig: (config, settings) => {
    const bias = clamp01(config.densityBias);
    const trees = applyDensityBias(config.trees, bias);
    const shrubs = applyDensityBias(config.shrubs, bias);
    return {
      densityBias: bias,
      trees: ecology.ops.planTreeVegetation.resolveConfig(trees, settings),
      shrubs: ecology.ops.planShrubVegetation.resolveConfig(shrubs, settings),
    };
  },
  run: (context, config) => {
    const input = buildVegetationInput(context);
    const treePlan = ecology.ops.planTreeVegetation.runValidated(input, config.trees);
    const shrubPlan = ecology.ops.planShrubVegetation.runValidated(input, config.shrubs);

    context.artifacts.set("artifact:ecology.vegetation@v1", {
      trees: treePlan.placements,
      shrubs: shrubPlan.placements,
    });
  },
});
```

### Why this example works

- Each op has a contract with strategy-specific config schemas. The strategy implementations are typed by the contract and authored out of line.
- The step contract is metadata-only and uses `op.config`/`op.defaultConfig` for convenience without declaring op bindings.
- The step implementation is attached via a bound `createStep` from `createStepFor<ExtendedMapContext>()`, mirroring the op pattern while locking context typing.
- Strategy selection is a plain union in config; no envelope propagation or stage-level compilation is required.
- Variations such as `clustered` trees and `arid` shrubs are handled entirely within op strategies.
- Planning lives in ops, while the step is the action boundary that publishes a coherent vegetation artifact.

## 3. Implementation Plan

### Mechanical work

1. Add the contract-first authoring files and exports:
   - `packages/mapgen-core/src/authoring/op/contract.ts`
   - `packages/mapgen-core/src/authoring/op/types.ts`
   - Update `packages/mapgen-core/src/authoring/op/strategy.ts`
   - Update `packages/mapgen-core/src/authoring/op/create.ts`
   - Update `packages/mapgen-core/src/authoring/op/index.ts`
   - Update `packages/mapgen-core/src/authoring/index.ts`
2. Add the contract-first step authoring files and exports:
   - `packages/mapgen-core/src/authoring/step/contract.ts`
   - `packages/mapgen-core/src/authoring/step/create.ts`
   - `packages/mapgen-core/src/authoring/step/index.ts`
   - Update `packages/mapgen-core/src/authoring/index.ts` to export `defineStepContract` and `createStepFor`
   - Replace `packages/mapgen-core/src/authoring/step.ts` usage with `authoring/step/create.ts`
3. Update `createStep` signatures to take `(contract, impl)` and return a composed step, then add `createStepFor<TContext>()`:
   - Keep the step module shape unchanged (schema + run + optional resolveConfig)
   - Make `createStepFor<TContext>()` the canonical authoring entrypoint for steps
4. Pass through step `resolveConfig` during recipe compilation:
   - Update `packages/mapgen-core/src/authoring/recipe.ts` to carry `resolveConfig` from the step module into `MapGenStep`
   - No changes to `engine/execution-plan.ts` or `PipelineExecutor.ts` are required beyond this wiring
5. Convert each op module to the canonical layout:
   - Move schemas into `contract.ts` and define the op contract there.
   - Add `types.ts` and export a single `OpTypeBag` for the op; remove manual type exports from `contract.ts`.
   - Add `rules/index.ts` and `strategies/index.ts` barrels for runtime imports.
   - Move each strategy implementation into `strategies/<id>.ts` using `createStrategy`.
   - Move helpers into `rules/<rule>.ts` and import from `rules/index.ts` in strategies.
   - Expose the implemented op from `index.ts` and re-export `type *` from `./types.ts`.
6. Update step modules to the contract-first layout:
   - Add `steps/<step>/contract.ts` using `defineStepContract`.
   - Add `src/authoring/steps.ts` to export `createStepFor<ExtendedMapContext>()` as `createStep`.
   - Move orchestration into `steps/<step>/index.ts` using the bound `createStep(contract, { resolveConfig?, run })`.
   - Move helper logic into `steps/<step>/lib/*`.
7. Update step schema defaults to reference `op.defaultConfig` and `op.config` from the implemented ops.
8. Standardize cross-module imports to use `@mapgen/domain/*` and `@mapgen/authoring/*` aliases, leaving intra-op/step imports relative.
9. Move any shared helper clones (e.g., `clamp01`, noise helpers) into the core SDK and import them from `@swooper/mapgen-core`.
10. Update op validation tests and any direct `createOp({ ... })` usages to `createOp(contract, { strategies })`.
11. Add lint guardrails to forbid `rules/**` importing `../contract.js` and to keep cross-module imports on package aliases.
12. Add lint guardrails to forbid `rules/**` from exporting or re-exporting types; all shared op types must live in `types.ts`.

### Thinky work

1. For each op, confirm that the strategy set is stable and that the contract uses the smallest useful config schemas.
2. Ensure op boundaries stay focused and avoid monolithic ops that mix unrelated concerns.
3. Decide whether step config should pass op config envelopes directly or map from step-specific shapes.
4. Confirm whether step config should always be `Static<typeof schema>` or whether any steps require a looser config type.

### Dependency chain and touchpoints

- `packages/mapgen-core/src/authoring/step/contract.ts`: new contract-only metadata builder.
- `packages/mapgen-core/src/authoring/step/create.ts`: composes `contract + impl` and enforces schema presence.
- `packages/mapgen-core/src/authoring/index.ts`: export surface for `defineStepContract`.
- `packages/mapgen-core/src/authoring/step.ts`: superseded by `authoring/step/create.ts` and should be removed or re-exported.
- `packages/mapgen-core/src/authoring/stage.ts`: still asserts `schema` on created steps.
- `packages/mapgen-core/src/authoring/recipe.ts`: forwards `schema -> configSchema` and must also forward `resolveConfig`.
- `packages/mapgen-core/src/engine/types.ts`: `MapGenStep` includes `configSchema` and optional `resolveConfig`.
- `packages/mapgen-core/src/engine/execution-plan.ts`: uses `configSchema` and optional `resolveConfig` for normalization.
- `packages/mapgen-core/src/engine/PipelineExecutor.ts`: executes `run` using normalized config.
- Tests and example recipes: update to `defineStepContract` + bound `createStep` from `createStepFor<ExtendedMapContext>()`.

### Integration edges

- `createRecipe` currently maps `schema -> configSchema` and drops `resolveConfig`; this must be wired through to preserve step-level config normalization.
- `engine/execution-plan.ts` already treats `resolveConfig` as optional and only invokes it when `configSchema` exists, so the contract schema must remain mandatory.
- `createStage` and `createStep` should continue to reject missing schemas, ensuring compile-time safety and consistent defaults.
### Wrap-up

This slice locks in contract-first ops with out-of-line strategy inference and keeps steps as simple orchestration contracts. The recipe v2 compile path stays unchanged, and all complexity remains localized to op contracts and strategy implementations.
