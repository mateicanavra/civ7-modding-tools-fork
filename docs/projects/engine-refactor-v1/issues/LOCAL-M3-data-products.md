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

Standardize data product shapes and make downstream stages consume products rather than globals.

## Context

**System area:** `mapgen-core` data flow (`core/types.ts`, `layers/*.ts` consumers)

**Change:** Formalizes intermediate data shapes (Heightfield, ClimateField, StoryOverlays, RiverFlow) as typed interfaces. Steps publish to `context.artifacts`; consumers read from artifacts instead of `GameplayMap` or `StoryTags` globals.

**Outcome:** Data dependencies become explicit and validated. Decouples mapgen-core from Civ7 engine globals, improving testability and enabling headless generation. Products can be cached, serialized, or visualized for debugging.

## Deliverables

- [ ] **Product interfaces finalized** — Heightfield, ClimateField, StoryOverlays, RiverFlowData
- [ ] **Legacy wrappers publish products** — Each step populates its declared `provides`
- [ ] **Consumer migration** — Biomes/features/placement read products not GameplayMap

## Acceptance Criteria

- [ ] Products published and consumed through artifacts
- [ ] No direct GameplayMap/StoryTags reads in modernized code
- [ ] Build and integration tests pass

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
