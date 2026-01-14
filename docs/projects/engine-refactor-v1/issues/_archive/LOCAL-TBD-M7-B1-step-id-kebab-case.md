---
id: LOCAL-TBD-M7-B1
title: "[M7] Step id convention: kebab-case enforced"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: LOCAL-TBD-M7-B
children: []
blocked_by: []
blocked:
  - LOCAL-TBD-M7-C2
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Step IDs become user-facing: they appear in compiler errors, config objects, and file layout. The spec pins kebab-case for readability and consistent config keys. This unit makes that a **hard rule** at authoring time.

## Deliverables

- Enforce kebab-case at step contract creation time (throw on violation).
- Rename existing non-kebab step ids in mods/recipes and update all references.

## Acceptance Criteria

- [x] `defineStep(...)` throws on non-kebab step IDs with a message that includes the invalid id.
- [x] `createStage(...)` throws if any child step id is non-kebab, including stage id + step id in the error message.
- [x] All step IDs in `mods/mod-swooper-maps/src/recipes/**` are kebab-case and all call sites are updated accordingly.

## Scope Boundaries

**In scope:**
- Enforcing kebab-case IDs at the authoring factory boundary.
- Renaming existing non-kebab step ids in the standard recipe (and updating references).

**Out of scope:**
- Renaming stage IDs (already kebab-case in standard recipe).
- Renaming other `"id"` fields that are not step IDs (e.g., Civ7 modifier IDs).

## Prework Findings (Complete)

### 1) Current non-kebab step IDs (standard recipe)

These step contract IDs contain uppercase letters today and must be migrated:
- `storyCorridorsPost`
- `climateRefine`
- `storySwatches`
- `derivePlacementInputs`
- `landmassPlates`
- `storyHotspots`
- `storySeed`
- `storyCorridorsPre`
- `storyRifts`
- `storyOrogeny`
- `climateBaseline`
- `ruggedCoasts`
- `plotEffects`

### 2) Known non-mod touchpoints (will break until updated)
- `packages/mapgen-core/test/pipeline/placement-gating.test.ts` references `derivePlacementInputs`.

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`
- `rg -n 'id: "[^"]*[A-Z][^"]*"' mods/mod-swooper-maps/src/recipes` (expect zero hits)

## Dependencies / Notes

- **Blocks:** [LOCAL-TBD-M7-C2](./LOCAL-TBD-M7-C2-stage-step-config-shape.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `docs/projects/engine-refactor-v1/resources/spec/recipe-compile`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/packages/mapgen-core/src/authoring/step/contract.ts` | Add kebab-case assertion in defineStep. |
| `/packages/mapgen-core/src/authoring/stage.ts` | Add kebab-case assertion for stage.steps[*].id (include stage id in error). |
| `/mods/mod-swooper-maps/src/recipes/standard/stages/**/steps/**/*.contract.ts` | Rename non-kebab step contract ids; update any stage composition and test string references. |
| `/packages/mapgen-core/test/pipeline/placement-gating.test.ts` | Update hard-coded step id strings to kebab-case after migration. |

### Paper Trail

- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/04-type-surfaces.md` (step id enforcement)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/05-file-reconciliation.md` (ordering + kebab-case callout)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Prework Findings (Complete)](#prework-findings-complete)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
