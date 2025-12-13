---
id: LOCAL-M3-TUNABLES-REDUCTION
title: "[M3] Tunables Consumer Audit & Migration"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Config, Cleanup]
parent: LOCAL-M3-CONFIG-INTEGRATION
children: []
blocked_by: [LOCAL-M3-CONFIG-INTEGRATION]
blocked: [LOCAL-M3-CONFIG-EVOLUTION]
related_to: [CIV-31]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Audit all consumers of `FOUNDATION_CFG`, `CLIMATE_CFG`, and other tunables facades, then migrate high-priority consumers to read from `context.config` directly. This prepares for tunables retirement in Phase D.

## Deliverables

- [ ] **Tunables consumer audit** (document in this issue)
  - List all files importing from `bootstrap/tunables.ts`
  - Categorize: can migrate / legacy-only / needs discussion
  - Identify any consumers that must stay for backward compat
- [ ] **Migrate high-priority consumers**
  - `layers/climate-engine.ts` (CLIMATE_CFG → context.config.climate)
  - `layers/mountains.ts` (FOUNDATION_CFG.mountains → context.config.mountains)
  - `layers/volcanoes.ts` (FOUNDATION_CFG.volcanoes → context.config.volcanoes)
  - `layers/biomes.ts` (FOUNDATION_CFG.biomes → context.config.biomes)
  - `layers/features.ts` (featuresDensity → context.config.featuresDensity)
- [ ] **Update tests** for migrated consumers
- [ ] **Mark legacy-only facades** with deprecation comments

## Acceptance Criteria

- [ ] Audit document complete with categorized consumer list
- [ ] High-priority layers no longer import FOUNDATION_CFG/CLIMATE_CFG
- [ ] All existing tests pass after migration
- [ ] Deprecation comments added to facade exports
- [ ] Migration plan documented for remaining consumers

## Testing / Verification

```bash
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core run check-types
# Verify no regressions in layer behavior
```

- Run full test suite after each layer migration
- Manual verification of map generation output

## Dependencies / Notes

- **Blocked by:** [LOCAL-M3-CONFIG-INTEGRATION](LOCAL-M3-config-integration.md)
- **Blocks:** [LOCAL-M3-CONFIG-EVOLUTION](LOCAL-M3-config-evolution.md)
- **Related to:** [CIV-31](CIV-31-config-tunables.md)
- **Reference:** [config-wiring-status.md](../resources/config-wiring-status.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Consumer Audit Template

| File | Imports | Can Migrate? | Notes |
|------|---------|--------------|-------|
| `layers/climate-engine.ts` | CLIMATE_CFG, FOUNDATION_DIRECTIONALITY | Yes | High priority |
| `layers/mountains.ts` | FOUNDATION_CFG | Yes | High priority |
| `layers/volcanoes.ts` | FOUNDATION_CFG | Yes | High priority |
| `layers/biomes.ts` | FOUNDATION_CFG | Yes | High priority |
| `layers/features.ts` | FOUNDATION_CFG | Yes | Medium priority |
| `layers/landmass-plate.ts` | FOUNDATION_CFG | Yes | Medium priority |
| `layers/coastlines.ts` | FOUNDATION_CFG | Yes | Medium priority |
| `layers/islands.ts` | FOUNDATION_CFG | Yes | Medium priority |
| `layers/placement.ts` | FOUNDATION_CFG | Yes | Medium priority |
| `world/model.ts` | Config provider pattern | Keep | Already uses injection |
| `MapOrchestrator.ts` | Various | Partial | Orchestrator special case |

### Migration Pattern

```typescript
// Before
import { FOUNDATION_CFG, CLIMATE_CFG } from '../bootstrap/tunables';

export function layerAddMountainsPhysics(ctx: ExtendedMapContext) {
  const { tectonicIntensity, mountainThreshold } = FOUNDATION_CFG.mountains;
  // ...
}

// After
export function layerAddMountainsPhysics(ctx: ExtendedMapContext) {
  const { tectonicIntensity, mountainThreshold } = ctx.config.mountains;
  // ...
}
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
