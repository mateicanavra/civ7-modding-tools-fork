# Canonical Architecture Specification

## Contract‑First Ops, Strategy Assembly, and Inverted Settings

This document defines the canonical architecture for domains, operations (ops), strategies, recipes, settings, and engine integration. It is the source of truth for how new code must be authored and how existing code must be refactored.

---

## 1. Architectural Model

### 1.1 Layering and Responsibilities

**Domains**

* Own **deterministic logic** (pure functions) expressed as **ops** with **strategies**.
* Define **domain settings contracts** (schemas + defaults).
* Export:

  * `settings` (contract)
  * `contracts` (op contracts: pure data)
  * `ops` (op implementations assembled from contracts + strategies)

**Authoring SDK**

* Provides the canonical primitives for:

  * defining op contracts (`defineOp`)
  * authoring strategies (`createStrategy`)
  * assembling ops (`createOp`)
  * defining domain settings (`defineDomainSettings`)
  * composing recipe run settings (`defineRunSettings`)
  * authoring steps/stages/recipes (`createStep`, `createStage`, `createRecipe`)
* Owns the **boundary patterns** and **type-level ergonomics** (contextual typing, schema pinning, composition helpers).

**Recipes**

* Compose steps/stages that call into domain ops.
* Define a recipe‑specific **run settings schema** via composition of:

  * global settings schema
  * selected domain settings schemas
  * recipe-local settings schema
* Produce:

  * an instantiated recipe graph (step occurrences)
  * a step registry
  * `compile(...)` and `run(...)` entrypoints

**Engine**

* Compiles an instantiated recipe + settings into an execution plan.
* Executes the plan with a context.
* Treats settings as **opaque data**:

  * it stores settings
  * it transports settings into compile-time config resolution
  * it does not own or interpret domain-specific settings semantics

---

### 1.2 Core Entities and Relations

**Domain**

* Provides a settings schema and a library of ops.

**Op**

* Contract-first: a stable contract describes input/output schemas, strategy config schemas, and an optional settings slice schema.
* Implementation: assembled from contract + strategies.

**Strategy**

* Implementation-only: contains `run(...)` and optional `resolveConfig(...)`.
* Uses settings only via `resolveConfig(...)` (compile-time).

**Step**

* Engine node.
* Owns runtime side effects: reading/writing buffers, publishing artifacts, adapter integration.
* Calls ops at runtime (`op.run(...)`) and may normalize step config at compile-time via `resolveConfig(...)`.

**Recipe**

* Binds:

  * a set of steps
  * a run settings schema
  * a step registry
  * compilation + execution entrypoints

**Engine**

* Compiles recipe + settings into an execution plan by calling step `resolveConfig(...)` with settings.
* Runs nodes by calling step `run(...)`.

---

## 2. Boundaries and Contracts

### 2.1 Non‑Negotiable Dependency Rules

1. **Domains must not import engine types** (no engine `RunSettings`, no engine execution plan types).
2. **Engine must not import domain code**.
3. **Settings schemas are authored outside the engine**:

   * domains define domain settings
   * recipes compose settings
   * engine sees settings as generic/opaque
4. **Op contracts are pure data**:

   * TypeBox schemas + metadata only
   * no closures, no implementations
5. **Strategy implementations must not redeclare schemas**:

   * strategy config schemas live in the op contract

These rules are enforced by lint and by type exports (see Guardrails).

---

## 3. Settings Model

### 3.1 Settings Shape

The canonical run settings value is an object with three namespaces:

```ts
type RunSettingsShape<Global, Domains, Recipe> = {
  global: Global;
  domains: Domains;
  recipe: Recipe;
};
```

* `global`: cross-domain/shared settings (seed, dimensions, runtime mode, etc.)
* `domains`: a record keyed by domain id (`ecology`, `placement`, ...)
* `recipe`: recipe-local settings (difficulty, scenario knobs, etc.)

### 3.2 Ownership

* **Global settings schema** is owned by the authoring SDK (`GlobalSettingsSchema`).
* **Domain settings schema** is owned by each domain.
* **Recipe settings schema** is owned by each recipe and composed from global + domains + recipe-local.

### 3.3 Defaulting and Normalization

All settings are normalized at the recipe boundary using a schema-driven function:

* apply defaults
* convert/coerce where allowed
* strip/clean unknown keys if schemas are strict
* produce a canonical in-memory settings value

**The engine never applies defaults to settings.** It only receives already-normalized settings (or treats them as opaque if normalization is done elsewhere).

### 3.4 Domain Settings Subsetting

Ops declare the subset of settings they need via a TypeBox schema:

* commonly a `domain.settings.pick(...)` selection
* may also be a custom schema if the op wants a shaped view (allowed variation)

Strategies only ever see the settings slice declared in the op contract.

---

## 4. Canonical API and Implementation Shape

All code examples below represent the canonical shapes.

### 4.1 Settings Primitives

#### `authoring/settings.ts`

