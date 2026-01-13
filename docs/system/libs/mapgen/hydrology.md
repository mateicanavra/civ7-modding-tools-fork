# Hydrology & Climate

> **Status:** Canonical (domain-only causality + contract spec)
>
> **This doc is:** what Hydrology/Climate *means* in the pipeline: responsibilities, inputs, outputs, and the intended “landforms → climate + water” causal chain.
>
> **This doc is not:** SDK wiring guidance (step/stage file layout, authoring mechanics, adapters).

## Overview

Hydrology/Climate turns landforms + latitude into gameplay-relevant **climate fields** and **surface-water signals**.

The output contract is intentionally designed so downstream domains (Ecology, Placement, Narrative) can consume climate/water signals without depending on:
- implicit engine state,
- hidden globals,
- or duplicating climate heuristics in each consumer.

This layer is intentionally **gameplay-oriented** (fast, deterministic, tunable). It is not a goal to build a full physical simulation.

## Core responsibilities

1. **Temperature:** produce a stable temperature signal (coarse bands are acceptable if they are consistent and explainable).
2. **Moisture / rainfall:** produce a stable moisture/rainfall signal (with explicit “wet/dry bias” levers).
3. **Orography and rain shadows (coarse):** reflect elevation-driven effects without requiring a heavy simulation.
4. **Surface water routing (minimal, correct):** derive rivers/lakes/wetness signals from elevation + moisture in a way consumers can trust.

## Inputs (what must exist before Hydrology/Climate runs)

- **From Morphology:** elevation, land/ocean mask, and (optionally) flow routing intermediates if Morphology already computed them.
- **From Foundation (optional):** large-scale tectonic/relief hints when needed for “macro climate” plausibility.
- **Global signals:** latitude, wrap semantics, and any recipe-level wind/hemisphere presets.

## Outputs (products Hydrology/Climate owns)

Hydrology/Climate publishes a small spine of products that downstream domains treat as authoritative read paths:

### Climate field

A climate field is the canonical read path for:
- rainfall/moisture (authoritative for biomes, placement bias, narrative shaping),
- temperature (authoritative for biome gating, snow/ice gating, placement bias),
- and any coarse derived indices (aridity, freeze index) that consumers should not recompute ad hoc.

### Hydrology products

Hydrology products are the canonical read path for:
- rivers (at the granularity required by downstream gameplay; representation is allowed to evolve),
- lakes/lake mask (if modeled),
- and wetness/runoff proxies (useful for wetlands, fertility, and placement biases).

## Key products

This doc intentionally does not lock exact data shapes, but the following conceptual products are expected to exist:

```ts
interface ClimateProducts {
  /** Prevailing wind direction/intensity (coarse; gameplay-oriented). */
  windVectors?: unknown;

  /** Temperature signal used by ecology/ice gating (coarse bands are acceptable). */
  temperature?: unknown;

  /** Moisture/rainfall signal prior to any gameplay quantization. */
  moisture?: unknown;

  /** Derived “how dry is it?” index computed from temperature + moisture. */
  aridityIndex?: unknown;

  /** Derived “how frozen is it?” index computed from temperature + elevation/latitude. */
  freezeIndex?: unknown;
}

interface HydrologyProducts {
  /** Rivers (representation intentionally flexible but must be stable for consumers). */
  rivers?: unknown;

  /** Optional lake mask for consumers/diagnostics. */
  lakeMask?: unknown;

  /** Optional wetness/runoff proxy useful for wetlands/fertility signals. */
  wetnessIndex?: unknown;
}
```

## Optional extensions (gameplay-justified only)

If there is clear gameplay need and a regression harness, richer signals can be added behind the same product spine:

- Ocean heat transport / currents (influence coastal temperature/rainfall).
- Cryosphere feedback (ice/albedo loops).
- Soil inputs (owned by Ecology).

## Tuning parameters (conceptual)

Hydrology/climate should remain gameplay-tunable, for example:

- Global wet/dry bias and rain-shadow strength (high leverage).
- Optional regional overrides (designer/story-driven).
- Diagnostics toggles to inspect intermediate fields during refactors.
