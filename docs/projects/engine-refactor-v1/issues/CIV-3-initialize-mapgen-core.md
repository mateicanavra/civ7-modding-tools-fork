---
id: CIV-3
title: "[M-TS-03] Initialize MapGen Core Library (@swooper/mapgen-core)"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [architecture, feature]
parent: null
children: []
blocked_by: [CIV-1, CIV-2]
blocked: [CIV-4, CIV-5, CIV-6]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Create `packages/mapgen-core` as the pure TypeScript domain library containing all map generation algorithms, testable via `bun test` without game dependencies.

## Deliverables

- [ ] Create `packages/mapgen-core/package.json`:
  - [ ] Name: `@swooper/mapgen-core`
  - [ ] Dependencies: `@civ7/types`, `@civ7/adapter`
  - [ ] Scripts: `test` → `bun test`, `build` → `tsup`
- [ ] Create directory structure:
  - [ ] `src/index.ts` — barrel exports
  - [ ] `src/bootstrap/` — placeholder for lazy config providers
  - [ ] `src/world/` — placeholder for Voronoi/plate logic
  - [ ] `src/layers/` — placeholder for layer logic
  - [ ] `src/core/` — placeholder for utils/types
- [ ] Create `tsconfig.json` extending monorepo base
- [ ] Create `tsup.config.ts` with ESM output
- [ ] Create Bun test infrastructure:
  - [ ] `bunfig.toml` with test preload
  - [ ] `test/setup.ts` with Civ7 global mocks
  - [ ] `test/smoke.test.ts` — minimal test proving setup works
- [ ] Configure package exports for subpath imports
- [ ] Add pnpm bridge script at root: `"test:mapgen": "pnpm -C packages/mapgen-core bun test"`

## Acceptance Criteria

- [ ] `pnpm install` succeeds with new package in workspace
- [ ] `pnpm -C packages/mapgen-core build` produces valid ESM output
- [ ] `pnpm -C packages/mapgen-core test` (or `bun test`) passes smoke test
- [ ] Package exports work: `import { something } from '@swooper/mapgen-core'`
- [ ] Subpath exports work: `import { something } from '@swooper/mapgen-core/world'`
- [ ] Test setup correctly mocks `GameplayMap`, `GameInfo`, `TerrainBuilder`

## Testing / Verification

```bash
# Install workspace
pnpm install

# Build the package
pnpm -C packages/mapgen-core build

# Run tests
pnpm -C packages/mapgen-core test

# Verify exports
node -e "import('@swooper/mapgen-core').then(m => console.log(Object.keys(m)))"
```

## Dependencies / Notes

- **Blocked by**: M-TS-01 (Types), M-TS-02 (Adapter)
- **Blocks**: M-TS-04 (Gate A validation), M-TS-05 (Voronoi migration), M-TS-06 (Bootstrap refactor)
- **Tooling**: Prefer Bun for test/build; fall back to pnpm/vitest if instability occurs

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Package Structure

```
packages/mapgen-core/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── bunfig.toml
├── src/
│   ├── index.ts              # Barrel exports
│   ├── bootstrap/
│   │   └── entry.ts          # Placeholder
│   ├── world/
│   │   └── index.ts          # Placeholder
│   ├── layers/
│   │   └── index.ts          # Placeholder
│   └── core/
│       └── index.ts          # Placeholder
└── test/
    ├── setup.ts              # Global mocks
    └── smoke.test.ts         # Minimal test
```

### package.json

```json
{
  "name": "@swooper/mapgen-core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./bootstrap": "./dist/bootstrap/entry.js",
    "./world": "./dist/world/index.js",
    "./layers": "./dist/layers/index.js"
  },
  "scripts": {
    "build": "tsup",
    "test": "bun test",
    "check": "tsc --noEmit"
  },
  "dependencies": {
    "@civ7/types": "workspace:*",
    "@civ7/adapter": "workspace:*"
  },
  "devDependencies": {
    "bun-types": "latest",
    "tsup": "^8.3.0",
    "typescript": "^5.7.0"
  }
}
```

### bunfig.toml

```toml
[test]
preload = ["./test/setup.ts"]
```

### test/setup.ts (Civ7 Global Mocks)

```typescript
// Mock Civ7 Engine API
global.engine = {
  on: () => {},
  call: () => {}
};

// Mock Map Data API
global.GameplayMap = {
  getGridWidth: () => 128,
  getGridHeight: () => 80,
  getMapSize: () => "MAPSIZE_HUGE",
  isWater: () => false,
  isMountain: () => false,
  getTerrainType: () => 0,
  getRainfall: () => 0,
  getTemperature: () => 0,
  getPlotLatitude: () => 0,
  // ... extend as needed
};

// Mock GameInfo Database
global.GameInfo = {
  Maps: {
    lookup: () => ({
      NumNaturalWonders: 4,
      PlayersLandmass1: 2,
      PlayersLandmass2: 2,
    })
  },
  Terrains: { find: () => null, lookup: () => null, length: 0 },
  Biomes: { find: () => null, lookup: () => null, length: 0 },
  // ... extend as needed
};

global.TerrainBuilder = {
  validateAndFixTerrain: () => {},
  stampContinents: () => {},
  buildElevation: () => {},
  modelRivers: () => {},
  defineNamedRivers: () => {},
  storeWaterData: () => {},
  getRandomNumber: (max: number) => Math.floor(Math.random() * max),
};

global.AreaBuilder = {
  recalculateAreas: () => {}
};

global.FractalBuilder = {
  create: () => {},
  getHeight: () => 0,
};

global.console = console;
```

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
