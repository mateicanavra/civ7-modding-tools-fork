---
id: LOCAL-TBD-M4-SAFETY-2
title: "[M4] Safety net: CI smoke tests + CIV-23 re-scope"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Testing]
parent: LOCAL-TBD-M4-SAFETY-NET
children: []
blocked_by: [LOCAL-TBD-M4-SAFETY-1, LOCAL-TBD-M4-PIPELINE-1]
blocked: []
related_to: [CIV-23]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Add compile/execute smoke tests against the standard recipe using a stub adapter, and re-scope CIV-23 to the new boundary.

## Deliverables

- CI smoke tests that compile the standard recipe into an `ExecutionPlan`.
- CI smoke tests that execute the plan with a stub adapter and assert basic invariants.
- CIV-23 updated to align with `RunRequest`/`ExecutionPlan` and remove legacy orchestration references.

## Acceptance Criteria

- CI runs both compile and execute smoke tests on the default pipeline.
- Tests do not depend on the game engine.
- CIV-23 no longer references WorldModel or `stageConfig`/`stageManifest` inputs.

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- CI confirms the smoke tests run in the default pipeline.

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-SAFETY-NET](LOCAL-TBD-M4-SAFETY-NET.md)
- **Blocked by:** LOCAL-TBD-M4-SAFETY-1, LOCAL-TBD-M4-PIPELINE-1
- **Related:** CIV-23

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep smoke tests light and deterministic; prefer stub adapter fixtures over real engine calls.
- If CIV-23 becomes redundant, mark as superseded instead of duplicating work.
- Test runner wiring: root `pnpm test:mapgen` → `pnpm -C packages/mapgen-core test` → `bun test` (`packages/mapgen-core/package.json`).
- Smoke coverage should explicitly exercise:
  - stageManifest/STAGE_ORDER removal paths
  - `effect:*` verification failures are loud
  - StoryTags removal / narrative artifacts are canonical

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: define the smoke-test plan and stub adapter requirements so tests can be added quickly and deterministically.

Deliverables:
- A smoke-test matrix: compile test + execute test, with minimal assertions (no stageManifest/STAGE_ORDER, effect verification failures are loud, StoryTags not required).
- A stub adapter capability list needed to run the standard recipe.
- A short CIV-23 rescope note aligned to the new RunRequest/ExecutionPlan boundary.
- A note on plan fingerprint coverage (recipe + settings + per-step config) to keep CI deterministic.

Where to look:
- Tests: `packages/mapgen-core/test/**`, `packages/mapgen-core/package.json` (Bun runner).
- Legacy test references: `docs/projects/engine-refactor-v1/issues/CIV-23-integration-tests.md`.
- Milestone acceptance notes: `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

Constraints/notes:
- Tests must be deterministic and engine-free.
- Keep the suite light; focus on compile/execute smoke coverage.
- Do not implement code; return the matrix and capability list as markdown tables/lists.

## Prework Results / References

- Resource doc: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-safety-2-smoke-tests-matrix-and-civ23-rescope.md`
- Includes: compile/execute smoke-test matrix + minimal assertions, stub adapter capability list (lean on `createMockAdapter`), plan fingerprint determinism guidance for CI, and a CIV-23 rescope note aligned to the new `RunRequest`/`ExecutionPlan` boundary.
