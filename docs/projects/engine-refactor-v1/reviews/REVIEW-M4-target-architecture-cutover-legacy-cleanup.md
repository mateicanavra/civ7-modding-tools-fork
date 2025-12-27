---
id: M4-review
milestone: M4
status: draft
reviewer: AI agent
---

# M4: Target Architecture Cutover & Legacy Cleanup — Aggregate Review (Running Log)

This running log captures task-level reviews for milestone M4. Entries focus on
correctness, completeness, sequencing fit, and forward-looking risks.

---

## CIV-55 — [M4] Pipeline cutover: introduce RunRequest + RecipeV1 + ExecutionPlan compiler

**Reviewed:** 2025-12-23

- **Intent:** Introduce RunRequest/RecipeV1 boundary types and a TypeBox compiler to ExecutionPlan without changing the runtime path.
- **Strengths:** Compiler/TypeBox validation + structured error type; exports via pipeline index; unit tests cover unknown step IDs and config validation; no runtime wiring changes.
- **Gaps:** SPEC still documents `compileExecutionPlan` under `core/compiler` rather than the actual `pipeline/execution-plan` location, so the "document public APIs where they live today" criterion is unmet.
- **Follow-up:** Update SPEC/architecture docs to reflect the current export surface and location (or explicitly note the temporary placement).
- **Update (2025-12-23):** SPEC now references `pipeline/execution-plan` and the `@mapgen/pipeline` import surface for `compileExecutionPlan`.

## CIV-56 — [M4] Pipeline cutover: per-step config schemas + executor plumbing

**Reviewed:** 2025-12-23

- **Intent:** Make per-step config authoritative: steps own TypeBox schemas, the compiler validates/normalizes recipe config into the ExecutionPlan, and the executor passes resolved config into `step.run`.
- **Strengths:** Step definitions now carry schemas; compiler normalizes per-step config and surfaces structured errors; TaskGraph builds a standard RunRequest from MapGenConfig and executes via `executePlan`; unit tests cover schema validation and config propagation to `step.run`.
- **Gaps:** `normalizeStepConfig` treats `null` config as `{}`, so invalid `config: null` inputs bypass schema validation and are silently accepted.
- **Follow-up:** Add an unknown-key rejection test (acceptance criteria) and a guard that rejects `null` configs instead of defaulting to `{}`.
- **Update (2025-12-23):** Added null-config rejection guard in `normalizeStepConfig` and tests for unknown-key rejection and null config rejection (now fails at runRequest validation with `/config` path).


## CIV-61 — [M4] Tag registry cutover: registry-instantiated catalog + validation (effect:* schedulable)

**Reviewed:** 2025-12-23

- **Intent:** Replace regex/allowlist validation + hard-coded executor verification with registry-driven catalog checks; make `effect:*` schedulable; validate demo payloads on registration.
- **Strengths:** TagRegistry provides a canonical catalog; executor/registry now validate via registry; effect tags are included; demo payload validation fails fast with unit coverage.
- **Gaps:** Satisfaction now requires explicit `provides`, so any partial runs that relied on pre-initialized fields/artifacts will now fail without explicit tags; tag IDs are only validated by kind prefix, so canonical format validation (if still desired) is not enforced at registration.
- **Follow-up:** Add targeted tests or docs for partial-pipeline behavior; consider reintroducing stricter tag-id validation at registry registration if canonical formats still matter.
- **Update (2025-12-23):** Added a guardrail test that preallocated field buffers remain unsatisfied until explicitly provided.


## CIV-75 — [M4] Safety net: step-level tracing foundation

**Reviewed:** 2025-12-23

- **Intent:** Establish a trace event model + sink, runId/plan fingerprint, step timing, and per-step trace controls.
- **Strengths:** Trace session + sink abstraction; `PipelineExecutor` emits run/step timing events; deterministic fingerprint with canonicalization; basic test covers run/step events.
- **Gaps:** Trace enablement semantics are ambiguous (`enabled` defaults false while runtime allows steps-only enablement), and step events use `nodeId = stepId`, so repeated steps can’t be disambiguated against `ExecutionPlan` nodes.
- **Follow-up:** Align trace enablement contract (require `enabled` or drop the default) and emit plan node IDs once ExecutionPlan-based execution lands.

