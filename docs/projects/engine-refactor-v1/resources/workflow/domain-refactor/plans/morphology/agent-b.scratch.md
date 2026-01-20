# Agent B scratch — Civ7 stamping/materialization + LandmassRegionId (Phase 2 input)

This scratch file captures **evidence** and **drop-in spec text** for the Phase 2 Morphology modeling overhaul, specifically the **Gameplay-owned stamping/materialization layer** and the **LandmassRegionId projection contract**.

Scope note: I am not editing Phase 2 canonical docs directly here; this is intended for orchestrator/peer-agent integration.

---

## Open items (current run)

Items that should be explicitly closed (or intentionally deferred with triggers) in the Phase 2 canonical model so Civ7 stamping is deterministic and drift-resistant:

1) **LandmassRegion constants & semantics (engine-facing):**
   - Base-standard uses `LandmassRegion.LANDMASS_REGION_DEFAULT`, `..._NONE`, `..._ANY` and applies a divisibility test (`assignedLandmass % landmassRegionId == 0`) in resource/age-gating.
   - Repo typing (`packages/civ7-types/index.d.ts`) currently only declares `LANDMASS_REGION_WEST` and `..._EAST`.
   - Action: decide whether Phase 2 requires updating the declared type surface to include `DEFAULT/NONE/ANY` (recommended), and whether “minor landmasses” are stamped as `DEFAULT` vs `NONE` (must be consistent with modulo gating and “division by 0” avoidance).

2) **Coast expansion + lake generation ownership (physics vs stamping):**
   - `expandCoasts(...)` and `generateLakes(...)` mutate terrain topology and are used by base-standard before `buildElevation()` and before downstream consumers (rainfall/rivers/biomes/resources).
   - Action: decide whether these are modeled as *physics-truth ops* (preferred; avoids physics↔engine drift) vs treated as a Gameplay stamping “derived-only decoration” (risky; must not backfeed into physics truths).

3) **Region assignment coverage (land vs coast vs islands):**
   - Base-standard marks LandmassRegionId on *non-ocean tiles* (including initial coasts), and `expandCoasts` copies LandmassRegionId into newly-created coastal water tiles by reading adjacent coast’s id.
   - Action: Phase 2 must state whether LandmassRegionId stamping covers land-only vs all non-ocean, and whether “islands” are `DEFAULT/NONE` vs tagged (e.g. `PlotTags.PLOT_TAG_ISLAND`).

4) **Start placement delegation vs authored behavior:**
   - Base-standard start placement uses rectangular windows (west/east continents) *and* LandmassRegionId filters.
   - Action: if Gameplay continues delegating to Civ7’s `assign-starting-plots.js`, Phase 2 must state what inputs are passed (legacy windows vs landmass-derived partitions). If windows are prohibited, Phase 2 must specify the Gameplay-owned replacement.

5) **Phase 2 doc internal consistency fixes:**
   - `spike-morphology-modeling-gpt.md` Appendix C references a missing “22: Open questions / deep-dive” section.
   - The references list `spike-morphology-greenfield.md` and `spike-morphology-current-state.md`, but this directory contains `spike-morphology-greenfield-gpt.md` and `spike-morphology-current-state-gpt.md`.

---

## Evidence findings (repo + Civ7 base-standard)

Note: this workspace does not currently have `civ7-official-resources/`. The Civ7 base-standard script bundle is present under `.civ7/outputs/resources/Base/modules/base-standard/` and is used as the primary evidence source below.

### A) Civ7 “stamping/materialization” is an explicit engine-phase sequence

Verified evidence (base-standard map scripts):

