---
id: CIV-7
title: "[M-TS-07] Migrate Orchestrator & Layers (Gate C)"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [feature]
parent: null
children: [CIV-10, CIV-11, CIV-12, CIV-13]
blocked_by: [CIV-5, CIV-6]
blocked: [CIV-8]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Port the MapOrchestrator and all layer modules from JavaScript to TypeScript, completing the core logic migration (Gate C). **This is a parent issue with 4 sub-issues for PR-sized work.**

## Sub-Issues

- [ ] [CIV-10: Core Utils & Story System](CIV-10-core-utils-story.md) — Foundation types and story system (~1200 lines)
- [ ] [CIV-11: Landmass & Terrain Layers](CIV-11-landmass-terrain.md) — Landmass, coastlines, mountains, volcanoes (~1000 lines)
- [ ] [CIV-12: Climate & Biomes](CIV-12-climate-biomes.md) — Climate engine, biomes, features (~800 lines)
- [ ] [CIV-13: Placement & Orchestrator](CIV-13-placement-orchestrator.md) — Placement and orchestrator integration (~800 lines)

## Deliverables

- [ ] Migrate `map_orchestrator.js` → `src/MapOrchestrator.ts`:
  - [ ] Type the stage manifest system
  - [ ] Type `generateMap()` and `requestMapData()` functions
  - [ ] Wire up lazy bootstrap integration
  - [ ] Consume adapter interface for engine calls
- [ ] Migrate layer modules to `src/layers/`:
  - [ ] `mountains.js` → `mountains.ts`
  - [ ] `volcanoes.js` → `volcanoes.ts`
  - [ ] `coastlines.js` → `coastlines.ts`
  - [ ] `islands.js` → `islands.ts`
  - [ ] `biomes.js` → `biomes.ts`
  - [ ] `features.js` → `features.ts`
  - [ ] `climate-engine.js` → `climate-engine.ts`
  - [ ] `landmass_plate.js` → `landmass-plate.ts`
  - [ ] `landmass_utils.js` → `landmass-utils.ts`
  - [ ] `placement.js` → `placement.ts`
- [ ] Migrate core utilities to `src/core/`:
  - [ ] `types.js` → `types.ts`
  - [ ] `adapters.js` → (use @civ7/adapter instead)
  - [ ] `utils.js` → `utils.ts`
  - [ ] `plot_tags.js` → `plot-tags.ts`
- [ ] Migrate story system to `src/story/`:
  - [ ] `tags.js` → `tags.ts`
  - [ ] `tagging.js` → `tagging.ts`
  - [ ] `corridors.js` → `corridors.ts`
  - [ ] `overlays.js` → `overlays.ts`
- [ ] Update mod entry point to use TypeScript core:
  - [ ] `src/swooper-desert-mountains.ts` imports from `@swooper/mapgen-core`
  - [ ] Call `bootstrap()` with preset config
  - [ ] Wire `engine.on()` handlers through adapter
- [ ] Ensure all exports are properly typed and documented

## Acceptance Criteria

- [ ] All layer modules compile without TypeScript errors
- [ ] `pnpm -C packages/mapgen-core build` succeeds
- [ ] `pnpm -C mods/mod-swooper-maps build` produces valid bundle
- [ ] Bundle includes inlined core code with external `/base-standard/...` imports
- [ ] No remaining `.js` files in `packages/mapgen-core/src/`
- [ ] Type coverage for all public APIs

## Testing / Verification

```bash
# Build core library
pnpm -C packages/mapgen-core build

# Type check
pnpm -C packages/mapgen-core check

# Build mod bundle
pnpm -C mods/mod-swooper-maps build

# Verify bundle structure
grep "from '@swooper/mapgen-core'" mods/mod-swooper-maps/mod/maps/swooper-desert-mountains.js
# Should NOT find — core should be inlined

grep "from '/base-standard/" mods/mod-swooper-maps/mod/maps/swooper-desert-mountains.js
# Should find — base-standard remains external
```

## Dependencies / Notes

- **Blocked by**: M-TS-05 (World logic), M-TS-06 (Bootstrap refactor)
- **Blocks**: M-TS-08 (E2E validation)
- **Largest task**: 10+ layer files, 4+ story files, orchestrator
- **Strategy**: Migrate in dependency order — utilities first, then layers, then orchestrator

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Migration Order (Dependency-Based)

1. **Core utilities** (no internal dependencies):
   - `utils.ts`, `plot-tags.ts`

2. **Types and context** (depends on utilities):
   - `types.ts` (MapContext, FoundationContext)

3. **Story system** (depends on types):
   - `tags.ts`, `overlays.ts`, `tagging.ts`, `corridors.ts`

4. **Layers** (depends on types, story, bootstrap):
   - Start with simpler layers: `coastlines.ts`, `islands.ts`
   - Then complex: `mountains.ts`, `volcanoes.ts`, `climate-engine.ts`
   - Then integrations: `biomes.ts`, `features.ts`, `placement.ts`
   - Landmass: `landmass-plate.ts`, `landmass-utils.ts`

5. **Orchestrator** (depends on all above):
   - `MapOrchestrator.ts`

### File Inventory

| Category | Files | Lines (approx) |
|----------|-------|----------------|
| Orchestrator | 1 | ~600 |
| Layers | 10 | ~2500 |
| Story | 4 | ~800 |
| Core | 4 | ~400 |
| Bootstrap | 4 | (already in M-TS-06) |
| World | 3 | (already in M-TS-05) |

### Layer Interface Pattern

Each layer should follow:

```typescript
// src/layers/mountains.ts
import type { MapContext, FoundationContext } from '../core/types';
import type { EngineAdapter } from '@civ7/adapter';
import { getTunables } from '../bootstrap/tunables';

export interface MountainsConfig {
  tectonicIntensity: number;
  mountainThreshold: number;
  hillThreshold: number;
  // ...
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

### Entry Point Integration

```typescript
// mods/mod-swooper-maps/src/swooper-desert-mountains.ts
/// <reference types="@civ7/types" />

import { bootstrap, MapOrchestrator } from '@swooper/mapgen-core';
import { CivEngineAdapter } from '@civ7/adapter/civ7-adapter';

// Configure the generator
bootstrap({
  preset: 'desert-mountains',
  overrides: {
    mountains: { tectonicIntensity: 0.77 }
  }
});

// Wire engine events
const adapter = new CivEngineAdapter();
const orchestrator = new MapOrchestrator(adapter);

engine.on('RequestMapInitData', () => orchestrator.requestMapData());
engine.on('GenerateMap', () => orchestrator.generateMap());

console.log('Swooper Desert Mountains (TypeScript Build) Loaded');
```

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
