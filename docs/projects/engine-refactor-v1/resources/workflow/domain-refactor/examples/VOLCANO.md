---
name: example-volcano-end-to-end
description: |
  Canonical end-to-end example of the step ↔ domain contracts via operation modules architecture.
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
  artifacts.ts
  ops/
    compute-suitability/
      index.ts
      schema.ts
      rules/
      strategies/
    plan-volcanoes/
      index.ts
      schema.ts
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

## Domain: operation 1 — compute suitability (derived field)

```ts
// src/domain/morphology/volcanoes/ops/compute-suitability/index.ts
import { Type } from "typebox";
import { createOp, TypedArraySchemas } from "@swooper/mapgen-core/authoring";

export default createOp({
  kind: "compute",
  id: "morphology/volcanoes/computeSuitability",
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
    default: {
      config: Type.Object(
        {
          wPlateBoundary: Type.Optional(Type.Number({ default: 1.0 })),
          wElevation: Type.Optional(Type.Number({ default: 0.25 })),
        },
        { additionalProperties: false, default: {} }
      ),
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
    },
  },
} as const);
```

## Domain: operation 2 — plan volcano placements (strategies + rules)

This operation has interchangeable strategies. The op stays stable; internal strategies can evolve independently.

```ts
// src/domain/morphology/volcanoes/ops/plan-volcanoes/index.ts
import { Type } from "typebox";
import { createOp, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
import plateAware from "./strategies/plate-aware.js";
import hotspotClusters from "./strategies/hotspot-clusters.js";

export default createOp({
  kind: "plan",
  id: "morphology/volcanoes/planVolcanoes",
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
    default: plateAware,
    hotspotClusters,
  } as const,
} as const);
```

## Domain: strategies (separate modules with per-strategy config)

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

    // Derive deterministic randomness locally from the seed.
    // NOTE: The op contract passes seeds/values (POJO-ish), not callback “views”.
    let draw = 0;
    const rng01 = (): number => {
      const x = Math.imul((inputs.rngSeed | 0) ^ draw++, 0x9e3779b1);
      return (x >>> 0) / 2 ** 32;
    };

    const width = inputs.width;
    const height = inputs.height;
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

    // Derive deterministic randomness locally from the seed.
    // NOTE: The op contract passes seeds/values (POJO-ish), not callback “views”.
    let draw = 0;
    const rng01 = (): number => {
      const x = Math.imul((inputs.rngSeed | 0) ^ draw++, 0x9e3779b1);
      return (x >>> 0) / 2 ** 32;
    };

    const width = inputs.width;
    const height = inputs.height;
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
} as const);
```

## Domain: rules (small, pure building blocks)

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

  return (
    candidate.x >= 0 &&
    candidate.y >= 0 &&
    candidate.x < dims.width &&
    candidate.y < dims.height
  );
}
```

## Domain index (public surface)

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

## Step: build inputs → call ops → apply/publish (runtime boundary)

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
    const { suitability } = volcanoes.ops.computeSuitability.runValidated(
      inputs,
      cfg.computeSuitability
    );

    // Two equivalent authoring patterns for strategy-backed ops (always explicit):
    //
    // 1) Use the default strategy:
    //    cfg.planVolcanoes = { strategy: "default", config: { targetCount: 12, minDistance: 6 } }
    //
    // 2) Explicitly select a non-default strategy:
    //    cfg.planVolcanoes = { strategy: "hotspotClusters", config: { seedCount: 4, targetCount: 12, minDistance: 6 } }
    //
    // Both are runtime-validated (via `volcanoes.ops.planVolcanoes.config`) and type-checked via `Parameters<...run>[1]`.
    const { placements } = volcanoes.ops.planVolcanoes.runValidated(
      {
        width: inputs.width,
        height: inputs.height,
        suitability,
        rngSeed: ctxRandom(ctx, "volcanoes:planVolcanoes:rngSeed", 1_000_000) | 0,
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
import { expectedGridSize } from "@swooper/mapgen-core/authoring";

export function buildVolcanoInputs(ctx: {
  dimensions: { width: number; height: number };
  adapter: {
    isWater: (x: number, y: number) => boolean;
    getElevation: (x: number, y: number) => number;
  };
  artifacts: { get: (key: string) => unknown };
}) {
  const { width, height } = ctx.dimensions;
  const size = expectedGridSize(width, height);

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