```ts
import { Type, type Static, type TObject, type TSchema } from "typebox";
import { Value } from "typebox/value";

/**
 * A schema that types to `unknown` (not `any`).
 * Used as the default settings schema when an op declares no settings dependency.
 */
export const UnknownSchema = Type.Unsafe<unknown>({});

/**
 * Canonical normalization: convert -> clean -> default.
 * This must be the only way settings/config are defaulted.
 */
export function applySchemaDefaults<T extends TSchema>(schema: T, input: unknown): Static<T> {
  // Convert: coerce basic types where TypeBox allows (e.g., "1" -> 1)
  const converted = Value.Convert(schema, input);
  // Clean: remove unknown keys when additionalProperties: false
  const cleaned = Value.Clean(schema, converted);
  // Default: apply defaults (requires default: {} on objects to create missing objects)
  const defaulted = Value.Default(schema, cleaned);
  return defaulted as Static<T>;
}

/**
 * Global settings are owned by the authoring layer, not the engine.
 * Keep this small and stable.
 */
export const GlobalSettingsSchema = Type.Object(
  {
    seed: Type.Integer({ default: 0 }),
    width: Type.Integer({ minimum: 1, default: 80 }),
    height: Type.Integer({ minimum: 1, default: 50 }),
  },
  { additionalProperties: false, default: {} }
);

export type GlobalSettings = Static<typeof GlobalSettingsSchema>;

/**
 * Domain settings definition: schema + helpers.
 * `schema` must be a strict object schema (recommended).
 */
export type DomainSettingsDef<Id extends string, Schema extends TObject> = Readonly<{
  id: Id;
  schema: Schema;
  pick: <const Keys extends readonly (keyof Static<Schema> & string)[]>(
    ...keys: Keys
  ) => TObject;
}>;

export function defineDomainSettings<const Id extends string, const Schema extends TObject>(def: {
  id: Id;
  schema: Schema;
}): DomainSettingsDef<Id, Schema> {
  return {
    id: def.id,
    schema: def.schema,
    pick: (...keys) =>
      Type.Pick(def.schema, keys as unknown as string[], {
        additionalProperties: false,
        default: {},
      }),
  } as const;
}

export type RunSettingsShape<Global, Domains, Recipe> = Readonly<{
  global: Global;
  domains: Domains;
  recipe: Recipe;
}>;

export function defineRunSettings<
  const Global extends TObject,
  const Domains extends Record<string, TObject>,
  const Recipe extends TObject,
>(args: {
  global: Global;
  domains: Domains;
  recipe: Recipe;
}) {
  return Type.Object(
    {
      global: args.global,
      domains: Type.Object(args.domains, { additionalProperties: false, default: {} }),
      recipe: args.recipe,
    },
    { additionalProperties: false, default: {} }
  );
}

export type RunSettingsOf<S extends TSchema> = Static<S>;
```

Key constraints:

* Every object schema that participates in defaulting must include `{ default: {} }`.
* Prefer `{ additionalProperties: false }` for strictness.

---

### 4.2 Operation Contracts

#### `authoring/op/contract.ts`

```ts
import type { Static, TSchema } from "typebox";
import { UnknownSchema } from "../settings.js";

export type DomainOpKind = "plan" | "compute" | "score" | "select";

/**
 * Strategy config schemas live in the op contract.
 * Contract must include a "default" strategy.
 */
export type StrategyConfigSchemas = Readonly<Record<string, TSchema>> & {
  readonly default: TSchema;
};

/**
 * Contract-first: pure data only (schemas + identifiers + metadata).
 */
export type OpContract<
  Kind extends DomainOpKind,
  Id extends string,
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  SettingsSchema extends TSchema,
  Strategies extends StrategyConfigSchemas,
> = Readonly<{
  kind: Kind;
  id: Id;
  input: InputSchema;
  output: OutputSchema;

  /**
   * Settings slice schema for compile-time config resolution.
   * Defaults to UnknownSchema when omitted.
   */
  settings: SettingsSchema;

  /**
   * Strategy config schemas keyed by strategy id (must include "default").
   */
  strategies: Strategies;

  /**
   * Optional static metadata (safe for UI/tooling).
   */
  meta?: Readonly<{
    title?: string;
    description?: string;
  }>;
}>;

export function defineOp<
  const Kind extends DomainOpKind,
  const Id extends string,
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  const Strategies extends StrategyConfigSchemas,
  const SettingsSchema extends TSchema = typeof UnknownSchema,
>(def: {
  kind: Kind;
  id: Id;
  input: InputSchema;
  output: OutputSchema;
  strategies: Strategies;
  settings?: SettingsSchema;
  meta?: OpContract<Kind, Id, InputSchema, OutputSchema, SettingsSchema, Strategies>["meta"];
}): OpContract<Kind, Id, InputSchema, OutputSchema, SettingsSchema, Strategies> {
  return {
    ...def,
    settings: (def.settings ?? UnknownSchema) as SettingsSchema,
  };
}

export type OpInputOf<C extends OpContract<any, any, any, any, any, any>> = Static<C["input"]>;
export type OpOutputOf<C extends OpContract<any, any, any, any, any, any>> = Static<C["output"]>;
export type OpSettingsOf<C extends OpContract<any, any, any, any, any, any>> = Static<C["settings"]>;
export type StrategyIdOf<C extends OpContract<any, any, any, any, any, any>> = keyof C["strategies"] & string;

export type StrategyConfigOf<
  C extends OpContract<any, any, any, any, any, any>,
  Id extends StrategyIdOf<C>,
> = Static<C["strategies"][Id]>;

/**
 * Discriminated envelope over strategy ids.
 */
export type OpConfigEnvelope<C extends OpContract<any, any, any, any, any, any>> = {
  [Id in StrategyIdOf<C>]: Readonly<{ strategy: Id; config: StrategyConfigOf<C, Id> }>;
}[StrategyIdOf<C>];
```

