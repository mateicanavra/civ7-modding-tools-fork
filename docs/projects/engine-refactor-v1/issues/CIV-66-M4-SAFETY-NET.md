---
id: CIV-66
title: "[M4] Safety net: observability baseline + CI smoke tests"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Testing, Observability]
parent: null
children: [CIV-75, CIV-76]
blocked_by: [CIV-55]
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
- CIV-23 is updated so it no longer references legacy orchestration inputs (stageConfig/WorldModel).

## Primary Touchpoints (Expected)

- Observability:
  - `packages/mapgen-core/src/*` (executor/orchestrator tracing hooks)
  - `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.10 observability)
- Tests:
  - `packages/mapgen-core/*` test harness
  - `docs/projects/engine-refactor-v1/issues/CIV-23-integration-tests.md` (re-scope)

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- CI: ensure the new smoke tests run in the default pipeline.

## Dependencies / Notes

- Depends on LOCAL-TBD-M4-PIPELINE-1 (compiler/plan exists) for plan fingerprint + compile/execute smoke tests.
- Observability should land immediately after PIPELINE-1 to support later cutovers.

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

## Prework Prompt (Agent Brief)

Goal: confirm observability + smoke-test prework artifacts are complete and aligned before implementation.

Deliverables:
- A short readiness checklist pointing to the child prework artifacts for:
  - Trace event model + plan fingerprint algorithm + hook points.
  - Smoke-test matrix + stub adapter capability list + CIV-23 rescope notes.
- A brief gap list if any acceptance criteria from the milestone are not covered by the test plan.

Where to look:
- Child issues: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-safety-net-1-observability.md`,
  `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-safety-net-2-smoke-tests.md`.
- SPEC/SPIKE: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Observability),
  `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.10).
- Milestone notes: `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

Constraints/notes:
- Tests use Bun and must be deterministic and engine-free.
- Tracing must be optional and not alter execution when disabled.
- Do not implement code; deliver only the checklist + gaps as notes.
- Plan fingerprint must include recipe + settings + per-step config (stable serialization).

## Prework Results / References

Child artifacts:
- Safety‑1 (`LOCAL-TBD-M4-SAFETY-1`): `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-safety-1-tracing-model-and-fingerprint.md`
- Safety‑2 (`LOCAL-TBD-M4-SAFETY-2`): `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-safety-2-smoke-tests-matrix-and-civ23-rescope.md`

Readiness checklist:
- Trace model + sink interface + hook points are defined and align to the accepted “minimal required baseline + optional sinks” strategy.
- Plan fingerprint strategy is specified (canonical serialization + stable hash) and is suitable for CI determinism.
- Smoke-test matrix covers compile + execute, is engine-free (MockAdapter), and includes forward-looking assertions for `effect:*` verification loudness and StoryTags removal.
- CIV‑23 rescope plan is captured so the legacy “WorldModel lifecycle” framing can be retired in favor of RunRequest/ExecutionPlan guardrails.

Decisions:
- The semantic `planFingerprint` excludes observability toggles (trace enablement/verbosity/sinks).
- **M4 decision:** do not compute a separate trace-config fingerprint. If you believe it is required, stop and add a `triage` entry to `docs/projects/engine-refactor-v1/triage.md` documenting why + expected consumers, then ask for confirmation before proceeding (see ADR-ER1-022).
