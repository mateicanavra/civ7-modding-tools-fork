---
id: LOCAL-TBD-M7-A2
title: "[M7] compileRecipeConfig end-to-end wiring"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: LOCAL-TBD-M7-A
children: []
blocked_by:
  - LOCAL-TBD-M7-A1
blocked:
  - LOCAL-TBD-M7-C1
  - LOCAL-TBD-M7-F1
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Wire Phase A + Phase B into a single entrypoint that produces `CompiledRecipeConfigOf`. The output should be deterministic, fully canonical internal configs keyed by stageId -> stepId.

## Deliverables

- `compileRecipeConfig({ env, recipe, config, compileOpsById })`
- Deterministic path/stepId/stageId attribution in `CompileErrorItem`

## Acceptance Criteria

- [x] `compileRecipeConfig({ env, recipe, config, compileOpsById })` exists and follows the spec's ordering (Phase A then Phase B).
- [x] Compiler rejects unknown keys in per-stage rawSteps (excluding the reserved `"knobs"` key).
- [x] Compiler errors include deterministic attribution: stageId + stepId + path (stable ordering across runs).
- [x] Unit tests compile a minimal synthetic recipe/stage/steps and assert: (a) canonicalization ordering, (b) unknown-step-id errors, (c) op envelope prefill behavior.

## Scope Boundaries

**In scope:**
- The end-to-end compiler call chain and error surface shape.
- Test coverage of compiler ordering and error aggregation.

**Out of scope:**
- Wiring `compileRecipeConfig` into `createRecipe` (that is C1).
- Removing engine/runtime normalization hooks (that is D2).

## Pinned Behavior

- Phase A validates stage surfaceSchema then stage.toInternal
- Compiler rejects unknown rawSteps keys (excluding "knobs")
- Phase B iterates steps in stage.steps array order
- Step canonicalization: prefill -> strict -> step.normalize -> strict -> op normalize -> strict

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm -C packages/mapgen-core check`

## Dependencies / Notes

- **Blocked by:** [LOCAL-TBD-M7-A1](./LOCAL-TBD-M7-A1-compiler-module-skeleton.md)
- **Blocks:** [LOCAL-TBD-M7-C1](./LOCAL-TBD-M7-C1-recipe-boundary-compilation.md), [LOCAL-TBD-M7-F1](./LOCAL-TBD-M7-F1-verify-no-shims.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `docs/projects/engine-refactor-v1/resources/spec/recipe-compile`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Notes

- Implement compileRecipeConfig as: stage surface normalize -> stage.toInternal -> unknown step id validation -> step canonicalization loop.
- Iterate steps in stage.steps array order; this is pinned for stable error ordering.
- Explicitly error on stage.toInternal producing unknown step ids (excluding knobs).

### Implementation Guidance

| File | Notes |
|---|---|
| `/packages/mapgen-core/src/compiler/recipe-compile.ts` | Define compileRecipeConfig entrypoint; ensure ordering matches spec Phase A/B. |
| `/docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/ts/compiler.ts` | Reference ordering and types; do not treat as runtime code. |

### Paper Trail

- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/02-compilation.md` (§1.9, §1.20)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/04-type-surfaces.md` (Recipe compiler + types)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Pinned Behavior](#pinned-behavior)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
