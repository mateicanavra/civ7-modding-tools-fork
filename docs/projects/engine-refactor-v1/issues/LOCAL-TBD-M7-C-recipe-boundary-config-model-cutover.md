---
id: LOCAL-TBD-M7-C
title: "[M7] Recipe boundary + config model cutover"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: null
children:
  - LOCAL-TBD-M7-C1
  - LOCAL-TBD-M7-C2
  - LOCAL-TBD-M7-C3
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

This is where compilation becomes mandatory for any real runtime callsite. The strategy is: land compilation at the recipe boundary first, then migrate stages incrementally, then remove the bypass.

## Deliverables

This workstream delivers recipe boundary compilation and config model cutover:

- **C1:** Introduce recipe boundary compilation (before engine plan compilation)
- **C2:** Update stage+step authoring to the new config shape
- **C3:** Remove runtime compilation fallbacks at the recipe boundary

## Child Issues

| ID | Title | Status | blocked_by |
|---|---|---|---|
| [LOCAL-TBD-M7-C1](./LOCAL-TBD-M7-C1-recipe-boundary-compilation.md) | Introduce recipe boundary compilation | planned | [M7-A2, M7-B2, M7-B3, M7-B4] |
| [LOCAL-TBD-M7-C2](./LOCAL-TBD-M7-C2-stage-step-config-shape.md) | Update stage+step authoring to new config shape | planned | [M7-C1, M7-B1, M7-B2] |
| [LOCAL-TBD-M7-C3](./LOCAL-TBD-M7-C3-remove-runtime-fallbacks.md) | Remove runtime compilation fallbacks | planned | [M7-C2] |

## Sequencing

C1 -> C2 -> C3 (strictly sequential within this workstream).

C1 depends on A2, B2, B3, B4.
C2 depends on C1, B1, B2.
C3 depends on C2.

## Acceptance Criteria

- [ ] All child issues (C1, C2, C3) are completed
- [ ] At least one migrated stage runs end-to-end through compiler -> plan -> executePlan
- [ ] No runtime resolveConfig required for migrated stages/steps

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm test`

## Dependencies / Notes

- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `spec_package`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

This is a parent/index issue. Implementation details live in child issue docs.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Child Issues](#child-issues)
- [Sequencing](#sequencing)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
