# Prework — `LOCAL-TBD-M4-PLACEMENT-1` (`artifact:placementInputs@v1` contract sketch)

Goal: sketch a minimal, versioned `artifact:placementInputs@v1` schema and a field-by-field source map so implementing the derive step is wiring + serialization, not discovery.

## Canon anchors (SPEC/SPIKE)

- Placement inputs are an explicit, TS-canonical artifact (`artifact:placementInputs@v1`) (SPIKE §2.7).
- Placement may still delegate IO/side-effects to the engine via adapter, but must not use implicit engine reads as its *dependency surface*.

## What placement consumes today (M3 reality)

Placement is invoked as:
- `createPlacementStep(runtime, options)` → `runPlacement(context.adapter, width, height, { mapInfo, starts, placementConfig })`
  - `packages/mapgen-core/src/pipeline/placement/PlacementStep.ts`
  - `packages/mapgen-core/src/domain/placement/index.ts`

Where the runtime inputs come from:
- `packages/mapgen-core/src/orchestrator/task-graph.ts`
  - `mapInfo` from adapter lookup
  - player counts + start sector rows/cols from `mapInfo.*` (with defaults)
  - `startSectors` from `ctx.adapter.chooseStartSectors(...)`
  - `westContinent` / `eastContinent` objects mutated by `landmassPlates` step
  - `placementStartsOverrides` from `config.placement?.starts`

## Proposed `PlacementInputs@v1` schema (TS sketch)

Minimal intent: capture the current runtime inputs as a serializable artifact so placement can stop assembling them implicitly.

```ts
type PlacementInputsV1 = {
  map: {
    // Optional because tests/demo payloads may omit; derive step can fill in production.
    mapInfo?: {
      NumNaturalWonders?: number
      LakeGenerationFrequency?: number
      PlayersLandmass1?: number
      PlayersLandmass2?: number
      StartSectorRows?: number
      StartSectorCols?: number
    }
  }

  // Effective placement controls (mirrors config surface; keep stable + minimal).
  placementConfig?: {
    wondersPlusOne?: boolean
    floodplains?: unknown // FloodplainsConfig (TypeBox schema already exists)
    starts?: unknown // StartsConfig (TypeBox schema already exists)
  }

  // Resolved + effective starts inputs as actually passed to placement today.
  starts?: {
    playersLandmass1: number
    playersLandmass2: number
    westContinent: { west: number; east: number; south: number; north: number; continent?: number }
    eastContinent: { west: number; east: number; south: number; north: number; continent?: number }
    startSectorRows: number
    startSectorCols: number
    startSectors: unknown[]
  }
}
```

Notes:
- This intentionally mirrors **current** runtime wiring; it does not attempt to make placement engine-less.
- `starts` is optional in the schema so demo payloads/tests can omit it (placement already skips start placement when `starts` is missing).
- Use existing TypeBox schema components where possible:
  - `StartsConfigSchema`, `ContinentBoundsSchema`, `PlacementConfigSchema` from `packages/mapgen-core/src/config/schema.ts`.

### Optional safe demo payload

A “doesn’t crash” demo should avoid engine-dependent start placement:
- Provide `placementConfig` with no `starts`.
- Provide a minimal `map.mapInfo` shape (or omit entirely).
- Keep any nested objects empty/defaulted.

Example (conceptual):
```json
{
  "map": { "mapInfo": { "NumNaturalWonders": 0 } },
  "placementConfig": { "wondersPlusOne": false, "floodplains": {} }
}
```

## Source map (field → where it comes from)

| PlacementInputs@v1 field | Source today | How to make TS-canonical |
| --- | --- | --- |
| `map.mapInfo` | `task-graph.ts` (adapter lookup: `lookupMapInfo(mapSizeId)`) | Derive step can copy from runtime (or re-lookup via adapter once per run). |
| `placementConfig` | `ctx.config.placement` (validated MapGenConfig) | Already TS-owned; derive step copies it. |
| `starts.playersLandmass1/2` | `mapInfo.PlayersLandmass*` (defaults in `task-graph.ts`) | Derive step copies resolved values. |
| `starts.startSectorRows/Cols` | `mapInfo.StartSector*` (defaults in `task-graph.ts`) | Derive step copies resolved values. |
| `starts.startSectors` | `ctx.adapter.chooseStartSectors(...)` in `task-graph.ts` | Derive step can copy from runtime result; schema already treats elements as `unknown`. |
| `starts.westContinent/eastContinent` | Mutated by `landmassPlates` (`LandmassStepRuntime` continent bounds objects) | Reify by copying the resolved bounds objects into the artifact after `landmassPlates` runs (either in a dedicated derive step or in the placementInputs derive step itself, once sequencing guarantees landmass has run). |

## Upstream reification required (to avoid implicit engine reads)

Required for strict “explicit dependency surface”:
- The derive step must run **after** `landmassPlates` (and any other steps that mutate continent bounds) so it can publish continent bounds explicitly rather than relying on closure-mutable runtime objects later.
- If placement continues to depend on any engine-derived values that are currently only available via adapter reads (beyond the `chooseStartSectors` call above), those should be pulled into the artifact explicitly (but avoid DEF‑010 climate scope creep in M4).