## CIV-58 — [M4] Pipeline cutover: standard mod recipe + runtime cutover to ExecutionPlan

**Reviewed:** 2025-12-23

- **Intent:** Switch runtime to `RunRequest → ExecutionPlan` using the standard mod recipe as the canonical ordering source; remove stageManifest/stageConfig ordering.
- **Strengths:** TaskGraph now compiles and executes an ExecutionPlan from the standard recipe; dependency descriptors are sourced from the M3 spine; smoke tests updated for default recipe execution.
- **Gaps:** Tests and docs still assume `stageConfig` disables stages (e.g., integration test); with runtime cutover, that assumption is now false and the test no longer validates its intended scenario.
- **Follow-up:** Update MapOrchestrator docs/examples and the integration test to use recipe-based enablement (or an explicit minimal recipe); add a small guard/test to keep the standard recipe and dependency spine in sync.
- **Update (2025-12-23):** MapOrchestrator docs/examples and the integration test now use recipe-based enablement, and a guard test enforces standard recipe ↔ dependency spine alignment.

## CIV-57 — [M4] Pipeline cutover: package standard pipeline as mod + loader/registry wiring

**Reviewed:** 2025-12-23

- **Intent:** Package the standard pipeline as a mod package and source the canonical default recipe from it (no runtime cutover yet).
- **Strengths:** Standard mod package exists with registry + recipe; TaskGraph pulls default steps via the mod recipe; `STAGE_ORDER` derives from the mod recipe list to keep ordering single-sourced.
- **Gaps:** Orchestrator tests still derive the recipe via `StepRegistry.getStandardRecipe(stageManifest)` instead of the standard mod recipe, so drift between `mods/standard` and stage-manifest ordering would be invisible.
- **Follow-up:** Update orchestration tests to use `standardMod.recipes.default` as the recipe source and add a small assertion that the mod recipe is the canonical ordering list.
- **Update (2025-12-23):** Orchestrator test now derives its recipe directly from `standardMod.recipes.default` (no stageManifest filtering) and asserts the selected steps stay aligned with the canonical ordering list.

## CIV-76 — [M4] Safety net: CI smoke tests + CIV-23 re-scope

**Reviewed:** 2025-12-23

- **Intent:** Add compile/execute smoke tests for the standard recipe using a stub adapter and re-scope CIV-23 to the RunRequest/ExecutionPlan boundary.
- **Strengths:** New smoke coverage compiles and executes the standard recipe with a MockAdapter and asserts ordering + run completion; CIV-23 doc is reoriented to the ExecutionPlan boundary.
- **Gaps:** CIV-23 still references legacy WorldModel/stageConfig in its testing guidance and helper snippet, which conflicts with the acceptance criteria to remove those references.
- **Follow-up:** Remove the remaining WorldModel and `stageConfig` mentions from CIV-23 and replace with RunRequest/ExecutionPlan-oriented verification commands/snippets.
- **Update (2025-12-23):** Removed legacy WorldModel/stageConfig references and added RunRequest/ExecutionPlan-oriented commands + default config helper in CIV-23.

## CIV-59 — [M4] Delete legacy ordering/enablement/config inputs

**Reviewed:** 2025-12-24

