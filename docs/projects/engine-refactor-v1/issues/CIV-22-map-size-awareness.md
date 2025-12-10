---
id: CIV-22
title: "[M-TS-P0] Restore Map-Size Awareness"
state: done
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M1-TS-typescript-migration
assignees: []
labels: [bug]
parent: CIV-14
children: []
blocked_by: [CIV-18]
blocked: [CIV-23]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Stop hard-coding `84×54` map dimensions and restore the flow from `GameplayMap.getMapSize()` to `GameInfo.Maps.lookup()` so the system respects actual map size selection.

## Problem

`MapOrchestrator.requestMapData()` currently hard-codes dimensions:

```typescript
const iWidth = 84;   // Hard-coded!
const iHeight = 54;  // Hard-coded!
const minLatitude = -80;
const maxLatitude = 80;
```

This ignores:
- The player's map size selection in game setup
- Map size defaults from GameInfo
- Latitude bounds associated with different map sizes

**Result:** All maps generate at the same fixed size regardless of game settings.

## Deliverables

- [x] **Restore map size lookup flow:**
  - `GameplayMap.getMapSize()` → get selected map size ID
  - `GameInfo.Maps.lookup(sizeId)` → get map defaults
  - Extract width, height, min/max latitude from defaults
- [x] **Add adapter methods if needed:**
  - `OrchestratorAdapter.getMapSize()` already existed
  - `OrchestratorAdapter.lookupMapInfo()` already existed
  - Added `GridWidth`, `GridHeight`, `MinLatitude`, `MaxLatitude` to `MapInfo` interface
- [x] **Update `requestMapData()`:**
  - Read dimensions from game, not constants
  - Pass latitude bounds from map defaults
- [x] **Fallback for testing:**
  - Added `mapSizeDefaults` config option for testing
  - Allow explicit dimension override via `initParams`

## Acceptance Criteria

- [x] `requestMapData()` reads dimensions from game settings
- [x] Different map size selections produce different dimension maps
- [x] Latitude bounds come from map defaults, not constants
- [x] `mapSizeDefaults` config option for testing
- [x] Build passes, tests pass

## Testing / Verification

```typescript
// Test: dimensions come from game settings
test("requestMapData uses game map size", () => {
  const adapter = createMockAdapter({
    mapSize: "MAPSIZE_STANDARD",
    mapDefaults: { width: 84, height: 54, minLat: -80, maxLat: 80 }
  });
  const orchestrator = new MapOrchestrator({ adapter });

  const data = orchestrator.requestMapData();

  expect(data.width).toBe(84);
  expect(data.height).toBe(54);
});

// Test: different sizes work
test("requestMapData respects large map size", () => {
  const adapter = createMockAdapter({
    mapSize: "MAPSIZE_LARGE",
    mapDefaults: { width: 104, height: 64, minLat: -85, maxLat: 85 }
  });
  const orchestrator = new MapOrchestrator({ adapter });

  const data = orchestrator.requestMapData();

  expect(data.width).toBe(104);
  expect(data.height).toBe(64);
});
```

```bash
# Build verification
pnpm -C packages/mapgen-core build

# Run size tests
pnpm -C packages/mapgen-core test --grep "mapSize|dimensions"
```

## Dependencies / Notes

- **Blocked by**: Config resolver + call-site fixes (Stack 2)
- **Blocks**: Integration tests
- **Scope**: Basic flow restoration, not full preset system

### What's NOT In Scope

- Full preset resurrection (classic, temperate, etc.)
- Named preset lookups
- Complex map type configurations

These are deferred to P1. This issue just restores "dimensions come from game, not constants."

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Current Code (Hard-coded)

```typescript
// MapOrchestrator.ts - requestMapData()
requestMapData(): MapInitData {
  const iWidth = 84;   // FIXME: Should come from game
  const iHeight = 54;  // FIXME: Should come from game
  const minLatitude = -80;
  const maxLatitude = 80;

  return {
    width: iWidth,
    height: iHeight,
    // ...
  };
}
```

### Target Code

```typescript
// MapOrchestrator.ts - requestMapData()
requestMapData(): MapInitData {
  // Get map size from game settings
  const mapSizeId = this.adapter.getMapSize();
  const defaults = this.adapter.getMapDefaults(mapSizeId);

  const iWidth = defaults.width;
  const iHeight = defaults.height;
  const minLatitude = defaults.minLatitude ?? -80;
  const maxLatitude = defaults.maxLatitude ?? 80;

  return {
    width: iWidth,
    height: iHeight,
    wrapX: true,
    wrapY: false,
    // ...
  };
}
```

### Adapter Interface

```typescript
// @civ7/adapter/types.ts
export interface MapSizeMethods {
  getMapSize(): string;  // e.g., "MAPSIZE_STANDARD"
  getMapDefaults(sizeId: string): MapDefaults;
}

export interface MapDefaults {
  width: number;
  height: number;
  minLatitude?: number;
  maxLatitude?: number;
  worldAge?: string;
  temperature?: string;
  rainfall?: string;
}
```

### Civ7Adapter Implementation

```typescript
// @civ7/adapter/civ7-adapter.ts
export class Civ7Adapter implements EngineAdapter {
  getMapSize(): string {
    return GameplayMap.getMapSize();
  }

  getMapDefaults(sizeId: string): MapDefaults {
    const mapInfo = GameInfo.Maps.find((m: any) => m.MapSizeType === sizeId);
    if (!mapInfo) {
      // Fallback to standard
      return { width: 84, height: 54, minLatitude: -80, maxLatitude: 80 };
    }
    return {
      width: mapInfo.GridWidth,
      height: mapInfo.GridHeight,
      minLatitude: mapInfo.MinLatitude ?? -80,
      maxLatitude: mapInfo.MaxLatitude ?? 80,
    };
  }
}
```

### MockAdapter Implementation

```typescript
// @civ7/adapter/mock-adapter.ts
export class MockAdapter implements EngineAdapter {
  private mockMapSize: string = "MAPSIZE_STANDARD";
  private mockDefaults: MapDefaults = {
    width: 84, height: 54, minLatitude: -80, maxLatitude: 80
  };

  getMapSize(): string {
    return this.mockMapSize;
  }

  getMapDefaults(sizeId: string): MapDefaults {
    return this.mockDefaults;
  }

  // Test helper
  setMockMapSize(size: string, defaults: MapDefaults): void {
    this.mockMapSize = size;
    this.mockDefaults = defaults;
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
