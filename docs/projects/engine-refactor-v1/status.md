# Status: MAPS Engine Refactor (snapshot)
**Updated:** current

## Completed
- Voronoi-only landmass path with `foundation` + `landmassPlates` as default stages; legacy landmass stub removed.
- Deterministic `PlateSeedManager` + `FoundationContext` exported and asserted; `foundation.*` config unified and legacy `worldModel` overrides warned away.
- Heightfield buffers in `MapContext`; landmass, coasts, mountains, volcanoes, lakes, and climate baseline/refine write through staging helpers.
- Margin overlays published via `StoryOverlays` and hydrated into `StoryTags`; `[Foundation]` diagnostics cover seed/plate/dynamics/surface plus ASCII/histograms.

## Gaps / In Progress
- Climate consumers still read `GameplayMap` instead of `ClimateField`; river flow data not exposed as a product.
- Narrative overlays (hotspots/rifts/orogeny/corridors/swatches) still mutate `StoryTags`; overlays registry only holds margins.
- Biomes/features/placement read legacy fields and do not require overlays or `ClimateField` inputs.
- No manifest/data-product validator; stages can still run without declared inputs beyond manual assertions.
- No automated smoke tests for orchestrator/context; verification is manual via diagnostics.

## Ready Next
1. Finish Phase C: make `ClimateField` the canonical rainfall source; surface river flow/summary data for downstream overlays.
2. Begin Phase D: refit story tagging to consume `FoundationContext`/`Heightfield`/`ClimateField` and publish overlays; retire direct `StoryTags` mutation.
3. Add manifest/data-product validation to gate stages on declared `requires`/`provides`.

## Spikes / Research
- Overlay payload schema for corridors/hotspots/rifts/swatches (fields + summary for consumers).
- River data product shape (graph vs. masks) and where to publish (`MapContext.buffers` vs. `StoryOverlays`).
- Validator design: lightweight runtime check vs. build-time lint for `requires`/`produces`.

## Testing & Observability
- Existing: `[Foundation]` logs, stage gating warnings, ASCII diagnostics (landmass, relief, rainfall, biomes), histograms.
- Needed: Vitest smoke for orchestrator using stub adapter and presets; assertions that `FoundationContext`/`Heightfield`/`ClimateField`/`StoryOverlays` are present before stages execute.
