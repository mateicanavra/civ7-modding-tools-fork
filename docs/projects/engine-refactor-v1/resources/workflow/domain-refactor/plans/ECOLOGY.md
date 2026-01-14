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

Surface ownership + pipeline:
- Ecology owns its surfaces. The refactor must not retain legacy compat surfaces; update downstream consumers in the same refactor. If downstream needs transitional shims, they live downstream and are explicitly marked as deprecated.
- Projections are presentation-only and must never shape the internal representation.
- Op config is op-owned and minimal; do not reuse a domain-wide config bag inside op contracts.
- Every existing config property, rule/policy, and function must be explicitly accepted into the model or rejected as legacy (no silent carry-through).
- Review the upstream Phase 2 models (Morphology, Hydrology, Foundation as needed), explicitly adopt authoritative inputs, and delete legacy reads. Also review any upstream refactor changes that touched Ecology surfaces and plan their removal.
- Review downstream consumers (Placement/Narrative as applicable): document current dependencies, required changes, and plan downstream updates as part of this refactor.

Research discipline:
- Modeling is research-driven: reconcile target SPEC/ADR docs with domain specs, use earth-physics references, and lean on MCP/code-intel + web research; cite sources in the Phase 2 spike.
- Modeling is iterative: run the Phase 2 modeling loop (broad pipeline sweep -> deep domain dive -> synthesis -> refinement) and keep an iteration log; do not lock the model after a single pass.
- Phase 2 must include a conceptual narrative + diagrams (architecture view, data-flow, producer/consumer map with current vs target pipeline adjustments).

Planning + documentation discipline:
- Phase 3 must include a sequencing refinement pass (re-order slices for pipeline safety, re-check downstream deltas, then lock).
- Phase 3 must include a dedicated documentation pass (slice or issue) that inventories every touched/created schema/function/op/step/stage/contract and adds JSDoc + schema descriptions with behavior, defaults, modes, and downstream impacts.

Compatibility and cleanup rules:
- This refactor must not leave compat/projection surfaces in Ecology. Downstream consumers must be updated as part of this refactor.
- If a downstream domain needs transitional compatibility, it owns the deprecated shim and must mark it explicitly (`DEPRECATED` / `DEPRECATE ME`).
- If downstream deprecated shims are introduced, add a cleanup item in `docs/projects/engine-refactor-v1/triage.md`. If the immediate downstream domain can remove them safely and no other downstream consumers are affected, that downstream owns a dedicated cleanup issue; link it from triage.

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
