# Foundation Refactor Proposal (Authoritative)

> **System:** Foundation domain (mesh → crust → plates → tectonics → projection → morphology interface)
> **Scope:** First-principles tectonic evolution from a basaltic lid, with authoring profiles and era-resolved outputs.
> **Status:** Proposed (consolidated spec; supersedes prior Foundation proposals in this directory).

## Prose First: The Physical Story We Are Modeling

The Foundation refactor begins with a simple, defensible physical premise: **a planet starts with a global basaltic lid** and continents emerge only when the lithosphere differentiates under mantle stress and heat. That implies a causal chain we can model deterministically and at bounded cost:

1. **A basaltic lid exists everywhere at t=0** (oceanic crust by default).
2. **Mantle stress competes with lithospheric strength** to decide whether the lid is stagnant, episodic, or mobile.
3. **Differentiation events** (melt zones, hydration, heat) nucleate cratons.
4. **Cratons accrete over eras** and define stable continental cores and younger margins.
5. **Plate kinematics operate over the crust**, producing tectonic forces and histories.
6. **Eras are first-class**, so morphology can distinguish ancient from recent tectonics.

This proposal keeps the model **mesh-first, deterministic, and bounded** while exposing only **high-leverage authoring controls**.

### First-principles constraints we respect

- **Material precedes motion:** crust is defined before plates, so continents can sit inside plates or span boundaries (passive margins).
- **Stress vs strength decides regime:** plate tectonics emerges only when mantle stress exceeds lithospheric strength.
- **Eras are causal history, not decoration:** the final shape is the accumulation of per-era forces, not a single snapshot.
- **Determinism and bounded cost:** no unbounded simulation loops; all stochastic choices are seeded and capped.

---

## Architecture Overview (Pipeline & Contracts)

**Foundation produces mesh-first artifacts.** Tile projections are derived, never upstream.

```
Basaltic lid
   ↓
Stress/strength regime ─────┐
   ↓                       │
Differentiation → cratons  │
   ↓                       │
Crust (type/age/strength)  │
   ↓                       │
Plate motion policy        │
   ↓                       │
Partition → plate graph    │
   ↓                       │
Boundary regimes           │
   ↓                       │
Era loop (history)         │
   ↓                       │
Per-era masks + forces     │
   ↓
Projection → morphology consumption
```

**Key contract surfaces**:

- `RegionMesh`: canonical spatial substrate.
- `CrustData`: material layer (type/age/strength/buoyancy).
- `PlateGraph`: kinematic layer (plate IDs + velocities).
- `TectonicHistory`: per-era masks and force fields.
- `Projection`: tile-space derivatives for downstream stages.

---

## Layers & Axes (How the Model is Organized)

We treat Foundation as a **stack of layers**, each evolving across **axes** (space, time, material, kinematics, forcing).

### Layers (vertical stack)

1. **Mesh layer** (geometry)
2. **Crust layer** (material)
3. **Plate layer** (kinematics)
4. **Boundary layer** (regime labels)
5. **History layer** (era-resolved forces)
6. **Projection layer** (tile-space signals)

### Axes (cross-cutting dimensions)

```
Space  : mesh ↔ tiles
Time   : eras (ancient → recent)
Material: crust type / age / strength
Motion : plate velocity / rotation
Forcing: uplift / rift / shear / volcanism / fracture
```

### Authoring profiles (high-level axes)

| Profile | Purpose | Values | Derived internal constants |
|---|---|---|---|
| `resolutionProfile` | scale of mesh + plate density | coarse / balanced / fine / ultra | `cellDensityPerTile`, `plateDensityPerTile` |
| `continentProfile` | continent sizing intent | small / islands / earthlike / supercontinent | `cratonCount`, `cratonSizeBias`, `riftBandStrength` |
| `plateMotionPolicy` | global motion character | cohesive / dispersive / shearing / balanced | policy field params |
| `historyProfile` | era count + weight | young / balanced / ancient | `eraCount`, `eraWeights`, drift steps |

These profiles replace opaque knobs like `referenceArea` or `plateScalePower` and anchor configuration in **author intent**.

---

## What & How (Algorithms & Data Flow)

### 1) Basaltic Lid Initialization (t=0)

We start with **global oceanic crust** and a uniform strength baseline.

