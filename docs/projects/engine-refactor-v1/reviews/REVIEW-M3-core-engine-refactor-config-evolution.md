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
- CIV-43 implements the previously placeholder story steps (`storyOrogeny`, `storyCorridorsPre`, `storySwatches`, `storyCorridorsPost`) and gates them via `stageFlags` rather than `shouldRun: () => false`.

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
   - Direction: Remove the fallback (artifact-only) so “canonical rainfall source” stays unambiguous.

3. **`ClimateField` exports `humidity` but it’s not synchronized from engine**
   - `ClimateFieldBuffer` includes `humidity` (`packages/mapgen-core/src/core/types.ts`), but it is not produced/consumed yet.
   - Impact: A consumer can accidentally treat `humidity` as meaningful, creating subtle bugs.
   - Direction: Document `humidity` as an M3 placeholder (and keep consumers off it) or remove it until it has a stable meaning/source.

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

### Follow-up (post-review)

- Tightened hydrology `requires` so `climateBaseline`/`rivers` require `artifact:heightfield`, and `climateRefine` requires `artifact:riverAdjacency` (fail-fast is now meaningful for misordered recipes).
- Added `getPublishedRiverAdjacency()` and updated climate runtime to prefer the published river mask for `radius=1` adjacency checks when available.
- Removed rainfall fallbacks in modernized consumers and the climate runtime: `artifact:climateField` is now the only rainfall read path (missing artifacts fail fast).
- Updated stage dependencies so `biomes` requires `artifact:riverAdjacency` and `features` requires `artifact:climateField`, matching actual data reads.
- Documented `ClimateField.humidity` as an M3 placeholder.
- Ensured the legacy `generateMap()` entry path publishes `artifact:climateField` / `artifact:riverAdjacency` so artifact-only consumers behave consistently even when TaskGraph is disabled.
- Fixed paleo MapContext path by removing the removed `syncClimateField()` call; paleo now requires canonical climate buffers (tests seed buffers explicitly).
- Ensured `storySwatches` republishes `artifact:climateField` after swatches/paleo mutations (so `provides` matches runtime behavior).
- Reset story globals at generation start to avoid cross-run overlay/tag leakage when story stages are selectively enabled.
- Tightened `storyCorridorsPost` stage dependencies to require `artifact:climateField` + `artifact:riverAdjacency` (fail-fast is meaningful for misordered recipes).

---

## CIV-43 – Full Story System Modernization (Corridors, Swatches, Paleo, Steps)

**Reviewed:** 2025-12-15

### Effort Estimate

**Complexity:** Medium-High (3/4) — touches story + hydrology integration, relies on correct stage manifest contracts, and includes global-singleton surfaces that can silently drift.
**Parallelism:** Medium (2/4) — can be assessed in isolation, but gaps here block/complicate CIV-44’s consumer migration work.
**Score:** 8/16 — cross-cutting surfaces, moderate coordination.

---

### Quick Take

**Mostly, with notable gaps:** Corridors/swatches/orogeny ports exist, story stages are real `MapGenStep`s under the Task Graph, and overlays are published via `StoryOverlays`. The major gap is **paleo**: the MapContext path currently calls a removed `syncClimateField()` and will throw when `STORY_ENABLE_PALEO` is enabled.

---

### Intent & Assumptions

- CIV-43 completes the story port (corridors/swatches/paleo) and publishes canonical narrative outputs (`artifact:storyOverlays`), while deferring downstream consumer migration to CIV-44 (DEF-002).
- This review is grounded in the combined state on `CIV-43-full-story-system-modernization-corridors-swatches-paleo-steps`, which also includes CIV-42 hydrology artifact changes.

---

### What’s Strong

- **Real step implementations:** Story placeholder stages are replaced with real steps (`packages/mapgen-core/src/MapOrchestrator.ts`).
- **Canonical overlay snapshots:** `packages/mapgen-core/src/story/overlays.ts` publishes immutable snapshots into both the context and a global registry (M3 compatibility).
- **Basic unit coverage:** Corridors/orogeny/overlays/paleo have focused tests under `packages/mapgen-core/test/story/*`.

