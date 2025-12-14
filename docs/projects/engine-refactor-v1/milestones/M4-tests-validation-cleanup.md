# M4: Tests, Validation & Cleanup

**Milestone ID:** `M4-tests-validation-cleanup`  
**Status:** Planned  
**Owner:** Engineering  

> Note: Scope and exact issue mapping for this milestone may be revisited as we get closer to implementation. Treat this doc as a living plan that should be updated once work starts.

## Summary

Harden the MAPS engine with automated tests, manifest validation, and cleanup. This milestone closes remaining TypeScript migration carry-over work and removes legacy fallbacks, ensuring the engine is robust, observable, and maintainable.

This milestone corresponds to **Milestone 4** in `PROJECT-engine-refactor-v1.md`.

## Objectives

- Add a basic but meaningful automated test suite around the orchestrator, pipeline, and critical steps.
- Harden and broaden runtime `requires`/`provides` enforcement via a manifest/data-product validator (M3 establishes baseline gating; M4 adds stronger coverage + tests).
- Remove remaining JS shims and legacy fallbacks (null adapters, silent fallbacks) from the engine.

## Scope

### Dependencies & Sequencing

- This milestone runs after:
  - **M2** has established the validated-config + foundation slice driven by `MapOrchestrator` (see `M2-stable-engine-slice.md` and related PRDs).
  - **M3** has generalized the pipeline and evolved `MapGenConfig` into its step/phase-aligned shape (see `M3-core-engine-refactor-config-evolution.md`).
- Within that baseline, M4 focuses on:
  - Hardening the engine with tests and validation (leveraging the Task Graph and data products defined in `resources/PRD-pipeline-refactor.md` and `PROJECT-engine-refactor-v1.md`).
  - Cleaning up remaining JS shims, legacy fallbacks, and loose typing, informed by the remediation/review docs.
- Lower-level expectations for config behavior, pipeline contracts, and foundation outputs remain in:
  - `resources/PRD-config-refactor.md`
  - `resources/PRD-pipeline-refactor.md`
  - `resources/PRD-plate-generation.md`

### 1. Testing & Verification

- Add Vitest smoke tests for:
  - The orchestrator + pipeline running against a stub adapter and minimal presets.
  - Foundation/plate generation steps, verifying determinism and basic invariants.
  - Climate and overlay steps where feasible (e.g., rainfall ranges, overlay counts).
- Introduce regression tests for one or more key Swooper presets to catch breaking changes.

### 2. Manifest & Data-Product Validation

- Implement a lightweight validator that:
  - Verifies all `requires` are present in `MapGenContext` before a step runs.
  - Ensures data products like `FoundationContext`, `Heightfield`, `ClimateField`, and `StoryOverlays` exist before consumers execute.
- Wire validator checks into the pipeline executor in development/test modes (and optionally in production with sensible failure behavior).

### 3. Cleanup & TS Migration Finish

- Remove any remaining JavaScript shims or mixed TS/JS files in the engine path.
- Remove legacy fallbacks (e.g., “null” adapters or silent fallback Voronoi implementations).
- Tighten type coverage where `any`/`unknown` is still used at key boundaries.

## Acceptance Criteria

- Core engine paths are covered by smoke tests that run quickly in CI.
- Manifest/data-product validation catches missing dependencies early and clearly.
- TS migration is fully complete; engine code is consistently typed and free of JS stubs.
- Legacy fallbacks are gone; failures manifest as explicit errors, not silent “empty map” behavior.

## Candidate Issues / Deliverables

> These mappings are tentative and may be adjusted when the milestone is scheduled.

- [ ] CIV-23: Integration & behavior tests (`../issues/CIV-23-integration-tests.md`)
- [ ] CIV-9: Bun/pnpm bridge scripts (`../issues/CIV-9-bun-pnpm-bridge.md`) - optional tooling improvement
- [ ] CIV-24: Dev diagnostics and validation (`../issues/CIV-24-dev-diagnostics.md`)
- Any remaining remediation items from:
  - `../reviews/M-TS-typescript-migration-remediation.md`
  - `../reviews/M-TS-typescript-migration-remediation-review.md`

These may be split or reassigned across milestones as we refine the execution plan.
