Engineering Design: Swooper Maps TypeScript Refactor v2.0  
Status: Approved / Execution Ready  
Owner: Engineering Team  
Context: Civ 7 Modding Tools Monorepo  
Date: December 6, 2025

## 1. Executive Summary

We are transitioning the swooper-maps mod from a monolithic collection of raw JavaScript files into a structured, type-safe TypeScript library within our existing Bun monorepo.

**Current State**
- Logic is tightly coupled with mod configuration and game globals.
- Critical algorithms (Voronoi, Plate Tectonics) are untestable outside the game environment.
- Deployment relies on manual checks.

**Target State**
- `packages/mapgen-core`: A pure TypeScript domain library containing all generation algorithms. Testable via `bun test` in milliseconds.
- `mods/mod-swooper-maps`: A thin consumer that configures the core library and bundles it into a single artifact for the game.
- `packages/civ7-types`: A shared type definition package to mock the game's runtime environment (`/base-standard/...`).

## 2. Architecture Overview

We will leverage Bun's workspace capabilities to split "Logic" from "Delivery".

### 2.1 The Components

| Package       | Path                    | Role                                                                                         | Dependencies          |
|---------------|-------------------------|----------------------------------------------------------------------------------------------|-----------------------|
| Civ7 Types    | packages/civ7-types     | Interface Layer. Provides TypeScript definitions for the game's global objects (engine, GameplayMap) and virtual file system imports. | None                  |
| MapGen Core   | packages/mapgen-core    | Domain Logic. Contains MapOrchestrator, Tectonics, Climate engines. Pure TS. No side effects on import. | @civ7/types           |
| Swooper Mod   | mods/mod-swooper-maps   | Application Layer. The actual mod. Imports Core, applies config (e.g., "Desert Mountains"), and bundles via tsup. | @swooper/mapgen-core  |

### 2.2 Toolchain Positioning (pnpm + Bun)

- We keep the workspace on pnpm/turbo/vitest for existing packages.
- For this project, we prefer Bun where feasible (tests/build for `@swooper/mapgen-core` and the mod bundle), but **must not destabilize** other workspaces.
- Decision point: if Bun + pnpm coexistence causes breakage, pause and choose:
  - Option 1: Broader Bun adoption (align CI/scripts/workspace).
  - Option 2: Fall back to pnpm/vitest/tsup for this effort.
- Add scripts to bridge: pnpm scripts that delegate to Bun (e.g., `pnpm -C packages/mapgen-core bun test`) so workspace tooling remains consistent. Add an explicit root bridge script (example): `"build:maps": "pnpm -C mods/mod-swooper-maps bun run build"` and a CONTRIBUTING note “Use Bun here” for this package.
- CONTRIBUTING note (add to docs/process/CONTRIBUTING.md): for `mods/mod-swooper-maps` and `@swooper/mapgen-core`, run Bun via the provided bridge scripts; do not introduce `/base-standard/...` imports outside `@civ7/adapter` (grep/lint gate).

### 2.2 Key Architectural Decisions

**Decision A: Direct Game Path Imports**  
We will declare TypeScript modules using the exact file paths the game expects (e.g., `/base-standard/maps/map-utilities.js`) rather than creating a unified wrapper adapter.  
Reason: The Civ 7 engine requires these exact import strings. Using an abstraction layer would require complex build-time transformation to restore the original paths.  
Benefit: Zero-cost abstraction. `tsup` can simply mark these paths as external, passing them through to the output artifact untouched.

**Decision A.1: Centralized Adapter Pattern (single entry)**  
Introduce a single adapter module (`@civ7/adapter`) as the only place allowed to import `/base-standard/...`. `tsup` keeps `/base-standard/...` **external** (hard rule) while bundling the adapter so those imports are flattened into the final output. Core/test code consumes the adapter; tests can mock it.

**Decision B: "Lazy" Bootstrapping with Reset**  
We will refactor configuration files (currently in `bootstrap/`) to use a Memoized Provider Pattern.  
Problem: Files like `tunables.js` currently read global `GameInfo` immediately upon import. This crashes tests (which lack `GameInfo`) and prevents test isolation.  
Solution:
- Do not execute logic at the top level.
- Export a `getTunables()` function.
- Cache the result in a module-level variable.
- Export a `resetTunables()` function for testing cleanup.

