---
id: LOCAL-M3-CONFIG-INTEGRATION
title: "[M3] Config Integration Phase 2 (Context + Sub-schemas)"
state: planned
priority: 1
estimate: 3
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Config, Architecture]
parent: null
children: [LOCAL-M3-TUNABLES-REDUCTION]
blocked_by: [LOCAL-M3-PIPELINE]
blocked: [LOCAL-M3-CONFIG-EVOLUTION]
related_to: [CIV-26, CIV-31]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make validated `MapGenConfig` the single read path for all steps via `context.config`, and map domain-specific configs into canonical sub-schemas. This is Phase 2 of the config refactor PRD.

## Deliverables

- [ ] **Ensure `MapGenContext.config` is populated**
  - `config: MapGenConfig` as required field on context
  - Orchestrator populates at construction
  - Executor validates config presence before running steps
- [ ] **Step config consumption helper**
  - `getStepConfig<T>(ctx, 'groupName'): T` helper function
  - Type-safe access to config sub-groups
  - Document convention in architecture.md
- [ ] **Domain sub-schema mapping** (update `schema.ts`)
  - Foundation: `config.foundation.plates`, `config.foundation.dynamics`
  - Morphology: `config.mountains`, `config.volcanoes`, `config.landmass`
  - Climate: `config.climate.baseline`, `config.climate.refine`
  - Story: `config.story.hotspot`, `config.story.rifts`, `config.corridors`
  - Placement: `config.placement.starts`, `config.placement.floodplains`
- [ ] **Update major layers to read from context.config**
  - `climate-engine.ts` → `context.config.climate`
  - `mountains.ts` → `context.config.mountains`
  - `volcanoes.ts` → `context.config.volcanoes`
  - `biomes.ts` → `context.config.biomes`
- [ ] **Documentation updates**
  - Update architecture.md Config section
  - Update config-wiring-status.md

## Acceptance Criteria

- [ ] All contexts have validated `config` property
- [ ] `getStepConfig` helper works for all domain groups
- [ ] Major layers read config via context, not globals
- [ ] No new global config stores introduced
- [ ] Backward compatibility maintained (existing map scripts work)
- [ ] Build passes, existing tests pass

## Testing / Verification

```bash
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core run check-types
```

- Verify context.config is available in all steps
- Test getStepConfig helper with various config groups
- Run existing smoke tests for backward compatibility

## Dependencies / Notes

- **Blocked by:** [LOCAL-M3-PIPELINE](LOCAL-M3-pipeline-infrastructure.md) (need step interface)
- **Blocks:** [LOCAL-M3-CONFIG-EVOLUTION](LOCAL-M3-config-evolution.md)
- **Related to:** [CIV-26](CIV-26-config-hygiene-parent.md) (Phase 1 parent), [CIV-31](CIV-31-config-tunables.md)
- **Reference:** [PRD-config-refactor.md](../resources/PRD-config-refactor.md) Phase 2
- **Reference:** [config-wiring-status.md](../resources/config-wiring-status.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Code Locations

```
packages/mapgen-core/src/core/types.ts
├── MapGenContext.config: MapGenConfig (required)
└── getStepConfig helper

packages/mapgen-core/src/config/schema.ts
├── Update sub-schema structure as needed
└── Ensure all domain groups properly typed

packages/mapgen-core/src/layers/*.ts
├── Migrate from FOUNDATION_CFG/CLIMATE_CFG
└── Read from context.config.*
```

### Config Access Pattern

```typescript
// Before (tunables)
import { CLIMATE_CFG } from '../bootstrap/tunables';
const baseline = CLIMATE_CFG.baseline;

// After (context)
const climate = getStepConfig<ClimateConfig>(ctx, 'climate');
const baseline = climate.baseline;

// Or direct access
const baseline = ctx.config.climate.baseline;
```

### Migration Priority

1. `climate-engine.ts` (highest usage)
2. `mountains.ts` / `volcanoes.ts`
3. `biomes.ts` / `features.ts`
4. `placement.ts`
5. `landmass-plate.ts` / `coastlines.ts`

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
