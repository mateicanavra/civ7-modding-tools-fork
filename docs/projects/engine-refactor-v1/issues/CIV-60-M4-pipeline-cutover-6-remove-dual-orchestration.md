---
id: CIV-60
title: "[M4] Pipeline cutover: remove dual orchestration path (MapOrchestrator vs executor)"
state: planned
priority: 1
estimate: 0
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Cleanup]
parent: CIV-54
children: []
blocked_by: [CIV-59]
blocked: [CIV-67]
related_to: [CIV-41, CIV-48]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove the dual orchestration path so the only supported runtime execution is `RunRequest → ExecutionPlan → executor` (no `MapOrchestrator` fallback).

## Deliverables

- Remove or fence legacy `MapOrchestrator` entrypoints so they cannot be used by default.
- Update any CLI/scripts/tests that still call the old orchestration path to use `RunRequest → ExecutionPlan`.
- Ensure runtime errors are explicit if a legacy path is invoked.

## Acceptance Criteria

- The repo has a single runtime execution path (compiled plan → executor).
- No default/test path can invoke `MapOrchestrator` or legacy orchestration entrypoints.
- Any remaining compatibility hooks are explicit and non-default (dev/test-only with clear errors).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Run the standard recipe via the new boundary and confirm no legacy entrypoints are exercised.

## Dependencies / Notes

- **Parent:** [CIV-54](CIV-54-M4-PIPELINE-CUTOVER.md)
- **Blocked by:** CIV-59
- **Sequencing:** Land in Phase D alongside legacy ordering deletion (CIV-59).
- **Estimate:** TBD; use prework to refine.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Treat this as cleanup; the runtime cutover should already be in place.
- Prefer deleting old entrypoints over leaving shims; if any shims remain, fence them explicitly.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: enumerate every dual-path orchestration entrypoint so removal is mechanical and complete.

Deliverables:
- A list of all `MapOrchestrator` entrypoints and legacy orchestration calls (CLI, scripts, tests, bootstrap helpers).
- A mapping from each legacy entrypoint to the new `RunRequest → ExecutionPlan → executor` path.
- A cleanup checklist for removing or fencing the old entrypoints, including any docs or tests to update.

