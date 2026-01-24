# First-Principles Crustal Evolution: An Extension to the Tectonic Evolution Engine

## Executive Summary

This document extends the Tectonic Evolution Engine proposal to support **first-principles crustal evolution** - starting from a uniform basaltic oceanic shell and deriving continental distribution through simulation rather than pre-assignment.

The key insight from planetary geology is:

> "A planet doesn't start with a supercontinent. It likely starts with a global 'lid' of heavy basalt, which slowly evolves chemically to create small islands of lighter continental rock."

This extension models:
1. **Crustal differentiation** at subduction zones (oceanic → continental conversion)
2. **Craton nucleation** from accumulated volcanic arc material
3. **Craton growth** through accretion and collision welding
4. **Supercontinent assembly/breakup** as an emergent phenomenon

The result: the `continentalRatio` configuration becomes a **target that emerges from simulation dynamics**, not a pre-assigned parameter.

---

## Part I: Analysis of the Gap

### What My Previous Proposal Assumes

The Tectonic Evolution Engine proposal (and the current codebase) treats crust type as a **pre-simulation input**:

```
Current Pipeline:
  mesh → compute-crust (ASSIGNS continental vs oceanic) → plate-graph → evolution
                ↑
         This step uses region-growing heuristics
         to "paint" continental cells before any
         plate dynamics are considered
```

**The assumption**: Continental crust already exists; we just need to decide where plates are and how they move.

### What First-Principles Requires

A physically-motivated model reverses this:

```
First-Principles Pipeline:
  mesh → uniform oceanic crust → plate-graph → evolution (DERIVES crust types)
                                                    ↑
                                             Subduction creates volcanic arcs
                                             Arcs mature into proto-continents
                                             Continents grow through accretion
                                             Land/ocean emerges from dynamics
```

**The insight**: Continental crust is **manufactured** by the tectonic engine itself, primarily through crustal differentiation at subduction zones.

---

## Part II: The Physics of Crustal Differentiation

### Why Subduction Creates Continents

When oceanic crust subducts, it doesn't just disappear. The descending slab releases water and volatiles, which trigger partial melting in the overlying mantle wedge. This produces **andesitic/dacitic magmas** that are more silica-rich than the original basalt.

```
Cross-section: Subduction Zone Differentiation

         Volcanic Arc
            ▲ ▲ ▲
            │ │ │  ← Silicic magma rises
   ─────────┴─┴─┴──────────────────────────  Overriding Plate
            ╲   ╲
             ╲ ● ╲  ← Partial melting in mantle wedge
              ╲ ● ╲   (water-induced)
               ╲   ╲
                ╲   ╲  ← Subducting oceanic slab
                 ╲   ╲   (releases water/volatiles)
                  ╲   ╲
    ═══════════════╲═══╲═══════════════════  Mantle
                    ╲   ╲

Over millions of years:
- Volcanic arcs accumulate silicic material
- Arc crust thickens and becomes buoyant
- Eventually becomes "proto-continental"
- Proto-continents resist subduction (too light to sink)
```

### The Differentiation Cascade

Each subduction event slightly enriches the overriding plate:

```
Step 1: Basalt subducts
        → Water released → Mantle melts → Andesite erupts

Step 2: Andesite (in arc) subducts at next boundary
        → More differentiation → Dacite/Rhyolite

Step 3: Repeated cycles
        → Progressive enrichment → Granitic composition

Result: After billions of years, you accumulate enough
        low-density silicic rock to form stable cratons
```

### Quantitative Model: Crustal Maturity

We introduce a continuous **crustal maturity** metric that tracks this differentiation:

```typescript
// Crustal maturity: 0.0 = pure oceanic basalt, 1.0 = mature continental craton
//
// Physical interpretation:
//   0.0 - 0.2: Oceanic basalt (MORB composition, density ~3.0 g/cm³)
//   0.2 - 0.4: Island arc / oceanic plateau (transitional)
//   0.4 - 0.6: Proto-continental (young, thin granitic crust)
//   0.6 - 0.8: Continental margin (thickening crust)
//   0.8 - 1.0: Mature craton (thick, stable, ancient)

interface CrustalState {
  maturity: Float32Array;      // 0.0 to 1.0, continuous differentiation
  thickness: Float32Array;     // km equivalent, affects buoyancy
  age: Uint16Array;            // eras since formation/reset
  compositionCode: Uint8Array; // discrete classification (for downstream)
}

enum COMPOSITION_CODE {
  OCEANIC_YOUNG = 0,      // maturity < 0.15
  OCEANIC_MATURE = 1,     // 0.15 <= maturity < 0.25
  TRANSITIONAL = 2,       // 0.25 <= maturity < 0.45
  PROTO_CONTINENTAL = 3,  // 0.45 <= maturity < 0.65
  CONTINENTAL = 4,        // 0.65 <= maturity < 0.85
  CRATONIC = 5,           // maturity >= 0.85
}
```

