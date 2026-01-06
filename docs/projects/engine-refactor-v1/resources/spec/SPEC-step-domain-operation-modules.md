# SPEC: Step <-> Domain Contracts via Operation Modules

## 0) Vocabulary (Project Terms)

**Rule**
- A small, pure, domain-specific function implementing one heuristic or invariant.
- Rules are internal building blocks; they are not step-callable contracts.
- Rules live under each op in `domain/<domain>/ops/<op>/rules/**` and are imported directly by strategies.

**Operation** (aka "op")
- A step-callable, schema-backed domain entrypoint: `run(input, config) -> output`.
- Operations are the public contract that steps depend on.
- Operation contracts are contract-first and live in `domain/<domain>/ops/<op>/contract.ts`.

**Strategy**
- A swappable implementation of an operation that preserves the operation's input/output contract.
- Strategies are internal by default; steps select a strategy via config, not by importing strategy modules.
- Strategies may have strategy-specific config schemas.

**Operation module**
- A directory under `domain/<domain>/ops/<op>/` that exports exactly one operation.
- Canonical files: `contract.ts`, `strategies/**`, `rules/**`, `index.ts`.

**Step**
- The smallest executable unit in a recipe graph.
- Steps orchestrate runtime context and domain ops using validated values.
- Steps do not declare or own op graphs, strategy bindings, or op-level wiring.

**DependencyKey**
- The string identifier a step declares in `requires` / `provides` (prefixed by kind: `artifact:` / `field:` / `effect:`).

---

## 1) Problem

Map generation content needs a clean boundary between:

- runtime orchestration (engine/adapter calls, artifact I/O, ordering), and
- domain logic (deterministic computation over typed inputs with typed configuration).

Without an explicit contract, step code accumulates domain rules, configuration schemas drift away from logic, and domain logic grows runtime dependencies.

This spec defines the canonical model for how steps and domains interact:

- Steps remain the unit of execution in recipes.
- Domains expose a predictable authoring surface composed of operation modules.
- Steps wire runtime inputs, call operations, and publish results.

---

## 2) Step System (Recipe v2 + Step Registry)

### Responsibilities

A **step** is responsible for:

- **Orchestration:** read runtime state, validate step config, build op inputs, call ops, apply results, publish artifacts.
- **Ordering:** declare `requires` / `provides` for recipe compilation and execution gating.

### What steps do not own

- domain rules and heuristics,
- strategy implementations,
- op binding graphs or op-level wiring DSLs.

### Step contract (canonical)

```ts
export type MapGenStepContract<TSchema extends TSchema> = Readonly<{
  id: string;
  phase: GenerationPhase;
  requires: DependencyKey[];
  provides: DependencyKey[];
  schema: TSchema; // step-owned config schema
}>;
```

Notes:
- `schema` is the single step-owned config schema.
- `resolveConfig` and `run` are implementation-only and attached via `createStepFor<TContext>()`.
- Steps can reuse `op.config` and `op.defaultConfig` values directly in their schema definitions.

Step authoring surface:
- `defineStepContract({ ... })` in `steps/<step>/contract.ts` defines the contract metadata.
- `createStepFor<TContext>()` is bound once (e.g., `src/authoring/steps.ts`) and used by step implementations.
- `createStep(contract, { resolveConfig?, run })` attaches implementation to the contract and returns the runtime step.

---

## 3) Domain Architecture

### What a domain is

A **domain** is a cohesive unit of content logic implemented as pure TypeScript modules.

Domains are:
- deterministic and testable,
- recipe-independent,
- contract-first (ops own their schemas).

### Canonical domain layout

```txt
src/domain/
  <domain>/
    index.ts
  ops/
    <domain>/
      <op-slug>/
        contract.ts
        rules/
          <rule>.ts
        strategies/
          default.ts
          <strategy>.ts
        index.ts
```

Rules are op-local by default and live under `domain/<domain>/ops/<op>/rules/**`.

