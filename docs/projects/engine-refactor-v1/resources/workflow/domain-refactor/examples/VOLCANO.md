---
name: example-volcano-end-to-end
description: |
  Illustrative end-to-end example of the domain-refactor posture for volcanoes.
  Not a contract authority document; see Phase 2 spec docs for the locked posture.
---

# EXAMPLE: Volcano (Truth → Map Intent → Stamping)

This example is illustrative for Phase 3 implementers. It is designed to prevent the most common drift modes:

- **Topology invariant:** Civ7 is always `wrapX=true`, `wrapY=false`. The example never accepts wrap flags as inputs or config.
- **Boundary:** Physics publishes truth-only artifacts (pure). Gameplay owns `artifact:map.*` projections/annotations and all adapter stamping.
- **No backfeeding:** Physics steps do not consume `artifact:map.*` or `effect:map.*`.
- **Effects are boolean execution guarantees:** `effect:map.<thing><Verb>` (`*Plotted` by convention).
- **Hard ban:** no `artifact:map.realized.*`.
- **TerrainBuilder no-drift:** this example does not use engine-derived elevation/cliffs in Physics. If a rule must match Civ7 elevation bands/cliffs, it is Gameplay logic and runs only after `effect:map.elevationBuilt`.
- **Schema posture:** top-level operation/strategy/step schemas in this example have **no `additionalProperties`** and **no top-level defaults**. Prefer explicit required fields and explicit normalization at the boundary.

Repo-path note:
- Code identifiers and patterns are taken from this repo (notably `mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/**`).
- Some tag ids below are **illustrative** (`artifact:morphology.volcanoes`, `effect:map.volcanoesPlotted`) and must be registered in the TagRegistry when implemented.
- Some tag ids below are **illustrative** (`artifact:morphology.volcanoes`, `effect:map.volcanoesPlotted`) and must be registered in the TagRegistry when implemented.

## Pipeline overview (end-to-end)

This example uses **two** explicit step boundaries:
- a **Physics** step that publishes truth, and
- a **Gameplay/materialization** step (braided into the same physics phase) that both:
  - publishes `artifact:map.*` projection/annotation layers, and
  - performs adapter stamping and provides a boolean `effect:map.*`.

This avoids an over-modeled “project vs plot” split at the step level: projection is planning (pure) and stamping is side-effecting, but both can live in the same step as long as the step is cohesive and provides the correct effect boundary.

```txt
PHYSICS (pure; no adapter reads/writes)
  phase: morphology
    step: plan-volcanoes
    requires: artifact:foundation.plates, artifact:morphology.topography
    provides: artifact:morphology.volcanoes

GAMEPLAY / MATERIALIZATION (adapter writes; braided into a physics phase)
  phase: gameplay
    step: plot-volcanoes
      requires: artifact:morphology.volcanoes, artifact:morphology.topography
      provides: effect:map.volcanoesPlotted
```

Notes:
- Physics does not require or read `artifact:map.*` or `effect:map.*` (no backfeeding).
- The stamping step provides `effect:map.volcanoesPlotted` only when adapter writes complete successfully (pipeline marks provides on step success).
- This example does not require a Gameplay-owned map projection artifact. If a debug/UI overlay is needed, prefer trace events or an explicitly non-Physics-consumable `artifact:map.*Debug` surface.

## Example file tree (illustrative)

This shows the intended separation (ops vs steps) without inventing extra pipeline phases:

```txt
mods/mod-swooper-maps/
  src/
    domain/
      morphology/
        ops/
          plan-volcanoes/
            contract.ts
            index.ts
            strategies/
              default.ts
            rules/
              is-too-close.ts
    recipes/
      standard/
        stages/
          morphology-post/                 # example: where volcanoes are finalized
            steps/
              plan-volcanoes/              # Physics step (no adapter)
                contract.ts
                index.ts
              plot-volcanoes/              # Gameplay/materialization step (adapter)
                contract.ts
                index.ts
```

