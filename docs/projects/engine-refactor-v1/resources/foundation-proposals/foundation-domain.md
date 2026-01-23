# Foundation Domain: Architectural Deep-Dive

## Executive Summary

The **Foundation Domain** is the geological bedrock of the map generation pipeline. It constructs a pseudo-tectonic plate model that drives all subsequent terrain generation. The pipeline transforms abstract configuration knobs into concrete geophysical drivers: uplift potentials, rift zones, volcanic corridors, and cratonic shields. These driver fields are then consumed by the morphology domain to sculpt actual elevation, coastlines, and landmass shapes.

The foundation is **not a physics simulation**. It is a carefully orchestrated procedural system that produces *geologically plausible* results through weighted heuristics, spatial diffusion, and regime classification. The system prioritizes artistic control and reproducibility over physical accuracy.

---

## Conceptual Architecture: The Six-Layer Stack

The foundation domain processes data through six sequential layers, each building on the outputs of the previous:

```
                                    ┌─────────────────────────────────────────┐
                                    │           MORPHOLOGY DOMAIN             │
                                    │  (consumes foundation driver fields)    │
                                    └────────────────────┬────────────────────┘
                                                         │
    ┌────────────────────────────────────────────────────┴────────────────────────────────────────────────────┐
    │                                         FOUNDATION DOMAIN                                                │
    │                                                                                                          │
    │   ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
    │   │  Layer 6: PLATE TOPOLOGY                                                                          │  │
    │   │  Builds macro-scale adjacency graph for downstream reasoning                                      │  │
    │   └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
    │                                              ▲                                                           │
    │   ┌──────────────────────────────────────────┴───────────────────────────────────────────────────────┐  │
    │   │  Layer 5: PROJECTION (Mesh → Tile-Space)                                                          │  │
    │   │  Projects coarse mesh model onto game tile grid with influence fields                             │  │
    │   └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
    │                                              ▲                                                           │
    │   ┌──────────────────────────────────────────┴───────────────────────────────────────────────────────┐  │
    │   │  Layer 4: TECTONIC HISTORY                                                                        │  │
    │   │  Simulates multi-era geological evolution through drift and accumulation                          │  │
    │   └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
    │                                              ▲                                                           │
    │   ┌──────────────────────────────────────────┴───────────────────────────────────────────────────────┐  │
    │   │  Layer 3: TECTONIC SEGMENTS                                                                       │  │
    │   │  Identifies plate boundaries and classifies tectonic regimes                                      │  │
    │   └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
    │                                              ▲                                                           │
    │   ┌──────────────────────────────────────────┴───────────────────────────────────────────────────────┐  │
    │   │  Layer 2: PLATE GRAPH                                                                             │  │
    │   │  Seeds plates and grows them via cost-weighted Dijkstra                                           │  │
    │   └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
    │                                              ▲                                                           │
    │   ┌──────────────────────────────────────────┴───────────────────────────────────────────────────────┐  │
    │   │  Layer 1: CRUST                                                                                   │  │
    │   │  Assigns oceanic vs continental crust with isostatic properties                                   │  │
    │   └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
    │                                              ▲                                                           │
    │   ┌──────────────────────────────────────────┴───────────────────────────────────────────────────────┐  │
    │   │  Layer 0: MESH                                                                                    │  │
    │   │  Generates Voronoi tessellation as computational substrate                                        │  │
    │   └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
    │                                              ▲                                                           │
    │                                    [ width, height, rngSeed ]                                            │
    └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 0: Mesh Generation

### Purpose

The mesh layer creates the **computational substrate** upon which all geological modeling occurs. Rather than operating directly on the fine-grained game tile grid (which can exceed 72,000 tiles), the foundation uses a coarser Voronoi mesh of 500-3,000 cells. This provides:

1. **Performance**: O(cells) operations instead of O(tiles)
2. **Natural irregularity**: Voronoi cells approximate natural geological regions better than square grids
3. **Clean boundaries**: Cell edges provide natural plate boundary candidates

### What It Produces

```typescript
FoundationMesh {
  cellCount: number;           // Typically 500-3000 cells
  wrapWidth: number;           // Cylindrical wrap distance (hex-space units)
  siteX, siteY: Float32Array;  // Cell centroid coordinates
  neighborsOffsets: Int32Array; // CSR format adjacency (offsets)
  neighbors: Int32Array;        // CSR format adjacency (indices)
  areas: Float32Array;          // Cell areas for weighting
  bbox: { xl, xr, yt, yb };    // Bounding box
}
```

### Algorithm: Voronoi with Lloyd Relaxation

**Implementation**: `packages/mapgen-core/src/lib/mesh/delaunay.ts`

```
1. SEED GENERATION
   - Generate cellCount random points uniformly distributed over hex-space
   - Use labeled RNG for deterministic reproducibility