---

## Part III: The Differentiation Algorithm

### Subduction-Driven Maturity Increase

At each era, cells on the **overriding plate** at convergent boundaries gain maturity:

```typescript
function applySubductionDifferentiation(
  interaction: BoundaryInteraction,
  state: EvolutionState,
  crustState: CrustalState,
  era: number,
  config: DifferentiationConfig
): void {
  // Only convergent boundaries with active subduction
  if (interaction.regime !== BOUNDARY_TYPE.convergent) return;
  if (interaction.subductingPlate === null) return;

  // Find cells in the volcanic arc (overriding plate, behind boundary)
  const arcCells = findVolcanicArcCells(
    interaction.boundaryCells,
    interaction.subductingPlate,
    interaction.subductionAngle,
    state.currentPlateId,
    mesh,
    config.arcWidth
  );

  for (const cell of arcCells) {
    // Maturity increase depends on:
    // 1. Subduction rate (faster = more melt production)
    // 2. Current maturity (diminishing returns at high maturity)
    // 3. Slab angle (steeper = more focused arc)

    const subductionRate = Math.abs(interaction.normalVelocity);
    const currentMaturity = crustState.maturity[cell];
    const slabAngleFactor = Math.sin(interaction.subductionAngle);

    // Logistic growth: fast at low maturity, saturates at high
    const maturityHeadroom = 1.0 - currentMaturity;
    const baseIncrement = config.differentiationRate * subductionRate * slabAngleFactor;
    const actualIncrement = baseIncrement * maturityHeadroom * maturityHeadroom;

    crustState.maturity[cell] = Math.min(1.0, currentMaturity + actualIncrement);

    // Thickness increases with maturity (isostatic adjustment)
    crustState.thickness[cell] += actualIncrement * config.thicknessPerMaturity;
  }
}
```

### Rifting-Driven Maturity Decrease

When continents rift, new oceanic crust forms at the spreading center:

```typescript
function applyRiftingCrustReset(
  interaction: BoundaryInteraction,
  state: EvolutionState,
  crustState: CrustalState,
  era: number,
  config: DifferentiationConfig
): void {
  if (interaction.regime !== BOUNDARY_TYPE.divergent) return;

  const spreadingRate = Math.abs(interaction.normalVelocity);

  for (const cell of interaction.boundaryCells) {
    // New oceanic crust at spreading center
    crustState.maturity[cell] = 0.0;
    crustState.thickness[cell] = config.newOceanicThickness;
    crustState.age[cell] = 0;

    // Record the event
    state.lastBoundaryEvent[cell] = BOUNDARY_EVENT.RIFT_CREATED;
  }
}
```

### Collision-Driven Thickening

When two continental masses collide, neither subducts - instead, crust thickens:

```typescript
function applyContinentalCollision(
  interaction: BoundaryInteraction,
  state: EvolutionState,
  crustState: CrustalState,
  era: number,
  config: DifferentiationConfig
): void {
  // Collision occurs when both sides are buoyant (high maturity)
  const avgMaturityA = averageMaturity(interaction.boundaryCells, crustState, plateA);
  const avgMaturityB = averageMaturity(interaction.boundaryCells, crustState, plateB);

  const isCollision = avgMaturityA > config.collisionMaturityThreshold &&
                      avgMaturityB > config.collisionMaturityThreshold;

  if (!isCollision) {
    // Normal subduction: less mature plate subducts
    return applySubduction(interaction, state, crustState, era, config);
  }

  // Continental collision: thicken crust, increase maturity slightly
  const compressionRate = Math.abs(interaction.normalVelocity);

  for (const cell of interaction.boundaryCells) {
    // Massive crustal thickening (Himalayan-style)
    crustState.thickness[cell] += compressionRate * config.collisionThickeningRate;

    // Maturity increases slightly (metamorphism, partial melting)
    const currentMaturity = crustState.maturity[cell];
    crustState.maturity[cell] = Math.min(1.0, currentMaturity + config.collisionMaturityBoost);

    state.lastBoundaryEvent[cell] = BOUNDARY_EVENT.COLLISION_COMPRESSED;
    state.tectonicAccumulator[cell] += compressionRate * config.collisionAccumulation;
  }
}
```

---

## Part IV: Craton Nucleation and Growth

