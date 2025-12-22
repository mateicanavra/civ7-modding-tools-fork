M-TS: JS → TS Parity Matrix (Story, World, Layers)

Status: Draft (Story/Corridors Matrix Complete; Bootstrap/World/Layers First Pass)  
Owner: Engineering  
Scope: `docs/projects/engine-refactor-v1/resources/_archive/original-mod-swooper-maps-js/**/*.js` vs TS in `packages/mapgen-core/src/**`, plus `MapOrchestrator`.

This matrix works **module-by-module** from the JS archive and records:
- Where we have **parity** (or better-than-parity) in TypeScript.
- Where we have **missing parity** (behavior not migrated).
- Where we have **detracting changes / open questions** — places where TS behavior diverges or is incomplete, and it is unclear if that divergence is intentional.

Legend for `Status`:
- `Parity` — TS behavior is functionally equivalent or intentionally evolved, with notes.
- `Missing` — No TS implementation of the JS behavior; dependent stages/consumers are effectively running without it.
- `Detraction / Open` — TS has partial or divergent behavior that appears unintentional or at least not clearly justified.

This document currently covers the **story** and **corridors** pipeline, the bootstrap/runtime/config surface, the **WorldModel**/plates stack, and the major terrain/climate/biome/feature layers. Additional rows can be added if we surface more JS modules or split TS behavior into new packages.

---

## 1. Story Tagging & Corridors Modules

### 1.1 `story/tags` (core registry)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `story/tags.js` | `packages/mapgen-core/src/story/tags.ts` | Parity (TS+ evolution) | TS implements a lazy singleton with `hotspot`, `rift`, `margin`, and corridor sets plus metadata maps and helpers (`addTag`, `hasTag`, `resetStoryTags`, etc.). Behavior is a superset of JS; the gap is not here but in the code that should populate these tags. |

Detractions / Open Questions:
- None in the registry itself; the open question is at the **usage** level (see 1.3–1.4 and §2.2).

---

### 1.2 `story/overlays` (margins & overlay registry)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `story/overlays.js` | `packages/mapgen-core/src/story/overlays.ts` | Parity (TS+ evolution) | TS keeps the same overlay registry concept (`STORY_OVERLAY_KEYS`, `publishStoryOverlay`, `getStoryOverlay`, `resetStoryOverlays`, `hydrateMarginsStoryTags`), but with immutable, typed snapshots. |

Detractions / Open Questions:
- `hydrateMarginsStoryTags` has no TS caller today; no TS stage publishes a margins overlay. In JS, `storyTagContinentalMargins` used this to back-fill margin tags. TS currently has a **dead overlay pipe**.
- Planned to be revived by minimal story parity in M2 (`CIV-36`), with full overlay canonicalization in M3 (`LOCAL-M3-STORY-SYSTEM`).

---

### 1.3 `story/tagging` (hotspots, rifts, orogeny, margins, swatches, paleo)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `story/tagging.js` | **None** (expected: `packages/mapgen-core/src/story/tagging.ts`) | Missing (planned split across M2/M3) | JS implements the core climate story: `storyTagHotspotTrails`, `storyTagRiftValleys`, `storyTagOrogenyBelts`, `storyTagContinentalMargins`, `storyTagClimateSwatches`, `storyTagPaleoHydrology` plus an `OrogenyCache`. TS implementation is tracked under parent `CIV-21` with children `CIV-36` and `LOCAL-M3-STORY-SYSTEM`. **Decision:** TS will not recreate the legacy cache flow; orogeny windward/lee amplification will return as a modern M3+ orogeny step/layer. |

Detractions / Open Questions:
- **Missing parity:** None of the following exist in TS:
  - Hotspot trail tagging (`hotspot`, `hotspotParadise`, `hotspotVolcanic`) with size, land-distance, and directionality constraints.
  - Rift line + shoulder tagging using `WorldModel` fields and `FOUNDATION_DIRECTIONALITY`.
  - Orogeny belts (windward/lee amplification) are deferred to M3+ modern pipeline; legacy cache plumbing will not be ported in M2.
  - Continental margins tagging + margins overlay publication.
  - Climate swatches and paleo passes that adjust rainfall around story structures.
