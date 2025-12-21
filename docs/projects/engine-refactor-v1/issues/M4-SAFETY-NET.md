---
id: M4-SAFETY-NET
title: "[M4] Safety net: observability baseline + CI smoke tests"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Testing, Observability]
parent: null
children: []
blocked_by: [M4-PIPELINE-CUTOVER]
blocked: []
related_to: [CIV-23]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Add a minimal safety net so we can ship M4 refactors confidently: step-level tracing on a shared foundation (toggleable per step) and CI smoke tests that compile and run the standard recipe under a stub adapter.

## Why This Exists

M4 is heavy on contract/cutover work. We need a stable way to:

- prove the pipeline still runs end-to-end
- debug step ordering and products quickly
- catch regressions in CI without the game engine

## Recommended Target Scope

### In scope

- Observability baseline:
  - run id
  - plan fingerprint / recipe digest
  - step start/finish timing
  - per-step trace toggle that steps can opt into (rich step-specific events on a shared core foundation)
- CI tests:
  - compile standard recipe → `ExecutionPlan`
  - execute with a stub adapter
  - assert basic invariants and that steps run
- Re-scope CIV-23 to match the new boundary (replace WorldModel/stageConfig assumptions).

### Out of scope

- Full in-game golden testing.
- Rich UI for traces.
- Performance profiling beyond basic timings.

## Acceptance Criteria

- Step tracing exists and can be toggled per step without changing code.
- Each step can emit rich step-specific trace events on a shared foundation.
- CI runs at least:
  - a compile smoke test
  - an execute smoke test with a stub adapter
- CIV-23 is updated or superseded so it no longer references legacy orchestration inputs (stageConfig/WorldModel).

## Primary Touchpoints (Expected)

- Observability:
  - `packages/mapgen-core/src/*` (executor/orchestrator tracing hooks)
  - `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (3.4 tracing decision)
- Tests:
  - `packages/mapgen-core/*` test harness
  - `docs/projects/engine-refactor-v1/issues/CIV-23-integration-tests.md` (re-scope)

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- CI: ensure the new smoke tests run in the default pipeline.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Plan (Concrete)

### 1) Observability baseline

- Define trace core:
  - run id + recipe/plan fingerprint
  - per-step timing and basic lifecycle events
- Add per-step opt-in:
  - a toggle that can be set per step ID from settings/recipe without code changes
  - step authors can emit richer events behind that toggle

### 2) CI smoke tests

- Add a stub adapter harness that can execute the standard recipe deterministically.
- Create smoke tests that:
  - compile a known recipe
  - execute the plan
  - assert basic invariants

### 3) Update CIV-23

- Re-scope CIV-23 to match the new boundary and remove references to legacy orchestration inputs and WorldModel lifecycle.

