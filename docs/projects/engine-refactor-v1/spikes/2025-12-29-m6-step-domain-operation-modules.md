# SPIKE: Step ↔ Domain Contracts via Operation Modules

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

### Domain responsibilities

Domains expose step-callable entrypoints as **operations**. An operation:

- has a **kind** (`plan`, `compute`, `score`, `select`) for consistent mental model,
- owns its **Inputs**, **ConfigSchema**, and **Result** types (per-operation, not per-domain),
- exports a pure `run(inputs, config) -> result`.

Domains may also contain internal:

- **rules** (smaller pure helpers used by ops),
- **domain artifact shapes** (TypeBox schemas + keys for publishing), where publishing remains step-owned.

### Shared utilities vs domain logic

- **generic utilities** (math, rng helpers, array ops) belong in shared libraries (e.g. `.../lib/**`).
- **domain-specific semantics** belong in the domain (e.g. “what constitutes an orographic shadow”).
- **runtime adapter helpers** (mapping symbolic kinds → engine IDs, applying overrides to the engine) belong in the step (or step-local libs).

## 4) Step ↔ Domain Interaction

### Interaction model

Steps and domains interact as a simple 3-phase boundary:

1. **Build Inputs (step):** adapt runtime (adapter + artifacts/fields) into plain, typed inputs for a domain operation.
2. **Compute (domain op):** run pure logic using operation config and inputs, returning a typed result.
3. **Apply/Publish (step):** apply results to runtime (engine writes, buffer writes) and publish artifacts/fields.

An “apply” phase is not a round-trip back into the domain; it is the step using the domain’s return value to mutate runtime.

### Diagram

```
          (runtime)                          (pure)                           (runtime)
┌─────────────────────────┐        ┌──────────────────────┐        ┌─────────────────────────┐
│ Step.run(ctx, config)   │        │ domain/ops/*.ts      │        │ engine + artifacts      │
│                         │        │                      │        │                         │
│ 1) build inputs         │  ───▶  │ op.run(inputs,cfg)   │  ───▶  │ 3) apply + publish      │
│    from ctx+adapter     │        │ => result            │        │                         │
└─────────────────────────┘        └──────────────────────┘        └─────────────────────────┘
```

### Minimal helper: ergonomic inference, not a framework

Operations are plain exports, but a tiny helper improves inference and standardizes shape.

```ts
// packages/mapgen-core/src/authoring/domain-op.ts
import type { TSchema, Static } from "@sinclair/typebox";

export type DomainOpKind = "plan" | "compute" | "score" | "select";

export type DomainOp<S extends TSchema, Inputs, Result> = {
  kind: DomainOpKind;
  id: string;
  configSchema: S;
  run: (inputs: Inputs, config: Static<S>) => Result;
};

export function defineOp<S extends TSchema, Inputs, Result>(
  op: DomainOp<S, Inputs, Result>
): DomainOp<S, Inputs, Result> {
  return op;
}
```

Recommended step-side import pattern:

```ts
import * as climate from "@mapgen/domain/hydrology/climate";

const result = climate.ops.baselineRainfall.run(inputs, config.baselineRainfall);
```

## 5) Concrete Pattern (End-to-End Example)

This example uses a hydrology/climate domain because it is “compute-heavy” (derived fields) and does not rely on overriding Civ engine behavior.

### Domain layout (one operation per file)

```txt
src/domain/hydrology/climate/
  index.ts
  ops/
    distance-to-water.ts
    baseline-rainfall.ts
  rules/
    lat-bands.ts
    coastal-bonus.ts
  artifacts.ts
```

### Operation: compute distance-to-water

```ts
// src/domain/hydrology/climate/ops/distance-to-water.ts
import { Type, type Static } from "typebox";
import { defineOp } from "@swooper/mapgen-core/authoring/domain-op";

export type Inputs = {
  width: number;
  height: number;
  isWater: Uint8Array; // 1=water, 0=land
};

export const ConfigSchema = Type.Object(
  {
    maxDistance: Type.Optional(Type.Number({ default: 12 })),
  },
  { additionalProperties: false, default: {} }
);
export type Config = Static<typeof ConfigSchema>;

export type Result = {
  dist: Uint8Array; // Manhattan-ish tile distance, clamped to maxDistance
};

export default defineOp({
  kind: "compute",
  id: "hydrology/climate/distanceToWater",
  configSchema: ConfigSchema,
  run: (inputs, cfg): Result => {
    const size = inputs.width * inputs.height;
    const maxD = Number.isFinite(cfg.maxDistance) ? cfg.maxDistance! : 12;
    const dist = new Uint8Array(size);

    // Placeholder: domain owns the algorithm, step owns no logic here.
    // Implement with BFS/scanline/etc. as appropriate.
    dist.fill(maxD);

    return { dist };
  },
} as const);
```