- **Intent:** Delete legacy ordering/enablement/config inputs (`stageManifest`, `STAGE_ORDER`, `stageConfig`, `stageFlags`, `shouldRun`) plus preset composition so runtime ordering/enablement is recipe-only.
- **Strengths:** Removes `bootstrap/resolved.ts` and `config/presets.ts`; `bootstrap()` is now overrides-only; mod entrypoints drop `stageConfig`; tests migrate to recipeOverride-based enablement; `DEF-004` is marked resolved.
- **Gaps:** `docs/system/mods/swooper-maps/architecture.md` is internally inconsistent and still instructs `bootstrap({ presets, stageConfig })` usage; `bootstrap({ presets })` is silently ignored and the "reject legacy presets" test fails; `pnpm -C packages/mapgen-core test` requires building `@civ7/adapter` first (not wired into `test:mapgen`).
- **Follow-up:** Decide/enforce the legacy-options policy (reject unknown bootstrap keys vs ignore) and align `packages/mapgen-core/test/bootstrap/entry.test.ts`; fix or archive the stale Swooper Maps architecture doc; make mapgen tests build `packages/civ7-adapter` (or adjust adapter exports for dev) so `pnpm test:mapgen` works from a fresh checkout.
- **Verification:** `pnpm -C packages/civ7-adapter build`; `pnpm -C packages/mapgen-core check`; `pnpm -C packages/mapgen-core test` (fails 1 test: legacy preset rejection).
- **Update (2025-12-24):** `bootstrap()` now rejects unknown options; Swooper Maps architecture doc aligns with recipe-only bootstrap; mapgen-core tests build `@civ7/adapter` via `pretest`, so `pnpm -C packages/mapgen-core test` works from a fresh checkout.

## CIV-60 — [M4] Remove dual orchestration path

**Reviewed:** 2025-12-24

- **Intent:** Make `RunRequest → ExecutionPlan → PipelineExecutor` the only supported runtime path; fence/remove `MapOrchestrator` entrypoints; migrate mod scripts/tests/docs.
- **Strengths:** `MapOrchestrator` is removed from the public export surface and fails fast if constructed; `applyMapInitData` cleanly replaces `requestMapData`; Swooper entry scripts and orchestrator tests run through `runTaskGraphGeneration`; Swooper architecture doc aligns with the M4 runtime boundary.
- **Gaps:** Acceptance verification is not hermetic: `pnpm -C packages/mapgen-core check` requires a prior `pnpm -C packages/civ7-adapter build` (since `@civ7/adapter` types live in `dist/`); the canonical entrypoint name (`runTaskGraphGeneration`) is still “TaskGraph”-branded despite being plan-based, which may cause confusion.
- **Follow-up:** Add a `precheck` hook (or equivalent) in `packages/mapgen-core` to build `@civ7/adapter` (or adjust adapter dev exports) so acceptance commands work from a fresh checkout; consider adding a plan-oriented alias name once the surface stabilizes.
- **Verification:** `pnpm -C packages/civ7-adapter build`; `pnpm -C packages/mapgen-core check`; `pnpm -C packages/mapgen-core test` (pass).

## CIV-62 — [M4] Remove `ctx.foundation`; publish monolithic foundation as `artifact:foundation` at `ctx.artifacts.foundation`

**Reviewed:** 2025-12-24

- **Intent:** Eliminate the legacy top-level `ctx.foundation` surface while keeping the monolithic `FoundationContext` payload; publish/verify it via the artifacts surface (`ctx.artifacts.foundation` + `artifact:foundation`) and migrate all consumers.
- **Strengths:** Introduces `ArtifactStore` (typed `Map` wrapper) to support both tag-driven access (`ctx.artifacts.get("artifact:foundation")`) and ergonomic property access (`ctx.artifacts.foundation`); updates `artifact:foundation` satisfaction to validate via the artifact store (no `ctx.foundation` special-casing); migrates all in-repo consumers to `assertFoundationContext()` on the new surface; contract doc updated to match M4.
- **Gaps:** `ArtifactStore` hard-codes `"artifact:foundation"` separately from `pipeline/tags.ts`, so the tag string is duplicated (low risk, but a drift footgun if tags ever rename).
- **Follow-up:** Consider centralizing `artifact:foundation` as a single constant in the “core contract” layer (or add a small invariant test asserting both constants stay equal).
- **Verification:** `pnpm check` (pass); `pnpm test:mapgen` (pass, includes stub-adapter standard recipe smoke).

## CIV-68 — [M4] Effects verification: define effect:* tags + adapter postcondition surfaces

**Reviewed:** 2025-12-24

