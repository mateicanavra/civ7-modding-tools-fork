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

1. **TaskGraph gating failures don’t surface well in `stageResults`**
   `PipelineExecutor` correctly throws `MissingDependencyError` (and will throw for invalid tags), but `generateMapTaskGraph()` catches and returns `success: false` without turning that into a structured `StageResult` entry. This makes failures harder to triage, and weakens the “deterministic trace” story.
   *Impact:* Debuggability/observability gap right where M3 is trying to tighten contracts.

2. **No test for the `MissingDependencyError` path**
   Current smoke coverage exercises only the happy path (`foundation`). A minimal test that enables `landmassPlates` but disables `foundation` would validate fail-fast gating end-to-end (and incidentally validate the above error surfacing once implemented).
   *Impact:* Confidence gap; easy to regress as more steps land.

3. **`provides` verification is partial**
   Only `artifact:foundation`, `artifact:storyOverlays`, and `field:*` tags are verified post-run; `state:engine.*` tags are trusted because there’s nothing in context to validate them against.
   *Impact:* A step can claim it “modeled rivers” without actually doing so and still satisfy downstream `requires`.
   *Mitigation:* Acceptable for wrap-first M3, but the trust model should be explicit (doc or code).

4. **Placeholder story steps are registered but always skipped**
   `storyOrogeny`, `storyCorridorsPre`, `storySwatches`, `storyCorridorsPost` use `shouldRun: () => false`. This satisfies the “register wrap-first steps” deliverable, but downstream issues must flip them on (and should ensure their contracts match the real implementations).
   *Impact:* Low; just tracking/coordination.

5. **Docs/schema mismatch risk: `requires` language vs runtime validator**
   `StageDescriptorSchema` describes `requires` as potentially including “stage ids”, but runtime validation only accepts canonical dependency tags (and only those enumerated in `M3_DEPENDENCY_TAGS`).
   *Impact:* Potential confusion for mod authors and future maintainers.

6. **Code duplication between `execute()` and `executeAsync()`**
   The two executor methods share most logic; this is low-risk now but will be annoying to evolve.
   *Impact:* Maintenance burden; easy to drift.
   *Severity:* Low (cosmetic).

---

### Fit Within the Milestone

CIV-41 is the correct Phase A foundational work. It unblocks Stacks 2–7:

- **CIV-42–45:** Can now register steps that consume/produce canonical artifacts.
- **CIV-46:** Config evolution can align with the executor's recipe model.
- **CIV-47:** Adapter collapse can proceed once the executor is the primary path.

No scope creep or backward push detected. The issue's "locked decisions" (recipe source of truth, runtime enforcement scope, mod-facing recipe surface, tag naming conventions) are all honored.

---

### Recommended Next Moves

- **Required (for M3 usability):** When `PipelineExecutor` throws (e.g., `MissingDependencyError`), surface a structured failure entry in `stageResults` (step id + message) instead of returning an empty trace.
- **Nice-to-have (post-merge):** Add a test for `MissingDependencyError` gating (enable `landmassPlates` but disable `foundation`).
- **Nice-to-have (post-merge):** Align `StageDescriptorSchema` wording with the canonical tag-only contract (or explicitly document stage-id dependencies as unsupported in M3).
- **Nice-to-have (post-merge):** Deduplicate `execute()`/`executeAsync()` logic.
- **Follow-up (M4):** Add verification for `state:engine.*` tags or document the trust model explicitly.
- **Follow-up (CIV-42+):** Flip placeholder steps to real implementations as their issues land.

### Update

- `generateMapTaskGraph()` now records a structured failure entry in `stageResults` when the executor throws (uses `stepId` when available).
- Added a regression test for the missing-`requires` path (`landmassPlates` enabled while `foundation` is disabled).
- Aligned `StageDescriptorSchema` wording to reflect tag-only `requires`/`provides` in M3 and note the current trust model for `state:engine.*`.

---

## CIV-42 – Hydrology Productization (ClimateField + River Artifacts)

**Reviewed:** 2025-12-14

### Effort Estimate

**Complexity:** Medium (3/4) — touches the orchestrator pipeline boundary, dependency spine, runtime gating, and consumer read paths; correctness depends on contracts staying aligned as later stacks land.
**Parallelism:** Medium-High (3/4) — mostly independent, but the “consumer migration” aspect intersects with CIV-43/CIV-44 sequencing.
**Score:** 6/16 — moderate uncertainty, moderate coordination.

---

### Quick Take

**Mostly, with notable gaps:** The core deliverables land: `artifact:climateField` is published as the canonical rainfall surface, a minimal `artifact:riverAdjacency` mask is published from engine rivers, the hydrology stages run via `PipelineExecutor`, and provides verification is covered by focused tests. The remaining gaps are primarily **contract fidelity** (spine `requires`/`provides` under-specifies real dependencies) and **consumer migration completeness** (some “modernized” paths still call `adapter.getRainfall()` / `adapter.isAdjacentToRivers()` directly).