**Decision C: Adapter Boundary for Civ 7 Engine**  
Core stays “pure TS”; a thin adapter owns all engine/Civ7 imports using real `/base-standard/...` paths. Core consumes the adapter interface, not globals directly. Bundling keeps those imports external and stable.

## 3. Implementation Plan

### Phase 1: Foundation (Type Safety)

We cannot migrate logic until TypeScript understands the Civ 7 runtime environment.

**Step 1.1: Create `packages/civ7-types`**  
This package "mocks" the files that exist in the game but not in our repo.

File: `packages/civ7-types/package.json`
```json
{
  "name": "@civ7/types",
  "version": "0.1.0",
  "types": "./index.d.ts",
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

File: `packages/civ7-types/index.d.ts`
```ts
/**
 * Global Engine Objects
 * Based on usage in mod/maps/map_orchestrator.js and layers/*.js
 */
declare global {
  const engine: {
    on(event: string, callback: (...args: any[]) => void): void;
    call(method: string, ...args: any[]): any;
  };

  const GameplayMap: {
    getGridWidth(): number;
    getGridHeight(): number;
    getMapSize(): string; // Returns string ID like "MAPSIZE_HUGE"
    isWater(x: number, y: number): boolean;
    isMountain(x: number, y: number): boolean;
    getTerrainType(x: number, y: number): number;
    setTerrainType(x: number, y: number, type: number): void;
  };

  const TerrainBuilder: {
    validateAndFixTerrain(): void;
    stampContinents(): void;
    buildElevation(): void;
    modelRivers(arg0: number, arg1: number, arg2: number): void;
    defineNamedRivers(): void;
    storeWaterData(): void;
  };

  const AreaBuilder: {
    recalculateAreas(): void;
  };

  const GameInfo: {
    Maps: { lookup(size: string): any };
  };

  // Add console to global scope if not automatically picked up
  var console: Console;
}

/**
 * Virtual File System Mocks
 * These allow us to import from '/base-standard/...' without TS errors.
 */
declare module '/base-standard/maps/map-utilities.js' {
  export function needHumanNearEquator(): boolean;
}

declare module '/base-standard/maps/assign-starting-plots.js' {
  export function chooseStartSectors(
      numPlayers1: number,
      numPlayers2: number,
      rows: number,
      cols: number,
      humanNearEquator: boolean
  ): any;
}

declare module '/base-standard/maps/elevation-terrain-generator.js' {
  export function expandCoasts(width: number, height: number): void;
  export function generateLakes(width: number, height: number, tilesPerLake: number): void;
}

declare module '/base-standard/maps/map-globals.js' {
  export const g_AvoidSeamOffset: number;
  export const g_PolarWaterRows: number;
  export const g_HillTerrain: number;
  export const g_NavigableRiverTerrain: number;
}

