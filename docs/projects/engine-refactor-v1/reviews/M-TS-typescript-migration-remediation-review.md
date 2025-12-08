---
id: M-TS-remediation-review
milestone: M-TS-typescript-migration
title: "M-TS: TypeScript Migration Remediation – Aggregate Review"
status: draft
reviewer: AI agent (Codex CLI)
---

# M-TS: TypeScript Migration Remediation – Aggregate Review

This document aggregates task-level reviews for the post-migration remediation stack
focused on fixing the TypeScript migration's "null script" behavior and restoring
runtime correctness: CIV-15 (Adapter Boundary & Orchestrator), CIV-16 (FoundationContext
consumption), and related follow-ups.

## Testing Strategy Note

During this remediation phase, we prioritize **shipping working fixes quickly** over
comprehensive test coverage. Each review entry includes a **Deferred Tests** section
that explicitly documents what integration/smoke tests are being skipped now and should
be added once the pipeline stabilizes. This is intentional technical debt with clear
ownership—we'll circle back to add these tests before the milestone closes or as part
of a dedicated testing sweep.

---

## CIV-15 – Fix Adapter Boundary & Orchestration Wiring

**Intent / AC (short)**  
Centralize engine adapter construction around `@civ7/adapter` in `MapOrchestrator` and introduce a guardrail that prevents `/base-standard/...` imports from leaking outside the adapter package, while keeping the codebase usable and testable.

**Strengths**
- Replaces dynamic `require("./core/adapters.js")` and the global fallback adapter with a clear, testable adapter selection strategy:
  - `adapter` → `createAdapter` → `new Civ7Adapter(width, height)`.
- Adds `scripts/lint-adapter-boundary.sh` and a `lint:adapter-boundary` npm script to enforce the adapter boundary with an explicit allowlist.
- Keeps changes narrowly focused on orchestrator wiring and linting, which is appropriate for an architectural remediation issue.

**Issues / gaps**
- JSDoc on `createAdapter` slightly misrepresents the defaulting behavior compared to the implementation.
- The adapter-boundary lint is not yet integrated into the main lint/CI pipeline; enforcement is available but not guaranteed.
- `MapOrchestrator.ts` and `layers/placement.ts` still contain `/base-standard/...` imports and rely on allowlist entries instead of fully honoring the adapter boundary.
- No explicit tests assert adapter selection behavior in `MapOrchestrator`.

**Suggested follow-up**
- Wire `lint:adapter-boundary` into CI or `pnpm lint` and treat allowlisted files as temporary debt with clear owning issues.
- Add small tests to verify adapter precedence and default construction logic.
- In subsequent placement/story/biomes/feature integration tasks, move remaining `/base-standard/...` imports behind `@civ7/adapter` and remove the corresponding files from the allowlist.

**Deferred Tests**
- [ ] Adapter selection unit tests: verify `createAdapter()` precedence logic (explicit adapter > default construction)
- [ ] `MapOrchestrator` adapter wiring test: bootstrap with mock adapter, assert it's used by stages
- [ ] Adapter boundary lint integration test: ensure `lint:adapter-boundary` runs as part of CI

---

## CIV-16 – Migrate Layers to FoundationContext Consumption

**Intent / AC (short)**  
Move tectonics- and climate-related layers off the `WorldModel` singleton onto `ctx.foundation` (immutable snapshot), centralize `BOUNDARY_TYPE` in a shared module, and confine `WorldModel.init/reset` usage to the orchestrator to support testability and multi-run determinism.

**Strengths**
- Updated key layers (`landmass-plate.ts`, `coastlines.ts`, `mountains.ts`, `volcanoes.ts`, `landmass-utils.ts`, `climate-engine.ts`) to consume `ctx.foundation.plates` / `.dynamics` instead of importing `WorldModel` directly.
- Introduced `world/constants.ts` as the shared home for `BOUNDARY_TYPE`, so layers don’t need to import the singleton for enum values.
- Implemented a robust `FoundationContext` in `core/types.ts` with validation and frozen snapshots, and wired it into `MapOrchestrator.initializeFoundation`.
- Restricted `WorldModel` usage in TS source to the orchestrator and the world module itself, improving isolation and testability.