---

### High-Leverage Issues

1. **Paleo is currently broken in the MapContext pipeline**
   - `packages/mapgen-core/src/story/paleo.ts` calls `syncClimateField(ctx)`, but `syncClimateField()` now throws (`packages/mapgen-core/src/core/types.ts`).
   - Impact: `storySwatches` with `STORY_ENABLE_PALEO` enabled fails at runtime; the unit test `packages/mapgen-core/test/story/paleo.test.ts` currently exercises the ctx-path and will throw as written.
   - Direction: Remove `syncClimateField()` usage and treat `ctx.buffers.climate` as canonical; keep the `ctx=null` legacy branch only if it’s still an intentional compatibility requirement.

2. **Story corridor contracts under-specify true dependencies**
   - `storyCorridorsPost` requires only `state:engine.coastlinesApplied` (`packages/mapgen-core/src/pipeline/standard.ts`), but its implementation uses river adjacency and rainfall (`packages/mapgen-core/src/story/corridors.ts`).
   - Impact: Misconfigured stage manifests can run corridors without rivers/climate and silently diverge, weakening M3’s “fail fast” contract story and risking downstream ecology/placement consumers.
   - Direction: Require at least `artifact:climateField` and `state:engine.riversModeled`/`artifact:riverAdjacency` for post-rivers corridors; consider also requiring `artifact:storyOverlays` to enforce reset/init ordering.

3. **Global singleton fallback + conditional resets risks cross-run leakage**
   - `artifact:storyOverlays` satisfaction accepts the global registry (`packages/mapgen-core/src/pipeline/tags.ts`), but `resetStoryTags()` / `resetStoryOverlays()` currently run only in the `storySeed` stage (`packages/mapgen-core/src/MapOrchestrator.ts`).
   - Impact: Enabling a story stage without `storySeed` can accumulate stale tags/overlays across generations; hard-to-reproduce behavior and confusing “satisfied” dependency checks.
   - Direction: Either hard-require `storySeed` (or `artifact:storyOverlays`) for all story stages, or reset story state at generation start when any story stage is enabled.

4. **Scope overlap with CIV-44 (downstream impact)**
   - This branch already makes ecology reads artifact-strict (`packages/mapgen-core/src/layers/biomes.ts`, `packages/mapgen-core/src/layers/features.ts`) and registers biomes/features as TaskGraph steps (`packages/mapgen-core/src/MapOrchestrator.ts`).
   - Impact: CIV-44’s “wrap + consume canonical artifacts” scope is partially pre-satisfied here, but it also raises restack/merge conflict risk given CIV-44 is separately stacked on CIV-42.
   - Direction: Clarify what remains for CIV-44 (likely `artifact:storyOverlays` consumption + StoryTags derivation) and ensure branch/stack sequencing reflects that to avoid duplicated effort.

---

### Fit Within the Milestone

- This is directionally correct Stack work for M3: it turns story into explicit, testable pipeline stages and publishes canonical overlays.
- The recurring milestone-level risk is **dependency contracts lagging implementation reality** (especially for story ↔ hydrology coupling), which undermines the executor’s gating guarantees.

---

### Recommended Next Moves

- **Required:** Fix paleo’s MapContext path by removing `syncClimateField()` usage and ensure the ctx-path unit test remains valid.
- **Required:** Tighten `M3_STAGE_DEPENDENCY_SPINE` for story corridor stages to reflect river/climate dependencies (so executor fail-fast is meaningful).
- **Nice-to-have:** Add a gating regression test: enable `storyCorridorsPost` while disabling `rivers`/`climateBaseline` and assert a `MissingDependencyError`.

---

## CIV-44 – Biomes & Features Step Wrapper (Consume Canonical Artifacts)

