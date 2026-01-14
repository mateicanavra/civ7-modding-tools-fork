---
id: LOCAL-TBD-M7-A
title: "[M7] Compiler foundation"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: null
children:
  - LOCAL-TBD-M7-A1
  - LOCAL-TBD-M7-A2
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make the compiler pipeline a repo-real module with tests before any consuming code is rewritten. Phase ordering and helper behavior are pinned by the target spec (`02-compilation.md`) and mirrored by the spec's TypeScript reference implementation (`architecture/ts/compiler.ts`).

## Deliverables

This workstream delivers the compiler module skeleton and strict normalization primitives:

- **A1:** Compiler module skeleton + strict normalization helpers
- **A2:** `compileRecipeConfig` end-to-end wiring

## Child Issues

| ID | Title | Status | blocked_by |
|---|---|---|---|
| [LOCAL-TBD-M7-A1](./LOCAL-TBD-M7-A1-compiler-module-skeleton.md) | Compiler module skeleton + strict normalization | planned | [] |
| [LOCAL-TBD-M7-A2](./LOCAL-TBD-M7-A2-compile-recipe-config-wiring.md) | compileRecipeConfig end-to-end wiring | planned | [LOCAL-TBD-M7-A1] |

## Sequencing

A1 must complete before A2. A2 depends on A1 for the normalization helpers.

## Acceptance Criteria

- [ ] All child issues (A1, A2) are completed
- [ ] Compiler entrypoint compiles a small synthetic recipe in unit tests
- [ ] No engine behavior changes yet

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm -C packages/mapgen-core check`

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
