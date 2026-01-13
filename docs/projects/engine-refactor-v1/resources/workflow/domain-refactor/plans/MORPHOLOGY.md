---
name: plan-morphology-vertical-domain-refactor
description: |
  Draft Morphology domain implementation plan/spec.
  This plan instantiates the shared WORKFLOW for a Morphology refactor and is intended to stay “live”:
  each phase ends with a lookback that updates downstream phases based on what we learned.
---

# PLAN: Morphology (Vertical Domain Refactor)

This is a **thin policy + index** plan for the Morphology refactor. Modeling lives in the Phase 2 spike. Slice planning lives in the Phase 3 issue.

Backbone workflow:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

Path roots (convention used here):
- `/src/...` = `mods/mod-swooper-maps/src/...`
- `/packages/mapgen-core/...` = `packages/mapgen-core/...`

## Authoritative posture (enforced)

Hard principle:
- **Legacy behavior and legacy authoring patterns should not be propagated.**
- **All new work must be expressed through the canonical architecture and authoring surfaces.**

Design principles (authoritative surfaces):
- Morphology owns its surfaces. If a clean internal model requires breaking a compatibility surface, break it and update downstream in the same refactor.
- Projections are presentation-only and must never shape the internal representation.
- Op config is op-owned and minimal; do not reuse a domain-wide config bag inside op contracts.
- Every existing config property, rule/policy, and function must be explicitly accepted into the model or rejected as legacy (no silent carry-through).

Compatibility and cleanup rules:
- Upstream compat/projection artifacts are **not** canonical inputs.
- If this refactor leaves compat projections in place, add a cleanup item in `docs/projects/engine-refactor-v1/triage.md`.
- If the immediate downstream domain can remove them safely and no other downstream consumers are affected, that downstream owns the cleanup and must have a dedicated issue; link it from triage.

Anti-patterns (concise; see WORKFLOW for full list):
- Phase bleed (modeling vs slicing vs implementation).
- Model/projection confusion.
- Decisions buried in prose.
- Config bag in ops.
- Silent legacy carry-through.

## Domain framing (Morphology)

Morphology sits immediately downstream of Foundation and seeds most of the physical world layers that everything else depends on.

- It is buffer-heavy (shared, mutable, iterative layers like elevation/heightfield).
- It is a key overlay producer (formation motifs like corridors) that downstream domains can read as story signals.

North-star references:
- `docs/system/libs/mapgen/morphology.md`
- `docs/system/libs/mapgen/architecture.md`
- `docs/system/libs/mapgen/foundation.md` (upstream input model)
- `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md` (seed; not authoritative for contracts)

## Phase artifacts (authoritative links)

| Phase | Artifact | Status |
| --- | --- | --- |
| Phase 1 | `docs/projects/engine-refactor-v1/resources/spike/spike-morphology-current-state.md` | not started |
| Phase 2 | `docs/projects/engine-refactor-v1/resources/spike/spike-morphology-modeling.md` | not started |
| Phase 3 | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-morphology-vertical-domain-refactor.md` | not started |

## Phase 1 hypotheses to validate (current-state)

- Morphology is split across multiple recipe stages:
  - `/src/recipes/standard/stages/morphology-pre/`
  - `/src/recipes/standard/stages/morphology-mid/`
  - `/src/recipes/standard/stages/morphology-post/`
- These stages appear to still use legacy stage/step authoring posture (no stage-owned `artifacts.ts`, legacy `run(ctx, config)` signature).
- `/src/domain/morphology/ops/contracts.ts` is currently empty (not contract-first in practice).

## Notes

- This plan is an index and posture statement only.
- Current-state inventory belongs in the Phase 1 spike.
- Authoritative modeling belongs in the Phase 2 spike.
- Slice planning and sequencing belong in the Phase 3 issue.
