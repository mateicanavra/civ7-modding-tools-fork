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

Path roots (convention used here):
- `/src/...` = `mods/mod-swooper-maps/src/...`
- `/packages/mapgen-core/...` = `packages/mapgen-core/...`

## Authoritative posture (enforced)

Hard principle:
- **Legacy behavior and legacy authoring patterns should not be propagated.**
- **All new work must be expressed through the canonical architecture and authoring surfaces.**

Design principles (authoritative surfaces):
- Hydrology owns its surfaces. If a clean internal model requires breaking a compatibility surface, break it and update downstream in the same refactor.
- Projections are presentation-only and must never shape the internal representation.
- Op config is op-owned and minimal; do not reuse a domain-wide config bag inside op contracts.

Compatibility and cleanup rules:
- Upstream compat/projection artifacts are **not** canonical inputs.
- If this refactor leaves compat projections in place, add a cleanup item in `docs/projects/engine-refactor-v1/triage.md`.
- If the immediate downstream domain can remove them safely and no other downstream consumers are affected, that downstream owns the cleanup and must have a dedicated issue; link it from triage.

Anti-patterns (concise; see WORKFLOW for full list):
- Phase bleed (modeling vs slicing vs implementation).
- Model/projection confusion.
- Decisions buried in prose.
- Config bag in ops.

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
| Phase 1 | `docs/projects/engine-refactor-v1/resources/spike/spike-hydrology-current-state.md` | not started |
| Phase 2 | `docs/projects/engine-refactor-v1/resources/spike/spike-hydrology-modeling.md` | not started |
| Phase 3 | `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-hydrology-vertical-domain-refactor.md` | not started |

## Phase 1 hypotheses to validate (current-state)

- Hydrology is split across multiple recipe stages:
  - `/src/recipes/standard/stages/hydrology-pre/`
  - `/src/recipes/standard/stages/hydrology-core/`
  - `/src/recipes/standard/stages/hydrology-post/`
- These stages appear to still use legacy stage/step authoring posture (no stage-owned `artifacts.ts`, legacy tag-based `requires`/`provides`, direct imports of `.../artifacts.js`).
- `/src/domain/hydrology/ops/contracts.ts` is currently empty (not contract-first in practice).
- Current steps perform climate and water work directly:
  - `lakes`, `climate-baseline` (pre)
  - `rivers` (core)
  - `climate-refine` (post)
- Cross-domain coupling to make explicit in the contract matrix:
  - Climate refine consumes `env.directionality` and narrative motifs (`rifts`, `hotspots`) plus river adjacency.

## Notes

- This plan is an index and posture statement only.
- Current-state inventory belongs in the Phase 1 spike.
- Authoritative modeling belongs in the Phase 2 spike.
- Slice planning and sequencing belong in the Phase 3 issue.