---

### 4.3 Strategy Authoring

#### `authoring/op/strategy.ts`

```ts
import type { OpContract, OpInputOf, OpOutputOf, OpSettingsOf, StrategyConfigOf, StrategyIdOf } from "./contract.js";

/**
 * Prevents TypeScript from widening schema-derived types in certain inference paths.
 */
type NoInfer<T> = [T][T extends any ? 0 : never];

export type StrategyImpl<Input, Config, Output, Settings> = Readonly<{
  /**
   * Compile-time config normalization.
   * Called only when step/op config is being resolved (before runtime execution).
   */
  resolveConfig?: (config: Config, settings: Settings) => Config;

  /**
   * Pure, deterministic op implementation.
   * Must not mutate external state; steps own side-effects.
   */
  run: (input: Input, config: Config) => Output;
}>;

export type StrategyImplFor<
  C extends OpContract<any, any, any, any, any, any>,
  Id extends StrategyIdOf<C>,
> = StrategyImpl<
  OpInputOf<C>,
  NoInfer<StrategyConfigOf<C, Id>>,
  OpOutputOf<C>,
  OpSettingsOf<C>
>;

/**
 * Canonical: author a strategy by binding it to a contract and a strategy id.
 * This provides contextual typing without exporting schema-derived type aliases.
 */
export function createStrategy<
  C extends OpContract<any, any, any, any, any, any>,
  Id extends StrategyIdOf<C>,
>(contract: C, id: Id, impl: StrategyImplFor<C, Id>): StrategyImplFor<C, Id> {
  return impl;
}
```

---

### 4.4 Op Assembly

#### `authoring/op/create.ts`

```ts
import { Type, type Static, type TSchema } from "typebox";
import { applySchemaDefaults } from "../settings.js";
import type { OpContract, OpConfigEnvelope, OpInputOf, OpOutputOf, OpSettingsOf, StrategyIdOf } from "./contract.js";
import type { StrategyImplFor } from "./strategy.js";

export type ValidationError = Readonly<{ path: string; message: string }>;

export type CustomValidateFn<Input, Config> = (input: Input, config: Config) => ValidationError[];

export type DomainOp<C extends OpContract<any, any, any, any, any, any>> = Readonly<{
  contract: C;

  kind: C["kind"];
  id: C["id"];

  input: C["input"];
  output: C["output"];

  /**
   * Discriminated envelope schema computed from the contract's strategies.
   */
  configSchema: TSchema;

  /**
   * Canonical default config: default strategy + schema-derived defaults.
   */
  defaultConfig: OpConfigEnvelope<C>;

  /**
   * Compile-time normalization hook. Never called by the engine at runtime.
   */
  resolveConfig: (config: OpConfigEnvelope<C>, settings: OpSettingsOf<C>) => OpConfigEnvelope<C>;

  /**
   * Runtime execution (pure). Does not accept settings.
   */
  run: (input: OpInputOf<C>, config: OpConfigEnvelope<C>) => OpOutputOf<C>;

  /**
   * Validation surface for tooling and safe callers.
   */
  validate: (
    input: OpInputOf<C>,
    config: OpConfigEnvelope<C>
  ) => { ok: boolean; errors: ValidationError[] };

  runValidated: (input: OpInputOf<C>, config: OpConfigEnvelope<C>) => OpOutputOf<C>;
}>;

function buildEnvelopeSchema<C extends OpContract<any, any, any, any, any, any>>(contract: C): TSchema {
  const variants = Object.entries(contract.strategies).map(([strategyId, cfgSchema]) =>
    Type.Object(
      {
        strategy: Type.Literal(strategyId),
        config: cfgSchema,
      },
      { additionalProperties: false }
    )
  );
  return Type.Union(variants);
}

export function createOp<
  C extends OpContract<any, any, any, any, any, any>,
  Strategies extends { [K in StrategyIdOf<C>]: StrategyImplFor<C, K> },
>(
  contract: C,
  args: Readonly<{
    strategies: Strategies;
    customValidate?: CustomValidateFn<OpInputOf<C>, OpConfigEnvelope<C>>;
  }>
): DomainOp<C> {
  const configSchema = buildEnvelopeSchema(contract);

  const defaultInner = applySchemaDefaults(contract.strategies.default, undefined);
  const defaultConfig: OpConfigEnvelope<C> = {
    strategy: "default",
    config: defaultInner as any,
  } as any;

  function resolveConfig(config: OpConfigEnvelope<C>, settings: OpSettingsOf<C>): OpConfigEnvelope<C> {
    const stratId = config.strategy as keyof Strategies & string;
    const impl = args.strategies[stratId] as any;
    const schema = (contract.strategies as any)[stratId] as TSchema;

    const rawInner = (config as any).config;
    const resolvedInner = impl.resolveConfig ? impl.resolveConfig(rawInner, settings) : rawInner;
    const normalizedInner = applySchemaDefaults(schema, resolvedInner);

    return { strategy: stratId, config: normalizedInner } as any;
  }

  function run(input: OpInputOf<C>, config: OpConfigEnvelope<C>): OpOutputOf<C> {
    const stratId = config.strategy as keyof Strategies & string;
    const impl = args.strategies[stratId] as any;
    return impl.run(input, (config as any).config);
  }

  function validate(input: OpInputOf<C>, config: OpConfigEnvelope<C>) {
    const errors: ValidationError[] = [];

    // Canonical: schema validation is performed via TypeBox Value.Check + error extraction
    // (exact implementation omitted here; reuse existing validation utilities).
    //
    // Additionally: optional customValidate hook.
    if (args.customValidate) {
      errors.push(...args.customValidate(input, config));
    }

    return { ok: errors.length === 0, errors };
  }

  function runValidated(input: OpInputOf<C>, config: OpConfigEnvelope<C>) {
    const result = validate(input, config);
    if (!result.ok) {
      throw new Error(
        `Op validation failed for ${contract.id}: ` + result.errors.map((e) => `${e.path}: ${e.message}`).join(", ")
      );
    }
    return run(input, config);
  }

  return {
    contract,
    kind: contract.kind,
    id: contract.id,
    input: contract.input,
    output: contract.output,
    configSchema,
    defaultConfig,
    resolveConfig,
    run,
    validate,
    runValidated,
  };
}
```

