# Map Generation Pipeline Explainer - Outline

## Narrative Approach: "Layers of Control"

Build understanding floor-by-floor through the 6-layer stack, with each layer showing:
- What it receives (data products in)
- What it produces (data products out)
- Where control exists (config knobs)
- What's tight vs loose (gaps/opportunities)

---

## Slide 1: The Engine Layer (Layer 0)
**Purpose**: Establish what Civ VII gives us—the foundation we cannot escape

**Content**:
- Engine globals: `GameplayMap`, `TerrainBuilder`, `ResourceBuilder`, `FertilityBuilder`, `GameInfo`
- Base-standard imports: `assign-starting-plots.js`, `elevation-terrain-generator.js`, `map-utilities.js`
- Voronoi utilities: Native plate generation we wrap and seed
- Key insight: Headless generation impossible—we're married to the engine

**Block type**: `explanation` with diagram showing engine → our code boundary

**Data products**: None in, Engine APIs out

**Control surface**: Limited—we control how we *call* the engine, not what it does

**Gap/opportunity**: Tight coupling means we can't unit test in isolation. Accepted tradeoff.

---

## Slide 2: Physics Foundation (Layer 1)
**Purpose**: The single source of truth for world physics

**Content**:
- `foundation` stage creates `FoundationContext`
- Contains: plate IDs, tectonic tensors (uplift, rift, stress), atmospheric drivers (wind, currents)
- `landmassPlates` stage uses FoundationContext to project plate-aware land mask
- Deterministic seeding via `PlateSeedManager`

**Block type**: `layers` showing FoundationContext structure

**Data products**: Engine seed in → `FoundationContext` out (immutable, frozen)

**Control surface**:
- `foundation.seed` (mode, fixed, offsets)
- `foundation.plates` (count, convergenceMix, relaxation, jitter)
- `foundation.dynamics` (wind, currents, mantle, directionality)
- `foundation.surface` (baseWaterPercent, band geometry)

**Gap/opportunity**: Phase A complete. Solid foundation. Future: consumes/produces validation.

---

## Slide 3: Heightfield Buffer (Layer 2 - Morphology)
**Purpose**: Where terrain gets sculpted without micro-mutating the engine

**Content**:
- In-memory staging buffer: `elevation` (Int16Array), `terrain` (Uint8Array), `landMask`
- Stages: `coastlines`, `islands`, `mountains`, `volcanoes`, `lakes`
- Batched sync: Changes flush to engine only at cluster boundaries via `syncHeightfield()`
- Why buffer? Prevents micro-mutations from getting out of sync

**Block type**: `diagram` showing buffer → engine sync pattern

**Data products**: `FoundationContext` in → `Heightfield` out

**Control surface**:
- `coastlines.*` (ruggedization, fjord density)
- `mountains.*` (plate-aware placement, uplift sensitivity)
- `islands.*` (chain placement, protected sea lanes)
- Per-stage enable/disable via `stageManifest`

**Gap/opportunity**: Phase B complete. `StoryOverlays.margins` now published. Question: are fjord/smoothing ratios well-tuned?

---

## Slide 4: Climate System (Layer 3)
**Purpose**: Adding atmosphere to the terrain

**Content**:
- Climate buffer: rainfall + humidity arrays (parallel to heightfield)
- Two-phase approach:
  1. `climateBaseline`: Latitude bands + orographic bonuses
  2. `climateRefine`: Water gradients, lee shadows, river corridors, basin effects
- Rivers run between baseline and refinement (need flow data for corridors)

**Block type**: `explanation` with climate buffer flow

**Data products**: `Heightfield` + wind/currents in → `ClimateField` out (rainfall, humidity, temperature)

**Control surface**:
- `climate.baseline.*` (bands, orographic, coastal, noise)
- `climate.refine.*` (waterGradient, orographic, riverCorridor, lowBasin)
- `climate.swatches.*` (macroDesertBelt, equatorialRainbelt, etc.)

**Gap/opportunity**: Phase C complete. Swatches may need tuning—do desert belts land where expected?

---

## Slide 5: Narrative Overlays (Layer 4)
**Purpose**: Non-destructive annotation on locked terrain

**Content**:
- Key concept: Overlays READ physics, WRITE tags—never modify heightfield/climate
- `StoryOverlays` registry: Immutable snapshots (`margins`, `corridors`, `hotspots`)
- `StoryTags`: Mutable working sets hydrated from overlays
- Stages: `storySeed`, `storyHotspots`, `storyRifts`, `storyOrogeny`, `storyCorridors`, `storySwatches`
- Margin system example: Active margins → fjords, passive shelves → reefs

