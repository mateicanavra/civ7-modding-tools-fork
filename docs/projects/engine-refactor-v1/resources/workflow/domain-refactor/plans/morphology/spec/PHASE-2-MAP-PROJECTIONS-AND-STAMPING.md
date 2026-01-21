# Morphology Phase 2 — Map Projections & Civ7 Stamping

This is a canonical Phase 2 spec file split out of `spike-morphology-modeling-gpt.md`.

Rules:
- Keep one canonical copy of each concept (link across spec files; do not duplicate).
- Completeness-first (no “minimal” framing).

This file owns:
- `artifact:map.*` projection artifacts (Gameplay-owned; map surfaces).
- `effect:map.*<Verb>` execution guarantees (Gameplay-owned; boolean; semantic short verbs; no receipts/hashes/versions).
- Civ7 stamping/materialization modeling (engine calls + ordering constraints), with evidence pointers.

This file does not own:
- The full pipeline topology narrative (see `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`).
- Truth artifact schemas and truth contracts (see `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`).

---

## 1) Locked invariants (do not re-open)

### 1.1 Map topology (Civ7)

- `wrapX = true` always (east–west wraps).
- `wrapY = false` always (north–south does not wrap).
- No environment/config/knobs for wrap flags in Phase 2.

### 1.2 Ownership and dependency direction

- Physics domains publish truth-only artifacts (pure).
- Gameplay owns all engine-facing projections and all engine stamping/materialization via adapter writes.
- No backfeeding: physics must not require/consume `artifact:map.*` or engine tags as truth inputs.
- Gameplay projection/stamping steps consume physics artifacts (Foundation and Morphology) as read-only inputs.
- If a projection/stamping step needs Foundation context, it consumes:
  - mesh-first truths (e.g., `artifact:foundation.mesh|plateGraph|tectonics`), and/or
  - the canonical derived tile view `artifact:foundation.plates` (see `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`).
- Duplicating `artifact:foundation.plates` under `artifact:map.*` is allowed only when Gameplay needs a distinct freeze/reshaping boundary. Default: Gameplay reads the physics artifact directly for annotation/logic.
- “Stamping happened” is represented only by short boolean effects: `effect:map.<thing><Verb>` (no receipts/hashes/versions).
  - Verb posture: use a semantically correct, short, consolidated verb; avoid proliferating verbs without need.
    - `*Plotted` is reserved for stamping/placement (terrain/features/resources/etc.).
    - `*Built` is reserved for TerrainBuilder build steps (e.g., `buildElevation()` → `effect:map.elevationBuilt`).
- Granular step posture: “project-map”/“stamp-map” are template terms only; real step boundaries are granular Gameplay steps (e.g., `plot-*`, `build-*`) that assert the matching `effect:map.<thing><Verb>`.

---

## 2) Model: projection intent vs stamping effects

### 2.1 `artifact:map.*` is Gameplay-owned map surfaces

`artifact:map.*` is the Gameplay-owned, stable map-surface interface. It includes:
- projection/annotation intent derived deterministically from frozen physics truths (and Gameplay configs), adapter-agnostic where possible (names/slots/keys, not engine numeric IDs), and
- (when needed) engine-derived observation layers produced after an explicit `effect:map.*` boundary (e.g., elevation/cliff surfaces after `effect:map.elevationBuilt`) for downstream Gameplay decisions and debugging.
Ban:
- Do not introduce any `artifact:map.realized.*` namespace. Execution guarantees are effects, and any needed engine-derived observations belong under clearly named `artifact:map.*` layers (e.g., `artifact:map.engineElevationByTile`), not a second “realized snapshot” layer.

Rationale:
- Prevent engine coupling from leaking into physics truth.
- Keep effects honest: a boolean “Plotted” effect is safe only if the corresponding intent cannot mutate after stamping begins.

### 2.2 `effect:map.*<Verb>` is execution (adapter/engine side effects)

A Gameplay execution step (e.g., `plot-*` or `build-*`) typically:
- reads physics truth (read-only),
- computes the required projection intent deterministically (publishing `artifact:map.*` only when it is a downstream contract surface),
- performs adapter writes (engine stamping/materialization),
- then asserts `effect:map.<thing><Verb>` to signal “this work has happened”.

---

## 3) Required `artifact:map.*` surfaces (Phase 2)

