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

Retire `bootstrap/tunables.ts` facades (`FOUNDATION_CFG`, `CLIMATE_CFG`) once all consumers have migrated to `context.config`. Reduce tunables to minimal compatibility shim or delete entirely.

## Deliverables

- [ ] **Verify all consumers migrated**
  - Confirm no layer files import FOUNDATION_CFG
  - Confirm no layer files import CLIMATE_CFG
  - Confirm no external consumers depend on facades
- [ ] **Reduce tunables.ts to minimal shim**
  - Keep only: `STAGE_MANIFEST`, `stageEnabled()`
  - Remove: `FOUNDATION_CFG`, `CLIMATE_CFG` exports
  - Remove: `FOUNDATION_PLATES`, `FOUNDATION_DYNAMICS`, etc.
  - Target: < 100 LOC
- [ ] **Update or remove related exports**
  - `bootstrap/types.ts` - remove TunablesSnapshot if unused
  - `bootstrap/index.ts` - update exports
- [ ] **Add deprecation notices** for any remaining shims
- [ ] **Document changes in CHANGELOG**

## Acceptance Criteria

- [ ] No FOUNDATION_CFG/CLIMATE_CFG imports in layer code
- [ ] tunables.ts reduced to < 100 LOC
- [ ] All existing tests pass
- [ ] No external consumers broken (or documented breaking change)
- [ ] CHANGELOG updated with migration notes

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