**Block type**: `layers` showing overlay registry pattern

**Data products**: `Heightfield` + `ClimateField` + `FoundationContext` in → `StoryOverlays` + `StoryTags` out

**Control surface**:
- `story.*` (hotspot count, rift frequency, corridor width)
- Per-overlay config for density and placement biases

**Gap/opportunity**: Phase D in progress. Overlays still consume direct `GameplayMap` probes—need migration to buffer reads. StoryTags singleton pattern is legacy; moving to overlay registry.

---

## Slide 6: Biomes & Features (Layer 5)
**Purpose**: Decorating the terrain with gameplay elements

**Content**:
- Biomes: Vanilla pass first, then gentle bias overlays from StoryTags
- Features: Validated placement via `TerrainBuilder.canHaveFeature()`
- Consumes all prior layers: heightfield, climate, overlays
- Biased by story: hotspots get volcanoes, passive margins get reefs

**Block type**: `explanation` with consumption diagram

**Data products**: All prior layers in → Final biomes/features + validation metrics out

**Control surface**:
- `biomes.*` (bias modifiers)
- `features.*` (placement weights, StoryTag bonuses)

**Gap/opportunity**: Phase E pending. Need to port to new data contracts. Currently may be re-probing engine instead of reading buffers.

---

## Slide 7: Configuration Control (The Meta-Layer)
**Purpose**: How all the knobs are organized and composed

**Content**:
- 3-tier system:
  1. **Entry files**: Game-facing, tiny, declarative (`epic-diverse-huge.js`)
  2. **Bootstrap pipeline**: `entry.js` → `runtime.js` → `resolved.js` → `tunables.js`
  3. **Orchestrator**: Calls `rebind()`, reads tunables, executes layers
- Preset composition: BASE_CONFIG → presets (ordered) → overrides
- Config is frozen—immutable after bootstrap

**Block type**: `diagram` showing 3-tier flow

**Data products**: Presets + overrides in → Frozen config + live tunables out

**Control surface**: Everything flows through this. Add variant = new entry file + preset.

**Gap/opportunity**: Solid architecture. Future: hot reload, preset validation, config inspector.

---

## Slide 8: How Layers Communicate (Data Contracts)
**Purpose**: The connective tissue—how data flows and where contracts exist

**Content**:
- Stage manifest: Ordered checklist with `requires`/`provides` declarations
- Data products chain: `FoundationContext` → `Heightfield` → `ClimateField` → `StoryOverlays`
- Contract enforcement: Runtime assertions gate execution
- Canonical principle: "Physics Before Narrative"

**Block type**: `diagram` showing full data flow with contract checkpoints

**Data products**: Full chain visualization

**Control surface**: Stage enablement via manifest, dependency validation

**Gap/opportunity**: Phase F pending. Need `consumes`/`produces` metadata in manifest. Currently some stages bypass contract checks. This is likely contributing to inconsistent results—stages may run without proper inputs.

---

## Slide 9: Where We Are & Where Control Is Needed
**Purpose**: Synthesis—current state, gaps, and improvement opportunities

**Content**:
- Phases A-C: Complete (Foundations, Morphology, Climate)
- Phase D: In progress (Narrative modernization)
- Phases E-F: Pending (Biomes/Features harmonization, Manifest enforcement)
- Key gaps:
  1. Some stages still probe engine directly instead of reading buffers
  2. StoryTags singleton vs overlay registry inconsistency
  3. No `consumes`/`produces` validation yet—stages can run with missing inputs
  4. Tuning: Are the config knobs producing expected outputs?

**Block type**: `explanation` with status summary

**Recommendations**:
1. Complete Phase D (narrative overlay migration) to ensure consistent buffer reads
2. Add manifest contract validation (Phase F) to catch missing dependencies
3. Build diagnostic tooling to visualize what each stage actually produces
4. Systematic tuning pass once contracts are enforced

---

## Key Takeaways

1. **6-layer stack**: Engine → Foundation → Morphology → Climate → Narrative → Biomes
2. **Data products are the handoff points**: FoundationContext, Heightfield, ClimateField, StoryOverlays
3. **Control exists per-layer via config namespaces**: `foundation.*`, `climate.*`, `story.*`, etc.
4. **Current gaps are in Phases D-F**: Overlay modernization, contract enforcement
5. **Results inconsistency likely due to**: Stages bypassing buffer reads, missing dependency validation
