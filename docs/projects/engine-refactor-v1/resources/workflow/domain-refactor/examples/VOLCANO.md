---
name: example-volcano-end-to-end
description: |
  Canonical end-to-end example of the contract-first ops + orchestration-only steps architecture.
  This is a standalone copy of the “Volcano” example to avoid depending on deep links into the SPEC.
---

# EXAMPLE: Volcano (End-to-End)

This example is intentionally “pure-domain + side-effects-in-step”: the domain computes placements and the step applies them to the engine/runtime.

Repo-path note:
- This example uses `src/...` for brevity; in this repo, read that as `mods/mod-swooper-maps/src/...`.

## File layout

```txt
src/domain/morphology/volcanoes/
  index.ts
  ops/
    compute-suitability/
      contract.ts
      types.ts
      strategies/
        default.ts
        index.ts
      rules/
        index.ts
      index.ts
    plan-volcanoes/
      contract.ts
      types.ts
      strategies/
        default.ts
        hotspot-clusters.ts
        index.ts
      rules/
        enforce-min-distance.ts
        pick-weighted.ts
        index.ts
      index.ts

src/recipes/standard/stages/morphology-post/steps/volcanoes/
  contract.ts
  index.ts
  lib/
    inputs.ts
    apply.ts
```

## Domain: operation 1 — compute suitability (derived field)

```ts
// src/domain/morphology/volcanoes/ops/compute-suitability/contract.ts
import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";

export const ComputeSuitabilityContract = defineOpContract({
  kind: "compute",
  id: "morphology/volcanoes/compute-suitability",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      isLand: TypedArraySchemas.u8({ description: "Land mask per tile (0/1)." }),
      plateBoundaryProximity: TypedArraySchemas.u8({
        description: "Plate boundary proximity per tile (0..255).",
      }),
      elevation: TypedArraySchemas.i16({ description: "Elevation per tile (meters)." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      suitability: TypedArraySchemas.f32({ description: "Volcano suitability per tile (0..N)." }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        wPlateBoundary: Type.Optional(Type.Number({ default: 1.0 })),
        wElevation: Type.Optional(Type.Number({ default: 0.25 })),
      },
      { additionalProperties: false, default: {} }
    ),
  },
} as const);
```

```ts
// src/domain/morphology/volcanoes/ops/compute-suitability/types.ts
import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").ComputeSuitabilityContract;

export type ComputeSuitabilityTypes = OpTypeBag<Contract>;
```

```ts
// src/domain/morphology/volcanoes/ops/compute-suitability/strategies/default.ts
import { createStrategy } from "@swooper/mapgen-core/authoring";
import { ComputeSuitabilityContract } from "../contract.js";

export const defaultStrategy = createStrategy(ComputeSuitabilityContract, "default", {
  run: (inputs, cfg) => {
    const size = inputs.width * inputs.height;
    const suitability = new Float32Array(size);

    for (let i = 0; i < size; i++) {
      if (inputs.isLand[i] === 0) {
        suitability[i] = 0;
        continue;
      }

      const plate = inputs.plateBoundaryProximity[i] / 255;
      const elev = Math.max(0, Math.min(1, inputs.elevation[i] / 4000));
      suitability[i] = cfg.wPlateBoundary! * plate + cfg.wElevation! * elev;
    }

    return { suitability };
  },
});
```

```ts
// src/domain/morphology/volcanoes/ops/compute-suitability/strategies/index.ts
export { defaultStrategy } from "./default.js";
```

```ts
// src/domain/morphology/volcanoes/ops/compute-suitability/rules/index.ts
// No rules needed for this op; keep the barrel as the canonical runtime surface.
```

```ts
// src/domain/morphology/volcanoes/ops/compute-suitability/index.ts
import { createOp } from "@swooper/mapgen-core/authoring";
import { ComputeSuitabilityContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const computeSuitability = createOp(ComputeSuitabilityContract, {
  strategies: { default: defaultStrategy },
});

export * from "./contract.js";
export type * from "./types.js";
```

## Domain: operation 2 — plan volcano placements (strategies + rules)

This operation has interchangeable strategies. The op contract stays stable; internal strategies can evolve independently.

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/contract.ts
import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";

