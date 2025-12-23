# Status: MAPS Engine Refactor (snapshot)
**Updated:** current

## Completed
- Voronoi-only landmass path with `foundation` + `landmassPlates` as default stages; legacy landmass stub removed.
- Deterministic `PlateSeedManager` + `FoundationContext` exported and asserted; `foundation.*` config unified and legacy `worldModel` overrides warned away.
- Heightfield buffers in `MapContext`; landmass, coasts, mountains, volcanoes, lakes, and climate baseline/refine write through staging helpers.
- `[Foundation]` diagnostics cover seed/plate/dynamics/surface plus ASCII/histograms.
- Basic automated coverage for the stable slice: orchestrator integration + foundation smoke tests in `packages/mapgen-core/test/orchestrator/*`.

## Gaps / In Progress
- Climate consumers still read `GameplayMap` instead of `ClimateField`; river flow/summary data is not exposed as a product (Civ7 river generation remains engine-owned and should be wrapped, not replaced, in M3).
- Narrative overlays beyond the M2 slice remain unported: corridors/swatches/paleo and canonical overlay products are M3 work (`LOCAL-M3-STORY-SYSTEM`).
- Biomes/features/placement read legacy fields and do not require overlays or `ClimateField` inputs.
- No manifest/data-product validator; stages can still run without declared inputs beyond manual assertions.
- Test coverage is still thin outside the stable slice; most verification remains manual via diagnostics.

## Ready Next
1. Introduce `PipelineExecutor` / `MapGenStep` / `StepRegistry` and enforce runtime `requires`/`provides` gating (M3 baseline; M4 hardens with tests and broader validation).
2. Make `ClimateField` the canonical rainfall source and publish surface river flow/summary data for downstream overlays: `LOCAL-M3-HYDROLOGY-PRODUCTS` (`issues/LOCAL-M3-hydrology-products.md`).
3. Complete remaining story system modernization (corridors, swatches, paleo, canonical overlays) and migrate story logic into steps (M3).

## Spikes / Research
- Overlay payload schema for corridors/hotspots/rifts/swatches (fields + summary for consumers).
- River data product shape (graph vs. masks) and where to publish (`MapContext.buffers` vs. `StoryOverlays`).
- Validator design: lightweight runtime check vs. build-time lint for `requires`/`produces`.

## Testing & Observability
- Existing: `[Foundation]` logs, stage gating warnings, ASCII diagnostics (landmass, relief, rainfall, biomes), histograms.
- ~~Needed: Expand Vitest coverage beyond the stable slice; add invariant checks for `FoundationContext`/`Heightfield`/`ClimateField`/`StoryOverlays` at stage boundaries.~~  
  **Update (2025-12-21, M4 planning):** Mapgen-core tests run via Bun; M4 adds Bun smoke/regression tests and CI wiring (see `milestones/M4-target-architecture-cutover-legacy-cleanup.md`).