Notes:

* `resolveConfig` is compile-time only and is called by steps (or step resolvers) while compiling an execution plan.
* `run` is runtime only and does not accept settings.

---

## 5. Domain Authoring

### 5.1 Domain Settings Declaration and Selectors

#### `domain/ecology/settings.ts`

```ts
import { Type, type Static } from "typebox";
import { defineDomainSettings } from "@mapgen/authoring/settings";

export const EcologySettingsSchema = Type.Object(
  {
    biomeNoiseScale: Type.Number({ default: 0.85 }),
    moistureBias: Type.Number({ default: 0.0 }),
    temperatureBias: Type.Number({ default: 0.0 }),
    featureDensity: Type.Number({ default: 0.5 }),
  },
  { additionalProperties: false, default: {} }
);

export type EcologySettings = Static<typeof EcologySettingsSchema>;

export const ecologySettings = defineDomainSettings({
  id: "ecology",
  schema: EcologySettingsSchema,
});
```

#### `domain/ecology/index.ts`

```ts
import type { RunSettingsShape } from "@mapgen/authoring/settings";
import type { EcologySettings } from "./settings";
import { ecologySettings } from "./settings";

import { ClassifyBiomes } from "./ops/classifyBiomes/contract";
import { classifyBiomes } from "./ops/classifyBiomes/op";

export const ecology = {
  id: "ecology" as const,
  settings: ecologySettings,

  // Pure data (schemas + ids)
  contracts: {
    classifyBiomes: ClassifyBiomes,
  },

  // Implementations
  ops: {
    classifyBiomes,
  },

  /**
   * Canonical selector: recipe settings → ecology domain settings slice.
   * Works for any recipe settings that include `domains.ecology`.
   */
  selectSettings<S extends RunSettingsShape<any, { ecology: EcologySettings }, any>>(settings: S): EcologySettings {
    return settings.domains.ecology;
  },
} as const;
```

---

### 5.2 Op Contract and Strategy Implementations

#### `domain/ecology/ops/classifyBiomes/contract.ts`

```ts
import { Type } from "typebox";
import { defineOp } from "@mapgen/authoring/op/contract";
import { ecologySettings } from "../../settings";

const InputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    elevation: Type.Array(Type.Number()),
  },
  { additionalProperties: false }
);

const OutputSchema = Type.Object(
  {
    biomeIds: Type.Array(Type.Integer({ minimum: 0 })),
  },
  { additionalProperties: false }
);

export const ClassifyBiomes = defineOp({
  kind: "compute",
  id: "ecology.classifyBiomes",
  input: InputSchema,
  output: OutputSchema,

  /**
   * This op only depends on a subset of ecology settings.
   * Strategy resolveConfig(...) receives only these fields.
   */
  settings: ecologySettings.pick("biomeNoiseScale", "moistureBias", "temperatureBias"),

  strategies: {
    default: Type.Object(
      {
        iterations: Type.Integer({ minimum: 1, default: 32 }),
      },
      { additionalProperties: false, default: {} }
    ),

    accurate: Type.Object(
      {
        iterations: Type.Integer({ minimum: 1, default: 256 }),
      },
      { additionalProperties: false, default: {} }
    ),
  },

  meta: {
    title: "Classify Biomes",
    description: "Assign biome ids based on elevation and climate heuristics.",
  },
});
```

#### `domain/ecology/ops/classifyBiomes/strategies/default.ts`

```ts
import { createStrategy } from "@mapgen/authoring/op/strategy";
import { ClassifyBiomes } from "../contract";

export const defaultStrategy = createStrategy(ClassifyBiomes, "default", {
  resolveConfig: (config, settings) => {
    // settings is typed to the op's settings slice (picked subset)
    const bias = settings.moistureBias + settings.temperatureBias;

    // Example: normalize iterations as a function of settings (compile-time).
    const scaled = Math.round(config.iterations * (1 + Math.abs(bias)));
    return { ...config, iterations: Math.max(1, scaled) };
  },

  run: (input, config) => {
    // Deterministic logic only.
    const biomeIds = new Array(input.width * input.height).fill(0);
    // ... fill biomeIds ...
    return { biomeIds };
  },
});
```

#### `domain/ecology/ops/classifyBiomes/strategies/accurate.ts`

```ts
import { createStrategy } from "@mapgen/authoring/op/strategy";
import { ClassifyBiomes } from "../contract";

export const accurateStrategy = createStrategy(ClassifyBiomes, "accurate", {
  run: (input, config) => {
    const biomeIds = new Array(input.width * input.height).fill(0);
    // ... more expensive but higher quality classification ...
    return { biomeIds };
  },
});
```

