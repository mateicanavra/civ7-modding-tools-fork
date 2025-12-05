# Project: MAPS Engine Refactor
**Status:** Active
**Timeline:** TBD — aligns with Swooper Maps feature cadence
**Teams:** Swooper Maps (solo / AI-assisted)

## Purpose & Scope
- Deliver a physics-first orchestration engine with a single authoritative world foundation (plates, uplift, winds, currents).
- Remove legacy fallbacks and implicit ordering so every stage consumes explicit inputs and produces explicit outputs.
- Keep physics mandatory (Voronoi + plate stack) and deterministic, with strong diagnostics and logging.

## Current Status (snapshot)
- Foundations and morphology: ✅ Complete. Voronoi-only landmass pipeline, deterministic `PlateSeedManager`, `FoundationContext` emitted and asserted, heightfield buffers in place. Mountains/volcanoes, coasts, and landmass generation consume the physics stack.
- Climate: ⚠️ Partial. Climate engine is centralized and rivers run after baseline, but consumers still read `GameplayMap` instead of `ClimateField`; river flow data is not published.
- Narrative overlays: ⏳ Not modernized. Margin overlays exist, but other story passes still mutate `StoryTags` directly and do not publish immutable overlays.
- Biomes/features/placement: ⏳ Legacy read paths (GameplayMap + StoryTags). No overlay/ClimateField consumption yet.
- Manifest enforcement: ⏳ Manifest describes `requires`/`provides`, but no runtime validator for data products; legacy shims still allow silent drift.
- Tests/verification: ⏳ No automated smoke for the orchestrator/context; diagnostics exist via `[Foundation]` logs and stage gating warnings.

## Next Stage
- Finish Phase C: Adopt `ClimateField` as the primary rainfall source for consumers; expose river flow/summary data; wire rainfall/temperature readers through `MapContext.buffers`.
- Kick off Phase D: Rewrite story tagging to consume `FoundationContext` + `Heightfield` + `ClimateField`, and publish overlays (corridors/hotspots/rifts/swatches) into `StoryOverlays` instead of mutating globals.
- Add a lightweight manifest/data-product validator to fail fast when `requires` inputs are missing.

## Phase Roadmap & Status
- Phase A – Foundations Alignment: ✅ Done (Voronoi default, deterministic plate seed, `FoundationContext`, unified `foundation.*` config, legacy `worldModel` shims removed, `[Foundation]` diagnostics).
- Phase B – Morphology Refactor: ✅ Done (heightfield buffers, plate-driven landmass + coastlines, mountains/volcanoes/lakes write through buffers, margins overlay published).
- Phase C – Hydrology & Climate Unification: ⚠️ Partial
  - Done: Centralized climate engine; rivers after baseline; `ClimateField` buffers exist.
  - Outstanding: Consumers still read `GameplayMap`; no river flow graph/overlay; rainfall/humidity not treated as canonical data products.
- Phase D – Narrative Overlays Modernization: ⏳ Not started (story passes still rely on `StoryTags`; overlays registry only holds margins).
- Phase E – Biomes, Features, Placement Harmonization: ⏳ Not started (needs read-only overlays + `ClimateField` consumption and explicit prerequisites).
- Phase F – Manifest Enforcement & Cleanup: ⏳ Not started (needs consumes/produces validation and removal of legacy fallbacks).

## Guiding Principles
- One source of truth: foundations (tectonics, climate primitives) originate from a single module and feed every downstream stage.
- Explicit data contracts: stages declare required inputs and emitted outputs.
- Physics before narrative: morphology and climate operate on the finished heightfield before story overlays/placement.
- Determinism & observability: shared seeds and logging ensure reproducibility; diagnostics track data products instead of implicit state.
- No optional physics: physics stack is always on; legacy non-physics flows become opt-in extensions.
- Voronoi physics stack: the Civ VII Voronoi + physics integration is canonical; “legacy” never reuses the Voronoi label.