- Canonical sequence repeatedly appears across shipped scripts (examples):
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/continents-voronoi.js`:
    - Writes terrain + volcano features + `TerrainBuilder.setLandmassRegionId(...)` for land/coast, then:
      - `TerrainBuilder.validateAndFixTerrain()` → `AreaBuilder.recalculateAreas()` → `TerrainBuilder.stampContinents()`
      - `generateLakes(...)` → `AreaBuilder.recalculateAreas()` → `TerrainBuilder.buildElevation()`
      - `addHills(...)` → `buildRainfallMap(...)`
      - `TerrainBuilder.modelRivers(...)` → `TerrainBuilder.validateAndFixTerrain()` → `TerrainBuilder.defineNamedRivers()`
      - `designateBiomes(...)` → `addNaturalWonders(...)` → `TerrainBuilder.addFloodplains(...)` → `addFeatures(...)`
      - `TerrainBuilder.validateAndFixTerrain()` → `AreaBuilder.recalculateAreas()` → `TerrainBuilder.storeWaterData()`
      - `generateSnow(...)` → `generateResources(...)` → (starts/discoveries) → `FertilityBuilder.recalculate()`
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/archipelago.js` shows the same “validate → areas → stamp → buildElevation → rivers → floodplains → storeWaterData → fertility” pattern.
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/terra-incognita.js` and `.civ7/outputs/resources/Base/modules/base-standard/maps/pangaea-plus.js` show `markLandmassRegionId(...)` before `expandCoasts*`, then `recalculateAreas()` → `stampContinents()` → (mountains/volcanoes/lakes) → `buildElevation()` → (rivers/biomes/features) → `storeWaterData()` → placement → `FertilityBuilder.recalculate()`.

### B) Mountains, volcanoes, cliffs — concrete Civ7 representation

Verified evidence:

- Terrain types are set via `TerrainBuilder.setTerrainType(x, y, <terrainIndex>)` and indices are resolved from `GameInfo.Terrains` (base-standard):
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/map-globals.js` resolves:
    - `g_MountainTerrain` (`TERRAIN_MOUNTAIN`)
    - `g_HillTerrain` (`TERRAIN_HILL`)
    - `g_FlatTerrain` (`TERRAIN_FLAT`)
    - `g_CoastTerrain` (`TERRAIN_COAST`)
    - `g_OceanTerrain` (`TERRAIN_OCEAN`)
- Volcanoes are a **feature** plus typically **mountain terrain**:
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/continents-voronoi.js` sets `TerrainBuilder.setFeatureType(..., { Feature: g_VolcanoFeature, ... })` when `tile.terrainType === TerrainType.Volcano`.
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/volcano-generator.js` places volcanoes by setting `TerrainBuilder.setTerrainType(..., g_MountainTerrain)` and then `TerrainBuilder.setFeatureType(..., { Feature: g_VolcanoFeature, ... })`.
- Cliffs are **engine-derived**, not directly writable:
  - `docs/projects/engine-refactor-v1/reviews/_archive/REVIEW-M-TS-typescript-migration-remediation.md` documents that `TerrainBuilder` has **no** `setElevation`; “elevation and cliffs are derived internally via `buildElevation()`”.
  - Base-standard hill scoring queries cliff edges via `GameplayMap.isCliffCrossing(...)`:
    - `.civ7/outputs/resources/Base/modules/base-standard/maps/elevation-terrain-generator.js` `addHills(...)` uses `GameplayMap.isCliffCrossing(...)` while computing hill scores.
  - Implication: **`TerrainBuilder.buildElevation()` must run before any step that expects cliffs/elevation** (including base-standard hill logic and any cliff-aware downstream logic).

### C) Civ7 topology: cylindrical wrapX (fixed)

Verified evidence:

- `.civ7/outputs/resources/Base/modules/base-standard/maps/continents.js` logs `initParams.wrapX` and `initParams.wrapY` inside `requestMapData(initParams)`.

Locked posture (Matei correction; evidence-backed in repo docs/code):
- Canonical Civ7 topology is **cylindrical in X** (`wrapX = true`) and **non-wrapping in Y** (`wrapY = false`), with **no “no-wrapX” option**.
- Repo design docs explicitly model “seam adjacency” and wrap-aware distance math:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/foundation/APPENDIX-WRAPX-PERIODIC-MESH-IMPLEMENTATION.md` (“Civ maps are cylindrical in X… adjacency must be periodic across the seam”).
  - `packages/mapgen-core/src/lib/plates/topology.ts:60` (“Cylindrical wrap on X; clamp on Y”).

### D) LandmassRegionId is a gameplay-critical engine label used by multiple systems

Verified evidence:

- Base-standard marks LandmassRegionId for continents:
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/map-utilities.js` implements `markLandmassRegionId(continent, id)` by iterating a rectangle and calling `TerrainBuilder.setLandmassRegionId(...)` for non-ocean tiles.
  - Multiple map scripts call `markLandmassRegionId(eastContinent, LandmassRegion.LANDMASS_REGION_EAST)` and `...WEST` (e.g. `terra-incognita.js`, `archipelago.js`, `fractal.js`, `continents.js`).
