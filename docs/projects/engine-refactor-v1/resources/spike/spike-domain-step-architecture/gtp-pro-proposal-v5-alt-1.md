# Mapgen Canonical Architecture

## Contract‑First Operations with Inverted Settings, Domain Routers, and Engine‑Opaque Runtime

---

## 1. Architectural Model

### 1.1 Core Concepts

**Domain**
A domain is a self‑contained library of *pure* procedural logic expressed as **operations (ops)**. Domains do not depend on the engine’s runtime settings type and do not assume any particular recipe.

**Operation (Op)**
An op is a stable, step‑callable unit of work defined by:

* An **input** schema
* An **output** schema
* A **strategy set** (named strategies, always including `default`)
* A **plan‑truth config envelope**: `{ strategy, config }`
* An optional **compile‑time config normalizer** (`resolveConfig`) implemented per strategy

Ops are *domain contracts* first. Implementations are attached later.

**Strategy**
A strategy is the implementation of an op variant. All strategies share the same input/output contract but may have distinct config schemas. Strategy logic is pure:

* `run(input, config) -> output`
* optional `resolveConfig(config, settingsSlice) -> config` (compile‑time only)

**Recipe**
A recipe is an orchestrator that:

* Defines **run settings schema** by composing global + domain + recipe settings
* Defines stages/steps
* Compiles an execution plan using the engine
* Executes the plan with an engine context

**Step**
A step is the runtime binding layer. Steps:

* Own adapter reads/writes and artifact publication
* Call domain ops (pure)
* Perform compile‑time config normalization by calling `op.resolveConfig(...)`

**Engine**
The engine:

* Compiles and executes execution plans
* Treats settings as **opaque payload** (validated/defaulted using the recipe‑provided schema)
* Never imports domain logic

---

### 1.2 Layering and Boundaries

#### Domain Layer

Allowed dependencies:

* Authoring/contract utilities (schemas, op contract builders, strategy helpers)
* TypeBox schemas and helpers
* Pure helper libraries

Disallowed dependencies:

* Engine runtime (execution plan types, engine `RunSettings`, adapters, etc.)
* Recipe/step orchestration

#### Authoring SDK Layer

Provides:

* Contract DSL: `defineOp`, `defineDomain`, `defineDomainSettings`, `defineRunSettings`
* Assembly: `createStrategy`, `createOp`, `createDomain`
* Recipe & step authoring: `createStep`, `createStage`, `createRecipe`
* Schema utilities: defaults, validation, selection helpers

Does not:

* Encode domain logic
* Encode recipe‑specific settings

#### Engine Layer

Provides:

* Plan compilation and execution primitives (registry, executor, plan)
* Opaque settings transport

Does not:

* Define canonical “global RunSettings” used by all domains
* Reach into domain logic

---

## 2. Settings Model After Inversion

### 2.1 Terms: Config vs Settings

**Config**
Plan‑truth, step‑truth values that determine op behavior. Config is stored in step configuration and therefore must be stable and serializable.

**Settings**
Run‑truth values that are selected/composed by a recipe and passed through the engine. Settings influence compile‑time normalization (`resolveConfig`) and recipe orchestration. Settings are **not** owned by the engine as a type; they are owned by the recipe as a schema.

---

### 2.2 Canonical Run Settings Shape

All recipes produce a *single* `RunSettings` object with this canonical structure:

```ts
type RunSettings = {
  global: GlobalSettings;
  domains: {
    [domainId: string]: unknown; // concretely typed per recipe composition
  };
  recipe?: Record<string, unknown>; // optional recipe-specific settings namespace
};
```

Key properties:

* **`global`**: authoring SDK owns the schema (engine-agnostic, reusable)
* **`domains`**: composed from domain settings contracts
* **`recipe`**: recipe-local knobs when needed (optional but supported)

---

### 2.3 Domain Settings Contracts

Each domain owns a **domain settings contract**:

* A TypeBox schema
* Optional defaults embedded in schema
* Selection helpers to safely obtain:

  * Domain settings from recipe run settings
  * Subsets of domain settings for specific ops/strategies

#### Domain settings definition

Domains define settings once, and ops select subsets.

---

### 2.4 Op Settings Slices

Each op declares the **exact settings slice** it can see in `resolveConfig`.

* Strategies do *not* receive full recipe run settings.
* Strategies do *not* receive full domain settings unless explicitly declared.
* Slices are selected via **composition helpers** built from domain settings contracts.

This enforces:

* No accidental coupling to unrelated settings keys
* Explicit cross‑cutting knobs only where intended

---

### 2.5 Recipe Settings Composition

Recipes compose:

* `GlobalSettingsSchema`
* One or more domain settings schemas
* Optional recipe-local schema

into a single schema via `defineRunSettings`.

The engine receives:

* The compiled plan
* The concrete runtime settings object (already validated and defaulted by the recipe schema)
* The settings object is treated as opaque payload during execution

---

## 3. Contracts and Core Primitives

### 3.1 Op Contract

An op contract is the canonical declaration of:

* `kind`, `id`
* `input`, `output` schemas
* `strategies` config schemas (must include `default`)
* `settings` selection (a declared slice schema + selector)