Import rules:
- Use `@mapgen/domain/<domain>/ops/<op>` or `@mapgen/domain/<domain>` for cross-module imports.
- Use `@mapgen/authoring/steps` for bound step factories (no relative path churn).
- Keep relative imports inside a single op module (e.g., `./rules/...`, `./strategies/...`).

---

## 4) Operations and Strategies (Contract-First)

### Operation contract

Each op defines a contract in `contract.ts` using `defineOpContract`:

- `kind` (semantic intent; see ADR-ER1-034)
- `id` (stable string)
- `input` (TypeBox schema)
- `output` (TypeBox schema)
- `strategies` (TypeBox schemas keyed by strategy id, must include `default`)

### Strategy implementations

Each strategy implementation is authored out of line using `createStrategy(contract, id, impl)`:

- `config` schema is declared in the contract (not the strategy module)
- strategy module supplies `run` and optional `resolveConfig`

### Runtime op construction

Each op module exports the runtime op via:

```ts
export const planTreeVegetation = createOp(contract, {
  strategies: {
    default: defaultStrategy,
    clustered: clusteredStrategy,
  },
});
```

`createOp` derives:
- `op.config`: union schema of `{ strategy, config }` envelopes
- `op.defaultConfig`: default strategy envelope
- `op.resolveConfig`: strategy-aware resolver (compile-time only)
- `op.runValidated`: input/config validation + execution

### Strategy selection shape (canonical)

All ops are strategy-backed and must declare a `default` strategy.

The config shape is always:

```ts
{ strategy: "<strategyId>", config: <strategyConfig> }
```

This is local to the op. Steps may reuse `op.config` and `op.defaultConfig` directly.

---

## 5) Step <-> Domain Interaction Model

Steps and domains interact as a clean boundary:

1. **Build Inputs (step):** adapt runtime context into typed inputs.
2. **Compute (domain op):** run pure op logic using typed inputs + config.
3. **Apply/Publish (step):** apply results to runtime and publish artifacts.

```
(runtime)                       (pure)                        (runtime)
Step.run(ctx, config)  -->      domain/**     -->         engine + artifacts
  build inputs                 op.runValidated(...)           apply + publish
```

Boundary rule:
- Steps own dependency IDs and artifact publication.
- Domain ops do not read/ops/write the artifact store and do not import recipe contracts.

---

## 6) Authoring API (Core SDK)

Canonical authoring surface (Core SDK):

- `packages/mapgen-core/src/authoring/op/contract.ts`
  - `defineOpContract(...)`
- `packages/mapgen-core/src/authoring/op/strategy.ts`
  - `createStrategy(...)`
  - `StrategySelection<...>`
- `packages/mapgen-core/src/authoring/op/create.ts`
  - `createOp(contract, { strategies, customValidate? })`
- `packages/mapgen-core/src/authoring/step/contract.ts`
  - `defineStepContract(...)`
- `packages/mapgen-core/src/authoring/step/create.ts`
  - `createStep(contract, { resolveConfig?, run })`
  - `createStepFor<TContext>()`

Inference rules:
- Do not use type assertions on `defineOpContract` or `createOp` arguments.
- Out-of-line strategies must be authored via `createStrategy(contract, id, impl)`.

---

## 7) End-to-End Example: Plot Vegetation (Multi-Op, Multi-Strategy)

### Example layout

```txt
src/domain/ecology/ops/plan-tree-vegetation/
  contract.ts
  rules/
    normalize.ts
    placements.ts
  strategies/
    default.ts
    clustered.ts
  index.ts

src/domain/ecology/ops/plan-shrub-vegetation/
  contract.ts
  rules/
    normalize.ts
    placements.ts
  strategies/
    default.ts
    arid.ts
  index.ts

src/recipes/standard/stages/ecology/steps/plot-vegetation/
  contract.ts
  lib/
    vegetation.ts
  index.ts
```

### Tree operation contract

```ts
// src/domain/ecology/ops/plan-tree-vegetation/contract.ts
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

### Tree rules

```ts
// src/domain/ecology/ops/plan-tree-vegetation/rules/normalize.ts
import { clamp01 } from "@swooper/mapgen-core";
import type { TreeDefaultConfig, TreeClusteredConfig } from "../contract.js";

