# Tectonic Evolution Engine: A Forward Simulation Proposal

## Executive Summary

This proposal introduces a **forward-simulating tectonic evolution engine** that replaces the current backward-drift hack with a proper time-stepped simulation. The engine tracks material flow through plate boundaries, simulates subduction and accretion, and produces **per-era activation masks** that downstream stages can use to determine terrain age and character.

The current system answers: *"Where were boundaries in the past?"*

The proposed system answers: *"What happened to each piece of crust over geological time?"*

---

## Part I: Analysis of the Current System

### What the Current System Does

The existing `compute-tectonic-history` implementation uses a **backward-drift** approach:

```
Current Boundary Positions (Era 2, "now")
         │
         ▼
    ┌─────────────────────────────────────┐
    │  For each segment at position P:    │
    │    Era 2: use P directly            │
    │    Era 1: drift P by 1 step → P'    │
    │    Era 0: drift P by 2 steps → P''  │
    └─────────────────────────────────────┘
         │
         ▼
Per-era influence fields (uplift, rift, etc.)
```

**Key implementation details** (from `compute-tectonic-history/index.ts:164-167`):

```typescript
for (let step = 0; step < params.driftSteps; step++) {
  a = chooseDriftNeighbor({ cellId: a, driftU, driftV, mesh: params.mesh });
  b = chooseDriftNeighbor({ cellId: b, driftU, driftV, mesh: params.mesh });
}
```

This moves the *boundary position* backwards along the drift vector, then applies influence spreading from that drifted position.

### Fundamental Limitations

| Limitation | Impact |
|------------|--------|
| **No material tracking** | Can't know "how old is the crust at this location?" |
| **No subduction** | Convergent boundaries don't consume material |
| **No accretion** | Divergent boundaries don't create new material |
| **Static plate geometry** | Plates don't change shape over time |
| **Backward extrapolation** | Assumes current velocities held constant into the past |
| **No collision modeling** | Continental collisions don't deform plate shapes |
| **Mesh-space only** | Era data not properly projected to tile-space |

### What the Current System Produces

```typescript
FoundationTectonicHistory {
  eras: Array<{
    boundaryType: Uint8Array;     // Regime at this era's drifted position
    upliftPotential: Uint8Array;  // Influence-spread values
    riftPotential: Uint8Array;
    shearStress: Uint8Array;
    volcanism: Uint8Array;
    fracture: Uint8Array;
  }>;
  upliftTotal: Uint8Array;         // Sum across eras
  lastActiveEra: Uint8Array;       // Which era last affected this cell
  upliftRecentFraction: Uint8Array; // Fraction from newest era
}
```

**The problem**: These are *influence intensities*, not *activation records*. A cell with `upliftPotential[i] = 100` in Era 1 tells us it was *near* a convergent boundary, but not:
- Was it *on* the boundary or just nearby?
- Was it the *overriding* plate or the *subducting* plate?
- How much material flowed through this location?
- What was here before vs what is here now?

---

## Part II: The Forward Simulation Model

### Core Concept: Lagrangian Material Tracking

Instead of asking "where were boundaries?", we ask "what happened to each piece of crust?"

The key insight is to track **material parcels** through time:

```
Era 0 (Initial State)         Era 1 (After Motion)         Era 2 (Present)

    A A A │ B B B                A A │ A B B B                A │ A A B B B
    A A A │ B B B       →        A A │ A B B B       →        A │ A A B B B
    A A A │ B B B                A A │ A B B B                A │ A A B B B
          ↑                           ↑                            ↑
    Boundary at x=3              Boundary at x=2              Boundary at x=1

    Plate B is subducting under Plate A (moving left)
    Material that was at x=6,7 in Era 0 is now gone (subducted)
    Plate A has grown by accretion of B's consumed territory
```

### The Evolution State

We introduce a new data structure that tracks the **evolution history** of each spatial location:

```typescript
interface TectonicEvolutionState {
  // Per mesh cell: which plate currently owns this cell
  currentPlateId: Int16Array;

  // Per mesh cell: when was this cell last at a plate boundary?
  lastBoundaryEra: Uint8Array;   // 255 = never, 0 = Era 0, etc.

  // Per mesh cell: what type of boundary event last affected it?
  lastBoundaryEvent: Uint8Array; // BOUNDARY_EVENT enum

  // Per mesh cell: how much total "tectonic work" has occurred here?
  tectonicAccumulator: Float32Array;

  // Per mesh cell: age of the crust (in simulation steps)
  crustAge: Uint16Array;  // 0 = newly created, max = ancient

  // Per mesh cell: origin tracking
  originPlateId: Int16Array;  // Which plate did this crust originate from?
  originEra: Uint8Array;      // When was this crust created (or simulation start)?
}
```

### Boundary Event Types

```typescript
enum BOUNDARY_EVENT {
  NONE = 0,
  SUBDUCTION_OVERRIDING = 1,  // This cell is on the plate that "wins"
  SUBDUCTION_CONSUMED = 2,     // This cell was subducted (material gone)
  RIFT_CREATED = 3,            // This cell contains newly created oceanic crust
  TRANSFORM_SHEARED = 4,       // This cell experienced shear stress
  COLLISION_COMPRESSED = 5,    // Continental collision (neither subducts)
  ACCRETION_ADDED = 6,         // Oceanic material scraped onto continent
}
```