### The Craton Formation Process

Cratons don't form everywhere uniformly. They nucleate from particularly successful volcanic arcs:

```
Craton Nucleation Timeline:

Era 0-2: Volcanic arc forms at subduction zone
         - Maturity slowly increases (0.1 → 0.3)
         - Still "island arc" character

Era 3-4: Arc matures, becomes proto-continental
         - Maturity crosses threshold (0.3 → 0.5)
         - Buoyancy increases, resists subduction
         - Becomes "craton nucleus"

Era 5+:  Craton grows through:
         - More subduction on margins (adds material)
         - Collision with other proto-continents
         - Accretion of oceanic plateaus

Era N:   Mature craton (0.5 → 0.8+)
         - Thick, cold, stable lithosphere
         - Very high buoyancy
         - Can survive for billions of years
```

### Accretion: Growing Continents at Margins

Continental margins can "scrape off" material from subducting plates:

```typescript
function applyAccretion(
  interaction: BoundaryInteraction,
  state: EvolutionState,
  crustState: CrustalState,
  era: number,
  config: DifferentiationConfig
): void {
  // Accretion occurs at subduction zones where overriding plate is continental
  const overridingCells = findOverridingCells(interaction, state);

  for (const cell of overridingCells) {
    if (crustState.maturity[cell] < config.accretionMaturityThreshold) continue;

    // Find adjacent subducting cells
    const subductingNeighbors = findSubductingNeighbors(cell, interaction, state, mesh);

    for (const subCell of subductingNeighbors) {
      // Some fraction of subducting material gets "scraped off"
      const accretionFraction = config.accretionEfficiency;
      const transferredMaturity = crustState.maturity[subCell] * accretionFraction;

      // Add to continental margin
      crustState.maturity[cell] += transferredMaturity * 0.1;
      crustState.thickness[cell] += config.accretionThicknessBoost;
    }
  }
}
```

---

## Part V: The Complete Evolution Algorithm

### Revised Simulation Loop

```typescript
function runFirstPrinciplesEvolution(
  mesh: FoundationMesh,
  plateGraph: FoundationPlateGraph,
  config: FirstPrinciplesConfig
): TectonicEvolution {

  // CRITICAL CHANGE: Start with uniform oceanic crust
  const crustState: CrustalState = {
    maturity: new Float32Array(mesh.cellCount).fill(0.0),  // All oceanic
    thickness: new Float32Array(mesh.cellCount).fill(config.initialOceanicThickness),
    age: new Uint16Array(mesh.cellCount).fill(0),
    compositionCode: new Uint8Array(mesh.cellCount).fill(COMPOSITION_CODE.OCEANIC_YOUNG),
  };

  const state = initializeEvolutionState(mesh, plateGraph);
  const eraMasks: EraMask[] = [];

  for (let era = 0; era < config.eras; era++) {
    // 1. Detect all boundary interactions
    const interactions = computeAllBoundaryInteractions(state, plateGraph, mesh);

    // 2. Update kinematics (plates may change velocity based on configuration)
    if (config.dynamicKinematics) {
      updatePlateKinematics(plateGraph, crustState, config);
    }

    // 3. Process each interaction
    const updates = new CellUpdates();
    for (const interaction of interactions) {
      // Determine interaction type based on CURRENT crustal state
      const interactionType = classifyInteraction(interaction, crustState, config);

      switch (interactionType) {
        case INTERACTION_TYPE.OCEANIC_SUBDUCTION:
          // Pure oceanic: one plate subducts, other gets volcanic arc
          updates.merge(applyOceanicSubduction(interaction, state, crustState, era, config));
          // KEY: This is where differentiation happens
          applySubductionDifferentiation(interaction, state, crustState, era, config);
          break;

        case INTERACTION_TYPE.OCEAN_CONTINENT_SUBDUCTION:
          // Ocean subducts under continent, continent gets volcanic arc
          updates.merge(applyOceanContinentSubduction(interaction, state, crustState, era, config));
          applySubductionDifferentiation(interaction, state, crustState, era, config);
          applyAccretion(interaction, state, crustState, era, config);
          break;

        case INTERACTION_TYPE.CONTINENTAL_COLLISION:
          // Neither subducts, crust thickens
          updates.merge(applyContinentalCollision(interaction, state, crustState, era, config));
          break;

        case INTERACTION_TYPE.RIFTING:
          // New oceanic crust forms
          updates.merge(applyRifting(interaction, state, crustState, era, config));
          applyRiftingCrustReset(interaction, state, crustState, era, config);
          break;

        case INTERACTION_TYPE.TRANSFORM:
          // Shear, no significant differentiation
          updates.merge(applyTransform(interaction, state, crustState, era, config));
          break;
      }
    }

    // 4. Age all crust
    for (let i = 0; i < crustState.age.length; i++) {
      crustState.age[i] = Math.min(crustState.age[i] + 1, 65535);
    }

    // 5. Update composition codes from maturity
    updateCompositionCodes(crustState, config);

    // 6. Snapshot era mask
    eraMasks.push(snapshotEraMask(state, crustState, updates, era, config.eras));
  }

  return {
    eraMasks,
    finalState: state,
    crustState,
    derivedCrustType: deriveDiscreteCreustType(crustState),
  };
}
```

