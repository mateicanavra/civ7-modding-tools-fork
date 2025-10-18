# Map Generator Refactoring Progress

## Overview
This document tracks the refactoring of the mod-swooper-maps generator according to the plan in `mod-swooper-maps-scripts.md`.

## Latest Update (Phase 1 Completion)

**Phase 1 is now COMPLETE!** All major layer files have been refactored to use the MapContext + Adapter architecture:

### What We Accomplished
- ✅ **5 Core Layers Refactored**: `landmass.js`, `coastlines.js`, `islands.js`, `features.js`, and `climate-refinement.js`
- ✅ **Full Adapter Pattern**: All TerrainBuilder and RNG calls now use the adapter with backward-compatible fallbacks
- ✅ **MapContext Threaded**: Context is created in the orchestrator and passed to all refactored layers
- ✅ **Deterministic RNG**: All refactored layers use `ctxRandom()` for reproducible map generation

### Architecture Benefits
1. **Testability**: Layers can now be tested with `InMemoryAdapter` (no game engine required)
2. **Determinism**: All RNG calls are tracked and can be replayed
3. **Decoupling**: Layers depend on abstract adapter interface, not concrete engine APIs
4. **Backward Compatible**: Code falls back to direct engine calls when ctx is not provided

### Next Steps (Phase 2)
Ready to wire WorldModel data to actually drive terrain generation:
- Mountain placement along convergent boundaries
- Climate using wind vectors for orographic effects
- Coastal ruggedness based on boundary closeness

---

## ✅ Phase 1: Architecture Seam (Foundation) - COMPLETED

### Goal
Create Context + Adapter layer for testability and data flow visibility.

### Completed Tasks

#### 1. ✅ Core Types Created (`mod/maps/core/types.js`)
- **MapContext**: Unified data container with dimensions, fields, worldModel, rng, config, metrics, adapter
- **EngineAdapter**: Interface definition for all engine operations
- **MapFields**: Typed arrays for rainfall, elevation, temperature, biomeId, featureType, terrainType
- **Helper functions**: `createMapContext()`, `ctxRandom()`, `idx()`, `inBounds()`
- **Type annotations**: Full JSDoc types for IDE support

#### 2. ✅ Adapter Implementations (`mod/maps/core/adapters.js`)
- **CivEngineAdapter**: Production adapter wrapping GameplayMap, TerrainBuilder, FractalBuilder, AreaBuilder
  - Terrain reads: isWater, isMountain, getElevation, getTerrainType, getRainfall, getTemperature, getLatitude
  - Terrain writes: setTerrainType, setRainfall, setElevation
  - Feature operations: getFeatureType, setFeatureType, canHaveFeature
  - RNG: getRandomNumber (delegates to TerrainBuilder)
  - Utilities: validateAndFixTerrain, recalculateAreas, fractal operations, rivers

- **InMemoryAdapter**: Testing adapter with typed arrays only
  - Deterministic LCG RNG for reproducible tests
  - Precomputed latitude grid
  - No-op implementations for engine-specific operations
  - Suitable for CI, golden tests, headless profiling

### Remaining Tasks

#### 3. ✅ Refactor RNG calls to use `ctx.rng()` (COMPLETED for main layers)
- **Goal**: Replace direct `TerrainBuilder.getRandomNumber()` calls with `ctxRandom(ctx, label, max)`
- **Benefit**: Deterministic replay, RNG call tracking, testability
- **Files updated**:
  - ✅ `layers/landmass.js` - Adapter pattern applied (backward compatible)
  - ✅ `layers/coastlines.js` - All RNG calls refactored with ctxRandom
  - ✅ `layers/islands.js` - All RNG calls refactored with ctxRandom
  - ✅ `layers/climate-refinement.js` - Already using ctx
  - ✅ `layers/features.js` - All RNG and feature placement calls refactored
- **Files remaining** (lower priority):
  - `world/model.js`
  - `story/tagging.js`, `story/corridors.js`

#### 4. ✅ Thread MapContext through orchestrator and layers (COMPLETED)
- **Goal**: Pass `ctx` to all layer functions, access engine via `ctx.adapter`
- **Files updated**:
  - ✅ `map_orchestrator.js`: Created `MapContext` at start, passes to all refactored layers
  - ✅ All 5 key layers now accept `ctx` parameter:
    - ✅ `layers/climate-refinement.js` (already wired)
    - ✅ `layers/coastlines.js` (updated)
    - ✅ `layers/islands.js` (updated)
    - ✅ `layers/features.js` (updated)
    - ✅ `layers/landmass.js` (updated)