---

## Part III: The Simulation Algorithm

### Overview

The simulation runs **forward through time**, from Era 0 to Era N:

```
┌────────────────────────────────────────────────────────────────────────┐
│                    TECTONIC EVOLUTION ENGINE                           │
│                                                                        │
│   ┌──────────────┐                                                     │
│   │ Initial State │  Plates, crust, velocities from plate-graph       │
│   └──────┬───────┘                                                     │
│          │                                                             │
│          ▼                                                             │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │                    FOR EACH ERA (0 to N):                     │    │
│   │                                                               │    │
│   │   1. COMPUTE BOUNDARY INTERACTIONS                            │    │
│   │      - Identify all plate-plate boundaries                    │    │
│   │      - Classify regime (convergent/divergent/transform)       │    │
│   │      - Determine interaction outcome                          │    │
│   │                                                               │    │
│   │   2. APPLY MATERIAL FLOW                                      │    │
│   │      - Subduction: mark consumed cells, transfer ownership    │    │
│   │      - Rifting: create new oceanic cells at spreading center  │    │
│   │      - Transform: mark sheared cells                          │    │
│   │      - Collision: mark compressed cells, thicken crust        │    │
│   │                                                               │    │
│   │   3. UPDATE EVOLUTION STATE                                   │    │
│   │      - Record boundary events per cell                        │    │
│   │      - Update crust age (increment existing, set 0 for new)   │    │
│   │      - Accumulate tectonic work                               │    │
│   │                                                               │    │
│   │   4. SNAPSHOT ERA MASK                                        │    │
│   │      - Record which cells were activated this era             │    │
│   │      - Record activation type per cell                        │    │
│   │                                                               │    │
│   └──────────────────────────────────────────────────────────────┘    │
│          │                                                             │
│          ▼                                                             │
│   ┌──────────────────┐                                                │
│   │ Final Artifacts   │  Era masks, evolution state, accumulations    │
│   └──────────────────┘                                                │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Compute Boundary Interactions

For each pair of adjacent plates, compute the relative motion and classify:

```typescript
interface BoundaryInteraction {
  plateA: number;
  plateB: number;
  boundaryCells: number[];  // Cells along this boundary
  regime: BOUNDARY_TYPE;    // convergent, divergent, transform
  intensity: number;        // Magnitude of relative motion
  normalVelocity: number;   // Motion perpendicular to boundary (+ = diverging)
  tangentVelocity: number;  // Motion parallel to boundary (shear)

  // For convergent boundaries:
  subductingPlate: number | null;  // Which plate subducts (if any)
  subductionAngle: number;         // Slab dip angle (affects volcanic arc)
}

function computeBoundaryInteraction(
  plateA: PlateKinematics,
  plateB: PlateKinematics,
  boundaryCells: number[],
  mesh: FoundationMesh,
  crust: FoundationCrust
): BoundaryInteraction {
  // Compute average boundary position and normal
  const { centroid, normal } = computeBoundaryGeometry(boundaryCells, mesh);

  // Compute relative velocity at boundary
  const vA = plateVelocityAt(plateA, centroid);
  const vB = plateVelocityAt(plateB, centroid);
  const relativeV = subtract(vB, vA);

  // Decompose into normal and tangent components
  const normalV = dot(relativeV, normal);
  const tangentV = dot(relativeV, perpendicular(normal));

  // Classify regime
  const regime = classifyRegime(normalV, tangentV);

  // For convergent: determine which plate subducts
  let subductingPlate = null;
  if (regime === BOUNDARY_TYPE.convergent) {
    subductingPlate = determineSubductingPlate(plateA, plateB, boundaryCells, crust);
  }

  return {
    plateA: plateA.id,
    plateB: plateB.id,
    boundaryCells,
    regime,
    intensity: magnitude(relativeV),
    normalVelocity: normalV,
    tangentVelocity: tangentV,
    subductingPlate,
    subductionAngle: computeSlabAngle(normalV, subductingPlate),
  };
}
```

### Step 2: Apply Material Flow

This is the core of the simulation. Each boundary type has different material effects:

#### 2a. Subduction (Convergent with Oceanic Crust)

When oceanic crust meets continental (or younger oceanic meets older oceanic):

```typescript
function applySubduction(
  interaction: BoundaryInteraction,
  state: TectonicEvolutionState,
  era: number,
  config: EvolutionConfig
): CellUpdates {
  const updates: CellUpdates = { consumed: [], transferred: [], volcanic: [] };

  // How many cells are consumed this era? Based on convergence rate
  const consumptionRate = Math.abs(interaction.normalVelocity) * config.subductionEfficiency;
  const cellsToConsume = Math.floor(consumptionRate);

  // Find cells on the subducting plate adjacent to boundary
  const subductingCells = findSubductingCells(
    interaction.boundaryCells,
    interaction.subductingPlate,
    state.currentPlateId,
    mesh
  );

  // Mark cells as consumed (they "disappear" into the mantle)
  for (let i = 0; i < Math.min(cellsToConsume, subductingCells.length); i++) {
    const cell = subductingCells[i];
    updates.consumed.push(cell);

    // Record the event
    state.lastBoundaryEra[cell] = era;
    state.lastBoundaryEvent[cell] = BOUNDARY_EVENT.SUBDUCTION_CONSUMED;
  }

  // Cells on overriding plate get volcanic potential
  const overridingCells = findOverridingArcCells(
    interaction.boundaryCells,
    interaction.subductingPlate,
    interaction.subductionAngle,
    state,
    mesh
  );

  for (const cell of overridingCells) {
    updates.volcanic.push(cell);
    state.lastBoundaryEra[cell] = era;
    state.lastBoundaryEvent[cell] = BOUNDARY_EVENT.SUBDUCTION_OVERRIDING;
    state.tectonicAccumulator[cell] += interaction.intensity * config.volcanicAccumulation;
  }

  return updates;
}
```

**Visual: Subduction Process**

```
Before Subduction (Era N):

    Continental (A)     │    Oceanic (B) moving left ←
    ┌─────────────────┐ │ ┌─────────────────────────┐
    │ A A A A A A A A │ │ │ B B B B B B B B B B B B │
    │ A A A A A A A A │ │ │ B B B B B B B B B B B B │
    └─────────────────┘ │ └─────────────────────────┘
                        ↑
                   Boundary

