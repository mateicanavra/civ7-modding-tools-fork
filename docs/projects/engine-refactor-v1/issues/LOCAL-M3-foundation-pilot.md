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

Wrap existing foundation/plate generation as a `FoundationStep` and integrate `PipelineExecutor` into `MapOrchestrator` as the first pipeline pilot.

## Context

**System area:** `mapgen-core` foundation phase (`MapOrchestrator.ts`, `world/model.ts`, new `steps/foundation/`)

**Change:** Lifts the plate tectonics and foundation generation logic into the first `MapGenStep`. The orchestrator delegates to `PipelineExecutor` for this phase, then syncs artifacts back to `WorldModel` for downstream legacy stages.

**Outcome:** Proves the pipeline architecture end-to-end without breaking existing behavior. Establishes the pattern for wrapping remaining stages. Foundation data becomes available as a typed artifact for downstream steps.

## Deliverables

- [ ] **FoundationStep** — Wraps WorldModel + plates, declares `provides: ['foundation', 'heightfield']`
- [ ] **Orchestrator integration** — Run foundation via executor, sync to legacy WorldModel
- [ ] **Smoke test** — Foundation runs through pipeline, existing tests pass

## Acceptance Criteria

- [ ] Foundation produces `FoundationContext` via pipeline
- [ ] Legacy downstream stages unaffected
- [ ] Build and existing tests pass

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
