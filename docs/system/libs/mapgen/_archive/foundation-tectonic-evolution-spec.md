# Foundation Tectonic Evolution (Era-Resolved) Spec

> **System:** Era-resolved tectonic history and evolution outputs.
> **Scope:** Make tectonic evolution the primary downstream driver with per-era masks and force fields.
> **Status:** Proposed (spec for implementation).

## Context (Current State)

- Tectonic history runs 3 eras and emits per-era tensors, but downstream steps typically use only the latest era plus cumulative totals.
- Morphology cannot easily differentiate “old vs new” tectonic forcing without custom plumbing.

## Goals

1. **Era-resolved outputs** for morphology: explicit masks and force fields per era.
2. **Controlled advection** (optional) to encode plate drift over eras without full reconstruction.
3. **Deterministic and bounded** runtime.

## Proposed Solution Outline

### 1) Era-Resolved Masks

Extend `tectonicHistory.eras[e]` to include explicit masks:

```ts
interface EraTectonics {
  boundaryType: Uint8Array;
  convergentMask: Uint8Array;  // 0/1 per cell
  divergentMask: Uint8Array;
  transformMask: Uint8Array;
  subductionPolarity: Int8Array; // -1, 0, +1
  upliftPotential: Uint8Array;
  riftPotential: Uint8Array;
  shearStress: Uint8Array;
  volcanism: Uint8Array;
  fracture: Uint8Array;
}
```

### 2) Optional Bounded Advection (Tracer History)

A lightweight, bounded advection pass:

```ts
const tracerIndex = initWithCellIds(mesh.cellCount);
for (era in eras) {
  for (step in driftSteps[era]) {
    tracerIndex = advect(tracerIndex, plateVelocityField);
  }
  eraTracer[era] = tracerIndex;
}
```

**Note:** This is a **control mechanism**, not a full plate reconstruction. It is limited in step count to maintain stability.

### 3) Morphology Consumption

Morphology can optionally select era-based masks:

```ts
if (config.eraMode === "recent") use(eras[last]);
if (config.eraMode === "stacked") blend(eras, weights);
if (config.eraMode === "ancient") use(eras[0]);
```

## Behavioral Differences

| Current | Proposed |
|---|---|
| latest-era tectonics only | per-era masks + force fields |
| little age differentiation | explicit era selection + blending |
| no advection history | bounded advection for drift context |

## Diagram

```
Plate motion → boundary segments → era fields → era masks + force fields
                         ↘ advection (optional) → tracer history
```

## E2E Example

**Input:**

```yaml
foundation:
  historyProfile: ancient
  advanced:
    tectonics:
      eraMode: stacked
      eraWeights: [0.2, 0.3, 0.5]
```

**Expected outcome:**

- Morphology places old, rounded mountains where ancient convergence dominated.
- Newer, sharper belts align with last-era convergence masks.

## File Tree (Proposed)

```
mods/mod-swooper-maps/src/domain/foundation/ops/
  compute-tectonic-history/
    index.ts           # extend eras with masks
    advection.ts       # optional tracer history pass
mods/mod-swooper-maps/src/recipes/standard/stages/morphology-*/
  steps/               # consume era masks in mountains/volcanoes
```

## Implementation Steps

1. Extend tectonic history artifact schema for per-era masks.
2. Add advection step (optional) with deterministic limits.
3. Update morphology steps to consume era masks when enabled.
4. Add tests for determinism + performance budget.

## Benefits

- **Realism:** tectonic age becomes a first-class driver.
- **Author control:** explicit era mode selection.
- **Robustness:** bounded, deterministic evolution outputs.
