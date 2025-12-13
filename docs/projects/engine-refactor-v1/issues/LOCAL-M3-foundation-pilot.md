---
id: LOCAL-M3-FOUNDATION-PILOT
title: "[M3] Foundation Pipeline Pilot"
state: planned
priority: 1
estimate: 3
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Architecture, Pipeline]
parent: LOCAL-M3-PIPELINE
children: []
blocked_by: [LOCAL-M3-CONTEXT-ARTIFACTS]
blocked: [LOCAL-M3-LEGACY-WRAPPERS]
related_to: [CIV-37]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Implement Foundation as the first concrete Task Graph pilot: wrap existing `WorldModel` and plate generation as a `FoundationStep`, register it in the `StepRegistry`, and integrate the `PipelineExecutor` into `MapOrchestrator` for the foundation phase.

## Deliverables

- [ ] **`FoundationStep` implementation** (`packages/mapgen-core/src/steps/foundation/`)
  - Implements `MapGenStep` interface
  - Wraps existing `WorldModel` + plate generation logic
  - `requires: []` (no prior artifacts)
  - `provides: ['foundation', 'heightfield']`
  - Reads config from `context.config.foundation`
- [ ] **Step registration**
  - Register `FoundationStep` in global `StepRegistry`
  - ID: `'core.foundation'`
- [ ] **Orchestrator integration**
  - `MapOrchestrator` calls `PipelineExecutor` for foundation phase
  - Sync artifacts to legacy `WorldModel` for downstream stages
  - Preserve backward compatibility with existing flow
- [ ] **Legacy bridge**
  - After pipeline runs, sync `context.artifacts.foundation` to `WorldModel` singleton
  - Downstream legacy stages continue to work unmodified
- [ ] **Smoke test** for foundation via pipeline

## Acceptance Criteria

- [ ] `FoundationStep` runs via `PipelineExecutor`
- [ ] `FoundationContext` produced and available in `context.artifacts`
- [ ] Existing orchestrator tests pass (backward compatibility)
- [ ] Legacy downstream stages (landmass, mountains, etc.) still receive data
- [ ] Foundation diagnostics work as before
- [ ] Build passes, smoke test passes

## Testing / Verification

```bash
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core run check-types
```

- Run existing smoke test to verify backward compatibility
- Add specific test that foundation runs via executor
- Verify `context.artifacts.foundation` is populated after step

## Dependencies / Notes

- **Blocked by:** [LOCAL-M3-CONTEXT-ARTIFACTS](LOCAL-M3-context-artifacts.md)
- **Blocks:** [LOCAL-M3-LEGACY-WRAPPERS](LOCAL-M3-legacy-wrappers.md)
- **Related to:** [CIV-37](CIV-37-worldmodel-mountains-wiring.md) (WorldModel wiring)
- **Reference:** [PRD-plate-generation.md](../resources/PRD-plate-generation.md)
- **Reference:** [PRD-pipeline-refactor.md](../resources/PRD-pipeline-refactor.md) §5.2 (Foundation Migration)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Code Location

```
packages/mapgen-core/src/steps/foundation/
├── index.ts (FoundationStep class)
└── registration.ts (registry setup)

packages/mapgen-core/src/MapOrchestrator.ts (modify)
├── Import PipelineExecutor
├── Call executor for foundation phase
└── Sync artifacts to WorldModel
```

### FoundationStep Skeleton

```typescript
import { MapGenStep, PipelinePhase } from '../../core/pipeline';
import { MapGenContext } from '../../core/types';

export class FoundationStep implements MapGenStep {
  readonly id = 'core.foundation';
  readonly phase: PipelinePhase = 'foundation';
  readonly requires = [] as const;
  readonly provides = ['foundation', 'heightfield'] as const;

  shouldRun(ctx: MapGenContext): boolean {
    return ctx.stageEnabled?.('foundation') ?? true;
  }

  async run(ctx: MapGenContext): Promise<void> {
    // 1. Initialize WorldModel with config
    // 2. Run plate generation
    // 3. Build FoundationContext
    // 4. Store in ctx.artifacts.foundation
    // 5. Initialize heightfield buffer
  }
}
```

### Orchestrator Integration Pattern

```typescript
// In MapOrchestrator.generateMap()

// Run foundation via pipeline
const foundationRecipe = { steps: [{ step: 'core.foundation' }] };
await this.executor.run(this.context, foundationRecipe);

// Sync to legacy WorldModel for downstream
this.syncFoundationToLegacy(this.context.artifacts.foundation);

// Continue with legacy stages...
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