**Op contract does not include implementation logic.**

---

### 3.2 Strategy Contract

A strategy contract is the typed handle derived from the op contract. It carries:

* The strategy’s config schema
* The op’s input/output types
* The op’s declared settings slice type

This is what enables **out‑of‑line strategy definition** with full inference.

---

### 3.3 Op Assembly

`createOp(contract, implementations)`:

* Builds plan‑truth `config` envelope schema as a union
* Derives `defaultConfig` from the default strategy schema defaults
* Wires a dispatcher:

  * `run(input, envelope)` → `strategy.run(input, envelope.config)`
  * `resolveConfig(envelope, settingsSlice)` → per‑strategy `resolveConfig` if defined

---

### 3.4 Domain Routers: Contract Router vs Implementation Router

Each domain exposes two “routers”:

1. **Domain contract router**

   * domain id
   * domain settings contract
   * op contracts

2. **Domain implementation router**

   * domain id
   * settings contract (re-exported)
   * assembled ops

This mirrors a contract/router/handler pattern:

* Contracts are stable and import‑safe
* Implementations attach logic without changing contracts

---

## 4. Concrete TypeScript API Shape

The following is the canonical API surface.

### 4.1 Settings Helpers

```ts
// @swooper/mapgen-core/authoring/settings

import { Type, type Static, type TSchema } from "typebox";

/** A pickable slice of a domain settings object. */
export type SettingsPick<
  DomainSchema extends TSchema,
  const Keys extends readonly (keyof Static<DomainSchema> & string)[],
> = Readonly<{
  schema: TSchema; // schema of the picked subset
  keys: Keys;
  pick: (domainSettings: Static<DomainSchema>) => Pick<Static<DomainSchema>, Keys[number]>;
}>;

export type DomainSettingsDef<Id extends string, Schema extends TSchema> = Readonly<{
  id: Id;
  schema: Schema;

  /** Select this domain’s settings out of canonical recipe run settings. */
  selectFrom: <TSettings extends { domains: Record<Id, Static<Schema>> }>(
    settings: TSettings
  ) => TSettings["domains"][Id];

  /** Declare the exact subset of domain settings an op is allowed to see. */
  pick: <const Keys extends readonly (keyof Static<Schema> & string)[]>(
    ...keys: Keys
  ) => SettingsPick<Schema, Keys>;
}>;

export function defineDomainSettings<
  const Id extends string,
  const Schema extends TSchema,
>(def: { id: Id; schema: Schema }): DomainSettingsDef<Id, Schema> {
  // canonical implementation: returns selector based on settings.domains[id]
  // and a key-picker using runtime property picking.
  // (Implementation intentionally omitted here; spec focuses on shape.)
  throw new Error("spec-only");
}

/** Global settings contract owned by authoring (engine-agnostic). */
export const GlobalSettingsSchema = Type.Object(
  {
    seed: Type.Integer({ default: 1 }),
    // add additional global knobs here (map size, debug flags, etc.)
  },
  { additionalProperties: false }
);

export type GlobalSettings = Static<typeof GlobalSettingsSchema>;

/** Canonical run settings composition helper. */
export function defineRunSettings<const Schema extends TSchema>(schema: Schema): Schema {
  return schema;
}
```

---

### 4.2 Op Contracts and Assembly

```ts
// @swooper/mapgen-core/authoring/op/contract

import type { Static, TSchema } from "typebox";
import { Type } from "typebox";
import type { SettingsPick } from "../settings.js";

export type DomainOpKind = "plan" | "compute" | "score" | "select";

/** Strategy contract (no logic). */
export type StrategyContract<
  ConfigSchema extends TSchema,
  Input,
  Output,
  Settings,
> = Readonly<{
  config: ConfigSchema;
  /** phantom typing carrier (no runtime meaning) */
  __types?: {
    input: Input;
    output: Output;
    settings: Settings;
  };
}>;

/** Op contract (no logic). */
export type OpContract<
  Kind extends DomainOpKind,
  Id extends string,
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  SettingsSchema extends TSchema,
  Strategies extends Record<string, StrategyContract<TSchema, any, any, any>> & {
    default: StrategyContract<TSchema, any, any, any>;
  },
> = Readonly<{
  kind: Kind;
  id: Id;
  input: InputSchema;
  output: OutputSchema;

  /** schema of the settings slice visible to resolveConfig */
  settings: SettingsSchema;

  /** strategy contracts keyed by strategy id (must include default) */
  strategies: Strategies;
}>;

type StrategyContractsFor<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  SettingsSchema extends TSchema,
  ConfigSchemas extends Record<string, TSchema> & { default: TSchema },
> = {
  [K in keyof ConfigSchemas & string]: StrategyContract<
    ConfigSchemas[K],
    Static<InputSchema>,
    Static<OutputSchema>,
    Static<SettingsSchema>
  >;
};

/**
 * defineOp: contract-first op declaration.
 * - config schemas per strategy are declared here (single source of truth)
 * - settings slice schema is declared here
 */
export function defineOp<
  const Kind extends DomainOpKind,
  const Id extends string,
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  const SettingsSchema extends TSchema,
  const StrategyConfigSchemas extends Record<string, TSchema> & { default: TSchema },
>(def: {
  kind: Kind;
  id: Id;
  input: InputSchema;
  output: OutputSchema;
  settings: SettingsSchema;
  strategyConfig: StrategyConfigSchemas;
}): OpContract<
  Kind,
  Id,
  InputSchema,
  OutputSchema,
  SettingsSchema,
  StrategyContractsFor<InputSchema, OutputSchema, SettingsSchema, StrategyConfigSchemas>
> {
  // runtime returns { ...def, strategies: { ... } } where each strategy carries config schema
  throw new Error("spec-only");
}

/** Plan-truth envelope type used everywhere at step boundary. */
export type StrategySelection<Strategies extends Record<string, { config: TSchema }>> = Readonly<{
  strategy: keyof Strategies & string;
  config: Static<Strategies[keyof Strategies & string]["config"]>;
}>;

/** Op envelope schema type. */
export interface OpConfigSchema<Strategies extends Record<string, { config: TSchema }>> extends TSchema {
  static: StrategySelection<Strategies>;
}
```

