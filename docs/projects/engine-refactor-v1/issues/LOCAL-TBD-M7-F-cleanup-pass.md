---
id: LOCAL-TBD-M7-F
title: "[M7] Cleanup pass (no legacy left)"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [technical-debt]
parent: null
children:
  - LOCAL-TBD-M7-F1
  - LOCAL-TBD-M7-F2
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

This milestone is complete only when there is one architecture and no lingering legacy scaffolding. This workstream verifies no shims remain, removes dead paths, and tightens enforcement.

## Deliverables

This workstream delivers cleanup and enforcement:

- **F1:** Verify no shims + remove dead paths
- **F2:** Final hygiene + enforcement tightening

## Child Issues

| ID | Title | Status | blocked_by |
|---|---|---|---|
| [LOCAL-TBD-M7-F1](./LOCAL-TBD-M7-F1-verify-no-shims.md) | Verify no shims + remove dead paths | planned | [M7-A2, M7-B4, M7-C3, M7-D2, M7-E2] |
| [LOCAL-TBD-M7-F2](./LOCAL-TBD-M7-F2-final-hygiene.md) | Final hygiene + enforcement tightening | planned | [M7-F1] |

## Sequencing

F1 -> F2 (strictly sequential).

F1 depends on A2, B4, C3, D2, E2.
F2 depends on F1.

## Acceptance Criteria

- [ ] All child issues (F1, F2) are completed
- [ ] No resolveConfig naming remains on authoring step/op surfaces
- [ ] No runtime default/clean code path remains in executor or steps
- [ ] Spec and enforcement docs match the final code reality

## Testing / Verification

- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `rg -n "\\bresolveConfig\\b" packages/mapgen-core/src mods/mod-swooper-maps/src` (expect zero hits)
- `rg -n "Value\\.(Default|Convert|Clean)" packages/mapgen-core/src mods/mod-swooper-maps/src` (expect zero hits outside compiler-only paths)

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
