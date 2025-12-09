---
id: LOCAL-TBD-1
title: Implement Core Pipeline Infrastructure
state: planned
priority: 1
estimate: 2
project: engine-refactor-v1
milestone: milestone-1-foundation
assignees: [codex]
labels: [Improvement, Architecture]
parent: LOCAL-TBD
children: []
blocked_by: []
blocked: [LOCAL-TBD-2]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Define the `MapGenStep` interface, `StepRegistry`, and update `ExtendedMapContext` to support the new Task Graph architecture.

## Deliverables
- `packages/mapgen-core/src/core/pipeline.ts` containing the interface and registry.
- Updated `packages/mapgen-core/src/core/types.ts` with new context fields (`mesh`, `graph`).
- Unit tests for the Registry (registration, lookup, error handling).

## Acceptance Criteria
- [ ] `MapGenStep` interface is defined with `requires` and `provides` arrays.
- [ ] `StepRegistry` allows registering and retrieving steps by string ID.
- [ ] `ExtendedMapContext` includes optional `mesh` and `graph` properties.
- [ ] TypeScript compiles without errors.

## Testing / Verification
- `pnpm test:mapgen` should pass.
- Create a dummy step in a test file and verify it can be registered and retrieved.

## Dependencies / Notes
- This is the foundational type work required before implementing specific strategies.
- Reference [Architecture Spec](../../../system/libs/mapgen/architecture.md#2-the-task-graph-pipeline).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Keep the Registry simple: a `Map<string, MapGenStep>`.
- Ensure `ExtendedMapContext` imports the new `RegionMesh` and `PlateGraph` types (even if they are empty interfaces for now).

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
