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
- The standard pipeline must be packaged as a mod-style package + registry entries (not hard-wired in `pipeline/standard-library.ts`).
- Remove all residual enablement mechanisms (`stageFlags`, `shouldRun`) and ensure only recipe-driven enablement exists.
- Ensure the executor consumes only a compiled `ExecutionPlan` (no runtime filtering / silent skips).

### 2. Testing & Verification

- Add Bun smoke tests for:
  - Task Graph pipeline execution against a stub adapter + default recipe+settings selection.
  - Foundation, climate, and overlay steps with deterministic invariants.
- Add regression tests for one or more key Swooper recipe+settings selections to catch breaking changes.

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
- Rainfall ownership transfer / climate prerequisite reification (DEF-010); engine adapter reads are acceptable in M4 unless explicitly pulled in.

## Acceptance Criteria

- Pipeline ordering + enablement derive solely from the mod recipe; `stageManifest`/`STAGE_ORDER`/`stageFlags`/`shouldRun` are not part of the runtime contract.
- Core engine paths are covered by smoke tests that run quickly in CI; at least one Swooper recipe+settings regression test exists.
- `state:engine.*` is no longer a target contract surface; engine-side prerequisites are expressed as verifiable `effect:*` tags and/or reified `field:*` / `artifact:*` products.
- Legacy globals/fallbacks are removed (or quarantined to dev-only with explicit errors) and failures manifest as explicit errors.

## Estimation Guidance for AI Agents

> **For agents working on M4:** Use the complexity × parallelism model, not raw size, when scoping and estimating work.

**What drives estimates:**
- **Complexity:** Procedural trickiness, ambiguity, fragile invariants, order-dependent sequencing, places where you need to reason step-by-step and "go slow." Examples: contract/schema design, parity verification, untangling intertwined behaviors, maintaining multiple invariants at once.
- **Parallelism:** How much of the work is a safe, repeatable pattern that can be applied in bulk or by multiple agents. High parallelism = lower effective effort even if many files are touched.

**What does NOT automatically increase estimates:**
- Raw **file or call-site count** by itself.
- "Apply the same safe transform N times" — this is low-complexity, high-parallelism and should get a modest estimate even if N is large.

**Estimate calibration:**
- **High complexity, low parallelism** (architectural decisions, contract design, parity verification, tricky sequencing) → justifies higher estimates.
- **Low complexity, high parallelism** (mechanical refactors, uniform substitutions across many files) → scope as relatively small, even if touching many files.

**Example:** "Migrate 32 files from StoryTags to narrative artifacts" sounds large, but if the pattern is `tags.getRifts(ctx)` → `ctx.artifacts.get("artifact:narrative.rifts@v1")` uniformly, that's high-parallelism/low-complexity and should NOT inflate the estimate to 16 just because 32 files are involved.

---

## Recommended Parent Issues (keep the repo working after each)

> This milestone should be executed as a small set of parent issues that each leave the mod runnable. Each parent may internally land as a few stacked PR layers, but should preserve a working end-to-end pipeline after each parent completes.

### 1) M4-PIPELINE-CUTOVER: Recipe + ExecutionPlan as the only ordering surface (DEF-004) — **Estimate: 8**

- Outcome: Runtime input is `RunRequest = { recipe, settings }`, compiled into an `ExecutionPlan` that the executor runs (no `stageManifest`/`STAGE_ORDER` ordering input).
- Issue doc: `../issues/M4-PIPELINE-CUTOVER.md`
- Child issue docs:
  - `../issues/LOCAL-TBD-M4-pipeline-cutover-1-runrequest.md`
  - `../issues/LOCAL-TBD-M4-pipeline-cutover-4-step-config-schemas.md`
  - `../issues/LOCAL-TBD-M4-pipeline-cutover-2-default-recipe.md`
  - `../issues/LOCAL-TBD-M4-pipeline-cutover-3-remove-legacy-ordering.md`
- Acceptance:
  - The default “standard” mod exposes a recipe that fully defines step order + enablement.
  - `stageManifest` / `STAGE_ORDER` / `stageConfig` are deleted as runtime inputs; the pipeline is fully described by the mod recipe.
  - Any legacy enablement mechanisms (`stageFlags`, `shouldRun`) are deleted; no runtime/test path consults them.

### 2) M4-EFFECTS-VERIFICATION: Replace `state:engine.*` with verifiable `effect:*` + reification (DEF-008) — **Estimate: 8**