// Catch-all for rapid migration
declare module '/base-standard/*' {
  const value: any;
  export = value;
}
```

**Step 1.2: Type Coverage Pass (Inventory + Fill Gaps)**  
- Inventory all `GameplayMap`/`GameInfo` usages across `mods/mod-swooper-maps/mod/maps/**/*` (e.g., `getRainfall`, `getBiomeType`, `getPlotIndicesInRadius`, `isNavigableRiver`, `getRandomSeed`, table lookups on `GameInfo.Resources`, `Ages`, `Terrains`, `Biomes`, `Feature_NaturalWonders`, etc.).  
- Produce a task list of missing APIs and add declarations to `@civ7/types`. Start with the concrete set in `map_orchestrator.js` and `layers/*`: `getRainfall`, `getBiomeType`, `getPlotIndicesInRadius`, `getPlotLatitude`, `getPlotDistance`, `getRandomSeed`, `getOwner`, `getAreaId`, `getHemisphere`, `getPrimaryHemisphere`, `getPlotTag`, `hasPlotTag`, `isNavigableRiver`, `isRiver`, `isLake`, `isCoastalLand`, `isAdjacentToRivers`, `isAdjacentToLand`, `isAdjacentToShallowWater`, plus `GameInfo.Resources/Ages/Terrains/Biomes/Feature_NaturalWonders/StartBias*` lookups and `.length` access.  
- Keep a permissive catch-all for rapid migration, but close known gaps first to reduce TS noise.

**Step 1.3: Create `packages/civ7-adapter`**  
- Single module that re-exports `/base-standard/...` imports; depends on `@civ7/types` for declarations.  
- This is the only place allowed to import `/base-standard/...`; all other code (core/tests) imports from the adapter.  

### Phase 2: Core Migration (The "Lift & Shift")

We move the algorithmic "brain" out of the mod folder.

**Step 2.1: Initialize `packages/mapgen-core`**  
File: `packages/mapgen-core/package.json`
```json
{
  "name": "@swooper/mapgen-core",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "test": "bun test"
  },
  "dependencies": {
    "@civ7/types": "workspace:*"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.7.0"
  }
}
```

Add `exports` for subpaths:
```json
  "exports": {
    ".": "./src/index.ts",
    "./bootstrap": "./src/bootstrap/entry.ts",
    "./world/*": "./src/world/*",
    "./layers/*": "./src/layers/*"
  }
```

**Step 2.2: Migrate Logic Files**  
Move the files from `mods/mod-swooper-maps/mod/maps/` to `packages/mapgen-core/src/`.
- Map Orchestrator: `mod/maps/map_orchestrator.js` -> `src/MapOrchestrator.ts`
- World Logic: `mod/maps/world/*.js` -> `src/world/*.ts`
- Layers: `mod/maps/layers/*.js` -> `src/layers/*.ts`
- Bootstrap: `mod/maps/bootstrap/*.js` -> `src/bootstrap/*.ts`

**Step 2.3: Bootstrap Refactor (Critical)**  
We must refactor `src/bootstrap/tunables.ts` (and similar files) to use the Memoized Provider pattern.

Current Pattern (Risk):
```js
// Old tunables.js
const size = GameplayMap.getMapSize();
export const config = GameInfo.Maps.lookup(size); // Crashes tests!
```

New Pattern (Safe):
```ts
// New src/bootstrap/tunables.ts
let cachedConfig: any = null;

export const getTunables = () => {
    if (cachedConfig) return cachedConfig;

    // Only execute this when called (inside the game or inside a mock test)
    const size = GameplayMap.getMapSize();
    cachedConfig = GameInfo.Maps.lookup(size);
    return cachedConfig;
};

// Call this in test `beforeEach`
export const resetTunables = () => {
    cachedConfig = null;
};
```

Refactoring Tasks:
- Imports: Change local relative imports to standard TS imports.
- Laziness: Apply the pattern above to `tunables.ts`, `resolved.ts`, and `runtime.ts`.
- Exports: Ensure `MapOrchestrator` exports a class or function.
- Memoization strategy: keep an initial bind at module load for safety, but mandate `rebind()` (or cache reset) at each `generateMap` entry in runtime and in test `beforeEach` to avoid stale configs. If we shift to lazy getters, pair them with an explicit `reset*` per run.
- Adapter design (placeholder task): Define an adapter interface consumed by core; implement a Civ7 adapter that imports real `/base-standard/...` modules and proxies engine/global calls. Keep adapter file as the sole place that touches Civ7 imports to avoid bundling surprises.

File: `packages/mapgen-core/src/index.ts`
```ts
export * from "./MapOrchestrator";
export * from "./world/model";
export { bootstrap } from "./bootstrap/entry";
// Export other public APIs
```

### Phase 3: Mod Construction & Bundling

The mod folder becomes a lightweight shell that bundles the Core.

**Step 3.1: Configure `mods/mod-swooper-maps`**  
File: `mods/mod-swooper-maps/package.json`
```json
{
  "name": "mod-swooper-maps",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsup",
    "deploy": "bun run build && bun ../../packages/cli/bin/run.js mod manage deploy"
  },
  "dependencies": {
    "@swooper/mapgen-core": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.3.0",
    "typescript": "^5.7.0"
  }
}
```

Add pnpm bridge scripts at root or package level so CI can invoke Bun builds without changing the workspace tool: e.g., `"build:mod-swooper": "pnpm -C mods/mod-swooper-maps bun run build"`. Document that if Bun isn’t available/stable, fall back to `"pnpm -C mods/mod-swooper-maps tsup"` with equivalent config.

**Step 3.2: TSUP Configuration**  
This is the critical step. We must bundle Core (which is local) but exclude Base Standard (which is in the game).

File: `mods/mod-swooper-maps/tsup.config.ts`
```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/swooper-desert-mountains.ts'],

  // Output directly to the structure the .modinfo expects
  outDir: 'mod/maps',

  format: ['esm'],
  target: 'esnext',

  // Bundle all dependencies (like @swooper/mapgen-core) into the output file
  bundle: true,

  // Do NOT clear the directory, as we might have static XML files there
  // We only want to overwrite the JS files we generate.
  clean: false,

  // REGEX: Treat any import starting with /base-standard/ as an external global
  // This ensures `import x from '/base-standard/foo.js'` stays exactly like that in the output
  external: [
    /^\/base-standard\/.*/,
  ],

  // Force bundling of our workspace packages
  noExternal: [
    '@swooper/mapgen-core'
  ],

  // Civ 7 doesn't use source maps
  sourcemap: false,
  minify: false
});
```

**Step 3.3: The Entry Point**  
Create a TypeScript entry point that wires it all together.

File: `mods/mod-swooper-maps/src/swooper-desert-mountains.ts`
```ts
/// <reference types="@civ7/types" />
import { bootstrap } from "@swooper/mapgen-core/bootstrap";
import "@swooper/mapgen-core"; // Import the orchestrator side-effects if needed