- **Orchestration gap (today):** `MapOrchestrator` only has a stub `storySeed` stage that calls `resetStoryTags()`. Minimal tagging will be wired into existing story stages in M2 (`CIV-36`), with remaining stages migrated into Task Graph steps in M3 (`LOCAL-M3-STORY-SYSTEM`).

---

### 1.4 `story/corridors` (sea lanes, island-hop, land & river corridors)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `story/corridors.js` | **None** (expected: `packages/mapgen-core/src/story/corridors.ts`) | Missing (major behavior gap) | JS defines `storyTagStrategicCorridors(stage)` with pre-islands and post-rivers passes; it tags sea-lane, island-hop, land-open, and river-chain corridors, and fills `StoryTags.corridor*` plus `corridorKind`/`corridorStyle`/`corridorAttributes`. TS has no equivalent. |

Detractions / Open Questions:
- TS layers already read corridor tags (see §2.2, §7.1, §7.4). Because nothing populates them, corridor-aware behavior silently degrades to defaults. It is unclear whether we intend to port the corridor system 1:1 or simplify it.

---

## 2. Orchestrator & Story Consumers

### 2.1 Orchestrator stage wiring (`map_orchestrator` → `MapOrchestrator`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `map_orchestrator.js` | `packages/mapgen-core/src/MapOrchestrator.ts` | Detraction / Open (story stages only) | For non-story stages (foundation, landmass, coasts, islands, mountains, volcanoes, lakes, climate, biomes, features, placement) TS `MapOrchestrator` broadly matches and improves the JS pipeline: it uses `ExtendedMapContext` + `WorldModel`, adapter abstractions, and explicit stage timing. For *story* stages, TS only implements `storySeed` as a stub that resets tags and logs a message. Flags for `storyHotspots`, `storyRifts`, `storyOrogeny`, `storySwatches`, `storyPaleo`, and `storyCorridorsPre/Post` exist in the stage manifest but have no implementations. |

Detractions / Open Questions:
- The TS stage manifest advertises a rich story pipeline that is **not implemented**, which is misleading for config and callers. We should either:
  - Implement the missing stages and wire them to TS `story/tagging` / `story/corridors`, or
  - Hide/disable these stages until the implementations exist.
- Minimal story stages are explicitly scoped for M2 (orchestrator‑centric parity), while corridors/swatches/paleo and step wrapping are scoped for M3 under `CIV-21` children.

---

### 2.2 Story tag/overlay consumers (layers)

| JS Behavior | TS Equivalent | Status | Notes |
|-------------|---------------|--------|-------|
| Layers read `StoryTags` and story overlays to adjust coasts, islands, climate, biomes, and features near story structures and corridors. | `packages/mapgen-core/src/layers/{coastlines.ts,islands.ts,climate-engine.ts,biomes.ts,features.ts}` | Detraction / Open | TS layers are written to consume story tags and overlays (hotspots, rifts, margins, corridors), and climate engine still implements story-aware passes. But because tags/overlays are never populated, these branches operate as if “story is disabled”, causing silent behavior loss vs JS. |

Detractions / Open Questions:
- Once tagging is ported, we must re-compare the resulting behavior with JS and decide which differences are intentional vs regressions.

---

## 3. Config & Tunables Integration for Story/Corridors

### 3.1 Story/corridors config exposure (`bootstrap/tunables`)

| JS Config | TS Equivalent | Status | Notes |
|-----------|---------------|--------|-------|
| `STORY_TUNABLES`, `MARGINS_CFG`, `MOISTURE_ADJUSTMENTS`, `FOUNDATION_DIRECTIONALITY`, `CORRIDORS_CFG` in `bootstrap/tunables.js` | `packages/mapgen-core/src/bootstrap/tunables.ts` (`FOUNDATION_CFG.story`, `FOUNDATION_CFG.corridors`, `CLIMATE_CFG.story`, `FOUNDATION_DIRECTIONALITY`, etc.) | Detraction / Open | TS exposes structured config blocks for story and corridors and wires them into `FOUNDATION_CFG`/`CLIMATE_CFG`. However, because there is **no TS story/corridors implementation**, these configs are effectively unused beyond limited climate-engine use. |