- Outcome: Engine-surface prerequisites are explicit `effect:*` tags that participate in scheduling and are verified via adapter-backed postconditions; cross-step data is reified into `field:*` / `artifact:*`.
- Issue doc: `../issues/M4-EFFECTS-VERIFICATION.md`
- Child issue docs:
  - `../issues/LOCAL-TBD-M4-effects-verification-1-effect-tags.md`
  - `../issues/LOCAL-TBD-M4-effects-verification-2-biomes-features.md`
  - `../issues/LOCAL-TBD-M4-effects-verification-3-remove-state-engine.md`
- Acceptance:
  - `state:engine.*` is removed from the target registry/contract surface (migration-only compatibility, if any, is isolated and explicit).
  - Highest-risk engine effects (biomes/features/placement) have verifiable `effect:*` tags and minimal postcondition checks.

### 3) M4-PLACEMENT-INPUTS: Cut placement over to `artifact:placementInputs@v1` (DEF-006) — **Estimate: 4**

- Outcome: Placement consumes explicit, TS-canonical inputs and publishes a verified `effect:engine.placementApplied`; no implicit engine reads act as the cross-step dependency surface.
- Issue doc: `../issues/M4-PLACEMENT-INPUTS.md`
- Child issue docs:
  - `../issues/LOCAL-TBD-M4-placement-inputs-1-define-artifact.md`
  - `../issues/LOCAL-TBD-M4-placement-inputs-2-cutover.md`
- Acceptance:
  - `artifact:placementInputs@v1` exists in the registry with a safe demo payload.
  - A derive step produces it from explicit prerequisites.
  - Placement requires it and no longer relies on `state:*` scheduling tags.

### 4) M4-NARRATIVE-CLEANUP: Narrative/playability artifacts become canonical; StoryTags/caches removed (DEF-002/DEF-012) — **Estimate: 8**

- Outcome: Typed `artifact:narrative.*` products are the canonical playability surface; StoryTags are removed as a dependency surface and caches are context-owned or eliminated.
- Issue doc: `../issues/M4-NARRATIVE-CLEANUP.md`
- Child issue docs:
  - `../issues/LOCAL-TBD-M4-narrative-cleanup-1-artifacts.md`
  - `../issues/LOCAL-TBD-M4-narrative-cleanup-2-remove-storytags.md`
- Acceptance:
  - All in-repo consumers read (directly or via derived query helpers) from `artifact:narrative.*`.
  - StoryTags is either deleted or fenced to explicit compatibility tooling with no consumer correctness dependency.

### 5) M4-SAFETY-NET: Observability baseline + CI tests (CIV-23 + CIV-55) — **Estimate: 4**

- Outcome: We can compile, execute, and debug the pipeline confidently.
- Issue doc: `../issues/M4-SAFETY-NET.md`
- Child issue docs:
  - `../issues/LOCAL-TBD-M4-safety-net-1-observability.md`
  - `../issues/LOCAL-TBD-M4-safety-net-2-smoke-tests.md`
- Acceptance:
  - Step tracing can be toggled per step on a shared foundation; run id + plan fingerprint are emitted.
  - CI runs a small suite of smoke tests (stub adapter) plus at least one regression-style recipe+settings test.

## Existing / Related Issue Docs

- CIV-23: Integration & behavior tests (`../issues/CIV-23-integration-tests.md`) — will need re-scope to the recipe/ExecutionPlan boundary.
- CIV-53: Enablement consolidation (`../issues/CIV-53-def-013-enablement-consolidation.md`) — overlaps with M4-PIPELINE-CUTOVER and may be merged into it.
- Deferrals to close or advance in M4:
  - DEF-004, DEF-006, DEF-008, DEF-002, DEF-012.

Any remaining remediation items from:
- `../reviews/M-TS-typescript-migration-remediation.md`
- `../reviews/M-TS-typescript-migration-remediation-review.md`

These may be split or reassigned across milestones as we refine the execution plan.

## Triage (Draft)

This triage is a **single list of the things that can still make M4 drift**, grouped to
avoid duplication. Each item is labeled:
- **[MUST]** required to meet M4 "no legacy left"
- **[OPEN-QUESTION]** needs a clarified question + explicit call
- **[POST-M4]** intentionally deferred (must stay consistent with deferrals/spec wording)
- **[ISSUE]** agreed work that still needs a new issue or scope update
- **[NOTE]** clarifications/risks to document (no new issue yet)
- **[RESOLVED-DECISION]** decision made; align scope/docs
- **[RESOLVED-NOTE]** resolved; no M4 work required

