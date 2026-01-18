# Phase 3 Implementation Plan (Template)

## Purpose

Convert the spikes into an executable slice plan and a single source-of-truth issue doc.

## Scope guardrails

- This is slice planning only. Do not change the model here.
- Every slice must end in a pipeline-green state (no dual paths).
- The refactored domain must not retain compat surfaces; downstream adjustments are part of the plan.
- No “later” buckets. Every slice is explicit with deliverables and a branch/subissue plan.
- Locked decisions must be test-backed in the same slice they are introduced.

## Required output

- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-<domain>-*.md`

## Required sections (minimum)

- Locked decisions + bans (and how each becomes a guardrail)
- Config semantics (link to the Phase 2 table; include default vs explicit policy, missing/empty/null interpretation rules, and determinism expectations for any probabilistic knobs)
- Determinism boundary policy (seed-only across boundaries; no RNG objects/functions crossing op boundaries)
- Stable fix anchors (preferred “config → normalized internal form” / boundary locations where implementation fixes should land to survive later slices)
- Step decomposition plan (causality spine → step boundaries → artifacts/buffers)
- Consumer inventory + migration matrix (break/fix by slice)
- Slice list with deliverables
- Contract deltas per slice
- Acceptance + verification gates per slice
- Migration checklist per slice
- Cleanup ownership + triage links
- Sequencing refinement note (how the slice order was re-checked for pipeline safety)
- Documentation pass plan (dedicated slice or issue)

## Sequencing refinement pass (required; single pass)

1. Draft the slice list from Phase 2 pipeline deltas.
2. Re-order for pipeline safety (every slice ends green).
3. Re-check downstream deltas and compat ownership against the new order.
4. Lock and record the rationale.

Example sequencing refinement note (illustrative only):

Drafted slices from Phase 2 pipeline deltas as A) contract surface updates, B) op/step migrations, C) downstream consumer adjustments, D) legacy removals.

After re-ordering for pipeline safety, downstream consumer updates moved earlier so no slice leaves a contract mismatch. Final order is A) update stage-owned contracts + artifacts, B) update downstream consumers to the new contracts, C) migrate domain ops/steps, D) remove legacy paths and confirm guardrails.

Re-checked downstream deltas against the new order and verified each slice ends green. No model changes introduced; any transitional shims live downstream and are explicitly marked deprecated.

## Slice plan requirements (per slice)

- Step(s) included (ids + file paths)
- Ops introduced/changed (ids + kinds + module paths)
- Any semantic knobs touched (and where their semantics are locked: Phase 2 table + test names)
- Legacy entrypoints to delete (file paths / exports)
- Tests to add/update (op contract test + thin integration edge)
- Guardrail tests (string/surface checks or contract-guard tests for forbidden surfaces)
- Guardrail scope (`REFRACTOR_DOMAINS=...`)
- Pipeline deltas included (upstream/downstream contracts updated in that slice)
- Documentation scope (what schemas/functions/ops/steps/stages/contracts are documented in this slice)
- Locked decision guardrails added in this slice (test/scan)

## Documentation pass requirements (dedicated slice or issue)

- Inventory all touched/created schemas, functions, ops, steps, stages, and contracts.
- Add/expand JSDoc for functions/ops/steps with behavior, defaults, modes, and downstream effects.
- Add/expand schema `description` metadata with the same behavioral context and expectations.
- Confirm documentation reflects any downstream changes implied by the model.

## Gate checklist (Phase 3 completion)

- Slice plan is written and reviewable.
- Every planned slice can end in a working state (no “we’ll delete later”).
- Any pipeline delta from Phase 2 is fully assigned to slices.
- No model changes appear in the issue doc (modeling lives in Phase 2).
- No compat surfaces remain in the refactored domain; any deprecated shims live in downstream domains and are explicitly marked.
- Sequencing refinement pass is documented and reflects the final order.
- Documentation pass is present and scoped with inventory + JSDoc/schema updates.
- Locked decisions/bans are test-backed in the same slice they are introduced.
- Config semantics are referenced (Phase 2 table) and any semantic knob touched by the plan has a test that locks its non-trivial behavior.
- Step decomposition plan exists (spine → steps → artifacts/buffers).
- Consumer inventory + migration matrix exists and assigns changes per slice.

## References

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/subflows/IMPLEMENTATION.md`
