---
id: LOCAL-TBD-M7-C1
title: "[M7] Introduce recipe boundary compilation (before engine plan compilation)"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: LOCAL-TBD-M7-C
children: []
blocked_by:
  - LOCAL-TBD-M7-A2
  - LOCAL-TBD-M7-B2
  - LOCAL-TBD-M7-B3
  - LOCAL-TBD-M7-B4
blocked:
  - LOCAL-TBD-M7-C2
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Today the runtime call chain is: `recipe.run(...)` -> `compileExecutionPlan(...)` -> `PipelineExecutor.executePlan(...)`. This unit inserts compilation at the recipe boundary so the engine only sees canonical per-step configs (and later becomes validate-only).

## Deliverables

- `createRecipe` runs `compileRecipeConfig` before `compileExecutionPlan`
- `createRecipe` assembles `compileOpsById` from domains used by the recipe/stages
- `RecipeConfigInputOf` and `CompiledRecipeConfigOf` reflect stage surface typing

## Acceptance Criteria

- [ ] `createRecipe` compiles author-facing stage config via `compileRecipeConfig` before engine plan compilation.
- [ ] Recipe boundary assembles a recipe-owned `compileOpsById` explicitly (by merging domain registries used by the recipe/stages).
- [ ] `RecipeConfigInputOf` and `CompiledRecipeConfigOf` are updated to represent stage surface input vs compiled per-step output (as pinned by spec; note O2 is closed).

## Scope Boundaries

**In scope:**
- Wiring compiler into the recipe boundary (in authoring SDK).
- Making `compileOpsById` assembly explicit at that boundary.

**Out of scope:**
- Migrating all standard stages (that is C2).
- Engine validate-only flip (that is D1/D2).

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm test` (full suite gate once wired)

## Dependencies / Notes

- **Blocked by:** [LOCAL-TBD-M7-A2](./LOCAL-TBD-M7-A2-compile-recipe-config-wiring.md), [LOCAL-TBD-M7-B2](./LOCAL-TBD-M7-B2-stage-option-a.md), [LOCAL-TBD-M7-B3](./LOCAL-TBD-M7-B3-domain-ops-registries.md), [LOCAL-TBD-M7-B4](./LOCAL-TBD-M7-B4-op-normalize-semantics.md)
- **Blocks:** [LOCAL-TBD-M7-C2](./LOCAL-TBD-M7-C2-stage-step-config-shape.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `spec_package`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/packages/mapgen-core/src/authoring/recipe.ts` | Current call chain builds a RecipeV2 with per-step config and calls compileExecutionPlan; insert compileRecipeConfig before plan compilation. |
| `/packages/mapgen-core/src/authoring/types.ts` | Update RecipeConfigInputOf/CompiledRecipeConfigOf typing split (O2 is closed and pinned). |
| `/mods/mod-swooper-maps/src/recipes/standard/recipe.ts` | Standard recipe is the primary consumer of createRecipe; will be first runtime callsite to adapt. |
| `/mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts` | Calls recipe.run(context, settings, config); config typing and shape will change after cutover. |

### Paper Trail

- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md` (§1.16 call chain)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/05-file-reconciliation.md` ("Slice 2 -- Recipe boundary adoption...")

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
