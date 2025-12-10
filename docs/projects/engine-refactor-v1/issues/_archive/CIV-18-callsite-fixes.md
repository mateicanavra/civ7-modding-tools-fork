---
id: CIV-18
title: "[M-TS-P0] Fix Biomes & Climate Call-Sites"
state: done
priority: 1
estimate: 0
project: engine-refactor-v1
milestone: M1-TS-typescript-migration
assignees: []
labels: [bug]
parent: CIV-14
children: []
blocked_by: [CIV-17]
blocked: [CIV-19, CIV-20, CIV-21, CIV-22]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Fix two trivial call-site bugs that block existing layer logic from executing: (1) biomes stage missing `ctx` parameter, and (2) climate adapter stubs blocking neighborhood fallbacks.

## Problem

### Issue 1: Biomes Missing Context

`MapOrchestrator.ts:594` calls:
```typescript
designateEnhancedBiomes(iWidth, iHeight)  // Missing ctx!
```

Should be:
```typescript
designateEnhancedBiomes(iWidth, iHeight, ctx)
```

Without `ctx`, the biomes layer cannot access the adapter and falls into its dummy path.

### Issue 2: Climate Stubs Block Fallbacks

`climate-engine.ts`'s `resolveAdapter()` returns an adapter where `isCoastalLand` and `isAdjacentToShallowWater` are **present but stubbed to always return `false`**.

The climate code checks:
```typescript
if (adapter.isCoastalLand) {
  // Use adapter method
  return adapter.isCoastalLand(x, y);  // Always returns false!
} else {
  // Use local neighborhood fallback
  return checkNeighborhood(x, y);  // Never reached
}
```

**Result:** Coastal and shallow water gradients are effectively disabled.

**Fix:** Leave methods `undefined` (not stubbed to false) so the local fallback executes.

## Deliverables

- [x] **Biomes ctx fix (1 line):**
  - `MapOrchestrator.ts:643`: Add `ctx` parameter to `designateEnhancedBiomes` call
- [x] **Climate adapter fix (~10 lines):**
  - `climate-engine.ts`: Modify `resolveAdapter()`
  - Remove `isCoastalLand` and `isAdjacentToShallowWater` stub implementations
  - Leave them undefined so fallback code path executes
  - Made `ClimateAdapter.isCoastalLand` and `isAdjacentToShallowWater` optional in interface
- [x] **Verify biomes receives context:**
  - Added test verifying `designateEnhancedBiomes` accepts ctx parameter
- [x] **Smoke test:**
  - Added `test/layers/callsite-fixes.test.ts` with 5 tests verifying fallback behavior

## Acceptance Criteria

- [x] Biomes stage receives `ctx` and can access adapter
- [x] Climate coastal/shallow fallbacks execute (not blocked by stubs)
- [x] Build passes, tests pass (179 tests)
- [x] A minimal MockAdapter smoke test shows biomes and climate stages execute (basic assertions)

## Testing / Verification

```typescript
// Test: biomes receives context
test("biomes stage receives ctx with adapter", () => {
  const ctx = createMockContext();
  const adapter = ctx.adapter;

  // Should not throw "adapter undefined"
  expect(() => designateEnhancedBiomes(84, 54, ctx)).not.toThrow();

  // Verify adapter was called
  expect(adapter.getBiomeType).toHaveBeenCalled();
});

// Test: climate uses fallback when adapter method undefined
test("climate uses neighborhood fallback for coastal check", () => {
  const ctx = createMockContext();
  // Ensure adapter.isCoastalLand is undefined
  delete ctx.adapter.isCoastalLand;

  // Run climate pass
  applyClimate(ctx);

  // Verify coastal cells got moisture bonus
  const coastalIdx = findCoastalCell(ctx);
  expect(ctx.fields.rainfall[coastalIdx]).toBeGreaterThan(baseRainfall);
});
```

```bash
# Build verification
pnpm -C packages/mapgen-core build

# Run call-site tests
pnpm -C packages/mapgen-core test --grep "biomes.*ctx|climate.*fallback"
```

## Dependencies / Notes

- **Blocked by**: Config resolver (stages must be enabled to test execution)
- **Blocks**: Biomes/features adapter integration
- **Low risk**: These are trivial fixes with clear scope

### Files to Modify

- `packages/mapgen-core/src/MapOrchestrator.ts` — add ctx to designateEnhancedBiomes call
- `packages/mapgen-core/src/layers/climate-engine.ts` — fix resolveAdapter stubs

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Biomes Fix

```typescript
// MapOrchestrator.ts (around line 594)
// Before:
designateEnhancedBiomes(iWidth, iHeight);

// After:
designateEnhancedBiomes(iWidth, iHeight, ctx);
```

### Climate Adapter Fix

```typescript
// climate-engine.ts - resolveAdapter()
// Before:
function resolveAdapter(adapter: EngineAdapter): ClimateAdapter {
  return {
    ...adapter,
    isCoastalLand: adapter.isCoastalLand ?? (() => false),  // Stub blocks fallback
    isAdjacentToShallowWater: adapter.isAdjacentToShallowWater ?? (() => false),
  };
}

// After:
function resolveAdapter(adapter: EngineAdapter): ClimateAdapter {
  return {
    ...adapter,
    // Don't provide stubs - let calling code use its own fallback
    // isCoastalLand: inherited from adapter (may be undefined)
    // isAdjacentToShallowWater: inherited from adapter (may be undefined)
  };
}
```

### Fallback Pattern in Climate Code

The climate code should check for method existence before calling:

```typescript
function getCoastalModifier(x: number, y: number, adapter: ClimateAdapter): number {
  if (typeof adapter.isCoastalLand === "function") {
    return adapter.isCoastalLand(x, y) ? COASTAL_MOISTURE_BONUS : 0;
  }
  // Local fallback using neighborhood check
  return isAdjacentToWater(x, y, adapter) ? COASTAL_MOISTURE_BONUS : 0;
}
```

### Quick Navigation

- [TL;DR](#tldr)
- [Problem](#problem)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