2. CYLINDRICAL EXPANSION (for wrap handling)
   - Replicate all sites 3x: [x-wrapWidth], [x], [x+wrapWidth]
   - This ensures correct Voronoi behavior across the periodic boundary

3. DELAUNAY TRIANGULATION
   - Apply d3-delaunay to the expanded point set
   - Extract Voronoi dual automatically

4. LLOYD RELAXATION (configurable, typically 2 iterations)
   For each iteration:
     a. Compute centroid of each cell's Voronoi polygon
     b. Move site to centroid position
     c. Re-wrap coordinates into [0, wrapWidth)
     d. Rebuild Delaunay/Voronoi

5. NEIGHBOR EXTRACTION
   - For each cell, collect neighbors from all 3 replicas
   - De-duplicate and store in CSR (Compressed Sparse Row) format

6. AREA COMPUTATION
   - Sum polygon areas across replicas for each cell
```

### Algorithm Complexity Assessment

| Aspect | Classification | Notes |
|--------|---------------|-------|
| Voronoi tessellation | **Geometric (standard)** | Uses d3-delaunay, a well-established library |
| Lloyd relaxation | **Heuristic (non-physics)** | Produces aesthetically pleasing distributions but has no physical basis |
| Cylindrical wrapping | **Geometric (custom)** | Triple-replica trick is elegant and correct |

### Visual: Mesh Construction

```
        Raw Random Points              After Lloyd Relaxation

    ·  ·    ·  ·                         ·    ·    ·    ·
      ·   ·     ·                           ·    ·    ·
    ·      ·   ·  ·                        ·    ·    ·    ·
       ·  ·  ·                               ·    ·    ·
    ·    ·    ·   ·                        ·    ·    ·    ·

    (clustered, uneven)              (evenly distributed)
```

### Opportunities for Improvement

1. **Adaptive cell density**: Currently uniform; could vary by latitude or importance
2. **Blue noise seeding**: Replace uniform random with Poisson disk for better initial distribution
3. **Iteration count tuning**: 2 iterations may be insufficient for very large meshes

---

## Layer 1: Crust Assignment

### Purpose

The crust layer partitions mesh cells into **oceanic** and **continental** crust, and assigns **isostatic properties** (age, buoyancy, base elevation, strength) that will drive downstream tectonics and elevation.

This is where the fundamental land/ocean split is decided at the *mesh level*. The actual sea level determination happens later in morphology, but continental crust cells have higher base elevation and tend to become land.

### What It Produces

```typescript
FoundationCrust {
  type: Uint8Array;           // 0 = oceanic, 1 = continental
  age: Uint8Array;            // 0 = young (ridge), 255 = ancient (craton)
  buoyancy: Float32Array;     // 0..1, proxy for isostatic height
  baseElevation: Float32Array; // 0..1, isostatic equilibrium elevation
  strength: Float32Array;      // 0..1, lithospheric rigidity
}
```

### Algorithm: Region-Growing Continental Assignment

**Implementation**: `domain/foundation/ops/compute-crust/index.ts`

```
1. TEMPORARY VORONOI PARTITION
   - Create a temporary plate-like partition (cellCount/2 pseudo-plates)
   - This is NOT the final plate assignment; it's just for clustering continents

2. CONTINENTAL SEEDING
   - Target: continentalRatio × cellCount cells should be continental
   - Randomly select sqrt(pseudoPlateCount) × continentalRatio seed pseudo-plates
   - Mark seed pseudo-plates as continental

3. FRONTIER-BASED GROWTH
   - Initialize frontier with neighbors of continental pseudo-plates
   - While (continentalCells < targetContinentalCells):
       a. Randomly pick a pseudo-plate from frontier
       b. Mark it as continental
       c. Add its neighbors to frontier
   - This produces clustered, continent-like continental regions

4. CELL ASSIGNMENT
   - For each mesh cell, inherit type from its pseudo-plate
   - This ensures cells within a pseudo-plate share the same crust type

5. BOUNDARY DISTANCE COMPUTATION (BFS)
   - For each cell, compute distance (in cell hops) to nearest plate boundary
   - This determines age: cells at boundaries are young, interior cells are old

6. AGE ASSIGNMENT
   - Continental: age = 180 + 75 × (dist / maxDist), plus plate-specific bias
   - Oceanic: age = 255 × (dist / maxDist)
   - Rationale: Continental cratons are ancient; oceanic crust is young at ridges

7. ISOSTATIC PROPERTY COMPUTATION
   - For each cell, compute distance to coast (ocean-continent boundary)
   - baseElevation:
       Continental: 0.78 + 0.12 × age_norm - marginPenalty × shelf01
       Oceanic: 0.32 - 0.22 × age_norm + shelfBoost × shelf01
   - buoyancy: same as baseElevation
   - strength: Continental interiors are strongest (0.9); young oceanic is weakest (0.15)
