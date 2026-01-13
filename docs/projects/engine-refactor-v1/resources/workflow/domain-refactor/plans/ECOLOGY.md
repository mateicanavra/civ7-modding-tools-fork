---
name: plan-ecology-vertical-domain-refactor
description: |
  Draft Ecology domain implementation plan/spec.
  This plan instantiates the shared WORKFLOW for an Ecology refactor and is intended to stay “live”:
  each phase ends with a lookback that updates downstream phases based on what we learned.
---

# PLAN: Ecology (Vertical Domain Refactor)

This is a **thin policy + index** plan for the Ecology refactor. Modeling lives in the Phase 2 spike. Slice planning lives in the Phase 3 issue.

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
- Ecology owns its surfaces. If a clean internal model requires breaking a compatibility surface, break it and update downstream in the same refactor.
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

## Domain framing (Ecology)

Ecology sits downstream of Foundation/Morphology/Hydrology and consumes both:
- shared mutable buffers (fields/layers), and
- publish-once artifacts (classifications, plans, overlays).

It typically publishes:
- classification artifacts (biomes/pedology),
- intent/plan artifacts consumed by later application steps,
- overlays that describe motifs/patterns for downstream consumers (Placement, etc).

North-star references:
- `docs/system/libs/mapgen/ecology.md`
- `docs/system/libs/mapgen/architecture.md`
- `docs/system/libs/mapgen/hydrology.md`
- `docs/system/libs/mapgen/morphology.md`
- `docs/system/libs/mapgen/placement.md`
- `docs/system/libs/mapgen/narrative.md`

Ecology special-case guidance:
- If Phase 1 confirms Ecology is already aligned with stage-owned artifacts, `run(ctx, config, ops, deps)` authoring, import discipline, and buffer/artifact/overlay semantics, compress Phase 2/3/4 into the minimum necessary reconciliation work and record that choice in Phase 2 decisions.

## Phase artifacts (authoritative links)

| Phase | Artifact | Status |
| --- | --- | --- |
| Phase 1 | `docs/projects/engine-refactor-v1/resources/spike/spike-ecology-current-state.md` | not started |
| Phase 2 | `docs/projects/engine-refactor-v1/resources/spike/spike-ecology-modeling.md` | not started |
| Phase 3 | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-ecology-vertical-domain-refactor.md` | not started |

## Phase 1 hypotheses to validate (current-state)

- `/src/domain/ecology/ops/contracts.ts` is populated (contract router exists).
- `/src/recipes/standard/stages/ecology/` exists and compiles a stage config surface.
- Some Ecology step modules still use legacy dependency wiring patterns (validate and record).

## Notes

- This plan is an index and posture statement only.
- Current-state inventory belongs in the Phase 1 spike.
- Authoritative modeling belongs in the Phase 2 spike.
- Slice planning and sequencing belong in the Phase 3 issue.
