# Hydrology & Climate Stage Architecture

> **Status:** Target (post‑M3). M3 is wrap‑first: hydrology/climate runs as wrapper steps to preserve map quality; the sub-step breakdown and optional extensions below are not required for M3.

## 1. Overview

The **Hydrology & Climate** phase turns landform + latitude into gameplay‑relevant fields and signals:

- **`ClimateField`** (authoritative rainfall/moisture + temperature bands for consumers)
- **River / lake signals** that downstream systems can use without reaching into `GameplayMap`

This is intentionally **gameplay‑oriented** (fast, deterministic, tunable). It is not a goal to build a full simulation.

## 2. Current Implementation (post‑M2)

Today’s stable slice is orchestrator‑centric; climate logic exists in TypeScript layers, while Civ7 river generation remains **engine-owned** (via the adapter).

When you need “what is wired right now,” prefer:

- `docs/projects/engine-refactor-v1/status.md`
- `docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md`
- `docs/projects/engine-refactor-v1/milestones/M2-stable-engine-slice.md`
- `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md`

**M3 note:** M3 will likely wrap the existing climate implementation as a step first; splitting into the finer-grained sub-steps below is a post‑M3 refactor.

## 3. Target Data Model

### 3.1. Inputs (Read-Only)

- `FoundationContext` / `Heightfield` (elevation, terrain mask, slopes)
- Latitude / basic planetary constants (if modeled)
- Narrative overlays that influence rainfall (where applicable)

### 3.2. Canonical Products

**`ClimateField`** should be the canonical read path for rainfall/moisture by downstream systems (overlays, biomes, placement). Temperature is included where it is needed for ecology/ice/biomes.

### 3.3. Artifact Containers (Target)

The target architecture can optionally carry intermediate artifacts for future steps. These are not M3 commitments.

```ts
interface ClimateArtifacts {
  /** Prevailing wind direction/intensity (coarse; gameplay-oriented). */
  windVectors?: Vector2[];

  /** Temperature field used by ecology/ice gating (coarse bands are acceptable). */
  temperatureMap?: Float32Array;

  /** Moisture/rainfall field prior to gameplay quantization. */
  moistureMap?: Float32Array;
}

interface HydrologyArtifacts {
  /** Minimal river summary for consumers; shape is intentionally flexible. */
  rivers?: unknown;

  /** Optional lake mask for consumers/diagnostics. */
  lakeMask?: Uint8Array;
}
```

### 3.4. Optional Extensions (post‑M3, gameplay‑justified only)

If we have clear gameplay need and a regression harness, we can add richer artifacts behind the same product spine:

- Ocean heat transport / currents (to influence coastal temperature/rainfall)
- Cryosphere feedback (ice/albedo loops)
- Pedology/soil inputs (owned by Ecology)

## 4. Target Pipeline Shape

### 4.1. M3 (Wrap‑First) Boundary

- `climateBaseline` + `climateRefine` (wrappers around existing TS climate layers; publish `artifact:climateField`)
- `rivers` (wrapper around engine river modeling; publishes `artifact:riverAdjacency` as a `Uint8Array` 0/1 mask computed via `EngineAdapter.isAdjacentToRivers()` once `state:engine.riversModeled` is true)
- `ClimateField.humidity` is currently a placeholder in M3 (not synchronized or consumed); do not treat it as meaningful until it has a defined source/contract.
- Legacy/non-step call sites may still read rainfall via the adapter when `artifact:climateField` is not published; step-executed consumers should treat the artifact as canonical.

### 4.2. Post‑M3 (Selective Refinement)

Once products and tests stabilize, the wrapper can be decomposed into explicit steps, for example:

- `hydrology.climate.baseline` (latitude/elevation baseline)
- `hydrology.climate.refine` (orographic/rain‑shadow adjustments, narrative swatches)
- `hydrology.surface.lakes` (depression filling / lake masks, if needed)
- `hydrology.surface.rivers` (product publication and any non-engine summaries)

## 5. Configuration (Target)

Hydrology/climate should be controlled via `MapGenConfig` in a gameplay‑tunable way. Exact shapes live in the validated schema; this doc only describes intent:

- Global wet/dry bias and rain‑shadow strength (high leverage)
- Optional narrative “swatches” / regional overrides (story-driven)
- Diagnostics toggles (to inspect outputs during refactors)
