# Mapgen-Core Domain/Lib Atomic Split

> **Status:** In Progress
> **Scope:** `packages/mapgen-core/src/`
> **Outcome:** Fully atomized domain modules, consolidated shared library, deleted legacy facades

---

# Part A: Context & Design

## 1. Summary

This refactor completes the internal restructuring of `mapgen-core` by splitting monolithic algorithm scripts into atomic, single-purpose modules under `domain/**`, consolidating shared helpers into `lib/**`, and deleting all legacy re-export facades.

**Current state:** Algorithms live in large `domain/**/index.ts` files with inline helpers; legacy shims in `layers/**`, `narrative/**`, and `story/**` re-export these for compatibility; step wiring lives under `layers/**`.

**Target state:** Small, focused modules in `domain/**`; shared utilities in `lib/**`; step wiring in `pipeline/**`; no legacy facades; clean import policy enforced.

---

## 2. Problem Statement

### Why this refactor is needed

1. **Monolithic algorithm files** — Current `domain/**/index.ts` files contain 500-1500 lines mixing types, helpers, and orchestration logic, making them hard to navigate, test, and extend.

2. **Duplicate helpers** — Functions like `clamp`, `idx`, `normalizeFractal`, and neighbor iteration are duplicated across modules with subtle semantic differences.

3. **Legacy re-export sprawl** — Compatibility shims in `layers/**`, `narrative/**`, and `story/**` create multiple import paths to the same code, confusing consumers and bloating the public API.

4. **Unclear import policy** — Deep relative imports (`../../../`) are fragile; no enforcement of stable entrypoints.

5. **Step wiring location** — Steps live under `layers/**` but should live under `pipeline/**` alongside execution primitives.

### Pain points

- Adding a new algorithm requires touching multiple files and understanding implicit coupling.
- Refactoring shared logic risks determinism drift (RNG call order, label strings).
- External consumers (modders) have no clear "public API" — they guess at import paths.

---

## 3. Goals & Non-Goals

### Goals

- **Atomize domain modules** — Each algorithm becomes a small, single-purpose file with explicit types and minimal dependencies.
- **Consolidate shared utilities** — One canonical location for math, grid, rng, noise, and collection helpers.
- **Delete legacy facades** — Remove all re-export shims once callsites migrate.
- **Enforce import policy** — Stable index/barrel surfaces; no deep imports across subsystems.
- **Preserve determinism** — RNG label strings and call order are treated as contract.
- **Enable modder-friendly composition** — High-level building blocks importable without deep paths.

### Non-Goals

- **Changing algorithm behavior** — This is a structural refactor, not a functional change.
- **Unifying neighborhood/wrap semantics** — Preserve per-module semantics; do not "fix" during extraction.
- **Adding new features** — No new algorithms, steps, or capabilities.
- **Optimizing performance** — No algorithmic changes for speed.

---

## 4. Architectural Decisions (Locked)

These decisions are finalized and should not be revisited during implementation.

### 4.1 Hybrid Domain Architecture

- **Steps own engine coupling** — Steps own `ExtendedMapContext` + `EngineAdapter` interaction (sync/flush/state changes) and publish artifacts/tags.
- **Domain algorithms are decoupled** — Domain code does not import `ExtendedMapContext`; it consumes typed arrays + small "ports" assembled by steps:
  - `GridOps` (idx/bounds/wrap + neighbor iteration semantics)
  - `Rng` (labeled determinism)
  - Narrow `*Adapter` interfaces (only what an algorithm truly needs from engine state)
  - `*IO` ports for reads/writes (explicit commit points)
- **Internal subsystem structure** — Within a subsystem: `types.ts` (contracts), `runtime.ts` (port construction helpers), orchestrators (call order + RNG labels), and pure kernels (array/scalar logic).

### 4.2 Determinism Contract

- RNG label strings + call order are treated as contract; extraction must not introduce extra RNG calls.
- RNG calls should live at orchestrator boundaries; kernels are deterministic unless explicitly passed a `rng` port.

### 4.3 Import Policy

- Pipeline/steps import only from stable index/barrel surfaces (e.g., `domain/hydrology/climate`), not deep module paths.
- Domain code may deep-import **only within the same subsystem**; cross-subsystem imports must go through subsystem indices to avoid tight coupling.

### 4.4 Path Aliasing & Packaging

- Introduce a stable internal TS path alias for mapgen-core source imports (stop `../../../` churn).
- Use package subpath exports + index barrels to expose stable import surfaces (and keep deep internals private).

### 4.5 Wrap & Neighborhood Semantics

- Do not "standardize" semantics during refactor; preserve current behavior per module.
- Encode semantics in helper names (square 3×3 vs hex odd-q, wrap-aware vs bounds-clamped) and require algorithms to choose explicitly.

### 4.6 Step Wiring Location

- Merge `src/layers/**` into `src/pipeline/**` and keep phase directories as the primary navigation (`pipeline/morphology`, `pipeline/hydrology`, etc.).
- Pipeline/step code is composition only (context/adapters/artifacts); no domain algorithms.
- Delete `src/layers/**` after callsites + orchestrator registration move to `pipeline/**`.

### 4.7 Modder-Friendly Surfaces

- Make the "high-level" building blocks importable without deep paths:
  - Pipeline composition (`pipeline/**`)
  - Domain orchestrators + public types (`domain/**` via subsystem `index.ts`)
  - Shared utilities (`lib/**` via `index.ts`)