Note (closure-grade; avoids dual-path confusion):
- Not every `effect:map.*Plotted` requires a published `artifact:map.*` intent surface.
- The canonical pattern is:
  - If downstream steps need a stable projection surface, publish it under `artifact:map.*` (publish-once; frozen before stamping begins).
  - Otherwise, the `plot-*` stamping step computes its intent deterministically from frozen physics truth as an internal pure projection and applies it immediately; the effect is the contract that stamping occurred.
This preserves a single canonical path (Physics truth → Gameplay projection logic → stamping) without forcing publication of intent artifacts that have no downstream consumers.

### 3.1 `artifact:map.projectionMeta` (required)

Purpose: allow downstream Gameplay steps to interpret projection rasters without importing physics.

Schema (Phase 2):
- `width: number`
- `height: number`
- `wrapX: true`
- `wrapY: false`

Notes:
- `wrapX/wrapY` are values, not knobs; this is metadata redundancy for downstream sanity checks.

### 3.2 Landmass region projection (required)

#### `artifact:map.landmassRegionSlotByTile` (required)

Tile-indexed raster mapping each tile to a **slot**:
- `0 = none`
- `1 = west`
- `2 = east`

Constraints:
- Slot assignment is computed from `artifact:morphology.landmasses` (truth) and map topology (wrapX interval semantics).
- Water tiles MUST be `none`.
- Slots are adapter-agnostic; stamping resolves slots → engine ids via adapter constants.

#### `artifact:map.landmassRegionIdByTile` (allowed; derived-only)

Tile-indexed raster mapping each tile to an **engine region id** derived from slots:
- `none` → `adapter.getLandmassId("NONE")`
- `west` → `adapter.getLandmassId("WEST")`
- `east` → `adapter.getLandmassId("EAST")`

This is a Gameplay-owned derived artifact for debugging/inspection. Canonical logic should treat `artifact:map.landmassRegionSlotByTile` as the projection truth surface and resolve slots → engine ids at stamping time via the adapter.

---

## 4) Required `effect:map.*Plotted` guarantees (Phase 2)

Effects are Gameplay-owned and boolean. Each effect MUST be asserted only after:
- the step has completed all relevant adapter writes for the full map, and
- any required immediate engine validation/recalc calls have been executed.

Constraint (truth preservation; no hidden backfeeding):
- Engine “fixup” calls (e.g., `validateAndFixTerrain`, `expandCoasts`) are allowed only as part of stamping/materialization ordering, but they must not silently change Physics truth (especially land/water classification derived from `artifact:morphology.topography.landMask`).
- If a fixup can change topology/landmask, the step must:
  - treat that as an integration failure, and
  - re-assert truth by re-stamping from Physics artifacts (or fail fast with a guardrail), rather than allowing engine state to become a new upstream truth.

### 4.1 Canonical effect taxonomy (required)

- `effect:map.landmassRegionsPlotted`
  - Meaning: `TerrainBuilder.setLandmassRegionId(x,y, ...)` has been applied for all tiles (or for all tiles in the step’s declared scope) using adapter constants (no numeric literals).
- `effect:map.coastsPlotted`
  - Meaning: coastline expansion has been invoked (`expandCoasts(width,height)`), and the runtime map state required by subsequent steps has been synchronized (if the recipe maintains local copies like `heightfield.landMask/terrain`).
- `effect:map.continentsPlotted`
  - Meaning: continent stamping has been executed (`stampContinents()`), with required `AreaBuilder.recalculateAreas()` ordering.
- `effect:map.elevationBuilt`
  - Meaning: elevation build has been executed (`buildElevation()`), with required `AreaBuilder.recalculateAreas()` ordering.
- `effect:map.mountainsPlotted`
  - Meaning: mountain/hill terrain has been applied for all tiles in the step’s declared scope (via per-tile `setTerrainType(x,y,...)` / `adapter.setTerrainType`), and any required immediate engine validation has been performed.
- `effect:map.volcanoesPlotted`
  - Meaning: volcano features have been applied in the step’s declared scope (via per-tile `setFeatureType(x,y, FeatureData)` / `adapter.setFeatureType`), including any required terrain writes (e.g. ensuring volcano tiles are mountain terrain), and any required immediate engine validation has been performed.
- `effect:map.biomesPlotted`
  - Meaning: biomes have been applied for all tiles via per-tile `setBiomeType(x,y,...)`, and any required engine validation has been performed.
- `effect:map.featuresPlotted`
  - Meaning: features have been applied for all tiles/placements via per-placement `setFeatureType(x,y, FeatureData)`, and any required engine validation has been performed.
