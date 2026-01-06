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

### Core model

**Operation**
- A focused, pure domain capability: `run(input, config) -> output`.
- Contract owns IO schemas and per-strategy config schemas.
- Strategy implementations are attached to the contract using `createStrategy`.
- Runtime op is created by `createOp(contract, { strategies })`, which derives:
  - `op.config` as a union over strategy envelopes
  - `op.defaultConfig` from the default strategy schema
  - `op.resolveConfig` as a per-strategy resolver hook (compile-time only)

**Step**
- A simple orchestration contract: `id`, `phase`, `requires`, `provides`, `schema`, optional `resolveConfig`, and `run`.
- Config schema is owned by the step and can reuse op config schemas for convenience.
- Steps call ops with validated values and do not declare op bindings or graphs.

**Bridge**
- Steps build op inputs from context, resolve config with `op.resolveConfig`, and call `op.runValidated`.
- Recipe v2 and the step registry compilation remain unchanged and provide the plan surface.

### Canonical file layout for ops and domains

```
mods/mod-swooper-maps/src/domain/<domain>/
  index.ts
  ops/
    <op-slug>/
      contract.ts
      rules/
        <rule>.ts
      strategies/
        default.ts
        <strategy>.ts
      index.ts
```

### Canonical authoring API (files)

The following files are the canonical authoring surface for contract-first ops and strategies.

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
export type { DomainOp, DomainOpKind } from "./types.js";
export type {
  OpStrategy,
  StrategyImpl,
  StrategyImplFor,
  StrategyImplMapFor,
  StrategySelection,
} from "./strategy.js";
```

`packages/mapgen-core/src/authoring/index.ts`
```ts
export { createStep } from "./step.js";
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
export type {
  DomainOp,
  DomainOpKind,
  OpContract,
  OpStrategy,
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

## 2. End-to-End Example(s)

### Use case

Plan vegetation in the ecology phase using two focused ops:
- `planTreeVegetation` with `default` and `clustered` strategies.
- `planShrubVegetation` with `default` and `arid` strategies.

A single step orchestrates both ops, validates config, resolves strategy-specific settings, and publishes a combined vegetation plan. The step owns its schema and has no op bindings or structural coupling beyond function calls.

### Domain module files

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/contract.ts`
```ts
import { Type, type Static, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
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

export type PlanTreeVegetationInput = Static<typeof PlanTreeVegetationContract.input>;
export type PlanTreeVegetationOutput = Static<typeof PlanTreeVegetationContract.output>;
export type TreeDefaultConfig = Static<typeof PlanTreeVegetationContract.strategies.default>;
export type TreeClusteredConfig = Static<typeof PlanTreeVegetationContract.strategies.clustered>;
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/rules/normalize.ts`
```ts
import type { TreeDefaultConfig, TreeClusteredConfig } from "../contract.js";

export type TreeConfig = TreeDefaultConfig | TreeClusteredConfig;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

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
import type { PlanTreeVegetationInput, TreeClusteredConfig } from "../contract.js";
import { clamp01, type TreeConfig } from "./normalize.js";

export type TreePlacement = { plot: number; density: number };

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

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/strategies/default.ts`
```ts
import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanTreeVegetationContract } from "../contract.js";
import { buildTreePlacements } from "../rules/placements.js";
import { normalizeTreeConfig } from "../rules/normalize.js";

export const defaultStrategy = createStrategy(PlanTreeVegetationContract, "default", {
  resolveConfig: (config) => normalizeTreeConfig(config),
  run: (input, config) => ({ placements: buildTreePlacements(input, config) }),
});
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/strategies/clustered.ts`
```ts
import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanTreeVegetationContract } from "../contract.js";
import { buildTreePlacements } from "../rules/placements.js";
import { normalizeTreeConfig } from "../rules/normalize.js";

export const clusteredStrategy = createStrategy(PlanTreeVegetationContract, "clustered", {
  resolveConfig: (config) => normalizeTreeConfig(config),
  run: (input, config) => ({ placements: buildTreePlacements(input, config) }),
});
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-tree-vegetation/index.ts`
```ts
import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanTreeVegetationContract } from "./contract.js";
import { defaultStrategy } from "./strategies/default.js";
import { clusteredStrategy } from "./strategies/clustered.js";

export const planTreeVegetation = createOp(PlanTreeVegetationContract, {
  strategies: {
    default: defaultStrategy,
    clustered: clusteredStrategy,
  },
});

export * from "./contract.js";
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/contract.ts`
```ts
import { Type, type Static, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
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

export type PlanShrubVegetationInput = Static<typeof PlanShrubVegetationContract.input>;
export type PlanShrubVegetationOutput = Static<typeof PlanShrubVegetationContract.output>;
export type ShrubDefaultConfig = Static<typeof PlanShrubVegetationContract.strategies.default>;
export type ShrubAridConfig = Static<typeof PlanShrubVegetationContract.strategies.arid>;
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/rules/normalize.ts`
```ts
import type { ShrubDefaultConfig, ShrubAridConfig } from "../contract.js";

export type ShrubConfig = ShrubDefaultConfig | ShrubAridConfig;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

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
import type { PlanShrubVegetationInput, ShrubAridConfig } from "../contract.js";
import { clamp01, type ShrubConfig } from "./normalize.js";

export type ShrubPlacement = { plot: number; density: number };

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

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/strategies/default.ts`
```ts
import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanShrubVegetationContract } from "../contract.js";
import { buildShrubPlacements } from "../rules/placements.js";
import { normalizeShrubConfig } from "../rules/normalize.js";