### Interaction Classification Based on Crustal State

The key insight: **what happens at a boundary depends on what's there now**, not what was pre-assigned:

```typescript
function classifyInteraction(
  interaction: BoundaryInteraction,
  crustState: CrustalState,
  config: DifferentiationConfig
): INTERACTION_TYPE {
  if (interaction.regime === BOUNDARY_TYPE.divergent) {
    return INTERACTION_TYPE.RIFTING;
  }

  if (interaction.regime === BOUNDARY_TYPE.transform) {
    return INTERACTION_TYPE.TRANSFORM;
  }

  // Convergent: classification depends on maturity of both sides
  const maturityA = averageMaturityForPlate(
    interaction.boundaryCells,
    crustState,
    interaction.plateA,
    state.currentPlateId
  );
  const maturityB = averageMaturityForPlate(
    interaction.boundaryCells,
    crustState,
    interaction.plateB,
    state.currentPlateId
  );

  const thresholdContinental = config.continentalMaturityThreshold; // e.g., 0.5

  const aIsContinental = maturityA >= thresholdContinental;
  const bIsContinental = maturityB >= thresholdContinental;

  if (aIsContinental && bIsContinental) {
    // Both buoyant: continental collision
    return INTERACTION_TYPE.CONTINENTAL_COLLISION;
  }

  if (aIsContinental || bIsContinental) {
    // One continental, one oceanic: ocean-continent subduction
    return INTERACTION_TYPE.OCEAN_CONTINENT_SUBDUCTION;
  }

  // Both oceanic: oceanic subduction (older/denser plate subducts)
  return INTERACTION_TYPE.OCEANIC_SUBDUCTION;
}
```

---

## Part VI: Emergent Continental Distribution

### The Target Becomes an Outcome

Instead of `continentalRatio: 0.37` as input, we have simulation parameters that *produce* a continental ratio:

```typescript
interface FirstPrinciplesConfig {
  eras: number;  // More eras = more differentiation = more continental crust

  differentiation: {
    // Rate of maturity increase at subduction zones
    rate: number;  // Higher = faster continent formation

    // Arc width (cells behind trench affected by volcanism)
    arcWidth: number;  // Wider = more continental growth per boundary

    // Accretion efficiency
    accretionRate: number;  // Higher = continents grow faster by scraping
  };

  // These parameters determine WHERE continents form (at persistent subduction zones)
  // and HOW MUCH total continental crust exists (integration of rate over time)
}
```

### Controlling the Outcome

Authors can influence the emergent land/ocean ratio through:

**1. Number of Eras**
```
Few eras (3-4):    Young planet, mostly oceanic, small proto-continents
Many eras (8-10):  Mature planet, substantial continental coverage
```

**2. Differentiation Rate**
```
Low rate (0.02):   Slow continent formation, ocean-dominated world
High rate (0.08):  Rapid differentiation, continent-rich world
```

**3. Plate Dynamics**
```
High subduction persistence: More boundaries = more differentiation = more continents
Frequent plate reorganization: Interrupted arcs = fragmented, smaller continents
```

**4. Kinematic Intent (from original proposal)**
```
"converging": Assembles continents → supercontinent
"dispersing": Rifts continents → multiple landmasses
"diverse": Complex pattern → Earth-like distribution
```

### Visual: Emergent Continental Evolution

