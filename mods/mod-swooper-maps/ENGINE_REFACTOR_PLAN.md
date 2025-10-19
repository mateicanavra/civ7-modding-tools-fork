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
- **Voronoi Physics Stack:** The Civ VII Voronoi + physics integration is the canonical world foundation; “legacy” references never reuse the Voronoi label.

## 3. Target Stage Topology

| Cluster | Stages | Required Inputs | Outputs |
| --- | --- | --- | --- |
| **Foundations** | `foundation`, `landmassPlates` | Engine seed, map dimensions, Civ Voronoi utilities | Plate seeds, plate tensors, initial landmask, `FoundationContext` |
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

### World Foundation Configuration Model

We will collapse the scattered plate + core-world knobs into a single top-level `foundation` config group. The group exposes consistent sub-clusters so orchestration, diagnostics, and presets all reason about the same structure:

- **`foundation.seed`** – mandatory determinism controls (`mode`, `fixed`, per-system `offsets`, manifest hash) that replace `worldModel.enabled`/seed toggles and capture the shared RNG state surfaced through `FoundationContext`.
- **`foundation.plates`** – Voronoi + plate-layout definitions (`count`, `convergenceMix`, `relaxation`, `jitter`, `rotation`, `shieldSmoothing`). Downstream consumers read the normalized copy, not bespoke copies of `worldModel.plates`.
- **`foundation.dynamics`** – atmospheric and oceanic drivers with parity to the physics tensors (`wind`, `currents`, `mantle`, `directionality`). Each child exposes both raw config and derived scalars so layers avoid recomputing normalization.
- **`foundation.surface`** – continental targets that currently live under `landmass.*` (`baseWaterPercent`, band geometry, post-adjustments) plus ocean-separation policy wiring. These values travel with the plate seed so diagnostics can render the intended window layout.
- **`foundation.policy`** – consumer-facing multipliers previously scattered under `worldModel.policy` (wind influence, coast/reef biases, ocean separation, story coupling). Stage manifests will declare which pieces they consult.
- **`foundation.diagnostics`** – logging + replay toggles (plate seed snapshots, ASCII dumps, manifest checks) consolidated from `dev` flags and the plate refactor plan.

#### Legacy mapping (v0 → foundation)

| Current Path | New Path | Notes |
| --- | --- | --- |
| `worldModel.enabled` | _(removed)_ | Physics is mandatory; manifests gate compatibility via `stageConfig`. |
| `worldModel.plates.*` | `foundation.plates.*` | Direct rename; seed/offset fields move into `foundation.seed`. |
| `worldModel.wind.*` | `foundation.dynamics.wind.*` | Preserve field names; directionality overrides are shared through `foundation.dynamics`. |
| `worldModel.currents.*` | `foundation.dynamics.currents.*` | Same schema, now colocated with winds. |
| `worldModel.pressure.*` | `foundation.dynamics.mantle.*` | Rename captures mantle focus; staged into `FoundationContext.pressure`. |
| `worldModel.directionality.*` | `foundation.dynamics.directionality.*` | Subdivide into `axes`, `interplay`, `hemispheres`, `variability` under a single namespace. |
| `worldModel.policy.*` | `foundation.policy.*` | Split into `coasts`, `climate`, `separation`; consumers import through `FOUNDATION.policy`. |
| `landmass.baseWaterPercent` / `landmass.geometry.*` | `foundation.surface.landmass.*` | Landmass defaults ship with the seed bundle instead of a separate config root. |
| `tunables.WORLDMODEL_*` helpers | `tunables.FOUNDATION_*` | `rebind()` will hydrate `FOUNDATION.core`, `FOUNDATION.policy`, and `FOUNDATION.surface`. |

#### Deprecations & cleanup

- Archive `mods/mod-swooper-maps/PLATE_GENERATION_REFACTOR.md` once the new `foundation` block ships; its open items migrate into this plan.
- Replace the `WorldModel` typedef in `bootstrap/map_config.types.js` with `FoundationConfig`/`FoundationPolicy` types and update downstream imports (`swooper-desert-mountains.js`, tests) to read from `foundation`.
- Collapse the `worldModel` section in `bootstrap/defaults/base.js` and the `WORLDMODEL_*` exports in `bootstrap/tunables.js`; they become thin wrappers that proxy the new `FOUNDATION` helpers. **(Done)**
- Update diagnostics in `bootstrap/dev.js` to emit `[Foundation]` messages and remove plate-specific ASCII toggles once the consolidated logging switches take over.

## 4. Phase Roadmap