- `effect:map.riversPlotted`
  - Meaning: river materialization has been executed (`modelRivers(...)` + `defineNamedRivers()`), and any required engine validation/synchronization has been performed.
- `effect:map.waterDataPlotted`
  - Meaning: water data has been stored (`storeWaterData()`).

Notes:
- Effects listed here are the Phase 2 **canonical** map-stamping execution guarantees.
- Do not mint ad-hoc `effect:map.*` names in recipes. Adding a new map-stamping boundary requires updating this spec (and aligning tag registry) so downstream deps remain stable.

---

## 5) Projection rules: LandmassRegionId (Phase 2)

### 5.1 LandmassRegionId semantics (what it is for)

Landmass region tagging is an engine-facing region classification used by Gameplay systems (not physics truth).

- Verified (engine surface): `TerrainBuilder.setLandmassRegionId(x,y, regionId)` exists and is exposed via adapter.
  - Evidence: `packages/civ7-types/index.d.ts` and `packages/civ7-adapter/src/civ7-adapter.ts`.
- Verified (available constants): `LandmassRegion.LANDMASS_REGION_WEST` and `LandmassRegion.LANDMASS_REGION_EAST` exist; Phase 2 uses only `WEST|EAST|NONE` via adapter constants.
  - Evidence: `packages/civ7-types/index.d.ts`.
- Verified (repo usage): projection is applied before resource generation and start placement in the current recipe.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts` and `mods/mod-swooper-maps/test/placement/landmass-region-id-projection.test.ts`.
- Phase 2 contract: LandmassRegionId is a 2-slot partition (“west” vs “east”) plus “none” for water/invalid.

### 5.2 Deterministic projection rule (slot assignment)

Inputs (truth):
- `artifact:morphology.landmasses.landmassIdByTile`
- `artifact:morphology.landmasses.landmasses[]` (stable `id` and cylindrical bbox `{ west, east, south, north }`)
- `artifact:morphology.topography.landMask` (or equivalent; needed to avoid tagging water tiles)

Algorithm (Phase 2; deterministic):
1) Build `regionSlotByLandmass[id]`:
   - For each landmass `mass`, compute `centerX` of the landmass bbox on a cylinder (wrapX interval).
   - If `centerX < width / 2`, slot = `west`, else slot = `east`.
2) Build `landmassRegionSlotByTile[i]`:
   - If tile is water (`landMask[i] === 0`), slot = `none`.
   - Else if landmass id is invalid/out-of-range, slot = `none`.
   - Else slot = `regionSlotByLandmass[landmassId]`.

Tie-breakers:
- The “exactly half” boundary uses a strict `< width/2` check; ties fall to `east`.

Verified (repo implementation of the above):
- `computeWrappedIntervalCenter(west, east, width)` is implemented and used to pick a bbox center on a wrapX cylinder.
- Region selection uses `centerX < width/2 ? WEST : EAST`.
- Water/invalid tiles become `NONE`.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`.

### 5.3 Stamping rule (slots → engine ids; adapter-only)

Stamping is executed by a `plot-landmass-regions` step:
- Resolve ids via adapter constants:
  - `westRegionId = adapter.getLandmassId("WEST")`
  - `eastRegionId = adapter.getLandmassId("EAST")`
  - `noneRegionId = adapter.getLandmassId("NONE")`
- For each tile:
  - `adapter.setLandmassRegionId(x, y, resolvedRegionId)`
- Assert `effect:map.landmassRegionsPlotted`.

Verified (repo):
- Adapter exposes `getLandmassId(name)` and throws if a requested `LANDMASS_REGION_<NAME>` constant is missing (integration failure, not a soft fallback).
  - Evidence: `packages/civ7-adapter/src/civ7-adapter.ts`.
