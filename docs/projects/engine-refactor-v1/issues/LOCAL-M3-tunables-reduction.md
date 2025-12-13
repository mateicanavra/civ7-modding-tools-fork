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

Audit tunables consumers and migrate high-priority layers to `context.config`.

## Context

**System area:** `mapgen-core` layer implementations (`layers/*.ts`, `bootstrap/tunables.ts`)

**Change:** Migrates ~10 layer files from importing `FOUNDATION_CFG`/`CLIMATE_CFG` globals to reading `context.config`. The tunables module shrinks as consumers move off its facades.

**Outcome:** Layers become pure functions of context, enabling isolated testing and step-based execution. Removes hidden coupling between layers and bootstrap globals. Required before tunables retirement.

## Deliverables

- [ ] **Consumer audit** — Categorized list of all tunables imports
- [ ] **High-priority migration** — climate-engine, mountains, volcanoes, biomes off tunables
- [ ] **Deprecation markers** — Legacy facades marked for removal

## Acceptance Criteria

- [ ] Major layers read from context.config
- [ ] Tests pass after migration
- [ ] Migration plan for remaining consumers documented

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