### Phase A – Foundations Alignment
1. Promote `landmassPlates` to the default stage; demote the legacy continent generator to an opt-in manifest entry. **(Done)**
2. Expose a deterministic `PlateSeed` from WorldModel so every consumer (landmass, diagnostics) shares identical Voronoi sites. **(Done)** — `PlateSeedManager.capture()` now owns RNG overrides and `WorldModel` publishes a frozen seed snapshot.
3. Emit `FoundationContext` and guard all downstream stages with runtime assertions (`stageEnabled` + presence of required data product).
4. Migrate config + tunables to the new `foundation` block, deleting the legacy `worldModel` toggle/typedefs once consumers compile.

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
2. Strip legacy compatibility shims (implicit landmass fallback, StoryTag resets).  
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
3. Author the `foundation` schema + resolver wiring (defaults, presets, tunables) so presets can opt into new physics clusters.
4. Update `SWOOPER_MAPS_ARCHITECTURE_AUDIT.md` to reference this plan and mark the legacy flow as deprecated.

### Hotlist – Upcoming module touchpoints

| File | Action | Notes |
| --- | --- | --- |
| `ENGINE_REFACTOR_PLAN.md` | Keep this blueprint updated as each hotlist item lands. | Capture status deltas (✅/⚠️) so downstream docs stay trustworthy. |
| `PLATE_GENERATION_REFACTOR.md` | Close out remaining deliverables once manifest + context changes ship. | Mark subsections complete as stages migrate to `foundation`. |
| `mod/maps/bootstrap/defaults/base.js` | ✅ `foundation`/`landmassPlates` defaults live; legacy landmass stub removed. | Ensure diagnostics call out when landmass stages are disabled or missing. |
| `mod/maps/map_orchestrator.js` | Thread `FoundationContext` deeper (heightfield sync, diagnostics) and remove the lingering WorldModel-only logging helpers. | Stage gating now points at `foundation`; next enforce context invariants. |
| `mod/maps/bootstrap/resolved.js` | Drop the world-model merge shim once presets stop referencing it and validate stage names during normalization. | Prevents stale overrides from slipping through silently. |
| `mod/maps/bootstrap/map_config.types.js` | Expand the new stage unions with context-aware typedefs (`FoundationContext`, landmass APIs). | Keeps editor hints aligned with runtime reality. |
| `mod/maps/core/types.js` | Extend `MapContext`/adapters with a required `foundation` payload and typed buffers. | Unlocks strict runtime guards for downstream stages. |
| `mod/maps/bootstrap/entry.js` | Document the new stage names and seed defaults; consider auto-populating stageConfig with `foundation`/`landmassPlates`. | Helps presets avoid stale identifiers. |
| `mod/maps/bootstrap/foundation-tunables.js` | Re-export `FOUNDATION_CONTEXT`, dynamics, and policy bundles for consumers migrating off `tunables.js`. | Simplifies import sites during the rollout. |
| `mod/maps/bootstrap/dev.js` | Swap `logWorldModel*` helpers to `logFoundation*`, prune ASCII dumps tied to removed stages, and document the new identifiers. | Keeps diagnostics and docs aligned with the current pipeline. |
| `mod/maps/layers/coastlines.js` | Read shoreline policy from `FoundationContext.surface` instead of legacy globals. | Harmonizes coastal shaping with new separation knobs. |
| `mod/maps/layers/volcanoes.js` | Drive eruption bias via `FOUNDATION_DYNAMICS`/context tensors. | Removes duplicated normalization paths. |
| `mod/maps/layers/climate-engine.js` | Consume `FOUNDATION_DIRECTIONALITY` + `FoundationContext` drivers throughout baseline/refinement. | Ensures rainfall tuning matches the shared physics pipeline. |
| `mod/maps/layers/climate-baseline.js` | Mirror the climate engine helpers so both stages stay in sync. | Avoids divergent normalization between baseline and refinement passes. |
| `mod/maps/swooper-desert-mountains.js` | Audit preset stageConfig/overrides after the stage rename. | Prevents new presets from copying outdated identifiers. |
| `.git/COMMIT_EDITMSG` | Clear stale commit templates before opening PRs. | Avoids leaking old summaries into new submissions. |

_First up:_ rename the manifest/default wiring to use `foundation` + `landmassPlates` so downstream modules can follow suit.

_Status update:_ Manifest defaults now export `foundation` and `landmassPlates` only; the legacy landmass stub is gone and orchestrator gating reflects the single Voronoi physics path. `PlateSeedManager` now captures and shares the deterministic Voronoi physics seed through `WorldModel` diagnostics.
