# M4: Tests, Validation & Cleanup

**Milestone ID:** `M4-tests-validation-cleanup`  
**Status:** In progress (re-baselining 2025-12-19)  
**Owner:** Engineering  

> Note: This milestone is being re-baselined after M3 completion. The issue mapping below reflects the current code state and will be refined into issue docs.

## Summary

Harden the MAPS engine after M3's architectural landing: add focused test coverage, expand contract validation beyond the current artifact/field gating, and remove legacy globals and fallbacks that block the target architecture.

This milestone corresponds to **Milestone 4** in `PROJECT-engine-refactor-v1.md`.

## Objectives

- Add a basic but meaningful automated test suite around the Task Graph pipeline and critical steps.
- Extend runtime validation to cover `state:engine.*` dependencies (or replace them with verifiable artifacts/fields).
- Remove remaining legacy globals, fallbacks, and compatibility shims that keep old data flows alive.
- Close remaining TS migration and orchestrator hygiene cleanup that blocks the target architecture.

## Scope

### Dependencies & Sequencing

- This milestone runs after:
  - **M2** has established the validated-config + foundation slice driven by `MapOrchestrator` (see `M2-stable-engine-slice.md` and related PRDs).
  - **M3** has generalized the pipeline and evolved `MapGenConfig` into its step/phase-aligned shape (see `M3-core-engine-refactor-config-evolution.md`).
- Within that baseline, M4 focuses on:
  - Hardening the engine with tests and validation (leveraging the Task Graph and data products defined in `resources/PRD-pipeline-refactor.md` and `PROJECT-engine-refactor-v1.md`).
  - Removing remaining globals/fallbacks that prevent a fully context-owned, fail-fast pipeline.
  - Cleaning up remaining JS shims and orchestrator hygiene, informed by the remediation/review docs.
- Lower-level expectations for config behavior, pipeline contracts, and foundation outputs remain in:
  - `resources/PRD-config-refactor.md`
  - `resources/PRD-pipeline-refactor.md`
  - `resources/PRD-plate-generation.md`

### Baseline (Current State)

- Task Graph execution is the default path; the legacy `useTaskGraph` toggle is gone.
- `PipelineExecutor` enforces `requires`/`provides` and validates core artifact/field tags at runtime.
- RNG and adapter boundaries in `mapgen-core` are standardized (no `Math.random()` or direct `TerrainBuilder.*` usage).
- Foundation production is step-owned; legacy globals still exist for compatibility (see deferrals).

### 1. Testing & Verification

- Add Vitest smoke tests for:
  - Task Graph pipeline execution against a stub adapter + minimal presets.
  - Foundation, climate, and overlay steps with deterministic invariants.
- Add regression tests for one or more key Swooper presets to catch breaking changes.

### 2. Validation & Contract Hardening

- Define and implement a verification strategy for `state:engine.*` dependencies (see `deferrals.md` DEF-008).
- Add targeted runtime checks for the highest-risk `state:engine.*` tags or replace them with verifiable artifacts/fields.

### 3. Legacy Cleanup & Hygiene

- Remove remaining legacy globals and compatibility shims:
  - StoryTags compatibility layer and overlay registry fallback.
  - WorldModel bridge paths and direct `GameplayMap` reads in mapgen-core.
- Complete remaining JS/TS cleanup in engine paths.
- Consolidate enablement gating in `MapOrchestrator` (see DEF-013).

### Out of Scope (Explicit)

- New algorithm modernization (morphology/hydrology/ecology).
- Recipe UI or externally composable pipeline definitions.
- Rainfall ownership transfer or behavior-mode consolidation unless explicitly pulled in.

## Acceptance Criteria

- Core engine paths are covered by smoke tests that run quickly in CI.
- Targeted regression tests exist for at least one Swooper preset.
- `state:engine.*` dependencies have a defined verification strategy with runtime checks for high-risk tags.
- Legacy globals/fallbacks are removed or demoted to dev-only, and failures manifest as explicit errors.
- Orchestrator enablement and cleanup work is complete.

## Candidate Issues / Deliverables

> These mappings reflect the re-baseline and will be refined into issue docs.

- [ ] CIV-23: Integration & behavior tests (re-scope for Task Graph + context artifacts) (`../issues/CIV-23-integration-tests.md`)
- [ ] M4-VALIDATION: `state:engine.*` verification strategy + targeted checks (DEF-008) (issue doc TBD)
- [ ] M4-LEGACY-CLEANUP: remove StoryTags/overlay registry fallback + WorldModel bridge + GameplayMap reads (DEF-002/003/007/012) (issue doc TBD)
- [ ] CIV-53: Orchestrator hygiene + enablement consolidation (DEF-013) (`../issues/CIV-53-def-013-enablement-consolidation.md`)
- [ ] CIV-9: Bun/pnpm bridge scripts (`../issues/CIV-9-bun-pnpm-bridge.md`) - optional tooling improvement

Any remaining remediation items from:
- `../reviews/M-TS-typescript-migration-remediation.md`
- `../reviews/M-TS-typescript-migration-remediation-review.md`

These may be split or reassigned across milestones as we refine the execution plan.
