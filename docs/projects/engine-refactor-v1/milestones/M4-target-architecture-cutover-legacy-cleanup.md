---
id: M4
title: "M4: Target Architecture Cutover & Legacy Cleanup"
status: in_progress
status_note: re-baselining 2025-12-19
owner: Engineering
estimate_total: 74
project: engine-refactor-v1
parent_issues:
  - CIV-54
  - CIV-61
  - CIV-62
  - CIV-63
  - CIV-64
  - CIV-65
  - CIV-66
  - CIV-67
---

# M4: Target Architecture Cutover & Legacy Cleanup

> Note: This milestone is being re-baselined after M3 completion. The issue mapping below reflects the current code state and will be refined into issue docs.

---

## Part I: Scope & Purpose

### Summary

Harden the MAPS engine after M3's architectural landing: add focused test coverage, expand contract validation beyond the current artifact/field gating, and remove legacy globals and fallbacks that block the target architecture.

This milestone corresponds to **Milestone 4** in `PROJECT-engine-refactor-v1.md`.

### Objectives

1. **Finish the M3→Target cutover:** mod-authored recipe + compiled `ExecutionPlan` as the single source of truth (remove `stageManifest`/`STAGE_ORDER` as ordering inputs).

2. **Replace `state:engine.*` scheduling:** use verifiable `effect:*` tags + reified `field:*` / `artifact:*` products as cross-step dependency surfaces.

3. **Remove remaining legacy globals:** eliminate fallbacks and compatibility shims that keep old data flows alive (WorldModel bridge, GameplayMap reads, StoryTags compatibility).

4. **Add automated test suite:** establish a basic but meaningful test suite and observability baseline around pipeline compile + execution.

### Baseline (Current State)

- Task Graph execution is the default path; the legacy `useTaskGraph` toggle is gone.
- `PipelineExecutor` enforces `requires`/`provides` and validates core artifact/field tags at runtime.
- RNG and adapter boundaries in `mapgen-core` are standardized (no `Math.random()` or direct `TerrainBuilder.*` usage).
- Foundation production is step-owned; legacy globals still exist for compatibility (see deferrals).

### Dependencies & Sequencing

This milestone runs after:

- **M2** has established the validated-config + foundation slice driven by `MapOrchestrator` (see `M2-stable-engine-slice.md` and related PRDs).
- **M3** has generalized the pipeline and evolved `MapGenConfig` into its step/phase-aligned shape (see `../../../_archive/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md`).

Within that baseline, M4 focuses on:

- Finalizing the **target boundary** (`RunRequest = { recipe, settings }` → compile to `ExecutionPlan` → execute) and removing transitional ordering/config sources (`stageManifest`, `STAGE_ORDER`, `stageFlags`, `shouldRun`).
- Hardening the engine with tests/validation and expanding explicit products across high-risk boundaries (leveraging the Task Graph + the target architecture SPIKE/SPEC).
- Removing remaining globals/fallbacks that prevent a fully context-owned, fail-fast pipeline.

Lower-level expectations for config behavior, pipeline contracts, and foundation outputs remain in:

- `resources/PRD-config-refactor.md`
- `resources/PRD-pipeline-refactor.md`
- `resources/PRD-plate-generation.md`

### Scope Areas

#### 1. Pipeline Cutover (Ordering + Enablement + Inputs)

- Remove `stageManifest`/`STAGE_ORDER` as pipeline ordering inputs; treat a mod-authored recipe as canonical.
- The standard pipeline must be packaged as a mod-style package + registry entries (not hard-wired in a standard-library module).
- Remove all residual enablement mechanisms (`stageFlags`, `shouldRun`) and ensure only recipe-driven enablement exists.
- Ensure the executor consumes only a compiled `ExecutionPlan` (no runtime filtering / silent skips).

#### 2. Testing & Verification

- Add Bun smoke tests for:
  - Task Graph pipeline execution against a stub adapter + default recipe+settings selection.
  - Foundation, climate, and overlay steps with deterministic invariants.