---

### 4.3 Strategy Authoring

```ts
// @swooper/mapgen-core/authoring/op/strategy

import type { Static, TSchema } from "typebox";
import type { StrategyContract } from "./contract.js";

/** Strategy implementation (logic only). */
export type StrategyImpl<
  ConfigSchema extends TSchema,
  Input,
  Output,
  Settings,
> = Readonly<{
  resolveConfig?: (config: Static<ConfigSchema>, settings: Settings) => Static<ConfigSchema>;
  run: (input: Input, config: Static<ConfigSchema>) => Output;
}>;

/** Fully assembled strategy (contract + impl). */
export type OpStrategy<
  ConfigSchema extends TSchema,
  Input,
  Output,
  Settings,
> = Readonly<{
  config: ConfigSchema;
  resolveConfig?: (config: Static<ConfigSchema>, settings: Settings) => Static<ConfigSchema>;
  run: (input: Input, config: Static<ConfigSchema>) => Output;
}>;

/**
 * createStrategy: binds implementation to a strategy contract.
 *
 * Canonical role:
 * - used for out-of-line strategy modules to regain contextual typing
 * - optional for inline strategies (inline object literals can be contextually typed by createOp)
 */
export function createStrategy<
  const ConfigSchema extends TSchema,
  Input,
  Output,
  Settings,
>(
  contract: StrategyContract<ConfigSchema, Input, Output, Settings>,
  impl: StrategyImpl<ConfigSchema, Input, Output, Settings>
): OpStrategy<ConfigSchema, Input, Output, Settings> {
  return { config: contract.config, ...impl };
}
```

---

### 4.4 Op Assembly

```ts
// @swooper/mapgen-core/authoring/op/create

import { Type, type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";
import type { OpContract, OpConfigSchema, StrategySelection } from "./contract.js";
import type { OpStrategy } from "./strategy.js";

type StrategiesImplFor<Contract extends OpContract<any, any, any, any, any, any>> = {
  [K in keyof Contract["strategies"] & string]: OpStrategy<
    Contract["strategies"][K]["config"],
    NonNullable<Contract["strategies"][K]["__types"]>["input"],
    NonNullable<Contract["strategies"][K]["__types"]>["output"],
    NonNullable<Contract["strategies"][K]["__types"]>["settings"]
  >;
};

export type DomainOp<
  Contract extends OpContract<any, any, any, any, any, any>,
  Strategies extends Record<string, { config: TSchema }>,
> = Readonly<{
  kind: Contract["kind"];
  id: Contract["id"];
  input: Contract["input"];
  output: Contract["output"];

  /** plan-truth config envelope schema */
  config: OpConfigSchema<Strategies>;

  /** default plan-truth config envelope */
  defaultConfig: StrategySelection<Strategies>;

  /** strategies with config schema + logic */
  strategies: Strategies;

  /** settings slice schema used by resolveConfig */
  settings: Contract["settings"];

  run: (
    input: Static<Contract["input"]>,
    config: StrategySelection<Strategies>
  ) => Static<Contract["output"]>;

  resolveConfig: (
    config: StrategySelection<Strategies>,
    settings: Static<Contract["settings"]>
  ) => StrategySelection<Strategies>;
}>;

export function createOp<const Contract extends OpContract<any, any, any, any, any, any>>(
  contract: Contract,
  impl: { strategies: StrategiesImplFor<Contract> }
): DomainOp<
  Contract,
  {
    [K in keyof Contract["strategies"] & string]: OpStrategy<
      Contract["strategies"][K]["config"],
      any,
      any,
      any
    >;
  }
> {
  // Implementation sketch:
  // - config schema is union { strategy: Literal(K), config: strategyConfigSchema[K] } over strategies
  // - defaultConfig uses Value.Default on default strategy schema
  // - resolveConfig dispatches to selected strategy’s resolveConfig if present
  // - run dispatches to selected strategy’s run
  throw new Error("spec-only");
}
```

Notes:

* The canonical shape keeps `run(input, config)` pure and independent of settings.
* Only `resolveConfig` sees settings (compile-time only).

