---
id: M11-U01
title: "[M11/U01] Phase 2 spec + docs authority reconciliation (Morphology physics-first)"
state: done
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [morphology, docs, spec, guardrails]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [M11-U00, M10-U05]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Reconcile internal contradictions between Phase 2 Morphology spec files and “canonical” example/docs so implementers cannot accidentally violate locked posture while believing they’re compliant.

## Deliverables
- Phase 2 trilogy is internally consistent for:
  - `morphology/compute-substrate` inputs vs `artifact:morphology.substrate` semantics.
  - volcano truth intent + optional `artifact:map.*` surfaces.
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/examples/VOLCANO.md` aligned to Phase 2 bans (or explicitly marked non-authoritative).
- `docs/system/libs/mapgen/morphology.md` reconciled to Phase 2 reality (or reclassified as historical / non-authoritative).
- Add a lightweight lint/CI gate that fails if “canonical example” docs contradict Phase 2 bans.

## Acceptance Criteria
- There is one unambiguous answer in Phase 2 docs for:
  - whether substrate is uplift/rift-only or crust/material-derived (and where those signals come from).
- Example/docs cannot instruct Physics steps to:
  - consume `artifact:map.*` / `effect:map.*`, or
  - read `buffer:heightfield`/adapter state as truth inputs.
- A guardrail exists that prevents regressions of this doc drift class.

## Implementation Decisions

### Treat Phase 2 substrate drivers as uplift/rift baseline (material drivers are explicit evolution)
- **Context:** Phase 2 docs contradicted themselves: the step map described uplift/rift-only substrate inputs while the contracts doc stated crust/material drivers as a requirement.
- **Options:** (A) amend Phase 2 to require material/lithology drivers immediately, (B) clarify Phase 2 baseline as uplift/rift-only with material drivers as explicit evolution.
- **Choice:** (B) clarify Phase 2 baseline as uplift/rift-only and document material drivers as an explicit (non-silent) evolution path.
- **Rationale:** matches current implementation and keeps “physics-first upgrades” reviewable as follow-on work rather than retroactive canon.
- **Risk:** requires discipline to avoid treating “material drivers” as implied without a published truth surface and explicit migration slice.

## Testing / Verification
- `rg -n \"canonical\" docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/examples -S`
- `rg -n \"buffer:heightfield|artifact:map\\.|effect:map\\.\" docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/examples -S`
- `rg -n \"compute-substrate\" docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec -S`

## Dependencies / Notes
- Should be done after M10 completes (post-U05) so docs reflect the final cutover surfaces.
