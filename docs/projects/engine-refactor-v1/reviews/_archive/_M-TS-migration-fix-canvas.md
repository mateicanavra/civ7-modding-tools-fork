# M-TS: TypeScript Migration – Concern Canvas

Reorganization of the findings from `M-TS-typescript-migration-review.md`, cross-checked against the current TypeScript mapgen (`packages/mapgen-core/**`) and the original JS archive under `docs/projects/engine-refactor-v1/resources/_archive/original-mod-swooper-maps-js/`.

Legend (per item, implicit from section but called out where useful):
- **D** = Downstream side-effect (symptom of an upstream choice)
- **M** = Missing / incomplete implementation
- **A** = Core architectural problem / code smell
Status legend:
- `[DECIDED]` – Direction already chosen in existing plans/docs; execution may still be pending.
- `[TODO]` – Concrete fix or implementation required; overall approach is mostly known.
- `[OPEN]` – Design choice to discuss/confirm; not yet committed.

---

## Downstream side-effect issues (D)

These are primarily symptoms: they show up because stage enablement, adapters, or lifecycle are not wired correctly.

- **Entire stage pipeline effectively disabled (D, root cause in M/A) [TODO]**  
  - `bootstrap()` only writes `stageConfig` into `MapConfig`; `tunables.buildTunablesSnapshot()` only reads `config.stageManifest`.  
  - `tunables.STAGE_MANIFEST` therefore defaults to `{ order: [], stages: {} }`, and `stageEnabled(stage)` always returns `false`.  
  - `MapOrchestrator.generateMap()` gates every stage on `stageEnabled`, so the TS pipeline is *logically* present but *never executes* with the shipped `swooper-desert-mountains` config.

- **Story-driven behavior never triggers (D, rooted in missing story stages) [TODO]**  
  - `storySeed` stage in `MapOrchestrator` only calls `resetStoryTags()` and logs; there is no call into a ported `story/tagging` or `story/corridors` implementation.  
  - `StoryTags` collections for margins, hotspots, rifts, corridors, etc. remain empty during a run.  
  - Downstream layers (`coastlines`, `islands`, `climate-engine`, `biomes`, `features`) that are written to consume these tags run with no narrative signals.

- **Climate coastal/shallow modifiers neutralized (D, rooted in adapter design) [TODO]**  
  - In `layers/climate-engine.ts`, `resolveAdapter(ctx)` always supplies `isCoastalLand` and `isAdjacentToShallowWater` functions that just return `false`.  
  - Baseline/swatches then *check for the presence* of these methods and, seeing them defined, never fall back to local neighborhood scans.  
  - Result: coastal and shallow-water bonuses are effectively disabled; rainfall patterns lose the coastal gradients described in the original JS.

- **Biomes layer runs in “no-op” mode against the engine (D, rooted in adapter + call-site) [TODO]**  
  - `MapOrchestrator` calls `designateEnhancedBiomes(iWidth, iHeight)` without passing `ctx`, so `biomes.resolveAdapter` falls back to its dummy adapter.  
  - Even when `ctx` is provided, `BiomeAdapter` stubs `designateBiomes` and `setBiomeType` to no-ops and synthesizes biome globals instead of using engine state.  
  - Net effect: baseline biomes are *never* written back to the engine, and all climate/story-aware nudges operate on an isolated, synthetic view at best.

- **Feature placement logic largely inert (D, rooted in adapter surface and defaults) [TODO]**  
  - `FeaturesAdapter` in `layers/features.ts` stubs `addFeatures`, `getFeatureTypeIndex`, `getBiomeGlobal`, and `getNoFeatureConstant`; all return `() => {}` or `-1`.  
  - `runPlacement` correctly calls base-standard resource/snow/start-position generators, but `addDiverseFeatures` never actually invokes base-standard feature generation or resolves feature/biome IDs.  
  - Consequence: paradise reefs, volcanic forests/taiga, and density tweaks for rainforest/forest/taiga almost never fire, because feature indices and biome IDs are all `-1`.