---

### 4.5 Domain Routers

```ts
// @swooper/mapgen-core/authoring/domain

import type { TSchema, Static } from "typebox";
import type { DomainSettingsDef } from "../settings.js";
import type { OpContract } from "../op/contract.js";
import type { DomainOp } from "../op/create.js";

export type DomainContract<
  Id extends string,
  SettingsDef extends DomainSettingsDef<Id, any>,
  Ops extends Record<string, OpContract<any, any, any, any, any, any>>,
> = Readonly<{
  id: Id;
  settings: SettingsDef;
  ops: Ops;
}>;

export function defineDomain<
  const Id extends string,
  const SettingsDef extends DomainSettingsDef<Id, any>,
  const Ops extends Record<string, OpContract<any, any, any, any, any, any>>,
>(def: { id: Id; settings: SettingsDef; ops: Ops }): DomainContract<Id, SettingsDef, Ops> {
  return def;
}

export type DomainModule<
  Contract extends DomainContract<any, any, any>,
  Ops extends Record<string, DomainOp<any, any>>,
> = Readonly<{
  id: Contract["id"];
  settings: Contract["settings"];
  ops: Ops;

  /** Select this domain’s settings from recipe run settings. */
  selectSettings: <TSettings extends { domains: Record<Contract["id"], any> }>(
    settings: TSettings
  ) => ReturnType<Contract["settings"]["selectFrom"]>;

  /**
   * Helper: select the settings slice declared by a particular op (two-step selection):
   * recipe settings -> domain settings -> op settings slice
   */
  selectOpSettings: <
    TSettings extends { domains: Record<Contract["id"], any> },
    TOp extends { settings: TSchema },
  >(
    settings: TSettings,
    op: TOp,
    pick: (domainSettings: ReturnType<Contract["settings"]["selectFrom"]>) => Static<TOp["settings"]>
  ) => Static<TOp["settings"]>;
}>;

export function createDomain<
  const Contract extends DomainContract<any, any, any>,
  const Ops extends Record<string, any>,
>(
  contract: Contract,
  impl: { ops: Ops }
): DomainModule<Contract, Ops> {
  // runtime attaches selectSettings helper (contract.settings.selectFrom)
  // and provides optional helpers
  throw new Error("spec-only");
}
```

Canonical use in steps:

* call `domain.selectSettings(settings)` once
* then compute settings slice per op via op-declared slice selection helper

---

## 5. Canonical Usage Examples

### 5.1 Domain: `ecology/settings.ts`

```ts
// @mapgen/domain/ecology/settings.ts

import { Type, type Static } from "typebox";
import { defineDomainSettings } from "@swooper/mapgen-core/authoring/settings";

export const EcologySettingsSchema = Type.Object(
  {
    // Cross-cutting knobs for ecology domain.
    aridityBias: Type.Number({ default: 0 }),
    temperatureBias: Type.Number({ default: 0 }),
    vegetationDensity: Type.Number({ default: 1 }),
  },
  { additionalProperties: false }
);

export type EcologySettings = Static<typeof EcologySettingsSchema>;

export const ecologySettings = defineDomainSettings({
  id: "ecology",
  schema: EcologySettingsSchema,
});
```

---

### 5.2 Op Contract: `ecology/ops/classify-biomes/contract.ts`

```ts
// @mapgen/domain/ops/ecology/classify-biomes/contract.ts

import { Type } from "typebox";
import { defineOp } from "@swooper/mapgen-core/authoring/op/contract";
import { ecologySettings } from "../../settings.js";

export const ClassifyBiomesInputSchema = Type.Object(
  {
    width: Type.Integer(),
    height: Type.Integer(),
    // ...fields needed for classification (heightfield, climate fields, etc.)
  },
  { additionalProperties: false }
);

export const ClassifyBiomesOutputSchema = Type.Object(
  {
    // e.g. biomeIndexField: Type.Array(Type.Integer())
  },
  { additionalProperties: false }
);

// Strategy config schemas (declared in contract, not duplicated in impl).
const DefaultConfigSchema = Type.Object(
  {
    smoothing: Type.Number({ default: 0.5 }),
  },
  { additionalProperties: false }
);

const NoiseConfigSchema = Type.Object(
  {
    smoothing: Type.Number({ default: 0.5 }),
    noiseScale: Type.Number({ default: 1.0 }),
  },
  { additionalProperties: false }
);

// Op declares the exact settings slice it can see.
const ClassifyBiomesSettingsSchema = ecologySettings
  .pick("aridityBias", "temperatureBias")
  .schema;

export const classifyBiomesContract = defineOp({
  kind: "compute",
  id: "ecology/classifyBiomes",
  input: ClassifyBiomesInputSchema,
  output: ClassifyBiomesOutputSchema,
  settings: ClassifyBiomesSettingsSchema,
  strategyConfig: {
    default: DefaultConfigSchema,
    noise: NoiseConfigSchema,
  },
});
```

---

### 5.3 Strategy Implementations

#### `ecology/ops/classify-biomes/strategies/default.ts`