export const PlanVolcanoesContract = defineOpContract({
  kind: "plan",
  id: "morphology/volcanoes/plan-volcanoes",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      suitability: TypedArraySchemas.f32({ description: "Volcano suitability per tile (0..N)." }),
      rngSeed: Type.Integer({
        minimum: 0,
        description:
          "Deterministic RNG seed (derived by the step from RunRequest settings + step/op identity).",
      }),
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
    default: Type.Object(
      {
        targetCount: Type.Optional(Type.Integer({ minimum: 0, default: 12 })),
        minDistance: Type.Optional(Type.Integer({ minimum: 0, default: 6 })),
      },
      { additionalProperties: false, default: {} }
    ),
    hotspotClusters: Type.Object(
      {
        targetCount: Type.Optional(Type.Integer({ minimum: 0, default: 12 })),
        minDistance: Type.Optional(Type.Integer({ minimum: 0, default: 6 })),
        seedCount: Type.Optional(Type.Integer({ minimum: 1, default: 3 })),
      },
      { additionalProperties: false, default: {} }
    ),
  },
} as const);
```

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/types.ts
import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanVolcanoesContract;

export type PlanVolcanoesTypes = OpTypeBag<Contract>;
```

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/rules/index.ts
export { enforceMinDistance } from "./enforce-min-distance.js";
export { pickWeightedIndex } from "./pick-weighted.js";
```

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/rules/pick-weighted.ts
export function pickWeightedIndex(weights: Float32Array, rng01: () => number): number {
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
export function enforceMinDistance(
  dims: { width: number; height: number },
  chosen: { x: number; y: number }[],
  candidate: { x: number; y: number },
  minDistance: number
): boolean {
  if (minDistance <= 0) return true;

  for (const p of chosen) {
    const dx = p.x - candidate.x;
    const dy = p.y - candidate.y;
    if (dx * dx + dy * dy < minDistance * minDistance) return false;
  }

  return (
    candidate.x >= 0 &&
    candidate.y >= 0 &&
    candidate.x < dims.width &&
    candidate.y < dims.height
  );
}
```

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/strategies/default.ts
import { createStrategy } from "@swooper/mapgen-core/authoring";
import { PlanVolcanoesContract } from "../contract.js";
import { enforceMinDistance, pickWeightedIndex } from "../rules/index.js";

