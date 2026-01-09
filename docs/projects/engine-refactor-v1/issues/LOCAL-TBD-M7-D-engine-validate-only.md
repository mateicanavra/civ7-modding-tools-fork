---
id: LOCAL-TBD-M7-D
title: "[M7] Engine becomes validate-only"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: null
children:
  - LOCAL-TBD-M7-D1
  - LOCAL-TBD-M7-D2
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

This is deferred until after compilation is mandatory at the recipe boundary. The engine then becomes a pure consumer of canonical configs. Engine planner validates only; no default/clean/mutation; no step.resolveConfig calls. Executor consumes plans only; execute* config synthesis path removed or internal-only.

## Deliverables

This workstream delivers engine validate-only behavior:

- **D1:** Executor plan-only: remove runtime config synthesis
- **D2:** Planner validate-only: remove default/clean and step.resolveConfig

## Child Issues

| ID | Title | Status | blocked_by |
|---|---|---|---|
| [LOCAL-TBD-M7-D1](./LOCAL-TBD-M7-D1-executor-plan-only.md) | Executor plan-only: remove runtime config synthesis | planned | [M7-C3] |
| [LOCAL-TBD-M7-D2](./LOCAL-TBD-M7-D2-planner-validate-only.md) | Planner validate-only: remove default/clean and step.resolveConfig | planned | [M7-C3] |

## Sequencing

D1 and D2 can be worked in parallel after C3 completes. Both depend on C3.

## Acceptance Criteria

- [ ] All child issues (D1, D2) are completed
- [ ] All actively used recipes run through compiler (no bypass path)
- [ ] PipelineExecutor.execute* no longer synthesizes configs
- [ ] compileExecutionPlan does not mutate configs and does not call step.resolveConfig

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm test:mapgen`
- `rg -n "step\\.resolveConfig" packages/mapgen-core/src` (expect zero hits)
- `rg -n "Value\\.(Default|Convert|Clean)" packages/mapgen-core/src/engine` (expect zero hits)

## Dependencies / Notes

- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `spec_package`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

This is a parent/index issue. Implementation details live in child issue docs.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Child Issues](#child-issues)
- [Sequencing](#sequencing)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
