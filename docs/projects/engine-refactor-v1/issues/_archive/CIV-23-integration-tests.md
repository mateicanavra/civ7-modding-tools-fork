---
id: CIV-23
title: "[M4] Integration & Behavior Tests (RunRequest/ExecutionPlan)"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M4
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

Lock in guardrails at the new boundary: `RunRequest → ExecutionPlan → PipelineExecutor`, using the standard recipe + MockAdapter to prove compile/execute succeed without the engine.

> **Note:** Initially defined as P0 remediation under the M1 migration. With the engine architecture now evolving through M2/M3, this integration/behavior test sweep is tracked under M4 so we can lock in guardrails once the final engine shape and clusters are in place.

## Context

After the pipeline cutover, the stable boundary is `RunRequest → ExecutionPlan → PipelineExecutor`. These tests ensure:

1. **RunRequest compiles into a valid ExecutionPlan** using the standard recipe + registry.
2. **Execution completes with a stub adapter** (engine-free) and emits structured run/step results.
3. **Domain outputs are sanity-checked** through lightweight artifact/field assertions (not full engine correctness).

## Deliverables

### 1. ExecutionPlan Integration Test

- [ ] Compile the standard recipe via `RunRequest → ExecutionPlan`
- [ ] Execute the plan with `PipelineExecutor` + `MockAdapter`
- [ ] Assert:
  - Plan node order matches the standard recipe
  - All steps report success in `stepResults`
  - Baseline artifacts/fields are populated (foundation, heightfield, climate)

### 2. Targeted Behavior Tests (optional follow-up)

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

- [ ] ExecutionPlan integration test exists and passes (standard recipe + MockAdapter)
- [ ] At least one behavior test per climate/biomes/features exists and passes
- [ ] All tests run in `pnpm -C packages/mapgen-core test`
- [ ] Tests fail if standard recipe ordering or plan compilation regresses

## Testing / Verification

```bash
# Run all tests
pnpm -C packages/mapgen-core test

# Run integration tests specifically
pnpm -C packages/mapgen-core test --grep "integration|orchestrator"

# Run RunRequest/ExecutionPlan boundary tests
pnpm -C packages/mapgen-core test --grep "RunRequest|ExecutionPlan"

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

### ExecutionPlan Integration Test

```typescript
// __tests__/integration/standard-execution-plan.test.ts
import { describe, test, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap } from "@mapgen/index.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import { mod as standardMod } from "@mapgen/mods/standard/mod.js";
import {
  compileExecutionPlan,
  PipelineExecutor,
  StepRegistry,
} from "@mapgen/pipeline/index.js";

describe("ExecutionPlan integration", () => {
  test("compiles + executes the standard recipe with MockAdapter", () => {
    const adapter = createMockAdapter({ width: 24, height: 16, rng: () => 0 });
    const config = bootstrap();
    const registry = new StepRegistry();
    standardMod.registry.register(registry, config, /* runtime */);

    const plan = compileExecutionPlan(
      {
        recipe: standardMod.recipes.default,
        settings: {
          seed: 123,
          dimensions: { width: 24, height: 16 },
          latitudeBounds: { topLatitude: 80, bottomLatitude: -80 },
          wrap: { wrapX: true, wrapY: false },
        },
      },
      registry
    );

    const ctx = createExtendedMapContext({ width: 24, height: 16 }, adapter, config);
    const executor = new PipelineExecutor(registry, { log: () => {} });
    const { stepResults } = executor.executePlan(ctx, plan);

    expect(stepResults.every((step) => step.success)).toBe(true);
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
import { default-config helper } from "../../src/config/index.js";
import { MockAdapter } from "@civ7/adapter/mock";

export function createMockContext(options: {
  width?: number;
  height?: number;
} = {}): ExtendedMapContext {
  const width = options.width ?? 84;
  const height = options.height ?? 54;
  const adapter = new MockAdapter();
  const config = default-config helper();

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