```
Era 0: Uniform Oceanic Shell
┌────────────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└────────────────────────────────────────────────────────────────────┘
░ = oceanic basalt (maturity 0.0)

Era 2: Volcanic Arcs Form at Subduction Zones
┌────────────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░│
└────────────────────────────────────────────────────────────────────┘
▒ = island arc (maturity 0.2-0.3)

Era 4: Proto-Continents Emerge
┌────────────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░▓▓▓▒░░░░░░░░░░░░░░░░░░░░░▒▓▓▓░░░░░░░░░░░░░░░░░░░░▒░░░░░│
│░░░░░░░░░░░▓▓▓▒░░░░░░░░░░░░░░░░░░░░░▒▓▓▓░░░░░░░░░░░░░░░░░░░░▒░░░░░│
│░░░░░░░░░░░▓▓▓▒░░░░░░░░░░░░░░░░░░░░░▒▓▓▓░░░░░░░░░░░░░░░░░░░░▒░░░░░│
└────────────────────────────────────────────────────────────────────┘
▓ = proto-continental (maturity 0.5-0.6)
▒ = transitional (maturity 0.3-0.4)

Era 6: Continents Collide, Supercontinent Forms
┌────────────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░▒░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓███████▓▓▓░░░░░░░░░░░░░░░░░░░░░▒░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░▒░░░░░│
└────────────────────────────────────────────────────────────────────┘
█ = mature craton (maturity 0.8+)
▓ = continental (maturity 0.6-0.8)

Era 8: Supercontinent Rifts, New Oceans Open
┌────────────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░▓▓▓▓░░░░░░░░░░░░░░░░░░▓▓▓░░░░░░░░░░░░▓▓▒░░░░░░░░░░│
│░░░░░░░░░░░░░░░░▓██▓░░░░░░░░░░░░░░░░░░██▓░░░░░░░░░░░░▓▓▒░░░░░░░░░░│
│░░░░░░░░░░░░░░░░▓▓▓▓░░░░░░░░░░░░░░░░░░▓▓▓░░░░░░░░░░░░▓▓▒░░░░░░░░░░│
└────────────────────────────────────────────────────────────────────┘
New oceanic crust (░) forms at rift; continents separate
```

---

## Part VII: Thermal Blanketing and Supercontinent Dynamics

### Why Supercontinents Break Up

Large continental masses act as thermal blankets, insulating the mantle beneath:

```typescript
interface ThermalState {
  mantleHeat: Float32Array;  // Heat accumulation per cell
}

function applyThermalBlanketing(
  crustState: CrustalState,
  thermalState: ThermalState,
  era: number,
  config: ThermalConfig
): void {
  for (let i = 0; i < crustState.maturity.length; i++) {
    // Continental crust insulates
    if (crustState.maturity[i] > config.insulationThreshold) {
      // Heat accumulates underneath
      const insulationFactor = crustState.thickness[i] / config.referenceThickness;
      thermalState.mantleHeat[i] += config.heatAccumulationRate * insulationFactor;
    } else {
      // Oceanic crust allows heat escape
      thermalState.mantleHeat[i] *= config.heatDissipationFactor;
    }
  }
}

function checkRiftInitiation(
  thermalState: ThermalState,
  crustState: CrustalState,
  config: ThermalConfig
): number[] {
  const riftCandidates: number[] = [];

  for (let i = 0; i < thermalState.mantleHeat.length; i++) {
    if (thermalState.mantleHeat[i] > config.riftInitiationThreshold) {
      if (crustState.maturity[i] > config.continentalThreshold) {
        // Hot spot under continent: initiate rift
        riftCandidates.push(i);
      }
    }
  }

  return riftCandidates;
}
```

### Dynamic Plate Boundary Evolution

With thermal blanketing, **plate boundaries can change** over the simulation:

```
Supercontinent Assembly:
  - Subduction consumes oceanic crust
  - Continents converge
  - Heat builds up under supercontinent

Supercontinent at Maximum:
  - No more subduction possible (no oceanic crust between continents)
  - Heat continues accumulating
  - Mantle plumes form under thickest continental regions

Supercontinent Breakup:
  - Plume-driven rifting initiates
  - New divergent boundaries form WITHIN the supercontinent
  - New oceanic crust forms at spreading centers
  - Continents separate

This is the Wilson Cycle emerging from first principles.
```

---

## Part VIII: Output Artifacts

### New Artifact: CrustalEvolution

```typescript
interface FoundationCrustalEvolution {
  // Continuous crustal state
  maturity: Float32Array;       // 0.0 (oceanic) to 1.0 (cratonic)
  thickness: Float32Array;      // km equivalent
  age: Uint16Array;             // eras since formation

  // Discrete classification (for compatibility)
  compositionCode: Uint8Array;  // COMPOSITION_CODE enum

  // Derived: traditional oceanic/continental for downstream
  discreteCrustType: Uint8Array; // 0 = oceanic, 1 = continental

  // History tracking
  originEra: Uint8Array;        // When was this crust formed
  maxMaturityEra: Uint8Array;   // When did this reach peak maturity
  wasEverContinental: Uint8Array; // Has this ever been continental
}
```

### Backward Compatibility: Deriving Discrete Crust Type

