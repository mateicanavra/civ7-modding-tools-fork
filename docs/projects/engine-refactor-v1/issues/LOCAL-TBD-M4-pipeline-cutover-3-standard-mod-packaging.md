---
id: LOCAL-TBD-M4-PIPELINE-3
title: "[M4] Pipeline cutover: package standard pipeline as mod + loader/registry wiring"
state: planned
priority: 1
estimate: 0
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TESTS-VALIDATION-CLEANUP
assignees: []
labels: [Architecture, Cleanup]
parent: LOCAL-TBD-M4-PIPELINE-CUTOVER
children: []
blocked_by: [LOCAL-TBD-M4-PIPELINE-2]
blocked: [LOCAL-TBD-M4-PIPELINE-4]
related_to: [CIV-41, CIV-48]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Package the standard pipeline as a mod-style package and wire the loader/registry so the default recipe comes from that package (not from `pipeline/standard-library.ts`).

## Deliverables

- A standard pipeline mod package (registry + recipes) that defines the canonical default recipe.
- Loader/registry wiring so the standard mod package is discoverable and usable by the runtime boundary.
- Update CLI/scripts/consumers to load the standard mod package instead of importing `standard-library` helpers directly.
- No change to runtime cutover yet (PIPELINE-4 owns swapping the execution path).

## Acceptance Criteria

- The standard pipeline recipe is sourced from the mod-style package and registry entries, not from `pipeline/standard-library.ts`.
- The loader/registry can resolve the standard mod package in the default runtime path.
- No consumer relies on direct `standard-library` imports for ordering/enablement.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A local mapgen invocation can load the standard recipe via the mod package (even if TaskGraph still runs the legacy path).

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-PIPELINE-CUTOVER](M4-PIPELINE-CUTOVER.md)
- **Blocked by:** LOCAL-TBD-M4-PIPELINE-2 (per-step config plumbing should exist before packaging recipe config)
- **Blocks:** LOCAL-TBD-M4-PIPELINE-4
- **Estimate:** TBD; use prework to refine.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep this packaging-only; do not switch the runtime to `RunRequest → ExecutionPlan` here.
- Remove direct import usage of `pipeline/standard-library.ts` in consumer code paths.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: inventory the standard pipeline entrypoints and define the packaging + loader wiring plan so implementation is mechanical.

Deliverables:
- A map of all standard-pipeline entrypoints/consumers (CLI, scripts, tests, runtime entry paths) that currently import from `pipeline/standard-library.ts` or `pipeline/standard.ts`.
- A proposed standard mod package layout (registry + recipes) and where it should live in the repo.
- A list of loader/registry wiring touchpoints required to discover the standard mod package.
- A cutover checklist separating packaging changes (this issue) from runtime boundary changes (PIPELINE-4).

Where to look:
- Standard pipeline sources: `packages/mapgen-core/src/pipeline/standard.ts`, `packages/mapgen-core/src/pipeline/standard-library.ts`.
- Registry/loader wiring: `packages/mapgen-core/src/pipeline/StepRegistry.ts`, `packages/mapgen-core/src/bootstrap/entry.ts`, `packages/mapgen-core/src/bootstrap/resolved.ts`.
- Consumers: `packages/cli/**`, `scripts/**`, and any test harnesses under `packages/mapgen-core/test/**`.

Constraints/notes:
- Keep this packaging-only; do not change runtime execution or ordering logic.
- The standard recipe must be mod-authored and registry-backed.
- Do not implement code; return the inventory and wiring plan as markdown tables/lists.