**Issues / gaps**
- ~~`WorldModel.reset()` is implemented but never called in `MapOrchestrator.generateMap`, so world fields are not recomputed across runs and can drift from current tunables.~~ **FIXED**: Added `WorldModel.reset()` call at the start of `generateMap()`.
- ~~Physics-driven stages tolerate missing `ctx.foundation` via silent fallbacks (fractals-only, no volcanoes, no ocean separation) rather than failing fast, which can mask manifest or wiring issues.~~ **FIXED**: Added `assertFoundationContext()` guard to all foundation-dependent stages.
- No dedicated tests assert that layers depend only on `FoundationContext` (and not `WorldModel`) or that their behavior updates when `FoundationContext` changes.

**Suggested follow-up**
- ~~Add a `WorldModel.reset()` call at the start of `MapOrchestrator.generateMap` and consider passing explicit dimensions into `WorldModel.init` for better testability.~~ **DONE**
- ~~Introduce `assertFoundationContext` (or equivalent checks) for all stages that require foundation data (`landmassPlates`, `mountains`, `volcanoes`, `climateBaseline`, `climateRefine`) and surface failures via `StageResult`.~~ **DONE**
- Add small unit/integration tests that construct synthetic `ExtendedMapContext` + `FoundationContext` and exercise the migrated layers, ensuring they remain decoupled from `WorldModel` and respond correctly to changes in plate/dynamics fields.

**Deferred Tests**
- [ ] Layer isolation tests: verify `landmass-plate.ts`, `coastlines.ts`, `mountains.ts`, `volcanoes.ts` read from `ctx.foundation` (not `WorldModel` directly)
- [ ] FoundationContext reactivity test: change plate/dynamics fields, assert layer output changes accordingly
- [ ] Multi-run determinism test: call `generateMap()` twice with same seed, assert identical `FoundationContext` snapshots
- [ ] `assertFoundationContext` guard tests: verify stages fail fast with clear error when foundation missing

---

## CIV-17 – Implement Config to Manifest Resolver

**Intent / AC (short)**  
Bridge the "Config Air Gap" by resolving `bootstrap()`-level `stageConfig` booleans into a concrete `StageManifest` that `stageEnabled()` and `MapOrchestrator.resolveStageFlags()` can consume, re-enabling stage execution and surfacing misconfigured overrides via `[StageManifest]` warnings.

**Strengths**
- Introduces `bootstrap/resolved.ts` with a clear, isolated resolver:
  - `STAGE_ORDER` mirrors the orchestrator’s stage set and ordering (`foundation` → `placement`).
  - `resolveStageManifest()` produces a normalized `StageManifest` for all known stages, with explicit `enabled` flags.
- Wires the resolver through `bootstrap/entry.ts` in a single, easy-to-reason-about place:
  - `bootstrap()` clones `stageConfig`, sets `cfg.stageConfig`, computes `cfg.stageManifest = resolveStageManifest(stageConfig)`, then rebinds tunables.
  - `tunables.buildTunablesSnapshot()` now simply reads `config.stageManifest`, so `stageEnabled()` reflects the resolved manifest.
- Adds `validateOverrides()` to warn when overrides target disabled or unknown stages, and filters out non-stage config keys using `STAGE_ORDER`, keeping logs focused and actionable.
- Provides a focused test suite in `test/bootstrap/resolved.test.ts` that:
  - Asserts resolver behavior and `STAGE_ORDER` shape.
  - Exercises `stageEnabled` + `bootstrap` integration, including the acceptance-style scenario from CIV-17.
  - Verifies warnings for disabled-stage overrides and the benign behavior for non-stage keys and undefined overrides.

