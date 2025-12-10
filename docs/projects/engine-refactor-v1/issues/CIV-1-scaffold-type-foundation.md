---
id: CIV-1
title: "[M-TS-01] Scaffold Type Foundation (@civ7/types)"
state: done
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M1-TS-typescript-migration
assignees: []
labels: [architecture, feature]
parent: null
children: []
blocked_by: []
blocked: [CIV-2, CIV-3]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Create `packages/civ7-types` to provide TypeScript definitions for Civ7's runtime environment (globals, engine APIs, and `/base-standard/...` virtual modules), enabling type-safe development across all map generation packages.

## Deliverables

- [ ] Create `packages/civ7-types/package.json` with proper workspace configuration
- [ ] Create `packages/civ7-types/index.d.ts` with global declarations:
  - [ ] `GameplayMap` interface (72+ methods: `getGridWidth`, `isWater`, `getRainfall`, `getBiomeType`, etc.)
  - [ ] `GameInfo` interface with table accessors (`Maps`, `Terrains`, `Biomes`, `Features`, `Resources`, 7 `StartBias*` tables, `Ages`, etc.)
  - [ ] `TerrainBuilder` interface (terrain modification, random numbers, map building phases)
  - [ ] `AreaBuilder`, `FractalBuilder` interfaces
  - [ ] `engine` messaging API (`on`, `call`)
  - [ ] Other globals: `Game`, `Players`, `Configuration`, `Database`, `PlotTags`, `FeatureTypes`
- [ ] Declare `/base-standard/...` virtual modules:
  - [ ] `map-globals.js`, `map-utilities.js`, `elevation-terrain-generator.js`
  - [ ] `assign-starting-plots.js`, `feature-biome-generator.js`, `resource-generator.js`
  - [ ] `voronoi-*.js` utilities, `kd-tree.js`, `random-pcg-32.js`
  - [ ] Catch-all for rapid migration: `declare module '/base-standard/*'`
- [ ] Create `tsconfig.json` extending monorepo base
- [ ] Add package to workspace (`pnpm-workspace.yaml` already includes `packages/*`)
- [ ] Verify: importing `@civ7/types` in another package produces no TS errors

## Acceptance Criteria

- [ ] `pnpm install` succeeds with new package in workspace
- [ ] `pnpm -C packages/civ7-types check` passes (TypeScript validation)
- [ ] Consumer packages can `/// <reference types="@civ7/types" />` without errors
- [ ] `import { something } from '/base-standard/maps/map-utilities.js'` compiles without error
- [ ] **Full inventory coverage verified**:
  - [ ] All 72+ GameplayMap methods from codebase exploration are typed
  - [ ] All 15+ GameInfo tables (Maps, Terrains, Biomes, Features, Resources, 7 StartBias* tables, Ages, Civilizations, Leaders, etc.)
  - [ ] All TerrainBuilder methods (setters, validation, RNG, phases)
  - [ ] Grep check: `rg "GameplayMap\." mods/mod-swooper-maps` → all methods appear in types

## Testing / Verification

```bash
# Workspace install
pnpm install

# Type check the package
pnpm -C packages/civ7-types check

# Verify no TS errors when referencing
echo '/// <reference types="@civ7/types" />' > /tmp/test.ts
echo 'const w = GameplayMap.getGridWidth();' >> /tmp/test.ts
pnpm exec tsc --noEmit /tmp/test.ts
```

## Dependencies / Notes

- **Blocks**: M-TS-02 (Adapter), M-TS-03 (MapGen Core)
- **Reference**: Type inventory from codebase exploration (72+ GameplayMap methods, 15+ GameInfo tables)
- **Reference Plan**: `docs/projects/engine-refactor-v1/resources/migrate-to-ts-plan.md` Section 3.1

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Type Inventory (from codebase exploration)

**GameplayMap Methods:**
- Grid: `getGridWidth()`, `getGridHeight()`, `getMapSize()`
- Terrain reads: `getTerrainType`, `getBiomeType`, `getFeatureType`, `getResourceType`, `getElevation`, `getRainfall`, `getTemperature`, `getPlotLatitude`
- Predicates: `isWater`, `isMountain`, `isCoastalLand`, `isAdjacentToRivers`, `isAdjacentToShallowWater`, `isRiver`, `isNavigableRiver`, `isNaturalWonder`
- Location: `getLocationFromIndex`, `getPlotDistance`, `getPlotTag`, `getContinentType`
- RNG: `getRandomSeed`

**GameInfo Tables:**
- `Terrains`, `Biomes`, `Features`, `Resources`, `Maps`, `Ages`
- `StartBiasBiomes`, `StartBiasTerrains`, `StartBiasRivers`, `StartBiasAdjacentToCoasts`, `StartBiasFeatureClasses`, `StartBiasNaturalWonders`, `StartBiasResources`
- `Civilizations`, `Leaders`, `GlobalParameters`, `AdvancedStartParameters`, `Resource_Distribution`, `MapIslandBehavior`, etc.

**TerrainBuilder Methods:**
- Setters: `setTerrainType`, `setBiomeType`, `setRainfall`, `setElevation`, `setFeatureType`, `setPlotTag`, `addPlotTag`
- Validation: `canHaveFeature`
- RNG: `getRandomNumber(max, label)`
- Phases: `stampContinents`, `buildElevation`, `modelRivers`, `defineNamedRivers`, `validateAndFixTerrain`, `storeWaterData`, `addFloodplains`
- Utils: `generatePoissonMap`, `getHeightFromPercent`

### Package Structure

```
packages/civ7-types/
├── package.json
├── tsconfig.json
├── index.d.ts          # Main ambient declarations
├── globals/
│   ├── engine.d.ts
│   ├── gameplay-map.d.ts
│   ├── game-info.d.ts
│   ├── terrain-builder.d.ts
│   └── ...
└── modules/
    ├── base-standard-maps.d.ts
    └── base-standard-scripts.d.ts
```

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
