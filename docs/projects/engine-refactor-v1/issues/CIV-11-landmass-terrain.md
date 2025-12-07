---
id: CIV-11
title: "[M-TS-07b] Migrate Landmass & Terrain Layers"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [feature]
parent: CIV-7
children: []
blocked_by: [CIV-10]
blocked: [CIV-13]
related_to: [CIV-12]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Migrate landmass generation and terrain shaping layers (coastlines, islands, mountains, volcanoes) from JavaScript to TypeScript.

## Deliverables

- [ ] Migrate landmass layers to `src/layers/`:
  - [ ] `landmass_plate.js` → `landmass-plate.ts` (plate-driven landmass generation)
  - [ ] `landmass_utils.js` → `landmass-utils.ts` (landmass post-processing)
  - [ ] `coastlines.js` → `coastlines.ts` (rugged coast generation)
  - [ ] `islands.js` → `islands.ts` (island chain generation)
- [ ] Migrate terrain shaping layers:
  - [ ] `mountains.js` → `mountains.ts` (physics-based mountain placement)
  - [ ] `volcanoes.js` → `volcanoes.ts` (plate-aware volcano generation)
- [ ] Type all layer function signatures
- [ ] Ensure layers consume adapter interface, not globals

## Acceptance Criteria

- [ ] All landmass/terrain layer files compile without TypeScript errors
- [ ] Layers use `EngineAdapter` interface, not direct `GameplayMap` calls
- [ ] Layer configs are properly typed
- [ ] No remaining `.js` files for these layers

## Testing / Verification

```bash
# Type check
pnpm -C packages/mapgen-core check

# Build
pnpm -C packages/mapgen-core build

# Verify layer exports
node -e "import('@swooper/mapgen-core/layers').then(m => console.log(Object.keys(m)))"
```

## Dependencies / Notes

- **Parent**: M-TS-07
- **Blocked by**: M-TS-07a (Core types)
- **Blocks**: M-TS-07d (Orchestrator)
- **Related to**: M-TS-07c (Climate layers)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Files to Migrate

| Source | Target | Lines |
|--------|--------|-------|
| `layers/landmass_plate.js` | `src/layers/landmass-plate.ts` | ~300 |
| `layers/landmass_utils.js` | `src/layers/landmass-utils.ts` | ~150 |
| `layers/coastlines.js` | `src/layers/coastlines.ts` | ~200 |
| `layers/islands.js` | `src/layers/islands.ts` | ~150 |
| `layers/mountains.js` | `src/layers/mountains.ts` | ~250 |
| `layers/volcanoes.js` | `src/layers/volcanoes.ts` | ~200 |

### Layer Pattern

```typescript
// src/layers/mountains.ts
import type { MapContext } from '../core/types';
import type { EngineAdapter } from '@civ7/adapter';
import { getTunables } from '../bootstrap/tunables';

export interface MountainsConfig {
  tectonicIntensity: number;
  mountainThreshold: number;
  hillThreshold: number;
}

export function applyMountains(
  ctx: MapContext,
  adapter: EngineAdapter,
  config?: Partial<MountainsConfig>
): void {
  const { MOUNTAINS_CFG } = getTunables();
  const cfg = { ...MOUNTAINS_CFG, ...config };
  // Implementation...
}
```

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
