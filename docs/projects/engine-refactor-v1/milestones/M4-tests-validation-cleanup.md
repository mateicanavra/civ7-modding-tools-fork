# M4: Tests, Validation & Cleanup

**Milestone ID:** `M4-tests-validation-cleanup`  
**Status:** In progress (re-baselining 2025-12-19)  
**Owner:** Engineering  

> Note: This milestone is being re-baselined after M3 completion. The issue mapping below reflects the current code state and will be refined into issue docs.

## Summary

Harden the MAPS engine after M3's architectural landing: add focused test coverage, expand contract validation beyond the current artifact/field gating, and remove legacy globals and fallbacks that block the target architecture.

This milestone corresponds to **Milestone 4** in `PROJECT-engine-refactor-v1.md`.

## Objectives

- Finish the M3→Target cutover: mod-authored recipe + compiled `ExecutionPlan` as the single source of truth (remove `stageManifest`/`STAGE_ORDER` as ordering inputs).
- Replace `state:engine.*` scheduling with verifiable `effect:*` tags + reified `field:*` / `artifact:*` products as cross-step dependency surfaces.
- Remove remaining legacy globals, fallbacks, and compatibility shims that keep old data flows alive (WorldModel bridge, GameplayMap reads, StoryTags compatibility).
- Add a basic but meaningful automated test suite and observability baseline around pipeline compile + execution.

## Scope

### Dependencies & Sequencing

- This milestone runs after:
  - **M2** has established the validated-config + foundation slice driven by `MapOrchestrator` (see `M2-stable-engine-slice.md` and related PRDs).
  - **M3** has generalized the pipeline and evolved `MapGenConfig` into its step/phase-aligned shape (see `M3-core-engine-refactor-config-evolution.md`).
- Within that baseline, M4 focuses on:
  - Finalizing the **target boundary** (`RunRequest = { recipe, settings }` → compile to `ExecutionPlan` → execute) and removing transitional ordering/config sources (`stageManifest`, `STAGE_ORDER`, `stageFlags`, `shouldRun`).
  - Hardening the engine with tests/validation and expanding explicit products across high-risk boundaries (leveraging the Task Graph + the target architecture SPIKE/SPEC).
  - Removing remaining globals/fallbacks that prevent a fully context-owned, fail-fast pipeline.
- Lower-level expectations for config behavior, pipeline contracts, and foundation outputs remain in:
  - `resources/PRD-config-refactor.md`
  - `resources/PRD-pipeline-refactor.md`
  - `resources/PRD-plate-generation.md`

### Baseline (Current State)

- Task Graph execution is the default path; the legacy `useTaskGraph` toggle is gone.
- `PipelineExecutor` enforces `requires`/`provides` and validates core artifact/field tags at runtime.
- RNG and adapter boundaries in `mapgen-core` are standardized (no `Math.random()` or direct `TerrainBuilder.*` usage).
- Foundation production is step-owned; legacy globals still exist for compatibility (see deferrals).

### 1. Pipeline Cutover (Ordering + Enablement + Inputs)

- Remove `stageManifest`/`STAGE_ORDER` as pipeline ordering inputs; treat a mod-authored recipe as canonical.
- Remove all residual enablement mechanisms (`stageFlags`, `shouldRun`) and ensure only recipe-driven enablement exists.
- Ensure the executor consumes only a compiled `ExecutionPlan` (no runtime filtering / silent skips).

### 2. Testing & Verification

- Add Vitest smoke tests for:
  - Task Graph pipeline execution against a stub adapter + minimal presets.
  - Foundation, climate, and overlay steps with deterministic invariants.
- Add regression tests for one or more key Swooper presets to catch breaking changes.

### 3. Validation & Contract Hardening

- Replace `state:engine.*` dependencies with verifiable `effect:*` tags + targeted adapter-backed verification (see `deferrals.md` DEF-008).
- Expand explicit, TS-canonical products at high-risk boundaries (e.g., `artifact:placementInputs@v1` in DEF-006) and reify engine-derived values when they become cross-step dependencies.

### 4. Legacy Cleanup & Hygiene

- Remove remaining legacy globals and compatibility shims:
  - StoryTags compatibility layer (DEF-002) and remaining story caches (DEF-012).
  - WorldModel bridge paths and direct `GameplayMap` reads in mapgen-core.
- Complete remaining JS/TS cleanup in engine paths.

### Out of Scope (Explicit)