- Add regression tests for one or more key Swooper recipe+settings selections to catch breaking changes.

#### 3. Validation & Contract Hardening

- Replace `state:engine.*` dependencies with verifiable `effect:*` tags + targeted adapter-backed verification (see `deferrals.md` DEF-008).
- Expand explicit, TS-canonical products at high-risk boundaries (e.g., `artifact:placementInputs@v1` in DEF-006) and reify engine-derived values when they become cross-step dependencies.

#### 4. Legacy Cleanup & Hygiene

- Remove remaining legacy globals and compatibility shims:
  - StoryTags compatibility layer (DEF-002) and remaining story caches (DEF-012).
  - WorldModel bridge paths and direct `GameplayMap` reads in mapgen-core.
  - Foundation compatibility surface: remove `ctx.foundation`; foundation is addressed via `ctx.artifacts.foundation` / `artifact:foundation` (CIV-62).
- Complete remaining JS/TS cleanup in engine paths.

### Out of Scope (Explicit)

- New algorithm modernization (morphology/hydrology/ecology).
- Recipe UI (in-game) and mod recipe patching/insertion tooling (beyond "pick a recipe and run it").
- Rainfall ownership transfer / climate prerequisite reification (DEF-010); engine adapter reads are acceptable in M4 unless explicitly pulled in.
- Foundation algorithm replacement / Phase B foundation PRD work (DEF-014); M4 only performs the **surface** cutover (remove `ctx.foundation`, expose foundation via `ctx.artifacts.foundation.*` + `artifact:foundation.*`) without changing foundation layer internals.
- Doc-only JS archives under `docs/**/_archive/*`; acceptable to keep, no M4 cleanup required.

### Estimation Guidance for AI Agents

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

## Part II: Implementation Plan

### Execution Phases (Recommended Ordering)

> This is the **execution plan** for M4 (unlock/leverage first; keep the repo runnable after each parent). It does **not** introduce new architecture decisions; it operationalizes the ones already accepted in SPEC/SPIKE.

#### Phase A — Safety + Boundary Scaffolding

*Goal: unlock visibility and land the core boundary skeleton early.*

```yaml
steps:
  - seq: A.1
    issue: CIV-55
    description: Land boundary/compiler skeleton (RunRequest/RecipeV1/ExecutionPlan compiler scaffold).

  - seq: A.2
    issue: CIV-75
    description: Land observability early (step-level tracing foundation).
```

#### Phase B — Config Plumbing + Tag Registry Cutover

*Goal: untangle the nasty knot; unlock effect scheduling.*

```yaml
steps:
  - seq: B.1
    issue: CIV-56
    description: Per-step config plumbing.

  - seq: B.2
    issue: CIV-61
    description: >
      Tag registry/validation cutover so: registry-instantiated tag catalog is canonical,
      effect:* is schedulable + verifiable, demo payloads are supported and validated when present.
```

#### Phase C — Standard Mod Packaging + Runtime Cutover + Smoke Tests

*Goal: leverage completed scaffolding; reduce integration risk.*

```yaml
steps:
  - seq: C.1
    issue: CIV-57
    description: >
      Standard pipeline packaged as a mod-style package + loader/registry wiring
      (own integration touchpoints: CLI/scripts/consumers).

  - seq: C.2
    issue: CIV-58
    description: Runtime cutover to RunRequest → ExecutionPlan (TaskGraph consumes plan).

  - seq: C.3
    issue: CIV-76
    description: >
      Start smoke tests immediately after cutover (Bun smoke tests + CIV-23 re-scope).
      Treat this as the safety rail for legacy deletion.
```

#### Phase D — Legacy Deletion + Dual-Path Removal

*Goal: no legacy left gate.*

```yaml
steps:
  - seq: D.1
    issue: CIV-59
    description: Delete legacy ordering/enablement/config inputs.

  - seq: D.2
    issue: CIV-60
    description: Remove the dual orchestration path.

  - seq: D.3
    issue: null
    description: >
      Re-run/confirm smoke tests pass post-deletion; treat this as the "M4 stays runnable" gate.
```

