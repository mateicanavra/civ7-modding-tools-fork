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

References:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/subflows/IMPLEMENTATION.md`
