# SPIKE: Step ↔ Domain Contracts via Operation Modules

## 0) Vocabulary (Project Terms)

These terms are used throughout this document with specific meanings. Several are intentionally more explicit than legacy wording (notably “tag”).

**Rule**
- A small, pure, domain-specific function implementing one heuristic/invariant (e.g., “apply coastal bonus”, “choose latitude band rainfall”).
- Rules are internal building blocks; they are not step-callable contracts and should not reach into runtime context.

**Operation** (aka “op”)
- A step-callable, schema-backed domain entrypoint: `run(inputs, config) -> result`.
- Operations are the public contract that steps depend on; rules are implementation detail beneath operations.

**Strategy** (formerly “variant”)
- A swappable implementation of an operation that preserves the operation’s input/output contract.
- Strategies are internal by default: steps select a strategy via config, but do not import strategy modules directly.
- Strategies may have **strategy-specific config** (common when different algorithms need different knobs).

**Operation module**
- A module that exports exactly one operation (usually as the default export), enabling “one op per module” organization and easy `index.ts` aggregation into `ops.*`.
- Most operation modules are single files; large operations can be promoted to a directory with `index.ts` as the module entrypoint.

**Artifact**
- A domain-defined data product published by steps for downstream consumption (e.g., a climate field, a corridor snapshot, a placement input bundle).
- Important nuance: an `artifact:*` dependency indicates a *data-product dependency*, not necessarily “a value stored in `ctx.artifacts`”. Some artifacts are satisfied via other runtime state (e.g., overlay state) and a custom `satisfies(...)` check.

**DependencyKey** (formerly “DependencyTag”)
- The **string identifier** a step declares in `requires` / `provides` (must be prefixed by kind: `artifact:` / `field:` / `effect:`).
- Example: `artifact:climateField`, `field:rainfall`, `effect:engine.riversModeled`.

**DependencyDefinition / DependencyContract** (formerly “DependencyTagDefinition”)
- Metadata and (optional) runtime enforcement for a `DependencyKey`: `{ id, kind, satisfies? , owner? , demo? }`.
- Stored in a registry and used to validate keys and (optionally) determine whether a runtime state satisfies a dependency.

**Registry** (`TagRegistry`, rename TBD)
- The container that stores `DependencyDefinition`s and supports validation and satisfaction checks.
- Naming is TBD: we intend to retire “tag” as the primary term for pipeline dependencies; `DependencyRegistry` is the likely replacement.

**Key** (generic term; avoid when possible)
- “Key” is overloaded. Prefer the specific term (`DependencyKey`, `Artifact key`, `Overlay key`, etc.) when writing contracts.

**Tag** (overloaded; avoid for pipeline dependencies)
- “Tag” is not the primary term for pipeline dependencies in this model (use `DependencyKey`).
- It may still refer to unrelated concepts:
  - **Civ7 plot tags**: numeric engine-level tile tags (`PLOT_TAG`, `adapter.getPlotTagId(...)`).
  - **Story “tagging”**: domain-level overlay classification (not a pipeline dependency system).

## 1) Problem

Map generation content needs a clean boundary between:

- **runtime orchestration** (engine/adapter calls, artifact I/O, ordering), and
- **domain logic** (deterministic computation over typed inputs with typed configuration).

Without an explicit contract, step code tends to accumulate domain rules, domains tend to reach into runtime context, configuration schemas drift away from the logic that uses them, and authoring new domains becomes inconsistent and harder to test.

This document defines a canonical model for **how steps and domains interact**:

- Steps remain the unit of execution in recipes/stages.
- Domains expose a small, predictable authoring surface composed of **operation modules**.
- Steps wire runtime → domain inputs, call operations, and publish/apply results.

## 2) Step System (Recipe → Stage → Step)

### Responsibilities

A **step** is the smallest executable unit in a recipe graph. Its responsibilities are:

- **Orchestration (boundary work):**
  - read runtime state (adapter, context buffers/fields),
  - read upstream artifacts/fields required by this step,
  - validate/configure execution from user-provided config (schema-backed),
  - call into domain logic with domain-shaped inputs,
  - apply results back into runtime (engine mutations, buffer writes),
  - publish artifacts/fields for downstream steps.
- **Ordering (graph contract):**
  - declare `requires`/`provides` so the recipe compiler can enforce correctness.

### What steps intentionally do *not* own

- domain rules and heuristics (those belong in domains),
- cross-step global configuration registries,
- ad-hoc “grab bag” utilities (shared utilities belong in shared libs).

## 3) Domain Architecture

### What a domain is

A **domain** is a cohesive unit of content logic (hydrology, morphology, ecology, narrative, placement, etc.) implemented as **pure TypeScript modules**.

Domains are built to be:

- **testable**: deterministic computation over plain inputs,
- **reusable**: can be invoked from any step that can supply the required inputs,
- **co-located**: schemas, typed outputs (“artifacts”), and logic live together under the domain directory.

### What a domain contains (canonical structure)

A domain is organized as a small module with an explicit public surface:

- `index.ts` aggregates exports (usually `ops`),
- `ops/**` contains step-callable operation modules,
- `rules/**` contains pure building blocks used by operations/strategies (never step-callable),
- optional `artifacts.ts` exports artifact shapes (schemas/types) and suggested names (keys are still step/recipe-owned).

Canonical on-disk layout:

```txt
src/domain/<area>/<domain>/
  index.ts
  artifacts.ts                 # optional: shapes only (keys are recipe-owned)
  ops/
    <op>.ts                    # small op: one file
    <op>/index.ts              # large op: promote to a folder
    <op>/strategies/*.ts       # optional: extracted strategies (typically the default)
    <op>/rules/*.ts            # optional: op-local rules
  rules/*.ts                   # optional: cross-op rules
```

