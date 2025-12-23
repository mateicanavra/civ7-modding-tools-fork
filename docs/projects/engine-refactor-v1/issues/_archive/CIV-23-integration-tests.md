---
id: CIV-23
title: "[M-TS-P0] Add Integration & Behavior Tests"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [testing]
parent: CIV-14
children: []
blocked_by: [CIV-21]
blocked: []
related_to: [CIV-8]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Lock in guardrails with integration tests proving the pipeline actually works: orchestrator executes stages, WorldModel lifecycle is deterministic, and climate/biomes/features produce expected behavior.

> **Note:** Initially defined as P0 remediation under the M1 migration. With the engine architecture now evolving through M2/M3, this integration/behavior test sweep is tracked under M4 so we can lock in guardrails once the final engine shape and clusters are in place.

## Context

After Stacks 1-3 complete the structural fixes and engine wiring, we need tests that would have caught the "null script" regression. These tests ensure:

1. **Orchestrator actually runs stages** (not just returns without error)
2. **WorldModel lifecycle is clean** (reset/init sequence is deterministic)
3. **Layers produce expected outputs** (not just compile without errors)

## Deliverables

### 1. Orchestrator Integration Test

- [ ] Create long-lived `MapOrchestrator + MockAdapter` integration test
- [ ] Call `bootstrap({ stageConfig: { foundation: true, landmassPlates: true, ... } })`
- [ ] Create `MapOrchestrator` with `MockAdapter`
- [ ] Run `generateMap()`
- [ ] Assert:
  - Expected stages are enabled (via `stageEnabled()`)
  - Stages actually execute (via call counts or output checks)
  - At minimum: foundation, landmassPlates, coastlines, mountains, placement

### 2. WorldModel Lifecycle Tests

- [ ] `init()` with explicit width/height/RNG:
  - Arrays allocated with correct size
  - Plate fields populated (plateId, boundaryType, etc.)
  - Dynamics fields populated (windU/V, currentU/V, pressure)
- [ ] `reset()` clears state:
  - Back-to-back `init()` calls produce deterministic results
  - No state leakage between runs
- [ ] `setConfigProvider` / `getConfig()` integration

### 3. Targeted Behavior Tests

- [ ] **Climate tests:**
  - Latitude bands produce expected temperature gradient
  - Orographic bonuses apply near mountains
  - Coastal/shallow modifiers work (via fallback or adapter)
- [ ] **Biomes tests:**
  - Tundra restraint fires in polar regions
  - Tropical coast rules apply in equatorial zones
  - River-valley grassland works near rivers
  - Corridor nudge works when StoryTags present
- [ ] **Features tests:**
  - Reef placement in shallow coastal water
  - Volcanic forest/taiga near hotspots
  - Density tweaks apply based on biome

## Acceptance Criteria

- [ ] Orchestrator integration test exists and passes
- [ ] WorldModel lifecycle tests exist and pass
- [ ] Climate behavior tests exist and pass
- [ ] Biomes behavior tests exist and pass
- [ ] Features behavior tests exist and pass
- [ ] All tests run in `pnpm -C packages/mapgen-core test`
- [ ] Tests would fail if stage manifest wiring regresses

## Testing / Verification

```bash
# Run all tests
pnpm -C packages/mapgen-core test

# Run integration tests specifically
pnpm -C packages/mapgen-core test --grep "integration|orchestrator"

# Run lifecycle tests
pnpm -C packages/mapgen-core test --grep "WorldModel|lifecycle"

# Run behavior tests
pnpm -C packages/mapgen-core test --grep "climate|biomes|features"

# Verify timing (should be fast)
time pnpm -C packages/mapgen-core test
# Should complete in <10 seconds
```

## Dependencies / Notes

- **Blocked by**: All of Stack 3 (engine wiring must be complete)
- **Blocks**: Nothing directly (enables CIV-8 completion)
- **Related to**: CIV-8 (these tests validate what E2E will verify in-game)

### Test Philosophy

These are **guardrail tests**, not comprehensive coverage:

1. **Smoke-level assertions** — "stages execute and produce output"
2. **Regression prevention** — "null script" scenario would fail these tests
3. **MockAdapter based** — run in milliseconds, no game dependency

Full behavioral correctness is validated in CIV-8's in-game verification.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Orchestrator Integration Test

