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