```

### Algorithm Complexity Assessment

| Aspect | Classification | Notes |
|--------|---------------|-------|
| Continental clustering | **Crude heuristic** | Region-growing produces blob-like continents, not realistic shapes |
| Age from boundary distance | **Crude proxy** | Real age depends on spreading history, not just distance |
| Isostatic elevation | **Simplified physics** | Real isostasy involves density, thickness, mantle dynamics |
| Shelf elevation boost | **Artistic heuristic** | Not physically modeled; prevents abrupt ocean-continent transitions |

### Visual: Continental Growth

```
    Initial Seeds          Frontier Growth          Final Crust

    □ □ □ □ □ □           □ □ □ □ □ □           ░ ░ □ □ □ □
    □ □ ■ □ □ □           □ ■ ■ ■ □ □           ░ ■ ■ ■ □ □
    □ □ □ □ □ □     →     □ ■ ■ ■ □ □     →     ░ ■ ■ ■ ░ □
    □ □ □ ■ □ □           □ ■ ■ ■ ■ □           □ ■ ■ ■ ■ ░
    □ □ □ □ □ □           □ □ ■ ■ □ □           □ □ ■ ■ ░ □

    ■ = seed               ■ = grown               ■ = continental (high elev)
                                                   ░ = shelves
                                                   □ = oceanic (low elev)
```

### Opportunities for Improvement

1. **Shape control**: Current algorithm produces amorphous blobs; could add elongation constraints
2. **Multi-continent seeding**: Explicit control over number of separate landmasses
3. **Physically-based isostasy**: Model crustal thickness and density properly
4. **Realistic age patterns**: Consider spreading rates and subduction history

---

## Layer 2: Plate Graph

### Purpose

The plate graph layer divides the mesh into **discrete tectonic plates**, each with kinematic properties (velocity, rotation). This is where the system transitions from "what kind of crust" to "which plate owns this crust."

Critically, plate boundaries are influenced by crust type: the algorithm **prefers to place boundaries in oceanic crust** and **avoids bisecting continental interiors**.

### What It Produces

```typescript
FoundationPlateGraph {
  cellToPlate: Int16Array;  // Plate ID for each mesh cell
  plates: Array<{
    id: number;
    role: "tectonic" | "polarCap" | "polarMicroplate";
    kind: "major" | "minor";
    seedX, seedY: number;        // Seed location
    velocityX, velocityY: number; // Translation velocity
    rotation: number;             // Angular velocity
  }>;
}
```

### Algorithm: Cost-Weighted Dijkstra Plate Assignment

**Implementation**: `domain/foundation/ops/compute-plate-graph/index.ts`

```
1. POLAR CAP LOCKING
   - Reserve top capFraction (10%) of mesh for north polar cap (plate 0)
   - Reserve bottom capFraction for south polar cap (plate 1)
   - Seeds placed at extreme Y positions

2. POLAR MICROPLATE PLACEMENT (optional)
   - In bands adjacent to polar caps
   - Filter regions by minimum area to ensure viability
   - Provides more interesting polar tectonics

3. TECTONIC PLATE SEEDING
   - 60% of remaining plates are "major", 40% "minor"
   - For each plate, pick seed cell via quality scoring:
       Major plates prefer: old continental crust (quality = 1.0 + 1.5×age)
       Minor plates prefer: young oceanic crust (quality = 1.0 + 1.0×(1-age))
   - Maximize minimum distance to existing seeds (spread plates out)

4. CELL RESISTANCE COMPUTATION
   - For each cell, compute cost-to-traverse:
       Continental: resistance = 2.2 + 2.8 × age²  (high, protects cratons)
       Oceanic: resistance = 1.0 + 0.8 × age²      (low, attracts boundaries)

5. MULTI-SOURCE DIJKSTRA EXPANSION
   - Initialize priority queue with all seed cells at cost 0
   - Initialize locked cells (polar caps, microplates) at cost 0
   - While queue not empty:
       a. Pop lowest-cost cell
       b. For each unassigned neighbor in allowed region:
           - Compute edge cost = average(resistance_this, resistance_neighbor) / plate_weight
           - If new_cost < current_cost: assign cell to plate, push to queue
   - Major plates have higher weight (1.7+) → grow faster
   - Minor plates have lower weight (0.45+) → grow slower

6. KINEMATIC ASSIGNMENT
   - Polar caps: tangential velocity (rotating around pole)
   - Polar microplates: similar but with jitter
   - Tectonic plates: random direction, speed 0.5-1.0, random rotation
