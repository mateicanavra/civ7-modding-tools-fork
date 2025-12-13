---
id: LOCAL-M3-LEGACY-WRAPPERS
title: "[M3] Legacy Wrapper Steps (Morphology, Hydrology, Climate, Biomes, Placement)"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Architecture, Pipeline]
parent: null
children: []
blocked_by: [LOCAL-M3-FOUNDATION-PILOT]
blocked: [LOCAL-M3-DATA-PRODUCTS]
related_to: [CIV-19, CIV-20]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Wrap remaining legacy phases as `MapGenStep`s for full Task Graph orchestration ("wrapper only" — internals unchanged).

## Context

**System area:** `mapgen-core` orchestration layer (`MapOrchestrator.ts`, new `steps/legacy/*.ts`)

**Change:** Wraps existing layer call sequences (landmass→coastlines→islands→mountains→volcanoes, etc.) as `MapGenStep` implementations. Each wrapper declares its `requires`/`provides` and delegates to existing functions. Orchestrator switches from direct calls to `PipelineExecutor`.

**Outcome:** Full map generation runs through the Task Graph. Step boundaries become explicit. Enables per-step diagnostics, future parallelization, and incremental internal refactoring without orchestrator changes.

## Deliverables

- [ ] **5 legacy wrapper steps** — Morphology, Hydrology, Climate, Biomes, Placement
- [ ] **Orchestrator migration** — Full map generation via `PipelineExecutor`
- [ ] **Integration test** — End-to-end pipeline produces valid map

## Acceptance Criteria

- [ ] All phases run as steps with declared `requires`/`provides`
- [ ] Existing behavior preserved
- [ ] Build and tests pass

## Testing / Verification

```bash
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core run check-types
```

- Smoke test: full map generation via pipeline
- Verify each step produces expected artifacts
- Compare output with pre-pipeline generation

## Dependencies / Notes

- **Blocked by:** [LOCAL-M3-FOUNDATION-PILOT](LOCAL-M3-foundation-pilot.md)
- **Blocks:** [LOCAL-M3-DATA-PRODUCTS](LOCAL-M3-data-products.md)
- **Related to:** [CIV-19](issues/_archive/CIV-19-biomes-features-adapter.md), [CIV-20](issues/_archive/CIV-20-placement-adapter.md)
- **Reference:** [PRD-pipeline-refactor.md](../resources/PRD-pipeline-refactor.md) §5.3 (Legacy Wrapper)
- **Note:** This is "wrapper only" — internal refactors are deferred

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Code Structure

```
packages/mapgen-core/src/steps/
├── foundation/
│   └── index.ts (FoundationStep)
├── legacy/
│   ├── morphology.ts (LegacyMorphologyStep)
│   ├── hydrology.ts (LegacyHydrologyStep)
│   ├── climate.ts (LegacyClimateStep)
│   ├── biomes.ts (LegacyBiomesStep)
│   └── placement.ts (LegacyPlacementStep)
├── story/
│   └── (story steps from LOCAL-M3-STORY-SYSTEM)
└── index.ts (registry setup)
```

### Wrapper Step Template

```typescript
import { MapGenStep, PipelinePhase } from '../../core/pipeline';
import { MapGenContext } from '../../core/types';

export class LegacyMorphologyStep implements MapGenStep {
  readonly id = 'legacy.morphology';
  readonly phase: PipelinePhase = 'morphology';
  readonly requires = ['foundation'] as const;
  readonly provides = ['heightfield', 'shoreMask'] as const;

  shouldRun(ctx: MapGenContext): boolean {
    return ctx.stageEnabled?.('landmassPlates') ?? true;
  }

  async run(ctx: MapGenContext): Promise<void> {
    // Call existing layer functions in order
    // 1. Landmass generation
    // 2. Coastlines
    // 3. Islands
    // 4. Mountains
    // 5. Volcanoes
    // 6. Publish heightfield to artifacts
  }
}
```

### Orchestrator Pipeline Recipe

```typescript
const fullPipeline: PipelineRecipe = {
  steps: [
    { step: 'core.foundation' },
    { step: 'legacy.morphology' },
    { step: 'story.hotspots' },
    { step: 'story.rifts' },
    { step: 'story.corridors.pre' },
    { step: 'legacy.hydrology' },
    { step: 'story.corridors.post' },
    { step: 'legacy.climate' },
    { step: 'story.swatches' },
    { step: 'legacy.biomes' },
    { step: 'legacy.placement' },
  ],
};
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
