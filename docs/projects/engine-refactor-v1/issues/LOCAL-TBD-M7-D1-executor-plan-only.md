---
id: LOCAL-TBD-M7-D1
title: "[M7] Executor plan-only: remove runtime config synthesis"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: LOCAL-TBD-M7-D
children: []
blocked_by:
  - LOCAL-TBD-M7-C3
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

`PipelineExecutor.execute*` currently synthesizes configs via `Value.Default/Convert/Clean`. In the target architecture, execution consumes plans only; config construction happens at compile time.

## Deliverables

- `PipelineExecutor.execute/executeAsync` are removed; `PipelineExecutor` exposes plan-only entrypoints.
- `executePlan/executePlanAsync` are the only supported entrypoints.

## Acceptance Criteria

- [x] `PipelineExecutor.execute` / `executeAsync` are removed.
- [x] `executePlan` / `executePlanAsync` are the supported entrypoints and are used by runtime call sites.
- [x] Tests that previously relied on `execute(...)` are updated to compile a plan and call `executePlan(...)`.

## Scope Boundaries

**In scope:**
- Executor API surface tightening and removal of config synthesis helpers.

**Out of scope:**
- Planner validate-only changes (D2 owns plan compilation semantics).

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm test:mapgen`

## Dependencies / Notes

- **Blocked by:** [LOCAL-TBD-M7-C3](./LOCAL-TBD-M7-C3-remove-runtime-fallbacks.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `docs/projects/engine-refactor-v1/resources/spec/recipe-compile`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/packages/mapgen-core/src/engine/PipelineExecutor.ts` | Contains resolveStepConfig(...) (Value.Default/Convert/Clean) and execute*/executeAsync* entrypoints. |
| `/packages/mapgen-core/test/pipeline/placement-gating.test.ts` | Uses executor.execute(...) today; update to compile plan + executePlan. |
| `/packages/mapgen-core/test/pipeline/tag-registry.test.ts` | Uses executor.execute(...) today; update accordingly. |
| `/packages/mapgen-core/test/pipeline/tracing.test.ts` | Uses executor.execute(...) today; update accordingly. |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
