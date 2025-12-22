---
id: LOCAL-TBD-M4-PLACEMENT-1
title: "[M4] Placement inputs: define artifact:placementInputs@v1 + derive step"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Architecture, Placement]
parent: LOCAL-TBD-M4-PLACEMENT-INPUTS
children: []
blocked_by: []
blocked: [LOCAL-TBD-M4-PLACEMENT-2]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Define `artifact:placementInputs@v1` (demo payload optional) and add a derive step that produces it from explicit prerequisites.

## Deliverables

- Versioned `artifact:placementInputs@v1` schema in the registry; demo payload is optional (validate when present).
- A derive step that produces `placementInputs@v1` from explicit prerequisites and publishes it in context artifacts.
- Standard recipe updated to include the derive step before placement.

## Acceptance Criteria

- `artifact:placementInputs@v1` is registered; if a demo payload is provided, it does not crash downstream placement.
- The derive step runs in the standard pipeline and emits the artifact.
- Downstream placement can read the artifact (without yet removing legacy paths).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Smoke test compiles and executes the standard recipe with the derive step present.

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-PLACEMENT-INPUTS](LOCAL-TBD-M4-PLACEMENT-INPUTS.md)
- **Blocks:** LOCAL-TBD-M4-PLACEMENT-2

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep this additive; do not remove legacy placement inputs here.
- Use existing TypeBox patterns for the artifact schema.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: define the `artifact:placementInputs@v1` contract so cutover is a wiring change, not a discovery exercise.

Deliverables:
- A schema sketch for `placementInputs@v1` (fields + types) with an optional safe demo payload.
- A source map for each field: which upstream artifact/field/adapter read provides it today.
- A list of any required upstream reification to make inputs TS-canonical.

Where to look:
- SPEC/SPIKE: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (placement artifact),
  `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.7).
- Placement: `packages/mapgen-core/src/pipeline/placement/**`.
- Upstream dependencies in ecology/narrative: `packages/mapgen-core/src/pipeline/ecology/**`,
  `packages/mapgen-core/src/pipeline/narrative/**`.

Constraints/notes:
- Keep this additive; no removal of legacy inputs in this issue.
- Placement inputs must be explicit and TS-canonical; avoid DEF-010 scope creep.
- Do not implement code; return the schema and mapping as markdown tables/lists.

## Pre-work

Goal: define the `artifact:placementInputs@v1` contract so the cutover is a wiring change, not a discovery exercise.

### 1) Schema sketch: `PlacementInputs@v1`

Minimal V1 shape (mirroring today's runtime wiring in `orchestrator/task-graph.ts` → `PlacementStep`):

```ts
type PlacementInputsV1 = {
  // Map metadata (from engine/mapInfo)
  mapInfo: {
    width: number;
    height: number;
    mapSizeId?: number;
    numPlayers?: number;
    numCityStates?: number;
    // Add other mapInfo fields as needed (e.g., lakeFrequency).
  };

  // Start placement inputs
  starts: Array<{
    playerId: number;
    leader?: string;
    civ?: string;
    // isHuman, etc. if needed.
  }>;

  // Continental assignment (from landmass bounds resolution)
  continents: {
    westBounds: { minX: number; maxX: number };
    eastBounds: { minX: number; maxX: number };
    // Or: westPlotSet, eastPlotSet (if needed for placement logic).
  };

  // Placement config (from config.placement)
  placementConfig: {
    // Natural wonders, resources, floodplains, discoveries, etc.
    // Mirror the fields used by PlacementStep from ctx.config.placement.
    naturalWonders?: { ... };
    resources?: { ... };
    // Keep this aligned with PlacementConfigSchema.
  };
};
```

Notes:
- Keep V1 minimal: only include fields that `PlacementStep` actually reads today.
- For "continents": the current wiring derives `westBounds`/`eastBounds` from landmass bounds resolution in `orchestrator/task-graph.ts`; include that here.
- Demo payloads are optional; if provided they must be safe (non-crashing) for downstream placement.

### 2) Source map: where each field comes from today

| Field | Current source | Upstream producer | Notes |
| --- | --- | --- | --- |
| `mapInfo.width/height` | `ctx.dimensions` (or adapter/engine) | Foundation / context allocation | Already available in context. |
| `mapInfo.mapSizeId` | `ctx.config.metadata?.mapSizeId` or engine | Foundation / settings | Settings-only; no upstream artifact. |
| `mapInfo.numPlayers/numCityStates` | Engine-provided (mapInfo) | Settings / engine boundary | Settings-only. |
| `starts` | Engine-provided or settings | Settings / engine boundary | Comes from host; not a step output. |
| `continents.westBounds/eastBounds` | `orchestrator/task-graph.ts` (landmass bounds resolution) | Landmass step | Derived after `landmassPlates` runs; candidate for reification. |
| `placementConfig.*` | `ctx.config.placement` | Recipe config / settings | Already available in context; may move to per-step config in PIPELINE-2. |

### 3) Required upstream reification

The only upstream data that requires explicit reification is **continental bounds**:
- Today: `orchestrator/task-graph.ts` computes `westBounds`/`eastBounds` inline from landmass results.
- Target: the derive step (or `landmassPlates` step itself) publishes `continents` as part of `artifact:placementInputs@v1` (or a separate `artifact:continentalBounds@v1` that `placementInputs@v1` references).

Other fields (`mapInfo`, `starts`, `placementConfig`) are already available from settings/context and do not require new upstream steps.

### 4) Demo payload guidance

Goal: if a demo payload is provided for `artifact:placementInputs@v1`, it must be safe for downstream placement (no crashes, no invalid indices).

Recommended approach:
- Demo should include minimal valid data (e.g., `mapInfo` with small dimensions, empty `starts`, placeholder `continents`).
- Do not include data that would cause placement to crash (e.g., invalid player IDs, out-of-bounds coords).
- Mark demo payloads as optional in the schema; validate shape but not content correctness.

### 5) Derive step placement (recipe wiring)

The derive step should:
1. Run after `landmassPlates` (to access continental bounds).
2. Assemble `PlacementInputsV1` from:
   - `ctx.dimensions` / settings for `mapInfo`
   - Settings for `starts`
   - Landmass results for `continents`
   - Recipe/per-step config for `placementConfig`
3. Publish `artifact:placementInputs@v1` in context artifacts.
4. Standard recipe updated to include the derive step before `placement`.
