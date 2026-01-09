---
id: LOCAL-TBD-M7-E
title: "[M7] Ecology as canonical exemplar"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: null
children:
  - LOCAL-TBD-M7-E1
  - LOCAL-TBD-M7-E2
  - LOCAL-TBD-M7-E3
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Ecology is the reference implementation for domain exports, ops registries, step authoring patterns, and (optionally) a stage public view. This refactor is intentionally late (after the compiler + authoring surfaces exist) so ecology can be migrated cleanly without introducing a second architecture.

## Deliverables

This workstream delivers ecology as the canonical exemplar:

- **E1:** Ecology domain entrypoint refactor (contracts + registries)
- **E2:** Ecology steps migration (compiler-first, no runtime resolveConfig)
- **E3:** Ecology stage public view + compile (Option A)

## Child Issues

| ID | Title | Status | blocked_by |
|---|---|---|---|
| [LOCAL-TBD-M7-E1](./LOCAL-TBD-M7-E1-ecology-domain-entrypoint.md) | Ecology domain entrypoint refactor | planned | [LOCAL-TBD-M7-B3, LOCAL-TBD-M7-B4] |
| [LOCAL-TBD-M7-E2](./LOCAL-TBD-M7-E2-ecology-steps-migration.md) | Ecology steps migration | planned | [LOCAL-TBD-M7-E1, LOCAL-TBD-M7-C2] |
| [LOCAL-TBD-M7-E3](./LOCAL-TBD-M7-E3-ecology-stage-public-compile.md) | Ecology stage public view + compile | planned | [LOCAL-TBD-M7-E2] |

## Sequencing

E1 -> E2 -> E3 (strictly sequential within this workstream).

E1 depends on B3, B4.
E2 depends on E1, C2.
E3 depends on E2.

## Acceptance Criteria

- [ ] All child issues (E1, E2, E3) are completed
- [ ] Ecology domain exports contract-only surface + registries
- [ ] Ecology steps no longer deep-import domain internals from recipes
- [ ] At least one ecology stage demonstrates stage public+compile end-to-end

## Testing / Verification

- `pnpm -C mods/mod-swooper-maps test`
- `rg -n "@mapgen/domain/ecology/ops/" mods/mod-swooper-maps/src` (expect zero hits)

## Dependencies / Notes

- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `docs/projects/engine-refactor-v1/resources/spec/recipe-compile`; they conflict with the target spec and will cause confusion.
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
