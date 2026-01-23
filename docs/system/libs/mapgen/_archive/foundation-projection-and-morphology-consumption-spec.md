# Foundation Projection + Morphology Consumption Spec

> **System:** Mesh → tile projection and how morphology consumes Foundation outputs.
> **Scope:** Improve projection performance and define era-resolved consumption in morphology.
> **Status:** Proposed (spec for implementation).

## Context (Current State)

- Projection uses nearest-cell search per tile (O(tiles × cells)).
- Morphology primarily consumes the latest-era `foundation.plates` fields and `crustTiles` data.

## Goals

1. **Projection performance:** reduce O(n×m) bottleneck via spatial indexing.
2. **Smoother signals:** optional weighted projection for boundary signals.
3. **Era-aware morphology:** formalize how morphology selects per-era masks.

## Proposed Solution Outline

### 1) Spatial Indexing for Projection

Build a grid bin or KD-tree over mesh sites:

```ts
const index = buildSpatialIndex(mesh.sites, bounds);
const nearest = index.query(tilePoint, k=3);
```

### 2) Weighted Sampling (Optional)

Compute plate/crust fields using weighted averages from nearest cells:

```ts
value = sum(weight[i] * field[cell[i]]) / sum(weight);
```

### 3) Morphology Era Selection

Add an explicit morphology config:

```yaml
morphology:
  tectonicEraMode: stacked  # recent | ancient | stacked
  tectonicEraWeights: [0.2, 0.3, 0.5]
```

### 4) Downstream Use Cases

- **Mountains:** based on `convergentMask` and `upliftPotential` by era.
- **Hills:** based on blended uplift + fracture fields.
- **Volcanoes:** based on era-specific volcanism masks.

## Diagram

```
Mesh fields → spatial index → tile fields
                       ↘ morphology era selection → landform placement
```

## E2E Example

**Input:**

```yaml
morphology:
  tectonicEraMode: ancient
```

**Expected outcome:**

- Mountain placement aligns with earliest-era convergence masks.
- Volcano placement aligns with ancient volcanism arcs.

## File Tree (Proposed)

```
mods/mod-swooper-maps/src/domain/foundation/ops/
  compute-plates-tensors/
    project-plates.ts      # add spatial indexing, optional weighting
mods/mod-swooper-maps/src/recipes/standard/stages/morphology-*/
  steps/                   # era selection logic and landform placement
```

## Implementation Steps

1. Add spatial index helper to mapgen-core.
2. Update projection step with indexed nearest lookup.
3. Add optional weighted mode and tests for determinism.
4. Add morphology era selection + blending.

## Benefits

- **Performance:** faster projection on large maps.
- **Realism:** smoother boundary fields.
- **Control:** morphology can express era-driven landform narratives.