#### Phase E — Engine-Surface Contracts

*Goal: harden effects + placement (hard knot).*

```yaml
steps:
  - seq: E.1
    issue: CIV-68
    description: Effect tag catalog + adapter postcondition surfaces.

  - seq: E.2
    issue: CIV-69
    description: Biomes/features reification and verification.

  - seq: E.3
    issue: CIV-71
    description: Define artifact:placementInputs@v1.

  - seq: E.4
    issue: CIV-72
    description: Cut placement over to artifact.

  - seq: E.5
    issue: CIV-70
    description: Remove state:engine.* (blocked by placement).
```

#### Phase F — Narrative + Engine-Global Cleanup

*Goal: parallelizable cleanup after cutover is complete.*

```yaml
steps:
  - seq: F.1
    issue: CIV-73
    description: Narrative producers → start after Phase D (legacy deletion) and tag registry cutover.

  - seq: F.2
    issue: CIV-67
    description: >
      Remove/fence GameplayMap reads, GameInfo module-load lookups,
      PlotTags/LandmassRegion globals as "dependency surfaces".

  - seq: F.3
    issue: CIV-74
    description: >
      Narrative consumer migration/cache removal → should land after Phase D (legacy deletion)
      to avoid stage/manifest drift while migrating consumers.
```

---

### Parent Issues

> This milestone should be executed as a small set of parent issues that each leave the mod runnable. Each parent may internally land as a few stacked PR layers, but should preserve a working end-to-end pipeline after each parent completes.

---

#### 1. Pipeline Cutover

```yaml
id: CIV-54
title: "Recipe + ExecutionPlan as the only ordering surface"
estimate: 16
doc: ../issues/CIV-54-M4-PIPELINE-CUTOVER.md
closes: DEF-004
```

**Outcome:** Runtime input is `RunRequest = { recipe, settings }`, compiled into an `ExecutionPlan` that the executor runs (no `stageManifest`/`STAGE_ORDER` ordering input).

**Child Issues:**

```yaml
children:
  - id: CIV-55
    doc: ../issues/CIV-55-M4-pipeline-cutover-1-runrequest.md
    description: RunRequest/RecipeV1/ExecutionPlan compiler scaffold

  - id: CIV-56
    doc: ../issues/CIV-56-M4-pipeline-cutover-2-step-config-schemas.md
    description: Per-step config schema + executor plumbing

  - id: CIV-57
    doc: ../issues/CIV-57-M4-pipeline-cutover-3-standard-mod-packaging.md
    description: Standard mod packaging + loader/registry wiring

  - id: CIV-58
    doc: ../issues/CIV-58-M4-pipeline-cutover-4-runtime-cutover.md
    description: Runtime cutover to RunRequest → ExecutionPlan

  - id: CIV-59
    doc: ../issues/CIV-59-M4-pipeline-cutover-5-remove-legacy-ordering.md
    description: Delete legacy ordering/enablement/config inputs

  - id: CIV-60
    doc: ../issues/CIV-60-M4-pipeline-cutover-6-remove-dual-orchestration.md
    description: Remove dual orchestration path
```

**Acceptance:**

- The default "standard" mod exposes a recipe that fully defines step order + enablement.
- `stageManifest` / `STAGE_ORDER` / `stageConfig` are deleted as runtime inputs; the pipeline is fully described by the mod recipe.
- Any legacy enablement mechanisms (`stageFlags`, `shouldRun`) are deleted; no runtime/test path consults them.
- Standard-mod import surface updates (CLI/scripts/other consumers) are owned by CIV-57 (packaging + loader wiring).

---

#### 2. Tag Registry Cutover

```yaml
id: CIV-61
title: "Registry-instantiated tag catalog + validation (effect:* schedulable)"
estimate: 8
doc: ../issues/CIV-61-M4-TAG-REGISTRY-CUTOVER.md
closes: null
```