Notes:
- The unit of organization is an **operation module** (“one op per module”). Most ops can be single-file modules; complex ops can be promoted to a directory with `index.ts` as the op module.
- Strategies are typically **extracted into their own modules** under `strategies/` because they contain real algorithmic code. Very small strategies can be inlined, but the canonical authoring pattern prefers separate files.

### Operations (the step-callable contract)

An **operation** (aka “op”) is the stable unit that steps depend on. It:

- has a **kind** (`plan`, `compute`, `score`, `select`) for shared mental model,
- owns its `input`, `config`, and `output` schemas (per-operation, not per-domain),
- exports a pure `run(input, config) -> output`.

### Strategies (optional, internal)

When an operation can be implemented in multiple interchangeable ways, we model that as **strategies** under the operation module:

- each strategy preserves the same **input/output** contract,
- each strategy may have its own config schema,
- the operation selects a strategy via config,
- steps do **not** import strategies directly; they only pass config to the op.

#### Config semantics with strategies

What must be shared vs what can vary:

- **Required to be shared:** operation **input** and **output** schemas (the contract steps depend on).
- **Allowed to vary:** the strategy’s algorithm and its **strategy-specific config**.

How config behaves by case:

- **Multiple strategies (n>1):** the operation’s `config` is a **strategy selection** wrapper (conceptually: `{ strategy: "...", config: {...} }`). Each strategy owns its own `config` schema. The operation dispatches to the selected strategy.
- **Single strategy (n=1):** you can still model a strategy (useful if you expect future swap-outs). Set a `defaultStrategy` so callers can omit `strategy` and just provide `config`. If you *don’t* need a swappable implementation, skip the strategy layer and model the op as a single implementation with a plain op-level `config`.
- **No strategies:** the operation itself is the implementation; its `config` is the only config.

Compile-time behavior (edge cases):

- **Op with no strategies:** `op.run(input, config)` expects the op’s plain config type; passing `{ strategy: "...", config: {...} }` is a TypeScript error (and would also fail runtime schema validation if `additionalProperties: false`).
- **Op with exactly one strategy:** `op.run(input, config)` expects that strategy’s config selection shape. If `defaultStrategy` is set to the only strategy, `strategy` becomes optional; if it is not set, `strategy` is required (but can only be that one literal).

If you need both **shared op-level config** and **strategy-specific config**, there are two common options:

- **Option A (explicit nesting):** `config = { shared: <SharedConfig>, strategy: <StrategySelection> }`.
- **Option B (schema composition):** each strategy’s config schema is `SharedConfig ∩ StrategyConfig` (TypeBox `Type.Intersect([...])`).

This keeps step imports small and keeps the op’s public contract stable even if internal implementations evolve.

#### Step config ergonomics: ops export canonical `config` + `defaultConfig`

Steps should not have to re-author (or re-wrap) the canonical operation config shape. Each op exports:

- `op.config`: the canonical TypeBox schema for that op’s config (including strategy selection shape when relevant)
- `op.defaultConfig`: the canonical default value for that config (computed from schema defaults)

Steps can then assemble their own step schema defaults without manually re-creating wrapper objects like `{ config: {} }` for strategy-backed ops.

### Rules (optional, internal building blocks)

**Rules** are small pure functions used to decompose complexity:

- score terms (“plate boundary proximity contributes +X”),
- constraints/predicates (“reject if too close to existing volcano”),
- tiny transformations (“clamp rainfall to 0…N”).

Rules may live:
- in `domain/rules/**` when shared across operations, or
- in `domain/ops/<op>/rules/**` when specific to one operation.

Rules are internal by default: they should not leak into step-level imports or runtime concerns.

### Shared utilities vs domain logic

- **generic utilities** (math, rng helpers, array ops) belong in shared libraries (e.g. `packages/mapgen-core/src/lib/**`).
- **domain-specific semantics** belong in the domain (e.g. “what constitutes a convergent boundary hotspot”).
- **runtime adapter helpers** (mapping symbolic kinds → engine IDs, applying placements to the engine) belong in the step (or step-local libs).

### Step ↔ domain interaction model (3 phases)

Steps and domains interact as a simple boundary:

1. **Build Inputs (step):** adapt runtime (adapter + artifacts/fields) into plain, typed inputs.
2. **Compute (domain op):** run pure logic using operation config + inputs, returning a typed result.
3. **Apply/Publish (step):** apply results to runtime (engine writes, buffer writes) and publish artifacts/fields.

An “apply” phase is not a round-trip back into the domain; it is the step using the domain’s return value to mutate runtime.

```
          (runtime)                          (pure)                           (runtime)
┌─────────────────────────┐        ┌──────────────────────┐        ┌─────────────────────────┐
│ Step.run(ctx, config)   │        │ domain/ops/**        │        │ engine + artifacts      │
│                         │        │                      │        │                         │
│ 1) build inputs         │  ───▶  │ op.run(inputs,cfg)   │  ───▶  │ 3) apply + publish      │
│    from ctx+adapter     │        │ => result            │        │                         │
└─────────────────────────┘        └──────────────────────┘        └─────────────────────────┘
```

### Authoring primitives (minimal helpers, not a framework)

Operations are plain exports, but a tiny helper improves inference and standardizes shape.