#### `domain/ecology/ops/classifyBiomes/op.ts`

```ts
import { createOp } from "@mapgen/authoring/op/create";
import { ClassifyBiomes } from "./contract";
import { defaultStrategy } from "./strategies/default";
import { accurateStrategy } from "./strategies/accurate";

export const classifyBiomes = createOp(ClassifyBiomes, {
  strategies: {
    default: defaultStrategy,
    accurate: accurateStrategy,
  },
});
```

---

## 6. Recipe Authoring

### 6.1 Recipe Settings Composition

#### `recipes/standard/settings.ts`

```ts
import { Type, type Static } from "typebox";
import { defineRunSettings, GlobalSettingsSchema } from "@mapgen/authoring/settings";
import { ecology } from "@mapgen/domain/ecology";
// import { placement } from "@mapgen/domain/placement"; // example

export const StandardRecipeSettingsSchema = defineRunSettings({
  global: GlobalSettingsSchema,

  domains: {
    ecology: ecology.settings.schema,
    // placement: placement.settings.schema,
  },

  recipe: Type.Object(
    {
      difficulty: Type.Union([Type.Literal("normal"), Type.Literal("hard")], { default: "normal" }),
    },
    { additionalProperties: false, default: {} }
  ),
});

export type StandardRecipeSettings = Static<typeof StandardRecipeSettingsSchema>;
```

---

### 6.2 Steps Call Ops and Slice Settings

#### `recipes/standard/stages/ecology/steps/biomes.ts`

```ts
import { Type, type Static } from "typebox";
import { createStep } from "@mapgen/authoring/step";
import type { StandardRecipeSettings } from "../../settings";
import { ecology } from "@mapgen/domain/ecology";

export const BiomesStepConfigSchema = Type.Object(
  {
    classifyBiomes: Type.Object(
      {
        strategy: Type.Union([Type.Literal("default"), Type.Literal("accurate")], { default: "default" }),
        config: Type.Object(
          {
            iterations: Type.Integer({ minimum: 1, default: 32 }),
          },
          { additionalProperties: false, default: {} }
        ),
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: {} }
);

export type BiomesStepConfig = Static<typeof BiomesStepConfigSchema>;

export const biomesStep = createStep({
  id: "ecology:biomes",
  phase: "ecology",
  requires: ["artifact:elevationField"],
  provides: ["artifact:biomeIds"],
  schema: BiomesStepConfigSchema,

  /**
   * Compile-time config resolution.
   * This is where settings influence behavior.
   */
  resolveConfig: (config: BiomesStepConfig, settings: StandardRecipeSettings): BiomesStepConfig => {
    const ecologySettings = ecology.selectSettings(settings);

    return {
      ...config,
      classifyBiomes: ecology.ops.classifyBiomes.resolveConfig(config.classifyBiomes as any, ecologySettings) as any,
    };
  },

  /**
   * Runtime execution: uses resolved config only.
   */
  run: async (ctx, config: BiomesStepConfig) => {
    const input = {
      width: ctx.dimensions.width,
      height: ctx.dimensions.height,
      elevation: [], // from artifacts/buffers
    };

    const out = ecology.ops.classifyBiomes.run(input, config.classifyBiomes as any);

    // publish artifacts, write buffers, etc.
    // ctx.artifacts.set("artifact:biomeIds", out.biomeIds)
  },
});
```

Canonical pattern:

* settings are used only in `resolveConfig(...)`
* runtime uses config only

---

### 6.3 Recipe Module

#### `authoring/recipe.ts` (canonical signature)

```ts
import type { TSchema, Static } from "typebox";
import { applySchemaDefaults } from "./settings.js";
import { compileExecutionPlan, PipelineExecutor, StepRegistry, TagRegistry } from "@mapgen/engine";
import type { ExecutionPlan, RunRequest, RecipeV2 } from "@mapgen/engine";
import type { Step, Stage } from "./types.js";

export type RecipeModule<TContext, TConfig, TSettings> = {
  readonly id: string;
  readonly settingsSchema: TSchema;
  readonly recipe: RecipeV2;

  normalizeSettings: (input: unknown) => TSettings;

  instantiate: (config?: TConfig) => RecipeV2;

  runRequest: (settings: TSettings, config?: TConfig) => RunRequest<TSettings>;

  compile: (settings: TSettings, config?: TConfig) => ExecutionPlan<TSettings>;

  run: (context: TContext, settings: TSettings, config?: TConfig, options?: {
    log?: (message: string) => void;
    // trace options here (NOT in settings)
  }) => void | Promise<void>;
};

export function createRecipe<
  TContext,
  const TStages extends readonly Stage<TContext, any, any>[],
  const SettingsSchema extends TSchema,
>(def: Readonly<{
  id: string;
  settingsSchema: SettingsSchema;
  tagDefinitions: readonly any[];
  stages: TStages;
}>): RecipeModule<
  TContext,
  // config type derived from stages (omitted here for brevity)
  unknown,
  Static<SettingsSchema>
> {
  const registry = new StepRegistry<TContext, Static<SettingsSchema>>();
  const tags = new TagRegistry(def.tagDefinitions);

  // Register all steps into the registry (each step may have resolveConfig(settings))
  for (const stage of def.stages) {
    for (const step of stage.steps) {
      registry.register(step);
    }
  }

  function normalizeSettings(input: unknown): Static<SettingsSchema> {
    return applySchemaDefaults(def.settingsSchema, input);
  }

  function instantiate(_config?: unknown): RecipeV2 {
    // Build the structural recipe (step occurrences, order, metadata)
    // Implementation omitted; reuse existing structural recipe builder.
    return { schemaVersion: 2, steps: [] } as any;
  }

  function runRequest(settings: Static<SettingsSchema>, config?: unknown): RunRequest<Static<SettingsSchema>> {
    return { recipe: instantiate(config), settings };
  }

  function compile(settings: Static<SettingsSchema>, config?: unknown): ExecutionPlan<Static<SettingsSchema>> {
    return compileExecutionPlan(runRequest(settings, config), registry, tags);
  }

  async function run(context: TContext, settings: Static<SettingsSchema>, config?: unknown) {
    const plan = compile(settings, config);
    const executor = new PipelineExecutor<TContext, Static<SettingsSchema>>(registry, tags);
    await executor.run(plan, context);
  }

  return {
    id: def.id,
    settingsSchema: def.settingsSchema,
    recipe: instantiate(null),
    normalizeSettings,
    instantiate,
    runRequest,
    compile,
    run,
  };
}
```

