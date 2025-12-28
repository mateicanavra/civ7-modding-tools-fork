---
id: LOCAL-TBD-M6-U01
title: "[M6] Promote runtime pipeline as engine SDK surface"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Move the runtime pipeline into `engine/**` and make it the canonical runtime SDK surface.

## Deliverables
- `packages/mapgen-core/src/engine/**` contains runtime modules and types.
- Public exports point at `engine/**` (no `pipeline/**` surface).
- Engine tests import from the engine SDK.

## Acceptance Criteria
- `StepRegistry`, `TagRegistry`, `compileExecutionPlan`, `PipelineExecutor`, and runtime errors/types/observability live under `engine/**`.
- `packages/mapgen-core/src/index.ts` exports the engine SDK without legacy pipeline re-exports.
- Engine tests pass while importing from `@swooper/mapgen-core/engine`.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`

## Dependencies / Notes
- No blocking dependencies.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Move/rename runtime modules from `pipeline/**` to `engine/**` (registry, executor, compiler, types, errors, observability).
- Update internal imports and the package export map to align with the new engine surface.
- Adjust engine tests to use the `engine/**` path.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Findings
#### P1) Runtime move surface + import manifest
- Pipeline move list (`packages/mapgen-core/src/pipeline/**`):
  - `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`
  - `packages/mapgen-core/src/pipeline/StepRegistry.ts`
  - `packages/mapgen-core/src/pipeline/errors.ts`
  - `packages/mapgen-core/src/pipeline/execution-plan.ts`
  - `packages/mapgen-core/src/pipeline/index.ts`
  - `packages/mapgen-core/src/pipeline/mod.ts`
  - `packages/mapgen-core/src/pipeline/observability.ts`
  - `packages/mapgen-core/src/pipeline/step-config.ts`
  - `packages/mapgen-core/src/pipeline/tags.ts`
  - `packages/mapgen-core/src/pipeline/types.ts`
- Import sites outside pipeline (grouped by package):
  - `packages/mapgen-core/src`:
    - `packages/mapgen-core/src/orchestrator/types.ts`
    - `packages/mapgen-core/src/orchestrator/task-graph.ts`
    - `packages/mapgen-core/src/base/tags.ts`
    - `packages/mapgen-core/src/base/library.ts`
    - `packages/mapgen-core/src/base/mod.ts`
    - `packages/mapgen-core/src/base/phases.ts`
    - `packages/mapgen-core/src/base/run-request.ts`
    - `packages/mapgen-core/src/base/recipes/default.ts`
    - `packages/mapgen-core/src/base/pipeline/ecology/index.ts`
    - `packages/mapgen-core/src/base/pipeline/foundation/index.ts`
    - `packages/mapgen-core/src/base/pipeline/hydrology/ClimateBaselineStep.ts`
    - `packages/mapgen-core/src/base/pipeline/hydrology/ClimateRefineStep.ts`
    - `packages/mapgen-core/src/base/pipeline/hydrology/LakesStep.ts`
    - `packages/mapgen-core/src/base/pipeline/hydrology/RiversStep.ts`
    - `packages/mapgen-core/src/base/pipeline/hydrology/index.ts`
    - `packages/mapgen-core/src/base/pipeline/morphology/LandmassStep.ts`
    - `packages/mapgen-core/src/base/pipeline/morphology/MountainsStep.ts`
    - `packages/mapgen-core/src/base/pipeline/morphology/VolcanoesStep.ts`
    - `packages/mapgen-core/src/base/pipeline/morphology/index.ts`
    - `packages/mapgen-core/src/base/pipeline/narrative/StoryCorridorsStep.ts`
    - `packages/mapgen-core/src/base/pipeline/narrative/StoryRiftsStep.ts`
    - `packages/mapgen-core/src/base/pipeline/narrative/StorySwatchesStep.ts`
    - `packages/mapgen-core/src/base/pipeline/narrative/index.ts`
    - `packages/mapgen-core/src/base/pipeline/placement/DerivePlacementInputsStep.ts`
    - `packages/mapgen-core/src/base/pipeline/placement/PlacementStep.ts`
    - `packages/mapgen-core/src/base/pipeline/placement/index.ts`
    - `packages/mapgen-core/src/index.ts`
  - `packages/mapgen-core/test`:
    - `packages/mapgen-core/test/orchestrator/generateMap.integration.test.ts`
    - `packages/mapgen-core/test/orchestrator/paleo-ordering.test.ts`
    - `packages/mapgen-core/test/pipeline/artifacts.test.ts`
    - `packages/mapgen-core/test/pipeline/execution-plan.test.ts`
    - `packages/mapgen-core/test/pipeline/hello-mod.smoke.test.ts`
    - `packages/mapgen-core/test/pipeline/placement-gating.test.ts`
    - `packages/mapgen-core/test/pipeline/standard-smoke.test.ts`
    - `packages/mapgen-core/test/pipeline/tag-registry.test.ts`
    - `packages/mapgen-core/test/pipeline/tracing.test.ts`
  - `mods/**`: no direct `@mapgen/pipeline` imports found (only `@swooper/mapgen-core`).

#### P2) Engine context coupling audit (must not leak into engine)
- Coupling points in `pipeline/**`:
  - `packages/mapgen-core/src/pipeline/types.ts`: `MapGenStep<TContext = ExtendedMapContext>` default.
  - `packages/mapgen-core/src/pipeline/tags.ts`: `DependencyTagDefinition.satisfies` signature uses `ExtendedMapContext`.
  - `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`: generic bound `TContext extends ExtendedMapContext` and uses `context.trace`.
- Recommended minimal engine-owned type strategy:
  - Add `engine/types.ts` with `export interface EngineContext { trace: TraceScope; }`.
  - Re-parameterize engine runtime types to `TContext extends EngineContext` (default `EngineContext`) and remove `@mapgen/core/types` from `engine/**`.
  - Keep `ExtendedMapContext` in `@mapgen/core/types` and use it only in base/domain layers that need concrete fields.

#### P3) Package export surface audit
- Current `package.json` exports include `"./pipeline"` but no `"./engine"`.
- `packages/mapgen-core/src/index.ts` re-exports `@mapgen/pipeline/index.js` directly.
- Diff plan:
  - Add `"./engine"` export in `packages/mapgen-core/package.json` pointing at `dist/engine/index.{js,d.ts}`.
  - Replace `export * from "@mapgen/pipeline/index.js";` with `export * from "@mapgen/engine/index.js";`.
  - Remove (or deprecate if a shim is required) the `"./pipeline"` export to enforce the engine surface.

## Implementation Decisions

### Define an engine-owned context boundary
- **Context:** Engine runtime currently imports `ExtendedMapContext` from `@mapgen/core/types`, coupling engine to core.
- **Options:** (A) Keep `ExtendedMapContext` in engine types, (B) introduce minimal `EngineContext` and make engine runtime generic over it.
- **Choice:** Option B — introduce `EngineContext` in `engine/types.ts` and make runtime generics extend it.
- **Rationale:** Keeps `engine/**` independent of core content while preserving flexibility for base/domain layers to use `ExtendedMapContext`.
- **Risk:** Requires updating generics and imports in engine runtime; missed updates could leave stray `@mapgen/core/types` imports.
