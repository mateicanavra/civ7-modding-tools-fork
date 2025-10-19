# Plate Generation Consolidation Plan

_Updated: 2025-10-18_

> **Status**: This plan now folds into the broader world-foundation consolidation captured in `ENGINE_REFACTOR_PLAN.md`. Continue to treat the implementation notes below as background. New work should target the unified `foundation` config model and archive this file once the migration lands.

## 1. Objective
Unify plate generation under a single authoritative pipeline that leverages Civilization VII’s Voronoi utilities (sites, growth, boundary detection) and feeds the Swooper physics stack (WorldModel, landmass shaping, climate). Remove duplicate continent generators and eliminate the concept of “physics disabled.”

## 2. Current State
- Landmass generation now exclusively uses `landmass_plate.js` fed by `WorldModel` stability fields; the legacy continent adapter (`landmassVoronoiLegacy`) has been retired in favor of the Voronoi physics pipeline.
- `WorldModel.init()` (`world/model.js`) computes plates once per map, storing tensors and a frozen `plateSeed` snapshot for diagnostics.
- Physics is mandatory—the legacy `STORY_ENABLE_WORLDMODEL` toggle has been removed and landmass depends on the world stage via the manifest.
- Downstream layers already read WorldModel tensors, but we still need to formalize a `FoundationContext` and expand diagnostics so every consumer shares the same plate metadata explicitly.

## 3. Problems
1. **Double Voronoi Passes:** We pay for two independent Voronoi computations per map. They can disagree, causing rivers, mountains, and story overlays to misalign with continents.
2. **Implicit Fallback:** Disabling WorldModel silently switches to the non-physics path, contradicting the tool’s physics-first mandate.
3. **Opaque Seeding:** Landmass and plate generation each derive seeds in different ways, undermining deterministic replays.
4. **Fragmented Contracts:** Landmass, WorldModel, and diagnostics exchange data via side effects on `GameplayMap` instead of explicit structures.

## 4. Requirements
- **Single Generation Pass:** Plates and landmasses must derive from the same Voronoi seeds and growth routine.
- **Mandatory Physics:** Plate generation cannot be disabled in normal operation; legacy behavior exists only as an opt-in compatibility mode.
- **Deterministic Seeding:** A shared seed (engine RNG + optional offsets) governs the Voronoi run. Diagnostics must log seed values.
- **Structured Outputs:** Plate generation publishes a `PlateSeed` bundle and populates `FoundationContext` with:
  - plate IDs (Int16Array)
  - boundary metadata (type, closeness, movement vectors)
  - uplift/rift potentials
  - shield stability
  - growth windows for landmass carving
- **Extensibility:** The system remains compatible with future physics fields (fault aging, sedimentation) and alternative plate presets.

## 5. Proposed Architecture
1. **PlateSeed Module**
   - New module (`world/plate_seed.js`) exposes `createPlateSeed(dimensions, config)` returning the raw Voronoi sites and RNG state. Uses Civ utilities and obeys seed controls in `FOUNDATION_PLATES`.
   - Logged via diagnostics for replay.
2. **WorldModel Integration**
   - `WorldModel.init()` consumes `PlateSeed` to compute tensors (boundary closeness/type, uplift, etc.) exactly as today, but without re-sampling sites.
   - Stores tensors in `FoundationContext`.
3. **Landmass Generation**
   - ✅ `landmass_plate.js` is the default landmass stage, sourcing WorldModel tensors.
   - ✅ Removed the legacy landmass adapter; no compatibility manifest stage remains.
4. **Manifest & Orchestrator Changes**
   - ✅ `defaults/base.js` sets `stageManifest.order` to use `landmassPlates`.
   - ✅ Retired the `landmassVoronoiLegacy` manifest entry; presets now rely solely on the Voronoi physics pipeline.
   - `stageEnabled()` asserts that `FoundationContext` exists before any morphology stage executes.
   - Removal of `STORY_ENABLE_WORLDMODEL` toggle as a runtime guard; physics is always on.
5. **Diagnostics**
   - `bootstrap/dev.js` gains `logPlateSeed`, `logPlateBoundaries`, and consistency checks (plate/continent overlap).

## 6. Implementation Steps
1. **Seed Extraction**
   - Split seed logic out of `computePlatesVoronoi()` into `PlateSeedManager`.  
   - Ensure `RandomImpl` state is restored after seed capture.  
   - Update tests/diagnostics to log seed data.
2. **WorldModel Refactor**
   - Accept a precomputed seed; remove internal site sampling.  
   - Optionally expose a method to serialize plate tensors for debugging.
3. **Landmass Refactor**
   - Replace `generateVoronoiLandmasses()` calls with `landmass_plate` usage by default.  
   - Rework geometry post-processing to operate on `FoundationContext` data (plate bounding boxes).
4. **Manifest Update**
   - `map_config.types.js` and `defaults/base.js` expose `landmassPlates` as the sole landmass stage identifier.
   - Presets that relied on the legacy landmass fallback (`landmassVoronoiLegacy`) must migrate or be archived.
5. **Cleanup**
   - ✅ Removed the `STORY_ENABLE_WORLDMODEL` toggle and adjusted tunables.  
   - ✅ Deleted `landmass_voronoi.js` from the live pipeline.
6. **Validation**
   - Build regression tests comparing landmask vs. plate boundary coverage.  
   - Ensure mountains, volcanoes, and climate layers now align with plate windows by checking ASCII diagnostics during smoke runs.

## 7. Risks & Mitigations
- **Seed Drift:** Unit tests capture Voronoi sites for known seeds to detect accidental changes.  
- **Legacy Preset Breakage:** Communicate the removal of the legacy continent path; presets must rely on the Voronoi physics pipeline going forward.  
- **Performance Impact:** Monitor initialization time after removing duplicate Voronoi passes; expected decrease, but ensure caching remains optional.

## 8. Deliverables
- `PlateSeed` module + diagnostics.  
- Updated `WorldModel`, `landmass_plate`, and orchestrator using the single source of truth.  
- Documentation updates (`ENGINE_REFACTOR_PLAN.md`, `DESIGN.md`, audit).  
- Tests validating deterministic seeds and plate/landmask alignment.
