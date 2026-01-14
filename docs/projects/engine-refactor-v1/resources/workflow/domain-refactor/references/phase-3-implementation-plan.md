# Phase 3 Implementation Plan (Template)

Purpose: convert the spikes into an executable slice plan and a single source-of-truth issue doc.

Scope guardrails:
- This is slice planning only. Do not change the model here.
- Every slice must end in a pipeline-green state (no dual paths).
- The refactored domain must not retain compat surfaces; downstream adjustments are part of the plan.

Required output:
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-<domain>-*.md`

Required sections (minimum):
- Slice list with deliverables
- Contract deltas per slice
- Acceptance + verification gates per slice
- Migration checklist per slice
- Cleanup ownership + triage links
- Sequencing refinement note (how the slice order was re-checked for pipeline safety)

Sequencing refinement pass (required; single pass):
1. Draft the slice list from Phase 2 pipeline deltas.
2. Re-order for pipeline safety (every slice ends green).
3. Re-check downstream deltas and compat ownership against the new order.
4. Lock and record the rationale.

Example sequencing refinement note (illustrative only):

Drafted slices from Phase 2 pipeline deltas as A) contract surface updates, B) op/step migrations, C) downstream consumer adjustments, D) legacy removals.

After re-ordering for pipeline safety, downstream consumer updates moved earlier so no slice leaves a contract mismatch. Final order is A) update stage-owned contracts + artifacts, B) update downstream consumers to the new contracts, C) migrate domain ops/steps, D) remove legacy paths and confirm guardrails.

Re-checked downstream deltas against the new order and verified each slice ends green. No model changes introduced; any transitional shims live downstream and are explicitly marked deprecated.

Slice plan requirements (per slice):
- Step(s) included (ids + file paths)
- Ops introduced/changed (ids + kinds + module paths)
- Legacy entrypoints to delete (file paths / exports)
- Tests to add/update (op contract test + thin integration edge)
- Guardrail scope (`REFRACTOR_DOMAINS=...`)
- Pipeline deltas included (upstream/downstream contracts updated in that slice)

Gate checklist (Phase 3 completion):
- Slice plan is written and reviewable.
- Every planned slice can end in a working state (no “we’ll delete later”).
- Any pipeline delta from Phase 2 is fully assigned to slices.
- No model changes appear in the issue doc (modeling lives in Phase 2).
- No compat surfaces remain in the refactored domain; any deprecated shims live in downstream domains and are explicitly marked.
- Sequencing refinement pass is documented and reflects the final order.

References:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/subflows/IMPLEMENTATION.md`