```

### Key Insight: Why Dijkstra?

The algorithm uses Dijkstra's shortest-path algorithm not for pathfinding, but as a **weighted region-growing** mechanism. The "cost" to reach a cell represents how "reluctant" the system is to include that cell in a plate's interior.

By making continental cells expensive and oceanic cells cheap, plate boundaries naturally fall in the oceans. This is not physically motivated (real plate boundaries form from mantle convection) but produces visually pleasing results.

### Algorithm Complexity Assessment

| Aspect | Classification | Notes |
|--------|---------------|-------|
| Dijkstra-based growth | **Novel heuristic** | Clever use of shortest-path for region assignment |
| Resistance function | **Crude proxy** | Real boundaries depend on mantle dynamics, not crustal age |
| Velocity assignment | **Random (non-physics)** | Real plate motions derive from mantle convection |
| Polar caps | **Artistic convenience** | Polar regions behave specially; not physically motivated |

### Visual: Plate Growth

```
    Seed Placement               Dijkstra Growth              Final Plates

    □ □ □ □ □ □                 A A A B B B                   A A A B B B
    □ □ □ □ □ □                 A A A A B B                   A A A A B B
    □ A □ □ B □       →         A A A ║ B B       →           A A A │ B B
    □ □ □ □ □ □                 A A ║ ║ B B                   A A ╱ ╲ B B
    □ □ □ □ □ □                 C C C D D D                   C C C D D D

    A,B,C,D = seeds             ║ = boundary forming          │╱╲ = final boundaries
                                (high-resistance blocked)     (in oceanic zones)
```

### Opportunities for Improvement

1. **Mantle convection model**: Use simplified convection to drive plate positions
2. **Supercontinent cycles**: Seed plates to simulate Pangaea-like configurations
3. **Explicit boundary control**: Allow artists to specify where boundaries should form
4. **Time evolution**: Model plate positions through geological time

---

## Layer 3: Tectonic Segments

### Purpose

Once plates are defined, we need to understand how they **interact at boundaries**. This layer identifies all plate boundary segments and classifies them by **tectonic regime**:

- **Convergent**: Plates moving toward each other → mountain building, subduction
- **Divergent**: Plates moving apart → rifting, mid-ocean ridges
- **Transform**: Plates sliding past each other → strike-slip faults

### What It Produces

```typescript
FoundationTectonicSegments {
  segmentCount: number;
  aCell, bCell: Int32Array;      // Boundary endpoints (mesh cell IDs)
  plateA, plateB: Int16Array;    // Adjacent plate IDs
  regime: Uint8Array;            // 0=none, 1=convergent, 2=divergent, 3=transform
  polarity: Int8Array;           // Subduction direction for convergent boundaries
  compression: Uint8Array;       // Intensity (0-255)
  extension: Uint8Array;         // Intensity (0-255)
  shear: Uint8Array;             // Intensity (0-255)
  volcanism: Uint8Array;         // Volcanic potential
  fracture: Uint8Array;          // Fracture potential
  driftU, driftV: Int8Array;     // Normalized drift direction
}
```

### Algorithm: Velocity-Based Regime Classification

**Implementation**: `domain/foundation/ops/compute-tectonic-segments/index.ts`

```
1. BOUNDARY IDENTIFICATION
   - For each mesh cell i, examine neighbors j
   - If plateId[i] ≠ plateId[j], this is a boundary segment
   - Store only once (i < j) to avoid duplicates

2. RELATIVE VELOCITY COMPUTATION
   - For boundary between cells A and B:
     a. Compute midpoint M = (A + B) / 2
     b. Compute velocity of plate A at M (including rotation): vA
     c. Compute velocity of plate B at M: vB
     d. Relative velocity: rv = vB - vA

3. NORMAL/TANGENT DECOMPOSITION
   - Compute normal vector n from A to B (perpendicular to boundary)
   - Compute tangent vector t (along boundary)
   - Normal component: vn = rv · n (positive = diverging, negative = converging)
   - Tangent component: vt = rv · t (magnitude = shear)

4. REGIME CLASSIFICATION
   - compression = max(0, -vn) × intensityScale  (clamped to 0-255)
   - extension = max(0, vn) × intensityScale
   - shear = |vt| × intensityScale

   - If max(compression, extension, shear) < minIntensity: regime = none
   - Else if compression is dominant: regime = convergent
   - Else if extension is dominant: regime = divergent
   - Else: regime = transform

5. SUBDUCTION POLARITY (convergent only)
   - If crustType differs across boundary:
       Oceanic subducts under continental (polarity indicates direction)
   - This determines which side gets volcanic arc

6. DERIVED METRICS
   - volcanism:
       Convergent: 0.6 × compression + 40 (if subduction)
       Divergent: 0.25 × extension
       Transform: 0.1 × shear
   - fracture:
       Transform: 0.7 × shear
       Divergent: 0.3 × extension
       Convergent: 0.2 × compression