export const defaultStrategy = createStrategy(PlanShrubVegetationContract, "default", {
  resolveConfig: (config) => normalizeShrubConfig(config),
  run: (input, config) => ({ placements: buildShrubPlacements(input, config) }),
});
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/strategies/arid.ts`
```ts
import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanShrubVegetationContract } from "../contract.js";
import { buildShrubPlacements } from "../rules/placements.js";
import { normalizeShrubConfig } from "../rules/normalize.js";

export const aridStrategy = createStrategy(PlanShrubVegetationContract, "arid", {
  resolveConfig: (config) => normalizeShrubConfig(config),
  run: (input, config) => ({ placements: buildShrubPlacements(input, config) }),
});
```

`mods/mod-swooper-maps/src/domain/ecology/ops/plan-shrub-vegetation/index.ts`
```ts
import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanShrubVegetationContract } from "./contract.js";
import { defaultStrategy } from "./strategies/default.js";
import { aridStrategy } from "./strategies/arid.js";

export const planShrubVegetation = createOp(PlanShrubVegetationContract, {
  strategies: {
    default: defaultStrategy,
    arid: aridStrategy,
  },
});

export * from "./contract.js";
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

`mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plan-vegetation/index.ts`
```ts
import { Type } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import * as ecology from "@mapgen/domain/ecology";

const VEGETATION_DEPENDENCIES = [
  "field:biomeId@v1",
  "field:rainfall@v1",
  "field:elevation@v1",
  "artifact:climateField@v1",
];

const VEGETATION_PROVIDES = ["artifact:ecology.vegetation-plan@v1"];

const PlanVegetationStepSchema = Type.Object(
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
);

type PlanVegetationStepConfig = {
  trees: typeof ecology.ops.planTreeVegetation.defaultConfig;
  shrubs: typeof ecology.ops.planShrubVegetation.defaultConfig;
  densityBias: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function applyDensityBias<
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

function buildVegetationInput(context: ExtendedMapContext) {
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

export default createStep({
  id: "plan-vegetation",
  phase: "ecology",
  requires: VEGETATION_DEPENDENCIES,
  provides: VEGETATION_PROVIDES,
  schema: PlanVegetationStepSchema,
  resolveConfig: (config: PlanVegetationStepConfig, settings) => {
    const bias = clamp01(config.densityBias);
    const trees = applyDensityBias(config.trees, bias);
    const shrubs = applyDensityBias(config.shrubs, bias);
    return {
      densityBias: bias,
      trees: ecology.ops.planTreeVegetation.resolveConfig(trees, settings),
      shrubs: ecology.ops.planShrubVegetation.resolveConfig(shrubs, settings),
    };
  },
  run: (context: ExtendedMapContext, config: PlanVegetationStepConfig) => {
    const input = buildVegetationInput(context);
    const treePlan = ecology.ops.planTreeVegetation.runValidated(input, config.trees);
    const shrubPlan = ecology.ops.planShrubVegetation.runValidated(input, config.shrubs);

    context.artifacts.set("artifact:ecology.vegetation-plan@v1", {
      trees: treePlan.placements,
      shrubs: shrubPlan.placements,
    });
  },
} as const);
```

### Why this example works

- Each op has a contract with strategy-specific config schemas. The strategy implementations are typed by the contract and authored out of line.
- The step schema is its own contract and uses `op.config` and `op.defaultConfig` for convenience without declaring op bindings.
- Strategy selection is a plain union in config; no envelope propagation or stage-level compilation is required.
- Variations such as `clustered` trees and `arid` shrubs are handled entirely within op strategies.

## 3. Implementation Plan

### Mechanical work

1. Add the contract-first authoring files and exports:
   - `packages/mapgen-core/src/authoring/op/contract.ts`
   - Update `packages/mapgen-core/src/authoring/op/strategy.ts`
   - Update `packages/mapgen-core/src/authoring/op/create.ts`
   - Update `packages/mapgen-core/src/authoring/op/index.ts`
   - Update `packages/mapgen-core/src/authoring/index.ts`
2. Convert each op module to the canonical layout:
   - Move schemas into `contract.ts` and define the op contract there.
   - Move each strategy implementation into `strategies/<id>.ts` using `createStrategy`.
   - Move helpers into `rules/<rule>.ts` and import directly from strategies.
   - Expose the implemented op from `index.ts`.
3. Update step schema defaults to reference `op.defaultConfig` and `op.config` from the implemented ops.
4. Update op validation tests and any direct `createOp({ ... })` usages to `createOp(contract, { strategies })`.

### Thinky work

1. For each op, confirm that the strategy set is stable and that the contract uses the smallest useful config schemas.
2. Ensure op boundaries stay focused and avoid monolithic ops that mix unrelated concerns.
3. Decide whether step config should pass op config envelopes directly or map from step-specific shapes.

### Wrap-up

This slice locks in contract-first ops with out-of-line strategy inference and keeps steps as simple orchestration contracts. The recipe v2 compile path stays unchanged, and all complexity remains localized to op contracts and strategy implementations.