## Domain operation: `morphology/plan-volcanoes` (Physics; pure)

This op computes a deterministic set of volcano placements (tile indices) from Physics truths (including Foundation volcanism signals like melt flux / plumes).

### Contract (no `additionalProperties`, no top-level defaults)

```ts
// mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/contract.ts
import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const VolcanoPlacementSchema = Type.Object({
  tileIndex: Type.Integer({ minimum: 0, description: "Tile index in row-major order." }),
});

export const PlanVolcanoesContract = defineOp({
  kind: "plan",
  id: "morphology/plan-volcanoes",
  input: Type.Object({
    width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
    height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),

    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    boundaryCloseness: TypedArraySchemas.u8({ description: "Boundary proximity per tile (0..255)." }),
    boundaryType: TypedArraySchemas.u8({ description: "Boundary type per tile (domain-coded; e.g. conv/div/trans)." }),
    shieldStability: TypedArraySchemas.u8({ description: "Shield stability per tile (0..255)." }),

    meltFlux: TypedArraySchemas.u8({
      description:
        "Melt flux per tile (0..255). Foundation-owned volcanism signal (truth); not an overlay and not engine-derived.",
    }),

    rngSeed: Type.Integer({ description: "Deterministic RNG seed supplied by the step." }),
  }),
  output: Type.Object({
    volcanoes: Type.Array(VolcanoPlacementSchema, { description: "Planned volcano placements." }),
  }),
  strategies: {
    default: Type.Object({
      enabled: Type.Boolean({ description: "Master toggle for volcano placement." }),
      baseDensityPerLandTile: Type.Number({
        description: "Baseline volcanoes per land tile; higher density spawns more vents overall.",
        minimum: 0,
      }),
      minSpacingTiles: Type.Number({
        description:
          "Minimum spacing between volcanoes in tiles, using cylinder topology (wrapX, no wrapY).",
        minimum: 0,
      }),
      boundaryThreshold01: Type.Number({
        description: "Boundary closeness threshold (0..1) for treating a tile as boundary-adjacent.",
        minimum: 0,
        maximum: 1,
      }),
      boundaryWeight: Type.Number({ description: "Base weight applied near boundaries.", minimum: 0 }),
      convergentMultiplier: Type.Number({ description: "Weight multiplier for convergent boundaries.", minimum: 0 }),
      divergentMultiplier: Type.Number({ description: "Weight multiplier for divergent boundaries.", minimum: 0 }),
      transformMultiplier: Type.Number({ description: "Weight multiplier for transform boundaries.", minimum: 0 }),
      meltFluxWeight: Type.Number({ description: "Weight contribution for melt flux (interior volcanism).", minimum: 0 }),
      shieldPenalty01: Type.Number({
        description: "Penalty applied using shield stability (0..1). Higher suppresses ancient-craton volcanoes.",
        minimum: 0,
        maximum: 1,
      }),
      randomJitterWeight: Type.Number({
        description:
          "Additive random jitter to break up deterministic patterns (applied with labeled RNG).",
        minimum: 0,
      }),
      minVolcanoes: Type.Integer({ description: "Minimum guaranteed count target.", minimum: 0 }),
      maxVolcanoes: Type.Integer({ description: "Maximum cap; set to 0 to mean “no cap”.", minimum: 0 }),
    }),
  },
} as const);
```

### Rule: spacing under Civ7 cylinder topology (wrapX only)

The topology is a modeling invariant; it is not a contract parameter.

```ts
// mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/rules/is-too-close.ts
import { wrapAbsDeltaPeriodic } from "@swooper/mapgen-core/lib/math";

export function isTooClose(
  dims: { width: number; height: number },
  placed: Array<{ x: number; y: number }>,
  candidate: { x: number; y: number },
  minSpacing: number
): boolean {
  if (minSpacing <= 0) return false;

  for (const p of placed) {
    const dx = wrapAbsDeltaPeriodic(p.x - candidate.x, dims.width);
    const dy = p.y - candidate.y; // NOTE: wrapY is false; do not wrap.
    if (dx * dx + dy * dy < minSpacing * minSpacing) return true;
  }
  return false;
}
```

