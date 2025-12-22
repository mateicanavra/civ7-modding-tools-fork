Short answer: no — the migration is not “done in full”. The core TS architecture is in good shape and many pieces are better than the JS original, but a meaningful amount of behavior still lives only in the archived JS, and the current docs/milestone don’t give you a clean, explicit record of what is intentionally dropped vs what’s still to be migrated.

I’ll break it down by area, then suggest how to fix the plan-of-record gap.

**1. What’s fully or better-than-parity migrated**

- **Package architecture exists and is wired**
  - `@civ7/types`, `@civ7/adapter`, and `@swooper/mapgen-core` are real and in use (`packages/civ7-types`, `packages/civ7-adapter`, `packages/mapgen-core`, `mods/mod-swooper-maps`).
  - The mod entry (`mods/mod-swooper-maps/src/swooper-desert-mountains.ts`) uses `bootstrap` and `MapOrchestrator` from `@swooper/mapgen-core`, with dynamic plate count from actual map dimensions (fixing the “hard-coded 84×54” issue).
  - `tsup`/Gate A/Gate C wiring is present and working: Gate A `continents` wrapper exists, and the Swooper entry is a TS consumer of the core.

- **Bootstrap + tunables architecture**
  - `bootstrap/entry.ts` is the TS version of `bootstrap/entry.js` with:
    - `stageConfig` → `stageManifest` resolution via `resolved.ts` (fixes the “Config Air Gap” described in remediation).
    - `validateOverrides` warnings when overrides target disabled/missing stages.
    - `resetBootstrap()` and `rebind()` hook into `runtime.ts` and `tunables.ts`.
  - `bootstrap/runtime.ts` mirrors the JS `runtime.js` global config store, using lazy, resettable global state.
  - `bootstrap/tunables.ts`:
    - Uses a memoized `getTunables()` cache with `resetTunables()` and `rebind()`.
    - Merges top-level layer configs into `FOUNDATION_CFG` (mountains, volcanoes, coastlines, islands, biomes, featuresDensity, story, corridors, oceanSeparation), which is richer than the original.
    - Provides `STAGE_MANIFEST` and `stageEnabled()` using the resolved manifest (fixing the old “everything disabled” problem).
    - This is cleaner and more explicit than the JS version.

- **Foundation plates and seed**
  - `foundation/plates.ts`, `foundation/plate-seed.ts`, `foundation/types.ts` are fully TS and used by the foundation stage producers (no `WorldModel` singleton).
  - The Voronoi plate implementation is TS-native (`computePlatesVoronoi`) with deterministic `PlateSeedManager` and captured `plateSeed` snapshot; this matches and improves on the “Phase 1.5” JS description.
  - `MapOrchestrator.initializeFoundation()` builds an immutable `FoundationContext` via step-owned producers and stores it on `ctx.foundation`, with dev diagnostics hooks (`logFoundationSummary`, ASCII, histograms). This corresponds to the “foundation snapshot” architecture described in docs and remediation.

- **Adapter boundary (partially realized)**
  - The placement, layer-level operations, and climate code use `EngineAdapter` from `@civ7/adapter` for engine-facing calls:
    - `layers/placement.ts` calls `adapter.addNaturalWonders`, `addFloodplains`, `validateAndFixTerrain`, `recalculateAreas`, `storeWaterData`, `generateSnow`, `generateResources`, `assignStartPositions`, `generateDiscoveries`, `recalculateFertility`, `assignAdvancedStartRegions`.
    - `layers/climate-engine.ts` uses a “climate adapter” derived from `ctx.adapter` and intentionally omits `isCoastalLand`/`isAdjacentToShallowWater` when not present, to allow local fallbacks (explicit remediation of the “stubbed to false” bug).
  - The mod entry’s `MapOrchestrator` instantiation passes no adapter; `MapOrchestrator` uses `Civ7Adapter` internally for layer work, but orchestrator-level operations still use globals (see below).

- **Placement and end-game pipeline**
  - `layers/placement.ts` is a faithful and stronger TS port of `layers/placement.js`:
    - Same responsibilities as the JS layer, but now entirely adapter-based.
    - Incorporates vanilla ordering constraints (validate/fix → recalc areas → store water → snow → resources → starts → discoveries → fertility → advanced start).
    - Pulls placement config from `FOUNDATION_CFG.placement` via `getTunables()`, giving a central config entry point that JS didn’t have.
    - Adds terrain mix diagnostics (`logTerrainStats`, `logAsciiMap`) using `EngineAdapter` rather than direct globals.
  - This is effectively “parity plus better architecture” for late-stage placement.