For stages that expect binary oceanic/continental:

```typescript
function deriveDiscreteCreustType(
  crustState: CrustalState,
  threshold: number = 0.5
): Uint8Array {
  const result = new Uint8Array(crustState.maturity.length);

  for (let i = 0; i < result.length; i++) {
    result[i] = crustState.maturity[i] >= threshold ? 1 : 0;
  }

  return result;
}
```

### Enhanced Era Masks

Era masks now include crustal evolution information:

```typescript
interface EnhancedEraMask extends EraMask {
  // From original proposal
  activated: Uint8Array;
  eventType: Uint8Array;
  intensity: Uint8Array;
  terrainHint: Uint8Array;

  // NEW: Crustal state at this era
  maturitySnapshot: Float32Array;  // Maturity values at end of this era
  newContinentalCells: Uint8Array; // Cells that crossed continental threshold this era
  newOceanicCells: Uint8Array;     // Cells that became oceanic (rifting) this era
}
```

---

## Part IX: Configuration Schema

### First-Principles Configuration

```typescript
interface FirstPrinciplesConfig {
  // Core simulation
  eras: number;                    // 5-15 recommended for full continental evolution

  // Initial state
  initial: {
    mantleTemperature: number;     // Affects initial plate velocities
    crustThickness: number;        // Starting oceanic crust thickness (km)
    maturityNoise: number;         // Small variance in initial maturity (0-0.1)
  };

  // Differentiation rates
  differentiation: {
    subductionRate: number;        // Maturity increase per subduction era
    arcWidth: number;              // Cells affected by volcanic arc
    accretionRate: number;         // Margin growth from accretion
    collisionRate: number;         // Maturity boost from collision
    minSubductionAge: number;      // Crust must be this old to subduct efficiently
  };

  // Buoyancy thresholds (affects interaction classification)
  buoyancy: {
    continentalThreshold: number;  // Maturity above which = continental (default 0.5)
    collisionThreshold: number;    // Both must exceed this for collision (default 0.6)
    cratonicThreshold: number;     // Maturity for stable craton (default 0.85)
  };

  // Thermal dynamics
  thermal: {
    blanketingEnabled: boolean;    // Enable thermal blanketing feedback
    heatAccumulationRate: number;  // Heat buildup under continents
    riftInitiationThreshold: number; // Heat level to trigger rift
    plumeProbability: number;      // Chance of hotspot per era per hot cell
  };

  // Supercontinent control
  supercontinentCycle: {
    enabled: boolean;              // Allow boundary reorganization
    assemblyBias: number;          // Higher = faster assembly
    breakupDelay: number;          // Eras after assembly before breakup possible
  };
}
```

### Example: Earth-like Configuration

```typescript
const earthlikeFirstPrinciples: FirstPrinciplesConfig = {
  eras: 10,  // ~4 billion years in 10 steps

  initial: {
    mantleTemperature: 0.8,  // Warm mantle, active convection
    crustThickness: 7.0,     // Standard oceanic (km)
    maturityNoise: 0.05,     // Slight initial variation
  },

  differentiation: {
    subductionRate: 0.05,    // 5% maturity gain per subduction era
    arcWidth: 3,             // 3 cells behind trench
    accretionRate: 0.02,     // Slower accretion
    collisionRate: 0.03,     // Moderate collision maturity boost
    minSubductionAge: 2,     // Young crust subducts poorly
  },

  buoyancy: {
    continentalThreshold: 0.5,
    collisionThreshold: 0.55,
    cratonicThreshold: 0.85,
  },

  thermal: {
    blanketingEnabled: true,
    heatAccumulationRate: 0.1,
    riftInitiationThreshold: 1.5,
    plumeProbability: 0.05,
  },

  supercontinentCycle: {
    enabled: true,
    assemblyBias: 0.7,
    breakupDelay: 2,
  },
};
```

### Example: Ocean-Dominated World

```typescript
const waterWorldFirstPrinciples: FirstPrinciplesConfig = {
  eras: 6,  // Younger planet

  differentiation: {
    subductionRate: 0.03,    // Slower differentiation
    arcWidth: 2,             // Narrower arcs
    accretionRate: 0.01,     // Minimal accretion
    ...
  },

  // Lower maturity = less continental crust forms
  // Result: ~20% continental coverage
};
```

---

## Part X: Integration with Existing Pipeline