After Subduction (Era N+1):

    Continental (A)     │ Oceanic (B) - 2 cells consumed
    ┌─────────────────┐ │ ┌───────────────────────┐
    │ A A A A A A A A │ │ │ B B B B B B B B B B   │ ← 2 cells gone
    │ A A A A A A A A │ │ │ B B B B B B B B B B   │
    └─────────────────┘ │ └───────────────────────┘
                        ↑
              Boundary moved right
              (Plate A "expanded" over consumed B territory)

    Cells marked:
    - Former B cells at boundary: SUBDUCTION_CONSUMED
    - A cells near boundary: SUBDUCTION_OVERRIDING (volcanic arc)
```

#### 2b. Rifting (Divergent Boundaries)

When plates move apart, new oceanic crust forms at the spreading center:

```typescript
function applyRifting(
  interaction: BoundaryInteraction,
  state: TectonicEvolutionState,
  era: number,
  config: EvolutionConfig
): CellUpdates {
  const updates: CellUpdates = { created: [], rifted: [] };

  // How much new crust forms? Based on spreading rate
  const spreadingRate = Math.abs(interaction.normalVelocity) * config.spreadingEfficiency;

  // Cells at the boundary become "rift zone"
  for (const cell of interaction.boundaryCells) {
    state.lastBoundaryEra[cell] = era;
    state.lastBoundaryEvent[cell] = BOUNDARY_EVENT.RIFT_CREATED;

    // New crust at spreading center is age 0
    state.crustAge[cell] = 0;

    // New crust is oceanic
    state.originEra[cell] = era;

    // Record rift potential (for downstream basins)
    state.tectonicAccumulator[cell] += spreadingRate * config.riftAccumulation;

    updates.created.push(cell);
  }

  // Cells adjacent to boundary get rift influence
  const riftShoulderCells = findAdjacentCells(interaction.boundaryCells, mesh, 2);
  for (const cell of riftShoulderCells) {
    if (!updates.created.includes(cell)) {
      updates.rifted.push(cell);
      state.tectonicAccumulator[cell] += spreadingRate * config.riftShoulderAccumulation;
    }
  }

  return updates;
}
```

**Visual: Rifting Process**

```
Before Rifting (Era N):

    ┌──────────────────────────────────────────┐
    │ A A A A A A A A A│A A A A A A A A A A A A│
    │ A A A A A A A A A│A A A A A A A A A A A A│
    └──────────────────────────────────────────┘
                       ↑
                 Rift initiating

After Rifting (Era N+1):

    ← A moving left          B moving right →
    ┌───────────────────┐ ┌───────────────────┐
    │ A A A A A A A A A │ │ B B B B B B B B B │
    │ A A A A A A A A A │ │ B B B B B B B B B │
    └───────────────────┘ └───────────────────┘
                       │ │
                       └─┘
                    New oceanic crust (age=0)
                    marked RIFT_CREATED