export type TreeConfig = TreeDefaultConfig | TreeClusteredConfig;

export function normalizeTreeConfig(config: TreeConfig): TreeConfig {
  return {
    ...config,
    density: clamp01(config.density),
    minMoisture: clamp01(config.minMoisture),
  };
}
```

```ts
// src/domain/ecology/ops/plan-tree-vegetation/rules/placements.ts
import { clamp01 } from "@swooper/mapgen-core";
import type { PlanTreeVegetationInput, TreeClusteredConfig } from "../contract.js";
import { type TreeConfig } from "./normalize.js";

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

### Tree strategies

```ts
// src/domain/ecology/ops/plan-tree-vegetation/strategies/default.ts
import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanTreeVegetationContract } from "../contract.js";
import { buildTreePlacements } from "../rules/placements.js";
import { normalizeTreeConfig } from "../rules/normalize.js";

export const defaultStrategy = createStrategy(PlanTreeVegetationContract, "default", {
  resolveConfig: (config) => normalizeTreeConfig(config),
  run: (input, config) => ({ placements: buildTreePlacements(input, config) }),
});
```

```ts
// src/domain/ecology/ops/plan-tree-vegetation/strategies/clustered.ts
import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanTreeVegetationContract } from "../contract.js";
import { buildTreePlacements } from "../rules/placements.js";
import { normalizeTreeConfig } from "../rules/normalize.js";

export const clusteredStrategy = createStrategy(PlanTreeVegetationContract, "clustered", {
  resolveConfig: (config) => normalizeTreeConfig(config),
  run: (input, config) => ({ placements: buildTreePlacements(input, config) }),
});
```

### Tree op entry

```ts
// src/domain/ecology/ops/plan-tree-vegetation/index.ts
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

### Shrub op entry (short form)

```ts
// src/domain/ecology/ops/plan-shrub-vegetation/index.ts
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

### Step orchestration

```ts
// src/authoring/steps.ts
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStepFor } from "@swooper/mapgen-core/authoring";

export const createStep = createStepFor<ExtendedMapContext>();
```

```ts
// src/recipes/standard/stages/ecology/steps/plot-vegetation/contract.ts
import { Type, type Static } from "typebox";
import { defineStepContract } from "@swooper/mapgen-core/authoring";
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

```ts
// src/recipes/standard/stages/ecology/steps/plot-vegetation/lib/vegetation.ts
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

```ts
// src/recipes/standard/stages/ecology/steps/plot-vegetation/index.ts
import { clamp01 } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import * as ecology from "@mapgen/domain/ecology";

import { PlotVegetationStepContract } from "./contract.js";
import { applyDensityBias, buildVegetationInput } from "./lib/vegetation.js";

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

---

## 8) Config Resolution and Defaults

- Schema defaults are applied via the existing plan compilation pipeline.
- `resolveConfig` is optional on the **step implementation** (attached via `createStep`), not the contract.
- `resolveConfig` may compose op-level resolution via `op.resolveConfig`.
- `op.resolveConfig` is a per-strategy hook and must return a value that validates against the op config schema.
- No secondary config schema exists; the step schema remains the single source of truth.

---

## 9) Requirements (Hard Rules)

- **R-001: Operations are contract-first.** All ops define `contract.ts` and are created via `createOp(contract, { strategies })`.
- **R-002: Strategies are out-of-line.** Strategy modules use `createStrategy(contract, id, impl)`.
- **R-003: Strategy selection is explicit.** Op config is always `{ strategy, config }`.
- **R-004: Steps do not bind ops.** Steps orchestrate ops by calling them, without declaring op graphs or bindings.
- **R-005: Rules are op-local.** Rules live under `domain/<domain>/ops/<op>/rules/**` and are not imported by steps.
- **R-006: Shared utilities live in core.** Cross-cutting helpers (math, noise, RNG, grid) must be imported from the core SDK; add them there if broadly useful.

---