### Pipeline cutover gaps (ordering, boundary, inputs)

- **[MUST][ISSUE]** Cut the runtime boundary to `RunRequest = { recipe, settings }` and compile to `ExecutionPlan` (executor runs the plan only).
  - Today the runtime is still `MapGenConfig`-centric (bootstrap + orchestrator) and derives `recipe` from `stageManifest` (`packages/mapgen-core/src/bootstrap/entry.ts`, `packages/mapgen-core/src/orchestrator/task-graph.ts`, `packages/mapgen-core/src/MapOrchestrator.ts`).
- **[MUST][ISSUE]** Delete `stageManifest` / `STAGE_ORDER` / `stageConfig` as runtime ordering/enabling inputs. No compatibility shims survive M4 for these surfaces.
  - Expected edits include `packages/mapgen-core/src/bootstrap/resolved.ts`, `packages/mapgen-core/src/pipeline/StepRegistry.ts`, plus orchestrator/tests/docs (see Breadcrumbs).
- **[MUST][ISSUE]** Remove dual orchestration paths (`MapOrchestrator` vs executor); ensure only the compiled plan path is used and legacy entrypoints are deleted/fenced.
- **[MUST][ISSUE]** Add per-step config schema + executor plumbing so steps can accept typed recipe config (`../issues/LOCAL-TBD-M4-pipeline-cutover-4-step-config-schemas.md`).
  - This is the replacement for `stageConfig` as the source of step-local knobs (legacy removal is in PIPELINE-3).
  - `MapGenStep` in `packages/mapgen-core/src/pipeline/types.ts` currently has no config argument; `PipelineExecutor` runs steps without config.
- **[MUST][ISSUE]** Ensure no runtime/test path still passes `stageFlags`/`shouldRun` (e.g., paleo ordering test); recipe list remains the sole enablement source.
- **[NOTE]** This kept recurring because DEF‑004 intentionally deferred the recipe surface in M3, and milestone/issue text was not fully rewritten after recipe-only ordering/enablement decisions were accepted.
- **[RESOLVED-DECISION]** Presets are removed entirely. Canonical entry is recipe + settings selection; no preset resolution/composition remains in M4.
- **[MUST][ISSUE]** Delete preset resolution/composition and migrate any usages to explicit recipe+settings selection as the only entry mode (`../issues/LOCAL-TBD-M4-pipeline-cutover-3-remove-legacy-ordering.md`).

### Registry + tag language gaps (needed for effects + "no legacy left")

- **[MUST][ISSUE]** Replace the M3 fixed allowlist + regex tag validation (`packages/mapgen-core/src/pipeline/tags.ts`) and executor hard-coded "verified provides" list (`packages/mapgen-core/src/pipeline/PipelineExecutor.ts`) with the accepted canonical model:
  - registry-instantiated tag catalog (fields/artifacts/effects), hard collision errors, artifact demos, and registry-driven verification.
- **[MUST][ISSUE]** `effect:*` must be a real, schedulable namespace in validation and execution.
  - Today tag validation accepts only `artifact:*`, `field:*`, and `state:engine.*` (`packages/mapgen-core/src/pipeline/tags.ts`), so `effect:*` work requires a validation cutover (or registry-driven validation).

### Effects + `state:engine.*` cleanup (DEF-008)

- **[MUST][ISSUE]** Remove `state:engine.*` from the *standard pipeline* dependency surface entirely.
  - It is currently canonical in `M3_STAGE_DEPENDENCY_SPINE` (`packages/mapgen-core/src/pipeline/standard.ts`) and in tag validation (`packages/mapgen-core/src/pipeline/tags.ts`).
  - If M4 only replaces biomes/features/placement, landmass/coastlines/rivers still leave trusted, unverified scheduling edges -> legacy remains.

### Narrative/playability cleanup (DEF-002 / DEF-012)

- **[MUST][ISSUE]** Replace `artifact:storyOverlays` + StoryTags as the canonical surface with typed `artifact:narrative.*` products, and migrate all in-repo consumers.
  - StoryTags consumers exist outside narrative modules (morphology rugged coasts, ecology biomes/features, climate refine, etc.).
- **[MUST][ISSUE]** Remove module-level narrative caches/globals (or make them context-owned artifacts keyed to the run). Resetting caches at the orchestrator boundary is a smell to eliminate, not a stable target contract.