Important:

* `normalizeSettings` is a first-class recipe API.
* Trace/logging options belong in `run(..., options)`, not in settings.

---

## 7. Engine Interface Changes

The engine becomes generic over settings and never defines a global `RunSettings` schema.

### 7.1 `engine/types.ts`

```ts
import type { TSchema } from "typebox";

export type GenerationPhase =
  | "setup"
  | "foundation"
  | "morphology"
  | "hydrology"
  | "ecology"
  | "placement";

export type DependencyTag = string;

export interface MapGenStep<TContext, TConfig, TSettings> {
  id: string;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  configSchema?: TSchema;

  resolveConfig?: (config: TConfig, settings: TSettings) => TConfig;

  run: (context: TContext, config: TConfig) => void | Promise<void>;
}
```

### 7.2 `engine/execution-plan.ts`

```ts
export type RunRequest<TSettings = unknown> = Readonly<{
  recipe: RecipeV2;
  settings: TSettings;
}>;

export type ExecutionPlanNode = Readonly<{
  stepId: string;
  phase: string;
  config: unknown; // step-owned config after resolution
  requires: readonly string[];
  provides: readonly string[];
}>;

export type ExecutionPlan<TSettings = unknown> = Readonly<{
  recipe: RecipeV2;
  settings: TSettings;
  nodes: readonly ExecutionPlanNode[];
}>;
```

### 7.3 `engine/compileExecutionPlan(...)`

```ts
export function compileExecutionPlan<TContext, TSettings>(
  request: RunRequest<TSettings>,
  steps: StepRegistry<TContext, TSettings>,
  tags: TagRegistry
): ExecutionPlan<TSettings> {
  // Build plan nodes; for each node:
  // - validate config against step schema
  // - call step.resolveConfig(config, request.settings) if provided
  // - store resolved config in plan.nodes
  return { recipe: request.recipe, settings: request.settings, nodes: [] } as any;
}
```

---

## 8. Architecture vs Current Implementation

This section enumerates what must change relative to the current codebase.

### 8.1 Settings Boundary Corrections

**Must change**

* The authoring layer must not import or reference an engine-owned `RunSettings` type.

  * Today, `RunSettings` is imported into:

    * authoring step types (`Step.resolveConfig(config, settings: RunSettings)`)
    * authoring recipe module (`runRequest/compile/run(settings: RunSettings)`)
    * authoring op surfaces (`DomainOp.resolveConfig(..., settings: RunSettings)`)
    * engine `MapGenStep.resolveConfig(..., settings: RunSettings)`
    * core context (`ExtendedMapContext.settings: RunSettings`)
* Engine-owned `RunSettingsSchema` must be removed.
* Settings schemas must be authored and composed outside the engine:

  * global schema in authoring
  * domain schemas in domains
  * composed recipe schema in recipes

**Canonical replacement**

* Engine becomes generic over `TSettings`.
* Recipe modules own `settingsSchema` and `normalizeSettings(...)`.
* Domain ops and strategies see only a contract-declared settings slice schema.

### 8.2 Operation Authoring: Contract‑First Assembly

**Must change**

* Today, strategies commonly include their own `config` schema and are passed directly into `createOp({ strategies: { ... } })`.
* Canonical design requires:

  * **config schemas move into the op contract**
  * strategies become **implementation-only**
  * ops are assembled from `(contract + strategies)` via `createOp(contract, { strategies })`

**Unchanged (conceptually)**

* The discriminated envelope model remains:

  * `{ strategy: "<id>", config: <strategy-config> }`
* `default` strategy is mandatory.
* `defaultConfig` is derived from the default strategy config schema.
* `resolveConfig` remains compile-time only (never called during execution).

**Extended/adjusted**

* Op contracts now optionally include a **settings slice schema**.
* Strategy `resolveConfig` signature changes from `(config, settings: RunSettings)` to `(config, settings: OpSettingsSlice)`.

### 8.3 Recipes and Steps: Typed Settings Composition

**Must change**

* Recipes must define a composed run settings schema (global + selected domains + recipe-local).
* Steps that resolve config must accept recipe settings (or a compatible subset type) rather than engine settings.
* Steps must slice settings when calling ops:

  * `op.resolveConfig(config, domain.selectSettings(settings))`

