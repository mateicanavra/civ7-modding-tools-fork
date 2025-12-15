# AD-HOC — Mapgen-core Layout/Registry + Full Domain/Lib Atomic Split

This doc started as “layout + registry” (layer folders + standard library + orchestrator switch). That phase is **done**.

This doc now tracks the remaining refactor work to finish the *inside* of each layer:
- Split every algorithm script into atomic `packages/mapgen-core/src/domain/**` modules.
- Consolidate shared helpers into `packages/mapgen-core/src/lib/**`.
- Deprecate + delete **all** legacy re-export facades (`src/layers/**` algorithm shims, `src/narrative/**`, `src/story/**`, and other compatibility exports).

This is intentionally detailed: it is the checklist we’ll use to complete the split and safely remove compatibility paths without determinism drift.

---

## 0) Scope / Definition of Done

**Definition of “fully split”:**
- Algorithms live in `packages/mapgen-core/src/domain/**` as small, single-purpose modules (types + focused functions).
- Domain modules do **not** depend on `ExtendedMapContext` (or pipeline/step wiring). Steps own engine coupling; domain code accepts typed arrays + small “ports” (grid/rng/adapter/IO) and keeps heavy logic in pure kernels.
- Shared helpers live in `packages/mapgen-core/src/lib/**` (math/grid/rng/noise/collections).
- `packages/mapgen-core/src/layers/**` contains *only* Task Graph step wiring (no algorithm implementations, no algorithm re-export shims).
- Legacy re-export surfaces are gone:
  - `packages/mapgen-core/src/layers/**` algorithm shim files (e.g. `layers/hydrology/climate.ts`)
  - `packages/mapgen-core/src/narrative/**`
  - `packages/mapgen-core/src/story/**`
  - `packages/mapgen-core/src/lib/noise.ts` (compat)
- All in-repo callsites import canonical modules (no imports from deleted shims).
- Import policy is enforced: no deep relative imports or deep internal module paths; pipeline/steps import only from stable index/barrel surfaces (and package subpath exports where appropriate).
- Determinism parity is preserved:
  - RNG label strings are unchanged (treat them as part of the contract)
  - No extra RNG calls are introduced during extraction
  - Call order is preserved (especially where RNG is used)

### 0.1 Locked Decisions (Capture These Before We Go Deeper)

- **Hybrid domain architecture (accepted):**
  - Steps own `ExtendedMapContext` + `EngineAdapter` interaction (sync/flush/state changes) and publish artifacts/tags.
  - Domain algorithms do not import `ExtendedMapContext`; they consume typed arrays + small “ports” assembled by steps:
    - `GridOps` (idx/bounds/wrap + neighbor iteration semantics)
    - `Rng` (labeled determinism)
    - narrow `*Adapter` interfaces (only what an algorithm truly needs from engine state)
    - `*IO` ports for reads/writes (explicit commit points)
  - Within a subsystem, structure code as: `types.ts` (contracts), `runtime.ts` (port construction helpers), orchestrators (call order + RNG labels), and pure kernels (array/scalar logic).
- **Determinism contract (accepted):**
  - RNG label strings + call order are treated as contract; extraction must not introduce extra RNG calls.
  - RNG calls should live at orchestrator boundaries; kernels are deterministic unless explicitly passed a `rng` port.
- **No deep import paths (accepted):**
  - Pipeline/steps import only from stable index/barrel surfaces (e.g. `domain/hydrology/climate`), not deep module paths.
  - Domain code may deep-import **only within the same subsystem**; cross-subsystem imports must go through subsystem indices to avoid tight coupling.
- **Path aliasing + packaging (accepted):**
  - Introduce a stable internal TS path alias for mapgen-core source imports (stop `../../../` churn).
  - Use package subpath exports + index barrels to expose stable import surfaces (and keep deep internals private).
- **Wrap + neighborhood semantics (accepted):**
  - Do not “standardize” semantics during refactor; preserve current behavior per module.
  - Encode semantics in helper names (square 3×3 vs hex odd-q, wrap-aware vs bounds-clamped) and require algorithms to choose explicitly.

---

## 1) Status (What’s Already Landed)

### Phase 0 — Layout/registry wiring (done)
- [x] Layer folders + step wrappers under `packages/mapgen-core/src/layers/**` (steps live under `layers/*/steps/*.ts`)
- [x] `packages/mapgen-core/src/layers/standard-library.ts` (registers steps into the registry)
- [x] `packages/mapgen-core/src/MapOrchestrator.ts` switched to Task Graph path calling `registerStandardLibrary(...)`

