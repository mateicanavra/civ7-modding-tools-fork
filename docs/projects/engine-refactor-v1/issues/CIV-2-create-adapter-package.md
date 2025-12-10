---
id: CIV-2
title: "[M-TS-02] Create Centralized Adapter (@civ7/adapter)"
state: done
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M1-TS-typescript-migration
assignees: []
labels: [architecture, feature]
parent: null
children: []
blocked_by: [CIV-1]
blocked: [CIV-3]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Create `packages/civ7-adapter` as the single module allowed to import `/base-standard/...` paths, providing an interface that core logic consumes and tests can mock.

## Deliverables

- [ ] Create `packages/civ7-adapter/package.json` with workspace configuration
- [ ] Create adapter interface (`src/types.ts`):
  - [ ] `EngineAdapter` interface (reads, writes, RNG, utilities)
  - [ ] `MapContext` type for passing state between stages
- [ ] Create Civ7 adapter implementation (`src/civ7-adapter.ts`):
  - [ ] Import from `/base-standard/maps/map-utilities.js`, `map-globals.js`, etc.
  - [ ] Wrap `GameplayMap`, `TerrainBuilder`, `AreaBuilder`, `FractalBuilder`
  - [ ] Proxy all engine/global calls
- [ ] Create mock adapter for testing (`src/mock-adapter.ts`):
  - [ ] Configurable mock for all interface methods
  - [ ] No `/base-standard/...` imports
- [ ] Export both adapters with clear entry points
- [ ] Configure `tsup` to keep `/base-standard/...` imports external
- [ ] Add lint rule / grep check: `/base-standard/...` imports only allowed in this package

## Acceptance Criteria

- [ ] `pnpm -C packages/civ7-adapter build` succeeds
- [ ] Output bundle preserves `import ... from '/base-standard/...'` exactly
- [ ] Mock adapter can be imported without any `/base-standard/...` resolution errors
- [ ] Interface covers all methods used by existing `CivEngineAdapter` in mod
- [ ] **Adapter boundary enforcement**: `rg '/base-standard/' packages/ --glob '!**/civ7-adapter/**' --glob '!**/*.d.ts'` returns empty (no /base-standard/ imports outside adapter)

## Testing / Verification

```bash
# Build the adapter
pnpm -C packages/civ7-adapter build

# Verify external imports preserved
grep "from '/base-standard/" packages/civ7-adapter/dist/civ7-adapter.js

# Verify mock has no base-standard imports
! grep "/base-standard/" packages/civ7-adapter/dist/mock-adapter.js

# Lint check for import boundary
rg "/base-standard/" packages/ --glob "!**/civ7-adapter/**" --glob "!**/*.d.ts"
```

## Dependencies / Notes

- **Blocked by**: M-TS-01 (Types package provides declarations)
- **Blocks**: M-TS-03 (MapGen Core consumes this adapter)
- **Reference**: Existing `CivEngineAdapter` at `mods/mod-swooper-maps/mod/maps/core/adapters.js`
- **Key Decision**: This package is the **only** place `/base-standard/...` imports are allowed

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Existing CivEngineAdapter Analysis

The current `core/adapters.js` already wraps GameplayMap methods. Key interface:

```typescript
interface EngineAdapter {
  // Reads
  isWater(x: number, y: number): boolean;
  isMountain(x: number, y: number): boolean;
  isAdjacentToRivers(x: number, y: number, radius?: number): boolean;
  getElevation(x: number, y: number): number;
  getTerrainType(x: number, y: number): number;
  getRainfall(x: number, y: number): number;
  getTemperature(x: number, y: number): number;
  getLatitude(x: number, y: number): number;
  getFeatureType(x: number, y: number): number;

  // Writes
  setTerrainType(x: number, y: number, type: number): void;
  setRainfall(x: number, y: number, value: number): void;
  setElevation(x: number, y: number, value: number): void;
  setFeatureType(x: number, y: number, data: FeatureData): void;

  // RNG
  getRandomNumber(max: number, label: string): number;

  // Utils
  validateAndFixTerrain(): void;
  recalculateAreas(): void;
  createFractal(id: number, w: number, h: number, grain: number, flags: number): void;
  getFractalHeight(id: number, x: number, y: number): number;
  stampContinents(): void;
  buildElevation(): void;
  modelRivers(min: number, max: number, terrain: number): void;
  defineNamedRivers(): void;
  storeWaterData(): void;
}
```

### Package Structure

```
packages/civ7-adapter/
├── package.json
├── tsconfig.json
├── tsup.config.ts        # External: /base-standard/.*
├── src/
│   ├── index.ts          # Re-exports
│   ├── types.ts          # EngineAdapter interface
│   ├── civ7-adapter.ts   # Real implementation (imports base-standard)
│   └── mock-adapter.ts   # Test mock (no base-standard)
└── dist/
```

### tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/civ7-adapter.ts', 'src/mock-adapter.ts'],
  format: ['esm'],
  external: [/^\/base-standard\/.*/],
  dts: true,
});
```

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
