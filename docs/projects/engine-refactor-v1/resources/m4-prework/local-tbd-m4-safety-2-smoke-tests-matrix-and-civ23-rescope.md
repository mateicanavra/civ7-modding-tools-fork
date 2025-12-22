# Prework — `LOCAL-TBD-M4-SAFETY-2` (Smoke test plan + stub adapter requirements + CIV‑23 rescope)

Goal: define a minimal compile/execute smoke-test matrix and the stub adapter capabilities needed to run the default pipeline deterministically, and capture how CIV‑23 should be re-scoped to the new `RunRequest`/`ExecutionPlan` boundary.

## 1) Smoke-test matrix (CI)

Focus: light, deterministic, engine-free guardrails that catch “pipeline didn’t actually run” and “contract enforcement regressed” failures.

### A) Compile smoke (ExecutionPlan compilation)

Input:
- Standard recipe + settings (RunRequest)
- Registry with standard steps

Assertions (minimal):
- Plan compilation succeeds and produces:
  - normalized recipe (per-occurrence step IDs)
  - `planFingerprint` (deterministic; see below)
- Compile-time failures are **structured and fail-fast** for:
  - unknown step IDs
  - invalid tag IDs / unknown tags in requires/provides
  - missing required tags that are knowable at compile time (after registry resolution)

Anti-regression coverage:
- Standard compile path should not depend on legacy `STAGE_ORDER`/`stageManifest` once cutover is complete (assert by exercising only the new entrypoints).

### B) Execute smoke (plan execution with stub adapter)

Input:
- Compiled `ExecutionPlan`
- Stub adapter (`createMockAdapter`) and deterministic config/seed

Assertions (minimal):
- Executes plan successfully (all nodes succeed) for the default recipe.
- Emits required run/step events when tracing enabled (runId + planFingerprint + step timings).
- Contract failures are loud:
  - simulate an `effect:*` verifier failure and assert the run stops with a clear error mentioning the effect tag.

Forward-looking assertions (enable once prerequisites land):
- Narrative: execution does not require StoryTags for correctness (after NARRATIVE cleanup).
- No `state:engine.*` dependencies in the default plan (after Effects Verification + cleanup).

## 2) Stub adapter capability list (what the smoke path needs)

Recommendation: use `createMockAdapter` from `@civ7/adapter` (already used widely in `packages/mapgen-core/test/**`).

Minimum required capabilities are the `EngineAdapter` interface surface, notably:
- Terrain reads/writes used across steps (`isWater`, `getTerrainType`, `getElevation`, `setTerrainType`, `setRainfall`, etc.)
- Morphology/hydrology utilities (`createFractal`, `getFractalHeight`, `expandCoasts`, `modelRivers`, `validateAndFixTerrain`, `recalculateAreas`, etc.)
- Ecology (`designateBiomes`, `getBiomeType`, `setBiomeType`, `addFeatures`, `getFeatureType`, `setFeatureType`, `canHaveFeature`)
- Placement (`addNaturalWonders`, `addFloodplains`, `generateSnow`, `generateResources`, `assignStartPositions`, `generateDiscoveries`, etc.)
- Deterministic RNG (`getRandomNumber`)

Why `createMockAdapter` is sufficient:
- It provides deterministic behavior via injected `rng`.
- It tracks call counts (`adapter.calls.*`), which is useful for smoke assertions without engine reads.

Known places tests already rely on MockAdapter calls:
- `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts` asserts placement methods were invoked with expected args.

## 3) Plan fingerprint coverage (CI determinism)

Recommended approach:
- Keep `planFingerprint` deterministic for a given semantic RunRequest:
  - include: recipe order + per-occurrence step IDs + resolved per-occurrence config + semantic settings (seed, etc.)
  - exclude: pure observability toggles (trace verbosity) so fingerprints correlate execution semantics, not logging preferences
- Add a snapshot-style assertion for the fingerprint in the compile smoke test:
  - fixed recipe + fixed seed + fixed per-step config → stable fingerprint string

## 4) CIV‑23 rescope note (align to RunRequest/ExecutionPlan)

Current CIV‑23 doc lives in archive:
- `docs/projects/engine-refactor-v1/issues/_archive/CIV-23-integration-tests.md`
  - references legacy `stageConfig`/`stageManifest` and “WorldModel lifecycle” tests

Recommended rescope:
- Reframe CIV‑23 as “Integration guardrails for the new boundary”:
  1) Compile: RunRequest → ExecutionPlan (fail-fast structured errors)
  2) Execute: ExecutionPlan → run report + step events (engine-free, stub adapter)
  3) Behavior spot-checks: a few domain-level invariants that are stable and cheap (avoid content-heavy assertions)
- Remove (or de-emphasize) “WorldModel lifecycle” language:
  - the new contract surface is `ExtendedMapContext` + explicit artifacts/fields/effects, not a monolithic WorldModel object.
- Reference M4 smoke tests as the “baseline safety net,” and treat CIV‑23 as:
  - either a superset (broader integration), or
  - superseded by the smoke suite once the new boundary exists.