- Current projection stamps via `adapter.setLandmassRegionId` using adapter constants, not numeric literals.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts` and `mods/mod-swooper-maps/test/placement/landmass-region-id-projection.test.ts`.

---

## 6) Civ7 stamping/materialization: required engine calls and ordering constraints

This section models what Phase 2 needs to lock about Civ7 materialization: which engine calls exist, what they imply, and what ordering constraints must be explicit as step boundaries.

Important:
- The exact stage topology that hosts these `plot-*` steps is described elsewhere; this file defines the guarantees and the evidence-backed constraints.
- Any step that performs these calls is Gameplay-owned (even if braided between physics stages) because it performs adapter effects.
- Effects in this file are **Gameplay→Gameplay ordering guarantees only**: physics steps must never `require`/consume `effect:map.*` (or adapter state) as inputs.

### 6.1 Engine calls (verified surfaces)

Verified (engine/adapters in this repo):
- `expandCoasts(width,height)`
  - Evidence: `packages/civ7-adapter/src/civ7-adapter.ts` and `/base-standard/maps/elevation-terrain-generator.js` declaration in `packages/civ7-types/index.d.ts`.
- `validateAndFixTerrain()`
  - Evidence: `packages/civ7-adapter/src/civ7-adapter.ts` and `packages/civ7-types/index.d.ts`.
- `recalculateAreas()` (AreaBuilder)
  - Evidence: `packages/civ7-adapter/src/civ7-adapter.ts` and `packages/civ7-types/index.d.ts`.
- `stampContinents()`
  - Evidence: `packages/civ7-adapter/src/civ7-adapter.ts` and `packages/civ7-types/index.d.ts`.
- `buildElevation()`
  - Evidence: `packages/civ7-adapter/src/civ7-adapter.ts` and `packages/civ7-types/index.d.ts`.
- `modelRivers(minLength, maxLength, navigableTerrain)` and `defineNamedRivers()`
  - Evidence: `packages/civ7-adapter/src/civ7-adapter.ts` and `packages/civ7-types/index.d.ts`.
- `storeWaterData()`
  - Evidence: `packages/civ7-adapter/src/civ7-adapter.ts` and `packages/civ7-types/index.d.ts`.
- `designateBiomes(width,height)` and `addFeatures(width,height)` (base-standard modules)
  - Evidence: `packages/civ7-adapter/src/civ7-adapter.ts` and `/base-standard/maps/feature-biome-generator.js` declaration in `packages/civ7-types/index.d.ts`.
- Per-tile setters:
  - `setTerrainType`, `setBiomeType`, `setFeatureType`, `setRainfall`, `setLandmassRegionId`
  - Evidence: `packages/civ7-types/index.d.ts` and `packages/civ7-adapter/src/civ7-adapter.ts`.

### 6.2 Ordering constraints (Phase 2 contract; evidence-backed)

#### Coast expansion (`effect:map.coastsPlotted`)

- Verified (repo call exists): `expandCoasts(width,height)` is called during map generation.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts`.
- Verified (repo behavior): after `expandCoasts`, the recipe syncs engine terrain + land/water state back into its local runtime buffers (`heightfield.terrain`, `heightfield.landMask`).
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts`.
- Phase 2 contract: any step that asserts `effect:map.coastsPlotted` MUST include the required “synchronization” work for the specific recipe runtime (if local buffers exist); otherwise downstream steps compute projections from stale land/water/terrain state.
- Phase 2 contract: this “sync back into runtime buffers” is Gameplay/runtime map state only and MUST NOT be treated as mutating Physics truth; any divergence from `artifact:morphology.topography.landMask` is an integration failure and must trigger re-stamp or fail-fast guardrails (never backfeed engine state into Physics).

#### Continent stamping (`effect:map.continentsPlotted`)

- Verified (repo ordering): `validateAndFixTerrain()` → `recalculateAreas()` → `stampContinents()`.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`.
- Phase 2 contract: `plot-continents` MUST include `recalculateAreas()` immediately before `stampContinents()`.

#### Elevation build (`effect:map.elevationBuilt`)