Where to look:
- Orchestration code: `packages/mapgen-core/src/MapOrchestrator.ts`, `packages/mapgen-core/src/orchestrator/**`, `packages/mapgen-core/src/bootstrap/**`.
- Consumers: `packages/cli/**`, `scripts/**`, `packages/mapgen-core/test/**`.
- Milestone notes: `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

Constraints/notes:
- No new compatibility shims; deletion or explicit fencing only.
- Keep behavior stable; this is a routing cleanup.
- Do not implement code; return the inventory and checklist as markdown tables/lists.

## Pre-work

Goal: enumerate every "legacy orchestration" entry surface and map it to the target single execution path so cleanup is mechanical (delete or explicitly fence).

Target execution path (post PIPELINE‑4/5):
`RunRequest → ExecutionPlan → executor` (no `MapOrchestrator`, no bootstrap/presets/stage plumbing).

### 1) Legacy orchestration surfaces (public + internal)

#### Mapgen-core (library surfaces)

| Surface | File | What it is | Notes |
| --- | --- | --- | --- |
| `MapOrchestrator` class (public export) | `packages/mapgen-core/src/MapOrchestrator.ts` | Current orchestration wrapper that owns `requestMapData()` and `generateMap()` (TaskGraph path). | Even though it currently routes to TaskGraph, it remains a legacy *entry* surface and carries legacy config expectations. |
| Re-export of `MapOrchestrator` | `packages/mapgen-core/src/index.ts` | Public API surface exports `MapOrchestrator`. | Must be removed or explicitly fenced once RunRequest is the only supported entry. |
| TaskGraph runner | `packages/mapgen-core/src/orchestrator/task-graph.ts` | Current executor-based runner for the M3 stage list. | In PIPELINE‑4 it becomes plan-based; after PIPELINE‑6 it should be the only runtime entry (or superseded by an even thinner `runMapGen(runRequest)` helper). |
| Bootstrap entry | `packages/mapgen-core/src/bootstrap/entry.ts` | Legacy bootstrap that returns `MapGenConfig` from presets/overrides and stage config. | Removed in PIPELINE‑5; PIPELINE‑6 should ensure no callers remain. |

#### In-repo consumer mod (Swooper maps)

| Consumer | File | Legacy entry usage | Target mapping |
| --- | --- | --- | --- |
| Swooper map script | `mods/mod-swooper-maps/src/swooper-earthlike.ts` | Imports `bootstrap` + `MapOrchestrator` from `@swooper/mapgen-core` and calls `new MapOrchestrator(config).generateMap()`; also uses `requestMapData()` to set map init data. | Replace with constructing `RunSettings` + selecting a recipe (standard mod or mod-authored), then `compileExecutionPlan` + run executor. `requestMapData` responsibilities likely become a `settings` builder helper. |
| Swooper map script | `mods/mod-swooper-maps/src/swooper-desert-mountains.ts` | Same as above. | Same mapping. |

### 2) Tests currently exercising legacy entry surfaces

All of these will need to stop using `MapOrchestrator` and/or `bootstrap` once PIPELINE‑5 removes legacy config surfaces:

| Test | File | Legacy usage | Target mapping |
| --- | --- | --- | --- |
| Request-map-init behavior | `packages/mapgen-core/test/orchestrator/requestMapData.test.ts` | Calls `new MapOrchestrator(...).requestMapData()` | Replace with tests for a new `deriveRunSettingsFromAdapter(...)` helper (or remove if this behavior becomes engine-owned). |
| TaskGraph smoke | `packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts` | Uses `bootstrap` + `MapOrchestrator.generateMap()` | Replace with plan-based RunRequest execution tests (compile+run). |
| Foundation smoke | `packages/mapgen-core/test/orchestrator/foundation.smoke.test.ts` | Uses `bootstrap` + orchestrator entry | Replace with recipe that only includes `foundation` step (or direct plan compile+run for that slice). |
| Wiring tests | `packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts`, `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts` | Construct `MapOrchestrator` with legacy config and run | Replace with plan-based tests that assert required artifacts/effects exist for enabled steps. |
| Integration | `packages/mapgen-core/test/orchestrator/generateMap.integration.test.ts` | Calls `MapOrchestrator.generateMap()` | Replace with a RunRequest integration run (standard recipe). |

### 3) Docs that still describe MapOrchestrator as the primary entry

| Doc | File | Notes |
| --- | --- | --- |
| Swooper maps architecture | `docs/system/mods/swooper-maps/architecture.md` | Describes `bootstrap → MapOrchestrator → MapGenContext`. Needs update once RunRequest is the only supported entry. |

### 4) Mapping: legacy entrypoints → new boundary

Concrete mapping (conceptual):

| Legacy flow | Replacement flow |
| --- | --- |
| `bootstrap({ presets, stageConfig, overrides }) → MapGenConfig` | (Removed) Select recipe explicitly + validate `RunSettings` for the run. |
| `new MapOrchestrator(mapGenConfig, orchestratorOptions).generateMap()` | `const runRequest = { recipe, settings }; const plan = compileExecutionPlan(runRequest, registry); runExecutionPlan(plan)` |
| `MapOrchestrator.requestMapData(initParams)` | A new explicit "settings builder" that reads engine adapter/map size/map info and returns `RunSettings` (and any other required runtime surfaces). |

### 5) Cleanup checklist (PIPELINE‑6 implementation guidance)

- [ ] Remove `MapOrchestrator` from default/public exports (`packages/mapgen-core/src/index.ts`).
- [ ] Delete or fence `MapOrchestrator.ts` (if kept for dev-only, make it non-default and throw loudly).
- [ ] Update `mods/mod-swooper-maps/src/*` entry scripts to the RunRequest/ExecutionPlan path.
- [ ] Update/replace all tests that construct `MapOrchestrator` to compile+run a plan instead.
- [ ] Update docs that describe MapOrchestrator as canonical entry (at minimum `docs/system/mods/swooper-maps/architecture.md`).
