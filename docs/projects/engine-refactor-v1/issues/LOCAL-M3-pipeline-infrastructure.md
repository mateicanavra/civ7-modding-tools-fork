---
id: LOCAL-M3-PIPELINE
title: "[M3] Core Pipeline Infrastructure (MapGenStep, Registry, Executor)"
state: planned
priority: 1
estimate: 3
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Architecture, Pipeline]
parent: null
children: [LOCAL-M3-CONTEXT-ARTIFACTS, LOCAL-M3-FOUNDATION-PILOT]
blocked_by: [CIV-36]
blocked: [LOCAL-M3-CONFIG-INTEGRATION, LOCAL-M3-LEGACY-WRAPPERS, LOCAL-M3-STORY-SYSTEM]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Establish the Task Graph foundation: `MapGenStep` interface, `StepRegistry`, and `PipelineExecutor` with fail-fast dependency validation.

## Context

**System area:** `mapgen-core` orchestration layer (`core/pipeline.ts`, `MapOrchestrator.ts`)

**Change:** Introduces a plugin architecture where generation stages become self-describing steps with explicit input/output contracts (`requires`/`provides`). Currently, `MapOrchestrator` calls layers directly in hard-coded order with implicit data flow through globals and context mutation.

**Outcome:** Steps can be composed, reordered, and validated at runtime. Enables incremental migration of legacy stages, unlocks future features like step-level caching and parallel execution, and provides clear boundaries for testing.

## Deliverables

- [ ] **Pipeline primitives module** — `MapGenStep` interface, `StepRegistry`, `PipelineExecutor` in `core/pipeline.ts`
- [ ] **Fail-fast validation** — `MissingDependencyError` when requires not satisfied
- [ ] **Unit tests** — Registry and Executor coverage

## Acceptance Criteria

- [ ] Steps can be registered, retrieved by ID/phase, and executed in order
- [ ] Missing dependency throws actionable error before step runs
- [ ] Build and tests pass

## Testing / Verification

```bash
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core run check-types
```

- Create dummy step in test file, verify registration and retrieval
- Test executor with mock steps that have dependencies
- Verify fail-fast behavior when required artifact is missing

## Dependencies / Notes

- **Blocked by:** [CIV-36](CIV-36-story-parity.md) (M2 must complete first)
- **Blocks:** [LOCAL-M3-CONFIG-INTEGRATION](LOCAL-M3-config-integration.md), [LOCAL-M3-LEGACY-WRAPPERS](LOCAL-M3-legacy-wrappers.md), [LOCAL-M3-STORY-SYSTEM](LOCAL-M3-story-system.md)
- **Reference:** [PRD-pipeline-refactor.md](../resources/PRD-pipeline-refactor.md) §3–4
- **Reference:** [architecture.md](../../../system/libs/mapgen/architecture.md) §MapGenStep

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Code Location

```
packages/mapgen-core/src/core/pipeline.ts  (new file)
├── MapGenStep interface
├── StepConfig type
├── StepResult type
├── StepRegistry class
├── PipelineExecutor class
└── MissingDependencyError class

packages/mapgen-core/src/core/index.ts (update exports)
```

### MapGenStep Interface Design

```typescript
export interface MapGenStep<TConfig = unknown> {
  /** Unique step identifier (e.g., 'core.foundation.plates') */
  readonly id: string;

  /** Pipeline phase (e.g., 'foundation', 'morphology', 'hydrology') */
  readonly phase: PipelinePhase;

  /** Artifact keys this step requires from context */
  readonly requires: readonly string[];

  /** Artifact keys this step will produce */
  readonly provides: readonly string[];

  /** Optional step-specific configuration */
  readonly config?: TConfig;

  /** Determine if step should run given current context */
  shouldRun(ctx: MapGenContext): boolean;

  /** Execute the step, mutating context.artifacts */
  run(ctx: MapGenContext): void | Promise<void>;
}

export type PipelinePhase =
  | 'setup'
  | 'foundation'
  | 'morphology'
  | 'hydrology'
  | 'ecology'
  | 'placement';
```

### PipelineRecipe Format

```typescript
export interface PipelineRecipe {
  /** Ordered list of step configurations */
  steps: Array<{
    step: string;  // Step ID from registry
    config?: Record<string, unknown>;  // Per-step overrides
    enabled?: boolean;  // Default true
  }>;
}
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
