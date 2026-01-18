# Hydrology & Climate

> **Status:** Canonical (domain-only causality + contract spec)
>
> **This doc is:** what Hydrology/Climate *means* in the pipeline: responsibilities, inputs, outputs, and the intended “landforms → climate + water” causal chain.
>
> **This doc is not:** SDK wiring guidance (step/stage file layout, authoring mechanics, adapters).

See also:
- `docs/system/libs/mapgen/hydrology-api.md` (code-facing schema/API reference)

## Overview

Hydrology/Climate turns landforms + oceans + planetary forcing into gameplay-relevant **climate fields** and **surface-water signals**.

This layer is “high-fidelity by abstraction”: it is not full CFD or time-stepped weather simulation, but it must still be **mechanism-driven** (circulation + moisture transport + orography + ocean coupling), so the generator produces believable regional wet/dry patterns and microclimates as a **derivative** of upstream physics.

The output contract is intentionally designed so downstream domains (Ecology, Placement, Narrative) can consume climate/water signals without depending on:
- implicit engine state,
- hidden globals,
- or duplicating climate heuristics in each consumer.

This layer is intentionally **gameplay-oriented** (fast, deterministic, tunable). It is not a goal to build a full physical simulation, but it is a goal to avoid “lazy” shortcuts that undermine realism (e.g., latitude bands as the primary driver of rainfall).

## Core responsibilities

1. **Thermal state:** produce temperature fields from insolation proxies + elevation lapse rate + ocean coupling (where enabled).
2. **Atmospheric circulation:** produce prevailing wind fields and storm-track/convergence scaffolds that drive moisture transport.
3. **Moisture cycle:** produce humidity + precipitation fields from evaporation sources + advection + rainout + orographic uplift.
4. **Land water budget:** produce runoff/discharge proxies derived from precipitation and evapotranspiration proxies.
5. **Routing + hydrography:** derive rivers/lakes/discharge surfaces deterministically (routing ownership must be explicit).
6. **Cryosphere:** model snow/ice presence and (optionally) bounded albedo feedback into local temperatures.

## Inputs (what must exist before Hydrology/Climate runs)

- **From Morphology:** elevation, land/ocean mask, and ideally bathymetry (or signed elevation). Optionally, flow routing intermediates if Morphology owns routing.
- **From Foundation / pipeline:** region mesh / neighbor graph, wrap semantics, and latitude (as forcing input, not a climate shortcut).
- **Recipe-level knobs:** semantic climate/hydrology knobs (e.g., dryness/temperature/seasonality), compiled to internal normalized configs.

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

### Cryosphere products

Cryosphere products are the canonical read path for:
- snow/ice masks or indices,
- and any albedo/ice feedback indicators used by Ecology or Narrative tagging.

### Buffers vs artifacts (contract nuance)

Hydrology/Climate outputs often begin life as **buffers** (mutable working layers) because they are built by multiple steps:

- temperature signal (baseline → orographic adjustment → latitude biasing),
- moisture/rainfall (baseline → rain shadow pass → regional biasing),
- routing indices (flow directions/accumulation when owned here),
- and derived indices (aridity/freeze).

Under current pipeline constraints, these buffers may be published **once** as artifacts for gating/typed access, then refined by subsequent steps without re-publishing.

## Key products

This doc intentionally does not lock exact data shapes, but the following conceptual products are expected to exist:

```ts
interface ClimateProducts {
  /** Prevailing wind direction/intensity (mechanism-driven; gameplay-oriented). */
  windVectors?: unknown;

  /** Temperature signal used by ecology/ice gating (field-based; seasonal amplitude optional). */
  temperature?: unknown;

  /** Humidity / moisture availability prior to any gameplay quantization. */
  humidity?: unknown;

  /** Precipitation (annual mean + seasonality amplitude; per-season optional). */
  precipitation?: unknown;

  /** Derived “how dry is it?” index computed from temperature + precipitation/humidity. */
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

interface CryosphereProducts {
  /** Snow/ice presence and/or snowpack proxy. */
  snowIce?: unknown;

  /** Optional albedo proxy (used only if cryosphere feedback is modeled). */
  albedo?: unknown;
}
```

## Optional extensions (gameplay-justified only)

If there is clear gameplay need and a regression harness, richer signals can be added behind the same product spine:

- Ocean heat transport / currents (influence coastal temperature and moisture supply).
- Cryosphere feedback (bounded ice/albedo loop).
- Soil inputs (owned by Ecology).

## Tuning parameters (conceptual)

Hydrology/climate should remain gameplay-tunable via **semantic knobs** that compile to internal normalized configs, for example:

- Global dryness / temperature / seasonality regimes (high leverage, deterministic).
- Ocean coupling and cryosphere enablement modes (performance/realism tradeoffs).
- Diagnostics toggles to inspect intermediate fields during refactors.

Non-negotiable: Hydrology does not accept **regional author overrides** (e.g., “swatches” or story motifs) that directly modify climate/water outcomes. If thematic “story shaping” exists at all, it is downstream-only and must never be presented as Hydrology physics.