```ts
import { createStrategy } from "@swooper/mapgen-core/authoring/op/strategy";
import { classifyBiomesContract } from "../contract.js";

export const defaultStrategy = createStrategy(
  classifyBiomesContract.strategies.default,
  {
    resolveConfig: (config, settings) => {
      // settings is typed as { aridityBias: number; temperatureBias: number }
      // config is typed from DefaultConfigSchema
      return {
        ...config,
        smoothing: Math.max(0, Math.min(1, config.smoothing)),
      };
    },

    run: (input, config) => {
      // input typed from ClassifyBiomesInputSchema
      // config typed from DefaultConfigSchema
      // output typed from ClassifyBiomesOutputSchema
      return {
        // biomeIndexField: ...
      };
    },
  }
);
```

#### `ecology/ops/classify-biomes/strategies/noise.ts`

```ts
import { createStrategy } from "@swooper/mapgen-core/authoring/op/strategy";
import { classifyBiomesContract } from "../contract.js";

export const noiseStrategy = createStrategy(
  classifyBiomesContract.strategies.noise,
  {
    resolveConfig: (config, settings) => {
      // settings typed as same slice
      return {
        ...config,
        noiseScale: Math.max(0, config.noiseScale),
      };
    },

    run: (input, config) => {
      return {
        // ...
      };
    },
  }
);
```

---

### 5.4 Op Assembly: `ecology/ops/classify-biomes/index.ts`

```ts
import { createOp } from "@swooper/mapgen-core/authoring/op/create";
import { classifyBiomesContract } from "./contract.js";
import { defaultStrategy } from "./strategies/default.js";
import { noiseStrategy } from "./strategies/noise.js";

export const classifyBiomes = createOp(classifyBiomesContract, {
  strategies: {
    default: defaultStrategy,
    noise: noiseStrategy,
  },
});
```

Inline strategy variant (same primitives, no competing model):

```ts
export const classifyBiomes = createOp(classifyBiomesContract, {
  strategies: {
    default: {
      resolveConfig: (cfg, settings) => cfg,
      run: (input, cfg) => ({ /* ... */ }),
    },
    noise: {
      run: (input, cfg) => ({ /* ... */ }),
    },
  },
});
```

---

### 5.5 Domain Contract Router and Implementation Router

#### `ecology/contract.ts`

```ts
import { defineDomain } from "@swooper/mapgen-core/authoring/domain";
import { ecologySettings } from "./settings.js";
import { classifyBiomesContract } from "./ops/classify-biomes/contract.js";
// ...other op contracts

export const ecologyContract = defineDomain({
  id: "ecology",
  settings: ecologySettings,
  ops: {
    classifyBiomes: classifyBiomesContract,
    // ...
  },
});
```

#### `ecology/index.ts`

```ts
import { createDomain } from "@swooper/mapgen-core/authoring/domain";
import { ecologyContract } from "./contract.js";
import { classifyBiomes } from "./ops/classify-biomes/index.js";
// ...other assembled ops

export const ecology = createDomain(ecologyContract, {
  ops: {
    classifyBiomes,
    // ...
  },
});

export * from "./settings.js";
export * from "./ops/classify-biomes/contract.js"; // optional re-exports for schema references
```

---

### 5.6 Recipe Settings Composition

```ts
// mods/.../recipes/standard/settings.ts

import { Type, type Static } from "typebox";
import { defineRunSettings, GlobalSettingsSchema } from "@swooper/mapgen-core/authoring/settings";
import { ecology } from "@mapgen/domain/ecology";
import { placement } from "@mapgen/domain/placement";

export const StandardRunSettingsSchema = defineRunSettings(
  Type.Object(
    {
      global: GlobalSettingsSchema,
      domains: Type.Object(
        {
          ecology: ecology.settings.schema,
          placement: placement.settings.schema,
        },
        { additionalProperties: false }
      ),

      // optional recipe-local namespace:
      recipe: Type.Optional(
        Type.Object(
          {
            debug: Type.Boolean({ default: false }),
          },
          { additionalProperties: false }
        )
      ),
    },
    { additionalProperties: false }
  )
);

export type StandardRunSettings = Static<typeof StandardRunSettingsSchema>;
```

---

### 5.7 Step: Resolve Config with Proper Settings Slice

Canonical step behavior:

* Step sees full recipe settings
* Step selects domain settings once
* Step passes **op settings slice** to `op.resolveConfig`

```ts
// mods/.../recipes/standard/stages/ecology/steps/biomes/index.ts

import { Type, type Static } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";
import { ecology } from "@mapgen/domain/ecology";
import type { StandardRunSettings } from "../../../settings.js";

const BiomesStepConfigSchema = Type.Object(
  {
    classify: ecology.ops.classifyBiomes.config,
  },
  {
    additionalProperties: false,
    default: {
      classify: ecology.ops.classifyBiomes.defaultConfig,
    },
  }
);

type BiomesStepConfig = Static<typeof BiomesStepConfigSchema>;

export default createStep({
  id: "biomes",
  phase: "ecology",
  schema: BiomesStepConfigSchema,

  resolveConfig: (config: BiomesStepConfig, settings: StandardRunSettings) => {
    const ecoSettings = ecology.selectSettings(settings);

    // Produce the exact settings slice the op is allowed to see.
    // In this spec, the slice is produced via direct picking against ecoSettings
    // (the domain settings contract provides the key list; implementation helper omitted here).
    const classifySettings = {
      aridityBias: ecoSettings.aridityBias,
      temperatureBias: ecoSettings.temperatureBias,
    };

    return {
      ...config,
      classify: ecology.ops.classifyBiomes.resolveConfig(config.classify, classifySettings),
    };
  },

  run: (context, config: BiomesStepConfig) => {
    // build input from context, then:
    // const output = ecology.ops.classifyBiomes.run(input, config.classify);
  },
} as const);
```