- Starts consume LandmassRegionId as an explicit filter:
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/assign-starting-plots.js` calls `StartPositioner.divideMapIntoMajorRegions(..., landmassRegionIdFilter)` using `LandmassRegion.LANDMASS_REGION_EAST/WEST`.
- Resources and age transitions gate placement by LandmassRegionId:
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/resource-generator.js` reads `GameplayMap.getLandmassRegionId(...)` and uses it in `allowedOnLandmass` checks.
  - `.civ7/outputs/resources/Base/modules/base-standard/scripts/age-transition-post-load.js` repeats the same landmass gating logic.

### E) LandmassRegionId is factor-coded (do not invent numeric ids)

Verified evidence:

- `.civ7/outputs/resources/Base/modules/base-standard/maps/resource-generator.js` uses:
  - `const assignedLandmass = ResourceBuilder.getResourceLandmass(resourceInfo.$index);`
  - `const landmassRegionId = GameplayMap.getLandmassRegionId(iX, iY);`
  - `assignedLandmass % landmassRegionId == 0` to decide if a resource is allowed on a landmass region.
  - It guards the modulo with checks against `LandmassRegion.LANDMASS_REGION_DEFAULT` and `LandmassRegion.LANDMASS_REGION_NONE`.
- `.civ7/outputs/resources/Base/modules/base-standard/scripts/age-transition-post-load.js` repeats the same `assignedLandmass % landmassRegionId == 0` gating pattern.

Implication (must lock in Phase 2):
- LandmassRegionId values are **not arbitrary categories**. They participate in engine-side divisibility membership checks. Gameplay stamping must use engine-provided `LandmassRegion.*` constants only; it must not invent new numeric region IDs.

### F) Coast expansion propagates LandmassRegionId into new coastal water

Verified evidence:

- `.civ7/outputs/resources/Base/modules/base-standard/maps/elevation-terrain-generator.js` `checkExpandCoast(...)`:
  - If an ocean tile is adjacent to a coast tile, it converts that ocean tile to coast with a RNG gate, and then:
    - `adjacentLandmassId = GameplayMap.getLandmassRegionId(adjacent.x, adjacent.y);`
    - `TerrainBuilder.setLandmassRegionId(iX, iY, adjacentLandmassId);`

Implication (must lock in Phase 2):
- If the recipe uses Civ7 `expandCoasts(...)`, LandmassRegionId stamping must run early enough, and must cover the coast tiles used as the “source” for propagation; otherwise newly-created coasts will inherit `DEFAULT` and break downstream landmass gating.

### G) Repo-local engine adapter surfaces align with base-standard phases

Verified evidence:

- Engine phases are represented in `@civ7/types` / `@civ7/adapter`:
  - `packages/civ7-types/index.d.ts` declares `TerrainBuilder.validateAndFixTerrain`, `stampContinents`, `buildElevation`, `modelRivers`, `defineNamedRivers`, `storeWaterData`, `addFloodplains`, `setLandmassRegionId`, etc.
  - `packages/civ7-adapter/src/types.ts` exposes corresponding adapter methods and documents many as wrappers around base-standard scripts.
- Repo acknowledges “engine elevation + cliffs are derived” and not a physics input:
  - `docs/system/DEFERRALS.md` (“Engine Elevation vs. Physics Heightfield Alignment”).

---

## Drop-in spec text — Stamping/materialization phase (Gameplay-owned)

### Gameplay Phase: Civ7 Terrain Materialization (“Stamping”)