### Engine boundary gaps (adapter-only + reification-first)

- **[MUST][ISSUE]** Eliminate direct engine-global reads as dependency surfaces (or fence them behind adapter/runtime surfaces, with dev/test-only tooling isolated):
  - `GameplayMap` fallbacks in narrative utils (`packages/mapgen-core/src/domain/narrative/utils/*.ts`)
  - `GameInfo` lookups at module load time (`packages/mapgen-core/src/core/terrain-constants.ts`)
  - `PlotTags` / `LandmassRegion` globals (`packages/mapgen-core/src/core/plot-tags.ts`)

### Testing / runner / observability alignment

- **[RESOLVED-DECISION]** Tests for `mapgen-core` use Bun's test runner (invoked via pnpm). Vitest migration, if any, is explicitly post-M4.
  - Current wiring: root `pnpm test:mapgen` -> `pnpm -C packages/mapgen-core test` -> `bun test` (`packages/mapgen-core/package.json`).
- **[MUST][ISSUE]** Smoke tests should compile + run the default recipe/plan under a stub adapter and cover:
  - stageManifest/STAGE_ORDER removal
  - `effect:*` verification failures are loud
  - StoryTags removal / narrative artifacts are canonical
- **[MUST][ISSUE]** Plan fingerprint/runId determinism needs an explicit, stable hash/serialization strategy for `settings + recipe + per-step config` so CI does not flake and traces can be correlated.

### Spec / SPIKE alignment (resolved)

- **[RESOLVED-DECISION]** SPEC §1.5 pending language is superseded; decisions 3.4/3.6/3.7 are accepted, `artifact:riverGraph` is deferred per DEF-005, and placement inputs are accepted with implementation deferred per DEF-006.
- **[RESOLVED-DECISION]** ADRs are post-M4; ADR-TBD markers in SPIKE are informational only. Decisions live in the SPEC + M4 plan.
- **[RESOLVED-NOTE]** WIP/deferrals disclaimers in SPEC/SPIKE are superseded; deferrals are tracked in `deferrals.md`.

### Scope calls required by "no legacy left" (explicitly decide)

- **[RESOLVED-DECISION]** The standard pipeline will be moved from hard-coded `pipeline/standard-library.ts` wiring into a mod-style package + registry entries; it must not remain hard-coded.
- **[ISSUE]** Extract the standard pipeline into a mod-style package and wire it into registry/loader paths; remove hard-wired `standard-library` entrypoints.
- **[RESOLVED-NOTE]** Doc-only JS archives under `docs/**/_archive/*` are acceptable to keep; no M4 cleanup required. Optionally add to `.gitignore` later if we want to hide them.
- **[RESOLVED-DECISION]** DEF-010 (climate prerequisites reification) is explicitly post-M4. M4 focuses on architecture/infrastructure; it is acceptable for standard pipeline steps to keep current engine-adapter reads and artifact shapes for now.
- **[RESOLVED-DECISION]** DEF-014 (foundation artifacts) is intentionally deferred beyond M4 per SPIKE 2.3 / DEF-014. Keep `ctx.foundation` as a migration-only compatibility surface; avoid introducing new dependencies on it.

### Hidden dependencies & sequencing (make explicit so each parent keeps the repo runnable)

- **[MUST][NOTE]** M4-SAFETY-NET depends on PIPELINE-1 (compiler/plan exists) for plan fingerprint + compile/execute smoke tests.
- **[MUST][NOTE]** PIPELINE-2 depends on PIPELINE-4 (per-step config plumbing) so recipe config is actually validated and passed to steps (not just parsed and ignored).
- **[MUST][NOTE]** M4-PLACEMENT-INPUTS depends on EFFECTS-1 (effect tags + adapter postcondition surfaces) and on any upstream reification needed to build `placementInputs@v1` deterministically.
- **[MUST][NOTE]** M4-NARRATIVE-CLEANUP is cross-phase work; schedule it after PIPELINE-CUTOVER so failures are surfaced via recipe/plan validation (not via stage manifest drift).
- **[MUST][NOTE]** SAFETY-NET observability baseline (LOCAL-TBD-M4-SAFETY-NET-1) should land **early in M4**, alongside or immediately after PIPELINE-1, to enable parity verification during the cutover. Without tracing/smoke tests, "it still works" is unverifiable for subsequent parents.

### Estimate sanity (using complexity x parallelism model)