- Use package subpath exports + TS path aliases so both in-repo and external consumers can import stable entrypoints (and never need `../../..`).
- Atomic leaf files remain _implementation detail_ unless re-exported from a subsystem index (no "deep imports" required).

### 4.8 Story/Playability Steps (Core Impact + Deferred Plugin Plan)

**Core impact (locked):**

- **Core pipeline must run without stories** — The standard pipeline must be runnable with all story stages disabled; no story step is required for correctness.
- **Story data is optional input** — Core steps must not require story-only artifacts/tags (especially `artifact:storyOverlays`) to run. Any story influence must be additive/optional and default to a no-op when overlays/tags are absent.
- **Story globals are reset outside story steps** — Reset global story state once per generation at the orchestrator/executor boundary (e.g., `resetStoryTags/resetStoryOverlays/resetOrogenyCache/resetCorridorStyleCache`), not via a story stage that might be disabled.
- **No new phases** — Keep story/playability work scheduled into existing phases (`morphology/hydrology/ecology/placement`) when enabled; avoid introducing a separate `narrative` phase.
- **If it’s required, it’s not “story”** — Any “story” behavior deemed foundational must be reclassified into the owning core subsystem/phase as a normal step (renamed accordingly), not kept behind an optional story bundle.

**Draft (deferred): story steps as future plugins (packages)**

- **Goal** — Treat story/playability as an opt-in bundle implemented as one or more packages (initially just our existing Story steps), rather than hard-wired core pipeline stages.
- **Minimal hook to keep now (so we can extract later):**
  - **External registration hook**: a stable plugin entrypoint shape that can register steps into the `StepRegistry` (e.g., `registerSteps(registry, env)`).
  - **Stage/recipe patching**: a standard way for a plugin to enable/disable stages and/or insert steps into the standard recipe (exact mechanism deferred; see Open Questions).
  - **Optional override policy**: a deliberate, explicit mechanism to allow replacing an existing step id (not “accidentally last-write-wins”) — gated behind config/flags.
- **Migration intent** — Once the hook exists, move `Story*Step` wiring + the remaining story domain atomization into plugin package(s) and remove them from the standard core library by default.

---

## 5. Target End-State

This is the final `packages/mapgen-core/src/` layout once the refactor is complete.