```ts
// packages/mapgen-core/src/authoring/op.ts
import { Type, type Static, type TSchema } from "typebox";

export type DomainOpKind = "plan" | "compute" | "score" | "select";

export type OpStrategy<ConfigSchema extends TSchema, Input, Output> = Readonly<{
  config: ConfigSchema;
  run: (input: Input, config: Static<ConfigSchema>) => Output;
}>;

export function createStrategy<ConfigSchema extends TSchema, Input, Output>(
  strategy: OpStrategy<ConfigSchema, Input, Output>
): OpStrategy<ConfigSchema, Input, Output> {
  return strategy;
}

// createOp supports two shapes:
// 1) single implementation: provide { config, run }
export function createOp<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  ConfigSchema extends TSchema
>(op: {
  kind: DomainOpKind;
  id: string;
  input: InputSchema;
  output: OutputSchema;
  config: ConfigSchema;
  run: (input: Static<InputSchema>, config: Static<ConfigSchema>) => Static<OutputSchema>;
}): unknown;

// 2) strategies: provide { strategies, defaultStrategy? }
// - each strategy owns its own config schema
// - createOp derives an operation `config` schema and dispatches to the selected strategy at runtime
export function createOp<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Strategies extends Record<string, OpStrategy<TSchema, Static<InputSchema>, Static<OutputSchema>>>
>(op: {
  kind: DomainOpKind;
  id: string;
  input: InputSchema;
  output: OutputSchema;
  strategies: Strategies;
  defaultStrategy?: keyof Strategies & string;
}): unknown;
```

Recommended step-side import pattern:

```ts
import * as volcanoes from "@mapgen/domain/morphology/volcanoes";

const plan = volcanoes.ops.planVolcanoes.run(inputs, config.planVolcanoes);
```

### Step structure / step-local helpers (TBD)

Steps are the runtime boundary, so they often need a small amount of step-local “apply” logic. Two plausible layouts:

**Option A: directory step (index + helpers)**

```txt
src/recipes/<recipe>/stages/<stage>/steps/volcanoes/
  index.ts          # default export createStep(...)
  apply.ts          # step-local helper(s) with adapter/engine calls
  inputs.ts         # step-local input builders (adapter → buffers)
```

**Option B: file step + sibling helper directory**

```txt
src/recipes/<recipe>/stages/<stage>/steps/
  volcanoes.ts
  volcanoes/
    apply.ts
    inputs.ts
```

We haven’t locked this down yet. Option A reads cleaner (everything for the step is in one folder). Option B keeps the existing “step is a file” convention but can look odd (a file + a same-named folder). Either way, the boundary rule stays the same: adapter/runtime calls live in the step layer, not in the domain.

## 4) End-to-End Example (Volcano)

This example is intentionally “pure-domain + side-effects-in-step”: the domain computes placements and the step applies them to the engine/runtime.

### File layout

```txt
src/domain/morphology/volcanoes/
  index.ts
  artifacts.ts
  ops/
    compute-suitability.ts
    plan-volcanoes/
      index.ts
      strategies/
        plate-aware.ts
        hotspot-clusters.ts
      rules/
        enforce-min-distance.ts
        pick-weighted.ts

src/recipes/standard/stages/morphology-post/steps/volcanoes/
  index.ts
  apply.ts
  inputs.ts
```

### Domain: operation 1 — compute suitability (derived field)

```ts
// src/domain/morphology/volcanoes/ops/compute-suitability.ts
import { Type } from "typebox";
import { createOp } from "@swooper/mapgen-core/authoring";

export default createOp({
  kind: "compute",
  id: "morphology/volcanoes/computeSuitability",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),

      // NOTE: These are typed-array buffers in practice. If we want stricter static typing,
      // we can introduce an opaque schema helper (e.g., `t.uint8Array()`) in authoring.
      isLand: Type.Any(),
      plateBoundaryProximity: Type.Any(),
      elevation: Type.Any(),
    },
    { additionalProperties: false }
  ),
  config: Type.Object(
    {
      wPlateBoundary: Type.Optional(Type.Number({ default: 1.0 })),
      wElevation: Type.Optional(Type.Number({ default: 0.25 })),
    },
    { additionalProperties: false, default: {} }
  ),
  output: Type.Object(
    {
      suitability: Type.Any(),
    },
    { additionalProperties: false }
  ),
  run: (inputs, cfg) => {
    const size = inputs.width * inputs.height;
    const suitability = new Float32Array(size);

    const wPlate = Number.isFinite(cfg.wPlateBoundary) ? cfg.wPlateBoundary! : 1.0;
    const wElev = Number.isFinite(cfg.wElevation) ? cfg.wElevation! : 0.25;

    for (let i = 0; i < size; i++) {
      if (inputs.isLand[i] === 0) {
        suitability[i] = 0;
        continue;
      }

      const plate = inputs.plateBoundaryProximity[i] / 255;
      const elev = Math.max(0, Math.min(1, inputs.elevation[i] / 4000));
      suitability[i] = wPlate * plate + wElev * elev;
    }

    return { suitability };
  },
} as const);
```

### Domain: operation 2 — plan volcano placements (strategies + rules)

This operation has interchangeable strategies. The op stays stable; internal strategies can evolve independently.

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/index.ts
import { Type } from "typebox";
import { createOp } from "@swooper/mapgen-core/authoring";
import plateAware from "./strategies/plate-aware.js";
import hotspotClusters from "./strategies/hotspot-clusters.js";