Detractions / Open Questions:
- We must decide which story/corridor knobs are still supported in TS, and mark any deprecated ones explicitly once tagging/corridors are ported.

---

## 4. Summary: Story/Corridors Migration Status

- **Clearly migrated & in good shape (story infra):**
  - `story/tags` and `story/overlays` have solid TS equivalents with better typing and immutability.
  - Downstream layers and climate engine are written to consume story tags and overlays.
- **Clearly missing parity (major behavior gaps):**
  - Entire `story/tagging.js` and `story/corridors.js` behavior is absent in TS; there are no `storyTag*` functions, no margins overlay publication, no corridor tagging, and no real story stages beyond a stubbed `storySeed`.
- **Detractions / misleading surfaces:**
  - Stage manifest and `MapOrchestrator` flags advertise a rich set of story/corridor stages that do nothing today.
  - Config surfaces (`FOUNDATION_CFG.story`, `FOUNDATION_CFG.corridors`, `CLIMATE_CFG.story`, `FOUNDATION_DIRECTIONALITY`) exist but are not fully consumed.
  - Layers rely on `StoryTags` and corridor metadata that are never populated, silently degrading behavior vs the JS archive.

---

## 5. Bootstrap, Runtime & Dev Diagnostics

### 5.1 Runtime config store (`bootstrap/runtime`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `bootstrap/runtime.js` | `packages/mapgen-core/src/bootstrap/runtime.ts` | Removed (M2) | TS no longer keeps a global runtime store (`__EPIC_MAP_CONFIG__`). `runtime.ts` is now a type re-export only; config is injected via `bootstrap()`/`parseConfig()` and bound to tunables via `bindTunables()`. |

---

### 5.2 Entry bootstrap (`bootstrap/entry`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `bootstrap/entry.js` | `packages/mapgen-core/src/bootstrap/entry.ts` | Evolved (M2) | TS `bootstrap()` composes `presets` + `overrides` + `stageConfig`, resolves a `stageManifest`, validates overrides, then returns a validated `MapGenConfig` (`parseConfig`) and binds tunables (`bindTunables`). Callers pass the validated config explicitly to `MapOrchestrator`. |

Detractions / Open Questions:
- ~~None obvious; the main decision is how mod-level entries discover TS presets (see 5.7).~~  
  **Update (2025-12-21, M4 planning):** Presets are removed; entry is recipe + settings selection. See `../milestones/M4-tests-validation-cleanup.md`.

---

### 5.3 Tunables & stage manifest (`bootstrap/tunables` & `bootstrap/resolved`)

| JS Module / Config | TS Equivalent | Status | Notes |
|--------------------|---------------|--------|-------|
| `bootstrap/tunables.js` (unified tunables incl. all group getters and CLIMATE/FOUNDATION helpers) | `packages/mapgen-core/src/bootstrap/tunables.ts` (`getTunables`, `TUNABLES`, `stageEnabled`) | Detraction / Open | JS exported a very broad surface (`LANDMASS_CFG`, `COASTLINES_CFG`, `MARGINS_CFG`, `ISLANDS_CFG`, `CLIMATE_DRIVERS`, `MOISTURE_ADJUSTMENTS`, `MOUNTAINS_CFG`, `VOLCANOES_CFG`, `BIOMES_CFG`, `FEATURES_DENSITY_CFG`, `CORRIDORS_CFG`, `PLACEMENT_CFG`, `DEV_LOG_CFG`, `FOUNDATION_*`). TS narrows this to toggles, `LANDMASS_CFG`, `FOUNDATION_CFG` (+ plates/dynamics/directionality), `CLIMATE_CFG`, and `STAGE_MANIFEST`. Layers now read config directly from these core blocks rather than through narrower facades. |
| `bootstrap/resolved.js` (BASE_CONFIG + presets + overrides + StageManifest normalization + `[StageManifest]`/`[Foundation]` warnings) | `packages/mapgen-core/src/bootstrap/resolved.ts` (canonical `STAGE_ORDER`, `resolveStageManifest`, `validateOverrides`, `validateStageDrift`) + `packages/mapgen-core/src/bootstrap/tunables.ts` (config merge for `foundation`, `landmass`, `climate` + `stageEnabled`) | Detraction / Open | TS no longer owns `BASE_CONFIG` or presets; it expects a `MapConfig` to be supplied by the mod/config layer. StageManifest handling is reduced to a minimal resolver; the richer dependency enforcement and foundation backfill warnings from JS are not present in this repo. |

