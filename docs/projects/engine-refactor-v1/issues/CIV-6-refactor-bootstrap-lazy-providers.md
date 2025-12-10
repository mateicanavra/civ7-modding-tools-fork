---
id: CIV-6
title: "[M-TS-06] Refactor Bootstrap to Lazy Providers"
state: done
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M1-TS-typescript-migration
assignees: []
labels: [architecture, technical-debt]
parent: null
children: []
blocked_by: [CIV-4]
blocked: [CIV-7]
related_to: [CIV-5]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Refactor bootstrap files (`tunables.js`, `resolved.js`, `runtime.js`) to use a memoized provider pattern, eliminating import-time crashes when GameInfo/GameplayMap globals are unavailable (critical for test isolation).

## Deliverables

- [ ] Migrate `bootstrap/tunables.js` → `src/bootstrap/tunables.ts`:
  - [ ] Replace top-level `GameInfo.Maps.lookup()` with `getTunables()` function
  - [ ] Add module-level cache variable
  - [ ] Export `resetTunables()` for test cleanup
  - [ ] Maintain all existing config exports via lazy getters
- [ ] Migrate `bootstrap/resolved.js` → `src/bootstrap/resolved.ts`:
  - [ ] Defer config resolution to function call time
  - [ ] Add `resetResolved()` for test isolation
- [ ] Migrate `bootstrap/runtime.js` → `src/bootstrap/runtime.ts`:
  - [ ] Already uses `setConfig()`/`getConfig()` pattern (minimal changes)
  - [ ] Add TypeScript types for config object
- [ ] Migrate `bootstrap/entry.js` → `src/bootstrap/entry.ts`:
  - [ ] Type the `bootstrap()` function signature
  - [ ] Ensure lazy initialization flows through correctly
- [ ] Write tests for bootstrap modules:
  - [ ] Test `getTunables()` returns expected structure with mocked globals
  - [ ] Test `resetTunables()` clears cache (subsequent call re-reads)
  - [ ] Test multiple `reset*()` calls in `beforeEach` for isolation
- [ ] Update all consumers to call `getTunables()` instead of importing constants

## Acceptance Criteria

- [ ] Importing `@swooper/mapgen-core/bootstrap` does NOT crash without globals
- [ ] `getTunables()` returns valid config when globals are mocked
- [ ] `resetTunables()` clears cache, enabling test isolation
- [ ] Each test file can mock different GameInfo values independently
- [ ] **Runtime rebind**: `resetTunables()` / `rebind()` called at start of each `generateMap()` entry (not just tests)
- [ ] **Test isolation**: `reset*()` functions called in test `beforeEach` hooks
- [ ] TypeScript strict mode passes for all bootstrap files
- [ ] Existing mod functionality unchanged (lazy init is transparent at runtime)

## Testing / Verification

```bash
# Run bootstrap tests
pnpm -C packages/mapgen-core bun test --filter bootstrap

# Verify import doesn't crash
node -e "import('@swooper/mapgen-core/bootstrap')" # Should not throw

# Type check
pnpm -C packages/mapgen-core check
```

## Dependencies / Notes

- **Blocked by**: M-TS-04 (Pipeline validation)
- **Related to**: M-TS-05 (Voronoi migration may need bootstrap for config)
- **Blocks**: M-TS-07 (Orchestrator migration depends on lazy bootstrap)
- **Critical Problem**: Current `tunables.js` reads `GameplayMap.getMapSize()` at import time, crashing any test that imports it

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Current Pattern (Problematic)

```javascript
// Current tunables.js - crashes on import!
const size = GameplayMap.getMapSize();
export const config = GameInfo.Maps.lookup(size);
export const LANDMASS_CFG = config.landmass;
// ... all exports execute at import time
```

### New Pattern (Safe)

```typescript
// New tunables.ts - lazy evaluation
let _cache: TunablesConfig | null = null;

export function getTunables(): TunablesConfig {
  if (_cache) return _cache;

  // Only executes when called (inside game or mocked test)
  const size = GameplayMap.getMapSize();
  const rawConfig = GameInfo.Maps.lookup(size);

  _cache = {
    LANDMASS_CFG: rawConfig.landmass,
    MOUNTAINS_CFG: rawConfig.mountains,
    // ... all config groups
  };

  return _cache;
}

export function resetTunables(): void {
  _cache = null;
}

// For backwards compatibility, export lazy getters
export const LANDMASS_CFG = new Proxy({} as LandmassConfig, {
  get(_, prop) {
    return getTunables().LANDMASS_CFG[prop as keyof LandmassConfig];
  }
});
```

### Files to Migrate

| Source | Target | Complexity |
|--------|--------|------------|
| `bootstrap/tunables.js` | `src/bootstrap/tunables.ts` | High — many exports |
| `bootstrap/resolved.js` | `src/bootstrap/resolved.ts` | Medium — composition logic |
| `bootstrap/runtime.js` | `src/bootstrap/runtime.ts` | Low — already deferred |
| `bootstrap/entry.js` | `src/bootstrap/entry.ts` | Medium — entry point |

### Test Pattern

```typescript
// test/bootstrap/tunables.test.ts
import { describe, it, expect, beforeEach } from "bun:test";
import { getTunables, resetTunables } from "../src/bootstrap/tunables";

beforeEach(() => {
  resetTunables();

  // Set up mock
  global.GameplayMap = { getMapSize: () => "MAPSIZE_STANDARD" };
  global.GameInfo = {
    Maps: { lookup: () => ({ landmass: { baseWaterPercent: 60 } }) }
  };
});

describe("getTunables", () => {
  it("should return landmass config from GameInfo", () => {
    const tunables = getTunables();
    expect(tunables.LANDMASS_CFG.baseWaterPercent).toBe(60);
  });

  it("should cache results", () => {
    const t1 = getTunables();
    const t2 = getTunables();
    expect(t1).toBe(t2); // Same reference
  });

  it("should clear cache on reset", () => {
    const t1 = getTunables();
    resetTunables();

    // Change mock
    global.GameInfo.Maps.lookup = () => ({ landmass: { baseWaterPercent: 80 } });

    const t2 = getTunables();
    expect(t2.LANDMASS_CFG.baseWaterPercent).toBe(80);
  });
});
```

### Memoization Strategy from Plan

> Keep an initial bind at module load for safety, but mandate `rebind()` (or cache reset) at each `generateMap` entry in runtime and in test `beforeEach` to avoid stale configs.

This means:
1. Lazy getters for safe import
2. `reset*()` called at start of each `generateMap()` run
3. `reset*()` called in test `beforeEach`

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