> **Note:** Per the estimation guidance above, raw file/call-site count does NOT drive estimates. The numbers below are calibrated by complexity and parallelism, not by "how many files are touched."

- **[NOTE] Pipeline cutover: 16** (raise from 8)
  - Child issues: LOCAL-TBD-M4-pipeline-cutover-1 (4), LOCAL-TBD-M4-pipeline-cutover-4 (4), LOCAL-TBD-M4-pipeline-cutover-2 (4), LOCAL-TBD-M4-pipeline-cutover-3 (4).
  - Complexity lives in: compiler design (`compileExecutionPlan`), parity verification with `resolveStageManifest()` behavior (including `ruggedCoasts` special-casing), plus per-step config plumbing.
- **[NOTE] Effects verification: 16** (raise from 8)
  - Child issues: LOCAL-TBD-M4-effects-verification-1 (4), LOCAL-TBD-M4-effects-verification-2 (8), LOCAL-TBD-M4-effects-verification-3 (4).
  - Complexity lives in: adapter postcondition query design (EFFECTS-1), registry-driven tag validation, first instance of reify pattern.
- **[NOTE] Placement inputs: 8** (raise from 4)
  - Child issues: LOCAL-TBD-M4-placement-inputs-1 (4), LOCAL-TBD-M4-placement-inputs-2 (4).
  - Complexity lives in: auditing placement input assembly, artifact schema design, and adapter invariants (DEF-010 reification is post-M4).
- **[NOTE] Narrative cleanup: 8** (raise from 4, not 16)
  - Child issues: LOCAL-TBD-M4-narrative-cleanup-1 (4), LOCAL-TBD-M4-narrative-cleanup-2 (4).
  - Complexity lives in: artifact schema design (what goes in `artifact:narrative.corridors@v1`?), cache removal analysis.
  - High parallelism offsets: 32 StoryTags consumers x same substitution pattern is low-complexity/high-parallelism. Once artifacts exist, `tags.getRifts(ctx)` -> `ctx.artifacts.get("artifact:narrative.rifts@v1")` is mechanical.
  - **Do NOT inflate to 16 just because 32 files are involved.**
- **[NOTE] Safety net: 4** (unchanged)
  - Complexity lives in: trace model design, plan fingerprint algorithm.
  - Runner decision is settled (Bun) and does not change complexity.

**Revised total: 52** (vs 28 original, vs 64 if file-count-inflated).

### Risks / potential derailers (track explicitly; avoid surprise scope creep)

- **[NOTE]** Effect verification can balloon if postconditions are missing/expensive. Keep checks minimal and adapter-friendly; prefer "cheap invariants" over full-map scans.
- **[NOTE]** Narrative consumer migration can accidentally change outputs (StoryTags removal). Require targeted smoke coverage around the migrated consumers (not just "narrative steps ran").
- **[NOTE]** Placement inputs may still require some engine-only reads; if so, ensure those reads are reified immediately and treated as explicit prerequisites (no "read engine later" coupling).

### Breadcrumbs (key files touched by M4 scope)

- Pipeline boundary + ordering: `packages/mapgen-core/src/bootstrap/entry.ts`, `packages/mapgen-core/src/bootstrap/resolved.ts`, `packages/mapgen-core/src/MapOrchestrator.ts`, `packages/mapgen-core/src/orchestrator/task-graph.ts`, `packages/mapgen-core/src/pipeline/StepRegistry.ts`
- Dependency language + validation: `packages/mapgen-core/src/pipeline/tags.ts`, `packages/mapgen-core/src/pipeline/standard.ts`, `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`, `packages/mapgen-core/src/pipeline/artifacts.ts`
- Tests touching ordering/wiring: `packages/mapgen-core/test/orchestrator/paleo-ordering.test.ts`, `packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts`, `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts`, `packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts`
- Narrative consumers + caches: `packages/mapgen-core/src/domain/hydrology/climate/refine/index.ts`, `packages/mapgen-core/src/domain/ecology/features/index.ts`, `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts`, `packages/mapgen-core/src/domain/narrative/tags/*`
- Engine globals to eliminate/fence: `packages/mapgen-core/src/domain/narrative/utils/*.ts`, `packages/mapgen-core/src/core/terrain-constants.ts`, `packages/mapgen-core/src/core/plot-tags.ts`
- Config wiring docs: `packages/mapgen-core/src/config/schema.ts`, `docs/projects/engine-refactor-v1/resources/config-wiring-status.md`