**Outcome:** Tags (fields/artifacts/effects) are validated and verified via the instantiated registry tag catalog; `effect:*` participates in scheduling; demo payloads are supported and validated when present.

**Acceptance:**

- Regex/allowlist tag validation and executor hard-coded verification lists are replaced by registry-driven validation/verification.
- `effect:*` is a first-class, schedulable namespace.
- Demo payload validation lives here (fail-fast on invalid demo payload shape when present).

---

#### 3. Foundation Surface Cutover

```yaml
id: CIV-62
title: "Remove ctx.foundation; foundation is monolithic artifact:foundation at ctx.artifacts.foundation"
estimate: 6
doc: ../issues/CIV-62-M4-FOUNDATION-SURFACE-CUTOVER.md
closes: null
```

**Outcome:** Foundation is “just another artifact” on the target architecture surface: `artifact:foundation` is satisfied/verified via `ctx.artifacts`, and there is no top-level `ctx.foundation` surface.

**Acceptance:**

- `ctx.foundation` is removed from the context surface (types + runtime object); no in-repo consumer reads it.
- `artifact:foundation` is satisfied/verified via `ctx.artifacts` (no `context.foundation` special-cases).
- The foundation payload remains monolithic in M4; the split into `artifact:foundation.*` remains deferred per DEF-014.

---

#### 4. Effects Verification

```yaml
id: CIV-63
title: "Replace state:engine.* with verifiable effect:* + reification"
estimate: 16
doc: ../issues/CIV-63-M4-EFFECTS-VERIFICATION.md
closes: DEF-008
```

**Outcome:** Engine-surface prerequisites are explicit `effect:*` tags that participate in scheduling and are verified via adapter-backed postconditions; cross-step data is reified into `field:*` / `artifact:*`.

**Child Issues:**

```yaml
children:
  - id: CIV-68
    doc: ../issues/CIV-68-M4-effects-verification-1-effect-tags.md
    description: Effect tag catalog + adapter postcondition surfaces

  - id: CIV-69
    doc: ../issues/CIV-69-M4-effects-verification-2-biomes-features.md
    description: Biomes/features reification and verification

  - id: CIV-70
    doc: ../issues/CIV-70-M4-effects-verification-3-remove-state-engine.md
    description: Remove state:engine.* from standard pipeline
```

**Acceptance:**

- `state:engine.*` is removed from the target registry/contract surface (migration-only compatibility, if any, is isolated and explicit).
- Highest-risk engine effects (biomes/features/placement) have verifiable `effect:*` tags and minimal postcondition checks.

---

#### 5. Placement Inputs

```yaml
id: CIV-64
title: "Cut placement over to artifact:placementInputs@v1"
estimate: 8
doc: ../issues/CIV-64-M4-PLACEMENT-INPUTS.md
closes: DEF-006
```

**Outcome:** Placement consumes explicit, TS-canonical inputs and publishes a verified `effect:engine.placementApplied`; no implicit engine reads act as the cross-step dependency surface.

**Child Issues:**

```yaml
children:
  - id: CIV-71
    doc: ../issues/CIV-71-M4-placement-inputs-1-define-artifact.md
    description: Define artifact:placementInputs@v1

  - id: CIV-72
    doc: ../issues/CIV-72-M4-placement-inputs-2-cutover.md
    description: Cut placement consumers to artifact
```

**Acceptance:**

- `artifact:placementInputs@v1` exists in the registry; demo payloads are optional (validate when present).
- A derive step produces it from explicit prerequisites.
- Placement requires it and no longer relies on `state:*` scheduling tags.

---

#### 6. Narrative Cleanup

```yaml
id: CIV-65
title: "Narrative/playability artifacts become canonical; StoryTags/caches removed"
estimate: 8
doc: ../issues/CIV-65-M4-NARRATIVE-CLEANUP.md
closes:
  - DEF-002
  - DEF-012
```