```

### Algorithm Complexity Assessment

| Aspect | Classification | Notes |
|--------|---------------|-------|
| Velocity decomposition | **Physically correct** | Proper normal/tangent analysis |
| Regime classification | **Physically motivated** | Matches real geology conceptually |
| Intensity scaling | **Crude linear proxy** | Real intensity depends on many factors |
| Volcanism/fracture formulas | **Artistic heuristics** | Not physically derived |

### Visual: Boundary Regimes

```
                    vB
                    ↑
         Plate B    │
                    │
    ════════════════╪════════════════  Boundary
                    │
         Plate A    │
                    ↓
                    vA

    If vB points away from vA (↑ vs ↓): DIVERGENT
    If vB points toward vA (↓ vs ↑): CONVERGENT
    If vB points sideways from vA (→ vs ←): TRANSFORM
```

### Opportunities for Improvement

1. **Oblique boundaries**: Real boundaries are often oblique (partly convergent, partly transform)
2. **Stress accumulation**: Model how stress builds over time at locked boundaries
3. **Slab dynamics**: For subduction, model slab angle and rollback
4. **Triple junctions**: Where three plates meet requires special handling

---

## Layer 4: Tectonic History

### Purpose

Real landscapes are shaped by **millions of years of geological activity**. Mountain ranges erode, rifts fill with sediment, volcanic arcs migrate. This layer simulates a simplified **multi-era evolution** to create depth and variety.

Rather than true time simulation, the system models **three eras** (oldest → middle → newest), each with different boundary positions achieved through **drift**.

### What It Produces

```typescript
FoundationTectonicHistory {
  eraCount: 3;
  eras: Array<{
    boundaryType: Uint8Array;    // Regime per cell for this era
    upliftPotential: Uint8Array;
    riftPotential: Uint8Array;
    shearStress: Uint8Array;
    volcanism: Uint8Array;
    fracture: Uint8Array;
  }>;
  upliftTotal: Uint8Array;          // Accumulated across all eras
  fractureTotal: Uint8Array;
  volcanismTotal: Uint8Array;
  upliftRecentFraction: Uint8Array; // Fraction of uplift from newest era
  lastActiveEra: Uint8Array;        // When was this cell last tectonically active?
}

// Also produces the "current state" view:
FoundationTectonics {
  boundaryType, upliftPotential, riftPotential, shearStress, volcanism, fracture: Uint8Array;
  cumulativeUplift: Uint8Array;
}
```

### Algorithm: Era-Based Boundary Drift

**Implementation**: `domain/foundation/ops/compute-tectonic-history/index.ts`

```
1. ERA CONFIGURATION
   - Typically 3 eras with weights [0.3, 0.6, 1.0] (oldest → newest)
   - Drift steps: [6, 3, 0] (oldest era has most drift from current position)

2. FOR EACH ERA:
   a. DRIFT BOUNDARY SEGMENTS
      - For each segment, follow drift direction driftSteps times
      - Use chooseDriftNeighbor: pick neighbor in drift direction
      - This simulates boundaries having been in different positions historically

   b. MARK DRIFTED POSITIONS AS SEEDS
      - Record compression/extension/shear/volcanism/fracture at drifted positions

   c. COMPUTE BELT INFLUENCE FIELD (BFS)
      - Starting from seed cells, spread influence outward
      - influence = exp(-distance × decay) × eraWeight
      - This creates "belts" of tectonic activity radiating from boundaries

   d. ASSIGN ERA METRICS
      - For each cell, inherit metrics from nearest seed, scaled by influence

3. ACCUMULATE TOTALS
   - upliftTotal = sum of upliftPotential across all eras (clamped to 255)
   - fractureTotal, volcanismTotal similarly

4. COMPUTE TEMPORAL METRICS
   - lastActiveEra: for each cell, which era had significant activity?
   - upliftRecentFraction: what fraction of uplift is from the newest era?

   (High recent fraction → young, steep mountains; low → old, eroded)

5. OUTPUT "TECTONICS" (current state)
   - Just the newest era's fields, plus cumulativeUplift
```

### Algorithm Complexity Assessment

| Aspect | Classification | Notes |
|--------|---------------|-------|
| Drift-based history | **Novel heuristic** | Creative way to simulate time without simulation |
| Exponential decay belts | **Diffusion approximation** | Physically plausible stress diffusion |
| Era weighting | **Artistic control** | No physical basis; allows tuning recentness |
| Cumulative totals | **Crude proxy** | Real geology involves complex erosion/deposition |

### Visual: Era Drift

```
    Era 0 (oldest)         Era 1 (middle)         Era 2 (newest)
    driftSteps=6           driftSteps=3           driftSteps=0

    ──────┬──────           ──────┬──────           ──────┬──────
          │                       │                       │
          │ ← drifted from   ← drifted from       current position
          │   future              future
    ──────┴──────           ──────┴──────           ──────┴──────

    Boundaries appear to have "moved" over time (though we compute backwards)