Canonical refinement (recommended): provide a generated helper so steps don’t hand-write slices:

```ts
// domain side (authoring SDK can generate this automatically)
const classifySettings = ecology.settings
  .pick("aridityBias", "temperatureBias")
  .pick(ecoSettings);
```

In that model:

* `pick(...)` is declared once in the op contract (or on the domain settings def)
* steps call `pick(ecoSettings)` mechanically

---

### 5.8 Engine Interface Changes Relevant to Authoring

**Engine does not define “the” RunSettings type.**
Instead:

* Recipes define a `SettingsSchema`
* `createRecipe` stores it
* The engine stores settings as opaque payload in the plan

Canonical type signatures:

```ts
// engine/execution-plan.ts
export type ExecutionPlan<TSettings = unknown> = {
  // ...
  settings: TSettings;
  // ...
};

// authoring/recipe.ts
export type RecipeModule<TContext, TConfig, TSettings> = {
  settingsSchema: TSchema; // recipe-provided
  runRequest: (settings: TSettings, config?: TConfig | null) => RunRequest<TSettings, TConfig>;
  compile: (settings: TSettings, config?: TConfig | null) => ExecutionPlan<TSettings>;
  run: (context: TContext, settings: TSettings, config?: TConfig | null) => void;
};
```

---

## 6. Conceptual Reasoning and Design Patterns

### 6.1 Contract‑First Authoring

**Pattern**: contract‑first (API contract decoupled from handler implementation)
Why:

* Stable contracts become the shared dependency surface across domains/recipes/tools
* Implementation can vary, split across files/modules, tested independently
* Supports tooling and composability (router-style aggregation)

### 6.2 Dependency Inversion for Settings

**Pattern**: dependency inversion (high-level policies depend on abstractions, not concretions)
Why:

* Engine does not own domain settings shape
* Domains own their settings, recipes compose, engine transports
* Avoids engine→domain or domain→engine type coupling

### 6.3 Strategy Pattern with Plan‑Truth Selection

**Pattern**: strategy pattern + explicit selection envelope
Why:

* Multi-strategy ops are first-class without ad-hoc conditional logic in steps
* Plan config remains explicit and serializable (`{ strategy, config }`)
* Defaulting and validation are derived from strategy config schemas

### 6.4 Allowed Variations

Allowed:

* Single-file ops (contract + strategies + createOp in one module) using the same primitives
* Multi-file ops (recommended) separating contract and strategies
* Ops with a single strategy (`default` only)
* Ops with many strategies (config envelope union grows mechanically)

Not allowed:

* Ops without strategies
* Strategy implementations without a contract binding (unless explicitly typed and lint-allowed, which is discouraged)
* Domain importing engine runtime settings types

---

## 7. Architecture vs Current Implementation

This section encodes what must change relative to the current codebase.

### 7.1 Settings Boundary Violations Must Be Removed

**Current**: authoring op creation and strategy types import the engine’s `RunSettings` and use it in `resolveConfig`.
Examples include:

* `createOp` imports `RunSettings` from the engine and types its internal dispatcher with it. 
* `DomainOp.resolveConfig` is typed as `(config, settings: RunSettings) => config`. 
* Step and recipe authoring types also depend on `RunSettings` from the engine. 

**Canonical**: engine does not own a universal `RunSettings` type.

* Recipes provide settings schema + settings type.
* Steps receive recipe settings type.
* Ops receive only the *op-declared settings slice* type in `resolveConfig`.

### 7.2 Strategy DX Must Be Fixed Without Adding Competing Patterns

**Current**: strategies are defined as object literals in `createOp`, which enables contextual typing, but out‑of‑line strategy exports lose inference. The current `OpStrategy` type is defined in a way that relies on contextual typing and still imports engine `RunSettings`. 

**Canonical**:

* Strategy logic is authored via `createStrategy(strategyContract, impl)` when exported out‑of‑line.
* Inline strategies are allowed as object literals in `createOp(contract, { strategies: { ... }})`, still contextually typed.
* This is one conceptual model: “strategy implementation bound to a strategy contract”; inline is merely a literal satisfying the same shape.

### 7.3 Ops Must Become Contract‑First

**Current**: op “definition” and “implementation” are intertwined in `createOp({... strategies: { default: { config, run, resolveConfig }}})`. 

**Canonical**:

* Op contract declares schemas and strategy config schemas (no logic).
* Strategy modules declare logic and bind to contract handles.
* `createOp` assembles contract + strategy implementations.