```

#### 2c. Transform Boundaries

Plates slide past each other without creating or destroying material:

```typescript
function applyTransform(
  interaction: BoundaryInteraction,
  state: TectonicEvolutionState,
  era: number,
  config: EvolutionConfig
): CellUpdates {
  const updates: CellUpdates = { sheared: [] };

  const shearStress = Math.abs(interaction.tangentVelocity);

  for (const cell of interaction.boundaryCells) {
    state.lastBoundaryEra[cell] = era;
    state.lastBoundaryEvent[cell] = BOUNDARY_EVENT.TRANSFORM_SHEARED;
    state.tectonicAccumulator[cell] += shearStress * config.shearAccumulation;
    updates.sheared.push(cell);
  }

  // Transform faults can have minor volcanism at restraining bends
  // and pull-apart basins at releasing bends
  // (Advanced: detect bend geometry and apply accordingly)

  return updates;
}
```

#### 2d. Continental Collision

When two continental plates converge, neither subducts - instead, crust thickens:

```typescript
function applyContinentalCollision(
  interaction: BoundaryInteraction,
  state: TectonicEvolutionState,
  era: number,
  config: EvolutionConfig
): CellUpdates {
  const updates: CellUpdates = { compressed: [] };

  const compressionRate = Math.abs(interaction.normalVelocity);

  for (const cell of interaction.boundaryCells) {
    state.lastBoundaryEra[cell] = era;
    state.lastBoundaryEvent[cell] = BOUNDARY_EVENT.COLLISION_COMPRESSED;

    // Collision causes massive uplift accumulation
    state.tectonicAccumulator[cell] += compressionRate * config.collisionAccumulation;

    updates.compressed.push(cell);
  }

  // Collision affects a wider zone than subduction
  const collisionZone = findAdjacentCells(interaction.boundaryCells, mesh, config.collisionZoneWidth);
  for (const cell of collisionZone) {
    if (!updates.compressed.includes(cell)) {
      state.tectonicAccumulator[cell] += compressionRate * config.collisionZoneAccumulation;
    }
  }

  return updates;
}
```

### Step 3: Update Evolution State

After processing all boundaries:

```typescript
function updateEvolutionState(
  state: TectonicEvolutionState,
  updates: AllCellUpdates,
  era: number
): void {
  // Age all existing crust by one era
  for (let i = 0; i < state.crustAge.length; i++) {
    if (!updates.consumed.includes(i) && !updates.created.includes(i)) {
      state.crustAge[i] = Math.min(state.crustAge[i] + 1, 65535);
    }
  }

  // Transfer ownership for consumed cells
  for (const cell of updates.consumed) {
    // Cell is now "owned" by the overriding plate
    // (or marked as removed if we track that)
    state.currentPlateId[cell] = updates.newOwner[cell];
  }

  // New cells get fresh state
  for (const cell of updates.created) {
    state.crustAge[cell] = 0;
    state.originEra[cell] = era;
  }
}
```

### Step 4: Snapshot Era Mask

The key output for downstream consumption:

```typescript
interface EraMask {
  // Which cells were activated this era
  activated: Uint8Array;  // 1 = activated, 0 = inactive

  // What happened at each activated cell
  eventType: Uint8Array;  // BOUNDARY_EVENT values

  // Intensity of the event (0-255)
  intensity: Uint8Array;

  // For morphology: what kind of terrain does this event produce?
  terrainHint: Uint8Array;  // TERRAIN_HINT enum
}

enum TERRAIN_HINT {
  NONE = 0,
  MOUNTAIN_YOUNG = 1,        // Recent collision or subduction arc
  MOUNTAIN_MATURE = 2,       // Older orogeny, some erosion
  RIFT_VALLEY = 3,           // Active rifting
  RIFT_SHOULDER = 4,         // Elevated rift flanks
  VOLCANIC_ARC = 5,          // Subduction volcanism
  TRANSFORM_RIDGE = 6,       // Shear zone topography
  OCEANIC_RIDGE = 7,         // Mid-ocean spreading center
  STABLE_CRATON = 8,         // Never activated, ancient stable
}

function snapshotEraMask(
  state: TectonicEvolutionState,
  updates: AllCellUpdates,
  era: number,
  totalEras: number
): EraMask {
  const cellCount = state.currentPlateId.length;
  const mask: EraMask = {
    activated: new Uint8Array(cellCount),
    eventType: new Uint8Array(cellCount),
    intensity: new Uint8Array(cellCount),
    terrainHint: new Uint8Array(cellCount),
  };

  // Mark all affected cells
  const allAffected = [
    ...updates.consumed,
    ...updates.transferred,
    ...updates.volcanic,
    ...updates.created,
    ...updates.rifted,
    ...updates.sheared,
    ...updates.compressed,
  ];

  for (const cell of allAffected) {
    mask.activated[cell] = 1;
    mask.eventType[cell] = state.lastBoundaryEvent[cell];
    mask.intensity[cell] = computeIntensity(state.tectonicAccumulator[cell]);
    mask.terrainHint[cell] = deriveTerrainHint(
      state.lastBoundaryEvent[cell],
      era,
      totalEras,
      state.crustAge[cell]
    );
  }

  return mask;
}
```

---

## Part IV: Output Artifacts

### New Artifact: TectonicEvolution

```typescript
interface FoundationTectonicEvolution {
  // Configuration
  eraCount: number;

  // Per-era masks (the key output for morphology)
  eraMasks: EraMask[];

  // Final state after all eras
  finalState: {
    plateId: Int16Array;           // Current plate ownership
    crustAge: Uint16Array;         // Age in simulation steps
    originEra: Uint8Array;         // When was this crust created
    lastBoundaryEra: Uint8Array;   // When was last tectonic event
    lastBoundaryEvent: Uint8Array; // What type of event
    tectonicAccumulator: Float32Array; // Total "work" done here
  };

  // Derived convenience fields
  isAncientCraton: Uint8Array;     // Never activated, old
  isYoungOrogen: Uint8Array;       // Activated in recent eras
  isActiveRift: Uint8Array;        // Rifting in most recent era
  isVolcanicArc: Uint8Array;       // Subduction volcanism
}
```

### Projected to Tile-Space

```typescript
interface FoundationTectonicEvolutionTiles {
  // Per tile, sampled from mesh
  eraOfLastActivity: Uint8Array;    // 255 = never, 0 = oldest era
  activityType: Uint8Array;         // BOUNDARY_EVENT
  crustAge: Uint16Array;            // Tile-space crust age
  tectonicWork: Uint8Array;         // Accumulated stress/uplift
  terrainHint: Uint8Array;          // TERRAIN_HINT

