# Foundation Plate Motion + Partition Spec

> **System:** Plate kinematics and plate partitioning over the mesh.
> **Scope:** Replace random motion with policy-driven vector fields and resistance-aware plate growth.
> **Status:** Proposed (spec for implementation).

## Context (Current State)

- Plate motion vectors are randomized with polar exceptions.
- Partitioning uses weighted flood fill with crust resistance but not explicitly rift-aware.

## Goals

1. **Global coherence:** plate velocities should match a world-scale “personality.”
2. **Controlled randomness:** per-plate variance, not total randomness.
3. **Boundary realism:** plate boundaries avoid cratons and follow weaknesses.

## Proposed Solution Outline

### 1) Motion Policy (Global Vector Field)

**Author knobs:**

```yaml
foundation:
  plateMotionPolicy: dispersive
  advanced:
    plateMotionVariance: 0.3
```

**Policies:**

- `cohesive`: low divergence, mild curl.
- `dispersive`: high divergence, low curl.
- `shearing`: high curl, moderate divergence.
- `balanced`: moderate divergence + curl.

**Algorithm:**

```ts
const field = buildPolicyField(policy, mesh, rng);
plate.velocity = sampleField(field, plate.seed);
plate.velocity += noise(variance);
```

### 2) Resistance Field for Partitioning

Use crust age/type plus rift corridors to build a resistance field:

```ts
resistance = baseRes(type, age)
if (riftBand[cell]) resistance *= riftWeakeningFactor;
```

### 3) Dijkstra Partitioning

Keep current Dijkstra-style growth but use the new resistance field to bias boundaries away from cratons and toward rifts/oceans.

## Behavioral Differences

| Current | Proposed |
|---|---|
| random velocities | policy-driven velocities + variance |
| boundaries sometimes cut cratons | boundaries prefer rifts and oceans |
| no plate personality | global motion policy |

## Diagram

```
Motion policy → velocity field → plate seeds
Crust+rift → resistance field → weighted Dijkstra partition
```

## E2E Example

**Input:**

```yaml
foundation:
  plateMotionPolicy: shearing
  advanced:
    plateMotionVariance: 0.2
```

**Expected outcome:**

- Transform boundaries dominate.
- Shear-aligned mountain belts form in morphology.

## File Tree (Proposed)

```
mods/mod-swooper-maps/src/domain/foundation/ops/
  compute-plate-graph/
    index.ts             # apply policy-driven velocity field
    policy-field.ts      # new helper
```

## Implementation Steps

1. Add motion policy + variance knobs to foundation public schema.
2. Implement policy vector field generator.
3. Replace random velocity assignments with field sampling.
4. Integrate rift resistance into partitioning weights.

## Benefits

- **Realism:** consistent tectonic personalities.
- **Author control:** high-level control without micro-managing plates.
- **Stability:** deterministic and reproducible velocity fields.