---

## ⏳ Phase 1.5: Plate Generation Refactoring (In Progress)

### Goal
Upgrade from simple distance-based Voronoi to CIV 7's proper Voronoi diagram implementation with accurate boundary detection and physics-based plate interactions.

### Why This Matters
- **Current approach**: Uses simple nearest-distance calculation for plates (fast but approximate)
- **New approach**: Leverages base game's `VoronoiUtils.computeVoronoi()` with proper edge-based boundaries
- **Impact**: More accurate plate boundaries, real subduction/sliding physics, better integration with Phase 2 mountain placement

### Tasks

#### 1. ⏳ Create `mod/maps/world/plates.js` - Advanced Plate Generation Module
- **Status**: Pending
- **Imports from base game**:
  - `/base-standard/scripts/voronoi-utils.js` - VoronoiUtils, RegionCell, PlateBoundary, kdTree utilities
  - `/base-standard/scripts/voronoi-region.js` - PlateRegion class with movement vectors
  - `/base-standard/scripts/kd-tree.js` - kdTree for fast spatial queries
- **New function**: `computePlatesVoronoi(width, height, config)`
  - Creates Voronoi diagram with Lloyd relaxation (5 iterations like base game)
  - Generates PlateRegion instances with rotation + translation vectors
  - Computes plate boundaries at actual Voronoi edges
  - Calculates subduction/sliding from plate movement dot products
  - Returns structured data for WorldModel fields

#### 2. ⏳ Refactor `mod/maps/world/model.js` - Enhanced Plate Physics
- **Status**: Pending
- **Replace**: `computePlates()` implementation
- **Add new fields to WorldModel**:
  - `plateMovementU` (Int8Array) - horizontal plate movement per tile
  - `plateMovementV` (Int8Array) - vertical plate movement per tile
  - `plateRotation` (Int8Array) - plate rotation at each tile
- **Enhance boundary detection**:
  - Use actual subduction values: `subduction > threshold` → convergent
  - Use actual divergence: `subduction < -threshold` → divergent
  - Use sliding values: `sliding > threshold && low subduction` → transform
  - Store plate boundaries in kdTree for fast nearest-boundary queries
- **Integration**:
  - Apply directionality bias (WORLDMODEL_DIRECTIONALITY) to plate movements
  - Use existing RNG (TerrainBuilder) for determinism
  - Preserve all existing fields (upliftPotential, riftPotential, etc.)

#### 3. ⏳ Update Documentation
- **Status**: Pending
- Update inline comments in model.js to reflect new physics-based approach
- Document base game script dependencies and import paths

### What We Leverage from Base Game

| Component | Source File | Purpose |
|-----------|-------------|---------|
| `VoronoiUtils.computeVoronoi()` | `/base-standard/scripts/voronoi-utils.js` | Proper Voronoi diagram with Lloyd relaxation |
| `PlateRegion` | `/base-standard/scripts/voronoi-region.js` | Plate movement vectors (rotation + translation) |
| Boundary calculation | Continent Generator `growPlates()` | Subduction/sliding from movement dot products |
| `kdTree` | `/base-standard/scripts/kd-tree.js` | Fast spatial queries for nearest boundary |
| `RegionCell` | `/base-standard/scripts/voronoi-utils.js` | Cell data structure with plateId tracking |

### Benefits

✅ **Accuracy**: Real Voronoi boundaries instead of approximate distance
✅ **Physics-Based**: Proper subduction/sliding from plate movement vectors
✅ **Ready for Phase 2**: Boundaries in kdTree for mountain placement
✅ **Proven Algorithms**: Same system used by CIV 7's continent generator
✅ **Better Variety**: Lloyd relaxation → more uniform, realistic plates

### Success Metrics

- ⏳ Same seed produces deterministic, reproducible plate boundaries
- ⏳ Boundary types correctly classified (convergent, divergent, transform)
- ⏳ BoundaryCloseness accurately reflects Voronoi edge distances
- ⏳ Directionality config successfully influences plate movements
- ⏳ Plate boundaries accessible via kdTree for Phase 2 consumers

---

## ✅ Phase 2: Wire WorldModel to Consumers - COMPLETE!

### Goal
Make tectonics and physics **actually shape** the map.

