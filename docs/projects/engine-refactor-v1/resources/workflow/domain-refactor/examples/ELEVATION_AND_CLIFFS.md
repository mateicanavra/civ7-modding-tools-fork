---
name: example-elevation-and-cliffs-terrainbuilder-no-drift
description: |
  Canonical example for the TerrainBuilder no-drift lock:
  `TerrainBuilder.buildElevation()` is the source of truth for Civ7 elevation bands/cliffs,
  and engine-derived reads happen only in Gameplay after `buildElevation()` (with `effect:map.elevationBuilt` as the downstream guarantee).
---

# EXAMPLE: Elevation & Cliffs (TerrainBuilder No-Drift)

This example exists to prevent “Physics accidentally depends on Civ7 engine surfaces” drift.

Hard locks demonstrated:
- Civ7 topology is fixed: `wrapX=true`, `wrapY=false` (no wrap knobs/config).
- Physics domains stay pure (no adapter reads/writes; no `artifact:map.*` / `effect:map.*` inputs).
- `TerrainBuilder.buildElevation()` is the only source of banded elevation/cliffs.
- Gameplay reads `GameplayMap.*` / adapter surfaces only **after** `buildElevation()` (with `effect:map.elevationBuilt` as the downstream guarantee boundary).
- Effects are boolean execution guarantees: `effect:map.<thing><Verb>` (use a semantically correct verb; `*Plotted` is reserved for stamping/placement, `*Built` is used for TerrainBuilder build steps).
- No `artifact:map.realized.*` namespace (effects express execution; `artifact:map.*` expresses intent/observability).

## Pipeline overview

```txt
PHYSICS (pure; no adapter reads/writes)
  ... upstream domains publish truth and/or buffers (heightfield, terrain intent, etc.)

GAMEPLAY / MATERIALIZATION (adapter writes + engine reads; braided into a physics phase)
  phase: <the phase you braid this into> (not a “map phase”)
    step: build-elevation
      requires: buffer:heightfield (or the upstream terrain intent/buffers your project uses)
      provides: effect:map.elevationBuilt, artifact:map.elevationByTile, artifact:map.cliffCrossingByEdge
      does:
        - adapter.buildElevation()
        - reads engine-derived elevation/cliff surfaces
        - publishes immutable map annotations
```

Notes:
- This is a single cohesive step: `buildElevation()` is the permission boundary, and engine reads happen immediately after it inside the same step.
- Physics never consumes these `artifact:map.*` projections (no backfeeding).

## Example file tree (illustrative)

```txt
mods/mod-swooper-maps/
  src/
    recipes/
      standard/
        stages/
          <some-physics-stage>/            # example: where materialization is braided in
            steps/
              build-elevation/             # Gameplay/materialization step (adapter + reads)
                contract.ts
                index.ts
```

## Gameplay/materialization step: `build-elevation`

This step is an effect boundary: it performs adapter calls and provides a boolean effect on success.

```ts
import { Type, defineStep } from "@swooper/mapgen-core/authoring";

export const BuildElevationStepContract = defineStep({
  id: "build-elevation",
  phase: "morphology", // example braid; not a “map phase”
  requires: ["buffer:heightfield"],
  provides: ["effect:map.elevationBuilt", "artifact:map.elevationByTile", "artifact:map.cliffCrossingByEdge"],
  schema: Type.Object({}),
} as const);
```

Runtime sketch (Gameplay-owned, side effects allowed):
- Optionally call `adapter.recalculateAreas()` if required by the engine’s internal invariants.
- Call `adapter.buildElevation()` (wraps `TerrainBuilder.buildElevation()`).
- Do not attempt to set cliffs/elevation bands directly; this step is the sole canonical “engine elevation computed” boundary.
- After `buildElevation()`, read engine-derived surfaces (Gameplay-only) and publish `artifact:map.*` projections as immutable snapshots.

Projection rules (canonical posture):
- Elevation bands/cliffs are **engine-derived**; treat them as Gameplay/map-layer facts.
- Publish `artifact:map.*` as immutable snapshots (write-once). Any later stamping step that consumes them relies on “effect honesty via freeze”.

Illustrative shapes:

```ts
type MapElevationByTile = Readonly<{ elevationM: Readonly<Int16Array> }>;

// Cliff crossings are directional edges in tile space.
// Direction semantics are Civ7 engine semantics; do not re-derive in Physics.
type MapCliffCrossingByEdge = Readonly<{
  cliffCrossing: Readonly<Uint8Array>; // 0/1 per directed edge, encoded as (tileIndex * dirCount + dir)
  dirCount: number; // e.g. 6 for hex; authored as an explicit field
}>;
```

Engine read sketch (Gameplay-only; runs after `buildElevation()` inside this step):
- Read `width`/`height` from `context.dimensions` (not from config).
- `elevationM[i] = context.adapter.getElevation(x, y)` (already wrapped in `packages/civ7-adapter`).
- `cliff = GameplayMap.isCliffCrossing(x, y, direction)` (engine global; adapter wrapper may be added later).
- Iterate tiles in deterministic row-major order; derive `tileIndex = y * width + x`.

## Why this is a separate example

Volcano/mountains/biomes often want “cliff-correct” decisions and will accidentally:
- read `GameplayMap.*` in Physics, or
- compute “cliffs” from non-engine elevation in Physics, or
- treat cliffs as a mutable artifact rather than a post-effect projection.

This example makes the cut line explicit: **`effect:map.elevationBuilt` is the only permission boundary for Civ7 elevation/cliff reads.**