---

### Intent & Assumptions

- “Productize hydrology” means downstream steps can depend on hydrology outputs via `artifact:*` tags, with runtime fail-fast gating.
- Wrap-first in M3 implies no algorithm swaps: publish artifacts from existing TS climate passes + engine-owned rivers.
- CIV-43/CIV-44 will continue migrating story/ecology consumers onto these artifacts.

---

### What’s Strong

- **Clear product publication:** `packages/mapgen-core/src/pipeline/artifacts.ts` centralizes publication of `artifact:climateField` and `artifact:riverAdjacency`.
- **Runtime contract enforcement improved:** `PipelineExecutor` verifies `artifact:climateField` / `artifact:riverAdjacency` provides post-step, preventing “declared-but-not-published” footguns.
- **Minimal, stable river artifact:** `computeRiverAdjacencyMask()` produces the intended `Uint8Array` 0/1 mask (M3-appropriate shape).
- **Consumer read migration started:** Biomes/features now prefer `ClimateField` via `getPublishedClimateField()` rather than engine rainfall.
- **Docs updated in the right place:** `docs/system/libs/mapgen/hydrology.md` captures the M3 wrap-first boundary and artifact intent.
- **Targeted tests:** `packages/mapgen-core/test/pipeline/artifacts.test.ts` covers satisfaction semantics and provides enforcement for the new artifacts.

---

### High-Leverage Issues

1. **Spine `requires` does not reflect real dependencies (weakens “fail fast”)**
   - Example: `rivers` requires only `artifact:foundation` (`packages/mapgen-core/src/pipeline/standard.ts`), but its correctness depends on the engine surface being in a post-terrain/heightfield state (and likely on earlier morphology/coastline outcomes).
   - Impact: The executor can “successfully” run an invalid recipe ordering without tripping gating, undermining M3’s contract story.
   - Direction: Tighten `M3_STAGE_DEPENDENCY_SPINE` for hydrology steps to require the minimal, true prerequisites (e.g. `artifact:heightfield` and/or the relevant `state:engine.*` tags).

2. **Rainfall canonicalization is incomplete across “modernized” logic**
   - `designateEnhancedBiomes()` / `addDiverseFeatures()` fall back to `adapter.getRainfall(...)` when `artifact:climateField` is not published (`packages/mapgen-core/src/layers/biomes.ts`, `packages/mapgen-core/src/layers/features.ts`).
   - Impact: The TaskGraph path should fail-fast before hitting the fallback (due to `requires: artifact:climateField`), but the fallback keeps legacy/non-pipeline calls able to silently diverge from the published artifact.
   - Direction: Either remove the fallback (artifact-only) or make it explicitly legacy-only (clear guard + tests) so “canonical rainfall source” stays unambiguous.

3. **`ClimateField` exports `humidity` but it’s not synchronized from engine**
   - `ClimateFieldBuffer` includes `humidity` (`packages/mapgen-core/src/core/types.ts`), but `syncClimateField()` only refreshes rainfall.
   - Impact: A consumer can accidentally treat `humidity` as meaningful, creating subtle bugs.
   - Direction: Either document `humidity` as “internal/unused placeholder” (and keep consumers off it) or remove it until it has a stable meaning/source.

4. **River artifact is published but not yet used as the canonical read path**
   - `artifact:riverAdjacency` is published and validated, but ecology consumers still call `adapter.isAdjacentToRivers(...)` directly (`packages/mapgen-core/src/layers/biomes.ts`).
   - Impact: Downstream steps won’t actually benefit from the artifact unless consumers switch over; also makes “wrap-first portability” less real.
   - Direction: Treat this as an explicit dependency for CIV-44 (or document the handoff in CIV-42/CIV-44).

---

### Fit Within the Milestone

- This is the right Stack 2 “product spine” work for Phase B: it establishes the artifacts CIV-44/45 need to become real step consumers.
- The recurring risk pattern (also visible in later stacks) is **contracts lagging implementation reality**: if the dependency spine isn’t continuously tightened as consumers migrate, M3’s runtime gating will provide less protection than intended.

---

### Recommended Next Moves

- **Required (to uphold AC intent):** Tighten hydrology stage `requires` in `packages/mapgen-core/src/pipeline/standard.ts` (and thus `resolveStageManifest()`) so “fail fast” is meaningful for misordered recipes.
- **Nice-to-have:** Add a `getPublishedRiverAdjacency()` helper alongside `getPublishedClimateField()` to standardize consumption.
- **Follow-up (likely CIV-43/CIV-44):** Complete rainfall/river migration for any step-executed consumers still calling engine reads; clarify ownership so CIV-42 doesn’t appear “done” while still leaving critical consumers behind.
