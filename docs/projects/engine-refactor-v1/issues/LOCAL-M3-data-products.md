---
id: LOCAL-M3-DATA-PRODUCTS
title: "[M3] Data Products Canonicalization"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Architecture, Data]
parent: null
children: []
blocked_by: [LOCAL-M3-LEGACY-WRAPPERS, LOCAL-M3-STORY-SYSTEM]
blocked: [LOCAL-M3-VALIDATION]
related_to: [CIV-34]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Formalize and standardize data product shapes (`Heightfield`, `ClimateField`, `StoryOverlays`, `RiverFlowData`), ensure legacy wrappers publish through these products, and make downstream stages consume products rather than ad-hoc globals.

## Deliverables

- [ ] **Heightfield as canonical product**
  - Finalize `HeightfieldBuffer` interface (elevation, terrain, landMask)
  - Published after morphology step
  - Downstream stages consume via `context.artifacts.heightfield`
- [ ] **ClimateField as canonical product**
  - Finalize `ClimateFieldBuffer` interface (rainfall, humidity grids)
  - Published after climate step
  - Climate consumers read `ClimateField` not `GameplayMap`
- [ ] **StoryOverlays as canonical product**
  - All overlay keys populated: MARGINS, CORRIDORS_PRE, CORRIDORS_POST, SWATCHES, OROGENY, PALEO
  - Consumers use `getStoryOverlay()` API
  - Legacy `StoryTags` reduced to compat layer
- [ ] **RiverFlowData product** (new)
  - Interface for river graph/masks
  - Published by hydrology step
  - Available for paleo/corridor post steps
- [ ] **Update downstream consumers**
  - `biomes.ts` reads ClimateField
  - `features.ts` reads ClimateField + StoryOverlays
  - `placement.ts` reads Heightfield + StoryOverlays
- [ ] **Update config-wiring-status.md** to reflect product usage

## Acceptance Criteria

- [ ] All products have finalized, documented interfaces
- [ ] Legacy wrappers publish to artifacts after execution
- [ ] No direct `GameplayMap` reads in modernized stages
- [ ] No direct `StoryTags` reads in new step code
- [ ] Products validated at step boundaries (via requires/provides)
- [ ] Build passes, integration test passes

## Testing / Verification

```bash
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core run check-types
```

- Test each product is populated after its producing step
- Verify consumers receive expected data
- Integration test with full pipeline

## Dependencies / Notes

- **Blocked by:** [LOCAL-M3-LEGACY-WRAPPERS](LOCAL-M3-legacy-wrappers.md), [LOCAL-M3-STORY-SYSTEM](LOCAL-M3-story-system.md)
- **Blocks:** [LOCAL-M3-VALIDATION](LOCAL-M3-validation.md)
- **Related to:** [CIV-34](CIV-34-foundation-context-contract.md)
- **Reference:** [architecture.md](../../../system/libs/mapgen/architecture.md) §Data Products
- **Reference:** [status.md](../status.md) §Gaps

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Product Interfaces

```typescript
// Heightfield (already exists, formalize)
export interface HeightfieldBuffer {
  readonly elevation: Float32Array;
  readonly terrain: Uint8Array;
  readonly landMask: Uint8Array;
  readonly width: number;
  readonly height: number;
}

// ClimateField (already exists, formalize)
export interface ClimateFieldBuffer {
  readonly rainfall: Float32Array;
  readonly humidity: Float32Array;
  readonly temperature?: Float32Array;  // Future
  readonly width: number;
  readonly height: number;
}

// RiverFlowData (new)
export interface RiverFlowData {
  /** River segments as adjacency graph */
  readonly segments: RiverSegment[];
  /** Flow direction per tile (optional mask approach) */
  readonly flowDirection?: Uint8Array;
  /** Accumulated flow per tile */
  readonly accumulatedFlow?: Float32Array;
}

export interface RiverSegment {
  readonly sourceIdx: number;
  readonly targetIdx: number;
  readonly flow: number;
}
```

### Consumer Migration Pattern

```typescript
// Before (direct GameplayMap read)
const rainfall = GameplayMap.GetRainfallAt(x, y);

// After (product read)
const climateField = ctx.artifacts.climateField;
const rainfall = climateField.rainfall[y * width + x];
```

### Product Topology (from architecture.md)

```
Foundation → FoundationContext + Heightfield(initial)
    ↓
Morphology → Heightfield(final) + ShoreMask
    ↓
Hydrology → RiverFlowData
    ↓
Climate → ClimateField
    ↓
Story → StoryOverlays
    ↓
Biomes → BiomeField + FeatureField
    ↓
Placement → PlayerStarts + Resources
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
