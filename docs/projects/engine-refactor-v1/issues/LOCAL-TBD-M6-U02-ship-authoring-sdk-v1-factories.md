---
id: LOCAL-TBD-M6-U02
title: "[M6] Ship authoring SDK v1 factories"
state: planned
priority: 2
estimate: 16
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: [LOCAL-TBD-M6-U02-1, LOCAL-TBD-M6-U02-2]
blocked_by: [LOCAL-TBD-M6-U01]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Ship the authoring SDK v1 surface by completing the sequenced child issues.

## Deliverables
- Authoring SDK v1 is available under `packages/mapgen-core/src/authoring/**`.
- `createStep`, `createStage`, and `createRecipe` are the primary authoring entrypoints.
- Registry plumbing is internal to the authoring SDK.

## Acceptance Criteria
- Child issues are complete and the authoring SDK v1 contract is available.
- Steps require a config schema and recipes require tag definitions (even if empty).
- Recipes can compile and execute without exposing registry internals.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U01](./LOCAL-TBD-M6-U01-promote-runtime-pipeline-as-engine-sdk-surface.md)
- Sub-issues:
  - [LOCAL-TBD-M6-U02-1](./LOCAL-TBD-M6-U02-1-define-authoring-pojos-and-schema-requirements.md)
  - [LOCAL-TBD-M6-U02-2](./LOCAL-TBD-M6-U02-2-implement-createrecipe-registry-plumbing-and-api-surface.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Sequencing: complete `LOCAL-TBD-M6-U02-1` before `LOCAL-TBD-M6-U02-2` to lock in the authored module shapes.
- Child issue docs carry the detailed implementation steps.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
