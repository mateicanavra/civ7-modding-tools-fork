---
id: CIV-72
title: "[M4] Placement inputs: cut placement over to artifact + verified effect"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Placement]
parent: CIV-64
children: []
blocked_by: [CIV-71]
blocked: []
related_to: [CIV-63]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Update placement to consume `artifact:placementInputs@v1` exclusively and provide a verified `effect:*` tag instead of relying on implicit engine reads.

## Deliverables

- Placement requires `artifact:placementInputs@v1` and stops assembling inputs internally.
- Placement provides `effect:engine.placementApplied` verified via a minimal `artifact:placementOutputs@v1` (ADR-ER1-020).
- DEF-006 updated to “resolved” once the new contract is in place.

## Acceptance Criteria

- Placement no longer reads implicit inputs from engine state; it consumes the artifact.
- Placement provides a verified effect tag and fails fast on verifier failures (missing/invalid outputs, shape mismatches).
- DEF-006 marked resolved with a brief pointer to the new artifact contract.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A stub-adapter placement run passes using the new artifact inputs and fails fast when `artifact:placementInputs@v1` is missing or invalid.

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-PLACEMENT-INPUTS](LOCAL-TBD-M4-PLACEMENT-INPUTS.md)
- **Blocked by:** LOCAL-TBD-M4-PLACEMENT-1
- **Related:** LOCAL-TBD-M4-EFFECTS-VERIFICATION (placement effect verification)
- **Coordination:** Effect tag catalog + verifier wiring comes from LOCAL-TBD-M4-EFFECTS-1; placement verification uses `artifact:placementOutputs@v1` (ADR-ER1-020).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep behavior stable; focus on contract and wiring.
- If any temporary compatibility shims exist, remove them here once placement is fully cut over.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: produce the placement cutover checklist so the refactor is mechanical and verifiable.

Deliverables:
- A list of all placement input assembly sites and implicit engine reads that must be replaced by `placementInputs@v1`.
- A mapping from each old input source to the new artifact field.
- A plan for `effect:engine.placementApplied` verification via a minimal `artifact:placementOutputs@v1` (schema + invariants; see ADR-ER1-020).
- A list of tests to update/add for stub-adapter placement runs.

Where to look:
- Placement code: `packages/mapgen-core/src/pipeline/placement/**`.
- Pipeline and effects: `packages/mapgen-core/src/pipeline/standard.ts`, `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`.
- Tests: `packages/mapgen-core/test/**`.

Constraints/notes:
- Keep behavior stable; this is contract/wiring only.
- Remove any temporary compatibility shims once placement fully uses the artifact.
- Do not implement code; return the checklist and mappings as markdown tables/lists.

## Pre-work

Goal: produce the placement cutover checklist so the refactor is mechanical and verifiable.

### 1) Inventory: placement input assembly today

#### Task graph assembly (`orchestrator/task-graph.ts`)

| Input | How it's assembled | Notes |
| --- | --- | --- |
| `landmassCfg` | From `config.landmass` | Passed to landmass step; continental bounds derived after. |
| `westBounds`, `eastBounds` | Computed inline from landmass results | Derived from `ctx.artifacts["continentalBounds"]` or similar. |
| `starts` | From settings/engine | Passed directly to placement layer. |
| `placementConfig` | From `ctx.config.placement` | Passed to `PlacementStep`. |

#### Placement layer (`pipeline/placement/PlacementStep.ts`)

| Input | How it's read | Notes |
| --- | --- | --- |
| `ctx.config.placement.*` | Direct reads from context config | Should switch to `artifact:placementInputs@v1`. |
| `ctx.dimensions` | Direct reads from context | Already explicit; keep as-is or include in artifact. |
| `adapter.*` | Engine reads for biomes/features/terrain | Should switch to `ctx.fields.*` after reification. |

### 2) Source → artifact mapping

| Current input | Source today | Artifact field | Notes |
| --- | --- | --- | --- |
| `westBounds`, `eastBounds` | Task graph inline | `artifact:placementInputs@v1.continents` | Requires upstream derive step. |
| `starts` | Settings / engine | `artifact:placementInputs@v1.starts` | Settings passthrough. |
| `placementConfig.*` | `ctx.config.placement` | `artifact:placementInputs@v1.placementConfig` | Config passthrough. |
| `mapInfo.*` | `ctx.dimensions` / settings | `artifact:placementInputs@v1.mapInfo` | Settings passthrough. |
| `adapter.getBiomeType` | Engine read | `ctx.fields.biomeId` (post-biomes reification) | Effects Verification cutover. |
| `adapter.getFeatureType` | Engine read | `ctx.fields.featureType` (post-features reification) | Effects Verification cutover. |

### 3) `effect:engine.placementApplied` verification (ADR-ER1-020)

#### `artifact:placementOutputs@v1` schema (minimal)

```ts
type PlacementOutputsV1 = {
  // Summary of what was placed
  naturalWondersCount: number;
  floodplainsCount: number;
  snowTilesCount: number;
  resourcesCount: number;
  startsAssigned: number;
  discoveriesCount: number;

  // Optional: placement method call log (for debugging)
  methodCalls?: Array<{ method: string; args?: unknown }>;
};
```

#### Verification strategy

1. After `PlacementStep.run()` completes, publish `artifact:placementOutputs@v1` with counts/summary.
2. Effect verifier checks:
   - Artifact is present.
   - Counts are within expected ranges (e.g., `startsAssigned >= numPlayers`).
3. Verification failures are loud (fail-fast with a clear error message).

### 4) Tests to update during cutover

| Test file | Current dependency | Cutover action |
| --- | --- | --- |
| `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts` | Uses `stageConfig` and `MapOrchestrator` | Rewrite to use `RunRequest` + `artifact:placementInputs@v1`. |
| `packages/mapgen-core/test/pipeline/placement-gating.test.ts` | Imports `M3_STAGE_DEPENDENCY_SPINE` | Update to expect `effect:engine.placementApplied` and verify via `artifact:placementOutputs@v1`. |
| `packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts` | Uses `stageConfig` | Rewrite to recipe-based enablement; verify placement artifact present. |

### 5) Cutover checklist

#### Artifact definition and derive step (PLACEMENT-1)

- [ ] Define `artifact:placementInputs@v1` schema.
- [ ] Create derive step that assembles and publishes the artifact.
- [ ] Update standard recipe to include derive step before `placement`.

#### Placement step cutover (PLACEMENT-2)

- [ ] Update `PlacementStep` to require `artifact:placementInputs@v1`.
- [ ] Remove internal input assembly (reads from artifact instead).
- [ ] Publish `artifact:placementOutputs@v1` after placement completes.
- [ ] Provide `effect:engine.placementApplied` (verified via output artifact).

#### Tests and docs

- [ ] Update tests listed above.
- [ ] Mark DEF-006 as resolved in `docs/projects/engine-refactor-v1/deferrals.md`.
