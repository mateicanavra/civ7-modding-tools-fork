# Illustrative Examples

These examples are meant to show the *full chain* and reinforce the invariants above. They are consolidated from existing proposal examples and updated minimally for consistency with the locked knobs model.

### Example A — Ecology stage: single author-facing surface (`knobs` + config), optional stage `public`

This example uses ecology to illustrate the canonical “single surface” model:

- the stage author-facing config is one object
- `knobs` is always a field on that object
- the stage may optionally define a `public` view that compiles into an internal step-id keyed map

Author input (recipe config is stage-id keyed; each stage config is a single object):

```ts
const config = {
  ecology: {
    knobs: {
      // stage-scoped author controls that may influence step normalization,
      // but are not part of any step config shape:
      vegetationDensityBias: 0.15,
    },

    // If ecology defines a stage `public` view, these are *public fields* (not step ids).
    // (If ecology is internal-as-public, the non-knob portion would instead be step ids.)
    vegetation: { /* public vegetation-facing fields */ },
    wetlands: { /* public wetlands-facing fields */ },
  },

  // A second stage in the same recipe may be internal-as-public. The non-knob portion is
  // treated as a (partial) step-id keyed map at compile-time (no recipe-wide mode flag).
  placement: {
    knobs: { /* optional */ },
    "derive-placement-inputs": { /* internal step config (shape unknown at Phase A) */ },
    placement: { /* internal step config */ },
  },
};
```

Stage contract sketch (public view + `compile` mapping; `createStage` computes `surfaceSchema` + `toInternal`):

```ts
import { Type } from "typebox";
import { createStage } from "@swooper/mapgen-core/authoring";

import { plotVegetationStep } from "./steps/plot-vegetation/index.js";
import { plotWetlandsStep } from "./steps/plot-wetlands/index.js";

export const ecologyStage = createStage({
  id: "ecology",
  steps: [plotVegetationStep, plotWetlandsStep] as const,

  knobsSchema: Type.Object(
    {
      vegetationDensityBias: Type.Number({ minimum: -1, maximum: 1, default: 0 }),
    },
    { additionalProperties: false, default: {} }
  ),

  public: Type.Object(
    {
      vegetation: Type.Object({}, { additionalProperties: false, default: {} }),
      wetlands: Type.Object({}, { additionalProperties: false, default: {} }),
    },
    { additionalProperties: false, default: {} }
  ),

  compile: ({ env, knobs, config }) => {
    void env;
    void knobs;
    return {
      // Compile maps public fields → internal step-id keyed map.
      // (Each step config is still `unknown`/partial here; strict step canonicalization happens in Phase B.)
      "plot-vegetation": config.vegetation,
      "plot-wetlands": config.wetlands,
    };
  },
} as const);
```

Phase A output for `ecology` (conceptual, after `surfaceSchema` validation and `toInternal(...)`):

```ts
{
  knobs: { vegetationDensityBias: 0.15 },
  rawSteps: {
    // NEW (planned): this is the intended domain-modeling shape:
    // ecology exposes multiple focused ops and composes them in a step named `plot-vegetation`
    "plot-vegetation": {
      trees: { /* op envelope */ },
      shrubs: { /* op envelope */ },
      groundCover: { /* op envelope */ },
    },
    "plot-wetlands": { /* ... */ },
  }
}
```

Note:
- The stage `public` view (if present) is a compile-time authoring UX affordance; the engine only ever sees the compiled internal step map.
- This stage example intentionally avoids “mega-op” modeling (see Example B).

### Example B — Ecology “plot-vegetation” step: multiple focused ops (not a mega-op) + top-level envelope normalization

Why this example exists:
- If each step only wraps one giant “plan vegetation” op, ops injection and envelope normalization look like indirection “for no reason”.
- The domain modeling guidelines explicitly prefer **multiple focused ops** + a step that orchestrates them (e.g. `plot-vegetation`).
- Baseline note (repo reality): ecology currently includes composite ops such as `mods/mod-swooper-maps/src/domain/ecology/ops/features-plan-vegetation/index.ts` (`planVegetation`). That shape is treated as a legacy “mega-op” smell in the target modeling.

Contract (NEW (planned) step; op contracts may already exist in split form or may be introduced during domain refactors):