**Unchanged**

* Engine compile calls step `resolveConfig` and stores resolved config in the plan.
* Step `run` executes with resolved config.

---

## 9. Detailed Implementation Plan

Assume full migration to the new architecture with no long-term shims.

### Phase 1 — Introduce Generic Settings in Engine and Core

**Goal:** Remove the engine-owned `RunSettings` type from the type system and make engine compile/execution generic over `TSettings`.

**Changes**

1. **Engine types**

   * Update:

     * `packages/mapgen-core/src/engine/types.ts`

       * `MapGenStep<TContext, TConfig, TSettings>`
     * `packages/mapgen-core/src/engine/execution-plan.ts`

       * `RunRequest<TSettings>`
       * `ExecutionPlan<TSettings>`
   * Update:

     * `compileExecutionPlan` signature to accept `RunRequest<TSettings>` and registry typed with `TSettings`.

2. **Step registry + executor**

   * Update:

     * `packages/mapgen-core/src/engine/StepRegistry.ts`
     * `packages/mapgen-core/src/engine/PipelineExecutor.ts`
   * Propagate `TSettings` generics through registration and execution entrypoints.

3. **Core context**

   * Update:

     * `packages/mapgen-core/src/core/types.ts`
   * Change:

     * `ExtendedMapContext` → `ExtendedMapContext<TSettings = unknown>`
     * `settings: TSettings`
   * Remove engine import from core.

**Work classification**

* Mostly **mechanical** once generic parameters are threaded.
* Expect a large but straightforward cascade of TS errors that all point to the same change.

**Order**

* Engine types → compilation → executor → core context.

---

### Phase 2 — Move Settings Schemas to Authoring and Recipes

**Goal:** Establish `defineDomainSettings`, `defineRunSettings`, and recipe normalization.

**Changes**

1. **Authoring settings module**

   * Add:

     * `packages/mapgen-core/src/authoring/settings.ts`

       * `GlobalSettingsSchema`
       * `defineDomainSettings`
       * `defineRunSettings`
       * `applySchemaDefaults` (or relocate/standardize existing implementation)

2. **Authoring recipe module**

   * Update:

     * `packages/mapgen-core/src/authoring/types.ts`

       * `RecipeModule<TContext, TConfig, TSettings>`
       * `Step<TContext, TConfig, TSettings>`
     * `packages/mapgen-core/src/authoring/recipe.ts`

       * `createRecipe` now takes `settingsSchema`
       * adds `normalizeSettings`
       * `compile/run` use `TSettings` (no engine RunSettings import)

3. **Mods runtime entrypoints**

   * Update:

     * `mods/mod-swooper-maps/src/maps/_runtime/standard-entry.ts`
     * `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts`
   * Replace any `RunSettings` references with `StandardRecipeSettings` (exported from recipe settings module) or `unknown` at boundaries + normalization.

4. **Recipes**

   * Add per recipe:

     * `recipes/<recipe>/settings.ts` composing:

       * global schema
       * domain schemas used by the recipe
       * recipe-local schema
   * Update recipe module creation to reference `settingsSchema`.

**Work classification**

* **Mechanical** edits to signatures and imports.
* **Non-mechanical** only where runtime code constructs settings and must decide what “raw input” shape is.

**Order**

* Add authoring settings primitives → refactor createRecipe → update runtime entrypoints → update recipes.

---

### Phase 3 — Contract‑First Ops + Strategy Assembly

**Goal:** Replace current `createOp({ strategies: { config, run, resolveConfig }})` with contract-first ops and strategy implementations.

**Changes**

1. **Authoring op modules**

   * Replace/introduce:

     * `authoring/op/contract.ts` (`defineOp`, `OpContract`, envelope typing)
     * `authoring/op/strategy.ts` (`createStrategy(contract, id, impl)`)
     * `authoring/op/create.ts` (`createOp(contract, { strategies, customValidate? })`)
   * Remove engine settings imports from op authoring.

2. **Domain ops refactor**
   For each op:

   * Create:

     * `ops/<op>/contract.ts` (schemas + op contract)
     * `ops/<op>/strategies/<id>.ts` (implementation only)
     * `ops/<op>/op.ts` (assembly)
   * Update domain index to export:

     * `contracts`
     * `ops`

3. **Steps that refer to op config types**

   * If steps use `Parameters<typeof op.run>[1]`, it should continue to work.
   * If steps import strategy schema objects from strategy modules, replace with contract-derived references.

**Work classification**

* Largely **mechanical**:

  * move config schema from strategy to contract
  * remove schema from strategy definition
  * wrap with `createStrategy(contract, id, impl)`
  * assemble with `createOp(contract, { strategies })`
* Some **non-mechanical**:

  * if a strategy previously relied on local schema metadata or defaults in a nonstandard way
  * custom validation hooks that refer to old config shapes

**Order**

* Implement authoring primitives first → refactor one op end-to-end → bulk refactor remaining ops.

---

### Phase 4 — Enforce Boundaries + Cleanups

**Goal:** Lock the architecture so regressions are mechanically prevented.

**Changes**

* Remove any remaining `RunSettings` exports/types from engine package surface.
* Delete any deprecated op/strategy authoring functions.
* Add lint + CI checks (see Guardrails).
* Update docs:

  * adding new domain
  * adding new op
  * adding new recipe
  * rules for settings usage

**Work classification**

