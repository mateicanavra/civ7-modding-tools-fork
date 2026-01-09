---
id: LOCAL-TBD-M7-D2
title: "[M7] Planner validate-only: remove default/clean and step.resolveConfig"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: LOCAL-TBD-M7-D
children: []
blocked_by:
  - LOCAL-TBD-M7-C3
blocked:
  - LOCAL-TBD-M7-F1
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

`compileExecutionPlan` currently defaults/cleans configs and invokes `step.resolveConfig(...)` during plan compilation. In the target state, compilation is validate-only: no mutation, no defaulting/cleaning, and no step/op normalization hooks.

## Deliverables

- Make `compileExecutionPlan` validate-only for step configs.
- Remove default/clean/mutation and remove all step.resolveConfig calls.
- Remove the obsolete error code `step.resolveConfig.failed`.

## Acceptance Criteria

- [ ] `compileExecutionPlan` validates only: it does not call `Value.Default/Convert/Clean` on step configs.
- [ ] `compileExecutionPlan` does not call any step/op normalization hook (`step.resolveConfig`/`step.normalize` etc).
- [ ] Error code `step.resolveConfig.failed` is deleted and tests updated accordingly.

## Scope Boundaries

**In scope:**
- Engine planner semantics change (validate-only) and corresponding tests.

**Out of scope:**
- Recipe boundary compilation and stage migrations (C1/C2 own producing canonical configs).

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `rg -n "step\\.resolveConfig" packages/mapgen-core/src` (expect zero hits after this unit)
- `rg -n "Value\\.(Default|Convert|Clean)" packages/mapgen-core/src/engine` (expect zero hits after this unit)

## Dependencies / Notes

- **Blocked by:** [LOCAL-TBD-M7-C3](./LOCAL-TBD-M7-C3-remove-runtime-fallbacks.md)
- **Blocks:** [LOCAL-TBD-M7-F1](./LOCAL-TBD-M7-F1-verify-no-shims.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `spec_package`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/packages/mapgen-core/src/engine/execution-plan.ts` | Baseline contains unknown-key detection + Value.Errors formatting; remove default/clean + resolveConfig calls while preserving validation errors. |
| `/packages/mapgen-core/test/pipeline/execution-plan.test.ts` | Contains coverage for step resolveConfig behavior today; must be rewritten to match validate-only planner. |

### Paper Trail

- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/05-file-reconciliation.md` ("Engine validate-only behavior")
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/00-fundamentals.md` (I2)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
