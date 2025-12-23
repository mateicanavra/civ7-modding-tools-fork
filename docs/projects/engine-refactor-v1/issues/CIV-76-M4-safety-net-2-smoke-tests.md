---
id: CIV-76
title: "[M4] Safety net: CI smoke tests + CIV-23 re-scope"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Testing]
parent: CIV-66
children: []
blocked_by: [CIV-75, CIV-58]
blocked: [CIV-59, CIV-62]
related_to: [CIV-23]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Add compile/execute smoke tests against the standard recipe using a stub adapter, and re-scope CIV-23 to the new boundary.

## Deliverables

- CI smoke tests that compile the standard recipe into an `ExecutionPlan`.
- CI smoke tests that execute the plan with a stub adapter and assert basic invariants.
- CIV-23 updated to align with `RunRequest`/`ExecutionPlan` and remove legacy orchestration references.

## Acceptance Criteria

- CI runs both compile and execute smoke tests on the default pipeline.
- Tests do not depend on the game engine.
- CIV-23 no longer references WorldModel or `stageConfig`/`stageManifest` inputs.

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- CI confirms the smoke tests run in the default pipeline.

## Dependencies / Notes

- **Parent:** [CIV-66](CIV-66-M4-SAFETY-NET.md)
- **Blocked by:** CIV-75, CIV-58
- **Related:** CIV-23

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep smoke tests light and deterministic; prefer stub adapter fixtures over real engine calls.
- If CIV-23 becomes redundant, mark as superseded instead of duplicating work.
- Test runner wiring: root `pnpm test:mapgen` → `pnpm -C packages/mapgen-core test` → `bun test` (`packages/mapgen-core/package.json`).
- Smoke coverage should explicitly exercise:
  - stageManifest/STAGE_ORDER removal paths
  - `effect:*` verification failures are loud
  - StoryTags removal / narrative artifacts are canonical

## Completion

- [x] Compile smoke test for the standard recipe (ExecutionPlan).
- [x] Execute smoke test with a stub adapter and basic invariants.
- [x] CIV-23 re-scoped to the RunRequest/ExecutionPlan boundary.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: define the smoke-test plan and stub adapter requirements so tests can be added quickly and deterministically.

Deliverables:
- A smoke-test matrix: compile test + execute test, with minimal assertions (no stageManifest/STAGE_ORDER, effect verification failures are loud, StoryTags not required).
- A stub adapter capability list needed to run the standard recipe.
- A short CIV-23 rescope note aligned to the new RunRequest/ExecutionPlan boundary.
- A note on plan fingerprint coverage (recipe + settings + per-step config) to keep CI deterministic.

Where to look:
- Tests: `packages/mapgen-core/test/**`, `packages/mapgen-core/package.json` (Bun runner).
- Legacy test references: `docs/projects/engine-refactor-v1/issues/CIV-23-integration-tests.md`.
- Milestone acceptance notes: `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

Constraints/notes:
- Tests must be deterministic and engine-free.
- Keep the suite light; focus on compile/execute smoke coverage.
- Do not implement code; return the matrix and capability list as markdown tables/lists.

## Pre-work

Goal: define a minimal compile/execute smoke-test matrix and the stub adapter capabilities needed to run the default pipeline deterministically, and capture how CIV‑23 should be re-scoped to the new `RunRequest`/`ExecutionPlan` boundary.

### 1) Smoke-test matrix (CI)

Focus: light, deterministic, engine-free guardrails that catch "pipeline didn't actually run" and "contract enforcement regressed" failures.

#### A) Compile smoke (ExecutionPlan compilation)

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

#### B) Execute smoke (plan execution with stub adapter)

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

### 2) Stub adapter capability list (what the smoke path needs)

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

### 3) Plan fingerprint coverage (CI determinism)

Recommended approach:
- Keep `planFingerprint` deterministic for a given semantic RunRequest:
  - include: recipe order + per-occurrence step IDs + resolved per-occurrence config + semantic settings (seed, etc.)
  - exclude: pure observability toggles (trace verbosity) so fingerprints correlate execution semantics, not logging preferences
- Add a snapshot-style assertion for the fingerprint in the compile smoke test:
  - fixed recipe + fixed seed + fixed per-step config → stable fingerprint string

### 4) CIV‑23 rescope note (align to RunRequest/ExecutionPlan)

Current CIV‑23 doc lives in archive:
- `docs/projects/engine-refactor-v1/issues/_archive/CIV-23-integration-tests.md`
  - references legacy `stageConfig`/`stageManifest` and "WorldModel lifecycle" tests

Recommended rescope:
- Reframe CIV‑23 as "Integration guardrails for the new boundary":
  1) Compile: RunRequest → ExecutionPlan (fail-fast structured errors)
  2) Execute: ExecutionPlan → run report + step events (engine-free, stub adapter)
  3) Behavior spot-checks: a few domain-level invariants that are stable and cheap (avoid content-heavy assertions)
- Remove (or de-emphasize) "WorldModel lifecycle" language:
  - the new contract surface is `ExtendedMapContext` + explicit artifacts/fields/effects, not a monolithic WorldModel object.
- Reference M4 smoke tests as the "baseline safety net," and treat CIV‑23 as:
  - either a superset (broader integration), or
  - superseded by the smoke suite once the new boundary exists.