```ts
import { defineStepContract } from "@swooper/mapgen-core/authoring";
import * as ecologyContracts from "@mapgen/domain/ecology/contracts";

// NEW (planned): domains export contract-only entrypoints for step contracts.
// Baseline today: `ecology.ops` exists; individual op modules export contracts, but there may be no
// consolidated `@mapgen/domain/ecology/contracts` surface yet.

export const PlotVegetationContract = defineStepContract({
  id: "plot-vegetation",
  phase: "ecology",
  // Ops are declared as contracts (DX); `defineStepContract` derives `OpRef`s internally.
  ops: {
    // Example “focused ops” (preferred):
    // - plan-tree-vegetation
    // - plan-shrub-vegetation
    // - plan-ground-cover
    //
    // Repo note: the precise contracts are a domain-refactor deliverable. Today, ecology already has
    // several focused op contracts under `mods/mod-swooper-maps/src/domain/ecology/ops/**`, but the
    // canonical target is to keep splitting toward these focused “plan-*” ops.
    //
    // DX model: domains export contracts separately from implementations:
    // - `@mapgen/domain/<domain>/contracts` is contract-only (safe to import in step contracts)
    // - `@mapgen/domain/<domain>` may include implementation registries (used only in step modules)
    trees: ecologyContracts.planTreeVegetation,
    shrubs: ecologyContracts.planShrubVegetation,
    groundCover: ecologyContracts.planGroundCover,
  },
  // If schema is omitted here, an ops-derived schema is allowed (I7) and will be strict:
  // - required: `trees`, `shrubs`, `groundCover` (prefilled before schema normalization)
  // - no extra top-level keys (O3: no “extras” hybrid for v1)
});
```

Note on keys:
- The `ops` keys (`trees`, `shrubs`, `groundCover`) are the authoritative **top-level envelope keys** in the step config (I6).
- The compiler discovers envelopes from `step.contract.ops` keys only; it does not scan nested config objects.

Raw internal step config input (what Phase A produces for `plot-vegetation`; op envelopes are **top-level keys** only):

```ts
const rawStepConfig = {
  trees: { strategy: "default", config: { density: 0.40 } },
  // shrubs omitted entirely (allowed in author input; will be prefilled)
  groundCover: { strategy: "default", config: { density: 0.15 } },
};
```

Compiler execution (Phase B excerpt; with stage knobs threaded via ctx):
- `prefillOpDefaults` injects missing `shrubs` envelope from op contract defaults (via `buildOpEnvelopeSchema(contract.id, contract.strategies).defaultConfig`), before strict schema validation.
- `normalizeStrict(step.schema, prefilled)` default/cleans the step fields and rejects unknown keys.
- `step.normalize(cfg, { env, knobs })` may bias envelope values using `knobs` (value-only, shape-preserving).
  - Example: apply `knobs.vegetationDensityBias` by adjusting `trees.config.density` and `groundCover.config.density`.
- `normalizeOpsTopLevel(...)` normalizes envelopes for `trees`, `shrubs`, `groundCover` by contract ops keys only (no nested traversal).
  - Op normalization consults the op’s compile-time normalization hook (baseline today: `DomainOp.resolveConfig(cfg, env)`; renamed to `normalize`), which dispatches by `envelope.strategy` under the hood.

### Example C — Ops injection into `plot-vegetation` (why “bind ops” is not just indirection)

Canonical pattern:
- step **contracts** depend only on op contracts (cheap; no op impl bundling)
- step **modules** bind op contracts to implementations from the domain registry (by id)
- runtime `step.run` uses injected ops; it does not import op implementations directly

One plausible (NEW (planned)) step module shape:

```ts
import { bindRuntimeOps, createStep } from "@swooper/mapgen-core/authoring";

import * as ecology from "@mapgen/domain/ecology";

// Module-scope closure binding (canonical): ops are not passed through engine signatures.
const ops = bindRuntimeOps(PlotVegetationContract.ops, ecology.runtimeOpsById);

export default createStep(PlotVegetationContract, {
  // Compile-time only normalization hook; sees `{ env, knobs }`.
  normalize: (config, { env, knobs }) => {
    void env;
    if (knobs.vegetationDensityBias != null) {
      // value-only adjustment; must not add/remove keys
      return {
        ...config,
        trees: {
          ...config.trees,
          config: {
            ...config.trees.config,
            density: config.trees.config.density + knobs.vegetationDensityBias,
          },
        },
      };
    }
    return config;
  },

  // Runtime handler: uses injected ops and canonical config; no defaulting/cleaning here.
  run: (context, config) => {
    const treePlacements = ops.trees.runValidated(/* input */, config.trees);
    const shrubPlacements = ops.shrubs.runValidated(/* input */, config.shrubs);
    const coverPlacements = ops.groundCover.runValidated(/* input */, config.groundCover);
    // apply/publish effects (step boundary)
    void treePlacements;
    void shrubPlacements;
    void coverPlacements;
    void context;
  },
});
```

This example shows the *intended* reason ops are injected:
- steps orchestrate multiple focused ops and own effects
- ops remain pure, reusable, testable contracts
- contracts remain light and do not bundle implementations

---