Detractions / Open Questions:
- ~~We should explicitly document where the TS equivalents of `BASE_CONFIG` and presets live, and whether we still want StageManifest dependency normalization and `[Foundation]` warnings somewhere in the pipeline.~~  
  **Update (2025-12-21, M4 planning):** Presets are removed; entry is recipe + settings selection. See `../milestones/M4-tests-validation-cleanup.md`.

---

### 5.4 Climate/foundation tunable facades (`climate-tunables`, `foundation-tunables`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `bootstrap/climate-tunables.js` | **None** (callers use `bootstrap/tunables.ts`) | Parity (intentional drop) | JS exposed a climate-focused facade (`CLIMATE_TUNABLES`, `CLIMATE_DRIVERS`, `MOISTURE_ADJUSTMENTS`, `STORY_TUNABLES`). TS intentionally does **not** reintroduce these facades; layers should read `CLIMATE_CFG` (and story sub-blocks) and `CLIMATE.*` helpers directly from tunables. |
| `bootstrap/foundation-tunables.js` | **None** (callers use `bootstrap/tunables.ts`) | Parity (intentional drop) | JS had a dedicated `FOUNDATION_TUNABLES` view; TS intentionally uses `FOUNDATION_CFG`, `FOUNDATION_PLATES`, etc., directly without a facade. |

Detractions / Open Questions:
- Resolved: JS-era tunables facades are intentionally not ported. TS code should use core tunables blocks and helpers directly; no follow‑up parity work is planned for these facades.

---

### 5.5 Dev diagnostics (`bootstrap/dev`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `bootstrap/dev.js` | `packages/mapgen-core/src/dev/{flags.ts,logging.ts,ascii.ts,histograms.ts,summaries.ts,introspection.ts,timing.ts,index.ts}` | Parity (TS+ structural reorg) | TS moves dev logging into a dedicated module tree with typed `DEV` flags, logging, timing, ASCII, histogram, and summary helpers. Behavior is broadly equivalent (and richer), but decoupled from tunables (`DEV_LOG_CFG` no longer exists here). |

Detractions / Open Questions:
- Dev flags now require explicit initialization (`initDevFlags`) rather than tunables-driven config. We should decide whether to reintroduce a config-driven dev surface or keep it manual.

---

### 5.6 Type surface (`bootstrap/map_config.types`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `bootstrap/map_config.types.js` | `packages/mapgen-core/src/bootstrap/types.ts` | Parity (TS+ evolution) | TS is the natural successor to the JS typedefs, with richer structure for `FoundationConfig`, climate, story, corridors, biomes, features, placement, and `StageManifest`, and a `TunablesSnapshot` type used by `tunables.ts`. |

---

### 5.7 Presets & base config (`defaults/base`, `presets/*`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `bootstrap/defaults/base.js` | **None in `mapgen-core`** | Detraction / Open | JS provided a `BASE_CONFIG` default. TS has no built-in base config; `MapConfig` is expected from the mod/config layer. |
| `bootstrap/presets/classic.js`, `bootstrap/presets/temperate.js` | **None in `mapgen-core`** | ~~Detraction / Open~~ | ~~JS shipped named presets and a preset registry. TS still accepts `presets: [...]` but this repo does not define those presets. They must live elsewhere (or be considered missing).~~<br>**Update (2025-12-21, M4 planning):** Presets are removed; entry is explicit recipe + settings selection. Named presets (if any) are treated as named recipes in mod packages. See `milestones/M4-tests-validation-cleanup.md`. |

