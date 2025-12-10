---
id: CIV-13
title: "[M-TS-07d] Migrate Placement & Orchestrator"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [feature]
parent: CIV-7
children: []
blocked_by: [CIV-10, CIV-11, CIV-12]
blocked: [CIV-8]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Migrate the placement layer and MapOrchestrator from JavaScript to TypeScript, completing the Gate C migration and wiring up the mod entry point.

## Deliverables

- [ ] Migrate placement layer:
  - [ ] `placement.js` → `placement.ts` (wonders, resources, starts, discoveries)
- [ ] Migrate orchestrator:
  - [ ] `map_orchestrator.js` → `src/MapOrchestrator.ts`
  - [ ] Type stage manifest system
  - [ ] Type `generateMap()` and `requestMapData()` functions
  - [ ] Wire up lazy bootstrap integration
  - [ ] Consume adapter interface for all engine calls
- [ ] Update mod entry point:
  - [ ] `src/swooper-desert-mountains.ts` imports from `@swooper/mapgen-core`
  - [ ] Call `bootstrap()` with preset config
  - [ ] Wire `engine.on()` handlers through adapter
- [ ] Ensure all public APIs are exported

## Acceptance Criteria

- [ ] MapOrchestrator compiles without TypeScript errors
- [ ] `pnpm -C packages/mapgen-core build` succeeds
- [ ] `pnpm -C mods/mod-swooper-maps build` produces valid bundle
- [ ] Bundle includes inlined core code with external `/base-standard/...` imports
- [ ] Stage manifest properly typed with requires/provides
- [ ] No remaining `.js` files in `packages/mapgen-core/src/`

## Testing / Verification

```bash
# Build core library
pnpm -C packages/mapgen-core build

# Type check
pnpm -C packages/mapgen-core check

# Build mod bundle
pnpm -C mods/mod-swooper-maps build

# Verify bundle structure
! grep "from '@swooper/mapgen-core'" mods/mod-swooper-maps/mod/maps/swooper-desert-mountains.js
# ^^^ Should be empty (core inlined)

grep "from '/base-standard/" mods/mod-swooper-maps/mod/maps/swooper-desert-mountains.js
# ^^^ Should find imports (base-standard external)
```

## Dependencies / Notes

- **Parent**: M-TS-07
- **Blocked by**: M-TS-07a (Types), M-TS-07b (Terrain), M-TS-07c (Climate)
- **Blocks**: M-TS-08 (E2E validation)
- **Final sub-issue**: Completes Gate C migration

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Files to Migrate

| Source | Target | Lines |
|--------|--------|-------|
| `layers/placement.js` | `src/layers/placement.ts` | ~400 |
| `map_orchestrator.js` | `src/MapOrchestrator.ts` | ~600 |

### MapOrchestrator Structure

```typescript
// src/MapOrchestrator.ts
import type { EngineAdapter } from '@civ7/adapter';
import type { MapContext, StageManifest } from './core/types';
import { getTunables, resetTunables } from './bootstrap/tunables';

export class MapOrchestrator {
  private adapter: EngineAdapter;
  private manifest: StageManifest;

  constructor(adapter: EngineAdapter) {
    this.adapter = adapter;
    this.manifest = getTunables().STAGE_MANIFEST;
  }

  requestMapData(): void {
    // Initialize map dimensions
    resetTunables(); // Ensure fresh config for each run
    const config = getTunables();
    this.adapter.setMapInitData(config.dimensions);
  }

  generateMap(): void {
    resetTunables(); // Runtime rebind at each generateMap entry
    const ctx = this.createContext();

    for (const stage of this.manifest.order) {
      this.runStage(stage, ctx);
    }
  }

  private createContext(): MapContext { /* ... */ }
  private runStage(stage: string, ctx: MapContext): void { /* ... */ }
}
```

### Entry Point Integration

```typescript
// mods/mod-swooper-maps/src/swooper-desert-mountains.ts
/// <reference types="@civ7/types" />

import { bootstrap, MapOrchestrator } from '@swooper/mapgen-core';
import { CivEngineAdapter } from '@civ7/adapter/civ7-adapter';

bootstrap({
  preset: 'desert-mountains',
  overrides: {
    mountains: { tectonicIntensity: 0.77 }
  }
});

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