**Definition (what stamping is):**
Stamping/materialization is the **deterministic, derived-only** process that converts canonical physics-domain artifacts into **Civ7 engine map reality**, by writing engine-facing surfaces (terrain, features, rainfall, tags/IDs) and invoking required Civ7 engine postprocess phases so that downstream engine systems (areas/continents, cliffs/elevation, rivers, fertility/water data, placement scripts) behave correctly.

**Ownership (hard rule):**
Stamping is **Gameplay-owned** by default. Physics domains (Foundation/Morphology/Hydrology/Ecology) must not treat any engine-facing projections (terrain indices, LandmassRegionId, plot tags, engine elevation/cliffs) as inputs or truth.

**Gameplay projection artifacts (hard rule; pure functions; Gameplay-owned derived-only):**
Gameplay must compute engine-facing intent as **symbolic projections** first, then stamp those projections into the engine only inside adapter steps. At minimum:
- `artifact:map.surfaceClassByTile` (required): per-tile class in a canonical vocab (e.g., `OCEAN | COAST | LAND_FLAT | LAND_HILL | LAND_MOUNTAIN`).
- `artifact:map.landmassRegionSlotByTile` (required): per-tile slot (`WEST | EAST | NONE/DEFAULT`), later mapped to engine `LandmassRegion.*` constants.
- `artifact:map.volcanoIntent` (required if volcanoes exist): per-tile mask or list (tile coords + optional strength); later mapped to `FEATURE_VOLCANO` + any terrain requirements.
- Optional (depending on whether Gameplay stamps Ecology/Hydrology truths vs invoking base-standard generators):
  - `artifact:map.rainfallByTile`
  - `artifact:map.biomeClassByTile`
  - `artifact:map.featureIntentsByTile`
  - `artifact:map.plotEffectsByTile`

**Legacy migration note (non-negotiable for Phase 2 modeling):**
Any physics artifact embedding engine-facing indices (e.g., `heightfield.terrain` carrying engine terrain IDs) is legacy and must be migrated to truth-level canonical measures and/or symbolic classes. Engine indices exist only in Gameplay projection/stamping layers.

**Execution guarantees (locked conventions):**
- `artifact:map.*` projection artifacts are **publish-once/frozen intent** per pass (no “rewrite later in the run”).
- Each adapter stamping step must emit a short boolean effect tag after successful engine mutation so downstream steps can `require` it:
  - Example: `effect:map.mountainsPlotted`, `effect:map.volcanoesPlotted`, `effect:map.landmassRegionsPlotted`.
  - No version suffixes; no receipts/hashes/digests; no wordy names.

**Placement in canonical pipeline (hard rule):**
Stamping runs as a **first-class pipeline phase** after physics artifacts reach their freeze point(s), and before any engine gameplay consumers that assume finalized map state (resources/starts/age transitions).

**Inputs (contracted):**
- `seed` and deterministic RNG labels (for any engine RNG usage).
- `dimensions` (`width`, `height`). Topology is cylindrical in X and clamped in Y; **projection/stamping contracts must not accept wrap flags as inputs**.
- Physics truth artifacts (read-only):
  - Morphology: final land/sea topology + landmass decomposition + volcano intent (as data), plus any required projection inputs for terrain classing.
  - Hydrology: any required rainfall/river directives (or explicit decision to defer to engine’s built-ins).
  - Ecology: biome/feature directives (or explicit decision to invoke base-standard generators).
- Gameplay policy inputs:
  - LandmassRegionId projection policy (see next section), plus any map-size “Distant Lands” policy.

**Outputs (contracted):**
- Engine state mutations:
  - Terrain types (`TERRAIN_OCEAN/COAST/FLAT/HILL/MOUNTAIN/...`) via `TerrainBuilder.setTerrainType`.
  - Features (e.g. `FEATURE_VOLCANO`) via `TerrainBuilder.setFeatureType`.
  - Rainfall via `TerrainBuilder.setRainfall` (if not using base-standard rainfall builder).
  - LandmassRegionId via `TerrainBuilder.setLandmassRegionId` (Gameplay-owned projection).
  - Any required plot tags for start/resource heuristics (e.g. `PlotTags.PLOT_TAG_ISLAND`) if used.