### Phase 1 — Domain/lib scaffolding + compatibility (done)
- [x] Introduce shared `packages/mapgen-core/src/lib/**` utilities:
  - [x] `lib/math/` (`clamp`, `clamp01`, `clampInt`, `clampPct`, `lerp`)
  - [x] `lib/grid/` (`idx`, `xyFromIndex`, `inBounds`, `wrapX`, neighborhood helpers, `distanceTransform`)
  - [x] `lib/rng/` (`rollUnit`, `pickRandom`, `weightedChoice`)
  - [x] `lib/noise/` (`PerlinNoise`, `normalizeFractal`)
  - [x] `lib/collections/` (`freezeClone`, `asRecord`, `asStringArray`)
- [x] Introduce `packages/mapgen-core/src/domain/**` and copy monolithic scripts into domain (behavior-preserving):
  - [x] `domain/morphology/**` (landmass/coastlines/islands/mountains/volcanoes)
  - [x] `domain/hydrology/climate/index.ts`
  - [x] `domain/ecology/**` (biomes/features)
  - [x] `domain/placement/index.ts`
  - [x] `domain/narrative/**` (partial atomization: overlays/tags/utils)
- [x] Keep compatibility facades (temporary):
  - [x] `packages/mapgen-core/src/layers/**` algorithm shim files re-export domain equivalents
  - [x] `packages/mapgen-core/src/narrative/**` and `packages/mapgen-core/src/story/**` re-export narrative domain

---

## 2) Remaining Milestones (Thin-slice Path)

