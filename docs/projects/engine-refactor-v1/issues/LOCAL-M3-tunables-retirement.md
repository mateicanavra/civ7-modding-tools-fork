---
id: LOCAL-M3-TUNABLES-RETIREMENT
title: "[M3] Tunables Retirement"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Config, Cleanup]
parent: LOCAL-M3-CONFIG-EVOLUTION
children: []
blocked_by: [LOCAL-M3-CONFIG-EVOLUTION]
blocked: []
related_to: [CIV-31]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove `FOUNDATION_CFG`/`CLIMATE_CFG` facades, reduce tunables.ts to minimal shim.

## Context

**System area:** `mapgen-core` bootstrap layer (`bootstrap/tunables.ts`)

**Change:** Deletes the ~400 LOC tunables module that exposes config as global constants. Retains only `stageEnabled()` and `STAGE_ORDER` for orchestrator compatibility. All config reads now go through `context.config`.

**Outcome:** Eliminates a major source of hidden coupling. Config injection becomes the only path. Simplifies testing and enables running multiple map generations with different configs in the same process.

## Deliverables

- [ ] **Facade removal** — Delete FOUNDATION_CFG, CLIMATE_CFG exports
- [ ] **Minimal shim** — tunables.ts < 100 LOC (keep only STAGE_MANIFEST, stageEnabled)
- [ ] **CHANGELOG entry** — Document breaking change and migration

## Acceptance Criteria

- [ ] No facade imports in layer code
- [ ] Build and tests pass
- [ ] Breaking change documented

## Testing / Verification

```bash
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core run check-types
# Grep for any remaining FOUNDATION_CFG/CLIMATE_CFG imports
grep -r "FOUNDATION_CFG\|CLIMATE_CFG" packages/mapgen-core/src/layers/
```

- Verify grep returns no results in layer files
- Run full test suite
- Manual test full map generation

## Dependencies / Notes

- **Blocked by:** [LOCAL-M3-CONFIG-EVOLUTION](LOCAL-M3-config-evolution.md)
- **Related to:** [CIV-31](CIV-31-config-tunables.md)
- **Reference:** [PRD-config-refactor.md](../resources/PRD-config-refactor.md) §6.2
- **Breaking change:** Facade exports removed

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Before (current tunables.ts ~400 LOC)

```typescript
// Exports many facades
export const FOUNDATION_CFG = { ... };
export const CLIMATE_CFG = { ... };
export const FOUNDATION_PLATES = { ... };
export const FOUNDATION_DYNAMICS = { ... };
export const FOUNDATION_DIRECTIONALITY = { ... };
export function stageEnabled(stage: string): boolean { ... }
export const STAGE_MANIFEST = { ... };
// ...many more
```

### After (minimal shim ~50 LOC)

```typescript
import { MapGenConfig } from '../config/schema';

let boundConfig: MapGenConfig | null = null;

export function bindConfig(config: MapGenConfig): void {
  boundConfig = config;
}

export function stageEnabled(stage: string): boolean {
  if (!boundConfig) return true;
  return boundConfig.stageConfig?.[stage] !== false;
}

export const STAGE_ORDER = [
  'foundation', 'landmassPlates', 'coastlines',
  // ... canonical stage order
] as const;

// DEPRECATED - remove in next major
/** @deprecated Use context.config instead */
export function getLegacyFoundationCfg(): unknown {
  console.warn('[Deprecated] FOUNDATION_CFG - use context.config');
  return boundConfig?.foundation ?? {};
}
```

### Migration Checklist

- [ ] `layers/climate-engine.ts` - migrated
- [ ] `layers/mountains.ts` - migrated
- [ ] `layers/volcanoes.ts` - migrated
- [ ] `layers/biomes.ts` - migrated
- [ ] `layers/features.ts` - migrated
- [ ] `layers/landmass-plate.ts` - migrated
- [ ] `layers/landmass-utils.ts` - migrated
- [ ] `layers/coastlines.ts` - migrated
- [ ] `layers/islands.ts` - migrated
- [ ] `layers/placement.ts` - migrated
- [ ] `world/model.ts` - uses config provider (keep)
- [ ] `MapOrchestrator.ts` - special case (review)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