export default createOp({
  kind: "plan",
  id: "morphology/volcanoes/planVolcanoes",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      suitability: Type.Any(),
      rng01: Type.Any(),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      placements: Type.Array(
        Type.Object(
          {
            x: Type.Integer({ minimum: 0 }),
            y: Type.Integer({ minimum: 0 }),
            intensity: Type.Integer({ minimum: 0 }),
          },
          { additionalProperties: false }
        )
      ),
    },
    { additionalProperties: false }
  ),
  strategies: {
    plateAware,
    hotspotClusters,
  } as const,
  defaultStrategy: "plateAware",
} as const);
```

### Domain: strategies (separate modules with per-strategy config)

Strategies live under `strategies/` so they can be “real code” without bloating the operation module.

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/strategies/plate-aware.ts
import { Type } from "typebox";
import { createStrategy } from "@swooper/mapgen-core/authoring";
import { enforceMinDistance } from "../rules/enforce-min-distance.js";
import { pickWeightedIndex } from "../rules/pick-weighted.js";

export default createStrategy({
  config: Type.Object(
    {
      targetCount: Type.Optional(Type.Integer({ minimum: 0, default: 12 })),
      minDistance: Type.Optional(Type.Integer({ minimum: 0, default: 6 })),
    },
    { additionalProperties: false, default: {} }
  ),
  run: (inputs, cfg) => {
    const target = cfg.targetCount ?? 12;
    const minD = cfg.minDistance ?? 6;

    const width = inputs.width;
    const height = inputs.height;
    const size = width * height;

    const chosen: { x: number; y: number; intensity: number }[] = [];
    const weights = new Float32Array(size);
    for (let i = 0; i < size; i++) weights[i] = inputs.suitability[i];

    while (chosen.length < target) {
      const i = pickWeightedIndex(weights, () => inputs.rng01("volcano.pick"));
      if (i < 0) break;

      const x = i % width;
      const y = (i / width) | 0;

      if (!enforceMinDistance({ width, height }, chosen, { x, y }, minD)) {
        weights[i] = 0;
        continue;
      }

      chosen.push({ x, y, intensity: 1 });
      weights[i] = 0;
    }

    return { placements: chosen };
  },
} as const);
```

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/strategies/hotspot-clusters.ts
import { Type } from "typebox";
import { createStrategy } from "@swooper/mapgen-core/authoring";
import { enforceMinDistance } from "../rules/enforce-min-distance.js";
import { pickWeightedIndex } from "../rules/pick-weighted.js";

export default createStrategy({
  config: Type.Object(
    {
      targetCount: Type.Optional(Type.Integer({ minimum: 0, default: 12 })),
      minDistance: Type.Optional(Type.Integer({ minimum: 0, default: 6 })),
      seedCount: Type.Optional(Type.Integer({ minimum: 1, default: 3 })),
    },
    { additionalProperties: false, default: {} }
  ),
  run: (inputs, cfg) => {
    const target = cfg.targetCount ?? 12;
    const minD = cfg.minDistance ?? 6;

    const width = inputs.width;
    const height = inputs.height;
    const size = width * height;

    const chosen: { x: number; y: number; intensity: number }[] = [];
    const weights = new Float32Array(size);
    for (let i = 0; i < size; i++) weights[i] = inputs.suitability[i];

    const seedCount = Math.min(cfg.seedCount ?? 3, target);
    while (chosen.length < seedCount) {
      const i = pickWeightedIndex(weights, () => inputs.rng01("volcano.seed"));
      if (i < 0) break;

      const x = i % width;
      const y = (i / width) | 0;
      if (!enforceMinDistance({ width, height }, chosen, { x, y }, minD)) {
        weights[i] = 0;
        continue;
      }
      chosen.push({ x, y, intensity: 2 });
      weights[i] = 0;
    }

    while (chosen.length < target) {
      const i = pickWeightedIndex(weights, () => inputs.rng01("volcano.fill"));
      if (i < 0) break;

      const x = i % width;
      const y = (i / width) | 0;
      if (!enforceMinDistance({ width, height }, chosen, { x, y }, minD)) {
        weights[i] = 0;
        continue;
      }

      chosen.push({ x, y, intensity: 1 });
      weights[i] = 0;
    }

    return { placements: chosen };
  },
} as const);
```

### Domain: rules (small, pure building blocks)

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/rules/pick-weighted.ts
export function pickWeightedIndex(
  weights: Float32Array,
  rng01: () => number
): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) sum += Math.max(0, weights[i]);
  if (sum <= 0) return -1;

  let r = Math.max(0, Math.min(0.999999, rng01())) * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return i;
  }

  return weights.length - 1;
}
```

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/rules/enforce-min-distance.ts
export type Dims = { width: number; height: number };
export type Point = { x: number; y: number };

export function enforceMinDistance(
  dims: Dims,
  chosen: Point[],
  candidate: Point,
  minDistance: number
): boolean {
  if (minDistance <= 0) return true;

  for (const p of chosen) {
    const dx = p.x - candidate.x;
    const dy = p.y - candidate.y;
    if (dx * dx + dy * dy < minDistance * minDistance) return false;
  }

  return candidate.x >= 0 && candidate.y >= 0 && candidate.x < dims.width && candidate.y < dims.height;
}
```

### Domain index (public surface)

Steps import the domain module and only see `ops` (not rules/strategies).

```ts
// src/domain/morphology/volcanoes/index.ts
import computeSuitability from "./ops/compute-suitability.js";
import planVolcanoes from "./ops/plan-volcanoes/index.js";

export const ops = {
  computeSuitability,
  planVolcanoes,
} as const;
```

### Step: build inputs → call ops → apply/publish (runtime boundary)

The step owns adapter/engine interaction and artifact publishing. The step never imports domain rules or strategy modules.

```ts
// src/recipes/standard/stages/morphology-post/steps/volcanoes/index.ts
import { Type } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";
import { ctxRandom } from "@swooper/mapgen-core/core/types";
import * as volcanoes from "@mapgen/domain/morphology/volcanoes";
import { buildVolcanoInputs } from "./inputs.js";
import { applyVolcanoPlacements } from "./apply.js";

const StepSchema = Type.Object(
  {
    computeSuitability: volcanoes.ops.computeSuitability.config,
    planVolcanoes: volcanoes.ops.planVolcanoes.config,
  },
  {
    additionalProperties: false,
    default: {
      computeSuitability: volcanoes.ops.computeSuitability.defaultConfig,
      planVolcanoes: volcanoes.ops.planVolcanoes.defaultConfig,
    },
  }
);

type StepConfig = {
  computeSuitability: Parameters<typeof volcanoes.ops.computeSuitability.run>[1];
  planVolcanoes: Parameters<typeof volcanoes.ops.planVolcanoes.run>[1];
};

