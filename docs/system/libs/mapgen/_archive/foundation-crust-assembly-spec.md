# Foundation Crust Assembly Spec

> **System:** Crust generation (continental/oceanic material, age, buoyancy, strength).
> **Scope:** Replace pseudo-plate seeding with craton-driven assembly and rift-aware aging.
> **Status:** Proposed (spec for implementation).

## Context (Current State)

- Continents are currently seeded via pseudo-plates and expanded by adjacency. Age and base elevation are heuristically tied to distance from those boundaries.
- Downstream morphology consumes crust type/age/base elevation as material drivers but lacks meaningful historical coherence.

## Goals

1. **Spatial coherence:** Cratonic interiors and younger margins must be consistent.
2. **Physics-informed proxies:** Age/strength should reflect rifting and cooling.
3. **Stable authoring:** Simple knobs (craton count/size) yield predictable continent layout.

## Proposed Solution Outline

### 1) Craton Seed Phase

**Author knobs:**

```yaml
foundation:
  continentProfile: earthlike
  advanced:
    crust:
      cratonCount: 6
      cratonSizeBias: 0.7
```

**Seeding algorithm (mesh):**

```ts
const cratonSeeds = sampleFarthestPoints(mesh.sites, cratonCount, rng);
const cratonSize = biasBy(cratonSizeBias, baseRadius);
```

### 2) Rift Corridor Phase

Generate a low-frequency divergence field and carve rift bands that reset age and weaken crust:

```ts
const divergence = vectorNoiseField(mesh, scale=large);
const riftBands = threshold(divergence.magnitude, riftBandStrength);
```

### 3) Age + Material Assignment

- **Age baseline:** distance from craton cores.
- **Rift reset:** reduce age where rift bands intersect.
- **Material type:** continental where age exceeds threshold or within craton spheres; oceanic elsewhere.
- **Strength/buoyancy:** derived from age (cooling curve proxy) and type.

```ts
age = clamp01(distToCraton / maxDist);
if (riftBands[cell]) age *= (1 - riftResetFactor);
crustType = age > continentThreshold ? CONTINENTAL : OCEANIC;
strength = lerp(minStrength, maxStrength, age);
```

## Behavioral Differences

| Current | Proposed |
|---|---|
| pseudo-plate adjacency seeding | craton seeds + rift corridors |
| age tied to boundary distance | age tied to craton distance + rift reset |
| inconsistent “salt-and-pepper” | coherent cores + younger margins |

## Diagrams

```
Craton seeds → distance field → rift bands → age reset → material/strength
```

## E2E Example

**Input:**

```yaml
foundation:
  continentProfile: supercontinent
  advanced:
    crust:
      cratonCount: 3
      cratonSizeBias: 0.9
      riftBandStrength: 0.4
```

**Expected outcome:**

- 2–3 large continental cores.
- A rift corridor splits one core into two margins with younger crust.
- Morphology sees older land in craton interiors and younger margins near rift belts.

## File Tree (Proposed)

```
mods/mod-swooper-maps/src/domain/foundation/ops/
  compute-crust/
    index.ts               # replace pseudo-plate seeding with craton assembly
    rift-field.ts          # new helper for divergence field
```

## Implementation Steps

1. Add craton/rift knobs to crust config schema.
2. Implement craton distance field + rift divergence field.
3. Derive age, material type, strength, base elevation from new fields.
4. Update projected `crustTiles` and morphology substrate consumption.

## Benefits

- **Realism:** continental cores and margins reflect a tectonic story.
- **Author control:** meaningful knobs without overspecifying plates.
- **Downstream leverage:** morphology gets an interpretable crust age signal.