## Target Stage Topology
| Cluster | Stages | Required Inputs | Outputs |
| --- | --- | --- | --- |
| Foundations | `foundation`, `landmassPlates` | Engine seed, map dimensions, Civ Voronoi utilities | Plate seeds, plate tensors, initial landmask, `FoundationContext` |
| Morphology | `coastlines`, `mountains`, `volcanoes`, `lakes`, `terrainAdjust` | `FoundationContext`, heightfield buffer | Final heightfield, shore mask, margin metadata |
| Hydrology & Climate | `rivers`, `rainfallBaseline`, `climateRefine`, `humidity` | Heightfield, wind/currents, shore mask | Rainfall/humidity grids, water flow graph |
| Narrative Overlays | `storySeed`, `storyHotspots`, `storyRifts`, `storyOrogeny`, `storyCorridors`, `storySwatches` | Heightfield, climate grids, plate tensors | Overlay layers (`corridors`, `hotspots`, `swatches`, etc.) |
| Biomes & Features | `biomes`, `features` | Heightfield, climate grids, overlays | Final biomes/features, validation metrics |
| Placement & Finalization | `placement`, `finalize` | All prior fields | Player starts, resources, discoveries |

### Data Products
- `FoundationContext`: immutable snapshot bundling plate IDs, boundary metadata, uplift/rift fields, wind/currents, shared seeds.
- `Heightfield`: staged terrain buffer (elevation + terrain) flushed to the engine only at cluster boundaries.
- `ClimateField`: rainfall/humidity/temperature arrays (read-only to consumers; authored by climate engine).
- `StoryOverlays`: structured map of sparse overlays (corridors, hotspots, active/passive margins).

### World Foundation Configuration Model
- `foundation.seed` — mandatory determinism controls (mode, fixed, offsets, manifest hash) replacing `worldModel.enabled`/seed toggles.
- `foundation.plates` — Voronoi + plate layout definitions; downstream consumers read normalized copy.
- `foundation.dynamics` — atmospheric and oceanic drivers aligned with physics tensors; derived scalars avoid recomputation.
- `foundation.surface` — continental targets and ocean-separation policy wiring; travels with the plate seed for diagnostics.
- `foundation.policy` — consumer-facing multipliers consolidated from legacy policy blocks.
- `foundation.diagnostics` — logging + replay toggles consolidated from dev flags.

### Deprecations & Cleanup (status)
- Legacy `worldModel` overrides removed; emit `[Foundation]` warnings when present. ✅
- `WORLDMODEL_*` exports collapsed into `FOUNDATION_*` helpers and live tunables. ✅
- `PLATE_GENERATION_REFACTOR.md` archived; open items merged here. ✅
- Diagnostics renamed to `[Foundation]` with ASCII helpers under the new prefixes. ✅

## Tooling & Verification
- Diagnostics: `[Foundation]` seed/plate/dynamics/surface logs, landmass/relief/rainfall ASCII and histograms.
- Needed: manifest consumes/produces validator; smoke tests running orchestrator against stub adapter with minimal/maximal presets; overlay/field availability checks per stage.

## Risks & Mitigations
- Complex migration: proceed cluster-by-cluster; keep feature flags scoped to staging.
- Performance regressions: instrument buffer operations; cache expensive computations (Voronoi, climate) for diagnostics.
- Manifest drift: enforce manifests with data-product validation to prevent entropy.

## Links & References
- Code: `mods/mod-swooper-maps/mod/maps/` (orchestrator, layers, bootstrap, world model).
- Diagnostics: `mods/mod-swooper-maps/mod/maps/bootstrap/dev.js`.
- Types/contexts: `mods/mod-swooper-maps/mod/maps/core/types.js`.
- Config resolution: `mods/mod-swooper-maps/mod/maps/bootstrap/resolved.js`, `bootstrap/tunables.js`.
