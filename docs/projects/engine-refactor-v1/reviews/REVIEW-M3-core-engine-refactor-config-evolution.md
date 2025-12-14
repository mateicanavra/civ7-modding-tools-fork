---
id: M3-core-engine-refactor-config-evolution-review
milestone: M3-core-engine-refactor-config-evolution
title: "M3: Core Engine Refactor & Config Evolution — Aggregate Review"
status: draft
reviewer: AI agent (Codex CLI)
---

# M3: Core Engine Refactor & Config Evolution — Aggregate Review (Running Log)

This running log captures task-level reviews for milestone M3. Entries focus on
correctness, completeness, sequencing fit, and forward-looking risks.

---

## CIV-41 – Task Graph MVP: Pipeline Primitives + Standard Entry

**Reviewed:** 2024-12-14 | **PR:** [#87](https://github.com/mateicanavra/civ7-modding-tools-fork/pull/87)

### Effort Estimate

**Complexity:** Low-Medium (2/4) — clear contract, minimal coordination, one new module tree with well-scoped integration into existing orchestrator.
**Parallelism:** High (4/4) — no blockers; downstream M3 issues can proceed once this merges.
**Score:** 3/16 — fast, low-risk foundational work.

---

### Quick Take

**Yes:** CIV-41 meaningfully satisfies its acceptance criteria. The Task Graph primitives (`MapGenStep`, `StepRegistry`, `PipelineExecutor`) are implemented, runtime `requires`/`provides` gating with fail-fast errors is in place, the canonical dependency tag spine is defined, and a standard executor entry path is wired into `MapOrchestrator` via `useTaskGraph: true`. The legacy orchestrator path remains fully runnable.

---

### Intent & Assumptions

- Land `MapGenStep`/`StepRegistry`/`PipelineExecutor` as the M3 execution spine (wrap-first, no algorithm changes).
- Derive a "standard recipe" from `STAGE_ORDER` + resolved `stageManifest` enablement.
- Keep orchestrator legacy entry runnable during transition.
- Enforce runtime gating: missing `requires` → `MissingDependencyError`; unsatisfied `provides` → `UnsatisfiedProvidesError`.

---

### What's Strong

- **Clean primitive design:** `MapGenStep<TContext>` is minimal and composable (`id`, `phase`, `requires`, `provides`, `shouldRun`, `run`). The type is generic over context, future-proofing for potential context extensions.
- **Comprehensive error surface:** Six distinct error classes (`DuplicateStepError`, `UnknownStepError`, `InvalidDependencyTagError`, `UnknownDependencyTagError`, `MissingDependencyError`, `UnsatisfiedProvidesError`) provide precise failure messages.
- **Tag namespace enforcement:** `validateDependencyTag()` enforces `artifact:*`, `field:*`, `state:engine.*` namespaces with regex validation + allowlist gating. This catches typos at registration time.
- **Dual execution paths:** `PipelineExecutor.execute()` (sync) and `executeAsync()` exist; sync path errors on Promise return for safety.
- **Provides verification:** After each step, concrete `provides` tags (foundation, storyOverlays, field:*) are checked against context state — not just trusted.
- **Standard recipe integration:** `StepRegistry.getStandardRecipe(stageManifest)` filters by enabled stages; `generateMapTaskGraph()` registers all 21 stages as wrap-first steps.
- **Smoke test:** `task-graph.smoke.test.ts` validates the executor entry path with a mock adapter.

---

### High-Leverage Issues

1. **Code duplication between `execute()` and `executeAsync()`**
   The two methods share ~95% logic. Consider extracting a shared `_runStep()` helper or using an async-first design with a sync wrapper.
   *Impact:* Maintenance burden; easy to drift.
   *Severity:* Low (cosmetic).

2. **Placeholder steps with `shouldRun: () => false`**
   `storyOrogeny`, `storyCorridorsPre`, `storySwatches`, `storyCorridorsPost` are registered but always skipped. They satisfy the issue's "register wrap-first steps" requirement, but downstream issues must remember to flip them on.
   *Impact:* Acceptable for M3 scope; just needs tracking.

3. **`provides` verification is partial**
   Only `artifact:foundation`, `artifact:storyOverlays`, and `field:*` tags are verified post-run (lines 83–96 in `PipelineExecutor.ts`). `state:engine.*` tags are trusted because no context property exists to check them against. This is documented implicitly but not explicitly.
   *Impact:* A step could declare `provides: ["state:engine.riversModeled"]` and not actually call the engine method. The executor won't catch it.
   *Mitigation:* Acceptable for M3 (wrap-first); M4 should add engine-surface verification or explicit "trust markers."

4. **`M3_STAGE_DEPENDENCY_SPINE` vs runtime registration mismatch risk**
   The spine in `standard.ts` is the source of truth for `requires`/`provides`, but `generateMapTaskGraph()` pulls from `stageManifest.stages[stageName]` via `getStageDescriptor()`. If `resolveStageManifest()` doesn't correctly propagate spine data, contracts could diverge.
   *Current state:* `resolveStageManifest()` does pull from `M3_STAGE_DEPENDENCY_SPINE` (lines 78–87 in `resolved.ts`), so this is correctly wired.

5. **No integration test for `MissingDependencyError` path**
   The smoke test only runs the happy path. A test that disables `foundation` but enables `landmassPlates` would validate the fail-fast gating.
   *Impact:* Low risk (code is straightforward), but would increase confidence.

---

### Fit Within the Milestone

CIV-41 is the correct Phase A foundational work. It unblocks Stacks 2–7:

- **CIV-42–45:** Can now register steps that consume/produce canonical artifacts.
- **CIV-46:** Config evolution can align with the executor's recipe model.
- **CIV-47:** Adapter collapse can proceed once the executor is the primary path.

No scope creep or backward push detected. The issue's "locked decisions" (recipe source of truth, runtime enforcement scope, mod-facing recipe surface, tag naming conventions) are all honored.

---

### Recommended Next Moves

- **Nice-to-have (post-merge):** Add a unit test for `MissingDependencyError` gating.
- **Nice-to-have (post-merge):** Deduplicate `execute()`/`executeAsync()` logic.
- **Follow-up (M4):** Add verification for `state:engine.*` tags or document the trust model explicitly.
- **Follow-up (CIV-42+):** Flip placeholder steps to real implementations as their issues land.