- **State leakage across runs (D, rooted in lifecycle design) [OPEN][TODO]**  
  - `MapOrchestrator.generateMap()` calls `resetTunables()` but *not* `resetBootstrap()` or `WorldModel.reset()`.  
  - `bootstrap/runtime` and `WorldModel` both hold process-wide state; without coordinated resets, back-to-back runs can share configuration and world tensors.  
  - This undermines deterministic tests and can cause subtle differences between “first map this session” and subsequent maps.

- **Config toggle changes not reliably applied (D) [TODO]**  
  - `generateMap()` refreshes tunables but does not re-run a resolver that would re-derive presets, stage manifests, or derived toggles from the active runtime config.  
  - Changing presets or overrides between runs (e.g., via `bootstrap()`) may not take effect until a manual `resetConfig()` in user code.

- **CIV‑8 validation cannot detect regressions (D, blocked by upstream issues) [TODO]**  
  - With stages disabled and core adapters stubbed, CIV‑8’s intended E2E maps would either not generate at all or produce near-vanilla results.  
  - Because in-game validation steps were never actually executed, there is currently no empirical confirmation that the TS pipeline can produce a working map once stage gating is fixed.

---

## Missing or incomplete implementations (M)

These items represent functionality that existed or was planned in the JS design but is absent, stubbed, or only partially ported in TS.

### Bootstrap, presets, and stage manifest

- **Missing resolver for presets + map-size defaults + stage manifest (M, with downstream D and architectural A) [TODO][OPEN]**  
  - The original JS `bootstrap/resolved.js` composed `BASE_CONFIG` defaults, named presets, and runtime overrides; it also did `GameInfo.Maps.lookup(GameplayMap.getMapSize())` and normalized the `stageManifest`.  
  - TS `bootstrap` only stores a shallow `MapConfig` (`presets`, `stageConfig`, `overrides`) and leaves `stageManifest` and map-size lookup unimplemented.  
  - As a result, map-size-aware tuning, manifest-based dependency checks, and `[StageManifest]` / `[Foundation]` warnings are all missing.

- **StageConfig → StageManifest mapping not implemented (M, causes D) [TODO]**  
  - `BootstrapOptions.stageConfig` is accepted and stored, but no code turns those flags into `StageDescriptor` entries.  
  - The canonical manifest order and dependency graph that existed in `defaults/base.js` is not reconstructed in TS.

- **Entry map init still hard-coded (M) [TODO][OPEN]**  
  - `MapOrchestrator.requestMapData()` always uses `84×54` with ±80° latitudes and never consults `GameInfo.Maps` or presets for dimension/latitude defaults.  
  - The original JS orchestrator threaded map-size information from `GameInfo.Maps` into both bootstrapping and world initialization.

### Story system and narrative overlays

- **Story tagging and corridor generation not ported (M, causes D) [TODO]**  
  - `story/tagging.js` and `story/corridors.js` logic (margin imprinting, rift tagging, corridor graph construction) do not have TS equivalents.  
  - TS `story/tags.ts` and `story/overlays.ts` provide a solid registry and overlay API, but no TS stage populates them.  
  - Orchestrator stages for `storySeed`, `storyHotspots`, `storyRifts`, `storyOrogeny`, `storyPaleo`, and `storyCorridors*` are effectively placeholders.

### Adapter integration (biomes, features, placement, orchestrator)

- **Adapter-backed biome generator not wired (M) [TODO]**  
  - `BiomeAdapter` is designed to wrap an `EngineAdapter` plus biome-specific methods (biome globals, `designateBiomes`, `setBiomeType`).  
  - No production adapter bridges this to Civ7’s `/base-standard/maps/feature-biome-generator.js` or to `GameplayMap`/`TerrainBuilder` biome APIs.  
  - Without this adapter, the biome layer cannot honor vanilla constraints or reuse Civ7’s core biome assignments.

