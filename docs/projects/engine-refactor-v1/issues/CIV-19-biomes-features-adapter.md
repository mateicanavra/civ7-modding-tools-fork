---
id: CIV-19
title: "[M-TS-P0] Wire Biomes & Features Adapter Integration"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [bug, architecture]
parent: CIV-14
children: []
blocked_by: [CIV-18]
blocked: [CIV-23]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Replace local stubs in `biomes.ts` and `features.ts` with real adapter calls to Civ7's biome/feature generators, so TS logic becomes a thin layer on top of engine behavior rather than a parallel synthetic system.

## Problem

### Phantom Types & Stubs

`layers/biomes.ts` and `layers/features.ts` define local interfaces (`BiomeAdapter`, `FeaturesAdapter`) that do not exist on the main `EngineAdapter`. To make this compile, the code uses local stubs:

```typescript
// biomes.ts
const BiomeAdapter = {
  getBiomeGlobal: () => -1,  // Stub returns invalid ID
  setBiomeType: () => {},    // No-op
  designateBiomes: () => {}, // No-op
};
```

**Result:** Biomes and features are "generated" but produce nothing meaningful against the real engine.

### Missing Engine Integration

The TS biomes/features code should:
1. Call Civ7's base-standard biome generator
2. Read biome globals from GameInfo
3. Apply TS-specific nudges on top (tundra restraint, tropical coasts, etc.)

Currently, none of this happens.

## Deliverables

- [ ] **Extend adapter surface** (either `EngineAdapter` or extension interface):
  - **Biomes:**
    - `designateBiomes(width: number, height: number): void`
    - `getBiomeGlobal(name: string): number`
    - `setBiomeType(x: number, y: number, biomeId: number): void`
    - `getBiomeType(x: number, y: number): number`
  - **Features:**
    - `addFeatures(width: number, height: number): void`
    - `getFeatureTypeIndex(name: string): number`
    - `setFeatureType(x: number, y: number, featureId: number): void`
    - `getFeatureType(x: number, y: number): number`
    - `NO_FEATURE` sentinel constant
- [ ] **Update `Civ7Adapter`** in `@civ7/adapter`:
  - Wrap Civ7's base-standard biome module
  - Wrap GameInfo/FeatureTypes appropriately
  - Expose biome globals lookup
- [ ] **Replace local stubs:**
  - `layers/biomes.ts`: Call adapter.designateBiomes, adapter.getBiomeGlobal
  - `layers/features.ts`: Call adapter.addFeatures, adapter.getFeatureTypeIndex
- [ ] **Update MockAdapter** with test implementations

## Acceptance Criteria

- [ ] `EngineAdapter` interface includes biomes/features methods
- [ ] `Civ7Adapter` implements biomes/features by wrapping base-standard
- [ ] `layers/biomes.ts` calls adapter methods, not local stubs
- [ ] `layers/features.ts` calls adapter methods, not local stubs
- [ ] MockAdapter provides testable biomes/features mocks
- [ ] Build passes, tests pass

## Testing / Verification

```typescript
// Test: biomes uses adapter
test("biomes calls adapter.designateBiomes", () => {
  const adapter = createMockAdapter();
  const ctx = createMockContext({ adapter });

  applyBiomes(ctx);

  expect(adapter.designateBiomes).toHaveBeenCalledWith(ctx.dimensions.width, ctx.dimensions.height);
});

// Test: features uses adapter
test("features calls adapter.addFeatures", () => {
  const adapter = createMockAdapter();
  const ctx = createMockContext({ adapter });

  applyFeatures(ctx);

  expect(adapter.addFeatures).toHaveBeenCalled();
});
```

```bash
# Build verification
pnpm -C packages/mapgen-core build
pnpm -C packages/civ7-adapter build

# Run adapter tests
pnpm -C packages/civ7-adapter test --grep "biomes|features"
```

## Dependencies / Notes

- **Blocked by**: Call-site fixes (stages must execute first)
- **Blocks**: Integration tests
- **Related to**: Placement adapter (similar pattern)

### Files to Modify

- `packages/civ7-adapter/src/types.ts` — extend EngineAdapter interface
- `packages/civ7-adapter/src/civ7-adapter.ts` — implement biomes/features methods
- `packages/civ7-adapter/src/mock-adapter.ts` — add mock implementations
- `packages/mapgen-core/src/layers/biomes.ts` — use adapter instead of stubs
- `packages/mapgen-core/src/layers/features.ts` — use adapter instead of stubs

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Adapter Interface Extensions

```typescript
// @civ7/adapter/types.ts
export interface BiomesMethods {
  designateBiomes(width: number, height: number): void;
  getBiomeGlobal(name: string): number;
  setBiomeType(x: number, y: number, biomeId: number): void;
  getBiomeType(x: number, y: number): number;
}

export interface FeaturesMethods {
  addFeatures(width: number, height: number): void;
  getFeatureTypeIndex(name: string): number;
  setFeatureType(x: number, y: number, featureId: number): void;
  getFeatureType(x: number, y: number): number;
  readonly NO_FEATURE: number;
}

export interface EngineAdapter extends CoreMethods, BiomesMethods, FeaturesMethods {
  // Combined interface
}
```

### Civ7Adapter Implementation

```typescript
// @civ7/adapter/civ7-adapter.ts
import { designateBiomes as civ7DesignateBiomes } from "/base-standard/maps/biomes.js";
import { addFeatures as civ7AddFeatures } from "/base-standard/maps/features.js";

export class Civ7Adapter implements EngineAdapter {
  // ... existing methods ...

  designateBiomes(width: number, height: number): void {
    civ7DesignateBiomes(width, height);
  }

  getBiomeGlobal(name: string): number {
    // Access GameInfo biome globals
    return (globalThis as any)[name] ?? -1;
  }

  setBiomeType(x: number, y: number, biomeId: number): void {
    TerrainBuilder.setBiomeType(x, y, biomeId);
  }

  getBiomeType(x: number, y: number): number {
    return GameplayMap.getBiomeType(x, y);
  }

  addFeatures(width: number, height: number): void {
    civ7AddFeatures(width, height);
  }

  getFeatureTypeIndex(name: string): number {
    const feature = GameInfo.Features.find((f: any) => f.FeatureType === name);
    return feature?.Index ?? -1;
  }

  setFeatureType(x: number, y: number, featureId: number): void {
    TerrainBuilder.setFeatureType(x, y, featureId);
  }

  getFeatureType(x: number, y: number): number {
    return GameplayMap.getFeatureType(x, y);
  }

  get NO_FEATURE(): number {
    return -1;  // Or GameInfo constant if available
  }
}
```

### Updated Biomes Layer

```typescript
// layers/biomes.ts
export function applyBiomes(ctx: ExtendedMapContext): void {
  const { adapter, dimensions } = ctx;
  const { width, height } = dimensions;

  // 1. Run base Civ7 biome designation
  adapter.designateBiomes(width, height);

  // 2. Apply TS-specific nudges
  applyTundraRestraint(ctx);
  applyTropicalCoastRules(ctx);
  applyRiverValleyGrassland(ctx);

  // 3. Story-aware adjustments (if story tags present)
  if (ctx.overlays.has("margins")) {
    applyCorridorNudges(ctx);
  }
}
```

### Quick Navigation

- [TL;DR](#tldr)
- [Problem](#problem)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