**Reviewed:** 2025-12-14 | **PR:** [#89](https://github.com/mateicanavra/civ7-modding-tools-fork/pull/89)

### Effort Estimate

**Complexity:** Medium (3/4) — crosses the ecology cluster + “canonical artifacts” boundary; easy to get contracts correct but behavior subtly wrong.
**Parallelism:** Medium-High (3/4) — can be reviewed in isolation, but correctness depends on upstream artifact semantics (CIV-42/43).
**Score:** 6/16 — moderate review scope; a few key touchpoints drive most risk.

---

### Quick Take

**No:** Biomes/features do run as Task Graph steps, but they do **not** meaningfully “consume canonical artifacts” yet. The implementations still read rainfall and river adjacency via the engine adapter and consume narrative signals via the `StoryTags` singleton, while their declared `requires`/`provides` contracts do not reflect those dependencies. This misses several acceptance criteria that were central to Phase B.

---

### Intent & Assumptions

- Wrap biomes + features as `MapGenStep`s executed via `PipelineExecutor` (wrap-first; no algorithm retuning).
- Migrate rainfall/moisture reads to canonical `ClimateField` (vs adapter/engine reads).
- Consume narrative signals via canonical story overlays (`artifact:storyOverlays`), with any `StoryTags` usage strictly derived from overlays (DEF-002).
- Fail fast if dependencies are missing and keep `requires`/`provides` accurate for downstream placement (CIV-45).

---

### What’s Strong

- **Step boundary exists:** `MapOrchestrator` registers `biomes` and `features` as Task Graph steps and executes them via `PipelineExecutor` (`packages/mapgen-core/src/MapOrchestrator.ts`).
- **Canonical tag vocabulary is present:** `M3_DEPENDENCY_TAGS` includes the needed nouns (`artifact:climateField`, `artifact:storyOverlays`, `artifact:riverAdjacency`, `field:*`, `state:*`) even if not fully used yet (`packages/mapgen-core/src/pipeline/tags.ts`).
- **Wrap-first preserved:** The biomes/features algorithms appear unchanged in this milestone end state (no recent edits in `packages/mapgen-core/src/layers/biomes.ts` / `packages/mapgen-core/src/layers/features.ts`).

---

### High-Leverage Issues

1. **Canonical ClimateField consumption is “best-effort”, not contract-enforced**
   - Biomes/features *do* prefer reading rainfall from `ctx.buffers.climate` when upstream stages are enabled (local `readRainfall()` helpers), but they still fall back to adapter reads when buffers are missing or mismatched (`packages/mapgen-core/src/layers/biomes.ts:131`, `packages/mapgen-core/src/layers/features.ts:51`).
   - The step contracts don’t declare (or verify) `field:rainfall` or a concrete “ClimateField is populated” invariant, so the executor can’t fail-fast on “buffer missing” and will silently degrade to engine reads.
   - **Why it matters:** This keeps the system runnable, but it weakens the milestone’s “artifact-first” composability story and increases the risk that CIV-47’s adapter collapse becomes behaviorally sensitive.

2. **Narrative consumption is still via `StoryTags`, not overlays, and not strictly derived**
   - Biomes/features consume `getStoryTags()` (`packages/mapgen-core/src/layers/biomes.ts`, `packages/mapgen-core/src/layers/features.ts`).
   - Overlays currently cover a subset (`margins`, `corridors`) and include global fallback behavior (DEF-003), while `StoryTags` remain a mutable parallel source in multiple story passes (`packages/mapgen-core/src/story/overlays.ts`, `packages/mapgen-core/src/story/tags.ts`, `packages/mapgen-core/src/story/tagging.ts`).
   - **Why it matters:** Consumers can silently depend on global ordering/state; it weakens the “artifact:storyOverlays” contract and makes fail-fast gating less meaningful.

3. **Declared `requires`/`provides` don’t match actual dependencies (and `artifact:riverAdjacency` is stranded)**
   - Default stage contracts come from `M3_STAGE_DEPENDENCY_SPINE` and currently declare:
     - `biomes.requires = [artifact:climateField]` and
     - `features.requires = [state:engine.biomesApplied]`
     (`packages/mapgen-core/src/pipeline/standard.ts` via `packages/mapgen-core/src/bootstrap/resolved.ts`).
   - But the implementations also depend on narrative tags and river adjacency (and on heightfield/climate buffers when present). In code, river adjacency is read from a scratch mask key (`riverAdjacency`) with an adapter fallback, which is *not* represented as `artifact:riverAdjacency` in the pipeline contracts (`packages/mapgen-core/src/layers/biomes.ts:167`, `packages/mapgen-core/src/pipeline/tags.ts`).
   - **Why it matters:** The executor can’t fail fast on missing dependencies if they aren’t declared; downstream steps can run with subtly wrong inputs.
   - **Why it matters:** The executor can’t fail fast on missing dependencies if they aren’t declared; downstream steps can run with subtly wrong inputs.

4. **Testing doesn’t cover the acceptance criteria**
   - There’s no test that asserts biomes/features fail fast when `artifact:climateField` / `artifact:storyOverlays` are missing, or that the outputs match the legacy orchestrator path (wrap-first parity).
   - Existing tests touch signatures and stage-manifest wiring, not dataflow correctness (`packages/mapgen-core/test/layers/callsite-fixes.test.ts`, `packages/mapgen-core/test/bootstrap/resolved.test.ts`).

---

### Fit Within the Milestone

Phase B’s stated goal is “canonical artifacts real for consumers.” CIV-44 currently lands the step boundary, but it does not complete the artifact-consumption cutover. This effectively pushes the hard part of CIV-44 forward into later stacks (especially CIV-46/47), increasing coupling and the risk that adapter collapse becomes a behavioral change instead of a mechanical boundary move.

---

### Recommended Next Moves

- **Required (to meet CIV-44’s AC):** Make the existing “prefer context buffers” paths contract-enforced (and/or eliminate adapter fallbacks in modernized paths) so rainfall/elevation reads are truly artifact-first and fail-fast when required artifacts are absent.
- **Required (to meet CIV-44’s AC):** Update the declared step contracts for `biomes`/`features` (spine and/or manifest overrides) so `requires` matches reality (`artifact:storyOverlays`, `artifact:riverAdjacency`, `artifact:heightfield` / relevant `field:*`).
- **Follow-up (DEF-002/003 correctness):** Enforce “StoryTags derived from overlays” (or explicitly document remaining exceptions) so biomes/features can stop depending on global mutable state.
- **Nice-to-have:** Add a focused gating + parity test: run legacy vs TaskGraph for the ecology stages under a fixed seed/config and assert stable “done” contracts + basic invariants.

---

### Post-review Update (2025-12-15)

The core gaps called out above are now addressed in the branch end state:

- **Artifact consumption is strict:** `designateEnhancedBiomes()` and `addDiverseFeatures()` now require canonical artifacts (not engine reads) and throw if missing (`packages/mapgen-core/src/layers/biomes.ts`, `packages/mapgen-core/src/layers/features.ts`).
- **Contracts match reality:** `M3_STAGE_DEPENDENCY_SPINE` declares `biomes`/`features` dependencies on `artifact:climateField`, `artifact:storyOverlays`, `artifact:heightfield` (and `artifact:riverAdjacency` for biomes), so `PipelineExecutor` gating is meaningful (`packages/mapgen-core/src/pipeline/standard.ts`).
- **StoryTags is hydrated from overlays at the step boundary:** wrappers derive the legacy `StoryTags` view from overlays before running the layer logic (margins/rifts/corridors), aligning with DEF-002 intent (`packages/mapgen-core/src/steps/LegacyBiomesStep.ts`, `packages/mapgen-core/src/steps/LegacyFeaturesStep.ts`).

**Verification:** `pnpm -C packages/mapgen-core check` and `pnpm test:mapgen` pass on this branch.

**Remaining follow-ups:**
- **Hotspot tag derivation:** `features` references `StoryTags.hotspotParadise` / `hotspotVolcanic`, but there’s no corresponding overlay hydration; clarify whether these are expected to be produced/consumed in M3 or should be removed/retired.
- **Coverage:** No focused test asserts ecology-stage gating (e.g., `biomes` enabled without `climateBaseline` yields a `MissingDependencyError`) or wrap-first parity; add a small regression test if this remains a recurring failure mode in later stacks.

---

## CIV-45 – Placement Step Wrapper (Consume Canonical Artifacts)

**Reviewed:** 2025-12-15 | **PR:** [#93](https://github.com/mateicanavra/civ7-modding-tools-fork/pull/93)

### Effort Estimate

**Complexity:** Medium (3/4) — cross-cutting “late pipeline” stage where correctness is mostly contracts + config handoff.
**Parallelism:** High (4/4) — reviewable in isolation once CIV-44 is in; minimal upstream coupling.
**Score:** 6/16 — moderate surface area but clear intent.

---

### Quick Take

**Yes:** Placement is now an explicit `MapGenStep` executed via `PipelineExecutor`, with a concrete `requires`/`provides` contract that prevents running placement without upstream engine-surface prerequisites. The wrapper routes placement tuning through the validated config snapshot (`context.config.foundation.placement`) and preserves the existing placement algorithm by delegating to `runPlacement()`.

---

### Intent & Assumptions

- Wrap placement as a TaskGraph step (wrap-first; no retuning).
- Make placement’s prerequisites explicit via `state:engine.*` tags, so misconfigured manifests fail fast.
- Use config-derived placement tuning (not legacy tunables) as part of the M3 config cutover.

---

### What's Strong

- **Clear step boundary:** `createLegacyPlacementStep()` isolates config binding and orchestration hooks (`beforeRun` / `afterRun`) (`packages/mapgen-core/src/steps/LegacyPlacementStep.ts`).
- **Meaningful gating:** Placement requires `state:engine.coastlinesApplied`, `state:engine.riversModeled`, and `state:engine.featuresApplied`, so it won’t run in “half-built” worlds (`packages/mapgen-core/src/pipeline/standard.ts`).
- **Single implementation reused:** Both legacy and TaskGraph orchestrator paths route through the same `runPlacement()` callsite, reducing drift risk (`packages/mapgen-core/src/MapOrchestrator.ts`).
- **Verification:** `pnpm -C packages/mapgen-core check` and `pnpm test:mapgen` pass on this branch.

---

### High-Leverage Issues

1. **Config location ambiguity for `placement`**
   - Code reads `context.config.foundation.placement`, but `MapGenConfigSchema` also exposes top-level `placement` and `buildTunablesFromConfig()` does not currently merge top-level `placement` into `foundation` (unlike other layer blocks).
   - **Impact:** Mod authors can specify `placement` at the top level and see no effect; docs/schema risk drifting from behavior.
   - **Direction:** Either merge top-level `placement` into `foundation.placement` (like `mountains`, `story`, etc.) or explicitly deprecate top-level `placement` in schema/docs.

2. **Duplicate `storeWaterData()` invocation**
   - `MapOrchestrator` calls `storeWaterData()` before placement, but `runPlacement()` also calls it internally (`packages/mapgen-core/src/MapOrchestrator.ts`, `packages/mapgen-core/src/layers/placement.ts`).
   - **Impact:** At best redundant work; at worst, subtle ordering/side-effect drift between legacy vs step-wrapped callsites.
   - **Direction:** Make one layer responsible (prefer: keep it inside `runPlacement()` and remove the pre-call), or gate via an adapter “already computed” check.

3. **Unconditionally noisy debug logging in `runPlacement()`** (Nice-to-have)
   - `runPlacement()` prints large logs (including ASCII maps + start debug stats) regardless of diagnostics flags (`packages/mapgen-core/src/layers/placement.ts`).
   - **Impact:** Harder-to-read logs and potential perf cost in repeated runs/tests.
   - **Direction:** Gate behind `foundation.diagnostics` / `DEV.ENABLED` or a dedicated placement diagnostics toggle.

4. **No placement-specific gating regression test** (Nice-to-have)
   - Current tests validate generic executor gating, but not that `placement` fails fast when `features` is disabled / prerequisites missing.
   - **Direction:** Add a small test enabling `placement` while disabling `features` and assert a `MissingDependencyError` for `state:engine.featuresApplied`.

---

### Fit Within the Milestone

- Correct sequencing after CIV-44: makes the pipeline end-to-end runnable under the executor and forces placement to be “contract-honest”.
- Reinforces the milestone approach: late-stage systems should be guarded by explicit state tags rather than implicit orchestrator ordering (supports CIV-46’s config evolution and future adapter-collapse work).

---

### Recommended Next Moves

- **Follow-up:** Resolve `placement` config canonical location (merge vs deprecate) so mod-facing config does what the schema suggests.
- **Nice-to-have:** De-dup `storeWaterData()` ownership to reduce drift risk.
- **Nice-to-have:** Add a placement gating regression test.

---

### Post-review update (2025-12-15)

- **Placement config resolution:** Placement now deep-merges top-level `config.placement` over `config.foundation.placement` so schema + behavior align (applies to both legacy and TaskGraph callsites).
- **De-dup water data ownership:** Removed the pre-placement `storeWaterData()` calls in `MapOrchestrator`; `runPlacement()` remains the single owner.
- **Tamed placement logs:** Gated terrain stats, ASCII map output, and `[START_DEBUG]` logs behind `DEV.ENABLED`.
- **Coverage:** Added a focused gating regression test that asserts placement fails fast when `state:engine.featuresApplied` is missing.

**Verification:** `pnpm -C packages/mapgen-core check`, `pnpm test:mapgen`.

---

## CIV-46 – Config Evolution (Phase 2/3) + Presets/Recipes + Tunables Retirement

**Reviewed:** 2025-12-15 | **PR:** [#88](https://github.com/mateicanavra/civ7-modding-tools-fork/pull/88)

### Effort Estimate

**Complexity:** High (4/4) — large, cross-cutting config + orchestrator change where risk is silent behavior drift (defaults, gating, and docs).
**Parallelism:** Medium (2/4) — depends on earlier M3 wrappers/contracts; review is straightforward once the full M3 stack is present.
**Score:** 10/16 — broad surface area and coordination.

---

### Quick Take

**Yes, with notable clarity gaps:** Tunables are fully retired, presets are real and tested, and the orchestrator/steps now consistently consume validated `context.config` aligned to the phase/stage schema. The remaining risk is developer ergonomics: defaults and docs currently make it easy to misconfigure stage gating or infer capabilities that don’t exist (yet).

---

### Intent & Assumptions

- Finish the M3 config cutover: validated `MapGenConfig` is the single config surface for steps and layers.
- Implement preset resolution (`presets: [...]`) as deterministic deep merges over a canonical baseline.
- Reshape `MapGenConfigSchema` to be step/phase-aligned and update in-repo scripts to match.
- Retire tunables (no legacy compatibility path shipped as “supported” for M3).

---

### What's Strong

- **Real cutover, not a shim:** `packages/mapgen-core/src/bootstrap/tunables.ts` and its tests are removed; `getTunables()` callsites are gone.
- **Config is now “in-context”:** Layers and step wrappers read from `ctx.config` (e.g., `packages/mapgen-core/src/layers/*.ts`, `packages/mapgen-core/src/steps/LegacyPlacementStep.ts`).
- **Presets are implemented + validated:** Preset composition happens in bootstrap (`packages/mapgen-core/src/config/presets.ts`, `packages/mapgen-core/src/bootstrap/entry.ts`) and is covered by tests (`packages/mapgen-core/test/bootstrap/entry.test.ts`).
- **Stage gating bridge is explicit:** `stageConfig → stageManifest` resolution is centralized and tested (`packages/mapgen-core/src/bootstrap/resolved.ts`, `packages/mapgen-core/test/bootstrap/resolved.test.ts`).
- **Verification:** `pnpm -C packages/mapgen-core check` and `pnpm test:mapgen` pass on this branch.

---

### High-Leverage Issues

1. **Docs/examples still imply “no stage config required”**
   - `bootstrap()` docs and orchestrator examples omit `stageConfig`, but the M3 design here intentionally defaults to “all stages disabled unless enabled”.
   - **Impact:** New callers can copy examples and get a no-op pipeline (or misinterpret why stages aren’t running).
   - **Direction:** Update examples/docs to include a minimal `stageConfig` for the intended recipe, or explicitly call out “defaults to disabled stages” wherever `bootstrap({})` appears (e.g., `packages/mapgen-core/src/bootstrap/entry.ts`, `packages/mapgen-core/src/MapOrchestrator.ts`, and `docs/system/mods/swooper-maps/architecture.md`).

2. **Silent `stageConfig` key drift encourages misconfiguration**
   - `stageConfig` is effectively `Record<string, boolean>`, and unknown keys are silently ignored; in-repo callers already carry a stray key (`storyPaleo`) that does nothing (`mods/mod-swooper-maps/src/swooper-earthlike.ts`).
   - **Impact:** False confidence and hard-to-debug configuration errors (especially for mod authors).
   - **Direction:** Add a runtime warning for unknown `stageConfig` keys in `resolveStageManifest()`, and/or tighten typing by exporting a `StageName` union derived from `STAGE_ORDER`.

3. **Preset semantics are under-specified vs “recipes” framing** (Nice-to-have)
   - Presets currently express some toggles + a minimal `stageConfig` (foundation/plates) but do not map to a named, end-to-end “standard recipe”.
   - **Impact:** “Preset” may be assumed to imply a runnable pipeline configuration; today it’s mostly parameter defaults.
   - **Direction:** Document the intended separation (presets = parameter defaults; recipe/stageConfig = execution), or introduce a small “recipe” helper that emits canonical `stageConfig` sets (keep this as a follow-up; avoid re-scoping CIV-46).

---

### Fit Within the Milestone

- This is the milestone’s “keystone” task: it makes the step-wrapper work from CIV-41–45 sustainable by removing hidden config plumbing and forcing all stages to consume the same validated config snapshot.
- The explicit stage-manifest bridge aligns with the TaskGraph contract model and makes gating failures visible (good prerequisite for CIV-47 and later adapter-collapse work).

---

### Recommended Next Moves

- **Follow-up:** Update docs/examples to match the new “stages disabled by default” posture and remove lingering tunables/runtime-store explanations that no longer apply.
- **Follow-up:** Add unknown-stage warnings (or stricter types) for `stageConfig` to prevent silent misconfigurations.
- **Nice-to-have:** Document (or encode) a canonical “standard recipe” stageConfig so `presets` + “recipe” reads as a coherent mental model.

### Post-review update (2025-12-15)

- **Docs/examples:** Updated `bootstrap()` and `MapOrchestrator` examples to include a minimal runnable `stageConfig` and clarified that M3 stages default to disabled.
- **Misconfiguration guardrails:** Added a runtime warning for unknown `stageConfig` keys in `resolveStageManifest()` and exported `StageName`/`StageConfig` types for stricter callsite typing.
- **In-repo callers:** Removed the stray `storyPaleo` key from Swooper map entry configs (paleo is a toggle, not a stage in M3) and fixed the bootstrap unit test to use `climateBaseline`.
- **Deferred:** Preset vs recipe semantics (canonical “standard recipe”) remains a follow-up; avoid expanding CIV-46 scope further.

---

## CIV-47 – [M3] Adapter Boundary Collapse (EngineAdapter absorbs OrchestratorAdapter)

**Reviewed:** 2025-12-15 | **PR:** [#94](https://github.com/mateicanavra/civ7-modding-tools-fork/pull/94)

### Effort Estimate

**Complexity:** Medium (3/4) — cross-package API change (adapter + orchestrator + tests) where risk is subtle runtime coupling and type drift.
**Parallelism:** Medium-high (3/4) — review can proceed independently once CIV-46’s config/plumbing is stable.
**Score:** 9/16 — meaningful surface area, moderate coordination.

---

### Quick Take

**Mostly, with notable gaps:** The adapter collapse is real (no `OrchestratorAdapter` remains in runtime code), and map-init/map-info responsibilities now flow through the single `EngineAdapter` boundary as intended. However, the branch currently fails `pnpm test:mapgen` on an immutability assertion for `STAGE_ORDER`, and there’s a type-level inconsistency around map-size IDs (`GameplayMap.getMapSize(): string` vs `EngineAdapter.getMapSizeId(): number`) that will confuse future adapter implementations.

---

### Intent & Assumptions

- Collapse `MapOrchestrator`’s internal “map-init adapter” into the canonical `EngineAdapter` boundary.
- Move map size/info lookup + `SetMapInitData` behind the adapter boundary (Civ7 + mock).
- Keep behavior stable aside from moving calls behind the boundary.
- Assume the canonical “single adapter” design is `docs/system/libs/mapgen/architecture.md`.

---

### What’s Strong

- **Single boundary is enforced:** `MapOrchestrator` now depends only on `EngineAdapter` (no internal adapter types, no direct engine globals).
- **API is testable:** `@civ7/adapter` gains explicit map-init/map-info surface (`getMapSizeId`, `lookupMapInfo`, `setMapInitData`), and `MockAdapter` records calls for assertions.
- **Safety rails exist:** `scripts/lint-adapter-boundary.sh` continues to enforce `/base-standard/...` isolation (with a clearly scoped allowlist for the Bun test harness).
- **Checks:** `pnpm -C packages/civ7-adapter check`, `pnpm -C packages/mapgen-core check`, and `pnpm lint:adapter-boundary` pass on this branch.

---

### High-Leverage Issues

1. **`pnpm test:mapgen` currently fails on this branch**
   - `bootstrap/resolved.test.ts` asserts `Object.isFrozen(STAGE_ORDER) === true`, but `STAGE_ORDER` is not runtime-frozen (`packages/mapgen-core/src/bootstrap/resolved.ts`).
   - **Impact:** The stack is not green; this blocks merge confidence for CIV-47 and anything upstack.
   - **Direction:** Either freeze `STAGE_ORDER` at definition-time or drop the immutability expectation (prefer freezing to keep “canonical order” truly canonical).

2. **Map-size ID typing is internally inconsistent**
   - `packages/civ7-types/index.d.ts` defines `GameplayMap.getMapSize(): string`, but `EngineAdapter.getMapSizeId()` is typed as `number` and `MockAdapterConfig.mapSizeId` follows suit.
   - **Impact:** Future non-Civ7 adapters (and tests) will implement the “wrong” shape, and callsites may accidentally assume numeric semantics.
   - **Direction:** Align on `string | number` (or a dedicated `MapSizeKey` type) across `@civ7/types`, `@civ7/adapter`, and orchestrator options.

3. **“No OrchestratorAdapter references remain” is true for runtime code, not the entire repo**
   - References still exist in slide/review artifacts (e.g., `docs/slides/m3-core-engine-refactor-config-evolution.*`, `docs/projects/engine-refactor-v1/reviews/REVIEW-M2-stable-engine-slice.md`).
   - **Impact:** If the acceptance criterion is interpreted literally (“entire codebase”), it isn’t met; if it’s meant as “runtime code”, it should be clarified.
   - **Direction:** Clarify the criterion or update slide content to frame OrchestratorAdapter as “Before (transient)” history (don’t erase useful historical review notes).

4. **`@swooper/mapgen-core` remains hard to consume outside Civ7 without stubbing** (Follow-up)
   - Importing `MapOrchestrator` eagerly pulls in `@civ7/adapter/civ7` (and its `/base-standard/...` module specifiers), requiring the Bun test harness mocks.
   - **Impact:** Limits “pure TS library” ergonomics for non-Civ7 adapters and external tooling.
   - **Direction:** Consider lazy-loading the Civ7 adapter or splitting engine-facing orchestration into a separate package in a later milestone (avoid re-scoping CIV-47 unless required).

---

### Fit Within the Milestone

- This is the right sequencing after CIV-46: once config is validated and stage gating is explicit, collapsing the adapter boundary reduces “hidden Civ7 seams” and enables cleaner test harnesses and future non-Civ7 adapters.
- The test failure suggests some milestone-level hygiene drift: stack PRs are being marked “done” without the full `pnpm test:mapgen` suite staying green.

---

### Recommended Next Moves

- **Fix now:** Make `pnpm test:mapgen` green by addressing the `STAGE_ORDER` immutability expectation.
- **Follow-up:** Normalize map-size key typing across `@civ7/types` ↔ `@civ7/adapter` ↔ orchestrator options.
- **Follow-up:** Clarify whether “no OrchestratorAdapter references remain” applies to runtime code only or to the entire repo (docs/slides).
