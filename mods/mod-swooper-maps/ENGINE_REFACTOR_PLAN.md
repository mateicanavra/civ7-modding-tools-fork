# Swooper Engine Refactor Blueprint

_Updated: 2025-10-18_

## 1. Purpose
- Deliver a physics-first orchestration engine with a single authoritative world foundation (plates, uplift, winds, currents).
- Remove legacy fallbacks and implicit ordering so every stage consumes explicit inputs and produces explicit outputs.
- Establish a roadmap that supersedes the previous architecture audit and aligns staged manifest work with the new design.

## 2. Guiding Principles
- **One Source of Truth:** World foundations (tectonics, climate primitives) originate from a single module and feed every downstream stage.
- **Explicit Data Contracts:** Each stage declares required inputs and emitted outputs; no silent reuse of mutable globals.
- **Physics Before Narrative:** Morphology and climate operate on the finished heightfield before story overlays or placement fire.
- **Determinism & Observability:** Shared seeds and logging ensure reproducibility; diagnostics track data products instead of implicit state.
- **No Optional Physics:** The pipeline always runs with the physics stack enabled. Legacy non-physics flows become opt-in extensions, not defaults.

## 3. Target Stage Topology

| Cluster | Stages | Required Inputs | Outputs |
| --- | --- | --- | --- |
| **Foundations** | `worldModel`, `landmassPlates` | Engine seed, map dimensions, Civ Voronoi utilities | Plate seeds, plate tensors, initial landmask, `FoundationContext` |
| **Morphology** | `coastlines`, `mountains`, `volcanoes`, `lakes`, `terrainAdjust` | `FoundationContext`, heightfield buffer | Final heightfield, shore mask, margin metadata |
| **Hydrology & Climate** | `rivers`, `rainfallBaseline`, `climateRefine`, `humidity` | Heightfield, wind/currents, shore mask | Rainfall/humidity grids, water flow graph |
| **Narrative Overlays** | `storySeed`, `storyHotspots`, `storyRifts`, `storyOrogeny`, `storyCorridors`, `storySwatches` | Heightfield, climate grids, plate tensors | Overlay layers (`corridors`, `hotspots`, `swatches`, etc.) |
| **Biomes & Features** | `biomes`, `features` | Heightfield, climate grids, overlays | Final biomes/features, validation metrics |
| **Placement & Finalization** | `placement`, `finalize` | All prior fields | Player starts, resources, discoveries |

### Data Products
- `FoundationContext`: immutable object bundling plate IDs, boundary metadata, uplift/rift fields, wind/currents, shared seeds.
- `Heightfield`: staged in-memory terrain buffer (elevation + base terrain) flushed to the engine only at cluster boundaries.
- `ClimateField`: rainfall, humidity, temperature arrays (read-only).
- `StoryOverlays`: structured map of sparse overlays (corridors, hotspots, active/passive margins).

## 4. Phase Roadmap

### Phase A – Foundations Alignment
1. Promote `landmassPlates` to the default stage; demote Voronoi continents to an opt-in manifest entry.
2. Expose a deterministic `PlateSeed` from WorldModel so every consumer (landmass, diagnostics) shares identical Voronoi sites.
3. Emit `FoundationContext` and guard all downstream stages with runtime assertions (`stageEnabled` + presence of required data product).

### Phase B – Morphology Refactor
- [x] Introduce a heightfield buffer in `MapContext` (elevation + terrain layers).  
- [x] Port landmass post-processing, coastlines, islands, mountains, volcanoes, and lakes to operate on the buffer and advertise `heightfield` in stage outputs.  
- [ ] Replace `StoryTags.reset()` loops with calls that ingest the published margin metadata.

### Phase C – Hydrology & Climate Unification
- [x] Consolidate rainfall baseline, refinement, and swatch modifications into a single climate engine module.
- [x] Generate rivers after the climate baseline but before narrative overlays, capturing flow data for later overlays.
- [x] Publish `ClimateField` arrays and migrate consumers (biomes, story overlays) to them.

### Phase D – Narrative Overlays Modernization
1. Rewrite story tagging functions to consume `FoundationContext`, `Heightfield`, and `ClimateField` rather than direct `GameplayMap` probes.  
2. Store results in `StoryOverlays` (immutable snapshots per overlay).  
3. Update island, corridor, and feature layers to read overlays from the new registry.

### Phase E – Biomes, Features, Placement Harmonization
1. Port biome and feature layers to the new data contracts; ensure they treat `StoryOverlays` as read-only.  
2. Rework placement to require explicit prerequisites (`requires: ['climate', 'narrative']`) and capture results in a `PlacementSummary`.

### Phase F – Manifest Enforcement & Cleanup
1. Extend manifest descriptors with `consumes`/`produces` metadata and validate them at runtime.  
2. Strip legacy compatibility shims (implicit Voronoi fallback, StoryTag resets).  
3. Document the final flow in `DESIGN.md` and retire obsolete sections in the audit archive.

## 5. Tooling & Verification
- Add dev-time checks that confirm data-product availability before stage execution.  
- Extend `bootstrap/dev.js` diagnostics to log `FoundationContext` stats, heightfield slices, and overlay summaries per stage.  
- Build smoke tests that run the orchestrator with minimal and maximal presets, asserting that no stage executes without its declared inputs.

## 6. Risks & Mitigations
- **Complex migration:** Tackle per cluster to prevent cross-cutting regressions; keep feature flags limited to staging branches.  
- **Performance regressions:** Instrument buffer operations; cache expensive computations (Voronoi, climate) to reuse across diagnostics.  
- **Manifest drift:** Gate new stages behind the `consumes/produces` validator to prevent future entropy.

## 7. Next Actions
1. Land the plate-generation consolidation (see `PLATE_GENERATION_REFACTOR.md`).  
2. Draft interface definitions (`FoundationContext`, `Heightfield`, `ClimateField`, `StoryOverlays`) and add TypeScript typings in `map_config.types.js`.  
3. Update `SWOOPER_MAPS_ARCHITECTURE_AUDIT.md` to reference this plan and mark the legacy flow as deprecated.