Detractions / Open Questions:
- ~~We should decide where canonical TS presets live (and whether `classic`/`temperate` remain supported names).~~  
  **Update (2025-12-21, M4 planning):** Presets are removed; no preset registry is expected in `mapgen-core`. See `milestones/M4-tests-validation-cleanup.md`.

---

## 6. Foundation Plates

### 6.1 Foundation plate core (`foundation/plate-seed`, `foundation/plates`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `world/model.js` | Removed (M4) | Removed | WorldModel producer path replaced by step-owned foundation producers feeding `FoundationContext`. |
| `world/plate_seed.js` | `packages/mapgen-core/src/foundation/plate-seed.ts` | Parity (TS+ evolution) | TS `PlateSeedManager` captures Civ RNG state (via `globalThis.RandomImpl`), applies `seedMode`/`fixedSeed`/`seedOffset`, and finalizes a frozen `SeedSnapshot`. Behavior matches JS, with broader support for numeric seed fields. |
| `world/plates.js` | `packages/mapgen-core/src/foundation/plates.ts` | Parity (TS+ evolution, engine decoupling) | TS ports the Voronoi/kd-tree-based plate generation into pure TypeScript, with an injectable or fallback Voronoi implementation. Physics (boundary type, boundary closeness, uplift/rift/shield fields) and boundary stats are maintained. |

Detractions / Open Questions:
- TS includes a fallback Voronoi implementation when Civ7’s `VoronoiUtils` is unavailable, which may slightly change plate layouts outside the game. We should decide whether this is acceptable or if we want to require engine Voronoi for “canonical” generation.

---

## 7. Terrain, Climate, Biomes, Features & Placement Layers

This section focuses on `layers/*`. For story-related consumers see also §2.2.

### 7.1 Landmass & coastlines (`layers/landmass_plate`, `layers/landmass_utils`, `layers/coastlines`, `layers/islands`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `layers/landmass_plate.js` | `packages/mapgen-core/src/layers/landmass-plate.ts` | Parity (TS+ evolution) | TS keeps plate-driven landmass windows and landMask generation, but runs against `ExtendedMapContext` and `WorldModel` and uses typed `LandmassConfig`. `MapOrchestrator` uses the same windows to define west/east continents and stamp continents. |
| `layers/landmass_utils.js` | `packages/mapgen-core/src/layers/landmass-utils.ts` | Parity (TS+ evolution) | TS ports plate-aware ocean separation and post-adjustments; the legacy three-band ocean generator is intentionally removed. Ocean separation is now driven by `FOUNDATION_CFG.surface.oceanSeparation`/`FOUNDATION_CFG.oceanSeparation`. |
| `layers/coastlines.js` | `packages/mapgen-core/src/layers/coastlines.ts` | Parity (TS+ evolution) | TS keeps rugged-coast carving on top of base `expandCoasts` but uses the adapter and `FOUNDATION_CFG.coastlines`/`FOUNDATION_CFG.oceanSeparation` for config. Execution order matches JS. |
| `layers/islands.js` | `packages/mapgen-core/src/layers/islands.ts` | Parity (TS+ evolution; story inputs missing) | TS islands layer mirrors the “chain + hotspot” logic and uses `FOUNDATION_CFG.islands` and `WorldModel`. Hotspot-related story tags are currently unused because tagging is missing. |

---

### 7.2 Mountains & volcanoes (`layers/mountains`, `layers/volcanoes`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `layers/mountains.js` | `packages/mapgen-core/src/layers/mountains.ts` | Parity (TS+ evolution) | TS `layerAddMountainsPhysics` uses the same WorldModel plate fields as JS but reads config from typed `MountainsConfig` via `FOUNDATION_CFG.mountains`. Behavior is similar, with clearer logging and tuning. |
| `layers/volcanoes.js` | `packages/mapgen-core/src/layers/volcanoes.ts` | Detraction / Open (fallback behavior) | JS `layerAddVolcanoesPlateAware` fell back to the base game’s `addVolcanoes()` when WorldModel data was missing. TS `layerAddVolcanoesPlateAware` is pure TS and skips placement entirely when prerequisites aren’t met. This removes the vanilla-compatible fallback. |