- Verified (repo ordering): `recalculateAreas()` → `buildElevation()` → `recalculateAreas()` → `stampContinents()`.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts`.
- Verified (base-standard posture): Civ7 scripts call `TerrainBuilder.buildElevation()` once, then read `GameplayMap.getElevation(...)` and `GameplayMap.isCliffCrossing(...)` to drive additional terrain decisions (e.g., hill placement).
  - Evidence: `.civ7/outputs/resources/Base/modules/base-standard/maps/terra-incognita.js` and `.civ7/outputs/resources/Base/modules/base-standard/maps/elevation-terrain-generator.js`.
- Phase 2 contract:
  - `buildElevation()` produces an engine-derived elevation/cliff field and MUST be represented as a first-class `build-*` effect boundary (never as an implicit side-effect).
  - Engine-derived elevation/cliffs are Gameplay/map state only:
    - allowed consumers: Gameplay steps that run after `effect:map.elevationBuilt` (typically `plot-*` stamping steps),
    - forbidden consumers: all Physics domain steps (no backfeeding via engine reads).
  - Any existing use of `buildElevation()` + engine readback (`GameplayMap.getElevation(...)`, `GameplayMap.isCliffCrossing(...)`, `syncHeightfield(...)`) inside Physics stages is legacy wiring that Phase 3 must delete or re-home into `build-elevation` and other Gameplay steps (pipeline-green; no shims).
  - “No drift” closure:
    - Physics does not define “cliffs” as a canonical truth artifact. Civ7 cliffs are an engine-derived, adjacency-level property exposed as `GameplayMap.isCliffCrossing(...)`.
    - If a decision must match the actual Civ7 cliff layout (e.g., any rule that queries `isCliffCrossing` or uses engine elevation bands), that decision belongs in Gameplay/map `plot-*` steps that run **after** `effect:map.elevationBuilt`, and it must read the engine-derived surfaces directly (or via `artifact:map.*` projections produced after the effect).
    - Physics domains may compute cliff-like *physics signals* (slope/roughness/relief, plateau-ness, escarpment likelihood) from Physics elevation for physics processes, but those signals must not be treated as “the Civ7 cliffs”.
  - “No drift” concretely means:
    - If a downstream decision must be correct against the *actual stamped map* (e.g., “avoid cliffs when stamping biome X”, “place feature only on elevation band Y”, “prefer a pass where there is no cliff crossing”), it is a Gameplay decision that consumes engine-derived surfaces after `effect:map.elevationBuilt`.
    - If a downstream decision only needs physical plausibility (not exact Civ7 cliff layout), it should use Physics truth/signal fields and must not call engine queries.
    - Avoid the bug class “Physics proxy says cliff here, but Civ7 stamped cliff elsewhere” by never using Physics proxies for decisions that require Civ7 cliff correctness.

##### Optional `artifact:map.*` observations derived from `build-elevation`

If downstream Gameplay steps need stable, testable access without re-querying the engine repeatedly, `build-elevation` MAY publish:
- `artifact:map.engineElevationByTile` (allowed; derived-only)
  - Per-tile numeric values equal to `GameplayMap.getElevation(x,y)` captured immediately after `adapter.buildElevation()`.
- `artifact:map.cliffCrossingMaskByTile` (allowed; derived-only)
  - Per-tile bitmask for cliff crossings derived from `GameplayMap.isCliffCrossing(x,y, direction)` for the canonical 6-direction ordering.

These are Gameplay/map artifacts (engine-derived observations), not Physics truth, and Physics must not consume them.

#### Rivers (`effect:map.riversPlotted`)

- Verified (repo ordering): `modelRivers(...)` → `validateAndFixTerrain()` → (sync heightfield) → `defineNamedRivers()`.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`.
- Phase 2 contract: `plot-rivers` is the only boundary allowed to read/modify engine river state. No downstream step must rely on runtime-local river buffers; downstream reads rivers via engine queries only. If the recipe runtime keeps any internal caches, `plot-rivers` MUST synchronize them before asserting `effect:map.riversPlotted`.

#### Water data (`effect:map.waterDataPlotted`)

- Verified (repo ordering): `storeWaterData()` is invoked during placement apply before region projection/resources/starts.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`.
- Inferred (Phase 2 contract): water data storage is part of the stamping/materialization boundary and must be explicit if any downstream step assumes it (e.g., placement systems querying navigability/coasts).

#### Biomes (`effect:map.biomesPlotted`)

- Verified (repo): per-tile biome stamping uses `adapter.setBiomeType(x,y, biomeId)` in the Ecology biomes step.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts`.
- Verified (engine surface exists): `designateBiomes(width,height)` exists as an adapter function (base-standard module).
  - Evidence: `packages/civ7-adapter/src/civ7-adapter.ts` and `packages/civ7-types/index.d.ts`.
- Phase 2 contract: `plot-biomes` stamps biomes via per-tile adapter writes only. Engine-side biome generators are not used in Phase 2 because they introduce engine-coupled truth and obscure determinism.

#### Features (`effect:map.featuresPlotted`)