- **Adapter-backed feature generator not wired (M) [TODO]**  
  - Similarly, `FeaturesAdapter` expects feature indices, biome globals, and a “no feature” constant, but no adapter implementation populates these from Civ7 (`GameInfo.Features`, `FeatureTypes`, etc.).  
  - `@civ7/adapter` does not expose higher-level biome/feature surfaces yet; `EngineAdapter` stops at terrain/elevation/rainfall.

- **Production Civ7 adapter unused in orchestrator (M/A) [DECIDED][TODO]**  
  - `MapOrchestrator.createLayerAdapter()` tries to `require("./core/adapters.js")`, which does not exist, then falls back to a globals-based adapter.  
  - `Civ7Adapter` from `@civ7/adapter/civ7` is never instantiated for real runs; `MockAdapter` is only used in tests.  
  - All the effort in CIV‑2 to isolate `/base-standard/...` into `@civ7/adapter` is not leveraged by the orchestrator.

- **Placement layer bypasses adapter completely (M/A) [DECIDED][TODO]**  
  - `layers/placement.ts` imports six `/base-standard/...` modules directly and also reaches out to `TerrainBuilder` and `FertilityBuilder` globals, rather than going through a placement-aware adapter surface.  
  - This duplicates engine coupling that was supposed to be centralized and makes the placement layer hard to test outside the game.

### World / Voronoi and config mapping

- **Voronoi fidelity and adapter not finalized (M/A) [OPEN]**  
  - `world/plates.ts` uses `DefaultVoronoiUtils`, which returns trivial cells with empty half-edges and constant areas; it never calls Civ7’s Voronoi or kd-tree utilities.  
  - The design leaves room for a `VoronoiUtilsInterface` but does not ship a Civ7-backed implementation or make an explicit “independent vs adapter” decision.

- **Mapping between bootstrap foundation config and world config not explicit (M/A) [OPEN][TODO]**  
  - TS defines `FoundationPlatesConfig` / `FoundationDynamicsConfig` / `FoundationDirectionalityConfig` and also `PlateConfig` / `DirectionalityConfig` in `world/types.ts`.  
  - There is no dedicated translator (e.g., `foundationPlatesToPlateConfig`), and `WorldModel.setConfigProvider` is never clearly wired from bootstrap.  
  - This makes it ambiguous which config shape is canonical and where world config should be derived from.

### Tests, tooling, and type surface

- **WorldModel lifecycle tests missing (M) [TODO]**  
  - CIV‑5 adds rich tests for `computePlatesVoronoi`, `calculateVoronoiCells`, and `PlateSeedManager`, but no focused tests for `WorldModel.init/reset/config provider`.  
  - Behavior such as dimension inference, plateSeed snapshot publishing, and idempotent `init()` is only exercised indirectly.

- **No integration tests for orchestrator + stages (M) [TODO]**  
  - There is no test that runs `bootstrap({ stageConfig })` followed by `new MapOrchestrator().generateMap()` with a mock adapter to assert which stages executed.  
  - This allowed the “all stages disabled” regression and the missing adapter wiring to land unnoticed.

- **No tests for climate/biomes/features behavior (M) [TODO]**  
  - CIV‑12 adds substantial TS logic but no unit tests for climate bands, swatches, refinement, biome nudges, or feature placement.  
  - As a result, subtle changes (e.g., adapter stubs) are not caught by automated tests.

- **Adapter-boundary enforcement script not implemented (M/A) [DECIDED][TODO]**  
  - CIV‑2 calls for a simple check that `/base-standard/...` imports only appear under `packages/civ7-adapter/**`.  
  - No such script exists; current grep reveals violations in `MapOrchestrator.ts` and `layers/placement.ts`.