// Note: Because we lazy-loaded config in core, this bootstrap call
// will trigger the first execution of GameInfo lookups.
bootstrap({
    stageConfig: {
        foundation: true,
        mountains: true,
        // ...
    },
    overrides: {
        mountains: {
             tectonicIntensity: 0.77,
             // ...
        }
    }
});

console.log("Swooper Desert Mountains (TypeScript Build) Loaded");
```

### Phase 3.5: Adapter Integration (Design, not immediate implementation)
- Define `packages/mapgen-core/src/adapter.ts` interface for engine/map IO used by core.
- Provide a Civ7 adapter in the mod package (or a `civ7` subpath in core) that imports real `/base-standard/...` scripts, exposes the adapter contract, and remains the only module with direct Civ7 imports.
- Ensure bundling marks those `/base-standard/...` imports as external, preserving runtime paths.
- Tests: Provide a mock adapter for pure TS runs; wire Bun/vitest to use the mock.

## 4. Testing Strategy (Bun Test)

Since logic is now in `packages/mapgen-core`, we can verify algorithms instantly.

File: `packages/mapgen-core/test/voronoi.test.ts`
```ts
import { describe, it, expect } from "bun:test";
// We can test pure logic functions that don't depend on 'engine' global
import { calculateVoronoiCells } from "../src/world/voronoi";

describe("Voronoi Tectonics", () => {
  it("should generate the requested number of plates", () => {
    // This pure function should not call GameplayMap.* internally ideally
    const plates = calculateVoronoiCells({ width: 80, height: 50, count: 12 });
    expect(plates.length).toBe(12);
  });
});
```

**For Logic that touches Globals (Bootstrap/Layers):**  
We create a `setup.ts` file for Bun test runner to mock the Civ 7 environment.

File: `packages/mapgen-core/test/setup.ts`
```ts
import { Global } from "bun:test";

// Mock the Civ 7 Engine API
global.engine = {
  on: () => {},
  call: () => {}
};

// Mock the Map Data API
global.GameplayMap = {
  getGridWidth: () => 128,
  getGridHeight: () => 80,
  getMapSize: () => "MAPSIZE_HUGE",
  isWater: (x, y) => false,
  isMountain: (x, y) => false,
  getTerrainType: (x, y) => 0
};

// Mock GameInfo Database
global.GameInfo = {
  Maps: {
    lookup: () => ({
      NumNaturalWonders: 4,
      LakeGenerationFrequency: 10,
      PlayersLandmass1: 2,
      PlayersLandmass2: 2,
      StartSectorRows: 4,
      StartSectorCols: 4
    })
  }
};

global.TerrainBuilder = {
    validateAndFixTerrain: () => {},
    stampContinents: () => {},
    buildElevation: () => {},
    modelRivers: () => {},
    defineNamedRivers: () => {},
    storeWaterData: () => {}
};

global.AreaBuilder = {
    recalculateAreas: () => {}
};