  // Era-specific masks (projected to tiles)
  eraMasks: Array<{
    activated: Uint8Array;
    eventType: Uint8Array;
    intensity: Uint8Array;
  }>;
}
```

---

## Part V: Downstream Consumption

### How Morphology Uses Era Masks

The key value of this system is that morphology can make **era-aware decisions**:

```typescript
// In morphology: compute-base-topography

function computeMountainPotential(
  tile: number,
  evolution: FoundationTectonicEvolutionTiles,
  config: MountainConfig
): number {
  const lastActiveEra = evolution.eraOfLastActivity[tile];
  const activityType = evolution.activityType[tile];
  const tectonicWork = evolution.tectonicWork[tile];

  // Never active = stable craton, no mountains
  if (lastActiveEra === 255) {
    return 0;
  }

  // Young orogeny = tall, steep mountains
  const eraRecency = 1 - (lastActiveEra / evolution.eraCount);
  const ageMultiplier = config.recentOrogenyBoost * eraRecency +
                        config.ancientOrogenyBase * (1 - eraRecency);

  // Event type affects mountain character
  let eventMultiplier = 1.0;
  switch (activityType) {
    case BOUNDARY_EVENT.COLLISION_COMPRESSED:
      eventMultiplier = config.collisionMultiplier;  // Highest mountains
      break;
    case BOUNDARY_EVENT.SUBDUCTION_OVERRIDING:
      eventMultiplier = config.volcanoArcMultiplier; // Volcanic peaks
      break;
    case BOUNDARY_EVENT.RIFT_CREATED:
      eventMultiplier = config.riftShoulderMultiplier; // Rift shoulders
      break;
    default:
      eventMultiplier = config.defaultMultiplier;
  }

  return tectonicWork * ageMultiplier * eventMultiplier;
}
```

### Era Mask Visualization (What Morphology Sees)

```
Era 0 Mask (Oldest):                Era 1 Mask:                    Era 2 Mask (Newest):

□ □ □ □ □ □ □ □ □ □                □ □ □ □ □ □ □ □ □ □            □ □ □ □ □ □ □ □ □ □
□ □ □ □ □ □ □ □ □ □                □ □ □ □ □ □ □ □ □ □            □ □ □ □ □ □ □ □ □ □
□ □ ■ ■ ■ □ □ □ □ □                □ □ □ ■ ■ ■ □ □ □ □            □ □ □ □ ■ ■ ■ □ □ □
□ □ ■ ■ ■ □ □ □ □ □    →           □ □ □ ■ ■ ■ □ □ □ □    →       □ □ □ □ ■ ■ ■ □ □ □
□ □ ■ ■ ■ □ □ □ □ □                □ □ □ ■ ■ ■ □ □ □ □            □ □ □ □ ■ ■ ■ □ □ □
□ □ □ □ □ □ □ □ □ □                □ □ □ □ □ □ □ □ □ □            □ □ □ □ □ □ □ □ □ □

■ = activated cells

Morphology sees:
- Cells activated in Era 0 only → ancient mountains, heavily eroded
- Cells activated in Era 1 only → mature mountains, some erosion
- Cells activated in Era 2 only → young mountains, steep and tall
- Cells activated in multiple eras → complex history, layered terrain
```

### Volcano Placement Using Era Masks

```typescript
function computeVolcanoPotential(
  tile: number,
  evolution: FoundationTectonicEvolutionTiles,
  config: VolcanoConfig
): number {
  // Only recent volcanic activity produces active volcanoes
  const lastActiveEra = evolution.eraOfLastActivity[tile];
  const activityType = evolution.activityType[tile];

  if (lastActiveEra === 255) return 0;

  const isRecentEnough = lastActiveEra >= evolution.eraCount - config.activeErasForVolcanism;
  if (!isRecentEnough) return 0;

  const isVolcanicEvent =
    activityType === BOUNDARY_EVENT.SUBDUCTION_OVERRIDING ||
    activityType === BOUNDARY_EVENT.RIFT_CREATED;

  if (!isVolcanicEvent) return 0;

  // Intensity based on tectonic work and recency
  return evolution.tectonicWork[tile] * config.volcanoIntensityScale;
}
```

### Hill Placement Using Crust Age

```typescript
function computeHillPotential(
  tile: number,
  evolution: FoundationTectonicEvolutionTiles,
  config: HillConfig
): number {
  const crustAge = evolution.crustAge[tile];
  const lastActiveEra = evolution.eraOfLastActivity[tile];

  // Ancient cratons: old, eroded, gentle hills
  if (lastActiveEra === 255 && crustAge > config.ancientAgeThreshold) {
    return config.cratonHillBase;
  }

  // Old orogenies: eroded mountains become hills
  if (lastActiveEra < evolution.eraCount - 2 && evolution.tectonicWork[tile] > config.workThreshold) {
    const erosionFactor = (evolution.eraCount - lastActiveEra) / evolution.eraCount;
    return evolution.tectonicWork[tile] * erosionFactor * config.erodedMountainHillFactor;
  }

  // Rift shoulders: elevated flanks
  if (evolution.activityType[tile] === BOUNDARY_EVENT.RIFT_CREATED) {
    return config.riftShoulderHillBase;
  }

  return 0;
}
```

---

## Part VI: Configuration Schema

### Evolution Engine Configuration

```typescript
interface TectonicEvolutionConfig {
  // Number of simulation steps (eras)
  eras: number;  // 3-10 recommended