```

### Visual: Belt Influence Spreading

```
    Boundary Segment         After BFS Spreading

    □ □ □ □ □ □             □ 1 2 2 1 □
    □ □ □ □ □ □             1 3 5 5 3 1
    □ □ ■ ■ □ □      →      2 5 ■ ■ 5 2
    □ □ □ □ □ □             1 3 5 5 3 1
    □ □ □ □ □ □             □ 1 2 2 1 □

    ■ = boundary segment    Numbers = influence (decays with distance)
```

### Opportunities for Improvement

1. **True time simulation**: Model plate motion through actual time steps
2. **Erosion/deposition**: Old uplift should be reduced; rifts should fill
3. **Variable era lengths**: Different eras could represent different durations
4. **Supercontinent cycles**: Model Wilson cycles explicitly

---

## Layer 5: Projection (Mesh → Tile-Space)

### Purpose

All the geological modeling so far has occurred on the **coarse mesh** (500-3000 cells). The game operates on a **fine tile grid** (e.g., 360×200 = 72,000 tiles). This layer projects mesh-space data onto tile-space, creating the **driver fields** that morphology will consume.

The projection is not just nearest-neighbor sampling; it includes **influence field computation** that spreads boundary effects smoothly across tiles.

### What It Produces

```typescript
FoundationPlates {  // Per tile
  id: Int16Array;              // Which plate this tile belongs to
  boundaryCloseness: Uint8Array; // 0-255, how close to a boundary
  boundaryType: Uint8Array;      // Regime of nearest boundary
  tectonicStress: Uint8Array;    // Overall stress intensity
  upliftPotential: Uint8Array;   // Mountain-building potential
  riftPotential: Uint8Array;     // Rifting/basin potential
  shieldStability: Uint8Array;   // Cratonic stability (inverse of closeness)
  volcanism: Uint8Array;         // Volcanic activity potential
  movementU, movementV: Int8Array; // Plate velocity components
  rotation: Int8Array;            // Plate rotation
}

FoundationCrustTiles {  // Per tile
  type, age: Uint8Array;
  buoyancy, baseElevation, strength: Float32Array;
}

FoundationTileToCellIndex: Int32Array;  // Nearest mesh cell for each tile
```

### Algorithm: Spatial Projection with Influence Fields

**Implementation**: `domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`

```
1. BUILD TILE-TO-CELL MAPPING
   - For each tile (x, y):
       a. Convert to hex-space coordinates
       b. Find nearest mesh cell (brute-force, O(cells))
       c. Store in tileToCellIndex[tileIndex]

   - This is a Voronoi-like assignment of tiles to cells

2. PROJECT BASIC PROPERTIES
   - For each tile, copy properties from assigned mesh cell:
       plateId, movementU/V, rotation
       crustType, crustAge, crustBuoyancy, crustBaseElevation, crustStrength

3. IDENTIFY BOUNDARY TILES
   - For each tile, check hex neighbors
   - If any neighbor has different plateId: mark as boundary seed

4. COMPUTE BOUNDARY DISTANCE FIELD (hex BFS)
   - From all boundary seeds, spread outward
   - Track distance (0 at boundary, increasing inward)
   - Maximum distance = boundaryInfluenceDistance (typically 8-16 tiles)

5. COMPUTE BOUNDARY CLOSENESS
   - closeness = exp(-distance × boundaryDecay) × 255
   - This produces smooth falloff from boundaries

6. PROJECT TECTONIC METRICS WITH INFLUENCE
   - For each tile:
       influence = closeness / 255
       upliftPotential = meshUplift × influence
       riftPotential = meshRift × influence
       volcanism = meshVolcanism × influence
       tectonicStress = max(uplift, rift, shear) × influence
       shieldStability = 255 - closeness  (stable in plate interiors)
```

### Algorithm Complexity Assessment

| Aspect | Classification | Notes |
|--------|---------------|-------|
| Nearest-cell assignment | **Geometric (correct)** | Voronoi-style, mathematically sound |
| Hex-grid BFS | **Geometric (correct)** | Proper hex topology handling |
| Exponential decay | **Diffusion approximation** | Physically reasonable for stress |
| Stability inversion | **Simple heuristic** | Stable = far from boundary, roughly correct |

### Visual: Projection Process

```
    Mesh Cells (coarse)          Tile Grid (fine)

    ┌─────────┬─────────┐        ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐
    │         │         │        │A│A│A│A│A│B│B│B│B│B│
    │    A    │    B    │        ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
    │         │         │   →    │A│A│A│A│░│░│B│B│B│B│  ░ = boundary
    ├─────────┼─────────┤        ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤      influence
    │         │         │        │A│A│A│░│░│░│░│B│B│B│
    │    C    │    D    │        ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
    │         │         │        │C│C│C│░│░│░│░│D│D│D│
    └─────────┴─────────┘        └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘
```

### Opportunities for Improvement

1. **Bilinear interpolation**: Instead of nearest-cell, interpolate between cells
2. **K-d tree lookup**: Replace O(cells) search with O(log cells)
3. **Anisotropic influence**: Spread along plate motion direction
4. **Multi-scale projection**: Different fields at different resolutions

---

## Layer 6: Plate Topology

### Purpose

The final foundation layer builds a **macro-scale adjacency graph** of plates. This allows downstream stages to reason about plate relationships without scanning tile-level data.

### What It Produces

```typescript
FoundationPlateTopology {
  plateCount: number;
  plates: Array<{
    id: number;
    area: number;           // Total tiles
    centroid: { x, y };     // Average position
    neighbors: number[];    // Adjacent plate IDs
  }>;
}
```

### Algorithm: Adjacency Graph from Raster

**Implementation**: `packages/mapgen-core/src/lib/plates/topology.ts`

```
1. INITIALIZE NODE ARRAY
   - Create one PlateNode per plate ID
   - Initialize area=0, centroid=origin, neighbors=[]

2. SINGLE-PASS TILE SCAN
   - For each tile (x, y):
       a. Get plateId for this tile
       b. Increment node[plateId].area
       c. Accumulate centroid: node[plateId].centroid += (x, y)
       d. For each hex neighbor:
           If neighborPlateId ≠ plateId:
               Add neighborPlateId to neighbor set

3. FINALIZE NODES
   - For each plate:
       centroid /= area  (average position)
       neighbors = sorted unique list from neighbor set

4. VERIFY SYMMETRY
   - For each plate A with neighbor B:
       Assert B also lists A as neighbor
   - This catches bugs in boundary detection
```

### Algorithm Complexity Assessment

| Aspect | Classification | Notes |
|--------|---------------|-------|
| Adjacency building | **Graph theory (standard)** | Simple, correct algorithm |
| Centroid computation | **Geometric (correct)** | Simple average |
| Symmetry verification | **Defensive programming** | Good practice |

### Opportunities for Improvement

1. **Boundary length**: Track how many tiles form each plate-plate boundary
2. **Boundary type per edge**: Store dominant regime for each adjacency
3. **Minimum spanning tree**: For connectivity analysis

---

## How Continents Form: End-to-End Flow

Now that we've examined each layer, let's trace how the system decides what becomes a continent:

### Step 1: Continental Crust Seeds (Crust Layer)

The process begins in the crust layer, which decides where continental vs oceanic crust exists:

```
1. System targets continentalRatio (e.g., 0.30 = 30% continental)
2. Random seed points are selected in mesh cells
3. Continental regions grow outward via frontier expansion
4. Result: Blob-like continental regions, clustered together
```

**Key insight**: Continental crust has higher `baseElevation` (0.78 vs 0.32 for oceanic). This is the first hint of what will become land.

### Step 2: Plate Boundaries Avoid Continents (Plate Graph Layer)

When plates are seeded and grown:

```
1. Continental cells have high resistance (2.2 - 5.0)
2. Oceanic cells have low resistance (1.0 - 1.8)
3. Dijkstra growth naturally places boundaries in oceans
4. Result: Continents tend to be plate interiors (stable cratons)
```

**Key insight**: This is why plate boundaries (and their associated uplift) tend to be at continental margins rather than centers.

### Step 3: Boundary Activity Creates Uplift Potential (Tectonics Layers)

At plate boundaries:

```
1. Convergent boundaries get high compression → high uplift potential
2. Divergent boundaries get extension → moderate uplift at ridges
3. This potential spreads into plate interiors via influence fields
4. Multiple eras accumulate more uplift in persistently active zones
```

**Key insight**: A continental region near a convergent boundary will have mountain potential; one in a stable interior will be flat.

### Step 4: Morphology Uses Foundation Fields

When morphology computes base topography:

```
elevation = oceanicHeight + reliefSpan × crustBaseElevation
          + upliftEffect × boundaryCloseness
          + boundaryBias × closeness
          - riftPenalty × riftPotential
          + noise
```

**Key insight**: Continental crust (high baseElevation) starts high; uplift raises it further; rift potential can create interior basins.

### Step 5: Sea Level Determines Final Land Mask

Finally, the sea level solver:

```
1. Sorts all elevations
2. Finds threshold where targetWaterPercent tiles are below
3. Tiles above threshold → land; below → water
```

**Key insight**: The system doesn't decide "this is land" directly. It creates an elevation surface, then "floods" it to determine what's underwater.

### Summary Flow

```
continentalRatio → crust clustering → high baseElevation
                                           │
                                           ▼
plate seeding → boundaries avoid cratons → convergent/divergent
                                           │
                                           ▼
relative velocity → uplift potential → spreads via influence
                                           │
                                           ▼
baseElevation + upliftEffect → raw elevation
                                           │
                                           ▼
