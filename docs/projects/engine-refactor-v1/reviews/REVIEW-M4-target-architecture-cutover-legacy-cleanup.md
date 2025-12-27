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