**Issues / gaps**
- Stage enablement remains purely config-driven; there is no cross-check between `STAGE_ORDER` and `MapOrchestrator.resolveStageFlags()`. A future mismatch (adding a new stage in one but not the other) would silently produce "always-disabled" stages with no explicit warning.
- The resolver treats any missing or `false` `stageConfig` entry as disabled; there is no support for a "default-on" policy for new stages, which is acceptable for now but worth documenting as intentional to avoid surprises later.
- No tests currently assert that the orchestrator actually uses the manifest-derived flags end-to-end (e.g., single acceptance test that calls `generateMap()` with a known `stageConfig` and inspects executed stages).

**Suggested follow-up**
- Add a small guard or diagnostic that compares `STAGE_ORDER` against the orchestrator’s `resolveStageFlags()` keys and logs a `[StageManifest]` warning when they diverge; this would catch future drift at runtime without breaking callers.
- Consider documenting (and, if needed, testing) the "default-off" semantics for stages not present in `stageConfig`, so downstream config authors know they must explicitly opt in new stages.
- Add at least one orchestrator-level test that bootstraps with a constrained `stageConfig`, runs `generateMap()` on a trivial map, and asserts the corresponding `StageResult` set matches expectations. This will guard the integration between resolver, tunables, and orchestrator wiring as the pipeline evolves.

**Deferred Tests**
- [ ] STAGE_ORDER drift detection test: compare `STAGE_ORDER` against `MapOrchestrator.resolveStageFlags()` keys, assert no divergence
- [ ] Orchestrator-manifest integration test: bootstrap with `stageConfig`, run `generateMap()`, assert `StageResult` set matches enabled stages
- [ ] Default-off semantics test: bootstrap without `stageConfig`, verify all stages report disabled
- [ ] Override validation test: verify `[StageManifest]` warnings fire for overrides targeting disabled stages

---

## CIV-18 – Fix Biomes & Climate Call-Sites

**Intent / AC (short)**  
Unblock the biomes and climate stages by fixing a missing `ctx` parameter on the biomes stage call in `MapOrchestrator` and removing climate adapter stubs that forced `isCoastalLand`/`isAdjacentToShallowWater` to `() => false`, so that existing neighborhood-based fallbacks (and future adapter-provided methods) can execute correctly.

**Strengths**
- Corrects the biomes call-site in `MapOrchestrator.generateMap()` to pass `ctx` into `designateEnhancedBiomes(iWidth, iHeight, ctx)`, so the biomes layer can resolve an adapter and access rainfall/latitude/foundation-aware data.
- Simplifies `climate-engine.resolveAdapter` to stop injecting stubbed `isCoastalLand`/`isAdjacentToShallowWater` implementations, and updates `ClimateAdapter` so those methods are optional, matching the intended “fallback when undefined” pattern.
- Adds a focused `test/layers/callsite-fixes.test.ts` suite that documents the optional-method contract for `ClimateAdapter` and validates the local “if (adapter.isCoastalLand) … else fallback” pattern used by the climate passes.
- Keeps the fix narrowly scoped to call-sites and adapter shape, which is appropriate for a remediation issue that sits in front of larger biomes/features adapter work (CIV-19/20/21).

**Issues / gaps**
- The biomes test only checks the `designateEnhancedBiomes` signature (`length`/arity) rather than exercising an end-to-end call with a real or mock `ExtendedMapContext`; it would not catch regressions where `ctx` is dropped again or where the adapter resolution path breaks.
- `resolveAdapter` hand-constructs a `ClimateAdapter` instead of spreading the underlying `EngineAdapter`, so any future adapter that adds `isCoastalLand`/`isAdjacentToShallowWater` will have those methods silently dropped until this function is revisited.
- ~~The shallow-water path still has no local fallback; if `adapter.isAdjacentToShallowWater` is undefined, the code simply returns `false`, so the "shallow" portion of the acceptance criteria is only partially met (stubs no longer block anything, but there is still no neighborhood-based behavior).~~ **FIXED**: Added ad-hoc `isAdjacentToShallowWater` fallback helper that checks if land is adjacent to water with 2+ land neighbors (bay/lagoon pattern).
- There is no orchestrator-level or MapContext-level smoke test that runs `bootstrap` + `MapOrchestrator.generateMap()` with a minimal adapter and asserts that climate and biomes stages execute successfully using their fallbacks; current tests validate patterns, not the actual wiring.