### New Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FIRST-PRINCIPLES PIPELINE                            │
│                                                                              │
│   INPUTS                                                                     │
│   ──────                                                                     │
│   • width, height, rngSeed                                                   │
│   • FirstPrinciplesConfig                                                    │
│   • KinematicsConfig (from previous proposal)                                │
│                                                                              │
│                                                                              │
│   STAGE 1: MESH + PLATES                                                     │
│   ──────────────────────                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  compute-mesh           →  FoundationMesh                           │   │
│   │  compute-plate-graph    →  FoundationPlateGraph (with kinematics)   │   │
│   │                             NOTE: NO CRUST ASSIGNMENT YET           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                                                                              │
│   STAGE 2: FIRST-PRINCIPLES EVOLUTION (NEW)                                  │
│   ─────────────────────────────────────────                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  initialize-uniform-oceanic  →  CrustalState (all maturity = 0)     │   │
│   │                                                                      │   │
│   │  FOR era = 0 TO N:                                                   │   │
│   │    compute-interactions                                              │   │
│   │    apply-differentiation     →  maturity increases at arcs          │   │
│   │    apply-material-flow       →  subduction/rifting/collision        │   │
│   │    apply-thermal-feedback    →  heat accumulation/rifting           │   │
│   │    snapshot-era-mask         →  EraMask[era]                        │   │
│   │                                                                      │   │
│   │  OUTPUT:                                                             │   │
│   │    FoundationCrustalEvolution  (maturity, thickness, age, etc.)     │   │
│   │    FoundationTectonicEvolution (era masks, event history)           │   │
│   │    FoundationCrust             (DERIVED: binary oceanic/continental)│   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                                                                              │
│   STAGE 3: PROJECTION (unchanged from previous proposal)                     │
│   ────────────────────────────────────────────────────                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  project-to-tiles  →  All artifacts in tile-space                   │   │
│   │                       Including: maturity, thickness, era masks     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                              MORPHOLOGY DOMAIN
                              (unchanged consumption)
```

### Eliminating the compute-crust Step

In first-principles mode, the old `compute-crust` step is **entirely replaced**:

```typescript
// OLD (current system):
const crust = computeCrust(mesh, config.continentalRatio, ...);
// Crust is pre-assigned before any plate dynamics

// NEW (first-principles):
const initialCrust = initializeUniformOceanic(mesh, config.initial);
const { crustalEvolution, tectonicEvolution } = runFirstPrinciplesEvolution(
  mesh, plateGraph, initialCrust, config
);
const crust = deriveDiscreteCreustType(crustalEvolution);
// Crust EMERGES from simulation
```

### Backward Compatibility Mode

For maps that don't want full simulation, keep the old path:

```typescript
interface FoundationConfig {
  mode: "classic" | "first-principles";

  // If mode === "classic": use these (current behavior)
  classic?: {
    continentalRatio: number;
    // ... existing crust config
  };

  // If mode === "first-principles": use these
  firstPrinciples?: FirstPrinciplesConfig;
}
```

---

## Part XI: Answering Your Question Directly

### "Does your latest proposal already support this?"

**No, not directly.** The Tectonic Evolution Engine proposal assumes pre-existing crust types. It tracks material flow and produces era masks, but it doesn't model crustal differentiation.

### "Could it easily be extended?"

**Yes.** The extension is architecturally clean:

1. **Add CrustalState** alongside TectonicEvolutionState
2. **Initialize with uniform oceanic** instead of pre-assigned crust
3. **Add differentiation logic** to the subduction handler
4. **Derive discrete crust type** at the end

The core simulation loop stays the same; we're adding a new dimension (maturity evolution) that runs in parallel with the existing position/event tracking.

### Key Changes Summary

| Component | Original Proposal | First-Principles Extension |
|-----------|------------------|----------------------------|
| Initial crust | Pre-assigned via `compute-crust` | Uniform oceanic (maturity=0) |
| Crust type | Input to simulation | Output of simulation |
| Subduction effect | Consumes cells | Consumes cells + differentiates arc |
| Rifting effect | Creates new oceanic | Creates new oceanic (maturity=0) |
| Continental ratio | Configuration parameter | Emergent from dynamics |
| Buoyancy | Implicit in crust type | Explicit from maturity/thickness |
| Era masks | Event type + intensity | + maturity snapshot + composition changes |

---

## Part XII: Computational Considerations

### Is This More Expensive?

**Marginally.** The additional computation per era:
- Maturity updates at arc cells: O(arc width × boundaries)
- Thermal blanketing check: O(cells)
- Composition code update: O(cells)

This is all O(cells) work, same complexity class as existing operations.

### Memory Cost

Additional arrays per cell:
- `maturity`: Float32 (4 bytes)
- `thickness`: Float32 (4 bytes)
- `mantleHeat` (if thermal): Float32 (4 bytes)

For 3000 mesh cells: ~36 KB additional. Negligible.

### Tuning for Performance vs Realism

```typescript
// Fast mode: fewer eras, simpler dynamics
firstPrinciples: {
  eras: 5,
  thermal: { blanketingEnabled: false },
  supercontinentCycle: { enabled: false },
}