1. **Finish lib/** consolidation:
   - replace remaining local helpers (`clamp`, `idx`, `normalizeFractal`, neighbor scans) with `lib/**`.
2. **Narrative atomization**:
   - split `domain/narrative/corridors/index.ts` into modules (sea lanes, island hop, river chains, etc.).
   - split `domain/narrative/tagging/index.ts`, `orogeny/index.ts`, `paleo/index.ts`.
3. **Hydrology/Climate atomization**:
   - split `domain/hydrology/climate/index.ts` into `baseline/`, `swatches/`, `refine/`, and shared helpers.
4. **Morphology atomization**:
   - split `domain/morphology/landmass/index.ts` + `landmass/utils.ts` into typed modules (plate → landmask → windows → ocean separation).
   - split coastlines/islands/mountains/volcanoes into scoring/selection/apply modules.
5. **Ecology atomization**:
   - split `domain/ecology/biomes/index.ts` into nudges modules.
   - split `domain/ecology/features/index.ts` into placement modules.
6. **Placement atomization**:
   - split `domain/placement/index.ts` into wonders/floodplains/resources/starts/discoveries/etc.
7. **Delete legacy facades** (after callsites are migrated):
   - remove `src/layers/**` algorithm shim files, `src/narrative/**`, `src/story/**`, and other compatibility exports.
8. **Validation**:
   - ensure determinism parity (tests + seeds), and keep build/typecheck green throughout.

---

## 3) Validation Strategy (Guardrails)

- Run mapgen-core tests frequently; prefer parity/determinism coverage over “unit tests for everything”.
- Add targeted unit tests only when extraction introduces new shared helpers (especially RNG, distance transforms, neighborhood iteration).
- Treat RNG label strings as part of the public contract for determinism during refactor.

---

## 4) Risks / Trade-offs

### Primary risks
- Determinism drift: changing RNG label strings, call order, or introducing extra RNG calls while extracting helpers.
- Neighborhood semantics drift: some modules use square-ish 3×3 scans, others use hex neighbors (and some are parity-based); “unifying” can subtly change behavior.
- Wrap semantics drift: some logic clamps bounds, some wraps X; accidentally standardizing can change coastlines/corridors.
- API break: removing re-export facades will break deep import paths (in-repo and possibly external).

### Mitigations
- Preserve semantics per module at first; create utilities that mirror existing behavior (`forEachNeighbor3x3`, `forEachHexNeighborOddQ`, etc.).
- Keep old exports via `index.ts` re-exports until callsites are migrated.
- Remove facades only after a repo-wide import migration + verification pass.

---

## 5) Target Final `packages/mapgen-core/src/` Layout

This is the end-state structure once legacy shims are deleted.

```text
packages/mapgen-core/src/
  index.ts
  MapOrchestrator.ts

  bootstrap/
  config/
  core/
  dev/
  pipeline/
  world/
  polyfills/
  shims/
  steps/

  layers/                       # wiring only
    index.ts
    standard-library.ts
    foundation/
      index.ts
      steps/
        FoundationStep.ts
        index.ts
    morphology/
      index.ts
      steps/
        LandmassStep.ts
        CoastlinesStep.ts
        RuggedCoastsStep.ts
        IslandsStep.ts
        MountainsStep.ts
        VolcanoesStep.ts
        index.ts
    hydrology/
      index.ts
      steps/
        ClimateBaselineStep.ts
        ClimateRefineStep.ts
        RiversStep.ts
        LakesStep.ts
        index.ts
    ecology/
      index.ts
      steps/
        BiomesStep.ts
        FeaturesStep.ts
        index.ts
    narrative/
      index.ts
      steps/
        StorySeedStep.ts
        StoryHotspotsStep.ts
        StoryRiftsStep.ts
        StoryOrogenyStep.ts
        StoryCorridorsStep.ts
        StorySwatchesStep.ts
        index.ts
    placement/
      index.ts
      steps/
        PlacementStep.ts
        LegacyPlacementStep.ts
        index.ts

  domain/                       # algorithms (atomized)
    morphology/
      landmass/
        index.ts
        types.ts
        crust-mode.ts
        water-target.ts
        crust-first-landmask.ts
        terrain-apply.ts
        plate-stats.ts
        windows.ts
        diagnostics.ts
        ocean-separation/
          index.ts
          types.ts
          policy.ts
          row-state.ts
          carve.ts
          fill.ts
          apply.ts
        post-adjustments.ts
      coastlines/
        index.ts
        types.ts
        plate-bias.ts
        adjacency.ts
        corridor-policy.ts
        rugged-coasts.ts
      islands/
        index.ts
        types.ts
        adjacency.ts
        fractal-threshold.ts
        placement.ts
      mountains/
        index.ts
        types.ts
        scoring.ts
        selection.ts
        apply.ts
      volcanoes/
        index.ts
        types.ts
        scoring.ts
        selection.ts
        apply.ts

    hydrology/
      climate/
        index.ts
        types.ts
        runtime.ts
        distance-to-water.ts
        orographic-shadow.ts
        baseline.ts
        swatches/
          index.ts
          types.ts
          chooser.ts
          macro-desert-belt.ts
          equatorial-rainbelt.ts
          rainforest-archipelago.ts
          mountain-forests.ts
          great-plains.ts
          monsoon-bias.ts
        refine/
          index.ts
          types.ts
          water-gradient.ts
          orographic-shadow.ts
          river-corridor.ts
          rift-humidity.ts
          orogeny-belts.ts
          hotspot-microclimates.ts

    ecology/
      biomes/
        index.ts
        types.ts
        globals.ts
        coastal.ts
        nudges/
          tundra-restraint.ts
          tropical-coast.ts
          river-valley.ts
          corridor-bias.ts
          corridor-edge-hints.ts
          rift-shoulder.ts
      features/
        index.ts
        types.ts
        indices.ts
        place-feature.ts
        paradise-reefs.ts
        shelf-reefs.ts
        volcanic-vegetation.ts
        density-tweaks.ts

    narrative/
      index.ts
      utils/
        dims.ts
        rng.ts
        water.ts
        adjacency.ts
        latitude.ts
      tagging/
        index.ts
        types.ts
        margins.ts
        hotspots.ts
        rifts.ts
      corridors/
        index.ts
        types.ts
        style-cache.ts
        runtime.ts
        sea-lanes.ts
        island-hop.ts
        land-corridors.ts
        river-chains.ts
        backfill.ts
      orogeny/
        index.ts
        cache.ts
        wind.ts
        belts.ts
      paleo/
        index.ts
        rainfall-artifacts.ts
      overlays/
        index.ts
        keys.ts
        registry.ts
        normalize.ts
        hydrate-margins.ts
        hydrate-rifts.ts
        hydrate-corridors.ts
      tags/
        index.ts
        instance.ts
        ops.ts
      swatches.ts

    placement/
      index.ts
      types.ts
      wonders.ts
      floodplains.ts
      terrain-validation.ts
      areas.ts
      water-data.ts
      snow.ts
      resources.ts
      starts.ts
      discoveries.ts
      fertility.ts
      advanced-start.ts
      diagnostics.ts

  lib/                          # shared utilities
    math/
      clamp.ts
      lerp.ts
      index.ts
    rng/
      unit.ts
      pick.ts
      weighted-choice.ts
      index.ts
    grid/
      bounds.ts
      wrap.ts
      indexing.ts
      neighborhood/
        square-3x3.ts
        hex-oddq.ts
      distance/
        bfs.ts
      index.ts
    noise/
      perlin.ts
      fractal.ts
      index.ts
    collections/
      freeze-clone.ts
      record.ts
      index.ts
    heightfield/               # existing, keep
      base.ts
      sea-level.ts
    plates/                    # existing, keep
      crust.ts
      topology.ts
```

---

## 6) Remaining Work Manifest (Atomic Splits)

Each bullet is a **target file** and the **symbols it should own** once fully split.
Sources listed are the current monolithic implementations (mostly `domain/**/index.ts` today).

### 6.1 Shared `lib/**` consolidation (remaining)

- [ ] Replace local duplicates with canonical helpers:
  - `clamp*` → `packages/mapgen-core/src/lib/math/clamp.ts`
  - `idx/xyFromIndex` → `packages/mapgen-core/src/lib/grid/indexing.ts`
  - `normalizeFractal` → `packages/mapgen-core/src/lib/noise/fractal.ts`
  - square neighbor scans → `packages/mapgen-core/src/lib/grid/neighborhood/square-3x3.ts`
  - hex neighbors (wrap-aware) → `packages/mapgen-core/src/lib/grid/neighborhood/hex-oddq.ts`
- [ ] Delete compatibility shim `packages/mapgen-core/src/lib/noise.ts` after imports migrate to `lib/noise/index.ts`.

### 6.2 Narrative domain atomization (remaining)

Already split (keep, but continue using as canonical):
- [x] `packages/mapgen-core/src/domain/narrative/utils/*`
- [x] `packages/mapgen-core/src/domain/narrative/tags/*`
- [x] `packages/mapgen-core/src/domain/narrative/overlays/*`

Still to split:

From `packages/mapgen-core/src/domain/narrative/tagging/index.ts`:
- [ ] `packages/mapgen-core/src/domain/narrative/tagging/types.ts`:
  - `ContinentalMarginsOptions`, `HotspotTrailsSummary`, `RiftValleysSummary`
- [ ] `packages/mapgen-core/src/domain/narrative/tagging/margins.ts`: `storyTagContinentalMargins`
- [ ] `packages/mapgen-core/src/domain/narrative/tagging/hotspots.ts`: `storyTagHotspotTrails`
- [ ] `packages/mapgen-core/src/domain/narrative/tagging/rifts.ts`: `storyTagRiftValleys`
- [ ] `packages/mapgen-core/src/domain/narrative/tagging/index.ts`: re-export the above
- [ ] Replace local helpers (`getDims`, `rand`, `isWaterAt`, adjacency/latitude helpers) with `domain/narrative/utils/*`.

From `packages/mapgen-core/src/domain/narrative/corridors/index.ts`:
- [ ] `packages/mapgen-core/src/domain/narrative/corridors/types.ts`:
  - `CorridorStage`, `CorridorKind`, `CorridorStyle`, `Orient`
- [ ] `packages/mapgen-core/src/domain/narrative/corridors/style-cache.ts`:
  - `fetchCorridorStylePrimitive`, `assignCorridorMetadata`, `resetCorridorStyleCache`
- [ ] `packages/mapgen-core/src/domain/narrative/corridors/runtime.ts`:
  - `getDims`, `rand`, `isWaterAt`, `isCoastalLand`, `isAdjacentToShallowWater`, `isAdjacentToLand`
  - (prefer: import from `domain/narrative/utils/*` and keep only corridor-specific glue here)
- [ ] `packages/mapgen-core/src/domain/narrative/corridors/sea-lanes.ts`:
  - `hasPerpWidth`, `longestWaterRunColumn`, `longestWaterRunRow`, `longestWaterRunDiagSum`, `longestWaterRunDiagDiff`, `tagSeaLanes`
- [ ] `packages/mapgen-core/src/domain/narrative/corridors/island-hop.ts`: `tagIslandHopFromHotspots`
- [ ] `packages/mapgen-core/src/domain/narrative/corridors/land-corridors.ts`: `tagLandCorridorsFromRifts`
- [ ] `packages/mapgen-core/src/domain/narrative/corridors/river-chains.ts`: `tagRiverChainsPostRivers`
- [ ] `packages/mapgen-core/src/domain/narrative/corridors/backfill.ts`: `backfillCorridorKinds`
- [ ] `packages/mapgen-core/src/domain/narrative/corridors/index.ts`: `storyTagStrategicCorridors` (orchestrator)

From `packages/mapgen-core/src/domain/narrative/orogeny/index.ts`:
- [ ] `packages/mapgen-core/src/domain/narrative/orogeny/cache.ts`:
  - `OrogenyCacheInstance`, `getOrogenyCache`, `resetOrogenyCache`, `clearOrogenyCache`
- [ ] `packages/mapgen-core/src/domain/narrative/orogeny/wind.ts`: `zonalWindStep` (+ any wind helper extraction)
- [ ] `packages/mapgen-core/src/domain/narrative/orogeny/belts.ts`: `storyTagOrogenyBelts` (+ any scanning helpers)
- [ ] `packages/mapgen-core/src/domain/narrative/orogeny/index.ts`: re-exports

From `packages/mapgen-core/src/domain/narrative/paleo/index.ts`:
- [ ] `packages/mapgen-core/src/domain/narrative/paleo/rainfall-artifacts.ts`:
  - `storyTagPaleoHydrology`, `PaleoSummary`, plus extracted helpers (read/write rainfall, clamps, coastal checks)
- [ ] `packages/mapgen-core/src/domain/narrative/paleo/index.ts`: re-exports
- [ ] Replace local helpers (`getDims`, `rand`, `isWaterAt`, `isCoastalLand`) with `domain/narrative/utils/*`.

From `packages/mapgen-core/src/domain/narrative/swatches.ts`:
- [ ] Decide ownership boundary:
  - keep as `domain/narrative/swatches.ts` (story overlay projection), or
  - fold into `domain/hydrology/climate/swatches/*` (single owner for “swatch” logic).

### 6.3 Hydrology domain atomization — Climate (remaining)

From `packages/mapgen-core/src/domain/hydrology/climate/index.ts`:

- [ ] `packages/mapgen-core/src/domain/hydrology/climate/types.ts`:
  - `ClimateConfig`, `ClimateRuntime`, `ClimateAdapter`, `OrogenyCache`, `ClimateSwatchResult`
- [ ] `packages/mapgen-core/src/domain/hydrology/climate/runtime.ts`:
  - `resolveAdapter`, `createClimateRuntime`
- [ ] `packages/mapgen-core/src/domain/hydrology/climate/distance-to-water.ts`:
  - `distanceToNearestWater` (preserve current overload behavior: full-map `Int16Array` and local-radius variant)
  - optional: reuse `lib/grid/distance/bfs.ts` (`distanceTransform`) when semantics match (do not change behavior)
- [ ] `packages/mapgen-core/src/domain/hydrology/climate/orographic-shadow.ts`:
  - `hasUpwindBarrier`, `hasUpwindBarrierWM`
- [ ] `packages/mapgen-core/src/domain/hydrology/climate/baseline.ts`:
  - `applyClimateBaseline`
  - extract named helpers from the baseline function body:
    - latitude band computation
    - coastal bonus application (distance-to-water driven)
    - elevation/orographic bonus application
    - perlin noise seed/span logic
- [ ] `packages/mapgen-core/src/domain/hydrology/climate/swatches/types.ts`:
  - normalized swatch config shapes + selection result types
- [ ] `packages/mapgen-core/src/domain/hydrology/climate/swatches/chooser.ts`:
  - `chooseSwatchTypeWeighted` (preserve directionality adjustments)
- [ ] `packages/mapgen-core/src/domain/hydrology/climate/swatches/*.ts` (one file per swatch handler currently embedded in `applyClimateSwatches`):
  - `macro-desert-belt.ts`
  - `equatorial-rainbelt.ts`
  - `rainforest-archipelago.ts`
  - `mountain-forests.ts`
  - `great-plains.ts`
- [ ] `packages/mapgen-core/src/domain/hydrology/climate/swatches/monsoon-bias.ts`:
  - the “Monsoon bias pass” currently inside `applyClimateSwatches`
- [ ] `packages/mapgen-core/src/domain/hydrology/climate/swatches/index.ts`:
  - `applyClimateSwatches` (orchestrates chooser + swatch handlers)
- [ ] `packages/mapgen-core/src/domain/hydrology/climate/refine/*.ts` (extract the refine passes currently annotated in `refineClimateEarthlike`):
  - `water-gradient.ts` (Pass A)
  - `orographic-shadow.ts` (Pass B)
  - `river-corridor.ts` (Pass C)
  - `rift-humidity.ts` (Pass D)
  - `orogeny-belts.ts` (Pass E)
  - `hotspot-microclimates.ts` (Pass F)
- [ ] `packages/mapgen-core/src/domain/hydrology/climate/refine/index.ts`:
  - `refineClimateEarthlike` (orchestrates passes; keep RNG usage stable)
- [ ] `packages/mapgen-core/src/domain/hydrology/climate/index.ts`:
  - re-export `baseline`, `swatches`, `refine`, and public types as the stable climate API.

### 6.4 Morphology domain atomization (remaining)

From `packages/mapgen-core/src/domain/morphology/landmass/index.ts`:

- [ ] `packages/mapgen-core/src/domain/morphology/landmass/types.ts`:
  - `LandmassConfig`, `TectonicsConfig`, `GeometryConfig`, `GeometryPostConfig`
  - `CreateLandmassesOptions`, `LandmassGenerationResult`
  - `PlateStats`, `CrustSummary`, `AreaCrustResult`, `CrustFirstResult`
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/crust-mode.ts`:
  - `CrustMode`, `normalizeCrustMode`
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/water-target.ts`:
  - `computeTargetLandTiles` (extract from the inline water coverage calculation)
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/crust-first-landmask.ts`:
  - `computeClosenessLimit`, `summarizeCrustTypes`, `assignCrustTypesByArea`, `tryCrustFirstLandmask`
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/terrain-apply.ts`:
  - `applyLandmaskToTerrain` (extract terrain stamping + heightfield writes)
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/plate-stats.ts`:
  - `computePlateStatsFromLandMask` (extract the plate stats block)
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/windows.ts`:
  - `windowsFromPlateStats`, `windowFromPlateStat`, clamp/min-width logic
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/diagnostics.ts`:
  - extract `[landmass-plate]` logging into named functions
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/index.ts`:
  - `createPlateDrivenLandmasses` becomes orchestrator calling the above pieces

From `packages/mapgen-core/src/domain/morphology/landmass/utils.ts` (ocean separation + post adjustments):

- [ ] `packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/types.ts`:
  - `LandmassWindow`, `OceanSeparationPolicy`, `PlateAwareOceanSeparationParams`, `PlateAwareOceanSeparationResult`, internal `RowState`
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/policy.ts`:
  - default policy values + normalization helpers
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/row-state.ts`:
  - `normalizeWindow`, `createRowState`, `aggregateRowState`
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/carve.ts`:
  - `carveOceanFromEast`, `carveOceanFromWest` (extract from the row loop)
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/fill.ts`:
  - `fillLandFromWest`, `fillLandFromEast` (extract from the row loop)
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/apply.ts`:
  - `applyPlateAwareOceanSeparation` (orchestrates row-state + carve/fill)
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/index.ts`:
  - re-export the public surface for ocean separation
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/post-adjustments.ts`:
  - `applyLandmassPostAdjustments`
- [ ] `packages/mapgen-core/src/domain/morphology/landmass/utils.ts`:
  - delete once split is complete (or keep as temporary re-export facade only during migration)

From `packages/mapgen-core/src/domain/morphology/coastlines/index.ts`:
- [ ] `packages/mapgen-core/src/domain/morphology/coastlines/types.ts`:
  - `CoastlinesConfig`, `CoastlinePlateBiasConfig`, `CoastlineBayConfig`, `CoastlineFjordConfig`, `SeaCorridorPolicy`, `CorridorPolicy`
- [ ] `packages/mapgen-core/src/domain/morphology/coastlines/plate-bias.ts`:
  - `computePlateBias`
- [ ] `packages/mapgen-core/src/domain/morphology/coastlines/adjacency.ts`:
  - coastal/adjacency helpers extracted from inline scans
- [ ] `packages/mapgen-core/src/domain/morphology/coastlines/corridor-policy.ts`:
  - corridor-edge attribute scanning + “sea lane protection” policy helpers
- [ ] `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts`:
  - `addRuggedCoasts` (main), calling the above
- [ ] `packages/mapgen-core/src/domain/morphology/coastlines/index.ts`:
  - re-export stable API

From `packages/mapgen-core/src/domain/morphology/islands/index.ts`:
- [ ] `packages/mapgen-core/src/domain/morphology/islands/types.ts`:
  - `IslandsConfig`, `HotspotTunables`, `CorridorsConfig`
- [ ] `packages/mapgen-core/src/domain/morphology/islands/fractal-threshold.ts`:
  - `getFractalThreshold`
- [ ] `packages/mapgen-core/src/domain/morphology/islands/adjacency.ts`:
  - `isAdjacentToLandSquare`/lane proximity helpers (preserve current semantics)
- [ ] `packages/mapgen-core/src/domain/morphology/islands/placement.ts`:
  - `addIslandChains` (main)
- [ ] `packages/mapgen-core/src/domain/morphology/islands/index.ts`:
  - re-export stable API

From `packages/mapgen-core/src/domain/morphology/mountains/index.ts`:
- [ ] `packages/mapgen-core/src/domain/morphology/mountains/types.ts`: `MountainsConfig`
- [ ] `packages/mapgen-core/src/domain/morphology/mountains/scoring.ts`:
  - `computePlateBasedScores`, `computeFractalOnlyScores`, `applyRiftDepressions`
- [ ] `packages/mapgen-core/src/domain/morphology/mountains/selection.ts`:
  - `createIsWaterTile`, `selectTilesAboveThreshold`
- [ ] `packages/mapgen-core/src/domain/morphology/mountains/apply.ts`:
  - `layerAddMountainsPhysics`, `addMountainsCompat`
- [ ] Replace local `idx` + `normalizeFractal` with `lib/grid/indexing.idx` and `lib/noise/fractal.normalizeFractal`.
- [ ] `packages/mapgen-core/src/domain/morphology/mountains/index.ts`:
  - re-export stable API

From `packages/mapgen-core/src/domain/morphology/volcanoes/index.ts`:
- [ ] `packages/mapgen-core/src/domain/morphology/volcanoes/types.ts`:
  - `VolcanoesConfig`, `VolcanoCandidate`, `PlacedVolcano`
- [ ] `packages/mapgen-core/src/domain/morphology/volcanoes/scoring.ts`:
  - candidate weighting computation
- [ ] `packages/mapgen-core/src/domain/morphology/volcanoes/selection.ts`:
  - `isTooCloseToExisting`, selection loop
- [ ] `packages/mapgen-core/src/domain/morphology/volcanoes/apply.ts`:
  - `layerAddVolcanoesPlateAware`
- [ ] Replace local `idx` + `clamp` with `lib/grid/indexing.idx` and `lib/math/clamp`.
- [ ] `packages/mapgen-core/src/domain/morphology/volcanoes/index.ts`:
  - re-export stable API

### 6.5 Ecology domain atomization (remaining)

From `packages/mapgen-core/src/domain/ecology/biomes/index.ts`:
- [ ] `packages/mapgen-core/src/domain/ecology/biomes/types.ts`:
  - `BiomeConfig`, `CorridorPolicy`, `BiomeGlobals`
- [ ] `packages/mapgen-core/src/domain/ecology/biomes/globals.ts`:
  - `resolveBiomeGlobals`
- [ ] `packages/mapgen-core/src/domain/ecology/biomes/coastal.ts`:
  - `isCoastalLand` (preserve current neighbor semantics; do not “fix” without a deliberate decision)
- [ ] `packages/mapgen-core/src/domain/ecology/biomes/nudges/tundra-restraint.ts`: extract tundra restraint pass
- [ ] `packages/mapgen-core/src/domain/ecology/biomes/nudges/tropical-coast.ts`: extract tropical coast bias pass
- [ ] `packages/mapgen-core/src/domain/ecology/biomes/nudges/river-valley.ts`: extract river-valley grassland bias pass
- [ ] `packages/mapgen-core/src/domain/ecology/biomes/nudges/corridor-bias.ts`: extract corridor-biome bias pass (land + river chains)
- [ ] `packages/mapgen-core/src/domain/ecology/biomes/nudges/corridor-edge-hints.ts`: extract corridor-edge hint bias pass
- [ ] `packages/mapgen-core/src/domain/ecology/biomes/nudges/rift-shoulder.ts`: extract rift shoulder bias pass
- [ ] `packages/mapgen-core/src/domain/ecology/biomes/index.ts`:
  - `designateEnhancedBiomes` becomes orchestrator calling nudges in a stable order

From `packages/mapgen-core/src/domain/ecology/features/index.ts`:
- [ ] `packages/mapgen-core/src/domain/ecology/features/types.ts`:
  - `FeaturesConfig`, `FeaturesDensityConfig`
- [ ] `packages/mapgen-core/src/domain/ecology/features/indices.ts`:
  - resolve feature indices (reef, forest, taiga, etc) + `NO_FEATURE`
- [ ] `packages/mapgen-core/src/domain/ecology/features/place-feature.ts`:
  - `tryPlaceFeature` helper (wrap `canHaveFeature` + `setFeatureType`)
- [ ] `packages/mapgen-core/src/domain/ecology/features/paradise-reefs.ts`: hotspot paradise reef placement loop
- [ ] `packages/mapgen-core/src/domain/ecology/features/shelf-reefs.ts`: passive shelf reef placement loop
- [ ] `packages/mapgen-core/src/domain/ecology/features/volcanic-vegetation.ts`: near-volcanic vegetation logic
- [ ] `packages/mapgen-core/src/domain/ecology/features/density-tweaks.ts`: rainforest/forest/taiga density tweaks
- [ ] `packages/mapgen-core/src/domain/ecology/features/index.ts`:
  - `addDiverseFeatures` orchestrates the above

### 6.6 Placement domain atomization (remaining)

From `packages/mapgen-core/src/domain/placement/index.ts`:

- [ ] `packages/mapgen-core/src/domain/placement/types.ts`:
  - `PlacementOptions`, `MapInfo` (internal), and config type re-exports (`PlacementConfig`, `FloodplainsConfig`, `ContinentBounds`, `StartsConfig`)
- [ ] `packages/mapgen-core/src/domain/placement/diagnostics.ts`:
  - `logTerrainStats`, `logAsciiMap` (or move to `src/dev/**` if preferred)
- [ ] `packages/mapgen-core/src/domain/placement/wonders.ts`:
  - `resolveNaturalWonderCount`, `applyNaturalWonders`
- [ ] `packages/mapgen-core/src/domain/placement/floodplains.ts`: `applyFloodplains`
- [ ] `packages/mapgen-core/src/domain/placement/terrain-validation.ts`: `validateAndFixTerrain`
- [ ] `packages/mapgen-core/src/domain/placement/areas.ts`: `recalculateAreas`
- [ ] `packages/mapgen-core/src/domain/placement/water-data.ts`: `storeWaterData`
- [ ] `packages/mapgen-core/src/domain/placement/snow.ts`: `generateSnow`
- [ ] `packages/mapgen-core/src/domain/placement/resources.ts`: `generateResources`
- [ ] `packages/mapgen-core/src/domain/placement/starts.ts`: `applyStartPositions` (wraps adapter.assignStartPositions + logging)
- [ ] `packages/mapgen-core/src/domain/placement/discoveries.ts`: `applyDiscoveries`
- [ ] `packages/mapgen-core/src/domain/placement/fertility.ts`: `applyFertilityRecalc`
- [ ] `packages/mapgen-core/src/domain/placement/advanced-start.ts`: `applyAdvancedStartRegions`
- [ ] `packages/mapgen-core/src/domain/placement/index.ts`:
  - `runPlacement` orchestrator calling modules in the vanilla order
  - remove default export once consumers migrate (or keep temporarily behind an explicit deprecation window)

---

## 7) Import Migration + Legacy Facade Deletion (Checklist)

### 7.1 Migrate step wiring imports (required before deleting `layers/**` shims)

- [ ] Update hydrology steps to import from `domain/hydrology/climate/**` instead of `layers/hydrology/climate.ts`:
  - `layers/hydrology/steps/ClimateBaselineStep.ts`
  - `layers/hydrology/steps/ClimateRefineStep.ts`
- [ ] Update morphology steps to import from `domain/morphology/**` instead of `layers/morphology/*.ts`:
  - `layers/morphology/steps/LandmassStep.ts`
  - `layers/morphology/steps/CoastlinesStep.ts`
  - `layers/morphology/steps/RuggedCoastsStep.ts`
  - `layers/morphology/steps/IslandsStep.ts`
  - `layers/morphology/steps/MountainsStep.ts`
  - `layers/morphology/steps/VolcanoesStep.ts`
- [ ] Update ecology steps to import from `domain/ecology/**` instead of `layers/ecology/*.ts`:
  - `layers/ecology/steps/BiomesStep.ts`
  - `layers/ecology/steps/FeaturesStep.ts`
- [ ] Update placement steps to import from `domain/placement/**` instead of `layers/placement/placement.ts`:
  - `layers/placement/steps/PlacementStep.ts`
  - `layers/placement/steps/LegacyPlacementStep.ts`
- [ ] Update narrative steps and pipeline callsites to import from `domain/narrative/**` instead of `story/**`:
  - `layers/narrative/*.ts`
  - `pipeline/tags.ts`

### 7.2 Delete legacy re-export shims (only after all callsites are migrated)

Delete the following files/folders (or reduce them to explicit deprecations *temporarily* if a staged rollout is needed):

- [ ] `packages/mapgen-core/src/layers/hydrology/climate.ts`
- [ ] `packages/mapgen-core/src/layers/morphology/coastlines.ts`
- [ ] `packages/mapgen-core/src/layers/morphology/islands.ts`
- [ ] `packages/mapgen-core/src/layers/morphology/landmass-plate.ts`
- [ ] `packages/mapgen-core/src/layers/morphology/landmass-utils.ts`
- [ ] `packages/mapgen-core/src/layers/morphology/mountains.ts`
- [ ] `packages/mapgen-core/src/layers/morphology/volcanoes.ts`
- [ ] `packages/mapgen-core/src/layers/ecology/biomes.ts`
- [ ] `packages/mapgen-core/src/layers/ecology/features.ts`
- [ ] `packages/mapgen-core/src/layers/placement/placement.ts`

- [ ] `packages/mapgen-core/src/narrative/` (entire directory)
- [ ] `packages/mapgen-core/src/story/` (entire directory)

- [ ] `packages/mapgen-core/src/lib/noise.ts`

### 7.3 Update public exports (so the package still exposes the intended API)

- [ ] Update `packages/mapgen-core/src/index.ts`:
  - stop exporting `./story/index.ts`
  - export narrative/public surfaces from canonical modules (likely `./domain/narrative/index.ts`)
  - decide whether any domain modules are public API vs internal-only (and document the decision)

---

## 8) Open Decisions (Make These Explicit Before Deleting Facades)

- **Narrative/playability model:** decide whether narrative is a dedicated “final pass”, a conceptual plugin category injected into earlier phases, or a hybrid (and define explicit mutation budgets/invariants).
- **Package surface:** decide what is public API vs internal-only once `story/**` + `narrative/**` shims are deleted (and document the intended modder import surfaces).
- **Directory layout (optional):** decide whether to keep `layers/**` as the step-wiring home or merge it into `pipeline/**` (not required to complete the atomic split, but affects long-term discoverability).