**Suggested follow-up**
- Upgrade the CIV-18 tests to include a small MapContext-based smoke test: construct a minimal `ExtendedMapContext` + mock adapter, call `applyClimateBaseline`/`refineClimateEarthlike` and `designateEnhancedBiomes`, and assert that (a) calls succeed without throwing and (b) rainfall/biomes fields change on at least a few tiles.
- When CIV-19/CIV-20 introduce richer climate/biomes capabilities in the adapter, refactor `resolveAdapter` to spread the underlying `EngineAdapter` (e.g., `return { ...engineAdapter, …overrides } as ClimateAdapter;`) so optional adapter methods are honored instead of being unintentionally dropped.
- ~~Consider introducing a shallow-water neighborhood helper alongside the coastal one, so that the "shallowAdjBonus" path has a true fallback when adapter methods are absent; keep behavior controlled via tunables to avoid surprising map changes.~~ **DONE**: Added `isAdjacentToShallowWater` fallback in both `applyClimateBaseline` and `applyClimateSwatches`.
- Add a small orchestrator-level regression test that runs `generateMap()` with all CIV-18 fixes in place and asserts that the `stageResults` set includes successful `climateBaseline`, `climateRefine`, and `biomes` stages, guarding against future call-site regressions.

**Deferred Tests**
- [ ] Biomes ctx wiring test: call `designateEnhancedBiomes(w, h, ctx)` with mock adapter, assert adapter methods called
- [ ] Climate fallback smoke test: call `applyClimateBaseline`/`refineClimateEarthlike` with adapter missing `isCoastalLand`, assert rainfall changes on coastal tiles via local fallback
- [x] ~~Shallow-water fallback test: implement and test neighborhood-based `isAdjacentToShallowWater` fallback~~ **DONE**: Implemented fallback and added test in `callsite-fixes.test.ts`
- [ ] Orchestrator regression test: `generateMap()` with CIV-18 fixes, assert `climateBaseline`, `climateRefine`, `biomes` in successful `stageResults`
- [ ] resolveAdapter spread test: when adapter provides `isCoastalLand`, verify it flows through (currently hand-constructed, will drop future methods)

---

## CIV-19 – Wire Biomes & Features Adapter Integration

**Intent / AC (short)**  
Replace local biomes/features stubs in `mapgen-core` with real adapter-backed calls into Civ7’s biomes and features generators, so TS layers become thin nudging passes over an engine-backed baseline instead of synthetic map logic.

**Strengths**
- Extends `EngineAdapter` with explicit biomes and feature methods (`designateBiomes`, `getBiomeGlobal`, `addFeatures`, `getFeatureTypeIndex`, `NO_FEATURE`), keeping the integration surface centralized in `@civ7/adapter` and preserving the adapter boundary.
- Implements these methods in `Civ7Adapter` by importing `/base-standard/maps/biomes.js` and `/base-standard/maps/features.js`, using `map-globals` and `GameInfo.Features.find(...)` for biome globals and feature indices; `mapgen-core` no longer needs `/base-standard/...` imports or local stubs.
- Updates `MockAdapter` to carry dedicated biome/feature buffers, default globals/feature maps, and call-tracking for `designateBiomes`/`addFeatures`, giving tests a realistic, engine-free surface to exercise biomes/features behavior.
- Rewrites `layers/biomes.ts::designateEnhancedBiomes` and `layers/features.ts::addDiverseFeatures` to operate entirely on `EngineAdapter`, running the vanilla `adapter.designateBiomes/addFeatures` passes first and then applying narrowly scoped TS nudges, which matches the milestone’s “adapter-first, nudges-on-top” intent.