- **Dev diagnostics**
  - The JS `bootstrap/dev.js` was fully reworked into a TS-first diagnostics module under `src/dev/*` (`flags.ts`, `logging.ts`, `timing.ts`, `ascii.ts`, `histograms.ts`, `summaries.ts`, etc.), exported via `dev/index.ts`.
  - Flags like `LOG_FOUNDATION_*`, rainfall histograms, ASCII dumps, story-tag summaries, etc., exist and are consumed by `MapOrchestrator` and layers. This is a net improvement over the JS dev helpers.

**2. What’s clearly still missing or only partially migrated**

These are the major “behavior gaps” vs the JS archive.

- **Story tagging implementation (P0 remediation calls this out)**
  - JS modules:
    - `story/tagging.js` — hotspots, rift valleys, orogeny belts, continental margins, climate swatches, paleo hydrology, etc.
    - `story/corridors.js` — sea lanes, island-hop lanes, land open corridors, river chains, metadata (corridorKind/style/attributes).
  - TS situation:
    - `packages/mapgen-core/src/story/tags.ts` and `story/overlays.ts` exist and are used by layers, but there is **no `story/tagging.ts` or `story/corridors.ts`** in TS.
    - `MapOrchestrator`’s “story” stages are mostly placeholders:
      - `storySeed`: just `resetStoryTags()` and a log; no margin tagging logic is called.
      - `storyHotspots`, `storyRifts`, `storyOrogeny`, `storyCorridorsPre`, `storySwatches`, `storyPaleo`, `storyCorridorsPost` do not exist as separate stage functions; only `storySeed` + the later climate/biome/feature layers *consume* `StoryTags` if populated.
    - Layers (`climate-engine.ts`, `coastlines.ts`, `islands.ts`, `features.ts`, `biomes.ts`) all read `StoryTags` and overlay data and assume tagging has happened, but nothing populates:
      - `StoryTags.hotspot`, `hotspotParadise`, `hotspotVolcanic`
      - `StoryTags.riftLine`, `riftShoulder`
      - `StoryTags.activeMargin`, `passiveShelf`
      - `StoryTags.corridorSeaLane`, `corridorIslandHop`, `corridorLandOpen`, `corridorRiverChain`
      - `StoryTags.corridorAttributes`, etc.
  - Effect: all the “narrative environment” behavior (hotspot lanes, rift shoulders, swatches, paleo hydrology, strategic corridors) is effectively disabled in TS, even though the downstream climate/biome/feature logic is wired to use them. This matches the remediation doc’s observation that story tags are missing.

- **Config-driven story moisture & paleo behavior**
  - JS `story/tagging.js` uses `STORY_TUNABLES`, `MARGINS_CFG`, `MOISTURE_ADJUSTMENTS`, `FOUNDATION_DIRECTIONALITY` from `bootstrap/tunables.js` to:
    - Scale counts by map size (`sqrt(area/10000)`).
    - Clamp rainfall adjustments `[0, 200]`.
    - Use `FOUNDATION_DIRECTIONALITY` for oriented rift lines.
  - TS:
    - `bootstrap/tunables.ts` includes story-related config (e.g., `foundation.story`, `foundation.corridors`, `CLIMATE_CFG.story`) but there is no TS code that implements the actual tagging passes for those tunables.
    - `climate-engine.ts` reads `CLIMATE_CFG.story.rainfall`; its orogeny windward/lee tunables are currently inert in M2 because no orogeny belts/step are produced. Orogeny will be reintroduced as a dedicated M3+ step/layer in the task‑graph pipeline (no legacy `OrogenyCache` port planned).
  - Net: story-related tunables have been given a nice config home but the logic that consumes them at the story-tagging level is not migrated. The climate refinement pass uses some story tags (`riftLine`, `hotspotParadise`, `hotspotVolcanic`) if present, but never gets them.

- **Corridors system (sea lanes, island-hop, land corridors, river chains)**
  - JS `story/corridors.js` has nontrivial logic:
    - Scans long open water runs (vertical, horizontal, diagonals) with minimum lane width to tag “sea lanes”.
    - Connects hotspot trails into “island-hop” lanes.
    - Uses rift shoulders and river adjacency to create land and river corridors.
    - Assigns corridor metadata (kind/style/attributes) consumed by coastlines, islands, biomes, features.
  - TS:
    - `coastlines.ts`, `islands.ts`, `biomes.ts`, `features.ts` read `StoryTags.corridor*` and `corridorAttributes`, and expect the corridor metadata to exist.
    - There is no TS module that computes or publishes corridors based on `CORRIDORS_CFG`. `CORRIDORS_CFG` itself is not exposed as such in TS; instead there is `foundation.story` / `foundation.corridors` config, but no logic that implements the scoring and tagging the JS code does.
  - Net: corridor behavior is missing; dependent layers silently do much less.