- Verified (repo): per-placement feature stamping uses `adapter.setFeatureType(x,y, FeatureData)` and then validates + recalculates areas.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts`.
- Verified (engine surface exists): `addFeatures(width,height)` exists as an adapter function (base-standard module).
  - Evidence: `packages/civ7-adapter/src/civ7-adapter.ts` and `packages/civ7-types/index.d.ts`.
- Verified (FeatureData shape): `FeatureData` includes `{ Feature, Direction, Elevation }`.
  - Evidence: `packages/civ7-types/index.d.ts`.

---

## 7) `plot-*` boundary contract table (Phase 2)

This table is the contract-facing mapping Phase 2 expects downstream authors to rely on:
- step names are canonical,
- each row defines an effect boundary and its allowed Physics truth inputs,
- Physics steps must never `require`/consume any of these `effect:map.*` guarantees.

| Gameplay execution step (canonical) | Provides | Allowed Physics truth reads | Publishes `artifact:map.*` surfaces | Adapter writes / required engine calls |
|---|---|---|---|---|
| `plot-landmass-regions` | `effect:map.landmassRegionsPlotted` | `artifact:morphology.landmasses`, `artifact:morphology.topography.landMask` | `artifact:map.projectionMeta`, `artifact:map.landmassRegionSlotByTile` (and optionally the derived-only debug view `artifact:map.landmassRegionIdByTile`) | `adapter.setLandmassRegionId(x,y, ...)` using `adapter.getLandmassId("WEST"|"EAST"|"NONE")` only |
| `plot-coasts` | `effect:map.coastsPlotted` | `artifact:morphology.topography.landMask` (validation/guardrail only) | — | `adapter.expandCoasts(width,height)` + required sync of any runtime-local buffers before asserting the effect |
| `plot-continents` | `effect:map.continentsPlotted` | — | — | `adapter.validateAndFixTerrain()` → `adapter.recalculateAreas()` → `adapter.stampContinents()` |
| `build-elevation` | `effect:map.elevationBuilt` | — | — (optional: `artifact:map.engineElevationByTile`, `artifact:map.cliffCrossingMaskByTile`) | `adapter.recalculateAreas()` → `adapter.buildElevation()` → `adapter.recalculateAreas()` → `adapter.stampContinents()` |
| `plot-mountains` | `effect:map.mountainsPlotted` | `artifact:morphology.topography` (elevation/landMask), `artifact:foundation.plates` (boundary context) | — | per-tile terrain writes (e.g., `adapter.setTerrainType(x,y,...)`) + required immediate validation (if used by the runtime) |
| `plot-volcanoes` | `effect:map.volcanoesPlotted` | `artifact:morphology.volcanoes`, `artifact:morphology.topography.landMask` (land-only invariant), `artifact:foundation.plates` (context) | — | per-tile feature writes (e.g., `adapter.setFeatureType(x,y, FeatureData)`) and any required companion terrain writes + required immediate validation (if used by the runtime) |
| `plot-rivers` | `effect:map.riversPlotted` | `artifact:hydrology.hydrography` | — | `adapter.modelRivers(...)` → `adapter.validateAndFixTerrain()` → `adapter.defineNamedRivers()` (+ required sync of any internal caches before asserting the effect) |
| `plot-water-data` | `effect:map.waterDataPlotted` | — | — | `adapter.storeWaterData()` |
| `plot-biomes` | `effect:map.biomesPlotted` | `artifact:ecology.biomeClassification` | — | per-tile `adapter.setBiomeType(x,y, ...)` (+ validation if required) |
| `plot-features` | `effect:map.featuresPlotted` | `artifact:ecology.featureIntents` | — | per-placement `adapter.setFeatureType(x,y, FeatureData)` → `adapter.validateAndFixTerrain()` → `adapter.recalculateAreas()` |

---

## 8) Known legacy mismatches (for Phase 2 readers)

This spec models the desired Phase 2 ownership boundaries. Current repo wiring does not necessarily match (yet); treat mismatches as Phase 3 migration work, not Phase 2 contract ambiguity.

- Verified (repo mismatch): `expandCoasts` is currently called from a Morphology (physics-labeled) stage.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts`.
  - Phase 2 posture: any step that performs engine adapter writes is Gameplay-owned and must assert its corresponding `effect:map.*Plotted`.
- Verified (repo mismatch): `mountains` and `volcanoes` steps currently perform adapter writes from a Morphology (physics-labeled) stage.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts` (`writeHeightfield(...)` calls `adapter.setTerrainType(...)`), and `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts` (`adapter.setFeatureType(...)`).
  - Phase 2 posture: any step that performs engine adapter writes is Gameplay-owned and must assert its corresponding `effect:map.*Plotted`.