```ts
const crustType = Uint8Array(cellCount).fill(CRUST_OCEANIC);
const crustAge = Uint8Array(cellCount).fill(0);
const crustStrength = Float32Array(cellCount).fill(baseBasaltStrength);
```

### 2) Stress/Strength Regime Selection

A mantle stress field is compared to lithospheric strength to classify the regime.

```ts
const stress = buildMantleStressField(mesh, config);
const strength = crustStrength;
const regime = classifyRegime(stress, strength); // stagnant | episodic | mobile
```

**Regime effects:**
- **Stagnant:** no persistent plate network; localized rifts/plumes only.
- **Episodic:** transient plate boundaries and limited recycling.
- **Mobile:** sustained plate tectonics.

### 3) Differentiation → Craton Assembly

Differentiation events seed **cratons**; rift bands reset age and weaken crust.

```ts
if (regime !== "stagnant") {
  const meltZones = findMeltZones(stress, heat, hydration);
  seedCratons(meltZones, cratonCount, cratonSizeBias);
}

const riftField = vectorNoiseField(mesh, scale=large);
const riftBands = threshold(riftField.magnitude, riftBandStrength);
```

**Age/material assignment (mesh):**

```ts
age = clamp01(distToCraton / maxDist);
if (riftBands[cell]) age *= (1 - riftResetFactor);
crustType = age > continentThreshold ? CONTINENTAL : OCEANIC;
strength = lerp(minStrength, maxStrength, age);
```

```
Craton seeds → distance field → rift bands → age reset → material/strength
```

### 4) Plate Motion Policy (Global Vector Field)

Replace random velocity vectors with a **policy-driven field** plus bounded variance.

```ts
const field = buildPolicyField(policy, mesh, rng);
plate.velocity = sampleField(field, plate.seed);
plate.velocity += noise(variance);
```

Policies encode divergence/curl balance:
- `cohesive`: low divergence, mild curl
- `dispersive`: high divergence, low curl
- `shearing`: high curl, moderate divergence
- `balanced`: moderate divergence + curl

### 5) Partitioning with Resistance Fields

Plate boundaries should prefer weak zones (rifts, young crust) and avoid old cratons.

```ts
resistance = baseRes(type, age);
if (riftBands[cell]) resistance *= riftWeakeningFactor;
```

Partitioning remains Dijkstra-style but honors resistance to reduce boundary noise.

### 6) Boundary Regime Classification + Hysteresis

Regimes are chosen by **normal vs tangential motion** with confidence and hysteresis:

```
relativeVelocity → normal/tangent decomposition
  → regime confidence
  → label with hysteresis
```

This prevents flickering between convergent/divergent/transform labels across eras.

### 7) Era Loop (History as Primary Output)

Each era updates kinematics, boundaries, and forces, producing **per-era masks**.

```ts
for (era of eras) {
  updatePlateKinematics(regime, era);
  computeBoundarySegments();
  classifyBoundaryRegimes();
  diffuseTectonicForces();
  updateCrustAgeAndStrength();
  emitEraMasksAndFields();
}
```

Per-era outputs (authoritative for morphology):

```ts
interface EraTectonics {
  boundaryType: Uint8Array;
  convergentMask: Uint8Array;
  divergentMask: Uint8Array;
  transformMask: Uint8Array;
  subductionPolarity: Int8Array;
  upliftPotential: Uint8Array;
  riftPotential: Uint8Array;
  shearStress: Uint8Array;
  volcanism: Uint8Array;
  fracture: Uint8Array;
}
```

**Optional bounded advection** for plate drift context (not full reconstruction):

```ts
const tracerIndex = initWithCellIds(mesh.cellCount);
for (era in eras) {
  for (step in driftSteps[era]) {
    tracerIndex = advect(tracerIndex, plateVelocityField);
  }
  eraTracer[era] = tracerIndex;
}
```

### 8) Projection & Morphology Consumption

Projection becomes **indexed and optionally weighted**, and morphology chooses eras explicitly.

```ts
const index = buildSpatialIndex(mesh.sites, bounds);
const nearest = index.query(tilePoint, k=3);
value = weightedAverage(nearest, field);
```

```yaml
morphology:
  tectonicEraMode: stacked   # recent | ancient | stacked
  tectonicEraWeights: [0.2, 0.3, 0.5]
```

