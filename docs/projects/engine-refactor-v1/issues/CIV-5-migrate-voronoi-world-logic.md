---
id: CIV-5
title: "[M-TS-05] Migrate World/Voronoi Logic (Gate B)"
state: planned
priority: 2
estimate: 5
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [feature, testing]
parent: null
children: []
blocked_by: [CIV-4]
blocked: [CIV-7]
related_to: [CIV-6]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Port the Voronoi plate tectonics logic from `mod/maps/world/*.js` to `packages/mapgen-core/src/world/*.ts` and prove testability by running algorithmic tests in Bun (Gate B validation).

## Deliverables

- [ ] Migrate `world/model.js` → `src/world/model.ts`:
  - [ ] Convert WorldModel singleton to TypeScript class/module
  - [ ] Type all tensor structures (plates, dynamics, diagnostics)
  - [ ] Maintain API compatibility with existing consumers
- [ ] Migrate `world/plates.js` → `src/world/plates.ts`:
  - [ ] Type `calculateVoronoiCells` function
  - [ ] Type plate boundary calculations
  - [ ] Ensure pure functions where possible (no global state reads)
- [ ] Migrate `world/plate_seed.js` → `src/world/plate-seed.ts`:
  - [ ] Type `PlateSeedManager` class
  - [ ] Convert seed generation to pure TypeScript
- [ ] Write unit tests in `test/world/`:
  - [ ] `voronoi.test.ts` — test plate generation produces expected count
  - [ ] `plates.test.ts` — test boundary calculations
  - [ ] `plate-seed.test.ts` — test deterministic seed generation
- [ ] Verify tests run in <100ms without game dependencies
- [ ] Export world modules from `@swooper/mapgen-core/world`

## Acceptance Criteria

- [ ] All `world/*.js` files migrated to TypeScript equivalents
- [ ] `bun test` passes all world module tests
- [ ] Tests complete in <100ms (no game dependency overhead)
- [ ] `calculateVoronoiCells({ width: 80, height: 50, count: 12 })` returns 12 plates
- [ ] No runtime errors from missing globals (mocks cover all dependencies)
- [ ] TypeScript strict mode passes for migrated files

## Testing / Verification

```bash
# Run world-specific tests
pnpm -C packages/mapgen-core bun test --filter world

# Run full test suite
pnpm -C packages/mapgen-core bun test

# Verify test timing
time pnpm -C packages/mapgen-core bun test

# Type check
pnpm -C packages/mapgen-core check
```

## Dependencies / Notes

- **Blocked by**: M-TS-04 (Pipeline must be validated first)
- **Related to**: M-TS-06 (Bootstrap refactor may be needed for some tests)
- **Blocks**: M-TS-07 (Orchestrator migration depends on world logic)
- **Gate B Goal**: Prove we can test complex algorithms outside the game

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Files to Migrate

| Source | Target | Notes |
|--------|--------|-------|
| `mod/maps/world/model.js` | `src/world/model.ts` | Singleton → typed module |
| `mod/maps/world/plates.js` | `src/world/plates.ts` | Voronoi calculations |
| `mod/maps/world/plate_seed.js` | `src/world/plate-seed.ts` | Deterministic seed manager |

### WorldModel Structure (from exploration)

```typescript
interface WorldModelState {
  plates: {
    id: Uint16Array;
    boundaryCloseness: Float32Array;
    boundaryType: Uint8Array;
    tectonicStress: Float32Array;
    upliftPotential: Float32Array;
    riftPotential: Float32Array;
    shieldStability: Float32Array;
    movementU: Float32Array;
    movementV: Float32Array;
    rotation: Float32Array;
  };
  dynamics: {
    windU: Float32Array;
    windV: Float32Array;
    currentU: Float32Array;
    currentV: Float32Array;
    pressure: Float32Array;
  };
  diagnostics: {
    boundaryTree: kdTree | null;
  };
}
```

### Test Examples

```typescript
// test/world/voronoi.test.ts
import { describe, it, expect } from "bun:test";
import { calculateVoronoiCells } from "../src/world/plates";

describe("Voronoi Tectonics", () => {
  it("should generate the requested number of plates", () => {
    const plates = calculateVoronoiCells({ width: 80, height: 50, count: 12 });
    expect(plates.length).toBe(12);
  });

  it("should produce deterministic results with same seed", () => {
    const opts = { width: 80, height: 50, count: 8, seed: 42 };
    const plates1 = calculateVoronoiCells(opts);
    const plates2 = calculateVoronoiCells(opts);
    expect(plates1).toEqual(plates2);
  });
});
```

### Pure Function Extraction Strategy

Where possible, extract pure functions from WorldModel:
- Input: configuration + seed
- Output: typed tensor arrays
- No GameplayMap reads inside pure functions

This enables testing without heavy mocking.

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
