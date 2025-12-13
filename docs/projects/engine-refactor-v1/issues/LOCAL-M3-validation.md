---
id: LOCAL-M3-VALIDATION
title: "[M3] Pipeline Dependency Validation"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Architecture, Quality]
parent: null
children: []
blocked_by: [LOCAL-M3-DATA-PRODUCTS]
blocked: []
related_to: [CIV-23]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Implement runtime enforcement of `requires`/`provides` contracts in `PipelineExecutor` and `StageManifest`. Ensure steps fail fast with actionable errors when dependencies are missing, and add dev-mode dependency graph visualization.

## Deliverables

- [ ] **Requires validation in PipelineExecutor**
  - Before each step: validate all `requires` keys present in artifacts
  - `MissingDependencyError` with step ID, missing key, and suggestion
  - Validate at runtime, not just static analysis
- [ ] **Provides validation in PipelineExecutor**
  - After each step: validate all `provides` keys are now in artifacts
  - Warning (not error) if step claims to provide but doesn't
  - Track which step produced each artifact for debugging
- [ ] **Cycle detection**
  - Detect circular dependencies in recipe
  - Error before execution if cycle found
- [ ] **StageManifest integration**
  - `stageManifest.stages[].requires` actually enforced
  - `stageManifest.stages[].provides` tracked
  - Deprecation warnings for unused provides
- [ ] **Dev-mode dependency graph**
  - ASCII visualization of step dependencies
  - Optional JSON export for tooling
  - Enabled via `diagnostics.logDependencyGraph`

## Acceptance Criteria

- [ ] Missing requires throws `MissingDependencyError` with actionable message
- [ ] Unprovided provides logs warning (not error)
- [ ] Circular dependencies detected and reported before execution
- [ ] Dependency graph visualization works in dev mode
- [ ] All existing tests pass
- [ ] Performance impact negligible (< 1ms overhead)

## Testing / Verification

```bash
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core run check-types
```

- Unit test: step with missing requirement fails fast
- Unit test: cycle detection catches simple cycle
- Unit test: provides tracking records producer step
- Integration test: full pipeline with validation enabled

## Dependencies / Notes

- **Blocked by:** [LOCAL-M3-DATA-PRODUCTS](LOCAL-M3-data-products.md)
- **Related to:** [CIV-23](CIV-23-integration-tests.md)
- **Reference:** [PRD-pipeline-refactor.md](../resources/PRD-pipeline-refactor.md) §4.2
- **Note:** May defer some validation to M4 if scope is tight

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### MissingDependencyError

```typescript
export class MissingDependencyError extends Error {
  constructor(
    public readonly stepId: string,
    public readonly missingKey: string,
    public readonly availableKeys: string[]
  ) {
    const available = availableKeys.length > 0
      ? `Available: ${availableKeys.join(', ')}`
      : 'No artifacts available yet';
    super(
      `Step '${stepId}' requires '${missingKey}' but it was not provided. ${available}`
    );
    this.name = 'MissingDependencyError';
  }
}
```

### Validation in Executor

```typescript
class PipelineExecutor {
  private artifacts = new Map<string, { value: unknown; producedBy: string }>();

  async runStep(step: MapGenStep, ctx: MapGenContext): Promise<void> {
    // Validate requires
    for (const key of step.requires) {
      if (!this.artifacts.has(key)) {
        throw new MissingDependencyError(
          step.id,
          key,
          Array.from(this.artifacts.keys())
        );
      }
    }

    // Run step
    await step.run(ctx);

    // Validate provides
    for (const key of step.provides) {
      if (!ctx.artifacts?.[key]) {
        console.warn(`[Pipeline] Step '${step.id}' claims to provide '${key}' but didn't`);
      } else {
        this.artifacts.set(key, { value: ctx.artifacts[key], producedBy: step.id });
      }
    }
  }
}
```

### Dependency Graph Visualization

```
[Pipeline Dependency Graph]
┌─────────────────┐
│ core.foundation │ provides: foundation, heightfield
└────────┬────────┘
         ↓
┌─────────────────┐
│ legacy.morphology│ requires: foundation
└────────┬────────┘   provides: heightfield, shoreMask
         ↓
┌─────────────────┐
│ legacy.hydrology│ requires: foundation, heightfield
└────────┬────────┘   provides: hydrology, riverFlow
         ↓
        ...
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