```text
packages/mapgen-core/src/
  index.ts
  MapOrchestrator.ts

  bootstrap/
  config/
  core/
  dev/
  world/
  polyfills/
  shims/
  steps/

  pipeline/                      # wiring + execution primitives
    artifacts.ts
    errors.ts
    index.ts
    PipelineExecutor.ts
    StepRegistry.ts
    standard.ts
    standard-library.ts          # registers step library
    tags.ts
    types.ts
    foundation/
      index.ts
      FoundationStep.ts
    morphology/
      index.ts
      LandmassStep.ts
      CoastlinesStep.ts
      RuggedCoastsStep.ts
      IslandsStep.ts
      MountainsStep.ts
      VolcanoesStep.ts
    hydrology/
      index.ts
      ClimateBaselineStep.ts
      ClimateRefineStep.ts
      RiversStep.ts
      LakesStep.ts
    ecology/
      index.ts
      BiomesStep.ts
      FeaturesStep.ts
    narrative/                  # OPTIONAL: story/playability bundle (disabled by default; extracted to plugin packages later)
      index.ts
      StorySeedStep.ts
      StoryHotspotsStep.ts
      StoryRiftsStep.ts
      StoryOrogenyStep.ts
      StoryCorridorsStep.ts
      StorySwatchesStep.ts
    placement/
      index.ts
      PlacementStep.ts
      LegacyPlacementStep.ts

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

## 6. Risks & Mitigations

### Primary Risks

| Risk                                                                                                             | Impact | Likelihood         |
| ---------------------------------------------------------------------------------------------------------------- | ------ | ------------------ |
| **Determinism drift** — Changing RNG label strings, call order, or introducing extra RNG calls                   | High   | Medium             |
| **Neighborhood semantics drift** — Some modules use square 3×3, others hex odd-q; unifying can change behavior   | Medium | Medium             |
| **Wrap semantics drift** — Some logic clamps bounds, some wraps X; standardizing can change coastlines/corridors | Medium | Low                |
| **API break** — Removing re-export facades breaks deep import paths                                              | Low    | High (intentional) |

### Mitigations

- **Preserve semantics per module** — Create utilities that mirror existing behavior (`forEachNeighbor3x3`, `forEachHexNeighborOddQ`, etc.) rather than "unifying."
- **Keep old exports via `index.ts`** — Re-export from subsystem indices until callsites migrate.
- **Remove facades only after migration** — Repo-wide import migration + verification pass before deletion.
- **Run tests frequently** — Prefer parity/determinism coverage over unit tests for everything.

---

## 7. Validation Strategy

- Run `mapgen-core` tests frequently; prefer parity/determinism coverage over "unit tests for everything."
- Add targeted unit tests only when extraction introduces new shared helpers (especially RNG, distance transforms, neighborhood iteration).
- Treat RNG label strings as part of the public contract for determinism during refactor.

---

## 8. Open Questions

These are intentionally **deferred** so the core domain/lib refactor can land without waiting on a full mod/plugin system design.

**Playability/plugins (draft)**

- **Plugin loading surface:** Where do plugins enter the orchestrator? (CLI config? map script recipe? hard-coded for in-repo packages?)
- **Recipe/stage patch format:** Do we patch `StageManifest.order`, use `insert before/after`, or introduce stable “anchors”?
- **Dependency tags:** Do plugins get their own tag namespace/registry, or do we keep strict canonical tags and require story/playability to reuse them?
- **Override policy:** Do we support step replacement at all? If yes: explicit `overwrite`/`force` only, or last-write-wins? How is it gated?
- **Ownership boundary:** Do story/playability packages own their own `domain/**` code, or do they reuse `domain/narrative/**` from mapgen-core?
- **Bundling decision:** One “story” package vs multiple playability packages (corridors, swatches, etc.), and how they are enabled as a group.

---

# Part B: Implementation Manifest

## 1. Status Snapshot

### Phase 0 — Layout/Registry Wiring (Complete)

- [x] Initial layer folders + step wrappers under `packages/mapgen-core/src/layers/**` (steps live under `layers/*/steps/*.ts`) — will move to `pipeline/**` per locked decision
- [x] `packages/mapgen-core/src/layers/standard-library.ts` (registers steps into the registry) — will move to `pipeline/**` per locked decision
- [x] `packages/mapgen-core/src/MapOrchestrator.ts` switched to Task Graph path calling `registerStandardLibrary(...)`

### Phase 1 — Domain/Lib Scaffolding + Compatibility (Complete)

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

## 2. Milestone Roadmap

Ordered phases for completing the refactor:

| #   | Milestone                            | Description                                                                                                           |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 1   | **Finish `lib/**` consolidation\*\*  | Replace remaining local helpers with canonical `lib/**` imports                                                       |
| 2   | **Narrative atomization (deferred)** | Split corridors, tagging, orogeny, paleo into atomic modules (only needed once story/playability plugins are resumed) |
| 3   | **Hydrology/Climate atomization**    | Split baseline, swatches, refine into atomic modules                                                                  |
| 4   | **Morphology atomization**           | Split landmass, coastlines, islands, mountains, volcanoes                                                             |
| 5   | **Ecology atomization**              | Split biomes nudges, features placement modules                                                                       |
| 6   | **Placement atomization**            | Split wonders, floodplains, resources, starts, etc.                                                                   |
| 7   | **Delete legacy facades**            | Remove `layers/**` shims, `narrative/**`, `story/**`                                                                  |
| 8   | **Move step wiring**                 | Relocate `layers/**` → `pipeline/**`, delete `layers/**`                                                              |
| 9   | **Validation**                       | Ensure determinism parity, tests pass, build green                                                                    |

---

## 3. Atomic Work Manifest

Each bullet is a **target file** and the **symbols it should own** once fully split.
Sources listed are the current monolithic implementations (mostly `domain/**/index.ts` today).

### 3.1 Shared `lib/**` Consolidation

- [x] Replace local duplicates with canonical helpers:
  - `clamp*` → `packages/mapgen-core/src/lib/math/clamp.ts`
  - `idx/xyFromIndex` → `packages/mapgen-core/src/lib/grid/indexing.ts`
  - `normalizeFractal` → `packages/mapgen-core/src/lib/noise/fractal.ts`
  - square neighbor scans → `packages/mapgen-core/src/lib/grid/neighborhood/square-3x3.ts`
  - hex neighbors (wrap-aware) → `packages/mapgen-core/src/lib/grid/neighborhood/hex-oddq.ts`
- [x] Delete compatibility shim `packages/mapgen-core/src/lib/noise.ts` after imports migrate to `lib/noise/index.ts`.

### 3.2 Narrative Domain Atomization

Story/playability remains optional (disabled by default) and is still intended to be extractable into plugin packages, but the narrative domain is atomized here to keep algorithm surfaces modular.

**Already split (canonical, keep as-is):**

- [x] `packages/mapgen-core/src/domain/narrative/utils/*`
- [x] `packages/mapgen-core/src/domain/narrative/tags/*`
- [x] `packages/mapgen-core/src/domain/narrative/overlays/*`

**From `domain/narrative/tagging/index.ts`:**

- [x] `tagging/types.ts`: `ContinentalMarginsOptions`, `HotspotTrailsSummary`, `RiftValleysSummary`
- [x] `tagging/margins.ts`: `storyTagContinentalMargins`
- [x] `tagging/hotspots.ts`: `storyTagHotspotTrails`
- [x] `tagging/rifts.ts`: `storyTagRiftValleys`
- [x] `tagging/index.ts`: re-export the above
- [x] Replace local helpers (`getDims`, `rand`, `isWaterAt`, adjacency/latitude helpers) with `domain/narrative/utils/*`

**From `domain/narrative/corridors/index.ts`:**

- [x] `corridors/types.ts`: `CorridorStage`, `CorridorKind`, `CorridorStyle`, `Orient`
- [x] `corridors/style-cache.ts`: `fetchCorridorStylePrimitive`, `assignCorridorMetadata`, `resetCorridorStyleCache`
- [x] `corridors/runtime.ts`: `getDims`, `rand`, `isWaterAt`, `isCoastalLand`, `isAdjacentToShallowWater`, `isAdjacentToLand` (prefer: import from `domain/narrative/utils/*` and keep only corridor-specific glue here)
- [x] `corridors/sea-lanes.ts`: `hasPerpWidth`, `longestWaterRunColumn`, `longestWaterRunRow`, `longestWaterRunDiagSum`, `longestWaterRunDiagDiff`, `tagSeaLanes`
- [x] `corridors/island-hop.ts`: `tagIslandHopFromHotspots`
- [x] `corridors/land-corridors.ts`: `tagLandCorridorsFromRifts`
- [x] `corridors/river-chains.ts`: `tagRiverChainsPostRivers`
- [x] `corridors/backfill.ts`: `backfillCorridorKinds`
- [x] `corridors/index.ts`: `storyTagStrategicCorridors` (orchestrator)

**From `domain/narrative/orogeny/index.ts`:**

- [x] `orogeny/cache.ts`: `OrogenyCacheInstance`, `getOrogenyCache`, `resetOrogenyCache`, `clearOrogenyCache`
- [x] `orogeny/wind.ts`: `zonalWindStep` (+ any wind helper extraction)
- [x] `orogeny/belts.ts`: `storyTagOrogenyBelts` (+ any scanning helpers)
- [x] `orogeny/index.ts`: re-exports

**From `domain/narrative/paleo/index.ts`:**

- [x] `paleo/rainfall-artifacts.ts`: `storyTagPaleoHydrology`, `PaleoSummary`, plus extracted helpers (read/write rainfall, clamps, coastal checks)
- [x] `paleo/index.ts`: re-exports
- [x] Replace local helpers (`getDims`, `rand`, `isWaterAt`, `isCoastalLand`) with `domain/narrative/utils/*`

**From `domain/narrative/swatches.ts`:**

- [x] Decide ownership boundary (keep as `domain/narrative/swatches.ts` story overlay projection; swatch algorithms remain in `domain/hydrology/climate/swatches/*`)

### 3.3 Hydrology Domain Atomization — Climate

**From `domain/hydrology/climate/index.ts`:**

- [x] `climate/types.ts`: `ClimateConfig`, `ClimateRuntime`, `ClimateAdapter`, `OrogenyCache`, `ClimateSwatchResult`
- [x] `climate/runtime.ts`: `resolveAdapter`, `createClimateRuntime`
- [x] `climate/distance-to-water.ts`: `distanceToNearestWater` (preserve current overload behavior: full-map `Int16Array` and local-radius variant; optionally reuse `lib/grid/distance/bfs.ts` when semantics match)
- [x] `climate/orographic-shadow.ts`: `hasUpwindBarrier`, `hasUpwindBarrierWM`
- [x] `climate/baseline.ts`: `applyClimateBaseline` + extracted named helpers:
  - latitude band computation
  - coastal bonus application (distance-to-water driven)
  - elevation/orographic bonus application
  - perlin noise seed/span logic

**Swatches (from `applyClimateSwatches`):**

- [x] `climate/swatches/types.ts`: normalized swatch config shapes + selection result types
- [x] `climate/swatches/chooser.ts`: `chooseSwatchTypeWeighted` (preserve directionality adjustments)
- [x] `climate/swatches/macro-desert-belt.ts`
- [x] `climate/swatches/equatorial-rainbelt.ts`
- [x] `climate/swatches/rainforest-archipelago.ts`
- [x] `climate/swatches/mountain-forests.ts`
- [x] `climate/swatches/great-plains.ts`
- [x] `climate/swatches/monsoon-bias.ts`: the "Monsoon bias pass" currently inside `applyClimateSwatches`
- [x] `climate/swatches/index.ts`: `applyClimateSwatches` (orchestrates chooser + swatch handlers)

**Refine (from `refineClimateEarthlike`):**

- [x] `climate/refine/water-gradient.ts` (Pass A)
- [x] `climate/refine/orographic-shadow.ts` (Pass B)
- [x] `climate/refine/river-corridor.ts` (Pass C)
- [x] `climate/refine/rift-humidity.ts` (Pass D)
- [x] `climate/refine/orogeny-belts.ts` (Pass E)
- [x] `climate/refine/hotspot-microclimates.ts` (Pass F)
- [x] `climate/refine/index.ts`: `refineClimateEarthlike` (orchestrates passes; keep RNG usage stable)

- [x] `climate/index.ts`: re-export `baseline`, `swatches`, `refine`, and public types as the stable climate API

### 3.4 Morphology Domain Atomization

**From `domain/morphology/landmass/index.ts`:**

- [x] `landmass/types.ts`: `LandmassConfig`, `TectonicsConfig`, `GeometryConfig`, `GeometryPostConfig`, `CreateLandmassesOptions`, `LandmassGenerationResult`, `PlateStats`, `CrustSummary`, `AreaCrustResult`, `CrustFirstResult`
- [x] `landmass/crust-mode.ts`: `CrustMode`, `normalizeCrustMode`
- [x] `landmass/water-target.ts`: `computeTargetLandTiles` (extract from inline water coverage calculation)
- [x] `landmass/crust-first-landmask.ts`: `computeClosenessLimit`, `summarizeCrustTypes`, `assignCrustTypesByArea`, `tryCrustFirstLandmask`
- [x] `landmass/terrain-apply.ts`: `applyLandmaskToTerrain` (extract terrain stamping + heightfield writes)
- [x] `landmass/plate-stats.ts`: `computePlateStatsFromLandMask` (extract the plate stats block)
- [x] `landmass/windows.ts`: `windowsFromPlateStats`, `windowFromPlateStat`, clamp/min-width logic
- [x] `landmass/diagnostics.ts`: extract `[landmass-plate]` logging into named functions
- [x] `landmass/index.ts`: `createPlateDrivenLandmasses` becomes orchestrator calling the above pieces

**From `domain/morphology/landmass/utils.ts` (ocean separation + post adjustments):**

- [x] `landmass/ocean-separation/types.ts`: `LandmassWindow`, `OceanSeparationPolicy`, `PlateAwareOceanSeparationParams`, `PlateAwareOceanSeparationResult`, internal `RowState`
- [x] `landmass/ocean-separation/policy.ts`: default policy values + normalization helpers
- [x] `landmass/ocean-separation/row-state.ts`: `normalizeWindow`, `createRowState`, `aggregateRowState`
- [x] `landmass/ocean-separation/carve.ts`: `carveOceanFromEast`, `carveOceanFromWest` (extract from the row loop)
- [x] `landmass/ocean-separation/fill.ts`: `fillLandFromWest`, `fillLandFromEast` (extract from the row loop)
- [x] `landmass/ocean-separation/apply.ts`: `applyPlateAwareOceanSeparation` (orchestrates row-state + carve/fill)
- [x] `landmass/ocean-separation/index.ts`: re-export the public surface for ocean separation
- [x] `landmass/post-adjustments.ts`: `applyLandmassPostAdjustments`
- [x] `landmass/utils.ts`: delete once split is complete (or keep as temporary re-export facade only during migration)

**From `domain/morphology/coastlines/index.ts`:**

- [x] `coastlines/types.ts`: `CoastlinesConfig`, `CoastlinePlateBiasConfig`, `CoastlineBayConfig`, `CoastlineFjordConfig`, `SeaCorridorPolicy`, `CorridorPolicy`
- [x] `coastlines/plate-bias.ts`: `computePlateBias`
- [x] `coastlines/adjacency.ts`: coastal/adjacency helpers extracted from inline scans
- [x] `coastlines/corridor-policy.ts`: corridor-edge attribute scanning + "sea lane protection" policy helpers
- [x] `coastlines/rugged-coasts.ts`: `addRuggedCoasts` (main), calling the above
- [x] `coastlines/index.ts`: re-export stable API

**From `domain/morphology/islands/index.ts`:**

- [x] `islands/types.ts`: `IslandsConfig`, `HotspotTunables`, `CorridorsConfig`
- [x] `islands/fractal-threshold.ts`: `getFractalThreshold`
- [x] `islands/adjacency.ts`: `isAdjacentToLandSquare`/lane proximity helpers (preserve current semantics)
- [x] `islands/placement.ts`: `addIslandChains` (main)
- [x] `islands/index.ts`: re-export stable API

**From `domain/morphology/mountains/index.ts`:**

- [x] `mountains/types.ts`: `MountainsConfig`
- [x] `mountains/scoring.ts`: `computePlateBasedScores`, `computeFractalOnlyScores`, `applyRiftDepressions`
- [x] `mountains/selection.ts`: `createIsWaterTile`, `selectTilesAboveThreshold`
- [x] `mountains/apply.ts`: `layerAddMountainsPhysics`, `addMountainsCompat`
- [x] Replace local `idx` + `normalizeFractal` with `lib/grid/indexing.idx` and `lib/noise/fractal.normalizeFractal`
- [x] `mountains/index.ts`: re-export stable API

**From `domain/morphology/volcanoes/index.ts`:**

- [x] `volcanoes/types.ts`: `VolcanoesConfig`, `VolcanoCandidate`, `PlacedVolcano`
- [x] `volcanoes/scoring.ts`: candidate weighting computation
- [x] `volcanoes/selection.ts`: `isTooCloseToExisting`, selection loop
- [x] `volcanoes/apply.ts`: `layerAddVolcanoesPlateAware`
- [x] Replace local `idx` + `clamp` with `lib/grid/indexing.idx` and `lib/math/clamp`
- [x] `volcanoes/index.ts`: re-export stable API

### 3.5 Ecology Domain Atomization

**From `domain/ecology/biomes/index.ts`:**

- [x] `biomes/types.ts`: `BiomeConfig`, `CorridorPolicy`, `BiomeGlobals`
- [x] `biomes/globals.ts`: `resolveBiomeGlobals`
- [x] `biomes/coastal.ts`: `isCoastalLand` (preserve current neighbor semantics; do not "fix" without a deliberate decision)
- [x] `biomes/nudges/tundra-restraint.ts`: extract tundra restraint pass
- [x] `biomes/nudges/tropical-coast.ts`: extract tropical coast bias pass
- [x] `biomes/nudges/river-valley.ts`: extract river-valley grassland bias pass
- [x] `biomes/nudges/corridor-bias.ts`: extract corridor-biome bias pass (land + river chains)
- [x] `biomes/nudges/corridor-edge-hints.ts`: extract corridor-edge hint bias pass
- [x] `biomes/nudges/rift-shoulder.ts`: extract rift shoulder bias pass
- [x] `biomes/index.ts`: `designateEnhancedBiomes` becomes orchestrator calling nudges in a stable order

**From `domain/ecology/features/index.ts`:**

- [x] `features/types.ts`: `FeaturesConfig`, `FeaturesDensityConfig`
- [x] `features/indices.ts`: resolve feature indices (reef, forest, taiga, etc) + `NO_FEATURE`
- [x] `features/place-feature.ts`: `tryPlaceFeature` helper (wrap `canHaveFeature` + `setFeatureType`)
- [x] `features/paradise-reefs.ts`: hotspot paradise reef placement loop
- [x] `features/shelf-reefs.ts`: passive shelf reef placement loop
- [x] `features/volcanic-vegetation.ts`: near-volcanic vegetation logic
- [x] `features/density-tweaks.ts`: rainforest/forest/taiga density tweaks
- [x] `features/index.ts`: `addDiverseFeatures` orchestrates the above

### 3.6 Placement Domain Atomization

**From `domain/placement/index.ts`:**

- [x] `placement/types.ts`: `PlacementOptions`, `MapInfo` (internal), and config type re-exports (`PlacementConfig`, `FloodplainsConfig`, `ContinentBounds`, `StartsConfig`)
- [x] `placement/diagnostics.ts`: `logTerrainStats`, `logAsciiMap` (or move to `src/dev/**` if preferred)
- [x] `placement/wonders.ts`: `resolveNaturalWonderCount`, `applyNaturalWonders`
- [x] `placement/floodplains.ts`: `applyFloodplains`
- [x] `placement/terrain-validation.ts`: `validateAndFixTerrain`
- [x] `placement/areas.ts`: `recalculateAreas`
- [x] `placement/water-data.ts`: `storeWaterData`
- [x] `placement/snow.ts`: `generateSnow`
- [x] `placement/resources.ts`: `generateResources`
- [x] `placement/starts.ts`: `applyStartPositions` (wraps adapter.assignStartPositions + logging)
- [x] `placement/discoveries.ts`: `applyDiscoveries`
- [x] `placement/fertility.ts`: `applyFertilityRecalc`
- [x] `placement/advanced-start.ts`: `applyAdvancedStartRegions`
- [x] `placement/index.ts`: `runPlacement` orchestrator calling modules in the vanilla order; remove default export once consumers migrate (or keep temporarily behind an explicit deprecation window)

---

## 4. Migration Checklists

### 4.1 Migrate Step Wiring Imports

Update steps to import from `domain/**` instead of `layers/**` shims:

**Hydrology:**

- [x] `pipeline/hydrology/ClimateBaselineStep.ts` → import from `domain/hydrology/climate/**`
- [x] `pipeline/hydrology/ClimateRefineStep.ts` → import from `domain/hydrology/climate/**`

**Morphology:**

- [x] `pipeline/morphology/LandmassStep.ts` → import from `domain/morphology/**`
- [x] `pipeline/morphology/CoastlinesStep.ts` → import from `domain/morphology/**`
- [x] `pipeline/morphology/RuggedCoastsStep.ts` → import from `domain/morphology/**`
- [x] `pipeline/morphology/IslandsStep.ts` → import from `domain/morphology/**`
- [x] `pipeline/morphology/MountainsStep.ts` → import from `domain/morphology/**`
- [x] `pipeline/morphology/VolcanoesStep.ts` → import from `domain/morphology/**`

**Ecology:**

- [x] `pipeline/ecology/BiomesStep.ts` → import from `domain/ecology/**`
- [x] `pipeline/ecology/FeaturesStep.ts` → import from `domain/ecology/**`

**Placement:**

- [x] `pipeline/placement/PlacementStep.ts` → import from `domain/placement/**`
- [x] `pipeline/placement/LegacyPlacementStep.ts` → import from `domain/placement/**`

**Narrative:**

- [x] `pipeline/narrative/*.ts` → import from `domain/narrative/**`
- [x] `pipeline/tags.ts` → import from `domain/narrative/**`

### 4.2 Delete Legacy Re-Export Shims

Delete the following **only after all callsites are migrated**:

**Layer algorithm shims:**

- [x] `packages/mapgen-core/src/layers/hydrology/climate.ts`
- [x] `packages/mapgen-core/src/layers/morphology/coastlines.ts`
- [x] `packages/mapgen-core/src/layers/morphology/islands.ts`
- [x] `packages/mapgen-core/src/layers/morphology/landmass-plate.ts`
- [x] `packages/mapgen-core/src/layers/morphology/landmass-utils.ts`
- [x] `packages/mapgen-core/src/layers/morphology/mountains.ts`
- [x] `packages/mapgen-core/src/layers/morphology/volcanoes.ts`
- [x] `packages/mapgen-core/src/layers/ecology/biomes.ts`
- [x] `packages/mapgen-core/src/layers/ecology/features.ts`
- [x] `packages/mapgen-core/src/layers/placement/placement.ts`

**Top-level compatibility directories:**

- [x] `packages/mapgen-core/src/narrative/` (entire directory)
- [x] `packages/mapgen-core/src/story/` (entire directory)

**Lib compatibility shim:**

- [x] `packages/mapgen-core/src/lib/noise.ts`

### 4.3 Update Public Exports

Update `packages/mapgen-core/src/index.ts`:

- [x] Stop exporting `./story/index.ts`
- [x] Export narrative/public surfaces from canonical modules (`./domain/narrative/index.ts`)
- [x] Expose stable, modder-friendly entrypoints for composition:
  - Pipeline composition types/helpers (`./pipeline/index.ts`)
  - Domain subsystem indices (`./domain/**/index.ts`)
  - `lib/**` indices (math/grid/rng/noise/collections)
- [x] Enforce "no deep imports" by ensuring anything "publicly usable" is re-exported from a subsystem `index.ts`

### 4.4 Move Step Wiring from `layers/**` → `pipeline/**`

- [x] Move `packages/mapgen-core/src/layers/standard-library.ts` → `packages/mapgen-core/src/pipeline/standard-library.ts`
- [x] Move phase directories:
  - [x] `layers/foundation/**` → `pipeline/foundation/**`
  - [x] `layers/morphology/**` → `pipeline/morphology/**`
  - [x] `layers/hydrology/**` → `pipeline/hydrology/**`
  - [x] `layers/ecology/**` → `pipeline/ecology/**`
  - [x] `layers/narrative/**` → `pipeline/narrative/**`
  - [x] `layers/placement/**` → `pipeline/placement/**`
- [x] Update `packages/mapgen-core/src/MapOrchestrator.ts` imports to reference `pipeline/standard-library.ts`
- [x] Delete `packages/mapgen-core/src/layers/**` once all callsites + registry wiring are updated

---

## 5. Implementation Phases

This section provides a recommended ordering for the work, balancing risk mitigation, parallelization potential, and incremental value delivery.

### 5.1 Breakdown Strategy

The phasing follows a **foundation → derisk → sweep → cleanup** approach based on these axes:

| Axis | Description | Implication |
|------|-------------|-------------|
| **Foundation-first** | `lib/**` consolidation is prerequisite for clean atomization | Do this first; every subsequent PR benefits from stable imports |
| **Risk-first** | Climate and Landmass are the most complex domains (~18 and ~19 files respectively) | Tackle early to expose structural issues before committing to patterns |
| **Quick wins** | Volcanoes, Mountains, Islands, Coastlines are straightforward (~4-5 files each) | Can parallelize; builds momentum |
| **Dependency unlocking** | Facade deletion and step wiring move are blocked until atomization completes | These are "cap" phases that close out the refactor |
| **Parallelization** | Morphology subdomains and Ecology subdomains are independent of each other | Can be worked in parallel if multiple contributors available |

### 5.2 Phase Overview

```
Phase A: Foundation
    └─ A1: lib/** consolidation + noise shim deletion

Phase B: Derisk Complex Domains
    ├─ B1: Climate atomization (types → baseline → swatches/* → refine/*)
    └─ B2: Landmass atomization (types → ocean-separation/* → orchestrator)

Phase C: Morphology Sweep (parallelizable)
    ├─ C1: Coastlines
    ├─ C2: Islands
    ├─ C3: Mountains
    └─ C4: Volcanoes

Phase D: Ecology + Placement
    ├─ D1: Biomes (types → globals → coastal → nudges/*)
    ├─ D2: Features
    └─ D3: Placement

Phase E: Cleanup
    ├─ E1: Delete legacy facades (layers/**, narrative/**, story/**)
    └─ E2: Move step wiring (layers/** → pipeline/**)
```

### 5.3 Phase Details

#### Phase A: Foundation

| Issue | Scope | Rationale |
|-------|-------|-----------|
| **A1: `lib/**` consolidation** | Replace all local `clamp*`, `idx`, `normalizeFractal`, neighbor helpers with canonical `lib/**` imports; delete `lib/noise.ts` shim | Foundation work. Every subsequent PR benefits from stable imports. Small, testable, low-risk. |

**Definition of done:** No domain code defines its own `clamp`, `idx`, or neighbor iteration. All imports go through `lib/**` indices.

---

#### Phase B: Derisk Complex Domains

| Issue | Scope | Est. Files | Rationale |
|-------|-------|------------|-----------|
| **B1: Climate atomization** | `types.ts`, `runtime.ts`, `distance-to-water.ts`, `orographic-shadow.ts`, `baseline.ts`, `swatches/*` (7 files), `refine/*` (7 files), `index.ts` | ~18 | Most complex domain. Establishes patterns for types/runtime/orchestrator split. If this works cleanly, the rest will too. |
| **B2: Landmass atomization** | `types.ts`, `crust-mode.ts`, `water-target.ts`, `crust-first-landmask.ts`, `terrain-apply.ts`, `plate-stats.ts`, `windows.ts`, `diagnostics.ts`, `ocean-separation/*` (7 files), `post-adjustments.ts`, `index.ts` | ~19 | Second most complex. `ocean-separation/` is a self-contained subsystem. Validates nested folder pattern. |

**Definition of done:** Each domain's `index.ts` re-exports the stable public API. Tests pass. Determinism parity confirmed.

---

#### Phase C: Morphology Sweep

These can be done in parallel or serial. Each is a standalone PR.

| Issue | Scope | Est. Files | Notes |
|-------|-------|------------|-------|
| **C1: Coastlines** | types, plate-bias, adjacency, corridor-policy, rugged-coasts, index | 6 | Depends on B2 completing (may use landmass types) |
| **C2: Islands** | types, fractal-threshold, adjacency, placement, index | 5 | Independent |
| **C3: Mountains** | types, scoring, selection, apply, index | 5 | Independent |
| **C4: Volcanoes** | types, scoring, selection, apply, index | 5 | Independent |

**Definition of done:** Each subdomain has its own `types.ts` and `index.ts`. No cross-imports except through indices.

---

#### Phase D: Ecology + Placement

| Issue | Scope | Est. Files | Notes |
|-------|-------|------------|-------|
| **D1: Biomes** | types, globals, coastal, nudges/* (6 files), index | 9 | `nudges/` pattern mirrors `swatches/` |
| **D2: Features** | types, indices, place-feature, paradise-reefs, shelf-reefs, volcanic-vegetation, density-tweaks, index | 8 | Straightforward extraction |
| **D3: Placement** | types, diagnostics, wonders, floodplains, terrain-validation, areas, water-data, snow, resources, starts, discoveries, fertility, advanced-start, index | 14 | Large but mechanical |

**Definition of done:** Domain code imports only from `lib/**` and same-subsystem modules. Steps import from domain `index.ts`.

---

#### Phase E: Cleanup

| Issue | Scope | Rationale |
|-------|-------|-----------|
| **E1: Delete legacy facades** | Remove `layers/hydrology/climate.ts`, `layers/morphology/*.ts`, `layers/ecology/*.ts`, `layers/placement/placement.ts`, `narrative/**`, `story/**`, `lib/noise.ts` | Can only happen after all atomization is complete and step imports are migrated |
| **E2: Move step wiring** | `layers/standard-library.ts` → `pipeline/standard-library.ts`; move all `layers/*/steps/*.ts` → `pipeline/*/`; delete `layers/**` | Final structural change. Makes the target layout real. |

**Definition of done:** `src/layers/` directory no longer exists. All step wiring lives under `pipeline/**`.

---

### 5.4 Alternative Orderings Considered

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **Quick wins first** | `A1 → C1-C4 → D1-D2 → B1-B2 → D3 → E1-E2` | Builds momentum, gets PRs merged early | If patterns need adjustment, we'd retrofit already-merged work |
| **Breadth-first** | All `types.ts` files → All `index.ts` orchestrators → All internal modules | Establishes consistent patterns across domains | No domain is "done" until the end; harder to validate incrementally |
| **Vertical slices** | `(B1 + delete climate shim) → (B2 + delete landmass shims) → ...` | Each phase leaves codebase cleaner; validates deletion immediately | More complex PRs; harder to review |

The recommended **foundation → derisk → sweep → cleanup** approach balances these tradeoffs by:
1. Stabilizing shared imports first (A1)
2. Learning from the hardest cases early (B1-B2)
3. Enabling parallel work on simpler domains (C1-C4, D1-D3)
4. Deferring cleanup until all atomization is validated (E1-E2)

### 5.5 Issue Summary

| Phase | Issue | Dependencies | Parallelizable |
|-------|-------|--------------|----------------|
| A | A1: lib consolidation | None | — |
| B | B1: Climate | A1 | With B2 |
| B | B2: Landmass | A1 | With B1 |
| C | C1: Coastlines | B2 | With C2-C4 |
| C | C2: Islands | A1 | With C1, C3-C4 |
| C | C3: Mountains | A1 | With C1-C2, C4 |
| C | C4: Volcanoes | A1 | With C1-C3 |
| D | D1: Biomes | A1 | With D2-D3 |
| D | D2: Features | A1 | With D1, D3 |
| D | D3: Placement | A1 | With D1-D2 |
| E | E1: Delete facades | B1, B2, C1-C4, D1-D3 | With E2 |
| E | E2: Move step wiring | E1 | — |

**Total estimated issues:** 12 (could compress C1-C4 into 1-2 PRs if speed matters more than parallelization)

---

### 5.6 Task Assignment Guidance (Claude vs. Codex)

Different tasks suit different execution styles. This section provides guidance on which AI assistant is best suited for each task based on their strengths.

#### Strengths Profile

| Assistant | Strengths |
|-----------|-----------|
| **Claude** | Parallel subagents, broad context, fast exploration, planning & decomposition, communication & iteration, quick targeted edits, verification scans |
| **Codex** | Meticulous sustained attention, methodical step-by-step execution, deep single-problem focus, precise transformations (critical for determinism) |

#### Recommended Assignment

| Task | Best Fit | Rationale |
|------|----------|-----------|
| **A1: lib consolidation** | **Codex** | Meticulous find-and-replace across many files. Precision matters — one wrong import breaks things. Methodical sweep through each domain. |
| **B1: Climate atomization** | **Codex** | Deep, complex (~18 files). Determinism-critical (RNG labels, call order). Requires sustained attention to extract swatches/refine correctly. |
| **B2: Landmass atomization** | **Codex** | Deep, complex (~19 files). `ocean-separation/` is nested subsystem requiring careful extraction. Same determinism concerns. |
| **C1-C4: Morphology sweep** | **Claude** | Simpler patterns, parallelizable. Can spawn 4 subagents to do Coastlines/Islands/Mountains/Volcanoes simultaneously. Patterns established by B1-B2. |
| **D1-D2: Biomes + Features** | **Claude** | Follow patterns from B1's swatches/nudges. Parallelizable. Less complexity than Climate/Landmass. |
| **D3: Placement** | **Codex** | Large (14 files), mechanical but needs precision. Benefits from methodical step-by-step extraction without shortcuts. |
| **E1: Delete facades** | **Claude** | Cross-cutting verification — need to scan entire codebase to confirm all callsites migrated before deleting. Quick exploration strength. |
| **E2: Move step wiring** | **Codex** | Methodical file moves + import updates. Benefits from meticulous attention to not miss any imports. |

#### Summary by Assignee

| Assignee | Tasks | Character of Work |
|----------|-------|-------------------|
| **Codex** | A1, B1, B2, D3, E2 | Deep, precise, determinism-critical. Long transformations requiring sustained attention. |
| **Claude** | C1-C4, D1-D2, E1 | Parallelizable sweeps, pattern-following after Codex establishes patterns, cross-cutting verification. |
| **Both** | Planning, review, validation | Claude plans and verifies; Codex executes deep work; Claude handles edge cases. |

#### Sequencing Implication

```
Codex: A1 ──→ B1 ──→ B2 ──────────────────────→ D3 ──→ E2
                      │                          │
                      ▼                          │
Claude:          [patterns established]          │
                      │                          │
                      ├──→ C1 (Coastlines) ──────┤
                      ├──→ C2 (Islands) ─────────┤
                      ├──→ C3 (Mountains) ───────┤
                      ├──→ C4 (Volcanoes) ───────┤
                      ├──→ D1 (Biomes) ──────────┤
                      └──→ D2 (Features) ────────┘
                                                 │
                                                 ▼
Claude:                                         E1 (verify facades ready)
```

Codex establishes patterns with the hardest work (A1, B1, B2). Claude parallelizes the simpler follow-on work (C1-C4, D1-D2). Codex finishes mechanical precision work (D3, E2). Claude handles cross-cutting verification (E1).