export default createStep({
  id: "volcanoes",
  phase: "morphology-post",
  requires: ["artifact:plates", "field:elevation"],
  provides: ["artifact:volcanoPlacements", "effect:volcanoesPlaced"],
  schema: StepSchema,
  run: (ctx, cfg: StepConfig) => {
    // 1) Build domain inputs from runtime
    const inputs = buildVolcanoInputs(ctx);

    // 2) Compute + plan (pure domain logic)
    const { suitability } = volcanoes.ops.computeSuitability.run(inputs, cfg.computeSuitability);

    // Two equivalent authoring patterns for strategy-backed ops:
    //
    // 1) Use the default strategy (omit `strategy`):
    //    cfg.planVolcanoes = { config: { targetCount: 12, minDistance: 6 } }
    //
    // 2) Explicitly select a non-default strategy:
    //    cfg.planVolcanoes = { strategy: "hotspotClusters", config: { seedCount: 4, targetCount: 12, minDistance: 6 } }
    //
    // Both are runtime-validated (via `volcanoes.ops.planVolcanoes.config`) and type-checked via `Parameters<...run>[1]`.
    const { placements } = volcanoes.ops.planVolcanoes.run(
      {
        width: inputs.width,
        height: inputs.height,
        suitability,
        rng01: (label) => ctxRandom(ctx, label, 1_000_000) / 1_000_000,
      },
      cfg.planVolcanoes
    );

    // 3) Apply + publish (runtime side effects)
    applyVolcanoPlacements(ctx.adapter, placements);
    ctx.artifacts.set("artifact:volcanoPlacements", { placements });
  },
} as const);
```

```ts
// src/recipes/standard/stages/morphology-post/steps/volcanoes/inputs.ts
export function buildVolcanoInputs(ctx: {
  dimensions: { width: number; height: number };
  adapter: { isWater: (x: number, y: number) => boolean; getElevation: (x: number, y: number) => number };
  artifacts: { get: (key: string) => unknown };
}) {
  const { width, height } = ctx.dimensions;
  const size = width * height;

  const isLand = new Uint8Array(size);
  const elevation = new Int16Array(size);

  // In practice this would come from an artifact produced by plate generation.
  const plateBoundaryProximity = new Uint8Array(size);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      isLand[i] = ctx.adapter.isWater(x, y) ? 0 : 1;
      elevation[i] = ctx.adapter.getElevation(x, y) | 0;
      plateBoundaryProximity[i] = 0;
    }
  }

  return { width, height, isLand, elevation, plateBoundaryProximity };
}
```

```ts
// src/recipes/standard/stages/morphology-post/steps/volcanoes/apply.ts
export type VolcanoPlacement = { x: number; y: number; intensity: number };

