# Foundation First-Principles Lid → Continents Spec

> **System:** First-principles tectonic evolution starting from a global basaltic lid.
> **Scope:** Stagnant-lid → mobile-lid transition, craton differentiation, and era-accumulated land/sea masks.
> **Status:** Proposed (spec for implementation).

## Context (Current State)

- Foundation currently seeds crust type and age directly, then derives plates and tectonic forces.
- Era outputs exist, but continent formation is not modeled as an emergent property of a basaltic lid plus mantle stress history.

## Goals

1. Start from a **global basaltic oceanic lid** and allow continents to emerge from differentiation.
2. Keep the model **computationally bounded** while supporting multi-era tectonic history.
3. Make **era-resolved outputs** the primary downstream drivers for morphology.

## Conceptual Model (Layered)

1. **Magma ocean → basaltic lid**
   - Initialize a uniform, dense basaltic crust (oceanic type everywhere).
2. **Stress vs. strength regime selector**
   - Use mantle stress field vs lithospheric strength to decide whether the lid behaves as:
     - **Stagnant lid** (minimal plate motion)
     - **Episodic/sluggish lid** (intermittent mobility)
     - **Mobile lid** (plate tectonics)
3. **Differentiation & craton nucleation**
   - When stress/heat thresholds are met, generate crustal melt differentiation events.
   - These events seed **proto-continents** (cratons) that grow via accretion and collision over eras.
4. **Era accumulation**
   - Each era updates crust type/age/strength and emits boundary masks + force fields for morphology.

## Proposed Solution Outline

### 1) Basaltic Lid Initialization

```ts
const crustType = Uint8Array(cellCount).fill(CRUST_OCEANIC);
const crustAge = Uint8Array(cellCount).fill(0);
const crustStrength = Float32Array(cellCount).fill(baseBasaltStrength);
```

### 2) Mantle Stress + Regime Selection

```ts
const stress = buildMantleStressField(mesh, config);
const strength = crustStrength;
const regime = classifyRegime(stress, strength);
```

**Regime outcomes:**
- **Stagnant lid:** no persistent plate boundaries; only local rift/plume effects.
- **Episodic:** plate boundaries form for limited eras; partial recycling.
- **Mobile:** full plate network; sustained subduction and divergence.

### 3) Differentiation Events → Craton Seeds

```ts
if (regime !== 'stagnant') {
  const differentiation = findMeltZones(stress, heat, hydration);
  seedCratons(differentiation, cratonCount, cratonSizeBias);
}
```

### 4) Era Loop (Evolution)

```ts
for (era of eras) {
  updatePlateKinematics(regime, era);
  computeBoundarySegments();
  diffuseTectonicForces();
  growCratonsViaAccretion();
  updateCrustAgeAndStrength();
  emitEraMasksAndFields();
}
```

## Behavioral Differences

| Current | Proposed |
|---|---|
| Start with mixed crust types | Start with uniform basaltic lid |
| Continents seeded by heuristics | Continents emerge via differentiation |
| Plate regimes assumed | Regime is stress/strength-driven |
| Era outputs secondary | Era outputs are primary drivers |

## Diagram

```
Basaltic lid → stress/strength regime → differentiation → cratons
     ↓                  ↓                    ↓
  era loop: plates → boundaries → forces → crust updates → era masks
```

## E2E Example

**Input:**

```yaml
foundation:
  historyProfile: ancient
  plateMotionPolicy: balanced
  advanced:
    crust:
      cratonCount: 5
      cratonSizeBias: 0.6
```

**Expected outcome:**

- Era 0–1: basaltic lid + localized rifts, sparse proto-continents.
- Era 2–3: craton accretion begins, continental rafts merge.
- Era 4+: stable continental cores, mature subduction belts, clearer land/ocean mask.

## File Tree (Proposed)

```
mods/mod-swooper-maps/src/domain/foundation/ops/
  compute-crust/
    lid-init.ts             # basaltic lid init
    differentiation.ts      # melt/differentiation events
  compute-plate-graph/
    regime.ts               # stress/strength regime classifier
  compute-tectonic-history/
    index.ts                # era loop; emit masks/fields
```

## Implementation Steps

1. Add basaltic-lid initialization (crust defaults).
2. Add mantle stress field + regime classifier (stagnant/episodic/mobile).
3. Add differentiation + craton seeding pipeline.
4. Extend era loop to update crust type/age/strength per era.
5. Update morphology to consume era masks directly.

## Benefits

- **Realism:** matches planetary first-principles (basaltic lid → continents).
- **Control:** authors can tune regime and differentiation intensity.
- **Consistency:** era outputs drive morphology in a principled, explainable way.