```typescript
// __tests__/integration/orchestrator.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { bootstrap, resetBootstrap, stageEnabled } from "../../src/bootstrap/index.js";
import { MapOrchestrator } from "../../src/MapOrchestrator.js";
import { MockAdapter } from "@civ7/adapter/mock";

describe("MapOrchestrator Integration", () => {
  beforeEach(() => {
    resetBootstrap();
  });

  test("stages are enabled after bootstrap", () => {
    bootstrap({
      stageConfig: {
        foundation: true,
        landmassPlates: true,
        coastlines: true,
        mountains: true,
      }
    });

    expect(stageEnabled("foundation")).toBe(true);
    expect(stageEnabled("landmassPlates")).toBe(true);
    expect(stageEnabled("coastlines")).toBe(true);
    expect(stageEnabled("mountains")).toBe(true);
    expect(stageEnabled("biomes")).toBe(false);  // Not enabled
  });

  test("generateMap executes enabled stages", () => {
    bootstrap({
      stageConfig: {
        foundation: true,
        landmassPlates: true,
        coastlines: true,
      }
    });

    const adapter = new MockAdapter();
    const orchestrator = new MapOrchestrator({ adapter });

    // Should not throw
    orchestrator.generateMap();

    // Verify adapter was called (stages executed)
    expect(adapter.setTerrainType).toHaveBeenCalled();
  });

  test("context has foundation after generateMap", () => {
    bootstrap({ stageConfig: { foundation: true } });

    const adapter = new MockAdapter();
    const orchestrator = new MapOrchestrator({ adapter });
    const ctx = orchestrator.generateMap();

    expect(ctx.foundation).toBeDefined();
    expect(ctx.foundation.plates.id).toBeDefined();
    expect(ctx.foundation.dynamics.windU).toBeDefined();
  });
});
```

### Foundation Producer Tests

```typescript
// __tests__/foundation/plates.test.ts
import { describe, test, expect } from "bun:test";
import { computePlatesVoronoi } from "../../src/foundation/plates.js";
import type { PlateConfig } from "../../src/foundation/types.js";

describe("Foundation plates", () => {
  test("allocates arrays correctly", () => {
    const rng = (max: number) => (max > 0 ? 0 : 0);
    const config: PlateConfig = { count: 8 };
    const result = computePlatesVoronoi(84, 54, config, { rng });

    expect(result.plateId.length).toBe(84 * 54);
    expect(result.boundaryType.length).toBe(84 * 54);
  });

  test("config influences plate count", () => {
    const rng = (max: number) => (max > 0 ? 0 : 0);
    const config: PlateConfig = { count: 12 };
    const result = computePlatesVoronoi(84, 54, config, { rng });

    expect(result.plateRegions.length).toBe(12);
  });
});
```

### Climate Behavior Tests

```typescript
// __tests__/layers/climate.test.ts
import { describe, test, expect } from "bun:test";
import { applyClimate } from "../../src/layers/climate-engine.js";
import { createMockContext } from "../helpers/mock-context.js";

describe("Climate Behavior", () => {
  test("latitude bands produce temperature gradient", () => {
    const ctx = createMockContext({ width: 20, height: 20 });

    applyClimate(ctx);

    // Equator (y=10) should be warmer than poles (y=0, y=19)
    const equatorTemp = ctx.fields.temperature![10 * 20 + 10];
    const poleTemp = ctx.fields.temperature![0 * 20 + 10];

    expect(equatorTemp).toBeGreaterThan(poleTemp);
  });

  test("coastal cells get moisture bonus", () => {
    const ctx = createMockContext({ width: 20, height: 20 });
    // Set up coastal scenario
    setupCoastalCell(ctx, 5, 5);

    applyClimate(ctx);

    const coastalRainfall = ctx.fields.rainfall![5 * 20 + 5];
    const inlandRainfall = ctx.fields.rainfall![10 * 20 + 10];

    expect(coastalRainfall).toBeGreaterThan(inlandRainfall);
  });
});
```

### Test Helpers

```typescript
// __tests__/helpers/mock-context.ts
import { createExtendedMapContext } from "../../src/core/types.js";
import { MockAdapter } from "@civ7/adapter/mock";

export function createMockContext(options: {
  width?: number;
  height?: number;
} = {}): ExtendedMapContext {
  const width = options.width ?? 84;
  const height = options.height ?? 54;
  const adapter = new MockAdapter();
  const config = { stageConfig: {} };

  return createExtendedMapContext({ width, height }, adapter, config);
}
```

### Quick Navigation

- [TL;DR](#tldr)
- [Context](#context)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
