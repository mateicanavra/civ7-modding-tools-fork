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