- **Type coverage gaps in `@civ7/types` (M, future-facing) [TODO]**  
  - `Players` is under-typed compared to actual JS usage; several helpers (`getAlive*`, `isHuman`, etc.) are missing.  
  - `GameInfoTable.lookup` returns `T | null` (correct but stricter than JS usage), and some other globals have narrow surfaces.  
  - This is not a current runtime bug but will cause friction as more of the JS mod is migrated.

---

## Core architectural problems / code smells (A)

These shape how hard it is to finish the migration cleanly and how much debt we carry into future refactors.

### Adapter and engine boundary

- **Adapter boundary violations in core (A, causing M/D elsewhere) [DECIDED][TODO]**  
  - `MapOrchestrator.resolveOrchestratorAdapter()` dynamically `require`s `/base-standard/maps/...` modules and reaches directly into `GameplayMap`, `TerrainBuilder`, `AreaBuilder`, and `engine`.  
  - `layers/placement.ts` statically imports multiple `/base-standard/...` modules.  
  - This breaks the “single adapter owns all Civ7 imports” decision and makes `@swooper/mapgen-core` harder to test or reuse outside Civ7.

- **Adapter surface mismatch vs. layer needs (A, leads to stubs and workarounds) [OPEN][TODO]**  
  - `EngineAdapter` focuses on terrain/elevation/rainfall and a few RNG helpers; layers now want:  
    - Biome reads/writes and globals (`getBiomeType`, `setBiomeType`, `getBiomeGlobals`).  
    - Feature indices, “no feature” sentinel, and `addFeatures`.  
    - Placement helpers (floodplains, fertility, natural wonders, resources, discoveries).  
  - Without a layered or extended adapter strategy, layers either reach for globals or stub these methods, leading directly to the missing implementations described above.

### Config ownership and world model coupling

- **WorldModel treated as a global singleton (A) [OPEN][TODO]**  
  - Layers (`landmass-plate`, `coastlines`, `mountains`, `volcanoes`, `landmass-utils`, some climate code) import `WorldModel` directly instead of flowing through `ctx.worldModel`/`FoundationContext`.  
  - This tightens coupling to a single concrete world implementation and complicates testing alternative world snapshots or future multi-world scenarios.

- **Unclear ownership of world config provider (A) [OPEN]**  
  - `WorldModel` exposes `setConfigProvider` / `getConfig()`, while bootstrap manages `MapConfig` and foundation config via `runtime` + `tunables`.  
  - It is not explicit whether bootstrap should push a provider into `WorldModel`, or whether `WorldModel` should own its own config and treat bootstrap as an overlay.  
  - This ambiguity makes it easy for world config and bootstrap config to drift when presets/overrides change.

- **Config shape duplication between bootstrap and world (A) [OPEN][TODO]**  
  - Separate but similar types for plates/directionality in `bootstrap/types.ts` and `world/types.ts` create parallel configuration paths.  
  - Without a single mapping boundary, future changes to plate or directionality parameters risk divergence between bootstrap and world logic.

### Lifecycle, reset semantics, and manifest

- **Lifecycle/reset responsibilities scattered (A, leading to D) [OPEN][TODO]**  
  - Per-map lifecycle spans `bootstrap/runtime`, `bootstrap/tunables`, `WorldModel`, and `MapOrchestrator`.  
  - There is no single “generation session” abstraction that defines the correct sequence of `reset → bootstrap → rebind → init world → run stages`.  
  - This makes it unclear who is responsible for ensuring clean state between runs (mod entry vs. orchestrator vs. tests).

- **Stage manifest design present but hollow (A) [OPEN][TODO]**  
  - Types for `StageManifest` / `StageDescriptor` exist, and the JS version had a robust `normalizeStageManifest`/`deriveStageOverrideWarnings` pipeline.  
  - TS `tunables` simply trusts any `config.stageManifest` it finds and never evaluates dependencies, derives `legacyToggles`, or emits `[StageManifest]` warnings.  
  - As a result, the manifest is not actually used to protect layers from invalid dependency graphs or disabled prerequisites.

### Terrain, constants, and cross-layer contracts