**Outcome:** Typed `artifact:narrative.*` products are the canonical playability surface; StoryTags are removed as a dependency surface and caches are context-owned or eliminated.

**Child Issues:**

```yaml
children:
  - id: CIV-73
    doc: ../issues/CIV-73-M4-narrative-cleanup-1-artifacts.md
    description: Define narrative artifacts

  - id: CIV-74
    doc: ../issues/CIV-74-M4-narrative-cleanup-2-remove-storytags.md
    description: Remove StoryTags as dependency surface
```

**Acceptance:**

- All in-repo consumers read (directly or via derived query helpers) from `artifact:narrative.*`.
- StoryTags is either deleted or fenced to explicit compatibility tooling with no consumer correctness dependency.
- Sequencing: CIV-73 may start after CIV-61; CIV-74 should land after CIV-59.

---

#### 7. Safety Net

```yaml
id: CIV-66
title: "Observability baseline + CI tests"
estimate: 4
doc: ../issues/CIV-66-M4-SAFETY-NET.md
closes: null
related:
  - CIV-23
  - CIV-55
```

**Outcome:** We can compile, execute, and debug the pipeline confidently.

**Child Issues:**

```yaml
children:
  - id: CIV-75
    doc: ../issues/CIV-75-M4-safety-net-1-observability.md
    description: Step tracing and observability baseline

  - id: CIV-76
    doc: ../issues/CIV-76-M4-safety-net-2-smoke-tests.md
    description: Bun smoke tests + CIV-23 re-scope
```

**Acceptance:**

- Step tracing can be toggled per step on a shared foundation; run id + plan fingerprint are emitted.
- CI runs a small suite of smoke tests (stub adapter) plus at least one regression-style recipe+settings test.
- Ownership: CI wiring checks for Bun tests and plan fingerprint canonicalization (recipe+settings+step config) live under Safety-Net.

---

#### 8. Engine Boundary Cleanup

```yaml
id: CIV-67
title: "Remove engine-global dependency surfaces (GameplayMap/GameInfo/PlotTags)"
estimate: 8
doc: ../issues/CIV-67-M4-ENGINE-BOUNDARY-CLEANUP.md
closes: null
```

**Outcome:** No cross-step dependency is satisfied by "read global engine state later"; engine-global reads are removed/fenced behind adapter/runtime surfaces (fail-fast) per the accepted engine boundary policy.

**Acceptance:**

- `GameplayMap` fallbacks, module-load-time `GameInfo` lookups, and `PlotTags`/`LandmassRegion` globals are removed or explicitly fenced behind adapter/runtime surfaces (dev/test-only isolated where needed).
- No new engine-global dependency surfaces are introduced; failures are explicit.

---

### Cross-Issue Dependencies

> These sequencing constraints ensure each parent keeps the repo runnable.

```yaml
dependencies:
  - from: CIV-55
    to: CIV-75
    reason: Compiler/plan must exist for plan fingerprint + step-level tracing hooks.

  - from: CIV-58
    to: CIV-76
    reason: Smoke tests should exercise the cutover boundary (RunRequest → ExecutionPlan).

  - from: CIV-75
    to: CIV-76
    reason: Smoke tests depend on observability plumbing and a stable plan fingerprint.

  - from: CIV-76
    to: CIV-59
    reason: Legacy deletion is gated by green smoke tests.

  - from: CIV-61
    to: CIV-62
    reason: >
      Foundation must be a normal registered `artifact:*` dependency satisfied/verified via `ctx.artifacts`.
      Tag registry cutover provides the registry-driven artifact verification path.

  - from: CIV-62
    to: CIV-68
    reason: >
      Foundation surface cutover makes the artifact surface canonical; effects verification should land after
      the contract surface is stabilized.

  - from: CIV-56
    to: CIV-58
    reason: >
      Per-step config plumbing required so recipe config is validated and passed to steps
      (not just parsed and ignored).

  - from: CIV-68
    to: CIV-64
    reason: >
      Effect tags + adapter postcondition surfaces must exist.
      Also depends on any upstream reification needed to build placementInputs@v1 deterministically.

  - from: CIV-61
    to: CIV-65
    reason: Narrative artifacts must be registered in the canonical tag catalog.

  - from: CIV-59
    to: CIV-65
    reason: >
      Schedule after CIV-59 so failures are surfaced via recipe/plan validation
      (not via stage manifest drift). This is cross-phase work.

  - from: CIV-60
    to: CIV-67
    reason: Engine-global cleanup should follow single-path orchestration (no legacy entrypoints).
```