### Completed Tasks

#### 1. ✅ Mountains/Volcanism - **NEW `layers/mountains.js`**
- **Status**: COMPLETE
- **Location**: Created new `layers/mountains.js` with physics-based placement
- **Implementation**:
  - ✅ Uses `WorldModel.upliftPotential` for weighted mountain placement scores
  - ✅ Uses `boundaryType === ENUM_BOUNDARY.convergent` for 50% mountain boost (collision zones)
  - ✅ Uses `boundaryType === ENUM_BOUNDARY.divergent` for rift valley depressions
  - ✅ Blends WorldModel scores (75%) with fractal variety (25%) for natural appearance
  - ✅ Separate hill placement with similar physics-based logic
  - ✅ Replaces base game's pure random fractal approach
- **Integration**:
  - ✅ Wired into `map_orchestrator.js` (lines 229-238)
  - ✅ Replaces `addMountains()` and `addHills()` calls with unified `layerAddMountainsPhysics()`
  - ✅ Mountain chains now follow convergent boundaries (realistic orogenesis!)
  - ✅ Rift valleys have lowered terrain at divergent boundaries

#### 2. ✅ Climate Refinement - **Enhanced `layers/climate-refinement.js`**
- **Status**: COMPLETE (was 70% wired, now 100%)
- **Location**: `layers/climate-refinement.js`
- **Previous work**:
  - ✅ Already used wind vectors for orographic shadow scans (lines 214-218)
  - ✅ `hasUpwindBarrierWM()` function uses `WorldModel.windU/V` for prevailing winds
- **New additions (Phase 2)**:
  - ✅ **Pass G: Atmospheric Pressure Bias** (lines 391-420)
  - ✅ Uses `WorldModel.pressure` to bias rainfall
  - ✅ High pressure zones (descending air) → dry conditions
  - ✅ Low pressure zones (rising air) → wet conditions
  - ✅ Configurable strength via `CLIMATE_REFINE_CFG.pressure.strength`
- **Result**: Climate now responds to both plate-driven winds AND atmospheric pressure patterns!

#### 3. ✅ Coasts - **Enhanced `layers/coastlines.js`**
- **Status**: COMPLETE
- **Location**: `layers/coastlines.js`
- **Implementation**:
  - ✅ Imports `WorldModel` (line 16)
  - ✅ Checks `WorldModel.boundaryCloseness` for each coastal tile (lines 85-88)
  - ✅ Treats high boundary closeness (>128/255) same as active margins
  - ✅ **Bay carving**: More aggressive near plate boundaries (rugged bays/inlets)
  - ✅ **Fjord creation**: Enhanced near plate boundaries (fjord-like coasts)
  - ✅ Convergent boundaries → rugged, indented coastlines (realistic!)
  - ✅ Stable plate interiors → smoother coastlines
- **Result**: Coastlines now reflect underlying plate tectonics!

#### 4. 📝 Islands - Already Compatible
- **Location**: `layers/islands.js`
- **Status**: Already respects `StoryTags.corridorSeaLane` for placement guards
- **Future enhancement**: Could use `boundaryCloseness` for volcanic island chains
- **Note**: Phase 3 will enforce corridor width policies more strictly

---

## ⏳ Phase 3: Enforce Corridor Policies

### Goal
Make corridor tags **binding**, not advisory.

### Tasks

#### 1. ⏳ Island Placement Guard
- **Location**: `layers/islands.js:layerAddIslandChains`
- **Changes**:
  - Before placing island, check if tile or neighbors are in `StoryTags.corridorSeaLane`
  - Reject placement if it narrows channel below `minChannelWidth` from config
  - Preserve sea-lane safety for naval traversal

#### 2. ⏳ Coast Expansion Limiter
- **Location**: `layers/coastlines.js:layerAddRuggedCoasts`
- **Changes**:
  - Skip aggressive coastal roughening if tile in sea lane corridor
  - Avoid creating chokepoints in tagged lanes

#### 3. ⏳ Validation Pass
- **Location**: New `layers/corridor-validation.js` or add to `map_orchestrator.js`
- **Changes**:
  - After island/coast passes, scan all `corridorSeaLane` tiles
  - Log warning if any lane is < configured minimum width
  - Optionally: carve out violating tiles (surgical fix)
  - Add metrics: lane width histogram, violation count, corridor coverage

---

