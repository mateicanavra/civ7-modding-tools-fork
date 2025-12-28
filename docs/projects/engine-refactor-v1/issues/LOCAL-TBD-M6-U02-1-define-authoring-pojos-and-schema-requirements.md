---
id: LOCAL-TBD-M6-U02-1
title: "[M6] Define authoring POJOs and schema requirements"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: LOCAL-TBD-M6-U02
children: []
blocked_by: [LOCAL-TBD-M6-U01]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Define the authored step, stage, and recipe module shapes with required schemas and tag definitions.

## Deliverables
- Minimal `StepModule`, `StageModule`, and `RecipeModule` POJOs defined in the authoring SDK.
- Per-step schema requirement enforced (empty schema allowed but explicit).
- `createRecipe` signature requires `tagDefinitions` (may be empty).

## Acceptance Criteria
- Authoring module types are POJO-first and default-exportable.
- `createStep`/`createStage` reject missing schema definitions.
- `createRecipe({ tagDefinitions })` is required in type signatures and runtime guards.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`

## Dependencies / Notes
- Parent: [LOCAL-TBD-M6-U02](./LOCAL-TBD-M6-U02-ship-authoring-sdk-v1-factories.md)
- Blocked by: [LOCAL-TBD-M6-U01](./LOCAL-TBD-M6-U01-promote-runtime-pipeline-as-engine-sdk-surface.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Define minimal authored `StepModule`, `StageModule`, and `RecipeModule` POJOs per the SPIKE.
- Ensure steps, stages, and recipes remain default-exportable and registry-agnostic.
- Require explicit config schemas on steps (empty schema is acceptable, but must be declared).
- Require `createRecipe({ tagDefinitions })` with an always-present array.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Prompts (run before implementation)

#### P1) Engine contract audit: config schema + recipe config semantics
- **Goal:** Align authoring types with the engine runtime contract (especially around config schema enforcement and per-occurrence config handling).
- **Commands:**
  - `sed -n '1,260p' packages/mapgen-core/src/pipeline/types.ts`
  - `sed -n '1,220p' packages/mapgen-core/src/pipeline/execution-plan.ts`
  - `rg -n "configSchema\\?" packages/mapgen-core/src -S`
- **Output to capture:**
  - Whether engine `MapGenStep.configSchema` is currently optional and how defaults are applied.
  - A list of existing step definitions (in base pipeline) that omit `configSchema` today.
  - A recommended enforcement mechanism:
    - authoring-only (authoring rejects missing schema but engine keeps optional), or
    - tighten engine contract too (make `configSchema` required everywhere).

#### P2) `instanceId` semantics audit (multi-occurrence steps)
- **Goal:** Confirm how `RecipeStepV1.instanceId` flows into `ExecutionPlan.nodeId` and how uniqueness is enforced.
- **Commands:**
  - `rg -n "instanceId" packages/mapgen-core/src/pipeline -S`
- **Output to capture:**
  - The exact behavior of `compileExecutionPlan` for `instanceId` and collisions.
  - Recommended authoring type surface (`Step.instanceId?` vs “recipe occurrence only”).

### Prework Findings (Pending)
_TODO (agent): append findings here and include any decisions that must be surfaced to `docs/projects/engine-refactor-v1/triage.md` if they affect multiple units._