### Strategy: deterministic selection + stable tie-breakers

Key determinism requirements:
- Derive randomness from `rngSeed` and stable labels (never from iteration order over hash maps/sets).
- When ordering candidates, use a stable secondary key (`tileIndex`) so weights ties are deterministic.

```ts
// mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/strategies/default.ts
import { createStrategy } from "@swooper/mapgen-core/authoring";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";
import { PlanVolcanoesContract } from "../contract.js";
import { isTooClose } from "../rules/is-too-close.js";

export const defaultStrategy = createStrategy(PlanVolcanoesContract, "default", {
  run: (input, config) => {
    if (!config.enabled) return { volcanoes: [] };

    const { width, height } = input;
    const size = width * height;

    let landTiles = 0;
    for (let i = 0; i < size; i++) if (input.landMask[i] === 1) landTiles++;

    const uncappedTarget = Math.round(landTiles * config.baseDensityPerLandTile);
    const clampedTarget = Math.max(config.minVolcanoes, uncappedTarget);
    const target =
      config.maxVolcanoes > 0 ? Math.min(clampedTarget, config.maxVolcanoes) : clampedTarget;
    if (target <= 0) return { volcanoes: [] };

    const rng = createLabelRng(input.rngSeed | 0);
    const candidates: Array<{ tileIndex: number; weight: number }> = [];

    const threshold255 = Math.round(config.boundaryThreshold01 * 255);

    for (let tileIndex = 0; tileIndex < size; tileIndex++) {
      if (input.landMask[tileIndex] === 0) continue;

      const closeness255 = input.boundaryCloseness[tileIndex] | 0;
      const boundaryAdj = closeness255 >= threshold255;

      const boundaryType = input.boundaryType[tileIndex] | 0;
      const convergent = boundaryType === 1 ? 1 : 0;
      const divergent = boundaryType === 2 ? 1 : 0;
      const transform = boundaryType === 3 ? 1 : 0;

      const melt01 = (input.meltFlux[tileIndex] | 0) / 255;
      const shield01 = (input.shieldStability[tileIndex] | 0) / 255;

      let weight = 0;

      if (boundaryAdj) {
        weight += config.boundaryWeight;
        if (convergent) weight *= config.convergentMultiplier;
        if (divergent) weight *= config.divergentMultiplier;
        if (transform) weight *= config.transformMultiplier;
      }

      weight += melt01 * config.meltFluxWeight;

      // Ancient shields suppress volcanism.
      weight *= 1 - config.shieldPenalty01 * shield01;

      // Jitter is labeled by tile index for stable randomness across refactors.
      const jitter01 = rng(1_000_000, `tile:${tileIndex}`) / 1_000_000;
      weight += (jitter01 - 0.5) * 2 * config.randomJitterWeight;

      if (weight > 0) candidates.push({ tileIndex, weight });
    }

    // Stable ordering: weight desc, then tileIndex asc (tie-breaker).
    candidates.sort((a, b) => (b.weight - a.weight) || (a.tileIndex - b.tileIndex));

    const placed: Array<{ x: number; y: number; tileIndex: number }> = [];
    for (const candidate of candidates) {
      if (placed.length >= target) break;
      const y = (candidate.tileIndex / width) | 0;
      const x = candidate.tileIndex - y * width;
      if (isTooClose({ width, height }, placed, { x, y }, config.minSpacingTiles)) continue;
      placed.push({ x, y, tileIndex: candidate.tileIndex });
    }

    return { volcanoes: placed.map((p) => ({ tileIndex: p.tileIndex })) };
  },
});
```

## Physics step: `morphology/plan-volcanoes` (publishes truth)