Dependency metadata policy (M4): `blocked_by` is the canonical sequencing source. Use `blocked` only for major gates; treat it as best-effort if it drifts.

---

### Estimate Breakdown

> Per the estimation guidance above, raw file/call-site count does NOT drive estimates. The numbers below are calibrated by complexity and parallelism, not by "how many files are touched."

```yaml
estimates:
  - parent: Pipeline Cutover
    estimate: 16
    complexity_notes: >
      Compiler design and parity verification with legacy ordering, plus per-step config plumbing.

  - parent: Tag Registry Cutover
    estimate: 8
    complexity_notes: >
      Replace regex/allowlist validation with registry-instantiated tag catalog + verification;
      wire demo payload validation; make effect:* schedulable.

  - parent: Foundation Surface Cutover
    estimate: 6
    complexity_notes: >
      Mechanical but cross-cutting consumer migration; ensure no compatibility surface (`ctx.foundation`) survives M4.

  - parent: Effects Verification
    estimate: 16
    complexity_notes: >
      Adapter postcondition query design (CIV-68), registry-driven tag validation,
      first instance of reify pattern.

  - parent: Placement Inputs
    estimate: 8
    complexity_notes: >
      Audit placement input assembly, artifact schema design, adapter invariants
      (DEF-010 reification is post-M4).

  - parent: Narrative Cleanup
    estimate: 8
    complexity_notes: >
      Artifact schema design and cache removal analysis. StoryTags consumer migration is
      high-parallelism; do not inflate estimates purely by file count.

  - parent: Safety Net
    estimate: 4
    complexity_notes: >
      Trace model design and plan fingerprint algorithm.
      Runner decision is settled and does not change complexity.

  - parent: Engine Boundary Cleanup
    estimate: 8
    complexity_notes: >
      Remove/fence module-load globals without reintroducing implicit "read engine later"
      dependency surfaces; keep failures explicit.
```

**Revised total: 74** (vs 28 original, vs 64 if file-count-inflated).

---

### Existing / Related Issue Docs

```yaml
related_issues:
  - id: CIV-23
    doc: ../issues/CIV-23-integration-tests.md
    notes: Will need re-scope to the recipe/ExecutionPlan boundary.

  - id: CIV-53
    doc: ../issues/CIV-53-def-013-enablement-consolidation.md
    notes: Overlaps with CIV-54 and may be merged into it.
```

**Deferrals to close or advance in M4:** DEF-004, DEF-006, DEF-008, DEF-002, DEF-012; DEF-014 is advanced (surface cutover) but not closed (split deferred).

**Remaining remediation items from:**

- `../reviews/M-TS-typescript-migration-remediation.md`
- `../reviews/M-TS-typescript-migration-remediation-review.md`

These may be split or reassigned across milestones as we refine the execution plan.

---

### Triage (Draft)

This triage is a **single list of the things that can still make M4 drift**, grouped to avoid duplication. Each item is labeled:

```yaml
triage_labels:
  - label: "[MUST]"
    meaning: Required to meet M4 "no legacy left"

  - label: "[ISSUE]"
    meaning: Agreed work that still needs a new issue or scope update

  - label: "[NOTE]"
    meaning: Clarifications/risks to document (no new issue yet)

  - label: "[RESOLVED-DECISION]"
    meaning: Decision made; align scope/docs
```

---

