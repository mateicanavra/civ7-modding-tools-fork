# Prework — `LOCAL-TBD-M4-PIPELINE-6` (Remove dual orchestration path)

Goal: enumerate every “legacy orchestration” entry surface and map it to the target single execution path so cleanup is mechanical (delete or explicitly fence).

Target execution path (post PIPELINE‑4/5):
`RunRequest → ExecutionPlan → executor` (no `MapOrchestrator`, no bootstrap/presets/stage plumbing).

## 1) Legacy orchestration surfaces (public + internal)

### Mapgen-core (library surfaces)

| Surface | File | What it is | Notes |
| --- | --- | --- | --- |
| `MapOrchestrator` class (public export) | `packages/mapgen-core/src/MapOrchestrator.ts` | Current orchestration wrapper that owns `requestMapData()` and `generateMap()` (TaskGraph path). | Even though it currently routes to TaskGraph, it remains a legacy *entry* surface and carries legacy config expectations. |
| Re-export of `MapOrchestrator` | `packages/mapgen-core/src/index.ts` | Public API surface exports `MapOrchestrator`. | Must be removed or explicitly fenced once RunRequest is the only supported entry. |
| TaskGraph runner | `packages/mapgen-core/src/orchestrator/task-graph.ts` | Current executor-based runner for the M3 stage list. | In PIPELINE‑4 it becomes plan-based; after PIPELINE‑6 it should be the only runtime entry (or superseded by an even thinner `runMapGen(runRequest)` helper). |
| Bootstrap entry | `packages/mapgen-core/src/bootstrap/entry.ts` | Legacy bootstrap that returns `MapGenConfig` from presets/overrides and stage config. | Removed in PIPELINE‑5; PIPELINE‑6 should ensure no callers remain. |

### In-repo consumer mod (Swooper maps)

| Consumer | File | Legacy entry usage | Target mapping |
| --- | --- | --- | --- |
| Swooper map script | `mods/mod-swooper-maps/src/swooper-earthlike.ts` | Imports `bootstrap` + `MapOrchestrator` from `@swooper/mapgen-core` and calls `new MapOrchestrator(config).generateMap()`; also uses `requestMapData()` to set map init data. | Replace with constructing `RunSettings` + selecting a recipe (standard mod or mod-authored), then `compileExecutionPlan` + run executor. `requestMapData` responsibilities likely become a `settings` builder helper. |
| Swooper map script | `mods/mod-swooper-maps/src/swooper-desert-mountains.ts` | Same as above. | Same mapping. |

## 2) Tests currently exercising legacy entry surfaces

All of these will need to stop using `MapOrchestrator` and/or `bootstrap` once PIPELINE‑5 removes legacy config surfaces:

| Test | File | Legacy usage | Target mapping |
| --- | --- | --- | --- |
| Request-map-init behavior | `packages/mapgen-core/test/orchestrator/requestMapData.test.ts` | Calls `new MapOrchestrator(...).requestMapData()` | Replace with tests for a new `deriveRunSettingsFromAdapter(...)` helper (or remove if this behavior becomes engine-owned). |
| TaskGraph smoke | `packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts` | Uses `bootstrap` + `MapOrchestrator.generateMap()` | Replace with plan-based RunRequest execution tests (compile+run). |
| Foundation smoke | `packages/mapgen-core/test/orchestrator/foundation.smoke.test.ts` | Uses `bootstrap` + orchestrator entry | Replace with recipe that only includes `foundation` step (or direct plan compile+run for that slice). |
| Wiring tests | `packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts`, `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts` | Construct `MapOrchestrator` with legacy config and run | Replace with plan-based tests that assert required artifacts/effects exist for enabled steps. |
| Integration | `packages/mapgen-core/test/orchestrator/generateMap.integration.test.ts` | Calls `MapOrchestrator.generateMap()` | Replace with a RunRequest integration run (standard recipe). |

## 3) Docs that still describe MapOrchestrator as the primary entry

| Doc | File | Notes |
| --- | --- | --- |
| Swooper maps architecture | `docs/system/mods/swooper-maps/architecture.md` | Describes `bootstrap → MapOrchestrator → MapGenContext`. Needs update once RunRequest is the only supported entry. |

## 4) Mapping: legacy entrypoints → new boundary

Concrete mapping (conceptual):

| Legacy flow | Replacement flow |
| --- | --- |
| `bootstrap({ presets, stageConfig, overrides }) → MapGenConfig` | (Removed) Select recipe explicitly + validate `RunSettings` for the run. |
| `new MapOrchestrator(mapGenConfig, orchestratorOptions).generateMap()` | `const runRequest = { recipe, settings }; const plan = compileExecutionPlan(runRequest, registry); runExecutionPlan(plan)` |
| `MapOrchestrator.requestMapData(initParams)` | A new explicit “settings builder” that reads engine adapter/map size/map info and returns `RunSettings` (and any other required runtime surfaces). |

## 5) Cleanup checklist (PIPELINE‑6 implementation guidance)

- [ ] Remove `MapOrchestrator` from default/public exports (`packages/mapgen-core/src/index.ts`).
- [ ] Delete or fence `MapOrchestrator.ts` (if kept for dev-only, make it non-default and throw loudly).
- [ ] Update `mods/mod-swooper-maps/src/*` entry scripts to the RunRequest/ExecutionPlan path.
- [ ] Update/replace all tests that construct `MapOrchestrator` to compile+run a plan instead.
- [ ] Update docs that describe MapOrchestrator as canonical entry (at minimum `docs/system/mods/swooper-maps/architecture.md`).