### Operation: compute baseline rainfall (uses a domain rule + another op’s output)

```ts
// src/domain/hydrology/climate/ops/baseline-rainfall.ts
import { Type, type Static } from "typebox";
import { defineOp } from "@swooper/mapgen-core/authoring/domain-op";
import { rainfallForLatitudeBand } from "../rules/lat-bands.js";

export type Inputs = {
  width: number;
  height: number;
  isWater: Uint8Array;
  latAbs: Float32Array;     // degrees
  elevation: Int16Array;    // meters
  distToWater: Uint8Array;  // tiles
  rng?: (label: string, max: number) => number;
};

export const ConfigSchema = Type.Object(
  {
    coastalBonus: Type.Optional(Type.Number({ default: 24 })),
    coastalSpread: Type.Optional(Type.Number({ default: 4 })),
  },
  { additionalProperties: false, default: {} }
);
export type Config = Static<typeof ConfigSchema>;

export type Result = {
  rainfall: Uint16Array;
};

export default defineOp({
  kind: "compute",
  id: "hydrology/climate/baselineRainfall",
  configSchema: ConfigSchema,
  run: (inputs, cfg): Result => {
    const size = inputs.width * inputs.height;
    const rainfall = new Uint16Array(size);

    const bonus = Number.isFinite(cfg.coastalBonus) ? cfg.coastalBonus! : 24;
    const spread = Number.isFinite(cfg.coastalSpread) ? cfg.coastalSpread! : 4;

    for (let i = 0; i < size; i++) {
      if (inputs.isWater[i] === 1) continue;
      const base = rainfallForLatitudeBand(inputs.latAbs[i]);

      const d = inputs.distToWater[i];
      const coastal = d > 0 && d <= spread ? Math.round(bonus * (1 - (d - 1) / spread)) : 0;
      rainfall[i] = Math.max(0, base + coastal);
    }

    return { rainfall };
  },
} as const);
```

### Domain index: aggregate operations (manual, explicit)

```ts
// src/domain/hydrology/climate/index.ts
import distanceToWater from "./ops/distance-to-water.js";
import baselineRainfall from "./ops/baseline-rainfall.js";

export const ops = {
  distanceToWater,
  baselineRainfall,
} as const;
```

### Step wiring: compose operations and publish outputs

```ts
// src/recipes/standard/stages/hydrology/steps/climate-baseline.ts
import { Type, type Static } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";
import * as climate from "@mapgen/domain/hydrology/climate";

const StepSchema = Type.Object(
  {
    distanceToWater: climate.ops.distanceToWater.configSchema,
    baselineRainfall: climate.ops.baselineRainfall.configSchema,
  },
  { additionalProperties: false, default: { distanceToWater: {}, baselineRainfall: {} } }
);
type StepConfig = Static<typeof StepSchema>;

export default createStep({
  id: "climateBaseline",
  phase: "hydrology",
  schema: StepSchema,
  run: (ctx, cfg: StepConfig) => {
    const { width, height } = ctx.dimensions;
    const size = width * height;
    const adapter = ctx.adapter;

    // 1) Build op inputs (runtime → domain inputs)
    const isWater = new Uint8Array(size);
    const latAbs = new Float32Array(size);
    const elevation = new Int16Array(size);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        isWater[i] = adapter.isWater(x, y) ? 1 : 0;
        latAbs[i] = Math.abs(adapter.getLatitude(x, y));
        elevation[i] = adapter.getElevation(x, y) | 0;
      }
    }

    // 2) Compute (domain ops)
    const { dist } = climate.ops.distanceToWater.run({ width, height, isWater }, cfg.distanceToWater);
    const { rainfall } = climate.ops.baselineRainfall.run(
      { width, height, isWater, latAbs, elevation, distToWater: dist },
      cfg.baselineRainfall
    );

    // 3) Apply/Publish (domain results → runtime)
    ctx.buffers.climate.rainfall.set(rainfall);
    // ctx.artifacts.set("artifact:climateField", { rainfall, ... }) // step-owned publish
  },
} as const);
```

### Why this example is representative

- The domain owns the algorithms and config schemas.
- The step owns runtime interaction and composition of multiple ops.
- Multiple operations in one domain compose cleanly without codegen:
  - each op is one file (default export),
  - the domain `index.ts` aggregates them into `ops`,
  - steps import `* as climate` and wire through `climate.ops.*`.

