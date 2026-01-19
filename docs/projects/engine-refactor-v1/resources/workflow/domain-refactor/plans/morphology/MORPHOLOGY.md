---
name: plan-morphology-vertical-domain-refactor
description: |
  Draft Morphology domain planning index.
  This plan instantiates the shared WORKFLOW for a Morphology refactor and is intended to stay “live”:
  each phase ends with a lookback that updates downstream phases based on what we learned.
---

# PLAN: Morphology (Vertical Domain Refactor)

This is a **thin policy + index** plan for the Morphology refactor. Greenfield modeling lives in the Phase 0.5 spike. Modeling lives in the Phase 2 spike. Slice planning lives in the Phase 3 issue.

Backbone workflow:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`

Prompt (non-implementation execution wrapper):
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/MORPHOLOGY-NON-IMPLEMENTATION.md`

Path roots (convention used here):
- `/src/...` = `mods/mod-swooper-maps/src/...`
- `/packages/mapgen-core/...` = `packages/mapgen-core/...`

## Authoritative posture (enforced)

Hard principle:
- **Legacy behavior and legacy authoring patterns should not be propagated.**

Morphology-specific posture:
- Morphology has already been refactored once, but not to current standards.
- Treat this pass as a greenfield re-think of the model and decomposition “from the ground up.”
- Use existing code/structure as evidence and investigation material, not as a constraint on the model.

Implementation guardrails (locked decisions; see implementation-traps reference):
- Ops stay pure; steps own runtime binding (no callbacks/functions across op boundaries).
- RNG crosses boundaries as data (seed); ops build local RNGs.
- Defaults live in schemas/normalize; no hidden runtime defaults.
- Hard ban: narrative/story overlays as domain dependencies.
- Hard ban: hidden multipliers/constants/defaults.
- Hard ban: placeholders/dead bags.
- Compat is forbidden inside the refactored domain; compat (if needed) is downstream-only and explicitly deprecated with removal plan.

## Phase artifacts (authoritative links)

| Phase | Artifact | Status |
| --- | --- | --- |
| Phase 0.5 | `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-greenfield.md` | not started |
| Phase 1 | `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-current-state.md` | not started |
| Phase 2 | `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling.md` | not started |
| Phase 3 | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-morphology-*.md` | not started |

## Notes

- This plan is an index and posture statement only.
- Greenfield exploration belongs in the Phase 0.5 spike.
- Current-state inventory belongs in the Phase 1 spike.
- Authoritative modeling belongs in the Phase 2 spike.
- Slice planning and sequencing belong in the Phase 3 issue.