  // Simulation rates (how fast things happen per era)
  rates: {
    subduction: number;      // Cells consumed per unit convergence velocity
    spreading: number;       // Cells created per unit divergence velocity
    collision: number;       // Compression accumulation rate
    shear: number;           // Shear accumulation rate
  };

  // Influence zones
  zones: {
    volcanicArcWidth: number;   // Cells behind subduction boundary affected
    collisionZoneWidth: number; // Width of collision deformation
    riftShoulderWidth: number;  // Width of rift flank uplift
  };

  // Thresholds for classification
  thresholds: {
    ancientCratonAge: number;   // Age above which crust is "ancient"
    recentActivityEras: number; // Eras from present considered "recent"
  };
}
```

### Example Configuration

```typescript
const earthlikeEvolution: TectonicEvolutionConfig = {
  eras: 5,  // ~500 Myr of history in 5 steps

  rates: {
    subduction: 0.8,   // Aggressive subduction
    spreading: 0.6,    // Moderate spreading
    collision: 1.5,    // High collision accumulation
    shear: 0.4,        // Lower shear effects
  },

  zones: {
    volcanicArcWidth: 3,    // ~3 cells behind trench
    collisionZoneWidth: 5,  // Wide Himalayan-style zone
    riftShoulderWidth: 2,   // Narrow rift shoulders
  },

  thresholds: {
    ancientCratonAge: 4,    // 4+ eras old is "cratonic"
    recentActivityEras: 2,  // Last 2 eras is "recent"
  },
};
```

---

## Part VII: Integration with Existing System

### Replacement Strategy

The new Tectonic Evolution Engine **replaces** `compute-tectonic-history` and `compute-tectonic-segments`:

```
CURRENT PIPELINE:

  mesh → crust → plate-graph → tectonic-segments → tectonic-history → projection
                                        │                  │
                                        └──────────────────┴───▶ morphology


PROPOSED PIPELINE:

  mesh → crust → plate-graph ─┬─▶ tectonic-evolution ─▶ projection
                              │           │
                              │           └──▶ era masks, evolution state
                              │
                              └──▶ initial kinematics