export function applyVolcanoPlacements(
  adapter: { setVolcano: (x: number, y: number, intensity: number) => void },
  placements: VolcanoPlacement[]
) {
  for (const p of placements) adapter.setVolcano(p.x, p.y, p.intensity);
}
```

## 5) Recipe Config Requirements (Handoff)

This section is a requirements handoff for the **recipe config** design conversation. It does not propose an implementation.

### Problem we’re solving

We currently have a “map global config” object that is edited in map files and then translated into the pipeline’s real config. This creates problems:

- The map file config is **not the true execution config** (it’s a proxy/translation layer), which makes it harder to reason about what a step actually receives.
- It blocks type-safe authoring for richer step contracts (notably strategy selection with per-strategy config).
- It encourages cross-cutting reads from a shared global config, blurring the boundary between step config and runtime state.

### Capability we want to enable

Mod authors should be able to author recipe configuration **directly in map files** as a TypeScript object, with strong typing derived from the recipe’s steps.

In particular, when a step (or a domain op used by the step) offers strategies, authors should be able to:

- choose a strategy by **string literal name**, and
- have the config type **narrow automatically** to the selected strategy’s config schema (via a discriminated union), and
- continue authoring the rest of the recipe config with type safety.

### High-level requirements for the recipe config system

**R-001: Remove “map global config” authoring**
- There must not be a single monolithic “map global config” object that is translated into recipe config.
- The primary authoring surface is the **composed recipe config** for the selected recipe.

**R-002: Config composes upwards from steps → recipe**
- The recipe-level config shape must be composed from the stages/steps included in the recipe.
- Step config schemas/types are the source of truth for what each step accepts.

**R-003: Strategy selection must be type-safe at authoring time**
- If a step exposes one or more strategies, authors must be able to select a strategy by name.
- Selecting a strategy must narrow the config type to the correct strategy config shape (discriminated union).
- This must work for “authored in TS map file” configs (compile-time type checking), independent of runtime validation.

**R-004: Strategy selection must be runtime-validatable**
- The strategy union config must also exist as a runtime schema so non-TS inputs (serialized config) can be validated/defaulted.
- The runtime schema must reject unknown strategy ids and invalid strategy config shapes.

**R-005: No forced re-authoring of canonical op config wrappers**
- Where steps expose operation config (including strategy selection wrappers), authors should not need to recreate wrapper defaults or schema plumbing by hand.
- Canonical config schemas/defaults should be importable and usable as-is (e.g., operation `config` and `defaultConfig`), even if steps choose to wrap/extend them for additional step-local options.

### Boundary notes / non-goals for this document

- This spike does **not** define the concrete authoring DSL for recipe config (e.g., `defineRecipeConfig(...)`, `satisfies ...`, JSON schema emission, etc.).
- This spike does **not** define whether steps should always expose op configs 1:1 vs wrap them; it only requires that strategy selection remains expressible and type-safe in the recipe-level config shape.
- This spike does **not** address migration from existing overrides/global config usage; it only states the target requirement.

## 6) Open Questions / Design Decisions

Each item below is an intentionally standalone decision packet. The goal is to make the downstream consequences explicit so we can converge without accidental drift.

Conventions for this section:
- Each option calls out whether it introduces a **canonical artifact/API** (a “thing” with structure that exists in the system) vs a **convention/approach** (a way we use existing things).
- If a term is synthesized here (not obviously canonical), it is defined inline in that decision packet before use.

### DD-001: Operation kind semantics (`plan` vs `compute` vs `score` vs `select`)

**Impact / scale:** **Medium**

**System surface / blast radius (components):**
- **Domain operations (`DomainOpKind`)**: the labeled “kind” of an op (the public contract a step calls).
- **Steps**: the runtime orchestrator that validates config, calls ops, and applies/publishes results.
- **Docs/tooling**: any future scaffolding, contract rendering, or authoring UX that depends on “kind” meaning something consistent.

**Question:** Are `DomainOpKind` values strict semantics (a contract we teach and enforce) or just labels for documentation?

**Why it matters / what it affects:** “Kind” is the shared vocabulary that tells authors (and later tooling) how to treat the op’s output. If it is strict, it creates predictable step behavior (“plans are applied”, “compute results are published”) and keeps domain vs step responsibilities crisp. If it is soft, “kind” stops carrying reliable meaning and we drift back into ad-hoc orchestration and inconsistent contracts.

**Options:**
- **A) Strict semantics (preferred):** treat kinds as a contract.
  - `plan`: produces intents/edits/overrides that steps apply.
  - `compute`: produces derived artifacts/fields (no side effects).
  - `score`: produces scores/rankings over candidates.
  - `select`: produces selections/choices from candidates/scores.
- **B) Soft semantics:** kinds are descriptive only; overlap is allowed.
- **C) Fewer kinds:** collapse `score`/`select` (e.g., keep `plan` + `compute` + `score`).

**Recommendation:** Start with **A**, but keep the set small. If `select` doesn’t add real clarity, adopt **C** (collapse into `score`) while keeping the `plan` vs `compute` distinction crisp.

### DD-002: Derived defaults and config normalization (beyond schema defaults)

**Impact / scale:** **Medium**

**System surface / blast radius (components):**
- **Operation config schema (`op.config`) + defaults (`op.defaultConfig`)**: the canonical runtime-validatable contract for op configuration.
- **Steps (config boundary)**: where config is validated/defaulted before calling ops.
- **Ops / step-local helpers**: where derived scaling rules and normalization logic would live if we make them explicit and testable.

**Question:** Beyond plain schema defaults (via `op.config` + `op.defaultConfig`), where do we put “derived defaults” and “normalization” (clamping/rewriting config into canonical form)?

**Why it matters / what it affects:** Schema defaults cover “static” defaults, but mapgen also needs scale-aware behavior and guardrails. The question is where that logic lives so it is visible, deterministic, and testable without smuggling runtime into the domain. The answer affects whether step config remains a truthful “knobs surface” and whether ops consistently see already-normalized values.

**Options:**
- **A) Schema defaults only (baseline):** rely on TypeBox defaults and minimal in-op fallbacks; avoid derived defaults.
- **B) Explicit pure normalizer (escape hatch):** export `normalizeConfig(input, cfg)` (either from the op module or a step-local helper) and call it before `run(...)` (or inside `run(...)`, but keep it pure/testable).
- **C) Derived values inside `run(...)`:** keep config stable; compute derived scalars from `(input, cfg)` within the algorithm.

**Recommendation:** Treat **A** as the default expectation. When derived/defaulting behavior is needed, prefer **B** because it makes scaling/normalization explicit and unit-testable without dragging runtime into the domain.

### DD-003: Operation input shape and schema expressiveness (buffers, views, typed arrays)

**Impact / scale:** **High**

**System surface / blast radius (components):**
- **Step → domain boundary (inputs/outputs)**: how steps package runtime state into op inputs (and how results come back).
- **Runtime performance/memory**: whether we precompute buffers, allocate typed arrays, or rely on callback views.
- **Testing model**: whether ops can be tested with plain data fixtures vs requiring mock runtime readbacks.
- **Runtime validation / docs**: whether TypeBox schemas can represent these inputs meaningfully or degrade to `Type.Any()`.

**Question:** What shapes are allowed for `op.input` / `op.output`, and how hard do we try to represent them in TypeBox schemas (especially for typed arrays)?

**Why it matters / what it affects:** Inputs are the main coupling point between runtime and domain. Buffer-based inputs (typed arrays/POJOs) are deterministic and easy to test, but require step-side extraction/precompute. Callback “views” can reduce boilerplate and memory, but risk domain logic implicitly depending on runtime state in ways that are harder to test and reason about. Separately, TypeBox can’t precisely encode typed-array shapes out of the box, so runtime validation and doc rendering may degrade to `Type.Any()` unless we add helpers.

**Options:**
- **A) Buffers/POJOs only (preferred default):** inputs are plain data (typed arrays, plain objects), no runtime callbacks.
- **B) Allow callback views:** inputs may include readonly functions (e.g., `readElevation(x,y)`), kept pure by convention.
- **C) Two-tier model:** “core” ops take buffers; separate convenience ops accept callback views when memory pressure matters.
- **D) Minimal typed-array schema helpers (TBD):** add tiny helpers so schemas are more informative than `Type.Any()` without introducing a big framework.

**Recommendation:** Default to **A** for step-callable ops (best determinism/testability). If we introduce callbacks, constrain them to tiny, explicitly named readonly interfaces. For schema expressiveness, consider **D** only if we concretely need better runtime validation/docs; keep it minimal.

### DD-004: Artifact keys / dependency keys ownership (domain vs recipe)

**Impact / scale:** **High**

**System surface / blast radius (components):**
- **Recipe compiler / pipeline graph**: the dependency graph is built from `requires`/`provides` keys and enforced for correctness.
- **Steps (publication boundary)**: steps publish artifacts/fields/effects under keys and declare dependencies they need.
- **Domains**: define artifact *shapes* (schemas/types), but should not silently publish or own pipeline wiring by default.
- **Dependency registry**: stores definitions/contracts for dependency keys and optionally enforces satisfaction checks.

**Question:** Who “owns” dependency identifiers (`DependencyKey`s): domains, recipes, or some split?

**Why it matters / what it affects:** Dependency identifiers are the glue of the recipe graph. If keys are invented ad hoc in multiple places, the dependency graph becomes fragile and refactors become painful. This decision also determines how portable a domain is across recipes and how much implicit wiring is hidden behind “magic” keys.

**Options:**
- **A) Recipe-owned keys (preferred):** domains define artifact shapes (schemas/types), recipes (or recipe-level catalogs) define the canonical string keys, and steps publish under recipe-owned keys.
- **B) Domain-owned keys:** domains export canonical keys along with shapes.
- **C) Split by layer:** engine/runner defines some core keys centrally; content domains define their own keys.

**Recommendation:** Prefer **A**: domains own shapes; recipes own dependency identifiers. If a domain needs stable naming, encode it in type/schema metadata (e.g., `kind`/`version`) rather than forcing a global key into every recipe.

### DD-005: Strategy config encoding and ergonomics (wrapper shape, defaults, explicitness)

**Impact / scale:** **High**

**System surface / blast radius (components):**
- **Mod author config surface (TS map files / composed recipe config)**: where authors choose a strategy id and fill in the config shape that should narrow correctly.
- **Operation authoring (`createOp` + strategies)**: how op authors publish a strategy-backed config schema and how defaults are computed.
- **Steps (schema + defaults)**: how step schemas reference `op.config`/`op.defaultConfig` and validate/default strategy selection.
- **Migration/evolution story**: how config shape behaves if an op gains additional strategies over time.

**Decision (locked):** **Option B (default-friendly)** — when an operation declares a `defaultStrategy`, config may omit `strategy` and still be valid, while still allowing explicit override to a non-default strategy.

**Why it matters / what it affects:** This is the primary authoring surface mod authors will touch. It needs to (1) remain readable when the common/default strategy is used, and (2) still enable type-safe explicit strategy overrides with config narrowing.

**Options:**
- **A) Always explicit:** always require `{ strategy, config }` even if a default exists.
- **B) Default-friendly (current pattern):** allow omitting `strategy` when a default strategy exists, while still permitting explicit override.
- **C) Flatten for `n=1`:** if there is only one strategy, use just that config object; only multi-strategy ops use `{ strategy, config }`.

**Type-safety confirmation (authoring / autocomplete):** This remains type-safe in the “bubbled-up” recipe config as long as the recipe/step config type includes the operation config type (e.g., a step config property typed as `Static<typeof op.config>`). Because `strategy` is a string-literal discriminator (`"plateAware" | "hotspotClusters" | ...`), setting `strategy: "hotspotClusters"` narrows the `config` field to that strategy’s config object; omitting `strategy` narrows to the default strategy’s config object (the only union member that permits omission).

**Notes / implications:**
- Omitting `strategy` is only allowed when an op explicitly declares `defaultStrategy` (otherwise strategy selection remains explicit).
- Avoid Option **C** unless we commit to a migration story: adding a second strategy later would otherwise change the config shape.

### DD-006: Recipe config authoring surface (remove global overrides, preserve type-safe strategy selection)

**Impact / scale:** **High**

**System surface / blast radius (components):**
- **Map-file authoring**: where mod authors write the recipe configuration for a particular map/recipe.
- **Recipe config composition**: the mechanism that composes step-level config schemas/types into a single recipe-level config shape.
- **Step config contracts**: the ground-truth config shapes that runtime validation uses at execution time.
- **Global-config legacy**: the “map global config overrides” pattern that sits above steps and can erase strategy unions by translating.

**Question:** What is the authoring surface for modders: direct authoring of the canonical recipe config, or an additional curated authoring config that compiles into recipe config?

**Definitions (used in this decision):**
- **Recipe config (canonical artifact):** the concrete TypeScript object shape that the runtime/runner validates and executes. It is composed from the recipe’s stages/steps, and includes step-level config (including op strategy selection where applicable).
- **Curated authoring config (canonical artifact):** an optional, *friendlier* TypeScript object shape intended for humans to edit, which is then translated/compiled into the canonical recipe config.
  - “Curated” here means: the shape can rename/re-group fields to be more ergonomic than the raw stage/step graph, but it must remain **per-recipe** (not global), and it must preserve **type-derived constraints** (not hand-maintained).
- **Compiler function (canonical API):** a small function (e.g., `compileAuthoringConfig(recipe, authoring) -> recipeConfig`) that maps the curated authoring config into the canonical recipe config.
  - Important nuance: Option B does *not* require a second runtime schema system. The runtime schema remains the recipe/step schemas; the curated authoring config can be “just types + a mapper”.
- **Optional sugar (approach):** we still treat recipe config as the source of truth; the curated authoring config is a convenience surface that is not required to use the system.

**Why it matters / what it affects:** The capability we’re enabling (type-safe strategy selection via discriminated unions, including the DD-005 default-friendly behavior) only works if authors edit the real config shape that steps actually validate and execute. Any translation layer can erase unions, introduce drift, or reintroduce a global config smell.

**Options:**
- **A) Author composed recipe config directly (canonical artifact only):** map files author the recipe’s composed config (or a deep partial), with minimal translation.
- **B) Curated authoring config (adds a canonical artifact + compiler):** introduce an optional curated authoring config shape plus a compiler that maps it into recipe config; the curated shape must preserve strategy unions and must be type-derived from the recipe config types (no hand-written parallel schema).
- **C) Keep global overrides (reject):** a monolithic map config translated into recipe config.

**Concrete examples (A vs B)**

**A) Map file authors the canonical recipe config directly**

This option introduces **no new artifact**: authors edit the same shape that the runtime consumes.

```ts
// maps/my-map.ts
// (Illustrative types; the core idea is the shape is derived from the recipe’s steps.)
import type { RecipeConfigOf } from "@swooper/mapgen-core/recipes"; // TBD API
import { standardRecipe } from "../recipes/standard/index.js";