### 7.4 Step Config Normalization Must Pass Slices, Not Full Settings

**Current**: steps commonly call `op.resolveConfig(config, settings)` passing the full engine `RunSettings` object. 

**Canonical**:

* Steps select domain settings once from recipe settings
* Steps pass op’s declared settings slice to `op.resolveConfig`

### 7.5 What Stays Unchanged from the Contract‑First Baseline

Unchanged:

* Ops are still the domain contract: `run(input, config) -> output`
* Steps still own runtime binding (adapter reads/writes, artifacts)
* Op config is still plan‑truth envelope `{ strategy, config }`
* Default config is still derived from default strategy schema defaults
* `resolveConfig` remains compile-time only and per-strategy

Extended:

* Contracts now include a settings slice schema and selection discipline
* Recipes now own settings schema composition and typing
* Engine becomes settings-opaque / settings-generic

---

## 8. Implementation Plan

No shims; goal is a clean, fully migrated end state. The plan is phased to minimize distributed edits by first changing central primitives and then mechanically updating callsites.

### Phase 1 — Introduce Settings Contracts and Generic Engine Settings

**Goal**: remove the engine-owned `RunSettings` type dependency from authoring surfaces by making settings recipe-owned and engine-opaque.

**Changes**

1. Add authoring settings module:

   * `defineDomainSettings`
   * `GlobalSettingsSchema`
   * `defineRunSettings`

2. Update engine plan types:

   * `ExecutionPlan` becomes generic over settings: `ExecutionPlan<TSettings = unknown>`
   * Remove any globally exported RunSettings schema/type from engine as an authoring dependency

3. Update recipe and step authoring types to be generic over settings:

   * `createStep<TContext, TConfig, TSettings>()`
   * `createStage<TContext, TSettings>()`
   * `createRecipe<TContext, TStages, TSettingsSchema>()` derives `TSettings = Static<TSettingsSchema>`

**Where**

* `packages/mapgen-core/src/authoring/*` (step, stage, recipe, settings)
* `packages/mapgen-core/src/engine/*` (execution plan types, compiler)

**Work classification**

* Central type changes: non-mechanical but contained
* Call site fixes: mechanical (TypeScript errors point directly)

**Unlocks**

* Removes `RunSettings` from the type graph so domain work can proceed cleanly.

---

### Phase 2 — Introduce Contract‑First Ops and Strategy Binding

**Goal**: replace current `createOp` “combined definition+implementation” model with contract‑first op declarations and `createStrategy` binding.

**Changes**

1. Add:

   * `defineOp` (contract builder)
   * `createStrategy` (bind impl to contract handle)
   * update `createOp` signature to `createOp(contract, { strategies })`

2. Ensure `createOp` still derives:

   * envelope config schema union
   * `defaultConfig` derived from defaults

3. Update op validation surfaces to remain identical (validate/runValidated behavior).

**Where**

* `packages/mapgen-core/src/authoring/op/*`

**Work classification**

* Central API/type refactor: non-mechanical
* Updating internal tests in mapgen-core: mostly mechanical

**Unlocks**

* Strategy modules can be split out without losing inference.
* Domains can adopt contract-first with minimal per-op boilerplate.

---

### Phase 3 — Migrate One Domain End-to-End (Ecology)

**Goal**: prove the full architecture in a real domain with settings slicing and strategy modules.

**Changes**

1. Add `domain/ecology/settings.ts` with schema and defaults.

2. For each ecology op:

   * Extract config schemas into `ops/<op>/contract.ts`
   * Move strategy logic into `ops/<op>/strategies/*.ts` using `createStrategy`
   * Assemble op in `ops/<op>/index.ts` using `createOp(contract, ...)`

3. Create `domain/ecology/contract.ts` and `domain/ecology/index.ts` routers.

4. Migrate ecology steps in standard recipe:

   * Introduce `recipes/standard/settings.ts` composing global + ecology + other domains
   * Update step `resolveConfig` to slice settings and pass op slices

**Where**

* `mods/mod-swooper-maps/src/domain/ecology/**`
* `mods/mod-swooper-maps/src/recipes/standard/**`

**Work classification**

* Mechanical: file moves, createOp signature updates, replacing `RunSettings` with slices
* Domain-specific: defining the ecology settings schema and deciding which ops depend on which keys

**Acceptance criteria**

* Existing ecology tests still pass (features/biomes/plot-effects tests)
* No domain imports engine runtime settings type
* All strategy modules compile with inferred types (no manual generics)

---

### Phase 4 — Migrate Remaining Domains and Recipes

**Goal**: propagate the pattern broadly and remove any remaining legacy patterns.

**Changes**

* Repeat Phase 3 for other domains:

  * settings contract
  * op contracts
  * strategies
  * domain routers
* Update recipe modules to use `defineRunSettings` and remove remaining engine settings dependencies.

**Work classification**

* Mostly mechanical once patterns exist
* Some domain-specific decisions for settings schema keys

---

### Phase 5 — Delete Legacy Surfaces and Enforce Guardrails

**Goal**: lock the architecture so it cannot regress.

**Changes**