```

### Backward Compatibility

The new system can **emulate** the old outputs for migration:

```typescript
// Legacy compatibility layer
function deriveLegacyTectonics(
  evolution: FoundationTectonicEvolution
): FoundationTectonics {
  // Map new outputs to old schema
  return {
    boundaryType: evolution.finalState.lastBoundaryEvent,
    upliftPotential: deriveUpliftFromAccumulator(evolution.finalState.tectonicAccumulator),
    riftPotential: deriveRiftPotential(evolution.eraMasks),
    shearStress: deriveShearStress(evolution.eraMasks),
    volcanism: deriveVolcanism(evolution.eraMasks),
    fracture: deriveFracture(evolution.eraMasks),
    cumulativeUplift: evolution.finalState.tectonicAccumulator,
  };
}
```

---

## Part VIII: Performance Considerations

### Computational Cost

| Component | Current System | Proposed System |
|-----------|---------------|-----------------|
| Boundary detection | O(segments) once | O(segments) per era |
| Influence spreading | O(cells × distance) per era | O(affected cells) per era |
| Material tracking | N/A | O(cells) per era |
| Total | O(eras × cells × distance) | O(eras × cells) |

The proposed system is actually **more efficient** because:
1. We don't need full-mesh BFS spreading each era
2. We only update cells that are actually affected
3. Material tracking is local to boundaries

### Memory Cost

| Artifact | Current Size | Proposed Size |
|----------|-------------|---------------|
| Per-era fields | 6 arrays × cells × eras | 3 arrays × cells × eras |
| Totals | 4 arrays × cells | 1 array × cells |
| Evolution state | N/A | 5 arrays × cells |
| Era masks | N/A | 4 arrays × cells × eras |

Net memory increase is modest (~2× per era), offset by better data utility.

---

## Part IX: Visual Summary

### Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           TECTONIC EVOLUTION ENGINE                                  │
│                                                                                      │
│   INPUTS                                                                             │
│   ──────                                                                             │
│   • FoundationMesh (geometry)                                                        │
│   • FoundationCrust (oceanic/continental)                                            │
│   • FoundationPlateGraph (plate assignments, kinematics)                             │
│                                                                                      │
│                                     │                                                │
│                                     ▼                                                │
│                                                                                      │
│   SIMULATION                        ┌────────────────────────────────────────┐       │
│   ──────────                        │         FOR era = 0 TO N:              │       │
│                                     │                                        │       │
│   Era 0 ──────────────────────────▶ │  1. Detect boundaries                  │       │
│          Initial state              │  2. Classify interactions              │       │
│                                     │  3. Apply material flow:               │       │
│   Era 1 ──────────────────────────▶ │     • Subduction (consume cells)       │       │
│          After 1 step               │     • Rifting (create cells)           │       │
│                                     │     • Transform (shear cells)          │       │
│   Era 2 ──────────────────────────▶ │     • Collision (compress cells)       │       │
│          After 2 steps              │  4. Update evolution state             │       │
│                                     │  5. Snapshot era mask                  │       │
│   ...                               │                                        │       │
│                                     └────────────────────────────────────────┘       │
│   Era N ──────────────────────────▶ │                                                │
│          Final state                ▼                                                │
│                                                                                      │
│   OUTPUTS                                                                            │
│   ───────                                                                            │
│                                                                                      │
│   FoundationTectonicEvolution:                                                       │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                              │   │
│   │   eraMasks[0..N]:                 finalState:                                │   │
│   │   ┌───────────────────────┐       ┌───────────────────────────────────┐     │   │
│   │   │ activated: Uint8Array │       │ plateId: Int16Array               │     │   │
│   │   │ eventType: Uint8Array │       │ crustAge: Uint16Array             │     │   │
│   │   │ intensity: Uint8Array │       │ lastBoundaryEra: Uint8Array       │     │   │
│   │   │ terrainHint: Uint8Array│      │ lastBoundaryEvent: Uint8Array     │     │   │
│   │   └───────────────────────┘       │ tectonicAccumulator: Float32Array │     │   │
│   │                                   └───────────────────────────────────┘     │   │
│   │                                                                              │   │
│   │   Convenience fields:                                                        │   │
│   │   ┌───────────────────────────────────────────────────────────────────┐     │   │
│   │   │ isAncientCraton, isYoungOrogen, isActiveRift, isVolcanicArc       │     │   │
│   │   └───────────────────────────────────────────────────────────────────┘     │   │
│   │                                                                              │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               MORPHOLOGY CONSUMPTION                                 │
│                                                                                      │
│   Base Topography:                                                                   │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  • Use lastBoundaryEra to determine mountain age → erosion state            │   │
│   │  • Use lastBoundaryEvent to determine mountain type:                         │   │
│   │      COLLISION_COMPRESSED → Himalayan-style fold mountains                   │   │
│   │      SUBDUCTION_OVERRIDING → Andean volcanic arc                             │   │
│   │      RIFT_CREATED → East African rift shoulders                              │   │
│   │  • Use tectonicAccumulator for peak heights                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│   Mountains:                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  • Young orogens (recent era activation) → tall, rugged                      │   │
│   │  • Old orogens (ancient era activation) → low, rounded                       │   │
│   │  • Multiple-era activation → complex layered ranges                          │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│   Hills:                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  • Eroded old mountains → hills in non-recent eras                           │   │
│   │  • Rift shoulders → gentle hills flanking rifts                              │   │
│   │  • Shield margins → rolling hills at craton edges                            │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│   Volcanoes:                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  • SUBDUCTION_OVERRIDING in recent eras → volcanic arc                       │   │
│   │  • RIFT_CREATED in recent eras → rift volcanoes                              │   │
│   │  • SUBDUCTION_OVERRIDING in old eras → extinct volcanic remnants             │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part X: Example Scenario

### Scenario: Himalayan-Style Collision

**Configuration**:
```typescript
kinematics: { globalIntent: "converging", coherence: 0.8 }
evolution: { eras: 5, rates: { collision: 2.0 } }
```

**Era-by-Era Evolution**:

```
Era 0: Indian plate (B) approaching Eurasian plate (A)
       ┌──────────────────────────────────────────────────────┐
       │ A A A A A A A A A A A A A A │ B B B B B B B B B B B │
       │ A A A A A A A A A A A A A A │ B B B B B B B B B B B │
       └──────────────────────────────────────────────────────┘
                                     ↑ Oceanic crust between continents

Era 1: Oceanic crust subducting, volcanic arc forming
       ┌────────────────────────────────────────────────────┐
       │ A A A A A A A A A A A A A ▲ │ B B B B B B B B B B │
       │ A A A A A A A A A A A A A ▲ │ B B B B B B B B B B │
       └────────────────────────────────────────────────────┘
                                  ↑▲ Volcanic arc on A

Era 2: Ocean closed, continental collision begins
       ┌──────────────────────────────────────────────────┐
       │ A A A A A A A A A A A A ▲ ▲ │ B B B B B B B B B │
       │ A A A A A A A A A A A A ▲ ▲ │ B B B B B B B B B │
       └──────────────────────────────────────────────────┘
                                ↑ ↑ Growing collision zone

Era 3: Major collision, mountain building
       ┌────────────────────────────────────────────────┐
       │ A A A A A A A A A A ▲ ▲ ███│B B B B B B B B B │
       │ A A A A A A A A A A ▲ ▲ ███│B B B B B B B B B │
       └────────────────────────────────────────────────┘
                            ↑     ↑
                        Old arc   New collision mountains

Era 4: Continued compression, wide mountain belt
       ┌──────────────────────────────────────────────┐
       │ A A A A A A A A A ▲ ███████│B B B B B B B B │
       │ A A A A A A A A A ▲ ███████│B B B B B B B B │
       └──────────────────────────────────────────────┘
                              ↑
                      Wide Himalayan-style belt

Era Masks:
  Era 0: No activation (pre-collision)
  Era 1: Volcanic arc cells marked SUBDUCTION_OVERRIDING
  Era 2: Boundary cells marked COLLISION_COMPRESSED
  Era 3: Wide zone marked COLLISION_COMPRESSED (high intensity)
  Era 4: Same zone marked again (very high accumulated work)

Morphology sees:
  - Old volcanic arc (Era 1): moderate hills, extinct volcanoes
  - Early collision zone (Era 2): medium mountains
  - Recent collision zone (Era 3-4): tallest mountains, steep
