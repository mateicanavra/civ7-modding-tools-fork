---
id: CIV-20
title: "[M-TS-P0] Wire Placement Adapter Integration"
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

Move all `/base-standard/` imports from `layers/placement.ts` behind the adapter surface, completing the adapter boundary cleanup and enabling the placement layer to be tested with MockAdapter.

## Problem

`layers/placement.ts` contains heavy direct imports from `/base-standard/`:

```typescript
import { generateLakes } from "/base-standard/maps/placement.js";
import { expandCoasts } from "/base-standard/maps/placement.js";
import { chooseStartSectors } from "/base-standard/maps/placement.js";
// ... more direct imports
```

This violates the "Single Adapter Boundary" rule established in CIV-2 and prevents:
1. Testing placement logic with MockAdapter
2. Running placement code outside the game environment
3. Adapter boundary lint from passing

## Deliverables

- [x] **Extend adapter with placement methods:**
  - `addNaturalWonders(width, height, numWonders): void`
  - `generateSnow(width, height): void`
  - `generateResources(width, height): void`
  - `assignStartPositions(...): number[]`
  - `generateDiscoveries(width, height, startPositions): void`
  - `assignAdvancedStartRegions(): void`
  - `addFloodplains(minLength, maxLength): void`
  - `recalculateFertility(): void`
- [x] **Implement in `Civ7Adapter`:**
  - Wrap corresponding `/base-standard/maps/*.js` functions
- [x] **Update `layers/placement.ts`:**
  - Remove all `/base-standard/` imports
  - Call placement methods via `adapter` parameter
- [x] **Update adapter-boundary lint allowlist:**
  - Remove `placement.ts` from allowlist
  - Lint passes with only MapOrchestrator.ts remaining (CIV-22)
- [x] **Update MockAdapter:**
  - Add placement method stubs/mocks for testing with call tracking

## Acceptance Criteria

- [x] No `/base-standard/` imports in `layers/placement.ts`
- [x] Placement methods available on `EngineAdapter` interface
- [x] `Civ7Adapter` implements placement by wrapping base-standard
- [x] Adapter-boundary lint passes (only MapOrchestrator.ts in allowlist for CIV-22)
- [x] Build passes, tests pass (180 tests)

## Testing / Verification

```bash
# Adapter boundary check (no violations)
pnpm lint:adapter-boundary
# Should pass with no allowlist entries for mapgen-core

# Check no /base-standard/ in placement.ts
rg "/base-standard/" packages/mapgen-core/src/layers/placement.ts
# Should return empty

# Build verification
pnpm -C packages/mapgen-core build
pnpm -C packages/civ7-adapter build

# Test suite
pnpm -C packages/mapgen-core test
```

## Dependencies / Notes

- **Blocked by**: Config resolver + call-site fixes (Stack 2)
- **Blocks**: Integration tests
- **Note**: This is the last step to complete the adapter boundary cleanup

### Files to Modify

- `packages/civ7-adapter/src/types.ts` — extend EngineAdapter
- `packages/civ7-adapter/src/civ7-adapter.ts` — implement placement methods
- `packages/civ7-adapter/src/mock-adapter.ts` — add mock implementations
- `packages/mapgen-core/src/layers/placement.ts` — use adapter
- `scripts/lint-adapter-boundary.sh` — remove placement.ts from allowlist

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Adapter Interface Extensions

```typescript
// @civ7/adapter/types.ts
export interface PlacementMethods {
  generateLakes(): void;
  expandCoasts(): void;
  generateFloodplains(): void;
  chooseStartSectors(): void;
  placeResources(): void;
  placeDiscoveries(): void;
  addSnow(): void;
}

export interface EngineAdapter extends
  CoreMethods,
  BiomesMethods,
  FeaturesMethods,
  PlacementMethods {
  // Combined interface
}
```

### Civ7Adapter Implementation

```typescript
// @civ7/adapter/civ7-adapter.ts
import * as PlacementModule from "/base-standard/maps/placement.js";

export class Civ7Adapter implements EngineAdapter {
  // ... existing methods ...

  generateLakes(): void {
    PlacementModule.generateLakes();
  }

  expandCoasts(): void {
    PlacementModule.expandCoasts();
  }

  generateFloodplains(): void {
    PlacementModule.generateFloodplains();
  }

  chooseStartSectors(): void {
    PlacementModule.chooseStartSectors();
  }

  placeResources(): void {
    PlacementModule.placeResources();
  }

  placeDiscoveries(): void {
    PlacementModule.placeDiscoveries();
  }

  addSnow(): void {
    PlacementModule.addSnow();
  }
}
```

### Updated Placement Layer

```typescript
// layers/placement.ts
// BEFORE:
import { generateLakes } from "/base-standard/maps/placement.js";

export function runPlacement(ctx: ExtendedMapContext) {
  generateLakes();
}

// AFTER:
export function runPlacement(ctx: ExtendedMapContext) {
  ctx.adapter.generateLakes();
}
```

### Current /base-standard/ Imports in Placement

From grep analysis, `placement.ts` likely imports:
- `generateLakes`
- `expandCoasts`
- `generateFloodplains`
- `chooseStartSectors`
- `placeResources`
- `placeDiscoveries`
- `addSnow`
- Possibly others

Each needs to be moved behind the adapter.

### Quick Navigation

- [TL;DR](#tldr)
- [Problem](#problem)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