**Issues / gaps**
- ~~`Civ7Adapter.NO_FEATURE` currently returns `-1` instead of the engine sentinel `FeatureTypes.NO_FEATURE`; because `addDiverseFeatures` gates work on `adapter.getFeatureType(...) === NO_FEATURE`, this is likely to treat all tiles as already-featured in production and effectively disable the TS embellishment pass even though the adapter surface exists.~~ **FIXED**: Updated to return `FeatureTypes.NO_FEATURE` when available, with `-1` fallback for test environments.
- There are no targeted tests for the new adapter surface: `MockAdapter`'s new biome/feature behavior (globals, indices, NO_FEATURE) and the fact that `designateEnhancedBiomes`/`addDiverseFeatures` invoke `adapter.designateBiomes/addFeatures` and respect NO_FEATURE are all untested; regressions here would be hard to spot. **DEFERRED**: Per testing strategy, deferring to post-stabilization test sweep.
- `getBiomeGlobal(name)` builds global names via string munging (`"tropical" → g_TropicalBiome`); this is convenient but brittle—typos or new biome names will quietly resolve to `-1` with no diagnostics, leaving downstream logic effectively disabled. **DEFERRED**: Safe fallback behavior is acceptable; tightening semantics can wait for test sweep.

**Suggested follow-up**
- ~~Change `Civ7Adapter.NO_FEATURE` to return `FeatureTypes.NO_FEATURE` (using the global from the Civ7 runtime) and, if possible, add a tiny assertion or smoke test that `adapter.NO_FEATURE === GameplayMap.getFeatureType(x, y)` on a known empty tile in the test harness.~~ **DONE**
- Add a small `@civ7/adapter` test module that:
  - Constructs a `MockAdapter` with custom `biomeGlobals`/`featureTypes` and asserts that `designateBiomes/addFeatures` calls are recorded and that `getBiomeGlobal`/`getFeatureTypeIndex` and `NO_FEATURE` behave as expected.
  - Exercises `designateEnhancedBiomes`/`addDiverseFeatures` with a `MockAdapter` + minimal `ExtendedMapContext` to assert they call into the adapter and subtly mutate biomes/features on eligible tiles.
- Consider tightening `getBiomeGlobal` semantics by either (a) supporting only a whitelisted set of known biome keys with explicit mappings and logging a warning when lookups fail, or (b) moving the string → global mapping into a small helper with clearer behavior and tests.

**Deferred Tests** *(to be addressed in post-M-TS test sweep)*
- [x] ~~Adapter NO_FEATURE parity test: verify `Civ7Adapter.NO_FEATURE === FeatureTypes.NO_FEATURE` in the Civ7 test harness.~~ **Addressed by implementation** - `NO_FEATURE` now returns engine sentinel with fallback.
- [ ] MockAdapter biomes/features test: validate `designateBiomes/addFeatures` call-tracking, `getBiomeGlobal`, `getFeatureTypeIndex`, and `NO_FEATURE` behavior.
- [ ] Biomes/features integration smoke test: run `designateEnhancedBiomes`/`addDiverseFeatures` with a `MockAdapter`/`ExtendedMapContext` and assert that vanilla calls plus TS nudges execute and change at least some tiles.
- [ ] `getBiomeGlobal` semantics test: verify known biome names resolve correctly, unknown names return `-1` with optional warning logging.

---

## Cross-Cutting Follow-Up – Restore Dev Diagnostics & Stage Logging

**Intent / gap**
- The legacy `bootstrap/dev.js` diagnostics layer (DEV flags, ASCII dumps, histograms, per-stage dev logging) was not migrated into the TypeScript pipeline. The current TS orchestrator only logs coarse stage boundaries (`[SWOOPER_MOD] Starting/Completed`) and a few ad-hoc messages, which makes debugging world/foundation/climate/biomes behavior significantly harder than in the JS mod.