* **Mechanical**, but must be done last to avoid blocking migration work.

---

## 10. Guardrails for the Refactor

### 10.1 ESLint: Forbidden Imports

In `eslint.config.js` (or equivalent):

```js
module.exports = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          // Domains and authoring must not import engine settings types
          {
            group: ["@mapgen/engine/execution-plan*", "@mapgen/engine/index*"],
            importNames: ["RunSettings", "RunSettingsSchema"],
            message: "Engine-owned RunSettings types are forbidden. Use recipe-composed settings types/schemas.",
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ["mods/**/src/domain/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@mapgen/engine/**"],
                message: "Domains must not import from engine. Import from authoring SDK only.",
              },
            ],
          },
        ],
      },
    },
  ],
};
```

### 10.2 Dependency Boundaries (Recommended)

Use `eslint-plugin-boundaries` (or similar) to enforce:

* `engine` cannot import `domain`
* `domain` cannot import `engine`
* `domain/ops/**/strategies/**` cannot import `domain/ops/**/op.ts` (prevents cycles)

### 10.3 Text Search / CI Failsafe

Add a CI step:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Forbidden engine settings leakage
rg -n --hidden --glob '!*dist*' --glob '!*build*' \
  'RunSettingsSchema|RunSettings\b|@mapgen/engine/execution-plan' \
  packages/mapgen-core/src/authoring mods/**/src/domain \
  && { echo "Forbidden engine settings leakage detected"; exit 1; } \
  || true
```

### 10.4 Type-Level Constraints

* Do not export `RunSettings` from the engine package.
* Ensure op contracts default `settings` to `UnknownSchema` so strategies cannot accidentally get `any`.

### 10.5 Targeted Tests

Add a small set of high-leverage tests (no full new suite):

1. **Settings normalization test**

   * Given partial settings input, `recipe.normalizeSettings` returns canonical defaults.
2. **Compile-time resolution test**

   * A step with `resolveConfig` that calls `op.resolveConfig` produces expected resolved config in the execution plan.
3. **Strategy contextual typing test** (type test)

   * Use `tsd` or a build-only `*.test-d.ts` with `// @ts-expect-error` to assert:

     * `settings` in `resolveConfig` is typed to the contract settings slice
     * `config` is typed to the correct strategy schema
     * invalid access fails compilation

Example `*.test-d.ts`:

```ts
import { ClassifyBiomes } from "../domain/ecology/ops/classifyBiomes/contract";
import { createStrategy } from "../authoring/op/strategy";

createStrategy(ClassifyBiomes, "default", {
  resolveConfig: (cfg, settings) => {
    settings.moistureBias; // ok
    // @ts-expect-error: not in picked slice
    settings.featureDensity;
    return cfg;
  },
  run: (input, cfg) => ({ biomeIds: [] }),
});
```

---

## 11. Limitations, Considerations, and Gotchas

### 11.1 TypeBox Defaulting Requires `{ default: {} }`

This will break because:

* nested defaults will not materialize if parent objects are missing and the parent object schema has no default.

Rules:

* any object schema that participates in defaulting must specify `{ default: {} }`.
* `defineRunSettings` must set `{ default: {} }` on root, `domains`, and `recipe` objects.

### 11.2 Schema Widening and Inference Loss

This will break because:

* TypeBox schemas can widen across module boundaries and TypeScript inference can degrade.

Rules:

* use `const` generics (`defineOp`, `defineRunSettings`) to preserve literal strategy ids and schema statics.
* use `NoInfer` in strategy impl typing where schema-derived types are passed through generic layers.

### 11.3 Cross-Domain Settings in Ops

This will break because:

* ops become harder to reuse and violate the settings inversion boundary.

Rules:

* an op’s settings slice should come from its own domain by default.
* if cross-domain data is needed, prefer:

  * step-level config resolution that composes multiple domain settings into step config
  * or explicitly shape op settings as `{ a: ..., b: ... }` and require callers to pass that (rare).

### 11.4 Reading Settings at Runtime

This will break because:

* runtime steps become less reproducible and harder to cache/fingerprint if behavior depends on settings that were not compiled into config.

Rules:

* use settings only in compile-time `resolveConfig`.
* prefer passing resolved parameters through config and keeping runtime pure/explicit.

### 11.5 Strategy Modules Must Not Import Op Assembly

This will break because:

* it creates circular dependencies (`op.ts` imports strategies, strategies import op.ts).

Rules:

* strategy modules import **only the contract** (`contract.ts`), never the assembled op.

---

## 12. Summary

This architecture establishes:

* **Contract-first ops**: stable, schema-driven operation contracts decoupled from implementation.
* **Strategy assembly**: strategies are authored as pure implementations and assembled into ops by binding to a contract and strategy id (contextual typing without boilerplate).
* **Inverted settings dependencies**: domains define their own settings schemas; recipes compose settings; the engine transports settings as opaque generic data and never owns a global run settings schema.

It enables:

* strict domain/engine separation (no engine settings leakage into domains)
* recipe-specific settings without engine coupling
* safer, more mechanical refactors (central type changes + bulk callsite updates)
* stable contracts consumable by tooling/UI without pulling in runtime code
* reduced TypeScript friction (no more exporting schema-derived config types just to type strategy parameters)

Conceptually, the key shift is:

* settings are no longer an engine-defined global type threaded everywhere; they are **domain-authored**, **recipe-composed**, and **compile-time applied** to produce deterministic runtime configs.
