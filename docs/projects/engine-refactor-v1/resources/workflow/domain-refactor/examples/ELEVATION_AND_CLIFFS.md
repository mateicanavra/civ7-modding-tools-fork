---
name: example-elevation-and-cliffs-terrainbuilder-no-drift
description: |
  Canonical example for the TerrainBuilder no-drift lock:
  `TerrainBuilder.buildElevation()` is the source of truth for Civ7 elevation bands/cliffs,
  and engine-derived reads happen only in Gameplay after `effect:map.elevationPlotted`.
---

# EXAMPLE: Elevation & Cliffs (TerrainBuilder No-Drift)

This example exists to prevent “Physics accidentally depends on Civ7 engine surfaces” drift.

Hard locks demonstrated:
- Civ7 topology is fixed: `wrapX=true`, `wrapY=false` (no wrap knobs/config).
- Physics domains stay pure (no adapter reads/writes; no `artifact:map.*` / `effect:map.*` inputs).
- `TerrainBuilder.buildElevation()` is the only source of banded elevation/cliffs.
- Gameplay reads `GameplayMap.*` / adapter surfaces only **after** `effect:map.elevationPlotted`.
- Effects are boolean execution guarantees: `effect:map.<thing><Verb>` (`*Plotted` by convention).
- No `artifact:map.realized.*` namespace (effects express execution; `artifact:map.*` expresses intent/observability).

## Pipeline overview

```txt
PHYSICS (pure; no adapter reads/writes)
  ... upstream domains publish truth and/or buffers (heightfield, terrain intent, etc.)

GAMEPLAY (stamping; adapter writes + boolean effect)
  step: map/plot-elevation
    requires: buffer:heightfield (or the upstream terrain intent/buffers your project uses)
    provides: effect:map.elevationPlotted
    does: adapter.buildElevation()

GAMEPLAY (projection; adapter/engine reads after effect)
  step: map/project-elevation-and-cliffs
    requires: effect:map.elevationPlotted
    provides: artifact:map.elevationByTile, artifact:map.cliffCrossingByEdge
    does: reads engine-derived elevation/cliff surfaces, publishes immutable map annotations
```

Notes:
- The “engine read” step is Gameplay-owned by definition (it consumes `effect:map.elevationPlotted` and reads engine surfaces).
- Physics never consumes these `artifact:map.*` projections (no backfeeding).

## Gameplay stamping step: `map/plot-elevation`

This step is an effect boundary: it performs adapter calls and provides a boolean effect on success.

```ts
import { Type, defineStep } from "@swooper/mapgen-core/authoring";

export const PlotElevationStepContract = defineStep({
  id: "plot-elevation",
  phase: "map",
  requires: ["buffer:heightfield"],
  provides: ["effect:map.elevationPlotted"],
  schema: Type.Object({}),
} as const);
```

Runtime sketch (Gameplay-owned, side effects allowed):
- Optionally call `adapter.recalculateAreas()` if required by the engine’s internal invariants.
- Call `adapter.buildElevation()` (wraps `TerrainBuilder.buildElevation()`).
- Do not attempt to set cliffs/elevation bands directly; this step is the sole canonical “engine elevation computed” boundary.

## Gameplay projection step: `map/project-elevation-and-cliffs`

This step reads engine-derived surfaces and publishes map-facing projection/observability layers.

```ts
import { Type, defineStep } from "@swooper/mapgen-core/authoring";

export const ProjectElevationAndCliffsStepContract = defineStep({
  id: "project-elevation-and-cliffs",
  phase: "map",
  requires: ["effect:map.elevationPlotted"],
  provides: ["artifact:map.elevationByTile", "artifact:map.cliffCrossingByEdge"],
  schema: Type.Object({}),
} as const);
```

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

Engine read sketch (Gameplay-only; runs after `effect:map.elevationPlotted`):
- Read `width`/`height` from `context.dimensions` (not from config).
- `elevationM[i] = context.adapter.getElevation(x, y)` (already wrapped in `packages/civ7-adapter`).
- `cliff = GameplayMap.isCliffCrossing(x, y, direction)` (engine global; adapter wrapper may be added later).
- Iterate tiles in deterministic row-major order; derive `tileIndex = y * width + x`.

## Why this is a separate example

Volcano/mountains/biomes often want “cliff-correct” decisions and will accidentally:
- read `GameplayMap.*` in Physics, or
- compute “cliffs” from non-engine elevation in Physics, or
- treat cliffs as a mutable artifact rather than a post-effect projection.

This example makes the cut line explicit: **`effect:map.elevationPlotted` is the only permission boundary for Civ7 elevation/cliff reads.**