```

---

## Part XI: Comparison with Current System

| Aspect | Current System | Proposed System |
|--------|---------------|-----------------|
| **Temporal model** | Backward extrapolation | Forward simulation |
| **Material tracking** | None | Full history per cell |
| **Subduction** | Implied by regime classification | Explicit cell consumption |
| **Accretion/spreading** | Implied by divergent regime | Explicit cell creation |
| **Era output** | Influence intensities | Activation masks + events |
| **Downstream utility** | Single "uplift" value | Event type + age + intensity |
| **Mountain age** | Derived from recent fraction | Explicit era tracking |
| **Craton detection** | Implicit (low values) | Explicit (never-activated flag) |
| **Volcanic arc** | Volcanism intensity | Specific SUBDUCTION_OVERRIDING cells |
| **Controllability** | Era weights, drift steps | Per-era simulation parameters |

---

## Part XII: Implementation Phases

### Phase 1: Core Engine (P0)

1. Implement `TectonicEvolutionState` data structure
2. Implement boundary interaction computation
3. Implement basic material flow (subduction, rifting)
4. Implement era mask snapshotting
5. Add backward compatibility layer

### Phase 2: Morphology Integration (P0)

1. Update morphology to consume era masks
2. Implement era-aware mountain placement
3. Implement era-aware volcano placement
4. Implement era-aware hill placement

### Phase 3: Advanced Features (P1)

1. Continental collision modeling
2. Transform fault geometry (bends)
3. Hotspot tracking (independent of plates)
4. Accretion prism modeling

### Phase 4: Refinements (P2)

1. Multi-resolution simulation (coarse then fine)
2. Plate shape evolution (boundaries move)
3. Slab rollback and trench migration
4. Mantle plume interaction

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Era** | One time step in the simulation |
| **Era Mask** | Per-cell record of what happened during that era |
| **Tectonic Work** | Cumulative stress/deformation at a location |
| **Subduction** | Oceanic plate descending into mantle at convergent boundary |
| **Accretion** | Material added to plate (at subduction or spreading center) |
| **Volcanic Arc** | Chain of volcanoes above subducting slab |
| **Orogen** | Mountain belt formed by plate convergence |
| **Craton** | Ancient, stable continental interior |
| **Rift Shoulder** | Elevated flanks of a continental rift |

---

## Appendix B: Algorithm Pseudocode

### Main Simulation Loop

```
function runTectonicEvolution(mesh, crust, plateGraph, config):
    state = initializeEvolutionState(mesh, crust, plateGraph)
    eraMasks = []

    for era = 0 to config.eras:
        # Compute all boundary interactions this era
        interactions = computeAllBoundaryInteractions(state, plateGraph, mesh)

        # Apply each interaction type
        updates = new CellUpdates()
        for interaction in interactions:
            if interaction.regime == CONVERGENT:
                if hasContinentalCollision(interaction, crust):
                    updates.merge(applyContinentalCollision(interaction, state, era, config))
                else:
                    updates.merge(applySubduction(interaction, state, era, config))
            else if interaction.regime == DIVERGENT:
                updates.merge(applyRifting(interaction, state, era, config))
            else if interaction.regime == TRANSFORM:
                updates.merge(applyTransform(interaction, state, era, config))

        # Update state and snapshot mask
        updateEvolutionState(state, updates, era)
        eraMasks.push(snapshotEraMask(state, updates, era, config.eras))

    return TectonicEvolution(state, eraMasks)
```

### Subduction Cell Selection

```
function findSubductingCells(boundaryCells, subductingPlate, plateIds, mesh):
    result = []

    for cell in boundaryCells:
        if plateIds[cell] != subductingPlate:
            continue

        # Find neighbors that are also on subducting plate
        # and not already on the boundary
        for neighbor in mesh.neighbors(cell):
            if plateIds[neighbor] == subductingPlate:
                if neighbor not in boundaryCells:
                    result.push(neighbor)

    # Sort by distance from boundary (consume nearest first)
    return sortByBoundaryProximity(result, boundaryCells)
```

---

## Appendix C: Configuration Reference

```typescript
interface TectonicEvolutionFullConfig {
  // Core simulation
  eras: number;                    // 3-10, number of time steps

  rates: {
    subduction: number;            // 0.5-1.5, cells per velocity unit
    spreading: number;             // 0.5-1.5, cells per velocity unit
    collision: number;             // 1.0-3.0, accumulation multiplier
    shear: number;                 // 0.2-0.8, shear accumulation
  };

  zones: {
    volcanicArcWidth: number;      // 2-5 cells behind trench
    collisionZoneWidth: number;    // 3-8 cells wide
    riftShoulderWidth: number;     // 1-3 cells
  };

  thresholds: {
    ancientCratonAge: number;      // eras to be "ancient"
    recentActivityEras: number;    // eras from present = "recent"
    minSubductionVelocity: number; // velocity threshold to trigger
    minSpreadingVelocity: number;  // velocity threshold to trigger
  };

  // Material properties
  material: {
    oceanicDensity: number;        // relative density (affects subduction)
    continentalDensity: number;    // relative density
    youngOceanicBuoyancy: number;  // affects subduction threshold
    oldOceanicBuoyancy: number;    // decreases with age
  };
}
```
