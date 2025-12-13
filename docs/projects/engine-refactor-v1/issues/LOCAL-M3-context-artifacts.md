---
id: LOCAL-M3-CONTEXT-ARTIFACTS
title: "[M3] MapGenContext Artifacts Evolution"
state: planned
priority: 1
estimate: 2
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Architecture]
parent: LOCAL-M3-PIPELINE
children: []
blocked_by: [LOCAL-M3-PIPELINE]
blocked: [LOCAL-M3-FOUNDATION-PILOT]
related_to: [CIV-34]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Extend `MapGenContext` with a typed `artifacts` container that separates intermediate pipeline data (`mesh`, `crust`, `plateGraph`, `tectonics`) from final output fields. This enables steps to declare and validate their dependencies cleanly.

## Deliverables

- [ ] **Artifacts container in `MapGenContext`** (`packages/mapgen-core/src/core/types.ts`)
  - `artifacts: MapGenArtifacts` with optional typed properties
  - Clear separation: `fields` (mutable output) vs `artifacts` (intermediate data)
- [ ] **Foundation artifact type definitions**
  - `RegionMesh` interface (sites, neighbors, areas, centroids)
  - `CrustData` interface (type, age arrays)
  - `PlateGraph` interface (cellToPlate, plates)
  - `PlateRegion` interface (id, type, seedLocation, velocity, rotation)
  - `TectonicData` interface (uplift, rift, shear, volcanism, fracture, cumulative)
- [ ] **Type guards for artifact presence**
  - `hasArtifact(ctx, key): boolean`
  - `assertArtifact(ctx, key): asserts` (throws if missing)
- [ ] **Export types from `core/index.ts`**
- [ ] **Backward compatibility** with existing `ExtendedMapContext` consumers

## Acceptance Criteria

- [ ] `MapGenContext.artifacts` is properly typed
- [ ] All foundation artifact interfaces match [foundation.md](../../../system/libs/mapgen/foundation.md) spec
- [ ] Type guards work correctly for artifact presence checks
- [ ] Existing code using `ExtendedMapContext` compiles without changes
- [ ] TypeScript compiles without errors
- [ ] Types are exported and usable by step implementations

## Testing / Verification

```bash
pnpm -C packages/mapgen-core run check-types
pnpm -C packages/mapgen-core test
```

- Verify `MapGenContext.artifacts` is properly typed
- Test type guards with present and absent artifacts
- Ensure backward compatibility by running existing tests

## Dependencies / Notes

- **Blocked by:** [LOCAL-M3-PIPELINE](LOCAL-M3-pipeline-infrastructure.md) (needs step interface first)
- **Blocks:** [LOCAL-M3-FOUNDATION-PILOT](LOCAL-M3-foundation-pilot.md)
- **Related to:** [CIV-34](CIV-34-foundation-context-contract.md) (FoundationContext contract)
- **Reference:** [foundation.md](../../../system/libs/mapgen/foundation.md) data model
- **Reference:** [architecture.md](../../../system/libs/mapgen/architecture.md) §MapGenContext

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Code Location

```
packages/mapgen-core/src/core/types.ts (modify)
├── MapGenArtifacts interface
├── RegionMesh interface
├── CrustData interface
├── PlateGraph interface
├── PlateRegion interface
├── TectonicData interface
└── Type guards (hasArtifact, assertArtifact)
```

### Data Model (from Foundation Architecture)

```typescript
export interface MapGenArtifacts {
  // Foundation phase
  mesh?: RegionMesh;
  crust?: CrustData;
  plateGraph?: PlateGraph;
  tectonics?: TectonicData;

  // Existing products (already in context)
  foundation?: FoundationContext;
  heightfield?: HeightfieldBuffer;
  climateField?: ClimateFieldBuffer;
  storyOverlays?: StoryOverlayRegistry;

  // Future products
  hydrology?: HydrologyData;
  riverFlow?: RiverFlowData;
}

export interface RegionMesh {
  /** Array of [x, y] coordinates for each cell centroid */
  sites: Point2D[];
  /** Adjacency list: neighbors[i] = [j, k, l...] */
  neighbors: Int32Array[];
  /** Area of each cell (for weighted partitioning) */
  areas: Float32Array;
  /** Centroids for relaxation calculations */
  centroids: Point2D[];
}

export interface CrustData {
  /** 0=Oceanic (Basalt), 1=Continental (Granite) */
  type: Uint8Array;
  /** 0=New (Active), 255=Ancient (Craton) */
  age: Uint8Array;
}

export interface PlateGraph {
  /** Maps Mesh Cell Index -> Plate ID */
  cellToPlate: Int16Array;
  /** The definition of each plate */
  plates: PlateRegion[];
}

export interface PlateRegion {
  id: number;
  type: 'major' | 'minor';
  seedLocation: Point2D;
  velocity: Vector2D;
  rotation: number;
}

export interface TectonicData {
  upliftPotential: Uint8Array;
  riftPotential: Uint8Array;
  shearStress: Uint8Array;
  volcanism: Uint8Array;
  fracture: Uint8Array;
  cumulativeUplift: Uint8Array;
}
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