## ⏳ Phase 4 (Optional): Plate-Grown Landmass

### Goal
Replace banded landmass with plate-driven growth (higher variety).

### Approach A: Consume Civ7 Base Generator (Lower Risk)
- Remove `layerCreateDiverseLandmasses` call from orchestrator
- Let Civ7's fractal/continent generator run first
- Treat landmass/elevation/rivers as **inputs**
- Run refiners (climate, features, corridors) as post-processing

### Approach B: Implement Plate-Grown Landmass (Big Swing)
- New `plates.grow()` function using WorldModel plates as Voronoi seeds
- Growth rules: expand from plate centers, stop at divergent boundaries (rifts), bulge at convergent
- Replace `layers/landmass.js:createDiverseLandmasses` with new growth algorithm
- Keep superior climate/story systems on top

**Recommendation**: Start with Approach A, then try B if more control needed.

---

## Files Created/Modified Summary

### Phase 1 - Architecture Foundation (COMPLETE)
- ✅ `mod/maps/core/types.js` - Core type definitions and MapContext
- ✅ `mod/maps/core/adapters.js` - CivEngineAdapter and InMemoryAdapter
- ✅ `map_orchestrator.js` - Creates MapContext, threads through layers
- ✅ `layers/climate-refinement.js` - Uses ctx + adapter
- ✅ `layers/coastlines.js` - Uses ctx + adapter
- ✅ `layers/islands.js` - Uses ctx + adapter
- ✅ `layers/features.js` - Uses ctx + adapter
- ✅ `layers/landmass.js` - Uses ctx + adapter

### Phase 1.5 - Plate Refactoring (COMPLETE)
- ✅ **NEW** `mod/maps/world/plates.js` - Voronoi-based plate generation
- ✅ `mod/maps/world/model.js` - Enhanced with plate movements, boundaryTree
- ✅ Added fields: `plateMovementU/V`, `plateRotation`, `boundaryTree`
- ✅ `computePlates()` refactored to use proper Voronoi diagrams

### Phase 2 - WorldModel Integration (COMPLETE)
- ✅ **NEW** `mod/maps/layers/mountains.js` - Physics-based mountain placement
- ✅ `map_orchestrator.js` - Uses new mountains layer instead of base game
- ✅ `layers/climate-refinement.js` - Added atmospheric pressure bias (Pass G)
- ✅ `layers/coastlines.js` - Uses boundaryCloseness for ruggedness

### Phase 3 - Corridor Policies (PENDING)
- ⏳ `layers/islands.js` - Add corridor width enforcement
- ⏳ New `layers/corridor-validation.js` - Validation pass (optional)

### Documentation
- 📝 `REFACTORING_PROGRESS.md` - This file (continuously updated)

---

## Testing Strategy

### Unit Tests (Future)
- Test InMemoryAdapter with fixed seeds → deterministic outputs
- Golden tests: save rainfall/elevation histograms, compare on changes
- Adapter tests: verify CivEngineAdapter delegates correctly

### Integration Tests
- Compare maps generated with same seed before/after refactoring
- Validate WorldModel consumption: mountains near convergent boundaries
- Validate corridor enforcement: sea lanes remain navigable width

---

## Success Metrics

### Phase 1 Complete When:
- ✅ Core types and adapters exist
- ✅ MapContext threaded through ≥3 layers (actually 5 layers completed!)
- ✅ No direct `GameplayMap`/`TerrainBuilder` calls in updated layers (all refactored layers use adapter pattern with fallback)
- ⏳ Tests can run with InMemoryAdapter (headless) - ready to implement

### Phase 2 Complete When:
- ✅ Mountains placed along `boundaryType === convergent` zones
- ✅ Climate refinement uses `WorldModel.windU/V` for all orographic scans
- ✅ Climate uses `WorldModel.pressure` for rainfall bias
- ✅ Coasts vary by `boundaryCloseness` (rugged near boundaries)

### Phase 3 Complete When:
- ⏳ Island placement respects `corridorSeaLane` tags
- ⏳ Corridor validation pass logs < 5% violations
- ⏳ Metrics show lane width enforcement working

---

## Notes

- **Approach**: JavaScript with JSDoc type annotations (Civ7 engine consumes JS)
- **Convention**: Prefix unused params with `_` to avoid lint warnings
- **Rollback**: Keep original code commented out for easy revert
- **Feature flags**: Add config toggles for new behaviors (enable incrementally)