- Engine-derived finalization surfaces (derived-only):
  - Continent/area graph (via `AreaBuilder.recalculateAreas()` and `TerrainBuilder.stampContinents()`).
  - Engine elevation + cliffs (via `TerrainBuilder.buildElevation()`; no `setElevation` exists).
  - Rivers (via `TerrainBuilder.modelRivers(...)` + `TerrainBuilder.defineNamedRivers()`), floodplains, water data, fertility.

**Canonical stamping call order (must be explicit and tested):**
The stamping phase is required to run the Civ7-grade sequencing (evidence: base-standard map scripts under `.civ7/outputs/resources/Base/modules/base-standard/maps/`):

1. **Stamp region IDs needed by terrain postprocess** (if using engine coast expansion that propagates LandmassRegionId).
2. **Stamp terrain + features** (terrain classes + volcanoes at minimum).
3. `TerrainBuilder.validateAndFixTerrain()`
4. `AreaBuilder.recalculateAreas()`
5. `TerrainBuilder.stampContinents()` (engine continent assignments)
6. **Any terrain-topology postprocess that mutates water/land classification** (e.g., lakes generation / coastline expansion), followed by `AreaBuilder.recalculateAreas()` as needed.
7. `TerrainBuilder.buildElevation()` (engine-derived elevation + cliffs)
8. **Hydrology materialization**:
   - Rainfall stamping (either write `setRainfall` from Hydrology artifact or run base-standard rainfall builder).
   - `TerrainBuilder.modelRivers(minLength, maxLength, navigableTerrain)`
   - `TerrainBuilder.validateAndFixTerrain()`
   - `TerrainBuilder.defineNamedRivers()`
   - `TerrainBuilder.addFloodplains(minLength, maxLength)` (after rivers)
9. **Ecology materialization**:
   - Biomes/features stamping (either write from Ecology artifacts or invoke base-standard generators).
   - `TerrainBuilder.validateAndFixTerrain()`
   - `AreaBuilder.recalculateAreas()`
10. `TerrainBuilder.storeWaterData()` (after terrain/features are final)
11. **Gameplay placement** (resources → starts → discoveries), then `FertilityBuilder.recalculate()` (via adapter) and advanced start regions.

**Determinism guarantees (hard rule):**
- Stamping must be deterministic given identical:
  - physics artifacts + config inputs,
  - seed.
  - Note: topology is fixed (`wrapX=true`, `wrapY=false`) and therefore not modeled as an input knob.
- All stochasticity must be sourced from engine-stable RNG calls (e.g., `TerrainBuilder.getRandomNumber(max, label)`) or from explicit seeded RNG surfaces in the pipeline. Do not use ambient JS randomness.
- Any iteration over sets/maps must be order-stable (sort by deterministic keys before acting).

**Non-negotiable directionality:**
Stamped/projection surfaces are **derived-only** and must not be read back into physics domains as input truth.

---

## Drop-in spec text — LandmassRegionId projection contract (Gameplay-owned)

### Gameplay Projection: LandmassRegionId (“Homelands vs Distant Lands” / East vs West slots)

**Definition:**
LandmassRegionId is an engine-facing, gameplay-owned **per-tile labeling projection** used by Civ7 start placement, resource distribution, and age transition systems. It is derived from Morphology’s authoritative landmass decomposition and does not influence physics domains.

**Engine constraints (evidence):**
- Starts filter by LandmassRegionId (`StartPositioner.divideMapIntoMajorRegions(..., landmassRegionIdFilter)`): `.civ7/outputs/resources/Base/modules/base-standard/maps/assign-starting-plots.js`.
- Resources and age transitions gate placement using LandmassRegionId: `.../maps/resource-generator.js` and `.../scripts/age-transition-post-load.js`.
- Resources/age transitions treat LandmassRegionId as a **factor-coded key** (membership via `%`), so region ids must come from engine `LandmassRegion.*` constants and must not be invented:
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/resource-generator.js`
  - `.civ7/outputs/resources/Base/modules/base-standard/scripts/age-transition-post-load.js`
- If using `expandCoasts(...)`, newly-created coastal water tiles inherit LandmassRegionId from adjacent coast tiles, so LandmassRegionId stamping must cover coast tiles early enough:
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/elevation-terrain-generator.js`
- Therefore LandmassRegionId must be stamped **before** any downstream systems that place starts/resources or apply age transitions.