// Realistic mode: full simulation
firstPrinciples: {
  eras: 12,
  thermal: { blanketingEnabled: true },
  supercontinentCycle: { enabled: true },
}
```

---

## Part XIII: Visual Summary

### The Full Picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FIRST-PRINCIPLES CRUSTAL EVOLUTION                        │
│                                                                              │
│   START: Uniform Oceanic Shell                                               │
│   ─────────────────────────────                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│   │ maturity: 0.0 everywhere, composition: OCEANIC_YOUNG                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     ▼                                        │
│   PROCESS: Subduction + Differentiation                                      │
│   ─────────────────────────────────────                                      │
│                                                                              │
│       Oceanic A         │    Oceanic B                                       │
│   ░░░░░░░░░░░░░░░░░░   │   ░░░░░░░░░░░░░░░░░░░░░░░                          │
│   ░░░░░░░░░░░░░░░░░░   │   ░░░░░░░░░░░░░░░░░░░░░░░                          │
│                        │←subduction                                          │
│                                                                              │
│       After subduction:                                                      │
│   ░░░░░░░░░░░░░▒▒▒░░   │   ░░░░░░░░░░░░░░░░░░░░░                            │
│   ░░░░░░░░░░░░░▒▒▒░░   │   ░░░░░░░░░░░░░░░░░░░░░                            │
│                ↑                                                             │
│         Volcanic arc: maturity increases to 0.2-0.3                          │
│                                                                              │
│                                     │                                        │
│                                     ▼                                        │
│   ACCUMULATE: Over Many Eras                                                 │
│   ──────────────────────────                                                 │
│                                                                              │
│   Era 2: ░░░░░░░░▒▒▒▒░░  Era 4: ░░░░░▒▒▓▓▓▒░  Era 6: ░░░▒▓▓███▓▓▒░         │
│          arcs grow              arcs thicken         cratons form            │
│                                                                              │
│                                     │                                        │
│                                     ▼                                        │
│   END: Emergent Continental Distribution                                     │
│   ──────────────────────────────────────                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ ░░░░░░░░░░░░░░░░░░░░▓▓▓███▓▓▓░░░░░░░░░░░░░░░░░░░░▓▓▓▓░░░░░░░░░░░░ │   │
│   │ ░░░░░░░░░░░░░░░░░░░▓▓▓████▓▓▓░░░░░░░░░░░░░░░░░░░░▓██▓░░░░░░░░░░░░ │   │
│   │ Continental ratio EMERGES from dynamics, not pre-assigned          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   OUTPUTS:                                                                   │
│   ────────                                                                   │
│   • CrustalEvolution: maturity[i], thickness[i], age[i] per cell            │
│   • TectonicEvolution: era masks, event history (from original proposal)    │
│   • Derived discrete crust type (for backward compatibility)                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix: Glossary of First-Principles Terms

| Term | Definition |
|------|------------|
| **Crustal maturity** | Continuous 0-1 measure of differentiation from basalt toward granite |
| **Differentiation** | Chemical process separating light (silicic) from heavy (mafic) rock |
| **Craton** | Ancient, thick, stable continental nucleus (maturity > 0.85) |
| **Volcanic arc** | Zone of magmatism above subducting slab, where differentiation occurs |
| **Thermal blanketing** | Heat accumulation under continental lithosphere |
| **Wilson Cycle** | Supercontinent assembly → breakup → reassembly cycle |
| **Stagnant lid** | Tectonic regime with one connected shell, no subduction (Venus-like) |
| **Mobile lid** | Tectonic regime with plate tectonics and subduction (Earth) |

---

## Appendix: Research Citation Mapping

The physics in this proposal maps to the research you provided:

| Research Point | Implementation |
|----------------|----------------|
| "Global basaltic lid initially" | `maturity: 0.0` everywhere at start |
| "Differentiation creates lighter rock" | Subduction increases maturity at arcs |
| "Cratons are seeds of continents" | High-maturity cells become cratons |
| "Water weakens rock, enables subduction" | Implicit in subduction being possible |
| "Thermal blanketing under supercontinents" | `ThermalState.mantleHeat` accumulation |
| "Supercontinents are emergent, not initial" | Wilson cycle from thermal feedback |
| "Stagnant lid is default; Earth is special" | Could model by disabling subduction |