- **Intent:** Add canonical `effect:*` tags for high-risk engine mutations and a minimal adapter-backed postcondition surface, without changing step scheduling yet.
- **Strengths:** Adds ownership metadata for `effect:engine.{biomesApplied,featuresApplied,placementApplied}` and wires them to adapter-backed postcondition checks via `verifyEffect`; introduces `EngineAdapter.verifyEffect()` with call-evidence tracking in both `Civ7Adapter` and `MockAdapter` (including evidence reset); unit test asserts postcondition failures surface the effect tag id; DEF-008 status line updated to reflect the “verified tags exist, scheduling migration pending” state.
- **Gaps:** Verification is intentionally “call-evidence” (not a true engine-state read-back), so it can produce false positives and should not be treated as correctness proof; `effect:*` ids are duplicated as raw strings in adapter + pipeline surfaces; correctness relies on per-run adapter instantiation (or an explicit reset contract) to avoid cross-run evidence leakage.
- **Follow-up:** Consider a small contract guardrail that prevents adapter reuse across runs (or add an explicit `reset()`/run-scope mechanism); consider centralizing `effect:*` ids (or add an invariant test) to reduce drift risk once the surface stabilizes.
- **Verification:** `pnpm -C packages/mapgen-core check` (pass); `pnpm -C packages/mapgen-core test` (pass, includes the new postcondition failure test).
- **Update (2025-12-24):** Centralized `effect:engine.*` ids via `ENGINE_EFFECT_TAGS` in `@civ7/adapter` so adapters + pipeline tags share constants; adapter reuse guardrail remains a follow-up.

## CIV-69 — [M4] Biomes/features reification and verification

**Reviewed:** 2025-12-24

- **Intent:** Reify engine-derived biome/feature outputs into explicit fields (`field:biomeId`, `field:featureType`), and gate downstream steps on verified `effect:engine.{biomesApplied,featuresApplied}` (adapter-backed postconditions).
- **Strengths:** Biomes/features steps now reify fields immediately after engine mutation (`BiomesStep`/`FeaturesStep`); the prior cross-step engine read in features switches to `ctx.fields.biomeId`; standard dependency spine publishes the reified fields and effects; smoke test asserts both effect tags satisfy and sampled field values match engine reads.
- **Gaps:** Effect postconditions remain “call-evidence” (wiring confidence, not correctness proof); `pnpm -C packages/mapgen-core check` still requires a prior `pnpm -C packages/civ7-adapter build` (types live in `dist/`), so the documented verification commands aren’t fully hermetic from a fresh checkout.
- **Follow-up:** Add a `precheck` (or dev-export adjustment) so `pnpm -C packages/mapgen-core check` works without manual adapter builds; treat “call-evidence” effects as a guardrail for missed wiring, not a correctness oracle.
- **Update (2025-12-24):** Added a `precheck` hook in `packages/mapgen-core` to build `@civ7/adapter` before `check`, keeping verification commands hermetic; call-evidence semantics remain a guardrail.
- **Verification:** `pnpm -C packages/civ7-adapter build`; `pnpm -C packages/mapgen-core check`; `pnpm -C packages/mapgen-core test test/pipeline/standard-smoke.test.ts` (pass).

## CIV-71 — [M4] Define artifact:placementInputs@v1

**Reviewed:** 2025-12-24

- **Intent:** Introduce a versioned `artifact:placementInputs@v1` contract, derive+publish it in the standard pipeline, and switch placement to consume it.
- **Strengths:** Tag registry entry includes satisfaction predicate + demo payload validation; derive step publishes a single canonical payload; standard recipe includes `derivePlacementInputs` immediately before `placement`; smoke test asserts artifact publication.
- **Gaps:** `PlacementStep` still declares a `placement` config schema but ignores config entirely, so recipe authors can set `placement` config on the `placement` step and silently get no effect; Linear ticket text implies “read artifact without removing legacy”, while the local issue doc + code fully require the artifact (potential sequencing drift).
- **Follow-up:** Either remove `placement` config schema from `placement` step (or make it an explicit error) to avoid silent misconfiguration; reconcile the CIV-71 issue doc prework constraints with the final implementation so future readers don’t treat it as a still-open constraint.
- **Update (2025-12-24):** Placement step config now uses an empty schema (explicit error on step-level config); CIV-71 issue doc prework prompt flagged as historical to align with the early artifact-only cutover.
- **Verification:** `pnpm -C packages/civ7-adapter build`; `pnpm -C packages/mapgen-core check`; `pnpm -C packages/mapgen-core test test/pipeline/standard-smoke.test.ts` (pass).