- **Story overlays for margins**
  - The JS `storyTagContinentalMargins()` both:
    - Tags margins into `StoryTags.activeMargin` / `passiveShelf`.
    - Produces a `StoryOverlay` (via `publishStoryOverlay`) with `summary` statistics and uses `hydrateMarginsStoryTags`.
  - TS:
    - `story/overlays.ts` has `publishStoryOverlay`, `finalizeStoryOverlay`, `hydrateMarginsStoryTags` exactly as the JS docs describe.
    - No TS stage actually builds a “margins” overlay and publishes it. The hydration function is in place but unused.
  - Effect: overlays infra is in place, but the “margins” data product never exists.

- **Top-level story orchestration**
  - JS orchestrator calls the story tagging functions at specific points in the pipeline (pre-/post-rivers, before climate swatches, etc.).
  - TS `MapOrchestrator`:
    - Only has a stubbed `storySeed` stage.
    - Does not call any `storyTag*` functions (because they don’t exist yet).
    - Treats `storyHotspots`, `storyRifts`, `storyOrogeny`, `storyCorridors*`, `storySwatches`, `storyPaleo` as stage flags (via `stageEnabled`), but there is no per-stage implementation.
  - So the stage manifest and flags are more complete than the underlying behavior.

- **Adapter boundary: orchestrator still uses globals**
  - The remediation doc criticized dynamic requires and suggested constructor injection or static imports via the adapter.
  - Current TS:
    - Layers correctly use `EngineAdapter`.
    - `MapOrchestrator` introduces an internal `OrchestratorAdapter` that directly hits `GameplayMap`, `GameInfo`, `TerrainBuilder`, `AreaBuilder`, and `require("/base-standard/...")` for lakes/coasts and uses `createCiv7Adapter` for `chooseStartSectors`/`needHumanNearEquator`.
    - This bypasses the “single adapter boundary” ideal described in the plan/milestone; the orchestrator is still mixing:
      - direct global usage (for init, lakes, coasts, water validation).
      - `Civ7Adapter` for some operations.
  - This is an improvement over the earlier dynamic `require("./core/adapters.js")` fallback, but not fully aligned with the “adapter-only boundary” decision. It’s a sophisticated compromise, not the clean boundary the docs describe.