#### Pipeline Cutover Gaps (ordering, boundary, inputs)

**[MUST][ISSUE]** Cut the runtime boundary to `RunRequest = { recipe, settings }` and compile to `ExecutionPlan` (executor runs the plan only).

**[MUST][ISSUE]** Delete `stageManifest` / `STAGE_ORDER` / `stageConfig` as runtime ordering/enabling inputs. No compatibility shims survive M4 for these surfaces.

**[NOTE]** This ambiguity kept recurring because DEF-004 originally deferred the recipe boundary and the milestone text wasn't fully rewritten after we accepted recipe-only ordering; treat these legacy inputs as deletion-only in M4.

**[MUST][ISSUE]** Remove dual orchestration paths (`MapOrchestrator` vs executor); ensure only the compiled plan path is used and legacy entrypoints are deleted/fenced.

**[MUST][ISSUE]** Add per-step config schema + executor plumbing so steps can accept typed recipe config (CIV-56).
> This is the replacement for `stageConfig` as the source of step-local knobs (legacy removal is in CIV-59).

**[MUST][ISSUE]** Extract the standard pipeline into a mod-style package + registry/loader wiring (CIV-57); remove hard-wired `standard-library` entrypoints.

**[MUST][ISSUE]** Ensure no runtime/test path still passes `stageFlags`/`shouldRun`; recipe list remains the sole enablement source.

**[RESOLVED-DECISION]** Presets are removed entirely. Canonical entry is recipe + settings selection; no preset resolution/composition remains in M4.

**[MUST][ISSUE]** Delete preset resolution/composition and migrate any usages to explicit recipe+settings selection as the only entry mode (CIV-59).

---

#### Registry + Tag Language Gaps (needed for effects + "no legacy left")

**[MUST][ISSUE]** Replace the M3 fixed allowlist + regex tag validation and executor hard-coded "verified provides" list with the accepted canonical model:
- registry-instantiated tag catalog (fields/artifacts/effects)
- hard collision errors
- optional demo payload validation
- registry-driven verification
- first-class schedulable `effect:*` namespace

> **Ownership:** CIV-61 (new parent; Phase B).

---

#### Effects + `state:engine.*` Cleanup (DEF-008)

**[MUST][ISSUE]** Remove `state:engine.*` from the *standard pipeline* dependency surface entirely.
> If M4 only replaces biomes/features/placement, landmass/coastlines/rivers still leave trusted, unverified scheduling edges → legacy remains.

---

#### Narrative/Playability Cleanup (DEF-002 / DEF-012)

**[MUST][ISSUE]** Replace `artifact:storyOverlays` + StoryTags as the canonical surface with typed `artifact:narrative.*` products, and migrate all in-repo consumers.

**[MUST][ISSUE]** Remove module-level narrative caches/globals (or make them context-owned artifacts keyed to the run). Resetting caches at the orchestrator boundary is a smell to eliminate, not a stable target contract.

---

#### Engine Boundary Gaps (adapter-only + reification-first)

**[MUST][ISSUE]** Eliminate direct engine-global reads as dependency surfaces (or fence them behind adapter/runtime surfaces, with dev/test-only tooling isolated).

> **Ownership:** CIV-67 (new parent; Phase F).

---

#### Testing / Runner / Observability Alignment

**[RESOLVED-DECISION]** Tests for `mapgen-core` use Bun's test runner (invoked via pnpm). Vitest migration, if any, is explicitly post-M4.

**[MUST][ISSUE]** Smoke tests should compile + run the default recipe/plan under a stub adapter and cover the key cutover invariants.

**[MUST][ISSUE]** Plan fingerprint/runId determinism needs an explicit, stable hash/serialization strategy for `settings + recipe + per-step config` so CI does not flake and traces can be correlated.
> **Ownership:** CIV-66 (CIV-75).

---

#### Risks / Potential Derailers

**[NOTE]** Effect verification can balloon if postconditions are missing/expensive. Keep checks minimal and adapter-friendly; prefer "cheap invariants" over full-map scans.

