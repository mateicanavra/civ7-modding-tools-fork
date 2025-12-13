---
id: LOCAL-TBD-5
title: Integrate Foundation Pipeline into Orchestrator
state: planned
priority: 1
estimate: 0
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: [codex]
labels: [Improvement, Architecture]
parent: LOCAL-TBD
children: []
blocked_by: [LOCAL-TBD-4]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Wire it up (The "Brain"). Refactor the `MapOrchestrator` to use **Constructor Injection** for the Adapter, replace the hardcoded `computePlatesVoronoi` call with a `PipelineExecutor` loop, and implement the **Legacy Bridge** to sync `context.artifacts.tectonics` and `context.artifacts.crust` to the `WorldModel` singleton.

## Deliverables
- Refactored `MapOrchestrator.ts` that initializes the `StepRegistry` and executes the configured pipeline.
- `PipelineExecutor` class/function that runs steps in dependency order (Mesh -> Crust -> Partition -> Physics).
- **Legacy Bridge:** Logic to copy `context.artifacts.tectonics` (including `volcanism`, `cumulativeUplift`) and `context.artifacts.crust` into the `WorldModel` singleton after Foundation stage.
- Updated default configuration to include the new pipeline recipe.
- Removal (or deprecation) of legacy code in `plates.ts`.

## Acceptance Criteria
- [ ] `MapOrchestrator` uses Constructor Injection for its Adapter dependency.
- [ ] `MapOrchestrator` successfully runs the full Foundation stage without errors.
- [ ] Pipeline execution order respects step dependencies (via `requires`/`provides`).
- [ ] The resulting map contains valid plate data (verified via logs/ASCII).
- [ ] Legacy `computePlatesVoronoi` is no longer in the critical path.
- [ ] Downstream stages (Morphology, Biomes) continue to function by reading from the bridged `WorldModel`.
- [ ] `civ7 map generate` command works with the new architecture.

## Testing / Verification
- **Integration Test:** Run the full CLI generation command: `civ7 map generate --json`.
- **Output Verification:** Verify the output JSON contains the expected `foundation` structure.
- **Visual Inspection:** Inspect the generated ASCII map for plate shapes.
- **Downstream Compat:** Ensure biomes/rivers/mountains still work via the Legacy Bridge.

## Dependencies / Notes
- **Blocked by:** All previous sub-issues (LOCAL-TBD-1 through LOCAL-TBD-4, including LOCAL-TBD-2.5).
- This is the final step to make the refactor "live".
- **Reference:** [Architecture Spec](../../../system/libs/mapgen/architecture.md) for pipeline orchestration details.
- **PRD Note:** The Legacy Bridge is a temporary measure to avoid refactoring the entire Morphology layer in this PR.
- **New Tensors:** The bridge must now copy `volcanism`, `fracture`, and `cumulativeUplift` in addition to the original tensors.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Integration Checklist
1. **Constructor Injection:** Refactor `MapOrchestrator` to accept `Adapter` via constructor, not global/singleton.
2. **StepRegistry Init:** Initialize registry with all Foundation steps on startup (Mesh, Crust, Partition, Physics).
3. **Pipeline Config:** Load pipeline configuration from JSON config.
4. **PipelineExecutor:** Execute steps in dependency order (topological sort based on `requires`/`provides`).
5. **Context Flow:** Pass `MapGenContext` through the entire pipeline.
6. **Legacy Bridge:** After Foundation stage completes, copy tectonics and crust data to `WorldModel`.

### PipelineExecutor Pseudocode
```typescript
class PipelineExecutor {
  run(ctx: MapGenContext, stepIds: string[]): void {
    const sorted = this.topologicalSort(stepIds);
    for (const id of sorted) {
      const step = this.registry.get(id);
      if (step.shouldRun(ctx)) {
        step.run(ctx);
      }
    }
  }
}
```

### Legacy Bridge Implementation
```typescript
// After Foundation stage completes:
function bridgeToLegacy(ctx: MapGenContext, world: WorldModel): void {
  const { tectonics, crust } = ctx.artifacts;

  // Copy tectonic tensors to WorldModel arrays
  if (tectonics) {
    world.upliftPotential = Array.from(tectonics.upliftPotential);
    world.riftPotential = Array.from(tectonics.riftPotential);
    world.shearStress = Array.from(tectonics.shearStress);
    world.volcanism = Array.from(tectonics.volcanism);
    world.fracture = Array.from(tectonics.fracture);
    world.cumulativeUplift = Array.from(tectonics.cumulativeUplift);
  }

  // Copy crust data to WorldModel
  if (crust) {
    world.crustType = Array.from(crust.type);
    world.crustAge = Array.from(crust.age);
  }
}
```

### Constructor Injection Pattern
```typescript
// Before (bad - hidden dependency)
class MapOrchestrator {
  private adapter = GameEngineAdapter.getInstance();
}

// After (good - explicit dependency)
class MapOrchestrator {
  constructor(private adapter: IGameEngineAdapter) {}
}
```

### Migration Notes
- The `MapGenContext` should be backward-compatible with existing code.
- Legacy `computePlatesVoronoi` can be kept as a fallback during transition (disabled by default).
- Add feature flag: `config.useLegacyPlates: boolean` for emergency rollback.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