* Remove deprecated exports:

  * engine `RunSettings` type/schema exports
  * old createOp overloads (if any remain)
* Apply lint + grep guardrails (below)
* Add targeted tests to assert settings remain recipe-owned and domain contracts remain clean

---

## 9. Guardrails for the Refactor

### 9.1 ESLint: No Engine Imports in Domain/Authoring Layers

Add `no-restricted-imports` rules:

```js
// .eslintrc.cjs (illustrative)
module.exports = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@mapgen/engine/*", "@swooper/mapgen-core/engine/*"],
            message:
              "Engine runtime must not be imported from domain or authoring layers. Use authoring/settings + recipe settings schemas instead.",
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
                group: ["@mapgen/engine/*", "@swooper/mapgen-core/engine/*"],
                message: "Domains must not import engine modules.",
              },
            ],
          },
        ],
      },
    },
  ],
};
```

### 9.2 Grep Guardrails (Fast, Mechanical)

Extend existing guardrail scripts (there is already a guardrail script in the repo) with additional patterns to prevent settings regression. 

Add checks like:

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1) No engine RunSettings leaking into domain or authoring
rg -n "RunSettings\b" mods/mod-swooper-maps/src/domain packages/mapgen-core/src/authoring && {
  echo "Forbidden: RunSettings referenced in domain/authoring layers."
  exit 1
} || true

# 2) No engine execution-plan imports in domain or authoring
rg -n "@mapgen/engine/execution-plan" mods/mod-swooper-maps/src/domain packages/mapgen-core/src/authoring && {
  echo "Forbidden: engine execution-plan imported in domain/authoring layers."
  exit 1
} || true
```

### 9.3 Type-Level Constraints

Hard constraints to make violations loud:

* Engine does not export a `RunSettings` type for domains/authoring to import.
* `createStep` and `createRecipe` require a settings schema parameter and propagate `TSettings` generics.

Additionally:

* Mark old types as deleted, not deprecated.
* In TS config, prefer `noImplicitAny: true` and disallow implicit `any` escapes.

### 9.4 Targeted Tests (High ROI)

Without building a new test suite, add:

1. **Authoring SDK tests**

   * `defineRunSettings` composition defaults and validation
   * `createOp` config union + defaultConfig derivation unchanged

2. **Type tests**

   * a `*.ts` file compiled in CI that asserts:

     * domain op strategy `resolveConfig` cannot access undeclared settings keys (compile error)
     * step receives full settings type from recipe
     * `createStrategy(contract, impl)` gives typed `input`, `config`, `settings`

3. **Integration smoke tests**

   * Compile + run standard recipe with default settings
   * At least one ecology step test and one placement step test continue to pass

---

## 10. Limitations, Considerations, and Gotchas

### 10.1 Schema Widening Breaks Inference

If authors annotate schemas as `TSchema` (or store them in mutable variables), TypeBox static inference will widen and destroy downstream typing.

Rules of the road:

* Use `const` schemas
* Prefer passing schemas directly into `defineOp`
* Avoid `let schema: TSchema = ...`

### 10.2 Settings Slices Must Remain Structural, Not Dynamic

Slices are intended to be deterministic “picks” of keys.
Avoid dynamic selection (“if debug then include more keys”) because it undermines contract stability and inference.

### 10.3 Cross‑Domain Settings Coupling

An op should not read settings from another domain. If a cross‑cutting knob truly applies across domains:

* Promote it to `global` settings, or
* Define an explicit shared domain that owns that knob

Enforce with lint: op contracts should select settings only from their own domain settings contract.

### 10.4 Strategy Explosion and Envelope Union Size

Many strategies per op increase union size and can slow TS inference. Practical mitigations:

* Keep strategy count small
* Prefer parameterized config within a strategy over many nearly-identical strategies

### 10.5 `resolveConfig` Is Compile‑Time Only

By design, `resolveConfig` must never be relied on at runtime.
Steps must call it during config normalization (plan compilation) and pass normalized config to runtime `run`.

This should be documented and reinforced in contributor docs.

---

## 11. Summary

This architecture establishes a single, canonical model:

* **Contract-first domains**: operations are declared as contracts (schemas + strategy config schemas) and implementations are attached separately.
* **Settings inversion**: domains own their settings, recipes compose run settings, and the engine transports settings as opaque payload.
* **Explicit boundaries**: domains are pure; steps own runtime binding; recipes own composition; engine owns execution.

What it enables:

* Out-of-line strategy modules with full TypeScript inference via `createStrategy(contract, impl)`.
* Stable, reusable domain APIs independent of engine settings types.
* Recipe-specific settings composition without leaking engine concepts into domains.
* Mechanical refactors: central API changes unlock broad callsite updates.

Conceptual difference from the existing architecture:

* Settings are no longer engine-owned (`RunSettings`) and no longer leak into domain/authoring types.
* Ops are no longer defined-and-implemented in one combined structure; they are contract-first with explicit assembly.
* Recipes become the owner of runtime settings schemas, while the engine becomes settings-opaque and reusable across recipes.

---

If you want, I can also provide a “file-by-file migration checklist” for the ecology domain (one op folder at a time) in a format that can be followed mechanically.