**Inputs (required):**
- `artifact:morphology.landmasses` (authoritative snapshot), minimally:
  - `landmasses[]`: `{ id, tileCount, bbox:{west,east,south,north}, ... }`
  - `landmassIdByTile: Int32Array` (width*height) mapping tiles to landmass id, or `-1` for not-in-landmass.
- Map dimensions (`width`, `height`). Topology is cylindrical in X and clamped in Y; **do not accept wrap flags as inputs**.
- Gameplay policy inputs:
  - `playersLandmass1`, `playersLandmass2` (or equivalent “Distant Lands” mode), determining whether one or two major regions are required.
  - Selection policy for what counts as “major landmass” vs “island/other”.

**Outputs:**
- `TerrainBuilder.setLandmassRegionId(x, y, regionId)` for each tile.
- Region IDs must be sourced from engine constants (no numeric literals):
  - Use engine-provided constants like `LandmassRegion.LANDMASS_REGION_WEST` / `LandmassRegion.LANDMASS_REGION_EAST` (as base-standard scripts do).
  - If the adapter later wraps these, prefer the adapter wrapper, but still treat them as engine constants (no literals).

**Deterministic semantics (recommended canonical algorithm):**

1. **Select major landmasses**
   - Let `requiredMajor = playersLandmass2 > 0 ? 2 : 1`.
   - Choose the `requiredMajor` landmasses with the highest `tileCount`.
   - Tie-breakers (in order, all deterministic):
     1) higher `tileCount`
     2) lower wrapped center-x (see below)
     3) lower `id`

2. **Compute wrapped center-x for region assignment (cylindrical wrapX)**
   - BBox encoding on a cylinder:
     - If `bbox.west <= bbox.east`, the landmass does not cross the seam; treat as the interval `[west..east]`.
     - If `bbox.west > bbox.east`, the landmass crosses the seam; treat as the wrapped interval `[west..width-1] ∪ [0..east]`.
   - Define `intervalLen` (inclusive) as:
     - `west <= east`: `intervalLen = east - west + 1`
     - `west > east`: `intervalLen = (width - west) + (east + 1)`
   - Define `centerX = (west + floor(intervalLen / 2)) % width` (integer, stable, seam-aware).

3. **Assign each selected landmass to WEST/EAST slot**
   - Primary rule: `centerX < width/2` → WEST else EAST.
   - Conflict rule (two majors both map to same side):
     - Assign the larger landmass by the primary rule; force the other landmass into the opposite slot.
   - Single-major rule:
     - Assign the only major landmass to WEST by default (or a configured “primary slot” policy); all other tiles are NONE/DEFAULT.

4. **Stamp per-tile LandmassRegionId**
   - For each tile index `i`:
     - If `landmassIdByTile[i]` matches a selected major landmass id → set that tile’s region id to that landmass’s assigned slot id.
     - Else → set to NONE/DEFAULT.
   - Optional (if mirroring base-standard continent marking semantics): stamp region ids for **all non-ocean tiles** in major regions (coasts included). This requires the projection to be aware of final terrain classes or a separate “coast propagation” pass.

**Guardrails (must ship with projection):**
- Ban numeric LandmassRegionId literals in projection code; only allow adapter-derived ids.
- Test ordering: projection must run before `generateResources(...)` and any start assignment that relies on LandmassRegionId filtering.
- Morphology must not reference LandmassRegionId or west/east runtime continent windows as inputs.

---

## Dependencies / questions for orchestrator (handoff)

### Required upstream contract fields (for determinism)

To make stamping deterministic and drift-resistant, Phase 2 must ensure these inputs exist (schema owned by Agent A, but required by stamping):

