# Status: MAPS Engine Refactor (snapshot)
**Updated:** current

## Completed
- Voronoi-only landmass path with `foundation` + `landmassPlates` as default stages; legacy landmass stub removed.
- Deterministic `PlateSeedManager` + `FoundationContext` exported and asserted; `foundation.*` config unified and legacy `worldModel` overrides warned away.
- Heightfield buffers in `MapContext`; landmass, coasts, mountains, volcanoes, lakes, and climate baseline/refine write through staging helpers.
- `[Foundation]` diagnostics cover seed/plate/dynamics/surface plus ASCII/histograms.

## Gaps / In Progress
- Climate consumers still read `GameplayMap` instead of `ClimateField`; river flow data not exposed as a product.
- Narrative overlays are still largely unported: minimal parity (margins/hotspots/rifts ± orogeny) is now scoped for M2 (`CIV-36`), while corridors/swatches/paleo and canonical overlay products remain M3 work (`LOCAL-M3-STORY-SYSTEM`).
- Biomes/features/placement read legacy fields and do not require overlays or `ClimateField` inputs.
- No manifest/data-product validator; stages can still run without declared inputs beyond manual assertions.
- No automated smoke tests for orchestrator/context; verification is manual via diagnostics.

## Ready Next
1. Restore minimal story parity (margins/hotspots/rifts ± orogeny) via orchestrator stages so narrative‑aware consumers react again (M2).
2. Make `ClimateField` the canonical rainfall source and surface river flow/summary data for downstream overlays (Phase C / early M3).
3. Complete remaining story system modernization (corridors, swatches, paleo, canonical overlays) and migrate story logic into steps after pipeline refactor (M3).
4. Introduce `PipelineExecutor` / `MapGenStep` / `StepRegistry` on top of the stabilized data products, and add manifest/data-product validation to gate stages on declared `requires`/`provides` (late M3–M4).

## Spikes / Research
- Overlay payload schema for corridors/hotspots/rifts/swatches (fields + summary for consumers).
- River data product shape (graph vs. masks) and where to publish (`MapContext.buffers` vs. `StoryOverlays`).
- Validator design: lightweight runtime check vs. build-time lint for `requires`/`produces`.

## Testing & Observability
- Existing: `[Foundation]` logs, stage gating warnings, ASCII diagnostics (landmass, relief, rainfall, biomes), histograms.
- Needed: Vitest smoke for orchestrator using stub adapter and presets; assertions that `FoundationContext`/`Heightfield`/`ClimateField`/`StoryOverlays` are present before stages execute.