- **Magic terrain IDs duplicated across layers (A) [TODO]**  
  - Terrain constants (`OCEAN_TERRAIN`, `COAST_TERRAIN`, `FLAT_TERRAIN`, `HILL_TERRAIN`, `MOUNTAIN_TERRAIN`, etc.) are re-declared in multiple files (`landmass-plate`, `coastlines`, `islands`, `mountains`, `volcanoes`, `landmass-utils`).  
  - Centralizing these in a shared `core/constants` module (or in `@civ7/types` if appropriate) would reduce drift and make refactors safer.

- **Defensive adapter fallbacks can hide configuration errors (A) [OPEN][TODO]**  
  - Patterns like “if ctx exists use buffers, else fall back to adapter, else do nothing” appear in several layers.  
  - While pragmatic, they can make it hard to notice when a stage is running with an incomplete `ExtendedMapContext` or missing buffers.

### Voronoi strategy and long-term alignment with Civ7

- **Unsettled Voronoi strategy (A) [OPEN]**  
  - TS world logic is self-contained and testable (good), but diverges in fidelity from the Civ7 Voronoi/kd-tree stack referenced in earlier design docs.  
  - Without a clear decision, there is a risk of “partial parity” where plates behave differently than in the base game but are still assumed to be equivalent in documentation and tuning.

### Tooling, tests, and acceptance criteria

- **Narrow acceptance criteria for CIV‑7 and CIV‑8 (A) [OPEN][TODO]**  
  - Gate C primarily checks that TypeScript compiles, builds, and replaces JS sources; it does not require functional correctness or in-game validation.  
  - Combined with the lack of integration tests, this allowed the disabled stage pipeline and unused adapter to slip through Gate C and block Gate B/D style validation.

---

## How this frames port vs. refactor decisions

Using the classifications above, the near-term strategy can be framed as:

- **“Implement as-is first” (port now, refactor later)**  
  - Map the old JS behavior into TS for blocking correctness gaps, even if the architecture is not ideal:  
    - Implement a minimal but faithful resolver (`bootstrap/resolved` equivalent) that composes defaults, presets, overrides, and produces a normalized `stageManifest`.  
    - Wire `stageConfig` → `stageManifest.stages` so `stageEnabled()` reflects intended stage choices.  
    - Bridge biomes and features through a concrete adapter (or thin wrappers) that actually call Civ7’s base-standard generators and lookups.  
    - Use `@civ7/adapter/civ7` in `MapOrchestrator.createLayerAdapter()` and keep globals-only fallbacks for test/dev only.  
    - Port story tagging/corridor passes closely from JS so `StoryTags` and overlays exist again.

- **“Refactor during migration” (simplify now where risk is low)**  
  - Areas where the TS design can be improved *while* porting behavior without adding too much risk:  
    - Introduce a clear adapter layering strategy (core `EngineAdapter` + optional biome/feature/placement extensions) and align layers on it.  
    - Centralize terrain IDs and other cross-layer constants.  
    - Replace direct `WorldModel` singleton imports with consumption via `ctx.worldModel`/`FoundationContext` where practical, so tests can swap world snapshots.  
    - Clarify the world config mapping boundary by adding explicit translation helpers and documenting which config shape is canonical.

- **“Refactor later, once parity is proven”**  
  - Larger architectural moves that should wait until the TS pipeline is producing correct maps and has basic E2E coverage:  
    - Deciding whether Voronoi should remain self-contained TS or be backed by Civ7’s utilities via an adapter.  
    - Introducing a “generation session” abstraction that owns all lifecycle/reset semantics.  
    - Tightening acceptance criteria for future gates to require both compile-time and runtime validation.

The immediate next step after this canvas should be to pick a *small* set of P0 items—primarily stage manifest wiring, adapter usage, and story tagging reactivation—and treat them as “port behavior faithfully,” while keeping an eye on the adapter/interface and lifecycle simplifications that can ride along without derailing migration velocity.
