---
id: CIV-16
title: "[M-TS-P0] Migrate Layers to FoundationContext Consumption"
state: planned
priority: 1
estimate: 0
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [bug, architecture, technical-debt]
parent: CIV-14
children: []
blocked_by: [CIV-15]
blocked: [CIV-17]
related_to: [CIV-7]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Migrate layers from importing the `WorldModel` singleton directly to reading from `ctx.foundation` — the immutable snapshot that was *supposed* to replace WorldModel access in the original refactor.

## Problem

**Key insight:** `ctx.foundation` (immutable snapshot) and `ctx.worldModel` (mutable reference) are **already populated** by `MapOrchestrator.initializeFoundation()`. The problem is that layers import the `WorldModel` singleton directly instead of reading from context.

The original engine refactor plan (Phase A) stated: "legacy `worldModel` shims removed, `FoundationContext` emitted and asserted." The TS migration ported `WorldModel` but did not complete the migration to `ctx.foundation` consumption.

### Current Layer Pattern (Broken)

```typescript
// layers/mountains.ts
import { WorldModel, BOUNDARY_TYPE } from "../world/model.js";

export function applyMountains(ctx: ExtendedMapContext) {
  const plateId = WorldModel.plateId;  // Direct singleton access
  // ...
}
```

### Target Pattern

```typescript
// layers/mountains.ts
import { BOUNDARY_TYPE } from "../world/constants.js";  // Exported separately

export function applyMountains(ctx: ExtendedMapContext) {
  const { plates } = ctx.foundation;  // Read from immutable context
  const plateId = plates.id;
  // ...
}
```

## Deliverables

- [ ] **Update layers to read from `ctx.foundation`:**
  - [ ] `layers/landmass-plate.ts` — read `ctx.foundation.plates.*`
  - [ ] `layers/coastlines.ts` — read `ctx.foundation.plates.*`
  - [ ] `layers/mountains.ts` — read `ctx.foundation.plates.*`
  - [ ] `layers/volcanoes.ts` — read `ctx.foundation.plates.*`
  - [ ] `layers/landmass-utils.ts` — read `ctx.foundation.plates.*`
  - [ ] `layers/climate-engine.ts` — read `ctx.foundation.dynamics.*`
- [ ] **Export `BOUNDARY_TYPE` from shared location:**
  - Create `world/constants.ts` or add to `core/types.ts`
  - Remove need to import from `WorldModel` for constants
- [ ] **Keep `WorldModel` singleton only for orchestrator:**
  - `WorldModel.init()` and `WorldModel.reset()` called only by orchestrator
  - Layers never call these methods directly
- [ ] **Add `WorldModel.reset()` if missing:**
  - Call in orchestrator entry sequence before `init()`
- [ ] **Document authoritative generation session sequence:**
  ```
  1. resetConfig() / resetTunables() / WorldModel.reset()
  2. bootstrap(...) (presets, overrides, stageConfig)
  3. rebind() / getTunables()
  4. WorldModel.init(...)
  5. new MapOrchestrator(...).generateMap() → creates ctx.foundation
  ```

## Acceptance Criteria

- [ ] No layer file contains `import { WorldModel } from`
- [ ] Layers read from `ctx.foundation.plates.*` and `ctx.foundation.dynamics.*`
- [ ] `BOUNDARY_TYPE` exported from shared location (not requiring WorldModel import)
- [ ] `WorldModel.reset()` exists and is called in orchestrator entry
- [ ] Build passes, existing tests still pass
- [ ] Pipeline still "null script" (expected — stages not yet enabled in Stack 2)

## Testing / Verification

```bash
# Check no WorldModel imports in layers
rg "import.*WorldModel" packages/mapgen-core/src/layers/
# Should return empty

# Build verification
pnpm -C packages/mapgen-core build

# Test suite passes
pnpm -C packages/mapgen-core test
```

## Dependencies / Notes

- **Blocked by**: CIV-15 (Adapter boundary must be fixed first)
- **Blocks**: CIV-17 (Config resolver depends on clean context flow)
- **Related to**: CIV-7 (layer migration introduced these patterns)

### Files to Modify

- `packages/mapgen-core/src/layers/landmass-plate.ts`
- `packages/mapgen-core/src/layers/coastlines.ts`
- `packages/mapgen-core/src/layers/mountains.ts`
- `packages/mapgen-core/src/layers/volcanoes.ts`
- `packages/mapgen-core/src/layers/landmass-utils.ts`
- `packages/mapgen-core/src/layers/climate-engine.ts`
- `packages/mapgen-core/src/world/model.ts` — add `reset()` if missing
- New: `packages/mapgen-core/src/world/constants.ts` — extract `BOUNDARY_TYPE`
- `packages/mapgen-core/src/MapOrchestrator.ts` — update lifecycle sequence

### Why This Matters

The `FoundationContext` was explicitly designed as:

> "Immutable data product emitted by the foundation stage. Downstream stages rely on this instead of touching WorldModel directly."

By having layers import `WorldModel` directly:
1. **Testing is impossible** — can't inject mock plate data
2. **State leaks** — WorldModel singleton carries state between runs
3. **Architecture violated** — the immutable context pattern is bypassed

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Migration Checklist by File

**landmass-plate.ts:**
```typescript
// Before
import { WorldModel, BOUNDARY_TYPE } from "../world/model.js";
const plateId = WorldModel.plateId[idx];
const boundaryType = WorldModel.boundaryType[idx];

// After
import { BOUNDARY_TYPE } from "../world/constants.js";
const { plates } = ctx.foundation;
const plateId = plates.id[idx];
const boundaryType = plates.boundaryType[idx];
```

**mountains.ts:**
```typescript
// Before
import { WorldModel, BOUNDARY_TYPE } from "../world/model.js";
const uplift = WorldModel.upliftPotential[idx];
const stress = WorldModel.tectonicStress[idx];

// After
import { BOUNDARY_TYPE } from "../world/constants.js";
const { plates } = ctx.foundation;
const uplift = plates.upliftPotential[idx];
const stress = plates.tectonicStress[idx];
```

**climate-engine.ts:**
```typescript
// Before
import { WorldModel } from "../world/model.js";
const windU = WorldModel.windU[idx];
const windV = WorldModel.windV[idx];

// After
const { dynamics } = ctx.foundation;
const windU = dynamics.windU[idx];
const windV = dynamics.windV[idx];
```

### WorldModel.reset() Implementation

```typescript
// world/model.ts
export const WorldModel = {
  initialized: false,
  // ... existing fields ...

  reset(): void {
    this.initialized = false;
    this.plateId = null;
    this.boundaryCloseness = null;
    this.boundaryType = null;
    this.tectonicStress = null;
    this.upliftPotential = null;
    this.riftPotential = null;
    this.shieldStability = null;
    this.plateMovementU = null;
    this.plateMovementV = null;
    this.plateRotation = null;
    this.windU = null;
    this.windV = null;
    this.currentU = null;
    this.currentV = null;
    this.pressure = null;
    this.plateSeed = null;
    this.boundaryTree = null;
  },

  init(width: number, height: number, rng: () => number): void {
    // ... existing initialization ...
    this.initialized = true;
  }
};
```

### Constants Extraction

```typescript
// world/constants.ts
export const BOUNDARY_TYPE = {
  NONE: 0,
  CONVERGENT: 1,
  DIVERGENT: 2,
  TRANSFORM: 3,
  SUBDUCTION: 4,
} as const;

export type BoundaryType = typeof BOUNDARY_TYPE[keyof typeof BOUNDARY_TYPE];
```

### Quick Navigation

- [TL;DR](#tldr)
- [Problem](#problem)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
