---
id: CIV-17
title: "[M-TS-P0] Implement Config to Manifest Resolver"
state: planned
priority: 1
estimate: 0
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [bug, architecture]
parent: CIV-14
children: []
blocked_by: [CIV-15, CIV-16]
blocked: [CIV-18, CIV-19]
related_to: [CIV-6]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Bridge the "Config Air Gap" by implementing a resolver that translates `bootstrap()` input into the `StageManifest` structure that `stageEnabled()` reads — this is the primary reason all stages are currently skipped.

## Problem

### The Config Air Gap

```
bootstrap({ stageConfig: { foundation: true, landmassPlates: true } })
    │
    ▼
config.stageConfig = { foundation: true, landmassPlates: true }  ← STORED HERE
    │
    ▼
buildTunablesSnapshot() reads config.stageManifest  ← BUT READS HERE
    │
    ▼
config.stageManifest = {}  ← ALWAYS EMPTY
    │
    ▼
stageEnabled("foundation") → false  ← ALWAYS FALSE
    │
    ▼
All 14 stages skipped  ← "NULL SCRIPT"
```

**Root cause:** `bootstrap/entry.ts:118` stores `stageConfig` but `tunables.ts:161` reads `stageManifest`. There is no translation logic connecting them.

## Deliverables

- [ ] **Implement minimal resolver:**
  - Create `bootstrap/resolved.ts` (or integrate into existing bootstrap)
  - Map `stageConfig` booleans into `StageManifest.stages` structure
  - Use canonical stage order from `bootstrap/defaults/base.js`
- [ ] **Ensure `tunables.STAGE_MANIFEST` is populated:**
  - After `bootstrap()` completes, `STAGE_MANIFEST.stages` should contain enabled flags
  - `stageEnabled()` should return the intended boolean values
- [ ] **Reintroduce minimal `[StageManifest]` warnings:**
  - Warn when overrides target missing or disabled stages
  - Helps catch configuration errors early
- [ ] **Add resolver unit test:**
  - Given `stageConfig: { foundation: true, landmassPlates: true }`
  - Assert `stageEnabled("foundation") === true`
  - Assert `stageEnabled("landmassPlates") === true`
  - Assert `stageEnabled("someDisabledStage") === false`

## Acceptance Criteria

- [ ] `stageEnabled("foundation")` returns `true` when `stageConfig.foundation = true`
- [ ] `stageEnabled("landmassPlates")` returns `true` when `stageConfig.landmassPlates = true`
- [ ] Resolver test confirms stageConfig→manifest mapping works
- [ ] Build passes, tests pass
- [ ] Pipeline still won't generate full terrain (depends on later stacks), but stages should now *attempt* to execute

## Testing / Verification

```typescript
// Test: resolver maps config correctly
import { bootstrap, stageEnabled, resetBootstrap } from "@swooper/mapgen-core";

beforeEach(() => resetBootstrap());

test("stageConfig enables stages via manifest", () => {
  bootstrap({
    stageConfig: {
      foundation: true,
      landmassPlates: true,
      coastlines: true,
    }
  });

  expect(stageEnabled("foundation")).toBe(true);
  expect(stageEnabled("landmassPlates")).toBe(true);
  expect(stageEnabled("coastlines")).toBe(true);
  expect(stageEnabled("biomes")).toBe(false);  // Not enabled
});
```

```bash
# Build verification
pnpm -C packages/mapgen-core build

# Run resolver tests
pnpm -C packages/mapgen-core test --grep "stageConfig"
```

## Dependencies / Notes

- **Blocked by**: CIV-15 (adapter), CIV-16 (context) — shape must be fixed first
- **Blocks**: CIV-18 (call-site fixes), CIV-19 (biomes adapter)
- **Related to**: CIV-6 (bootstrap refactor)

### Design Decision: Typed Config vs Runtime Resolution

**Option A: Patch (The Bridge)** — Keep two formats, translate at runtime
- Pros: Least code change
- Cons: Maintains technical debt of dual formats

**Option B: Simplify (Interface-Driven)** [RECOMMENDED]
- Define strict `MapConfiguration` interface
- Entry point constructs fully-typed config including manifest
- Drop hidden runtime resolution logic
- Compile-time guarantee: if config is valid TS, pipeline runs

This issue implements the minimal bridge (Option A) to unblock progress. A follow-up P1 issue can migrate to Option B for cleaner architecture.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Current Flow (Broken)

```typescript
// bootstrap/entry.ts
export function bootstrap(options: BootstrapOptions) {
  config.stageConfig = options.stageConfig;  // Line 118
  // ... no translation to stageManifest
}

// tunables.ts
function buildTunablesSnapshot() {
  return {
    STAGE_MANIFEST: config.stageManifest || {},  // Line 161 — always empty!
  };
}

// usage
function stageEnabled(stage: string): boolean {
  const manifest = getTunables().STAGE_MANIFEST;
  return manifest.stages?.[stage]?.enabled ?? false;  // Always false
}
```

### Target Flow

```typescript
// bootstrap/resolved.ts
import { STAGE_ORDER } from "./defaults/base.js";

export function resolveStageManifest(stageConfig: Record<string, boolean>): StageManifest {
  const stages: Record<string, { enabled: boolean; order: number }> = {};

  STAGE_ORDER.forEach((stageName, index) => {
    stages[stageName] = {
      enabled: stageConfig[stageName] ?? false,
      order: index,
    };
  });

  return { stages };
}

// bootstrap/entry.ts
export function bootstrap(options: BootstrapOptions) {
  config.stageConfig = options.stageConfig;
  config.stageManifest = resolveStageManifest(options.stageConfig || {});  // NEW
}
```

### Stage Order Reference

From `bootstrap/defaults/base.js`, the canonical stage order is:
1. `foundation`
2. `landmassPlates`
3. `continents`
4. `coastlines`
5. `islands`
6. `mountains`
7. `volcanoes`
8. `climate`
9. `biomes`
10. `features`
11. `rivers`
12. `placement`
13. `resources`
14. `discoveries`

### Warning Implementation

```typescript
export function validateOverrides(
  overrides: Record<string, unknown>,
  manifest: StageManifest
): void {
  for (const key of Object.keys(overrides)) {
    const stage = manifest.stages[key];
    if (!stage) {
      console.warn(`[StageManifest] Override targets unknown stage: "${key}"`);
    } else if (!stage.enabled) {
      console.warn(`[StageManifest] Override targets disabled stage: "${key}"`);
    }
  }
}
```

### Quick Navigation

- [TL;DR](#tldr)
- [Problem](#problem)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