type StandardRecipeConfig = RecipeConfigOf<typeof standardRecipe>;

export const config = {
  stages: {
    morphologyPost: {
      steps: {
        volcanoes: {
          // Step-local config, including any op config the step exposes.
          planVolcanoes: {
            // Default-friendly (DD-005): omit `strategy` when default exists.
            config: { targetCount: 18 },
          },
        },
      },
    },
  },
} satisfies StandardRecipeConfig;

export const configExplicit = {
  stages: {
    morphologyPost: {
      steps: {
        volcanoes: {
          planVolcanoes: {
            // Explicit override: strategy literal narrows the config type.
            strategy: "hotspotClusters",
            config: { seedCount: 4 },
          },
        },
      },
    },
  },
} satisfies StandardRecipeConfig;
```

**B) Map file authors a curated config shape, then compiles to recipe config**

This option introduces a **new canonical artifact** (the curated authoring config type/shape) *and* a **compiler function** that maps the curated shape into the real recipe config. The “sugar” is optional because the runtime still ultimately consumes recipe config; this just gives humans a friendlier surface.

```ts
// maps/my-map.ts
import type { AuthoringConfigOf } from "@swooper/mapgen-core/authoring-config"; // TBD API
import { compileAuthoringConfig } from "@swooper/mapgen-core/authoring-config"; // TBD API
import { standardRecipe } from "../recipes/standard/index.js";

