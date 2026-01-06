# SPEC: Step <-> Domain Contracts via Operation Modules

## 0) Vocabulary (Project Terms)

**Rule**
- A small, pure, domain-specific function implementing one heuristic or invariant.
- Rules are internal building blocks; they are not step-callable contracts.
- Rules live under each op in `ops/<op>/rules/**` and are imported directly by strategies.

**Operation** (aka "op")
- A step-callable, schema-backed domain entrypoint: `run(input, config) -> output`.
- Operations are the public contract that steps depend on.
- Operation contracts are contract-first and live in `ops/<op>/contract.ts`.

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
export type MapGenStep<TConfig> = Readonly<{
  id: string;
  phase: GenerationPhase;
  requires: DependencyKey[];
  provides: DependencyKey[];
  schema: TSchema; // step-owned config schema
  resolveConfig?: (config: TConfig, settings: RunSettings) => TConfig;
  run: (context: ExtendedMapContext, config: TConfig) => void;
}>;
```

Notes:
- `schema` is the single step-owned config schema.
- `resolveConfig` is optional and pure; it composes op-level resolution without introducing a second schema.
- Steps can reuse `op.config` and `op.defaultConfig` values directly in their schema definitions.

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
src/domain/<domain>/
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

Rules are op-local by default and live under `ops/<op>/rules/**`.

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
Step.run(ctx, config)  -->      domain/ops/**     -->         engine + artifacts
  build inputs                 op.runValidated(...)           apply + publish
```

Boundary rule:
- Steps own dependency IDs and artifact publication.
- Domain ops do not read/write the artifact store and do not import recipe contracts.

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

Inference rules:
- Do not use type assertions on `defineOpContract` or `createOp` arguments.
- Out-of-line strategies must be authored via `createStrategy(contract, id, impl)`.

---

## 7) End-to-End Example: Plan Vegetation (Multi-Op, Multi-Strategy)

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

src/recipes/standard/stages/ecology/steps/
  plan-vegetation.model.ts
  plan-vegetation.ts
  plan-vegetation.inputs.ts
```

### Tree operation contract

```ts
// src/domain/ecology/ops/plan-tree-vegetation/contract.ts
import { Type } from "typebox";
import { defineOpContract } from "@mapgen/authoring/op/contract.js";

export const planTreeVegetationContract = defineOpContract({
  kind: "plan",
  id: "ecology/planTreeVegetation",
  input: Type.Object(
    {
      width: Type.Number(),
      height: Type.Number(),
      biomeId: Type.Array(Type.Number()),
      moisture: Type.Array(Type.Number()),
      elevation: Type.Array(Type.Number()),
      landMask: Type.Array(Type.Number()),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      placements: Type.Array(
        Type.Object(
          {
            x: Type.Number(),
            y: Type.Number(),
            density: Type.Number(),
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
        density: Type.Number({ default: 0.6 }),
      },
      { additionalProperties: false, default: {} }
    ),
    clustered: Type.Object(
      {
        density: Type.Number({ default: 0.75 }),
        clusterRadius: Type.Number({ default: 5 }),
      },
      { additionalProperties: false, default: {} }
    ),
  },
});
```

### Tree rules

```ts
// src/domain/ecology/ops/plan-tree-vegetation/rules/normalize.ts
export type TreeConfig = { density: number };

export function normalizeTreeConfig(config: TreeConfig): TreeConfig {
  return {
    ...config,
    density: Math.max(0, Math.min(1, config.density)),
  };
}
```

```ts
// src/domain/ecology/ops/plan-tree-vegetation/rules/placements.ts
import type { Static } from "typebox";
import { planTreeVegetationContract } from "../contract.js";

export type TreeInput = Static<typeof planTreeVegetationContract.input>;
export type TreeConfig = Static<typeof planTreeVegetationContract.strategies.default>;

export function planTreePlacements(input: TreeInput, config: TreeConfig) {
  void input;
  return [{ x: 0, y: 0, density: config.density }];
}
```

### Tree strategies

```ts
// src/domain/ecology/ops/plan-tree-vegetation/strategies/default.ts
import { createStrategy } from "@mapgen/authoring/op/strategy.js";
import { planTreeVegetationContract } from "../contract.js";
import { normalizeTreeConfig } from "../rules/normalize.js";
import { planTreePlacements } from "../rules/placements.js";

export const planTreeVegetationDefault = createStrategy(
  planTreeVegetationContract,
  "default",
  {
    resolveConfig: (config) => normalizeTreeConfig(config),
    run: (input, config) => ({
      placements: planTreePlacements(input, config),
    }),
  }
);
```

```ts
// src/domain/ecology/ops/plan-tree-vegetation/strategies/clustered.ts
import { createStrategy } from "@mapgen/authoring/op/strategy.js";
import { planTreeVegetationContract } from "../contract.js";
import { normalizeTreeConfig } from "../rules/normalize.js";
import { planTreePlacements } from "../rules/placements.js";

export const planTreeVegetationClustered = createStrategy(
  planTreeVegetationContract,
  "clustered",
  {
    resolveConfig: (config) => normalizeTreeConfig(config),
    run: (input, config) => ({
      placements: planTreePlacements(input, { density: config.density }),
    }),
  }
);
```

### Tree op entry

```ts
// src/domain/ecology/ops/plan-tree-vegetation/index.ts
import { createOp } from "@mapgen/authoring/op/create.js";
import { planTreeVegetationContract } from "./contract.js";
import { planTreeVegetationDefault } from "./strategies/default.js";
import { planTreeVegetationClustered } from "./strategies/clustered.js";

export const planTreeVegetation = createOp(planTreeVegetationContract, {
  strategies: {
    default: planTreeVegetationDefault,
    clustered: planTreeVegetationClustered,
  },
});
```

### Shrub op entry (short form)

```ts
// src/domain/ecology/ops/plan-shrub-vegetation/index.ts
import { createOp } from "@mapgen/authoring/op/create.js";
import { planShrubVegetationContract } from "./contract.js";
import { planShrubVegetationDefault } from "./strategies/default.js";
import { planShrubVegetationArid } from "./strategies/arid.js";

export const planShrubVegetation = createOp(planShrubVegetationContract, {
  strategies: {
    default: planShrubVegetationDefault,
    arid: planShrubVegetationArid,
  },
});
```

### Step orchestration

```ts
// src/recipes/standard/stages/ecology/steps/plan-vegetation.model.ts
import { Type } from "typebox";

import { ecology } from "@mapgen/domain/ecology/index.js";

export const PlanVegetationStepSchema = Type.Object(
  {
    trees: ecology.ops.planTreeVegetation.config,
    shrubs: ecology.ops.planShrubVegetation.config,
    densityBias: Type.Number({ default: 0 }),
  },
  { additionalProperties: false, default: {} }
);

export type PlanVegetationStepConfig = {
  trees: typeof ecology.ops.planTreeVegetation.defaultConfig;
  shrubs: typeof ecology.ops.planShrubVegetation.defaultConfig;
  densityBias: number;
};
```

```ts
// src/recipes/standard/stages/ecology/steps/plan-vegetation.ts
import { createStep } from "@mapgen/authoring/step.js";
import type { RunSettings } from "@mapgen/engine/execution-plan.js";
import type { ExtendedMapContext } from "@mapgen/core/context.js";

import { ecology } from "@mapgen/domain/ecology/index.js";
import { buildVegetationInput } from "./plan-vegetation.inputs.js";
import { PlanVegetationStepSchema, type PlanVegetationStepConfig } from "./plan-vegetation.model.js";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export default createStep({
  id: "plan-vegetation",
  phase: "ecology",
  requires: ["artifact:climateField@v1"],
  provides: ["artifact:ecology.vegetation-plan@v1"],
  schema: PlanVegetationStepSchema,
  resolveConfig: (config: PlanVegetationStepConfig, settings: RunSettings) => {
    const bias = clamp01(config.densityBias);
    return {
      densityBias: bias,
      trees: ecology.ops.planTreeVegetation.resolveConfig(config.trees, settings),
      shrubs: ecology.ops.planShrubVegetation.resolveConfig(config.shrubs, settings),
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

---

## 8) Config Resolution and Defaults

- Schema defaults are applied via the existing plan compilation pipeline.
- `step.resolveConfig` is optional; it may compose op-level resolution via `op.resolveConfig`.
- `op.resolveConfig` is a per-strategy hook and must return a value that validates against the op config schema.
- No secondary config schema exists; the step schema remains the single source of truth.

---

## 9) Requirements (Hard Rules)

- **R-001: Operations are contract-first.** All ops define `contract.ts` and are created via `createOp(contract, { strategies })`.
- **R-002: Strategies are out-of-line.** Strategy modules use `createStrategy(contract, id, impl)`.
- **R-003: Strategy selection is explicit.** Op config is always `{ strategy, config }`.
- **R-004: Steps do not bind ops.** Steps orchestrate ops by calling them, without declaring op graphs or bindings.
- **R-005: Rules are op-local.** Rules live under `ops/<op>/rules/**` and are not imported by steps.

---