**[NOTE]** Narrative consumer migration can accidentally change outputs (StoryTags removal). Require targeted smoke coverage around the migrated consumers (not just "narrative steps ran").

**[NOTE]** Placement inputs may still require some engine-only reads; if so, ensure those reads are reified immediately and treated as explicit prerequisites (no "read engine later" coupling).

---


## Part III: End-State Outcome

### At the End of M4

When this milestone is complete, the following will be true:

#### What's Been Done

1. **Pipeline is fully recipe-driven.** The runtime accepts `RunRequest = { recipe, settings }` and compiles it to an `ExecutionPlan`. No legacy ordering inputs (`stageManifest`, `STAGE_ORDER`, `stageConfig`, `stageFlags`, `shouldRun`) exist in the runtime contract.

2. **Engine-surface contracts are explicit and verifiable.** `state:engine.*` is no longer part of the target contract surface. Engine mutations are expressed as verifiable `effect:*` tags with adapter-backed postconditions. Cross-step data that used to be "read engine later" is reified into explicit `field:*` / `artifact:*` products.

3. **Legacy globals and fallbacks are removed.** StoryTags is gone as a dependency surface. Module-level caches are context-owned or eliminated. Engine globals (`GameplayMap` fallbacks, `GameInfo` module-load lookups, `PlotTags`/`LandmassRegion`) are removed or explicitly fenced behind adapter/runtime surfaces.

4. **Test coverage exists.** CI runs smoke tests against a stub adapter covering the default recipe/plan. At least one regression-style recipe+settings test catches breaking changes.

5. **Observability baseline exists.** Step tracing can be toggled per step. Run ID and plan fingerprint are emitted for correlation.

#### What Capabilities Exist

- **Recipe-only composition:** Mods can define and provide recipes that fully describe step order, enablement, and per-step config.
- **Fail-fast validation:** Invalid tags, missing dependencies, and effect verification failures manifest as explicit compile-time or runtime errors (no silent skips).
- **Explicit products:** High-risk boundaries (placement, narrative/playability) have TS-canonical artifact definitions that can be inspected and validated.
- **Deterministic tracing:** Runs can be correlated by plan fingerprint; step-level observability supports debugging.

#### What's Gone or Changed

```yaml
changes:
  - before: stageManifest / STAGE_ORDER as ordering inputs
    after: Deleted; recipe is sole ordering source

  - before: stageConfig / stageFlags / shouldRun
    after: Deleted; recipe-driven enablement only

  - before: state:engine.* as a scheduling namespace
    after: Removed from target surface; effect:* is canonical

  - before: StoryTags as the playability dependency surface
    after: artifact:narrative.* is canonical

  - before: Module-level caches reset at orchestrator boundary
    after: Context-owned or eliminated

  - before: Dual orchestration paths (MapOrchestrator vs executor)
    after: "Single path: RunRequest → ExecutionPlan → executor"

  - before: Presets as an entry mode
    after: Deleted; explicit recipe + settings selection only
```

#### From User and System Perspectives

**From the mod author's perspective:** You define a recipe that lists steps by registry ID, optionally with per-step config. The engine compiles and runs exactly that recipe. No hidden stage flags or manifest filtering.

**From the developer's perspective:** The pipeline contract is explicit and verifiable. If a step requires an effect or artifact, the compiler or executor will fail loudly if it's missing. Observability is built in.

**From the system's perspective:** The engine is context-owned and fail-fast. No global state is implicitly shared between steps. Every cross-step dependency is an explicit product.

### Deferrals Closed

- **DEF-004:** Recipe as sole ordering source — resolved.
- **DEF-006:** Placement inputs as explicit artifact — resolved.
- **DEF-008:** `state:engine.*` replaced with verifiable `effect:*` — resolved.
- **DEF-002:** StoryTags removed as dependency surface — resolved.
- **DEF-012:** Narrative caches context-owned or eliminated — resolved.