// Ensure console logs work
global.console = console;
```

File: `packages/mapgen-core/bunfig.toml`
```toml
[test]
preload = ["./test/setup.ts"]
```

## 5. Deployment Workflow

- Code: Engineer updates `packages/mapgen-core/src/world/plates.ts`.
- Test: Engineer runs `bun test` in `packages/mapgen-core`. Pass.
- Build: Engineer runs `bun run deploy` in `mods/mod-swooper-maps`.
  - `tsup` compiles `swooper-desert-mountains.ts` + mapgen-core -> `mod/maps/swooper-desert-mountains.js`.
  - Deploy command (via CLI) copies the contents of `mods/mod-swooper-maps/mod` (including XMLs and the new JS) to the game directory.
- Play: Engineer launches Civ 7.

## 6. Verification Checklist

- [ ] Type Check: `packages/civ7-types` allows `import ... from '/base-standard/...'` without error.
- [ ] Type Coverage: All known `GameplayMap` and `GameInfo` APIs used in codebase are declared (inventory complete).
- [ ] Core Build: `packages/mapgen-core` compiles to valid ESM.
- [ ] Mod Bundle: `mod/maps/swooper-desert-mountains.js` is generated and includes the inlined code from Core.
- [ ] External Imports: The generated JS file still contains `import ... from "/base-standard/..."` at the top.
- [ ] Deployment: `bun run deploy` successfully copies files to the Civ 7 Mods folder.
- [ ] Game Load: Civ 7 loads the mod without "Module Not Found" errors.
- [ ] Adapter Boundary: Core uses the adapter interface; Civ7 adapter retains correct `/base-standard/...` imports and remains external in bundle.
- [ ] Adapter Enforcement: `/base-standard/...` imports appear only in the adapter package (lint/grep check).
- [ ] Memoization: `rebind()`/reset strategy verified to refresh configs per run and per test.

## 7. Phased Implementation Strategy

To de-risk the migration, we will execute the plan in three discrete gates. Each gate unlocks specific capabilities and verifies critical assumptions before proceeding.

### Gate A: The Pipeline Validation (Infrastructure)

Goal: Confirm we can build a valid Civ 7 mod artifact from our TypeScript toolchain that the game recognizes and executes without crashing, proving the build pipeline and module resolution work.

Activities:
- Create `packages/civ7-types` and `packages/mapgen-core` (scaffold).
- Create `mods/mod-swooper-maps` with `tsup` configuration.
- Create an entry point `src/swooper-desert-mountains.ts` that imports and delegates to a standard script.  
  Code: `import '/base-standard/maps/continents.js'; console.log("Gate A Wrapper Loaded");`  
  This forces `tsup` to handle the external import correctly.  
  This ensures the game generates a valid map (Continents), preventing a crash.

Verification: Run `bun run deploy`.

Success Condition:
- `mod/maps/swooper-desert-mountains.js` exists.
- It contains `import ... from '/base-standard/maps/continents.js'`.
- In Game: The mod loads, the map generates successfully (looks like standard Continents), and the logs show "Gate A Wrapper Loaded".

### Gate B: The Core Logic Validation (Testability)

Goal: Confirm we can run and test complex map generation algorithms in Bun (outside the game), proving we can develop faster.

Activities:
- Port the Voronoi Tectonics logic (`world/voronoi.js`) to `packages/mapgen-core/src/world/voronoi.ts`.
- Implement the test scaffold (`setup.ts`).
- Write a unit test in `packages/mapgen-core/test/voronoi.test.ts` that generates a plate graph.

Verification: Run `bun test`.

Success Condition: The test passes in <100ms. The logic correctly calculates plates without runtime errors or missing global dependencies.

### Gate C: The Integrated Migration (Functionality)

Goal: Full feature parity. The mod runs entirely on the new architecture.

Activities:
- Port MapOrchestrator and Bootstrap.
- Refactor `bootstrap/tunables.ts` to use the "Lazy Provider" pattern (fixing the testing crash risk).
- Wire up `swooper-desert-mountains.ts` to call the real `bootstrap()` function.

Verification: Deploy the full mod.

Success Condition: The game generates a "Swooper Desert Mountains" map identical (or functionally equivalent) to the JS version, but the source code is now fully typed and modular.

### Gate D (If Needed): Toolchain Decision
- Trigger: Bun + pnpm coexistence causes instability or friction.
- Option 1: Broader Bun adoption — add workspace-level Bun scripts, CI runners, align tests to Bun, and document the new baseline.
- Option 2: Fall back to pnpm/vitest/tsup for mapgen and mod builds; keep Bun optional.
- Success Condition: Chosen path is documented; builds/tests are stable and reproducible.