This step is pure: it reads upstream truth artifacts and buffers, calls the op, then publishes a truth artifact. It does not read or write the adapter.

```ts
// Illustrative contract shape (ids are canonical patterns; artifact ids are illustrative).
import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

export const PlanVolcanoesStepContract = defineStep({
  id: "plan-volcanoes",
  phase: "morphology",
  requires: ["artifact:foundation.plates", "artifact:morphology.topography"],
  provides: ["artifact:morphology.volcanoes"],
  ops: { planVolcanoes: morphology.ops.planVolcanoes },
  schema: Type.Object({
    planVolcanoes: morphology.ops.planVolcanoes.config,
  }),
} as const);
```

Runtime sketch:
- Read `landMask` from `artifact:morphology.topography.landMask` (truth snapshot).
- Read `boundaryCloseness`, `boundaryType`, `shieldStability`, and `meltFlux` from Foundation truth (e.g., `artifact:foundation.plates` / `artifact:foundation.tectonics`).
- Derive `rngSeed` deterministically from the step id and run seed (e.g., `ctxRandom` + `ctxRandomLabel`).

## Gameplay/materialization step: `plot-volcanoes` (stamps + provides effect)

This step is Gameplay-owned by posture because it touches the adapter and provides an `effect:map.*`.
It can live inside a Morphology stage/phase (braided) without becoming “physics”: ownership comes from what it does and what it produces/consumes, not from the folder name.

Key boundary posture:
- This step MAY read Physics truth (`artifact:morphology.volcanoes`, `artifact:morphology.topography`, etc.).
- This step MUST NOT feed anything back into Physics truth (no “engine readback into truth”).
- This step performs adapter writes and provides a boolean `effect:map.*` execution guarantee.

Illustrative contract shape (artifact ids are illustrative; phase is the braid’s phase, not “map”):

```ts
import { Type, defineStep } from "@swooper/mapgen-core/authoring";

export const PlotVolcanoesStepContract = defineStep({
  id: "plot-volcanoes",
  phase: "gameplay",
  requires: ["effect:map.continentsPlotted"],
  provides: ["effect:map.volcanoesPlotted"],
  artifacts: {
    requires: ["artifact:morphology.topography", "artifact:morphology.volcanoes"],
    provides: [],
  },
  schema: Type.Object({}),
} as const);
```

Runtime sketch:
- Stamp via adapter using the Physics-owned `artifact:morphology.volcanoes` intent snapshot.
- Provide `effect:map.volcanoesPlotted` only after adapter writes complete successfully.
If a debug/UI overlay is needed, prefer trace events or an explicitly non-Physics-consumable `artifact:map.*Debug` surface.

Stamping rules:
- Do not publish any `artifact:map.realized.*` surfaces. The guarantee is the effect.
- Any engine-derived reads (e.g., Civ7 cliffs/elevation bands) must happen only in Gameplay and only after the relevant effect boundary (e.g., after `effect:map.elevationBuilt` for cliff/elevation-band correctness).
- Do not take raw engine ids as config unless it’s truly a user-facing choice; prefer adapter-resolved lookups for engine enums/constants.

## Complete, deterministic config example (no defaults)

This example is intentionally explicit to avoid hidden behavior changes from evolving defaults.

```ts
export const volcanoExampleConfig = {
  planVolcanoes: {
    strategy: "default",
    config: {
      enabled: true,
      baseDensityPerLandTile: 1 / 170,
      minSpacingTiles: 3,
      boundaryThreshold01: 0.35,
      boundaryWeight: 1.2,
      convergentMultiplier: 2.4,
      divergentMultiplier: 0.35,
      transformMultiplier: 1.1,
      meltFluxWeight: 0.12,
      shieldPenalty01: 0.6,
      randomJitterWeight: 0.08,
      minVolcanoes: 5,
      maxVolcanoes: 40,
    },
  },
} as const;
```