export const defaultStrategy = createStrategy(PlanVolcanoesContract, "default", {
  run: (inputs, cfg) => {
    const target = cfg.targetCount ?? 12;
    const minD = cfg.minDistance ?? 6;

    let draw = 0;
    const rng01 = (): number => {
      const x = Math.imul((inputs.rngSeed | 0) ^ draw++, 0x9e3779b1);
      return (x >>> 0) / 2 ** 32;
    };

    const { width, height } = inputs;
    const size = width * height;

    const chosen: { x: number; y: number; intensity: number }[] = [];
    const weights = new Float32Array(size);
    for (let i = 0; i < size; i++) weights[i] = inputs.suitability[i];

    while (chosen.length < target) {
      const i = pickWeightedIndex(weights, rng01);
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
});
```

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/strategies/hotspot-clusters.ts
import { createStrategy } from "@swooper/mapgen-core/authoring";
import { PlanVolcanoesContract } from "../contract.js";
import { enforceMinDistance, pickWeightedIndex } from "../rules/index.js";

export const hotspotClustersStrategy = createStrategy(PlanVolcanoesContract, "hotspotClusters", {
  run: (inputs, cfg) => {
    const target = cfg.targetCount ?? 12;
    const minD = cfg.minDistance ?? 6;

    let draw = 0;
    const rng01 = (): number => {
      const x = Math.imul((inputs.rngSeed | 0) ^ draw++, 0x9e3779b1);
      return (x >>> 0) / 2 ** 32;
    };

    const { width, height } = inputs;
    const size = width * height;

    const chosen: { x: number; y: number; intensity: number }[] = [];
    const weights = new Float32Array(size);
    for (let i = 0; i < size; i++) weights[i] = inputs.suitability[i];

    const seedCount = Math.min(cfg.seedCount ?? 3, target);
    while (chosen.length < seedCount) {
      const i = pickWeightedIndex(weights, rng01);
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
      const i = pickWeightedIndex(weights, rng01);
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
});
```

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/strategies/index.ts
export { defaultStrategy } from "./default.js";
export { hotspotClustersStrategy } from "./hotspot-clusters.js";
```

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/index.ts
import { createOp } from "@swooper/mapgen-core/authoring";
import { PlanVolcanoesContract } from "./contract.js";
import { defaultStrategy, hotspotClustersStrategy } from "./strategies/index.js";

export const planVolcanoes = createOp(PlanVolcanoesContract, {
  strategies: {
    default: defaultStrategy,
    hotspotClusters: hotspotClustersStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";
```

## Domain index (public surface)

Steps import the domain module and only see `ops` (not rules/strategies).

```ts
// src/domain/morphology/volcanoes/index.ts
import { computeSuitability } from "./ops/compute-suitability/index.js";
import { planVolcanoes } from "./ops/plan-volcanoes/index.js";

export const ops = {
  computeSuitability,
  planVolcanoes,
};
```

## Step: build inputs → call ops → apply/publish (runtime boundary)

The step owns adapter/engine interaction and artifact publishing. The step never imports domain rules or strategy modules.

```ts
// src/recipes/standard/stages/morphology-post/steps/volcanoes/contract.ts
import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import * as volcanoes from "@mapgen/domain/morphology/volcanoes";

export const VolcanoesStepContract = defineStepContract({
  id: "volcanoes",
  phase: "morphology-post",
  requires: ["artifact:plates", "field:elevation"],
  provides: ["artifact:volcanoPlacements", "effect:volcanoesPlaced"],
  schema: Type.Object(
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
  ),
} as const);
```

```ts
// src/recipes/standard/stages/morphology-post/steps/volcanoes/lib/inputs.ts
import { expectedGridSize } from "@swooper/mapgen-core/authoring";

type VolcanoInputsContext = {
  dimensions: { width: number; height: number };
  adapter: {
    isWater: (x: number, y: number) => boolean;
    getElevation: (x: number, y: number) => number;
  };
  artifacts: { get: (key: string) => unknown };
};

export function buildVolcanoInputs(ctx: VolcanoInputsContext) {
  const { width, height } = ctx.dimensions;
  const size = expectedGridSize(width, height);

  const isLand = new Uint8Array(size);
  const elevation = new Int16Array(size);
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
// src/recipes/standard/stages/morphology-post/steps/volcanoes/lib/apply.ts
export type VolcanoPlacement = { x: number; y: number; intensity: number };

export function applyVolcanoPlacements(
  adapter: { setVolcano: (x: number, y: number, intensity: number) => void },
  placements: VolcanoPlacement[]
) {
  for (const p of placements) adapter.setVolcano(p.x, p.y, p.intensity);
}
```

```ts
// src/recipes/standard/stages/morphology-post/steps/volcanoes/index.ts
import { createStep } from "@mapgen/authoring/steps";
import { ctxRandom } from "@swooper/mapgen-core/core/types";
import * as volcanoes from "@mapgen/domain/morphology/volcanoes";

import { VolcanoesStepContract } from "./contract.js";
import { applyVolcanoPlacements } from "./lib/apply.js";
import { buildVolcanoInputs } from "./lib/inputs.js";

export default createStep(VolcanoesStepContract, {
  resolveConfig: (config, settings) => ({
    computeSuitability: volcanoes.ops.computeSuitability.resolveConfig(
      config.computeSuitability,
      settings
    ),
    planVolcanoes: volcanoes.ops.planVolcanoes.resolveConfig(config.planVolcanoes, settings),
  }),
  run: (context, config) => {
    const inputs = buildVolcanoInputs(context);

    const { suitability } = volcanoes.ops.computeSuitability.runValidated(
      inputs,
      config.computeSuitability
    );

    const { placements } = volcanoes.ops.planVolcanoes.runValidated(
      {
        width: inputs.width,
        height: inputs.height,
        suitability,
        rngSeed: ctxRandom(context, "volcanoes:planVolcanoes:rngSeed", 1_000_000) | 0,
      },
      config.planVolcanoes
    );

    applyVolcanoPlacements(context.adapter, placements);
    context.artifacts.set("artifact:volcanoPlacements", { placements });
  },
});
```