- New algorithm modernization (morphology/hydrology/ecology).
- Recipe UI (in-game) and mod recipe patching/insertion tooling (beyond “pick a recipe and run it”).
- Rainfall ownership transfer or behavior-mode consolidation unless explicitly pulled in.

## Acceptance Criteria

- Pipeline ordering + enablement derive solely from the mod recipe; `stageManifest`/`STAGE_ORDER`/`stageFlags`/`shouldRun` are not part of the runtime contract.
- Core engine paths are covered by smoke tests that run quickly in CI; at least one Swooper preset regression test exists.
- `state:engine.*` is no longer a target contract surface; engine-side prerequisites are expressed as verifiable `effect:*` tags and/or reified `field:*` / `artifact:*` products.
- Legacy globals/fallbacks are removed (or quarantined to dev-only with explicit errors) and failures manifest as explicit errors.

## Recommended Parent Issues (keep the repo working after each)

> This milestone should be executed as a small set of parent issues that each leave the mod runnable. Each parent may internally land as a few stacked PR layers, but should preserve a working end-to-end pipeline after each parent completes.

### 1) M4-PIPELINE-CUTOVER: Recipe + ExecutionPlan as the only ordering surface (DEF-004)

- Outcome: Runtime input is `RunRequest = { recipe, settings }`, compiled into an `ExecutionPlan` that the executor runs (no `stageManifest`/`STAGE_ORDER` ordering input).
- Acceptance:
  - The default “standard” mod exposes a recipe that fully defines step order + enablement.
  - `stageManifest` and `STAGE_ORDER` are not required to run the pipeline.
  - Any remaining enablement artifacts (`stageFlags`, `shouldRun`) are deleted (or quarantined behind dev-only tooling) and not part of the runtime contract.

### 2) M4-EFFECTS-VERIFICATION: Replace `state:engine.*` with verifiable `effect:*` + reification (DEF-008)

- Outcome: Engine-surface prerequisites are explicit `effect:*` tags that participate in scheduling and are verified via adapter-backed postconditions; cross-step data is reified into `field:*` / `artifact:*`.
- Acceptance:
  - `state:engine.*` is removed from the target registry/contract surface (migration-only compatibility, if any, is isolated and explicit).
  - Highest-risk engine effects (biomes/features/placement) have verifiable `effect:*` tags and minimal postcondition checks.

### 3) M4-PLACEMENT-INPUTS: Cut placement over to `artifact:placementInputs@v1` (DEF-006)

- Outcome: Placement consumes explicit, TS-canonical inputs and publishes a verified `effect:engine.placementApplied`; no implicit engine reads act as the cross-step dependency surface.
- Acceptance:
  - `artifact:placementInputs@v1` exists in the registry with a safe demo payload.
  - A derive step produces it from explicit prerequisites.
  - Placement requires it and no longer relies on `state:*` scheduling tags.

### 4) M4-NARRATIVE-CLEANUP: Narrative/playability artifacts become canonical; StoryTags/caches removed (DEF-002/DEF-012)

- Outcome: Typed `artifact:narrative.*` products are the canonical playability surface; StoryTags are removed as a dependency surface and caches are context-owned or eliminated.
- Acceptance:
  - All in-repo consumers read (directly or via derived query helpers) from `artifact:narrative.*`.
  - StoryTags is either deleted or fenced to explicit compatibility tooling with no consumer correctness dependency.

### 5) M4-SAFETY-NET: Observability baseline + CI tests (CIV-23 + CIV-55)

- Outcome: We can compile, execute, and debug the pipeline confidently.
- Acceptance:
  - Step tracing can be toggled per step on a shared foundation; run id + plan fingerprint are emitted.
  - CI runs a small suite of smoke tests (stub adapter) plus at least one regression-style preset test.

## Existing / Related Issue Docs

- CIV-23: Integration & behavior tests (`../issues/CIV-23-integration-tests.md`) — will need re-scope to the recipe/ExecutionPlan boundary.
- CIV-53: Enablement consolidation (`../issues/CIV-53-def-013-enablement-consolidation.md`) — overlaps with M4-PIPELINE-CUTOVER and may be merged into it.
- Deferrals to close or advance in M4:
  - DEF-004, DEF-006, DEF-008, DEF-002, DEF-012.

Any remaining remediation items from:
- `../reviews/M-TS-typescript-migration-remediation.md`
- `../reviews/M-TS-typescript-migration-remediation-review.md`

These may be split or reassigned across milestones as we refine the execution plan.
