---
id: LOCAL-TBD
title: Implement Foundation Stage Pipeline
state: planned
priority: 1
estimate: 8
project: engine-refactor-v1
milestone: milestone-1-foundation
assignees: [codex]
labels: [Feature, Architecture]
parent: null
children: [LOCAL-TBD-1, LOCAL-TBD-2, LOCAL-TBD-3, LOCAL-TBD-4, LOCAL-TBD-5]
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Implement the new "Foundation" stage of map generation using the Task Graph architecture, replacing the legacy `plates.ts` logic with a composable Mesh -> Partition -> Physics pipeline.

## Deliverables
- A functional `StepRegistry` and `MapGenStep` interface.
- Three concrete strategies: `VoronoiMesh`, `WeightedPartition`, and `TectonicPhysics`.
- A refactored `MapOrchestrator` that executes this pipeline based on JSON config.
- Verified output of plate boundaries and tectonic stress fields.

## Acceptance Criteria
- [ ] `MapOrchestrator` runs the Foundation stage via the `StepRegistry`.
- [ ] Mesh generation produces a relaxed Voronoi graph using `d3-delaunay`.
- [ ] Plate partitioning respects "Major" vs "Minor" plate configuration.
- [ ] Physics simulation runs on graph edges and produces valid `FoundationContext` tensors.
- [ ] Legacy `computePlatesVoronoi` fallback is removed or deprecated.

## Testing / Verification
- Run `pnpm test:mapgen` to verify unit tests for each step.
- Run `civ7 map generate --json` and inspect the `foundation` output object.
- Visualize the resulting plate map using the ASCII debugger.

## Dependencies / Notes
- This is the parent issue for the Foundation Stage refactor.
- See [Architecture Spec](../../../system/libs/mapgen/architecture.md) for design details.
- See [Plate Generation PRD](../resources/PRD-plate-generation.md) for implementation specifics.

**Sub-Issues:**
- LOCAL-TBD-1: Implement Core Pipeline Infrastructure
- LOCAL-TBD-2: Implement Mesh Generation Strategy
- LOCAL-TBD-3: Implement Plate Partitioning Strategy
- LOCAL-TBD-4: Implement Tectonic Physics Strategy
- LOCAL-TBD-5: Integrate Foundation Pipeline into Orchestrator

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- This epic covers the entire vertical slice of the Foundation stage.
- Sub-issues are sequenced to build the pipeline from the bottom up (Types -> Mesh -> Partition -> Physics -> Integration).

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