- Morphology landmasses snapshot includes:
  - `landmassIdByTile` (dense, width*height) and `landmasses[]` with bbox + tileCount.
  - BBox semantics are **wrap-aware**: allow `west > east` to represent a wrapped interval that crosses the seam (required on a cylinder).
  - Landmass connectivity must be computed with seam adjacency (tiles at `x=0` and `x=width-1` are neighbors where hex offsets apply).
- Morphology provides enough information to derive Gameplay surface classes deterministically, either as:
  - explicit per-tile `terrainClass` (OCEAN/COAST/FLAT/HILL/MOUNTAIN), or
  - continuous fields + explicit projection policy (thresholds) that Gameplay uses to stamp terrain types.
- Volcano intent is available as data (e.g., volcanoMask/list), even if the actual `setFeatureType` is applied in Gameplay stamping.

### Coordination points (affects Agent A/C scope; do not guess in Phase 2)

- **Region IDs for “minor landmasses / islands”:** base-standard sometimes tags islands via `PlotTags.PLOT_TAG_ISLAND` (e.g. `continents-voronoi.js`) instead of stamping a landmass region id. Decide whether Phase 2 requires:
  - LandmassRegionId only for the major regions, and islands stay NONE/DEFAULT + optional ISLAND tag, or
  - all land tiles get a region id.
- **LandmassRegion `DEFAULT/NONE/ANY` typing mismatch:** base-standard scripts reference these constants; `packages/civ7-types/index.d.ts` currently only declares `WEST/EAST`. Decide whether to update declared constants so docs/spec/code can name them without `as any` shims.
- **wrapX is canonical (not optional):** Phase 2 contracts should treat `wrapX=true`, `wrapY=false` as topology invariants, and projection math (landmasses, region assignment, distances) must be seam-aware. Wrap flags exist in engine init data but must not be modeled as an input knob for projection/stamping semantics.
- **Engine coast/lake postprocess ownership:** base-standard uses `expandCoasts*` and `generateLakes(...)` (terrain-topology mutations) before `buildElevation`. If the canonical physics truth must include these mutations, Phase 2 must lock whether:
  - physics domains own them as modeled ops (preferred), or
  - Gameplay stamping is allowed to mutate terrain topology, and if so, whether/how physics artifacts are kept consistent (to avoid drift).

---

## Agent handoff (A/C)

### For Agent A (contracts & ownership)

- Ensure Morphology truth artifacts do not embed engine IDs (terrain ids, LandmassRegionId, plot tags); treat any existing embeddings as legacy migration work into Gameplay’s `artifact:map.*` projection layer.
- Lock `artifact:morphology.landmasses` seam-aware semantics:
  - adjacency wraps X and clamps Y,
  - bbox can be wrapped (`west > east`),
  - deterministic landmass id stability and tie-breakers (needed for deterministic LandmassRegionId projection).
- Provide a canonical volcano intent surface as **data** (e.g., `artifact:morphology.volcanoes`), so Gameplay can deterministically stamp `FEATURE_VOLCANO` without overlays.

### For Agent C (pipeline stages/steps)

- Model a Gameplay-owned stamping/materialization phase that includes the Civ7-required postprocess sequence:
  - `validateAndFixTerrain` → `recalculateAreas` → `stampContinents` → `buildElevation` → `modelRivers`/`defineNamedRivers` → `storeWaterData` → `recalculateFertility`, with explicit ordering and re-validation after terrain topology edits.
- If `expandCoasts(...)` is used, ensure LandmassRegionId stamping happens before it (coast expansion copies region ids into newly-created coast tiles).
- Wire effect tags as the execution guarantees (`effect:map.*Plotted`) for downstream ordering without receipts/hashes.

## Doc-structure mismatches to fix in Phase 2 canonical doc (observed)

These are mechanical “internal consistency” issues worth fixing as part of the Phase 2 hardening:

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md` Appendix C claims there is a “**22: Open questions / deep-dive**” section, but there is no Section 22 body.
- The references list `.../spike-morphology-greenfield.md` and `.../spike-morphology-current-state.md`, but the actual files in this directory are `.../spike-morphology-greenfield-gpt.md` and `.../spike-morphology-current-state-gpt.md`.