sort elevations → find sea level → land mask
```

---

## Configuration Philosophy

### Semantic Knobs (User-Facing)

The foundation exposes two high-level knobs:

1. **plateCount**: `sparse` (0.8×) | `normal` (1.0×) | `dense` (1.25×)
   - Affects number of plates and mesh cells
   - More plates = more boundaries = more fragmented continents

2. **plateActivity**: `low` (0.8×) | `normal` (1.0×) | `high` (1.2×)
   - Scales velocity and boundary influence
   - Higher activity = more dramatic terrain at boundaries

### Advanced Configuration (Step-Level)

Each step accepts detailed configuration:

```typescript
// Mesh config
{ plateCount: 24, cellsPerPlate: 8, relaxationSteps: 2 }

// Crust config
{ continentalRatio: 0.30, shelfWidthCells: 6, continentalBaseElevation: 0.78 }

// Plate graph config
{ plateCount: 24, polarCaps: { capFraction: 0.1, microplatesPerPole: 2 } }

// Tectonic history config
{ eraWeights: [0.3, 0.6, 1.0], driftStepsByEra: [6, 3, 0], beltInfluenceDistance: 4 }

// Projection config
{ boundaryInfluenceDistance: 12, boundaryDecay: 0.55 }
```

---

## Overall Assessment

### What Works Well

1. **Performance**: Mesh-space modeling keeps operations fast
2. **Reproducibility**: Labeled RNG ensures deterministic results
3. **Visual Quality**: Results look geologically plausible
4. **Artistic Control**: Knobs provide meaningful high-level control
5. **Boundary-Aware Plates**: Dijkstra resistance creates natural plate shapes

### What's Crude/Non-Physical

1. **Continental Shapes**: Blob-like growth, not realistic coastlines
2. **Plate Velocities**: Random assignment, not mantle-driven
3. **Age Model**: Distance-based, not spreading-history-based
4. **Era Evolution**: Backward drift hack, not forward simulation
5. **Isostasy**: Simple proxies, not true density/thickness modeling

### Opportunities for Future Development

1. **Mantle Convection**: Simple 2D convection model to drive plate motion
2. **Supercontinent Control**: Allow artists to specify continent count/arrangement
3. **True Time Evolution**: Forward simulation through geological time
4. **Coastline Refinement**: Add fractal detail to continental margins
5. **Hotspot Tracks**: Model intraplate volcanism from plumes
6. **Slab Dynamics**: Model subduction angle and rollback for arcs

---

## Appendix: Key Files Reference

| Layer | Key Implementation Files |
|-------|-------------------------|
| Mesh | `packages/mapgen-core/src/lib/mesh/delaunay.ts` |
| Crust | `domain/foundation/ops/compute-crust/index.ts` |
| Plate Graph | `domain/foundation/ops/compute-plate-graph/index.ts` |
| Tectonic Segments | `domain/foundation/ops/compute-tectonic-segments/index.ts` |
| Tectonic History | `domain/foundation/ops/compute-tectonic-history/index.ts` |
| Projection | `domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts` |
| Plate Topology | `packages/mapgen-core/src/lib/plates/topology.ts` |
| Stage Definition | `recipes/standard/stages/foundation/index.ts` |
| Artifacts | `recipes/standard/stages/foundation/artifacts.ts` |

---

## Appendix: Data Flow Diagram

```
INPUT
  │
  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FOUNDATION DOMAIN                                  │
│                                                                              │
│  [width, height, rngSeed]                                                    │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐                                                             │
│  │    MESH     │──▶ cellCount, siteX/Y, neighbors, areas, wrapWidth         │
│  └─────────────┘                                                             │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐                                                             │
│  │    CRUST    │──▶ type, age, buoyancy, baseElevation, strength            │
│  └─────────────┘    (per mesh cell)                                         │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐                                                             │
│  │ PLATE GRAPH │──▶ cellToPlate, plates[{id, role, velocity, rotation}]     │
│  └─────────────┘                                                             │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐                                                             │
│  │  SEGMENTS   │──▶ boundary segments with regime, compression, extension,  │
│  └─────────────┘    shear, volcanism, fracture, polarity, drift            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐                                                             │
│  │   HISTORY   │──▶ 3 eras of tectonic fields + totals + lastActiveEra     │
│  └─────────────┘──▶ tectonics (current state)                               │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐                                                             │
│  │ PROJECTION  │──▶ foundationPlates (per tile driver fields)               │
│  └─────────────┘──▶ foundationCrustTiles (per tile crust properties)        │
│         │       ──▶ tileToCellIndex (projection mapping)                    │
│         ▼                                                                    │
│  ┌─────────────┐                                                             │
│  │  TOPOLOGY   │──▶ plate adjacency graph                                   │
│  └─────────────┘                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
OUTPUT TO MORPHOLOGY
  • foundationPlates.{upliftPotential, riftPotential, boundaryCloseness, ...}
  • foundationCrustTiles.{baseElevation, type, age, ...}
  • foundationPlateTopology.{plates, neighbors}
```
