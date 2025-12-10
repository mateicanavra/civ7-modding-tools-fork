---
id: CIV-24
title: "[M-TS-P0] Restore Dev Diagnostics & Stage Logging"
state: planned
priority: 3
estimate: 2
project: engine-refactor-v1
milestone: M-TS-typescript-migration
assignees: []
labels: [improvement, technical-debt]
parent: CIV-14
children: []
blocked_by: [CIV-19]
blocked: []
related_to: [CIV-23]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Port the legacy `bootstrap/dev.js` diagnostics layer to TypeScript, providing DEV flags, ASCII dumps, histograms, and per-stage timing logs to aid debugging of world/foundation/climate/biomes behavior.

## Problem

The legacy JS mod had a comprehensive `bootstrap/dev.js` module with:
- Master toggle flags (`DEV.ENABLED`, `DEV.LOG_TIMING`, `DEV.LOG_BIOME_ASCII`, etc.)
- ASCII visualization helpers for plates, landmass, rainfall, biomes
- Histogram generators for rainfall and foundation metrics
- Timing utilities (`timeSection`, `timeStart`, `timeEnd`)
- Story tag summaries and corridor overlays

The TypeScript pipeline only logs coarse stage boundaries (`[SWOOPER_MOD] Starting/Completed`) and a few ad-hoc messages, making debugging significantly harder.

## Deliverables

- [ ] **Create `packages/mapgen-core/src/dev/` module:**
  - `flags.ts` — DEV flag surface with typed keys
  - `logging.ts` — `devLog`, `devLogIf`, conditional logging helpers
  - `timing.ts` — `timeSection`, `timeStart`, `timeEnd` utilities
  - `ascii.ts` — ASCII grid rendering for foundation, landmass, rainfall, biomes
  - `histograms.ts` — Rainfall and foundation metric histograms
  - `summaries.ts` — Foundation, biome, and story tag summaries
  - `index.ts` — Re-export public API
- [ ] **Wire config integration:**
  - Read DEV flags from resolved config (`DEV_LOG_CFG` equivalent)
  - Support runtime toggle via config entries
- [ ] **Integrate with adapter:**
  - Use `EngineAdapter` for map queries (isWater, getBiomeType, etc.)
  - No direct `/base-standard/...` imports in dev module
- [ ] **Hook into MapOrchestrator:**
  - Add timing hooks around major stages
  - Log foundation summary after `initializeFoundation`
  - Log biome/rainfall summaries after respective stages

## Acceptance Criteria

- [ ] `DEV` flags object exported from `@swooper/mapgen-core`
- [ ] All logging is no-op when `DEV.ENABLED = false` (no perf impact)
- [ ] ASCII dumps work for foundation, landmass, rainfall, biomes (via adapter)
- [ ] Timing logs show per-stage durations when enabled
- [ ] Config can toggle specific flags per run
- [ ] Build passes, no `/base-standard/...` imports in dev module

## Testing / Verification

```bash
# Build verification
pnpm -C packages/mapgen-core build

# Type check
pnpm -C packages/mapgen-core check-types

# Verify no base-standard imports in dev module
grep -r "base-standard" packages/mapgen-core/src/dev/ && echo "FAIL" || echo "PASS"
```

## Dependencies / Notes

- **Blocked by**: CIV-19 (needs adapter biomes/features methods for summaries)
- **Related to**: CIV-23 (integration tests may want dev logging)
- **Reference**: `docs/projects/engine-refactor-v1/resources/_archive/original-mod-swooper-maps-js/bootstrap/dev.js`

### Scope Notes

Port the most useful diagnostics without over-engineering:
- **Include**: DEV flags, timing, ASCII dumps, histograms, summaries
- **Simplify**: Standardize ASCII character sets, consolidate duplicate patterns
- **Defer**: Complex corridor overlays (can add later if needed)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### DEV Flags Surface

```typescript
// dev/flags.ts
export interface DevFlags {
  ENABLED: boolean;
  LOG_TIMING: boolean;
  LOG_FOUNDATION_SUMMARY: boolean;
  LOG_FOUNDATION_ASCII: boolean;
  LOG_LANDMASS_ASCII: boolean;
  LOG_RELIEF_ASCII: boolean;
  LOG_RAINFALL_ASCII: boolean;
  LOG_RAINFALL_SUMMARY: boolean;
  LOG_BIOME_ASCII: boolean;
  LOG_BIOME_SUMMARY: boolean;
  LOG_STORY_TAGS: boolean;
  FOUNDATION_HISTOGRAMS: boolean;
}

export const DEV: DevFlags = {
  ENABLED: false,
  LOG_TIMING: false,
  // ... all false by default
};

export function initDevFlags(config?: Partial<DevFlags>): void {
  if (!config) return;
  Object.assign(DEV, config);
}
```

### Timing Utilities

```typescript
// dev/timing.ts
export function timeSection<T>(label: string, fn: () => T): T {
  if (!DEV.ENABLED || !DEV.LOG_TIMING) return fn();
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    console.log(`[DEV][time] ${label}: ${(performance.now() - t0).toFixed(2)} ms`);
  }
}
```

### ASCII Grid Renderer

```typescript
// dev/ascii.ts
export interface AsciiConfig {
  width: number;
  height: number;
  sampleStep?: number;
  cellFn: (x: number, y: number) => { base: string; overlay?: string };
}

export function renderAsciiGrid(config: AsciiConfig): string[] {
  const step = config.sampleStep ?? computeAutoStep(config.width, config.height);
  const rows: string[] = [];
  for (let y = 0; y < config.height; y += step) {
    let row = "";
    for (let x = 0; x < config.width; x += step) {
      const cell = config.cellFn(x, y);
      row += cell.overlay ?? cell.base;
    }
    rows.push(row);
  }
  return rows;
}
```

### Quick Navigation

- [TL;DR](#tldr)
- [Problem](#problem)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
