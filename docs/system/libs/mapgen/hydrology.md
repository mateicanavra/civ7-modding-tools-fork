# Hydrology & Climate

## Overview

Hydrology & Climate turns landform + latitude into gameplay-relevant fields and signals.

- A canonical climate view (rainfall/moisture and temperature bands) for downstream consumers.
- River/lake signals that can be consumed without relying on implicit engine state.

This layer is intentionally **gameplay-oriented** (fast, deterministic, tunable). It is not a goal to build a full physical simulation.

## Key products

### Climate field

A climate field is the canonical read path for:

- Rainfall / moisture (authoritative for biomes, placement bias, narrative shaping).
- Temperature (coarse bands are acceptable where gameplay needs them).

### Optional intermediate products

```ts
interface ClimateProducts {
  /** Prevailing wind direction/intensity (coarse; gameplay-oriented). */
  windVectors?: Vector2[];

  /** Temperature field used by ecology/ice gating (coarse bands are acceptable). */
  temperatureMap?: Float32Array;

  /** Moisture/rainfall field prior to gameplay quantization. */
  moistureMap?: Float32Array;
}

interface HydrologyProducts {
  /** Minimal river summary for consumers; shape is intentionally flexible. */
  rivers?: unknown;

  /** Optional lake mask for consumers/diagnostics. */
  lakeMask?: Uint8Array;
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
