---
name: plan-hydrology-vertical-domain-refactor
description: |
  Draft Hydrology domain implementation plan/spec.
  This plan instantiates the shared WORKFLOW for a Hydrology refactor and is intended to stay “live”:
  each phase ends with a lookback that updates downstream phases based on what we learned.
---

# PLAN: Hydrology (Vertical Domain Refactor)

This is a **thin policy + index** plan for the Hydrology refactor. Modeling lives in the Phase 2 spike. Slice planning lives in the Phase 3 issue.

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
- Hydrology owns its surfaces. The refactor must not retain legacy compat surfaces; update downstream consumers in the same refactor. If downstream needs transitional shims, they live downstream and are explicitly marked as deprecated.
- Projections are presentation-only and must never shape the internal representation.
- Op config is op-owned and minimal; do not reuse a domain-wide config bag inside op contracts.
- Every existing config property, rule/policy, and function must be explicitly accepted into the model or rejected as legacy (no silent carry-through).
- Review the upstream Phase 2 model (Morphology, plus Foundation as needed), explicitly adopt authoritative inputs, and delete legacy reads. Also review any upstream refactor changes that touched Hydrology surfaces and plan their removal.
- Review downstream consumers (Ecology/Narrative/Placement as applicable): document current dependencies, required changes, and plan downstream updates as part of this refactor.

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
- This refactor must not leave compat/projection surfaces in Hydrology. Downstream consumers must be updated as part of this refactor.
- If a downstream domain needs transitional compatibility, it owns the deprecated shim and must mark it explicitly (`DEPRECATED` / `DEPRECATE ME`).
- If downstream deprecated shims are introduced, add a cleanup item in `docs/projects/engine-refactor-v1/triage.md`. If the immediate downstream domain can remove them safely and no other downstream consumers are affected, that downstream owns a dedicated cleanup issue; link it from triage.

Anti-patterns (concise; see WORKFLOW for full list):
- Phase bleed (modeling vs slicing vs implementation).
- Model/projection confusion.
- Decisions buried in prose.
- Config bag in ops.
- Silent legacy carry-through.

## Domain framing (Hydrology/Climate)

Hydrology/Climate sits immediately downstream of Morphology and publishes the authoritative climate + surface-water signals that Ecology/Narrative/Placement consume.

- It is buffer-heavy (shared, mutable, iterative layers like climate fields and routing indices).
- It is cross-domain aware (consumes upstream morphology layers and optionally narrative motifs that bias climate).

North-star references:
- `docs/system/libs/mapgen/hydrology.md`
- `docs/system/libs/mapgen/architecture.md`
- `docs/system/libs/mapgen/morphology.md` (upstream input model)
- `docs/system/libs/mapgen/ecology.md` (downstream contract stability)
- `docs/system/libs/mapgen/placement.md` (downstream contract stability)
- `docs/system/libs/mapgen/narrative.md` (downstream contract stability)

## Phase artifacts (authoritative links)

| Phase | Artifact | Status |
| --- | --- | --- |
| Phase 0.5 | `docs/projects/engine-refactor-v1/resources/spike/spike-hydrology-greenfield.md` | complete |
| Phase 1 | `docs/projects/engine-refactor-v1/resources/spike/spike-hydrology-current-state.md` | complete |
| Phase 2 | `docs/projects/engine-refactor-v1/resources/spike/spike-hydrology-modeling.md` | not started |
| Phase 3 | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-hydrology-vertical-domain-refactor.md` | not started |

## Phase 1 hypotheses to validate (current-state)

Validated/updated in Phase 1 spike:
- Hydrology is split across recipe stages:
  - `/src/recipes/standard/stages/hydrology-pre/`
  - `/src/recipes/standard/stages/hydrology-core/`
  - `/src/recipes/standard/stages/hydrology-post/`
- Stage-owned artifacts exist for `hydrology-pre` and `hydrology-core` (`artifacts.ts`), but several artifact schemas remain `Type.Any()` (typed-array strictness is enforced ad-hoc in step impls today).
- Hydrology ops are present (not empty): `hydrology/compute-wind-fields` (contract + implementation).
- Cross-domain coupling to make explicit in Phase 2:
  - Narrative `story-swatches` calls Hydrology `applyClimateSwatches` (coupling inversion).
  - Hydrology refine consumes narrative motifs (rifts/hotspots) via overlays + consumes river adjacency + wind fields.

## Notes

- This plan is an index and posture statement only.
- Current-state inventory belongs in the Phase 1 spike.
- Authoritative modeling belongs in the Phase 2 spike.
- Slice planning and sequencing belong in the Phase 3 issue.
