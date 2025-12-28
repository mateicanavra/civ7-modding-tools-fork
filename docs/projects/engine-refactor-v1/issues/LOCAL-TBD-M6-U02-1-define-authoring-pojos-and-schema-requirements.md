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
- Add focused authoring tests:
  - `createStep` rejects missing `configSchema` and accepts explicit empty schema.
  - `createRecipe` rejects missing `tagDefinitions` and rejects duplicate `instanceId` within a recipe.

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

### Prework Findings
#### P1) Engine contract audit: config schema + recipe config semantics
- `MapGenStep.configSchema` is optional today (`packages/mapgen-core/src/pipeline/types.ts`).
- `compileExecutionPlan` behavior when schema is missing:
  - `buildNodeConfig` returns `config: recipeStep.config ?? {}` with no validation (`packages/mapgen-core/src/pipeline/execution-plan.ts`).
  - When schema is present, it normalizes defaults + rejects unknown keys (`normalizeStepConfig`).
- Base pipeline step definitions with explicit `configSchema` today (including `EmptyStepConfigSchema` for no-config steps):
  - Foundation: `FoundationStep`, `LandmassStep`, `CoastlinesStep`, `RuggedCoastsStep`, `IslandsStep`, `MountainsStep`, `VolcanoesStep`
  - Narrative: `StorySeedStep`, `StoryHotspotsStep`, `StoryRiftsStep`, `StoryOrogenyStep`, `StoryCorridorsStep` (pre/post), `StorySwatchesStep`
  - Hydrology: `ClimateBaselineStep`, `RiversStep`, `LakesStep`, `ClimateRefineStep`
  - Ecology/Placement: `BiomesStep`, `FeaturesStep`, `DerivePlacementInputsStep`, `PlacementStep`
- Net: base pipeline already carries explicit config schemas, so authoring enforcement aligns with current base step practice.
- Recommendation: enforce schema presence in authoring (`createStep` requires `configSchema`, allow `EmptyStepConfigSchema`), but keep engine runtime optional for backward compatibility until all base steps are updated.

#### P2) `instanceId` semantics audit (multi-occurrence steps)
- `compileExecutionPlan` uses `instanceId ?? step.id` to set `nodeId` (`packages/mapgen-core/src/pipeline/execution-plan.ts`).
- No uniqueness check exists for `nodeId` collisions; duplicates are allowed and later steps may overwrite trace labels.
- Recommended authoring surface: keep `instanceId` as a recipe occurrence field only (not on `StepModule`), and add authoring-time validation that recipe `instanceId` values are unique.

## Implementation Decisions

### Enforce schemas in authoring, not engine runtime (for now)
- **Context:** Engine runtime accepts missing `configSchema` and bypasses validation; authoring wants to guarantee explicit schemas for clarity.
- **Options:** (A) require schemas only in authoring, (B) tighten engine contract to require schemas everywhere.
- **Choice:** Option A — authoring requires `configSchema`; engine runtime remains permissive until base steps are updated.
- **Rationale:** Avoids breaking engine-only call sites while still enforcing authoring correctness.
- **Risk:** Engine-only code paths can still bypass schema enforcement if they avoid authoring APIs.

### Keep `instanceId` recipe-only and validate uniqueness
- **Context:** `instanceId` is only defined in recipe steps; engine does not check collisions.
- **Options:** (A) expose `instanceId` on `StepModule`, (B) keep it recipe-only and validate in authoring.
- **Choice:** Option B — keep it recipe-only and enforce uniqueness in authoring.
- **Rationale:** `instanceId` describes recipe occurrence, not the step definition, and validation belongs at authoring time.
- **Risk:** Existing engine-only call sites could still emit duplicate `instanceId` values.