Detractions / Open Questions:
- We should decide whether to keep the “no volcanoes if WorldModel is off” behavior, or reintroduce a vanilla fallback via `@civ7/adapter`.

---

### 7.3 Climate engine (`layers/climate-engine`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `layers/climate-engine.js` | `packages/mapgen-core/src/layers/climate-engine.ts` | Parity (TS+ evolution; story inputs missing) | TS inlines the rainfall staging pipeline and no longer calls base-standard `buildRainfallMap`. It uses `ExtendedMapContext`, `CLIMATE_CFG`, `FOUNDATION_DIRECTIONALITY`, and `StoryTags` (for rift/orogeny/hotspot passes). Story-driven passes exist but currently operate on empty tag sets because tagging is missing. |

Detractions / Open Questions:
- Once tagging is ported, we should re-check rainfall behavior vs JS, especially around rift humidity boosts, orogeny belts, and hotspot microclimates.

---

### 7.4 Biomes & features (`layers/biomes`, `layers/features`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `layers/biomes.js` | `packages/mapgen-core/src/layers/biomes.ts` | Parity (TS+ evolution; story inputs missing) | TS `designateEnhancedBiomes` keeps the JS goals (tundra restraint, tropical coasts, river valleys, rift shoulders) but reads config from `FOUNDATION_CFG.biomes` and `FOUNDATION_CFG.corridors`. Story tags for rift shoulders are unused until tagging is ported. |
| `layers/features.js` | `packages/mapgen-core/src/layers/features.ts` | Parity (TS+ evolution; story inputs missing) | TS `addDiverseFeatures` mirrors JS behavior for reef/forest/taiga micro-features and corridor-aware boosts, but corridor/story tags are currently empty. |

---

### 7.5 Placement (`layers/placement`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `layers/placement.js` | `packages/mapgen-core/src/layers/placement.ts` | Parity (TS+ evolution) | TS `runPlacement` orchestrates natural wonders, floodplains, starts, etc., via the adapter and typed `StartsConfig`/`PlacementConfig`. It still relies on stamped west/east continents from the landmass stage. |

---

### 7.6 Core utilities & adapters (`core/*`)

| JS Module | TS Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `core/types.js` | `packages/mapgen-core/src/core/types.ts` | Parity (TS+ evolution) | TS turns MapContext/FoundationContext into real implementations with strict tensor checks, immutable config snapshots, `createExtendedMapContext`, `ctxRandom`, `writeHeightfield`, `writeClimateField`, and `createFoundationContext`. |
| `core/utils.js` | `packages/mapgen-core/src/core/index.ts` | Parity (TS+ evolution, partial) | TS re-exports `clamp`, `inBounds`, `storyKey`, and adds `parseStoryKey`, `lerp`, `wrapX`, `fillBuffer`. Engine-coupled helpers like `isAdjacentToLand`/`getFeatureTypeIndex` moved behind `EngineAdapter`/`@civ7/adapter` instead of living in `mapgen-core`. |
| `core/plot_tags.js` | `packages/mapgen-core/src/core/plot-tags.ts` | Parity (TS+ evolution) | TS ports plot tagging and adds `addPlotTagsSimple`, `LANDMASS_REGION`, and `markLandmassRegionId`, which `MapOrchestrator` uses to stamp region IDs in the right order. |
| `core/adapters.js` | `@civ7/adapter` (`Civ7Adapter`, `createCiv7Adapter`) | Detraction / Open (cross-package move) | The Civ-engine adapter moved into its own package. `MapOrchestrator` and layers now rely on `EngineAdapter` from `@civ7/adapter`. This is architecturally good, but we should treat `@civ7/adapter` as the TS home for JS `core/adapters.js` and verify method parity. |

---

## 8. Next Steps (Matrix & Migration Plan)

Based on the extended parity matrix above:

- Most **physics, morphology, climate, biomes, features, placement, and world model** behavior has TS coverage with **parity or intentional evolution**.
- The largest **known gaps** remain:
  - Story tagging and corridors (`story/tagging`, `story/corridors`) and their orchestration.
  - ~~Config/preset ownership (`BASE_CONFIG`, `classic`/`temperate` presets).~~  
    **Update (2025-12-21, M4 planning):** Presets are removed; entry is recipe + settings selection. See `../milestones/M4-tests-validation-cleanup.md`.
  - Dev logging + climate/foundation facades wired through tunables.
- Key **Detraction / Open** questions to resolve:
  - ~~Where do canonical TS presets/base config live, and how do entries discover them?~~  
    **Update (2025-12-21, M4 planning):** Presets are removed; entry is recipe + settings selection. See `../milestones/M4-tests-validation-cleanup.md`.
  - Do we require engine Voronoi (`VoronoiUtils`) for canonical plates, or accept TS fallback for tools/tests?
  - Do we want new TS facades for climate/foundation/dev logging, or explicitly deprecate the JS-style ones?

Once we agree on these classifications, we can:
- Update the migration plan/milestone docs to reference this matrix as the canonical checklist.
- File concrete tasks for the remaining `Missing` / `Detraction / Open` rows (especially story/corridors, adapter parity, and any dev/climate config gaps).

---

## 9. Prioritization & Migration Strategy (Architecture-Aware)

This section summarizes how to prioritize the remaining migration work given the long-term architecture ([architecture.md](../../system/libs/mapgen/architecture.md), [PRD-plate-generation.md](PRD-plate-generation.md)).

0. Enforce fail-fast behavior for fundamental stages  
   - For any **fundamental** step (foundation/plates, landmass windows, mountains, volcanoes, climate, story/tagging, corridors, placement), avoid silent no-ops or “dumb” fallbacks that hide wiring/config errors.  
   - Prefer explicit assertions (e.g. `assertFoundationContext`) and hard failures at the stage/orchestrator level when prerequisites are missing or invalid, rather than reverting to base-game behavior or skipping work without logging.  
   - As part of this sweep, audit existing “graceful degradation” sites and either:
     - Make the dependency strict (fail-fast when the stage is enabled but prerequisites are absent), or  
     - Reclassify the behavior as genuinely optional and document it clearly in this matrix and the architecture docs.  
   - Concrete candidates for tightening (TODO sublist, for future CIV tickets):
     - `0.a Volcanoes fail-fast` (`layers/volcanoes.ts`) — today silently returns when `ctx.adapter`/dimensions are missing, when `ctx.foundation` is absent, when plate tensors (`boundaryCloseness`, `boundaryType`) are missing, or when `targetVolcanoes <= 0`/`candidates.length === 0`. For the `volcanoes` stage (when enabled), fail-fast on missing foundation/tensors and log an explicit error when no candidates/target count are produced, instead of quietly producing “no volcanoes”.  
     - `0.b Mountains tensor enforcement` (`layers/mountains.ts`) — `layerAddMountainsPhysics` falls back to `computeFractalOnlyScores` when uplift/boundary tensors are missing, and `addMountainsCompat` silently returns when `ctx` is null. For the `mountains` stage (when enabled and foundation is expected), treat missing tensors as an error rather than a silent fallback to pure fractal behavior.  
     - `0.c Climate story-tag enforcement` (`layers/climate-engine.ts`) — several passes rely on story tags (`riftLine`, `riftShoulder`, `hotspotParadise`, `hotspotVolcanic`) and orogeny cache, but today an empty `StoryTags` instance simply yields “no-op” behavior. When `STORY_ENABLE_*` flags or story stages are enabled, assert that corresponding tagging has run or at least emit a clear warning when tags are empty at refinement time.  
     - `0.d Story/corridor consumer expectations` (`layers/biomes.ts` / `layers/features.ts` / `layers/islands.ts` / `layers/coastlines.ts`) — these layers read corridor/story tags and corridor policy; with missing tagging, they currently degrade to baseline behavior. Once story/corridor stages exist, align expectations so that enabling those stages without producing tags is treated as an error (or logged loudly) instead of a quiet “no corridors/tags” world.  
     - `0.e Placement hard-failure policy` (`layers/placement.ts`) — wraps many engine calls in `try/catch` and logs failures, but otherwise continues. For absolutely critical operations (e.g. `assignStartPositions`, `storeWaterData`, `recalculateFertility`), decide whether a hard failure (or at least a failed `placement` stage result) is preferable to “map completes but starts/placement logic silently degraded”.  
     - `0.f Adapter/engine integration fail-fast` (`MapOrchestrator.resolveOrchestratorAdapter` and other adapter lookups) — dynamic `require` of base-standard helpers and runtime terrain/feature lookups are environment-dependent, but we should still distinguish between “expected in headless/tests” vs “unexpected in production” and log at error level (or fail the stage) when a required engine surface is missing in a real game run.

