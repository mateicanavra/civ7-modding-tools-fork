---
id: LOCAL-TBD-1
title: Establish Core Pipeline Infrastructure
state: planned
priority: 1
estimate: 0
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
Establish the "Skeleton" for the new Foundation Pipeline: define the `MapGenStep` interface, implement the `StepRegistry`, and update `MapGenContext` to split `fields` (Canvas) vs `artifacts` (Intermediate data).

## Deliverables
- `MapGenStep` interface in `packages/mapgen-core/src/core/pipeline.ts` with `phase`, `requires`, `provides`, `shouldRun`.
- `StepRegistry` implementation (simple Map-based plugin system) in the same file.
- Updated `MapGenContext` in `packages/mapgen-core/src/core/types.ts` with the new `artifacts` container.
- Type definitions for `RegionMesh`, `PlateGraph`, and `TectonicData` (can be empty interfaces initially).
- Unit tests for the Registry (registration, lookup, error handling).

## Acceptance Criteria
- [ ] `MapGenStep` interface is defined with `phase`, `requires`, `provides`, and `shouldRun` properties.
- [ ] `StepRegistry` allows registering and retrieving steps by string ID.
- [ ] `MapGenContext` includes `artifacts` object with optional `mesh`, `plateGraph`, and `tectonics` properties.
- [ ] `RegionMesh`, `PlateGraph`, and `TectonicData` interfaces match the Foundation Stage Architecture spec.
- [ ] TypeScript compiles without errors.

## Testing / Verification
- `pnpm test:mapgen` should pass.
- Create a dummy step in a test file and verify it can be registered and retrieved.
- Verify that `MapGenContext.artifacts` is properly typed.

## Dependencies / Notes
- This is the foundational type work required before implementing specific strategies.
- **Blocked:** LOCAL-TBD-2
- **Reference:** [Foundation Stage Architecture](../../../system/libs/mapgen/foundation.md) for data model definitions.
- **Reference:** [Architecture Spec](../../../system/libs/mapgen/architecture.md) for pipeline design.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Data Model (from Foundation Architecture)

```typescript
interface RegionMesh {
  /** Array of [x, y] coordinates for each cell centroid */
  sites: Point2D[];
  /** Adjacency list: neighbors[i] = [j, k, l...] */
  neighbors: Int32Array[];
  /** Area of each cell (for weighted partitioning) */
  areas: Float32Array;
  /** Centroids for relaxation calculations */
  centroids: Point2D[];
}

interface PlateGraph {
  /** Maps Mesh Cell Index -> Plate ID */
  cellToPlate: Int16Array;
  /** The definition of each plate */
  plates: PlateRegion[];
}

interface PlateRegion {
  id: number;
  type: 'major' | 'minor';
  seedLocation: Point2D;
  velocity: Vector2D;
  rotation: number;
}

interface TectonicData {
  /** 0-1: Intensity of collision (Convergent) */
  upliftPotential: Uint8Array;
  /** 0-1: Intensity of separation (Divergent) */
  riftPotential: Uint8Array;
  /** 0-1: Intensity of shearing (Transform) */
  shearStress: Uint8Array;
  /** 0-1: Distance to nearest boundary (inverted) */
  boundaryCloseness: Uint8Array;
}
```

### MapGenStep Interface

```typescript
interface MapGenStep {
  id: string;           // e.g., 'core.mesh.voronoi'
  phase: string;        // e.g., 'foundation'
  requires: string[];   // Artifact keys this step needs
  provides: string[];   // Artifact keys this step produces
  shouldRun(ctx: MapGenContext): boolean;
  run(ctx: MapGenContext): void | Promise<void>;
}
```

### StepRegistry

- Keep it simple: a `Map<string, MapGenStep>`.
- Methods: `register(step)`, `get(id)`, `getByPhase(phase)`.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