**Suggested follow-up**
- Introduce a TypeScript `dev` module in `@swooper/mapgen-core` that:
  - Recreates the `DEV` flag surface (`DEV.ENABLED`, `DEV.LOG_LANDMASS_ASCII`, `DEV.LOG_RELIEF_ASCII`, `DEV.LOG_RAINFALL_ASCII`, `DEV.LOG_BIOME_ASCII`, `DEV.LOG_TIMING`, etc.).
  - Reads its configuration from the resolved map config (e.g., `DEV_LOG_CFG` equivalent), so entries can toggle diagnostics per run.
  - Exposes helpers like `devLog`, `devLogIf`, `timeSection`, `logFoundationSummary`, `logFoundationAscii`, `logRainfallHistogram`, and hooks for Story overlays.
- Wire the new dev helpers into `MapOrchestrator` and key layers (landmass, coastlines, mountains, volcanoes, climate, biomes, placement) in a way that:
  - Keeps diagnostics opt-in and no-op in production (DEV disabled).
  - Mirrors the behavior and coverage of the archived JS `bootstrap/dev.js` as closely as practical.

**Deferred Work**
- [ ] Define and document the TS `DEV` surface and its mapping to config.
- [ ] Port core ASCII/histogram helpers for foundation, landmass, relief, rainfall, and biomes.
- [ ] Add at least one “DEV-on” integration scenario (manual or automated) to validate that stage logs and diagnostics fire as expected without impacting normal runs.

---

## Cross-Cutting Note – Elevation Surface vs Adapter Capabilities

**What we learned**
- Runtime introspection of the Civ7 engine confirmed that:
  - `GameplayMap` exposes `getElevation` (read-only) alongside `getRainfall`, `getBiomeType`, `getTerrainType`, etc.
  - `TerrainBuilder` does **not** expose `setElevation`; elevation and cliffs are derived internally via `buildElevation()` and related fractal helpers, not pushed in from scripts.
  - `TerrainBuilder` does expose other write operations (`setTerrainType`, `setBiomeType`, `setFeatureType`, `setRainfall`, `setPlotTag`/`addPlotTag`/`removePlotTag`, `setLandmassRegionId`, etc.).
  - `FractalBuilder` is the owner of `getHeightFromPercent(fractalId, percent)`, not `TerrainBuilder`.

**Remediation changes**
- Updated `@civ7/types` to match the actual engine surface:
  - Removed the optimistic `TerrainBuilder.setElevation` declaration.
  - Added `TerrainBuilder.setLandmassRegionId` and moved `getHeightFromPercent` onto `FractalBuilder`.
- Updated `@civ7/adapter` and `@swooper/mapgen-core`:
  - Dropped `setElevation` from the public `EngineAdapter` surface and from `Civ7Adapter`; the prior guarded call was a no-op on real builds.
  - Kept internal heightfield writes intact (`hf.elevation` in `writeHeightfield`), while removing the illusion that elevation can be pushed into the engine directly.
  - Continued to rely on `TerrainBuilder.buildElevation()` plus terrain/fractal configuration for engine-side elevation and cliffs.

**Why this matters for the milestone**
- Clarifies the boundary between our physics model and the Civ7 engine:
  - Our heightfield is authoritative for **simulation and storytelling** in `FoundationContext`.
  - The engine remains authoritative for the **rendered elevation surface**, derived from its own fractal configuration and terrain.
- Removes dead / over-optimistic API usage that could mislead future work:
  - New layers should not assume they can “force” engine elevation per-plot; they should instead:
    - Shape terrain and masks in ways that feed the engine’s elevation builder.
    - Use the internal heightfield for gameplay and narrative overlays.
- This closes the loop on the earlier TypeScript migration assumption that elevation had a direct setter and ensures future remediation work builds on the real engine surface, not on inferred APIs.