- **Map-size presets and classic/temperate presets**
  - JS archive includes:
    - `bootstrap/presets/classic.js`, `bootstrap/presets/temperate.js`.
  - TS:
    - `bootstrap/entry.ts` and `resolved.ts` know about `presets` and `stageConfig`, but there’s no TS equivalent of `classic`/`temperate` preset modules.
    - `swooper-desert-mountains.ts` uses a fully inline config and no named presets.
  - Effect: preset-based configuration (named map styles) is not migrated. You have one TS entry (`desert-mountains`) with a specific configuration; the JS library of presets is only present in `_archive`.
  - **Update (2025-12-21, M4 planning):** Presets are removed; entry is explicit recipe + settings selection. Any named presets are treated as named recipes (if used). See `../milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

- **Story-aware climate swatches and paleo hydrology**
  - JS `story/tagging.js`:
    - Implements `storyTagClimateSwatches` and `storyTagPaleoHydrology` which call `applyClimateSwatches` and do rainfall deltas using `writeClimateField` and `syncClimateField`.
  - TS:
    - `climate-engine.ts` has `applyClimateSwatches` and `refineClimateEarthlike` (with rift and hotspot microclimates — those parts are migrated).
    - The specific swatch and paleo passes are not orchestrated as story stages; there is no `storyTagClimateSwatches`/`storyTagPaleoHydrology` stage that:
      - sets up rainfall buffers,
      - ensures `syncClimateField` is called before writing,
      - updates `StoryTags` or overlays.
  - As a result, the climate engine’s more advanced story-driven adjustments (macro swatches, paleo features) are not in use.

**3. How the current docs/milestone fall short as a “record of done vs not done”**

- The plan/milestone documents (migrate-to-ts-plan, M-TS milestone, remediation) describe:
  - The existence of story tagging, corridors, and a stage manifest with many story stages.
  - The need to fix adapter boundary, config→manifest, and WorldModel consumption.
  - A remediation stack (CIV-14..24) listing: story tagging reactivation, engine adapter integration, map-size awareness, dev diagnostics, etc.
- But they do not:
  - Explicitly enumerate which JS modules are intentionally not yet ported (e.g., “story/tagging.js and story/corridors.js remain unported — considered scope for CIV‑21”).
  - Clarify which behaviors are *intentionally* dropped vs temporarily missing (e.g., “we are not bringing back paleo hydrology; we are keeping only hotspots+rift tags”).
  - Attach a concrete “TS parity achieved” checklist that lists each JS artifact and its TS equivalent (or deprecation decision).

So your intuition is correct: the migration plan and remediation docs capture the architectural issues and high-level tasks, but they do not give you a clean, module-by-module parity map. The actual codebase has advanced in some areas (foundation plates, placement, tunables) and left others behind (story tagging, corridors, presets) without an updated, precise record.

**4. Recommended “done” definition and updated migration plan**

To get to “migration finished” in the sense you describe (parity or explicit evolution/dropping of baggage), I’d recommend adding a short, concrete plan-of-record document and updating/closing relevant issues. Conceptually:

- **Step 1: Explicit parity matrix (JS → TS)**
  - Create a simple table (in a new doc, e.g. `docs/projects/engine-refactor-v1/resources/M-TS-parity-matrix.md`) with one row per JS module in `_archive/original-mod-swooper-maps-js`:
    - Columns: JS module, TS equivalent, status (`ported`, `superseded`, `intentionally dropped`, `pending`), notes.
  - For example:
    - `layers/placement.js` → `packages/mapgen-core/src/layers/placement.ts` — `ported`, “adapterized, preserves vanilla order, uses foundation placement config”.
    - `world/model.js` → removed (M4) — `superseded`, “foundation step producers own plates/dynamics now”.
    - `story/tagging.js` → `—` — `pending`, “story tagging not migrated; downstream layers expect StoryTags but never receive them”.
    - `story/corridors.js` → `—` — `pending`.
    - ~~`bootstrap/presets/*.js` → `—` — `pending` or `intentionally dropped`, depending on decision.~~  
      **Update (2025-12-21, M4 planning):** Presets are removed; treat any named variants as named recipes. See `../milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

- **Step 2: Decide what to keep vs drop**
  - For each “pending” row in that parity matrix, explicitly choose:
    - **Keep / port** — e.g.:
      - Core story tags that drive climate and biomes: margins, rift lines + shoulders, orogeny belts, hotspot trails.
      - Corridors that are referenced in TS layers (sea lanes, island-hop, land open, river chains).
      - Climate swatches and paleo hydrology if you still value them.
    - **Drop / evolve** — e.g.:
      - Any legacy behavior that conflicts with current foundation policy, or which you consider “baggage”.
      - Specific swatch types or paleo patterns that you no longer want to support.
  - This should be recorded in the same parity matrix or in a companion section (“Deliberate Deletions”).

- **Step 3: Concrete tasks to close the gaps**

  These map directly onto your existing remediation/milestone structure, but in a more explicit “TS module” framing:

  - **Story tags core port (aligned with CIV‑21)**
    - Add `packages/mapgen-core/src/story/tagging.ts` and `story/corridors.ts` as TS ports of the JS logic, but:
      - Use `EngineAdapter` instead of direct `GameplayMap`/`TerrainBuilder` where possible.
      - Use `ExtendedMapContext` + climate buffers for rainfall operations (as the JS code already partially does via `ctx`).
      - Pull tunables from `getTunables()` (`FOUNDATION_CFG.story`, `CLIMATE_CFG.story`, `FOUNDATION_DIRECTIONALITY`) instead of reading globals.
    - Wire them into `MapOrchestrator` stages:
      - `storySeed`: call `storyTagContinentalMargins` and publish overlay + hydrate tags.
      - `storyHotspots`: call `storyTagHotspotTrails`.
      - `storyRifts`: call `storyTagRiftValleys`.
      - `storyOrogeny`: call `storyTagOrogenyBelts`.
      - `storySwatches`: call `storyTagClimateSwatches`, bridging climate buffers.
      - `storyPaleo`: call `storyTagPaleoHydrology` after rivers.
      - `storyCorridorsPre`/`storyCorridorsPost`: call corridor tagging passes.
    - Ensure these use `WorldModel` fields where intended (for rifts/orogeny and directionality).

  - **Corridors + overlays integration (CIV‑19/21 refinement)**
    - Map JS `CORRIDORS_CFG` into `FOUNDATION_CFG.corridors` (already supported by `tunables.ts`).
    - Migrate corridor style primitives and cache into TS, but keep them as immutable data structures typed via `StoryTags` metadata.
    - Confirm `coastlines.ts`, `islands.ts`, `features.ts`, `biomes.ts` use the corridor attributes as per the JS reference; adjust types as needed.

  - **Adapter boundary tightening (CIV‑15)**
    - Refactor `MapOrchestrator.resolveOrchestratorAdapter()` to remove direct global usage and instead:
      - Use `@civ7/adapter` (Civ7Adapter) for all engine calls: grid size, map size, `validateAndFixTerrain`, `recalculateAreas`, `stampContinents`, `storeWaterData`, `modelRivers`, `defineNamedRivers`, `generateLakes`, `expandCoasts`, `chooseStartSectors`, `needHumanNearEquator`.
      - Or move the lakes/coasts dynamic `require` logic into the Civ7 adapter package.
    - Add the grep-based CI check described in remediation to enforce that `/base-standard/...` imports only appear in `@civ7/adapter` (and perhaps mod entry files).

  - **Presets decision (CIV‑10/11/12/13)**
    - Either:
      - ~~Port `bootstrap/presets/classic.js` and `temperate.js` into TS under `mapgen-core/bootstrap/presets/*`, expose them via `MapConfig.presets`, and add one or two TS entries that use them; or~~
      - ~~Mark these presets in the parity matrix as “intentionally dropped” with a short rationale (e.g. “we only support the modern desert-mountains entry; older presets are archived for reference”).~~  
        **Update (2025-12-21, M4 planning):** Presets are removed; do not reintroduce preset resolution. Treat named variants as named recipes. See `../milestones/M4-target-architecture-cutover-legacy-cleanup.md`.
    - ~~Update `M-TS` milestone and CIV issues to reflect the decision so future work doesn’t assume these presets must come back.~~  
      **Update (2025-12-21, M4 planning):** Presets are removed; update docs to recipe+settings selection instead. See `../milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

  - **Story-aware climate passes (CIV‑18/19/21)**
    - Ensure that:
      - `applyClimateSwatches` is explicitly invoked by a story stage, with any future orogeny artifacts supplied via `MapGenContext` (no legacy `OrogenyCache` port).
      - Paleo hydrology modifications use `writeClimateField`/`syncClimateField` consistently (as in JS), but within TS story stages.
      - All rainfall adjustments are clamped `[0, 200]` and pulled from `CLIMATE_CFG.story`.
    - Add a small integration test around `refineClimateEarthlike` + story tags, using the mock adapter + synthetic tags to confirm behavior.

- **Step 4: Behavioral acceptance checklist (TS parity checkpoint)**

  Add a short checklist to `M1-TS-typescript-migration.md` (or a new “Remediation Done” section), something like:

  - [ ] For every JS module in `_archive/original-mod-swooper-maps-js`, we have:
    - [ ] a TS equivalent, OR
    - [ ] an explicit decision to drop/evolve it, recorded in `M-TS-parity-matrix.md`.
  - [ ] Story tags (hotspot, rift, orogeny belts, margins, corridors) are produced in TS and consumed by coasts/islands/climate/biomes/features.
  - [ ] `MapOrchestrator` uses adapters (no stray `GameplayMap`/`TerrainBuilder`/`require("/base-standard/...")` outside `@civ7/adapter`).
  - [ ] ~~At least one preset-based config is ported or explicitly dropped.~~  
    **Update (2025-12-21, M4 planning):** Presets are removed; ensure recipe+settings entries cover desired variants. See `../milestones/M4-target-architecture-cutover-legacy-cleanup.md`.
  - [ ] End-to-end in-game validation (CIV‑8) documented with screenshots/logs confirming coastal shapes, mountains, rainfall belts, biomes, features, starts vs the JS baseline.

At that point you can say: “Migration is fully done, and any differences from the JS version are intentional and documented.”

If you’d like, I can next:  
- Draft the parity matrix skeleton with concrete rows for each archive file, and/or  
- Propose the shape of `story/tagging.ts`/`story/corridors.ts` interfaces so they plug neatly into the existing `MapOrchestrator` and `StoryTags` types.