## CIV-72 — [M4] Placement inputs: cut placement over to artifact + verified effect

**Reviewed:** 2025-12-24

- **Intent:** Make placement consume `artifact:placementInputs@v1` exclusively and provide a verified `effect:engine.placementApplied` backed by a minimal `artifact:placementOutputs@v1` (ADR-ER1-020); mark `DEF-006` resolved.
- **Strengths:** Placement now publishes `artifact:placementOutputs@v1` and `effect:engine.placementApplied` verification is artifact-backed (`isPlacementOutputSatisfied`) rather than call-evidence; dependency spine + standard recipe enforce the `derivePlacementInputs → placement` contract; tests cover missing placement inputs and missing/invalid placement outputs with loud failures; DEF-006 status updated to “resolved”.
- **Gaps:** `artifact:placementOutputs@v1` counts are intentionally “best available” (mostly `0`), so it’s easy for future consumers to misread them as authoritative placement read-backs; there’s no explicit test that a step providing `artifact:placementInputs@v1` with an invalid payload fails via `UnsatisfiedProvidesError` (current tests focus on missing inputs + output verifier failures).
- **Follow-up:** If `artifact:placementOutputs@v1` becomes a consumed product, document the “placeholder counts” contract explicitly (or add a v2 when real read-backs exist); add a small test for invalid `artifact:placementInputs@v1` publication to fully close the “missing or invalid” acceptance case.
- **Verification:** `pnpm -C packages/civ7-adapter build`; `pnpm -C packages/mapgen-core check`; `pnpm -C packages/mapgen-core test` (pass).
- **Update (2025-12-24):** Added invalid `artifact:placementInputs@v1` publication coverage and clarified placeholder output counts in ADR-ER1-020.

## CIV-67 — [M4] Engine boundary cleanup: remove engine-global dependency surfaces

**Reviewed:** 2025-12-26

- **Intent:** Remove/fence engine-global dependency surfaces (`GameplayMap` fallbacks, module-load `GameInfo` lookups, `PlotTags`/`LandmassRegion` globals) so pipeline dependencies are explicit and fail-fast.
- **Strengths:** Narrative utilities now require `ExtendedMapContext` and route reads through the adapter (`getDims`, `isWaterAt`, `zonalWindStep`); `terrain-constants` initializes indices via adapter during context creation (no module-load `GameInfo`); plot tag + landmass region IDs now come from adapter (`getPlotTagId`, `getLandmassId`) and mapgen-core no longer references `PlotTags`/`LandmassRegion` tokens.
- **Gaps:** `initializeTerrainConstants()` caches process-wide and only initializes once, so multiple adapters in the same process can lead to stale indices; terrain constants fall back with a warning rather than failing hard, which could mask adapter misconfiguration in non-test runs.
- **Follow-up:** Consider making terrain constants per-run (store on `ctx` or allow a reset) or at least assert adapter identity during init to avoid cross-run staleness; decide whether fallbacks should throw outside tests.
- **Verification:** `pnpm -C packages/mapgen-core check`; `pnpm -C packages/mapgen-core test test/smoke.test.ts`; `rg -n "GameplayMap|GameInfo|PlotTags|LandmassRegion" packages/mapgen-core/src` (matches only explicitly fenced dev code: `src/dev/introspection.ts`).

## CIV-73 — [M4] Narrative cleanup: canonical artifact:narrative.* producers

**Reviewed:** 2025-12-26