```
Mesh fields → spatial index → tile fields
                       ↘ morphology era selection → landform placement
```

### 9) Authoring Surface (Profiles & Advanced Knobs)

**Top-level knobs (stable):**

```yaml
foundation:
  resolutionProfile: balanced
  continentProfile: earthlike
  plateMotionPolicy: balanced
  historyProfile: balanced
```

**Advanced knobs (power users):**

```yaml
foundation:
  advanced:
    crust:
      cratonCount: 6
      cratonSizeBias: 0.7
      riftBandStrength: 0.4
    plateMotionVariance: 0.2
    tectonics:
      eraMode: stacked
      eraWeights: [0.2, 0.3, 0.5]
```

**Rule:** If a value is derived from dimensions or a profile, it is **not author-facing**.

### 10) Optional Scenario Mode

Scenario generation offers structured motion fields (e.g., Pangea breakup) without manual vectors.

```json
{
  "plateMotionScenario": {
    "mode": "supercontinent-breakup",
    "seedPlateId": 3,
    "spreadAngleDeg": 220,
    "variance": 0.2
  }
}
```

---

## So What? Expected Behavior Changes

| Aspect | Current | Refactored (Expected) |
|---|---|---|
| Crust origin | mixed heuristics | basaltic lid → differentiation → cratons |
| Continents | pseudo-plate expansion | craton cores + rift-aware margins |
| Plate motion | randomized | policy-driven with variance |
| Boundary regimes | flickery | hysteresis-stable |
| Tectonic history | mostly latest era | per-era masks + forces |
| Projection | O(tiles×cells) | indexed + optional weighting |
| Authoring | many coupled knobs | profiles + targeted advanced knobs |

**Behavioral highlights:**
- Coherent continental cores with younger, rifted margins.
- Plate boundaries prefer weak zones; cratons resist splitting.
- Era-resolved mountains, volcanoes, and rifts enable narrative landform aging.
- Predictable scaling across map sizes and resolutions.

---

## E2E Example (Intent → Outcome)

**Input:**

```yaml
foundation:
  resolutionProfile: balanced
  continentProfile: earthlike
  plateMotionPolicy: shearing
  historyProfile: ancient
  advanced:
    crust:
      cratonCount: 5
      cratonSizeBias: 0.6
```

**Expected outcome:**
- Era 0–1: basaltic lid with localized rifts; sparse proto-continents.
- Era 2–3: craton accretion; shear-aligned orogens emerge.
- Era 4+: mature continental cores; transform belts dominate; stable land/sea mask.

---

## Proposed File Tree (Refactor Map)

```
mods/mod-swooper-maps/src/domain/foundation/ops/
  compute-crust/
    lid-init.ts
    differentiation.ts
    rift-field.ts
  compute-plate-graph/
    policy-field.ts
    partition.ts
    regime.ts
  compute-tectonic-history/
    index.ts
    advection.ts
  compute-plates-tensors/
    project-plates.ts
packages/mapgen-core/src/domain/foundation/
  constants.ts
```

---

## Implementation Sequence (Suggested)

1. **Authoring profiles** + internal constants (`resolutionProfile`, `historyProfile`, `continentProfile`).
2. **Basaltic lid + regime selection** (stagnant/episodic/mobile classifier).
3. **Craton assembly + rift corridors**; update crust age/strength/buoyancy.
4. **Motion policy fields** + resistance-aware partitioning.
5. **Era-resolved masks** + optional bounded advection.
6. **Projection indexing** + morphology era selection.
7. **Docs + schema** updates across Foundation and recipes.

---

## Risks & Guardrails

- **Complexity creep:** keep each step bounded; no unbounded physics loops.
- **Determinism:** seed every new step with named RNG keys.
- **Performance:** spatial indexing + precomputed fields mitigate large maps.

---

## Appendix: Minimal ASCII Algorithms

**Regime classification (conceptual):**

```
if (stress < strength * stagnantThreshold) → stagnant
else if (stress < strength * mobileThreshold) → episodic
else → mobile
```

**Partitioning (resistance-aware):**

```
seed plates → Dijkstra growth
  cost = distance * resistance(cell)
  resistance = f(crustType, age, riftBands)
```

**Era stacking (morphology):**

```
recent:  use last era only
ancient: use first era only
stacked: blend(era[i], weights[i])
```