type StandardAuthoringConfig = AuthoringConfigOf<typeof standardRecipe>;

// Curated shape example: avoid exposing stage/step graph directly.
export const authoring = {
  morphology: {
    volcanoes: {
      // Still uses a discriminated union; strategy narrowing still applies.
      strategy: "hotspotClusters",
      config: { seedCount: 4 },
    },
  },
} satisfies StandardAuthoringConfig;

// Canonical runtime input: recipe config.
export const config = compileAuthoringConfig(standardRecipe, authoring);
```

**Hard requirement for B:** the curated type must be derived from the recipe config types in a way that preserves the discriminated union (so setting `strategy: "hotspotClusters"` still narrows the config fields). If B is implemented as a hand-authored parallel schema, it will drift and can easily erase union narrowing (which defeats the capability).

**Related concern (separate, but often conflated): step enable/disable**

This decision is about the *shape authors edit*, not whether steps can be toggled.

- The engine-level recipe schema already has a notion of per-step enable/disable (e.g., `RecipeStepV1.enabled` in `packages/mapgen-core/src/engine/execution-plan.ts`).
- Both Option **A** and **B** can represent “enabled/disabled” as part of step configuration; the difference is whether the author sees the raw step graph (A) or a curated projection of it (B).
- If we want “disable this step” to be a first-class authoring affordance, Option **B** can expose a clean flag at the curated path (e.g., `morphology.volcanoes.enabled = false`) and compile it into the canonical representation.

**Recommendation:** Treat **A** as the target. If we later add **B**, it must be strictly type-derived and must not reintroduce a global config object that blocks strategy unions.

### DD-007: Step schema composition (manual wiring vs declarative op usage)

**Impact / scale:** **Medium**

**System surface / blast radius (components):**
- **Step authoring ergonomics**: the amount of “schema plumbing” a step author writes vs focusing on orchestration logic.
- **Runtime validation/defaulting**: step schemas are the runtime validators; drift here causes hard-to-debug mismatches.
- **Op reuse**: whether steps can safely “just use” op schemas/defaults without re-authoring wrapper shapes.

**Question:** How much should step authors manually wire step schemas vs having a small helper derive schema/config shape from declared op usage?

**Why it matters / what it affects:** Steps sit at the runtime boundary and must validate/default configuration. If authors have to repeatedly mirror operation configs by hand, step code gets noisy and can drift out of sync with the ops actually called (especially for strategy-backed ops where wrapper shapes/defaults matter, including DD-005’s “omit strategy when default exists” behavior).

**Options:**
- **A) Manual schema composition (baseline):** steps write `Type.Object(...)` and reference `op.config` / `op.defaultConfig` as needed.
- **B) Declarative op usage (small ergonomic helper):** steps declare which ops they use, and a helper derives the `schema` and/or default config shape for those ops.
- **C) Build-time composition:** scan code and generate schemas/templates (more tooling).

**Recommendation:** Keep **A** for now while the model stabilizes, but plan for **B** as the first ergonomic upgrade once recipe-config authoring becomes the priority. Avoid **C** unless we hit a real scaling wall.

### DD-008: Pipeline dependency terminology migration (`DependencyTag` → `DependencyKey`)

**Impact / scale:** **Medium**

**System surface / blast radius (components):**
- **Public vocabulary for mod authors**: the terms they learn and search for (docs + examples).
- **Runtime types/exports**: the actual names in code (`DependencyTag`, `TagRegistry`, etc.) and any deprecation/alias strategy.
- **Ambiguity reduction**: separating pipeline dependency keys from Civ plot tags and story overlay “tagging”.

**Question:** Do we align runtime code vocabulary with the doc vocabulary (`DependencyKey`/`DependencyDefinition`) or keep legacy “tag” naming in code?

**Why it matters / what it affects:** “Tag” is overloaded (pipeline dependencies vs Civ plot tags vs story overlay classification). If code and docs diverge, mod authors learn two vocabularies and the ambiguity comes back through everyday usage and APIs.

**Options:**
- **A) Docs-only rename:** keep legacy code names; docs use the newer vocabulary.
- **B) Code rename with deprecations (preferred):** introduce `DependencyKey`/`DependencyRegistry` and keep legacy exports as deprecated aliases for a transition period.
- **C) Hard code rename:** rename without aliases (breaking).

**Recommendation:** Prefer **B** so docs, examples, and code converge without a hard break.