- **Intent:** Define + register canonical `artifact:narrative.*@v1` outputs and ensure narrative producers publish them explicitly (no StoryTags dependency surface).
- **Strengths:** Adds typed narrative artifact shapes + guards in `packages/mapgen-core/src/domain/narrative/artifacts.ts`; story producers publish `artifact:narrative.*@v1` into `ctx.artifacts`; TagRegistry registers the new artifact tags with satisfaction predicates; standard dependency spine declares consumers’ requirements on narrative artifacts.
- **Gaps:** Verification is currently blocked: `pnpm -C packages/mapgen-core test` fails because TaskGraph/standard smoke compilation rejects `/config/placement` (placement step uses an empty config schema, but test/`runTaskGraphGeneration` still passes a `placement` key); issue doc’s schema sketches drift from implemented runtime shapes (corridors metadata, hotspots `points`, orogeny belts); `islands` mutates `artifact:narrative.motifs.hotspots@v1` but does not declare it in `M3_STAGE_DEPENDENCY_SPINE.islands.provides`, weakening “explicit producer” semantics.
- **Follow-up:** Fix TaskGraph + smoke run request builders to avoid passing placement config to the `placement` step; align CIV-73 doc schema sketches with the chosen snapshot shapes; consider adding `M3_STAGE_DEPENDENCY_SPINE.islands.provides += narrativeMotifsHotspotsV1` (or otherwise make “hotspot categories are complete after islands” explicit).
- **Implementation Decisions:** 3 logged (Set/Map snapshots, corridors metadata retention, omit hotspot trails); all align with implementation; main side-effect risk is future serialization/contract drift (already tracked in `docs/projects/engine-refactor-v1/triage.md`).
- **Verification:** `pnpm -C packages/civ7-adapter build` (pass); `pnpm -C packages/mapgen-core check` (pass); `pnpm -C packages/mapgen-core test` (fails: placement config unknown key).
## CIV-70 — [M4] Effects verification: remove state:engine surface + close DEF-008

**Reviewed:** 2025-12-26

- **Intent:** Remove `state:engine.*` from the target registry/contract surface and standard pipeline steps, replacing it with `effect:*` equivalents; mark DEF-008 resolved once the target surface is clean.
- **Strengths:** `TagRegistry` no longer supports a `state` tag kind (`DependencyTagKind = "artifact" | "field" | "effect"` + strict prefix validation), and the standard dependency spine replaces `state:engine.*` edges with `M4_EFFECT_TAGS.engine.*` (see `packages/mapgen-core/src/pipeline/{tags,standard}.ts`); DEF-008 is marked resolved with an explicit note in `docs/projects/engine-refactor-v1/deferrals.md`.
- **Gaps:** Some replacement `effect:engine.*` tags remain “provided = satisfied” (not runtime-verified) — notably `effect:engine.{landmassApplied,coastlinesApplied,riversModeled}` — so the underlying “asserted edge” risk still exists, just under a new namespace; standard plan compilation verification is currently blocked by an unrelated schema mismatch (`/config/placement` unknown key).
- **Follow-up:** If the milestone policy is “no asserted-but-unverified scheduling edges,” either add cheap verifiers for the remaining `effect:engine.*` tags (artifact-backed where possible) or document them explicitly as intentionally unverified and keep the risk tracked (DEF-017 is already the right bucket for stronger adapter read-backs).
- **Implementation Decisions:** 0 logged; 1 unlogged (which `effect:engine.*` tags are runtime-verified vs trusted).
- **Verification:** `rg -n "state:engine" packages/mapgen-core/src packages/mapgen-core/test` (no hits); `pnpm -C packages/mapgen-core check` (pass); `pnpm -C packages/mapgen-core test test/pipeline/{tag-registry,placement-gating,artifacts}.test.ts` (pass); `pnpm -C packages/mapgen-core test test/pipeline/standard-smoke.test.ts` (fails: `/recipe/steps/21/config/placement` unknown key).
- **Update (2025-12-26):** Logged the verification-scope decision in CIV-70 and expanded DEF-017 to include rivers; standard pipeline verification remains blocked by the placement config schema mismatch noted in CIV-73.
## Review Updates

- **Update (2025-12-26):** CIV-73 follow-up fixes applied: placement config stripped from run-request builders (`runTaskGraphGeneration` + standard smoke), `islands` now provides `artifact:narrative.motifs.hotspots@v1`, CIV-73 schema sketches aligned, `pnpm -C packages/mapgen-core test` passes.