1. Avoid more “dumb ports” of core systems  
   - For foundational systems (foundation/plates, story, corridors, config/pipeline), stop doing line-by-line ports into the current `MapOrchestrator` + StageManifest shape.  
   - Treat the archived JS as a behavioral reference; new implementations should move toward `MapGenStep` + `StepRegistry` and `ExtendedMapContext` as the blackboard.

2. Finish P0 remediation as planned  
   - Confirm and close out CIV‑14…CIV‑24: non-null TS map script, adapter boundary and FoundationContext usage, config→stage wiring, and minimal integration tests/dev diagnostics.  
   - Treat these as a stabilization pass; any remaining gaps should be handled as small follow-ups rather than re-opening the whole migration or blocking the new pipeline work.

3. Restore story/corridors behavior in an architecture-friendly way  
   - Implement `story/tagging.ts` and `story/corridors.ts` as pure/context-oriented TS modules: functions or small “step-like” helpers that take `ExtendedMapContext` + `FoundationContext` + `StoryTags` and optional config.  
   - Wire them from the existing `MapOrchestrator` in a simple sequence, but keep signatures compatible with later wrapping as `MapGenStep`s.  
   - Update this matrix as parity is achieved (or intentionally simplified) for each story/corridor behavior.

4. Introduce pipeline interfaces early, scoped to Foundation first  
   - Add `core/pipeline.ts` with `MapGenStep`, `StepRegistry`, and a simple executor.  
   - Implement the Foundation as the first concrete task-graph pilot: `MeshStep`, `PlatePartitioner`, `TectonicEngine`, aligned with [PRD-plate-generation.md](PRD-plate-generation.md).  
   - Have the existing orchestrator call a “FoundationPipeline” helper that runs these steps and writes `context.foundation`, without converting all other stages yet.

5. Evolve tests and logging alongside the new pipeline  
   - Add focused tests for:
     - The Foundation step pipeline (mesh → partition → physics).  
     - Story tagging and corridors on small synthetic maps once implemented.  
   - Prefer a step-level logging convention (`[Step] core.mesh.voronoi: …`) and a small diagnostics helper over re-expanding the legacy tunables-driven dev logging facade.

6. Defer blind porting of config/presets; design them as recipes  
   - Do not recreate JS `BASE_CONFIG`, `classic`/`temperate` presets, and tunables facades exactly.  
   - Instead, design how those presets become pipeline JSON recipes (or strongly-typed configs) and build a thin transitional layer that maps current entries onto recipes or onto the “new Foundation + legacy remainder” shape.  
   - Track the absence of a dedicated preset/recipe system as a deliberate “Missing design” item in this matrix and in planning docs.

7. Resolve small detractions with explicit decisions  
   - For volcano placement, adapter parity, and dev diagnostics, make clear decisions:
     - For **volcanoes and other foundation-dependent layers**, do **not** reintroduce silent or vanilla fallbacks; instead, rely on the fail-fast policy above and ensure missing prerequisites cause an explicit error or clearly logged stage failure.  
     - For adapter parity and dev diagnostics, either restore JS behavior via `@civ7/adapter` (and mark as parity), or document the evolution as intentional.  
   - Keep these as relatively small, follow-on tasks compared to the story/corridor and pipeline work, but ensure each is explicitly resolved rather than left ambiguous.
