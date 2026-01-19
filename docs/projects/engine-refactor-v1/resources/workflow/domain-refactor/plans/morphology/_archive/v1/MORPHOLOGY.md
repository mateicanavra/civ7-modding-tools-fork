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
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`

Path roots (convention used here):
- `/src/...` = `mods/mod-swooper-maps/src/...`
- `/packages/mapgen-core/...` = `packages/mapgen-core/...`

## Authoritative posture (enforced)

Hard principle:
- **Legacy behavior and legacy authoring patterns should not be propagated.**
- **All new work must be expressed through the canonical architecture and authoring surfaces.**

Design principles (authoritative surfaces):

Surface ownership + pipeline:
- Morphology owns its surfaces. The refactor must not retain legacy compat surfaces; update downstream consumers in the same refactor. If downstream needs transitional shims, they live downstream and are explicitly marked as deprecated.
- Projections are presentation-only and must never shape the internal representation.
- Op config is op-owned and minimal; do not reuse a domain-wide config bag inside op contracts.
- Every existing config property, rule/policy, and function must be explicitly accepted into the model or rejected as legacy (no silent carry-through).
- Review the upstream Phase 2 model (Foundation), explicitly adopt authoritative inputs, and delete legacy reads. Also review any upstream refactor changes that touched Morphology surfaces and plan their removal.
- Review downstream consumers (Hydrology/Ecology/Narrative/Placement as applicable): document current dependencies, required changes, and plan downstream updates as part of this refactor.

Research discipline:
- Modeling is research-driven: reconcile target SPEC/ADR docs with domain specs, use earth-physics references, and lean on MCP/code-intel + web research; cite sources in the Phase 2 spike.
- Modeling is iterative: run the Phase 2 modeling loop (broad pipeline sweep -> deep domain dive -> synthesis -> refinement) and keep an iteration log; do not lock the model after a single pass.
- Phase 2 must include a conceptual narrative + diagrams (architecture view, data-flow, producer/consumer map with current vs target pipeline adjustments).
- Phase 2 must include an authority stack (canonical vs supporting; PRDs are non-authoritative).

Planning + documentation discipline:
- Phase 3 must include a sequencing refinement pass (re-order slices for pipeline safety, re-check downstream deltas, then lock).
- Phase 3 must include a dedicated documentation pass (slice or issue) that inventories every touched/created schema/function/op/step/stage/contract and adds JSDoc + schema descriptions with behavior, defaults, modes, and downstream impacts.
- Phase 3 must include locked decisions/bans with test-backed guardrails, a step decomposition plan (spine → steps → artifacts/buffers), and a consumer migration matrix (break/fix by slice).

Implementation guardrails (locked decisions; see implementation-traps reference):
- Ops stay pure; steps own runtime binding (no callbacks/functions across op boundaries).
- Trace is step-scoped by default; op-level trace requires explicit contract changes.
- RNG crosses boundaries as data (seed); ops build local RNGs.
- Defaults live in schemas/normalize; no hidden runtime defaults.
- Do not snapshot/freeze at publish boundaries.
- Avoid monolithic steps; step boundaries are the architecture.
- Schemas are the single source of truth; derive types from schemas.

Compatibility and cleanup rules:
- This refactor must not leave compat/projection surfaces in Morphology. Downstream consumers must be updated as part of this refactor.
- If a downstream domain needs transitional compatibility, it owns the deprecated shim and must mark it explicitly (`DEPRECATED` / `DEPRECATE ME`).
- If downstream deprecated shims are introduced, add a cleanup item in `docs/projects/engine-refactor-v1/triage.md`. If the immediate downstream domain can remove them safely and no other downstream consumers are affected, that downstream owns a dedicated cleanup issue; link it from triage.

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

| Phase | Artifact |
| --- | --- |
| Phase 1 | `docs/projects/engine-refactor-v1/resources/spike/spike-morphology-current-state.md` |
| Phase 2 | `docs/projects/engine-refactor-v1/resources/spike/spike-morphology-modeling.md` |
| Phase 3 | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-morphology-vertical-domain-refactor.md` |

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
