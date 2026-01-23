# Unified Foundation Domain Refactor

## A First-Principles Approach to Procedural Planetary Geology

---

# Preface

This document presents a comprehensive redesign of the foundation domain—the geological engine that creates the tectonic substrate upon which all terrain, climate, and ecology are built. The refactor addresses fundamental limitations in the current system while introducing physically-motivated algorithms that produce emergent, believable planetary surfaces.

The proposal consolidates four areas of improvement:
1. **Configuration Architecture** — Eliminating duplication, magic numbers, and confusing parameters
2. **Kinematic Control** — Enabling coherent plate dynamics rather than random motion
3. **Forward Simulation** — Replacing backward-drift hacks with true temporal evolution
4. **First-Principles Geology** — Deriving continental distribution from physics rather than pre-assignment

---

# Part I: The Physics of Planetary Surfaces

## Chapter 1: What We Are Modeling

### 1.1 The Central Question

When we generate a map, we are answering a deceptively simple question:

> *Where is land, and where is water?*

But this question contains multitudes. Land is not merely "high ground that happens to be above sea level." Land is **continental crust**—a chemically distinct, buoyant material that has accumulated over billions of years through the engine of plate tectonics. The shape, distribution, and character of continents arise from deep physical processes.

To generate believable maps, we must model—or at least approximate—these processes.

### 1.2 The Hierarchy of Geological Concepts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HIERARCHY OF GEOLOGICAL CONCEPTS                      │
│                                                                              │
│  LEVEL 4: SURFACE FEATURES                                                   │
│  ─────────────────────────                                                   │
│  Mountains, valleys, volcanoes, coastlines                                   │
│  ↑ Shaped by tectonic forces + erosion                                       │
│                                                                              │
│  LEVEL 3: LAND/OCEAN DISTRIBUTION                                            │
│  ────────────────────────────────                                            │
│  Where continents exist, their shapes and arrangements                       │
│  ↑ Determined by crustal type + sea level                                    │
│                                                                              │
│  LEVEL 2: CRUSTAL COMPOSITION                                                │
│  ────────────────────────────                                                │
│  Oceanic (basaltic, dense) vs Continental (granitic, buoyant)               │
│  ↑ Manufactured by differentiation at subduction zones                       │
│                                                                              │
│  LEVEL 1: PLATE TECTONICS                                                    │
│  ────────────────────────                                                    │
│  Moving lithospheric plates, boundaries, subduction, rifting                 │
│  ↑ Driven by mantle convection                                               │
│                                                                              │
│  LEVEL 0: PLANETARY HEAT ENGINE                                              │
│  ─────────────────────────────                                               │
│  Radiogenic heat + primordial heat → mantle convection                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

The current foundation domain operates primarily at **Level 3**, with some Level 1 flavor. It pre-assigns crustal composition and uses plate boundaries to create stress fields.

The refactored foundation operates at **Levels 1-3**, with crustal composition *emerging* from plate dynamics rather than being pre-assigned.

### 1.3 The Key Insight: Continents Are Manufactured

The most important physical principle underlying this refactor:

> **Continental crust does not exist primordially. It is manufactured by the tectonic engine itself, primarily through chemical differentiation at subduction zones.**

When a planet first solidifies, it forms a global shell of **basaltic oceanic crust**—the default product of mantle melting. This is Level 0.

Continental crust (granite-like, silica-rich, buoyant) is created when:
1. Oceanic crust subducts into the mantle
2. Water and volatiles are released
3. The overlying mantle wedge partially melts
4. Lighter, silica-enriched magmas rise to form volcanic arcs
5. Over billions of years, these arcs accumulate and merge into continents

This is why Earth's continents are geologically young compared to the planet itself, and why they cluster at certain locations—they form where subduction has been most persistent.

```
THE DIFFERENTIATION ENGINE

        Volcanic Arc (andesitic → granitic over time)
              ▲ ▲ ▲
              │ │ │  Silica-rich melt rises
    ══════════╧═╧═╧══════════════════════════  Continental margin
              ╲     ╲
               ╲  ●  ╲  Partial melting (hydrated mantle)
                ╲  ●  ╲
                 ╲     ╲  Subducting oceanic plate
                  ╲     ╲   (releases H₂O, CO₂)
                   ╲     ╲
    ════════════════╲═════╲════════════════════  Deep mantle

    Each subduction event:
    • Consumes old oceanic crust
    • Creates small amount of continental crust
    • Net effect over Gyr: continents grow
```

### 1.4 The Wilson Cycle

Continents don't just form—they assemble and break apart in a grand cycle:

```
THE WILSON CYCLE (500 Myr period)

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                   │
    │   DISPERSED                 CONVERGING              SUPERCONTINENT
    │   CONTINENTS                                                      │
    │                                                                   │
    │   ┌─┐    ┌─┐                ┌─┐  ┌─┐                 ┌───────┐   │
    │   │A│    │B│        →       │A│←→│B│        →        │  A+B  │   │
    │   └─┘    └─┘                └─┘  └─┘                 └───────┘   │
    │        Ocean                  ↓                                   │
    │        between             Subduction                 Heat       │
    │                            consumes                   builds     │
    │                            ocean                      beneath    │
    │                                                                   │
    │                                    │                              │
    │                                    ▼                              │
    │                                                                   │
    │   DISPERSED                 RIFTING                  SUPERCONTINENT
    │   CONTINENTS                                         (stressed)   │
    │                                                                   │
    │   ┌─┐    ┌─┐                ┌─┐░░┌─┐                 ┌───────┐   │
    │   │A│    │B│        ←       │A│  │B│        ←        │▓▓▓▓▓▓▓│   │
    │   └─┘    └─┘                └─┘░░└─┘                 └───────┘   │
    │        Ocean                  ↑                         ↑        │
    │        opens              New oceanic              Mantle plume  │
    │                           crust at rift            initiates rift│
    │                                                                   │
    └──────────────────────────────────────────────────────────────────┘

    The cycle is driven by thermal feedback:
    • Supercontinents insulate the mantle (like a blanket)
    • Heat accumulates → mantle plumes form
    • Plumes weaken lithosphere → rifting initiates
    • Continents separate → new ocean basins open
    • Cycle continues...
```

### 1.5 What This Means for Map Generation

If we want geologically plausible maps, we should:

1. **Start with uniform oceanic crust** (the primordial state)
2. **Simulate plate motion through time** (multiple eras)
3. **Track differentiation** (volcanic arcs → proto-continents → cratons)
4. **Allow emergent continental distribution** (where subduction persists)
5. **Record the history** (which locations were active when)

The final land/ocean mask then *emerges* from this history, and downstream stages (morphology) can use the historical record to place mountains, volcanoes, and other features appropriately.

---

## Chapter 2: The Three Tectonic Regimes

### 2.1 Regime Classification

Not all plate boundaries are equal. The type of interaction depends on relative motion:

```
THE THREE BOUNDARY REGIMES

    CONVERGENT (plates approaching)
    ───────────────────────────────

        Plate A              Plate B
        ───────→            ←───────
              ╲            ╱
               ╲    ▼    ╱    Crust thickens or
                ╲      ╱      one plate subducts
                 ╲    ╱
                  ╲  ╱
                   ╲╱

    Effects: Mountains, volcanic arcs, subduction zones
    Material: Consumed (subduction) or compressed (collision)


    DIVERGENT (plates separating)
    ─────────────────────────────

        Plate A              Plate B
        ←───────            ───────→
              │            │
              │    ▲ ▲    │    New crust forms
              │   magma   │    at spreading center
              │    ▲ ▲    │
              └────────────┘

    Effects: Mid-ocean ridges, rift valleys
    Material: Created (new oceanic crust)


    TRANSFORM (plates sliding past)
    ───────────────────────────────

        Plate A    ═══════════════
        ───────→   ║             ║
                   ║  Shear zone ║
        ←───────   ║             ║
        Plate B    ═══════════════

    Effects: Fault zones, minor volcanism at bends
    Material: Neither created nor destroyed
```

### 2.2 The Subduction Decision

At convergent boundaries, a critical question arises: **which plate subducts?**

The answer depends on **buoyancy**:
- Dense material sinks
- Buoyant material floats

```
SUBDUCTION DECISION TREE

    Two plates converging
            │
            ▼
    ┌───────────────────────────────────────────────┐
    │  Compare buoyancy (≈ crustal maturity)        │
    └───────────────────────────────────────────────┘
            │
            ├─── Both oceanic (low maturity)
            │         │
            │         ▼
            │    Older/colder plate subducts
            │    (has had time to densify)
            │
            ├─── One oceanic, one continental
            │         │
            │         ▼
            │    Oceanic ALWAYS subducts
            │    (continental too buoyant)
            │
            └─── Both continental (high maturity)
                      │
                      ▼
                 COLLISION
                 (neither can subduct)
                 → Massive crustal thickening
                 → Himalayan-scale mountains
```

This decision is fundamental to how our simulation operates. Rather than pre-labeling crust as "oceanic" or "continental," we track a continuous **maturity** metric and let the physics decide.

---

## Chapter 3: From Physics to Algorithm

### 3.1 The Computational Challenge

We cannot simulate true geological timescales (billions of years) at molecular resolution. Instead, we create a **reduced-order model** that captures the essential dynamics:

| Physical Process | Simulation Approximation |
|-----------------|-------------------------|
| Mantle convection | Plate velocity field (prescribed or procedural) |
| Subduction | Cell removal + maturity transfer |
| Differentiation | Maturity increment at volcanic arcs |
| Rifting | Cell reset to maturity = 0 |
| Collision | Maturity and thickness increase |
| Thermal blanketing | Heat accumulation under continental cells |

### 3.2 The Mesh Abstraction

We operate on a **Voronoi mesh** rather than directly on game tiles:

```
WHY USE A MESH?

    Game Tiles (fine)                 Voronoi Mesh (coarse)

    ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐            ╭───────╮ ╭─────╮
    ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤            │       │╱      ╲
    ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤            │   A   ╱   B    │
    ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤     vs     │      ╱╲       │
    ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤            ╰─────╱  ╲──────╯
    ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤             ╭───╱    ╲───╮
    └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘             │  C  │  D   │
                                       ╰─────╯╰─────╯
    ~72,000 tiles                     ~2,000 cells

    Benefits of mesh:
    • O(cells) operations instead of O(tiles)
    • Natural irregular boundaries (like real plates)
    • Clean adjacency for boundary detection
    • Project to tiles only at the end
```

### 3.3 The Era Abstraction

Geological time is discretized into **eras**—each representing a significant chunk of planetary history:

```
ERAS AS DISCRETE TIME STEPS

    Era 0          Era 1          Era 2          Era 3
    ──────────────────────────────────────────────────────→ time
    │              │              │              │
    │ Archean      │ Proterozoic  │ Paleozoic    │ Recent
    │ (~1 Gyr)     │ (~1 Gyr)     │ (~500 Myr)   │ (~200 Myr)
    │              │              │              │
    Initial        Continental    Supercontinent  Current
    oceanic        nuclei form    assembles       state
    shell

    Each era:
    1. Compute boundary interactions
    2. Apply material flow (subduction, rifting)
    3. Update crustal maturity (differentiation)
    4. Snapshot the era mask
    5. Age all existing crust
```

### 3.4 The Maturity Metric

Instead of binary oceanic/continental, we use continuous **maturity**:

```
CRUSTAL MATURITY SPECTRUM

    0.0                                                    1.0
    │                                                       │
    ├───────┬───────┬───────┬───────┬───────┬───────┬──────┤
    │       │       │       │       │       │       │      │
    MORB    Young   Island  Proto-  Conti-  Mature  Ancient
    basalt  oceanic arc     conti-  nental  craton  craton
                            nental
    │       │       │       │       │       │       │      │
    └───────┴───────┴───────┴───────┴───────┴───────┴──────┘

    Density:  3.0 ─────────────────────────────────────→ 2.7 g/cm³
    Buoyancy: Low ─────────────────────────────────────→ High
    Subducts: Easily ──────────────────────────────────→ Never

    Thresholds:
    • < 0.25: Oceanic (can subduct)
    • 0.25-0.50: Transitional (reluctant to subduct)
    • > 0.50: Continental (collides rather than subducts)
    • > 0.85: Cratonic (stable shield)
```

This continuous representation allows:
- Gradual accumulation of continental character
- Smooth transitions at margins
- Physics-based subduction decisions
- Backward compatibility (threshold → binary)

---

# Part II: The Refactored Architecture

## Chapter 4: System Overview

### 4.1 The Pipeline at a Glance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REFACTORED FOUNDATION PIPELINE                            │
│                                                                              │
│   INPUTS                                                                     │
│   ══════                                                                     │
│   • Map dimensions (width × height)                                          │
│   • RNG seed (for reproducibility)                                           │
│   • Foundation configuration                                                 │
│                                                                              │
│                           │                                                  │
│                           ▼                                                  │
│   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│   ┃  LAYER 0: GEOMETRIC SUBSTRATE                                        ┃   │
│   ┃  ─────────────────────────────                                       ┃   │
│   ┃  • Generate Voronoi mesh (Lloyd-relaxed)                             ┃   │
│   ┃  • Build adjacency graph (CSR format)                                ┃   │
│   ┃  • Output: FoundationMesh                                            ┃   │
│   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                           │                                                  │
│                           ▼                                                  │
│   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│   ┃  LAYER 1: PLATE SYSTEM                                               ┃   │
│   ┃  ─────────────────────                                               ┃   │
│   ┃  • Seed plate nuclei                                                 ┃   │
│   ┃  • Grow plates via weighted Dijkstra                                 ┃   │
│   ┃  • Assign kinematics (intent-driven velocities)                      ┃   │
│   ┃  • Output: FoundationPlateGraph                                      ┃   │
│   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                           │                                                  │
│                           ▼                                                  │
│   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│   ┃  LAYER 2: TECTONIC EVOLUTION ENGINE (NEW)                            ┃   │
│   ┃  ────────────────────────────────────                                ┃   │
│   ┃  • Initialize uniform oceanic crust (maturity = 0)                   ┃   │
│   ┃  • FOR each era:                                                     ┃   │
│   ┃      - Compute boundary interactions                                 ┃   │
│   ┃      - Apply material flow (subduction, rifting, collision)          ┃   │
│   ┃      - Update crustal maturity (differentiation)                     ┃   │
│   ┃      - Apply thermal feedback (optional)                             ┃   │
│   ┃      - Snapshot era mask                                             ┃   │
│   ┃  • Output: FoundationEvolution, FoundationCrust (derived)            ┃   │
│   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                           │                                                  │
│                           ▼                                                  │
│   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│   ┃  LAYER 3: TILE-SPACE PROJECTION                                      ┃   │
│   ┃  ─────────────────────────────                                       ┃   │
│   ┃  • Map mesh cells to game tiles                                      ┃   │
│   ┃  • Compute boundary influence fields                                 ┃   │
│   ┃  • Project era masks and evolution state                             ┃   │
│   ┃  • Output: FoundationPlates, FoundationCrustTiles, EraMasks          ┃   │
│   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                           │                                                  │
│                           ▼                                                  │
│   OUTPUTS (to Morphology)                                                    │
│   ═══════════════════════                                                    │
│   • Plate assignments + kinematics per tile                                  │
│   • Crustal maturity, thickness, age per tile                                │
│   • Era masks: which tiles active when, what happened                        │
│   • Boundary closeness and type per tile                                     │
│   • Tectonic accumulation (total "work") per tile                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 What Changed vs Current System

| Aspect | Current System | Refactored System |
|--------|---------------|-------------------|
| Crustal assignment | Pre-computed via region-growing | Emerges from tectonic evolution |
| Temporal model | Backward drift (fake history) | Forward simulation (real history) |
| Era data | Intensity values only | Full event records + masks |
| Plate velocities | Random assignment | Intent-driven (coherent patterns) |
| Continental ratio | Input parameter | Emergent from dynamics |
| Configuration | Duplicated, magic numbers | Unified, semantic knobs |
| Downstream signal | "Uplift potential" (scalar) | Event type + era + intensity |

---

## Chapter 5: Layer 0 — Geometric Substrate

### 5.1 Purpose

Create the computational mesh upon which all geological modeling occurs.

### 5.2 Algorithm: Lloyd-Relaxed Voronoi

```
MESH GENERATION ALGORITHM

    Input: width, height, cellCount, relaxationSteps, rngSeed

    Step 1: SEED POINTS
    ───────────────────
    Generate cellCount random points in [0, width×HEX_WIDTH) × [0, height×HEX_HEIGHT)

        ·    ·  ·      ·
          ·       ·  ·     (random, clustered)
        ·   · ·      ·

    Step 2: CYLINDRICAL EXPANSION
    ─────────────────────────────
    Replicate points at x-wrapWidth, x, x+wrapWidth for periodic boundaries

    Step 3: DELAUNAY TRIANGULATION
    ──────────────────────────────
    Compute Delaunay triangulation (via d3-delaunay)
    Extract Voronoi dual graph

    Step 4: LLOYD RELAXATION (repeat N times)
    ─────────────────────────────────────────
    For each cell:
        Compute centroid of Voronoi polygon
        Move site to centroid
    Rebuild Delaunay/Voronoi

        ·    ·    ·    ·
        ·    ·    ·    ·     (evenly distributed)
        ·    ·    ·    ·

    Step 5: EXTRACT ADJACENCY
    ─────────────────────────
    For each cell, collect neighbor indices
    Store in CSR (Compressed Sparse Row) format:
        neighborsOffsets[cellCount+1]: start index per cell
        neighbors[totalEdges]: neighbor cell indices

    Output: FoundationMesh {
        cellCount, wrapWidth,
        siteX, siteY,
        neighborsOffsets, neighbors,
        areas, bbox
    }
```

### 5.3 Artifacts Produced

```typescript
interface FoundationMesh {
  cellCount: number;              // ~2000 cells typically
  wrapWidth: number;              // Cylindrical wrap distance
  siteX: Float32Array;            // Cell center X coordinates
  siteY: Float32Array;            // Cell center Y coordinates
  neighborsOffsets: Int32Array;   // CSR adjacency offsets
  neighbors: Int32Array;          // CSR adjacency indices
  areas: Float32Array;            // Cell areas (for weighting)
  bbox: { xl, xr, yt, yb };       // Bounding box
}
```

### 5.4 Configuration (Simplified)

```typescript
mesh: {
  cellsPerPlate: 7,        // Cells per plate (detail level)
  relaxationSteps: 4,      // Lloyd iterations (2-6 typical)
}
// Note: cellCount derived from plates.count × mesh.cellsPerPlate
```

---

## Chapter 6: Layer 1 — Plate System

### 6.1 Purpose

Partition the mesh into tectonic plates and assign kinematic properties (velocity, rotation).

### 6.2 Algorithm: Intent-Driven Plate Assignment

The refactored system introduces **kinematic intent** — a high-level control over plate motion patterns.

```
PLATE ASSIGNMENT ALGORITHM

    Input: mesh, config.plates, config.kinematics

    Step 1: DETERMINE PLATE COUNT
    ─────────────────────────────
    baseCount = config.plates.count
    scaledCount = baseCount × (mapArea / REFERENCE_AREA)^scalingExponent

        scalingCurve    exponent
        ─────────────   ────────
        "none"          0.0      (fixed count regardless of map size)
        "sublinear"     0.5      (sqrt scaling)
        "linear"        1.0      (proportional scaling)

    Step 2: POLAR CAP RESERVATION
    ─────────────────────────────
    Reserve top/bottom capFraction (10%) for polar caps
    These get special tangential kinematics

    Step 3: SEED PLATE NUCLEI
    ─────────────────────────
    For each plate:
        Select seed cell via quality scoring:
        • Major plates prefer central locations (maximize separation)
        • Minor plates fill gaps

    Step 4: WEIGHTED DIJKSTRA GROWTH
    ────────────────────────────────
    Initialize priority queue with seed cells at cost 0

    While queue not empty:
        Pop lowest-cost cell
        For each unassigned neighbor:
            edgeCost = cellResistance / plateWeight
            If newCost < currentCost:
                Assign cell to plate
                Push to queue

    Key insight: resistance is UNIFORM at this stage
    (no pre-assigned continental crust to avoid)

    Step 5: ASSIGN KINEMATICS (NEW: INTENT-DRIVEN)
    ──────────────────────────────────────────────

    Based on config.kinematics.globalIntent:

    "converging":
    ─────────────
    All plates move toward map center

        ↘   ↓   ↙
         ↘  ↓  ↙
        → → ● ← ←    (supercontinent assembly)
         ↗  ↑  ↖
        ↗   ↑   ↖

    "dispersing":
    ──────────────
    All plates move away from center

        ↖   ↑   ↗
         ↖  ↑  ↗
        ← ← ● → →    (supercontinent breakup)
         ↙  ↓  ↘
        ↙   ↓   ↘

    "rotational":
    ──────────────
    Plates rotate around center

        ↑   →   ↓
        ↑       ↓
        ← ← ● → →    (carousel pattern)
        ↑       ↓
        ↑   ←   ↓

    "diverse":
    ──────────
    Random directions (current behavior, but smoothed)

    Final velocity = coherence × intentVelocity + (1-coherence) × randomVelocity

    Output: FoundationPlateGraph {
        cellToPlate, plates[{id, role, kind, seedX, seedY, velocityX, velocityY, rotation}]
    }
```

### 6.3 The Coherence Parameter

```
COHERENCE EFFECT ON PLATE MOTION

    coherence = 0.0                coherence = 0.5               coherence = 1.0
    (pure random)                  (mixed)                       (pure intent)

       ↗  ←  ↓                      ↘  ↓  ↙                       ↘  ↓  ↙
    ↑     ·     ↙                 ↗    ·    ↙                    →    ·    ←
       ↓  →  ↖                      →  ↑  ↖                       →  ↑  ←

    Chaotic, random               Somewhat coherent             Perfectly coherent
    boundaries                    boundaries                    boundaries
```

### 6.4 Configuration

```typescript
plates: {
  count: 12,                          // Base plate count
  scalingCurve: "sublinear",          // How count scales with map size
},
kinematics: {
  globalIntent: "diverse",            // "converging"|"dispersing"|"rotational"|"diverse"
  coherence: 0.5,                     // 0 = random, 1 = pure intent
  speedProfile: "moderate",           // "sluggish"|"moderate"|"vigorous"
},
polarCaps: {
  enabled: true,
  capFraction: 0.1,                   // Fraction of Y-span reserved
  microplatesPerPole: 2,              // Small plates in polar regions
}
```

---

## Chapter 7: Layer 2 — Tectonic Evolution Engine

This is the heart of the refactor. The Evolution Engine runs a forward simulation through geological time, tracking material flow and crustal differentiation.

### 7.1 Purpose

- Simulate plate interactions through multiple eras
- Track crustal maturity as it evolves from oceanic to continental
- Record which locations were active in which eras
- Produce era masks for downstream consumption

### 7.2 Data Structures

```typescript
// Evolution state tracked per mesh cell
interface EvolutionState {
  currentPlateId: Int16Array;       // Which plate owns this cell now
  lastBoundaryEra: Uint8Array;      // When was last tectonic event (255=never)
  lastBoundaryEvent: Uint8Array;    // What type of event (BOUNDARY_EVENT)
  tectonicWork: Float32Array;       // Accumulated stress/deformation
}

// Crustal state tracked per mesh cell
interface CrustalState {
  maturity: Float32Array;           // 0.0 (oceanic) to 1.0 (cratonic)
  thickness: Float32Array;          // Crustal thickness (km equivalent)
  age: Uint16Array;                 // Eras since this crust formed
}

// Thermal state (optional, for Wilson Cycle)
interface ThermalState {
  mantleHeat: Float32Array;         // Heat accumulation under cell
}

// Per-era snapshot
interface EraMask {
  activated: Uint8Array;            // Which cells were affected this era
  eventType: Uint8Array;            // BOUNDARY_EVENT per cell
  intensity: Uint8Array;            // Event intensity (0-255)
  maturitySnapshot: Float32Array;   // Maturity at end of this era
}

// Event classification
enum BOUNDARY_EVENT {
  NONE = 0,
  SUBDUCTION_OVERRIDING = 1,        // On plate that "wins"
  SUBDUCTION_CONSUMED = 2,          // Material destroyed
  RIFT_CREATED = 3,                 // New oceanic crust formed
  TRANSFORM_SHEARED = 4,            // Shear stress applied
  COLLISION_COMPRESSED = 5,         // Continental collision
}
```

### 7.3 The Main Simulation Loop

```
TECTONIC EVOLUTION ALGORITHM

    Input: mesh, plateGraph, config

    ═══════════════════════════════════════════════════════════════════════
    INITIALIZATION
    ═══════════════════════════════════════════════════════════════════════

    // Start with uniform oceanic crust (the primordial state)
    FOR each cell i:
        crustalState.maturity[i] = 0.0                  // Pure basalt
        crustalState.thickness[i] = INITIAL_OCEANIC_THICKNESS  // ~7 km
        crustalState.age[i] = 0

    evolutionState = initializeFromPlateGraph(plateGraph)
    thermalState = initializeZero() if thermalEnabled

    eraMasks = []

    ═══════════════════════════════════════════════════════════════════════
    MAIN LOOP: FOR era = 0 TO config.eras - 1
    ═══════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────────────────┐
        │  STEP 1: DETECT BOUNDARY INTERACTIONS                           │
        └─────────────────────────────────────────────────────────────────┘

        boundaries = []
        FOR each cell i:
            FOR each neighbor j of cell i:
                IF plateId[i] ≠ plateId[j] AND i < j:  // Avoid duplicates
                    boundary = analyzeBoundary(i, j, plateGraph, crustalState)
                    boundaries.push(boundary)

        ┌─────────────────────────────────────────────────────────────────┐
        │  STEP 2: CLASSIFY EACH BOUNDARY                                 │
        └─────────────────────────────────────────────────────────────────┘

        FOR each boundary:
            // Compute relative velocity
            relativeV = plateVelocity[boundary.plateB] - plateVelocity[boundary.plateA]
            normalComponent = dot(relativeV, boundary.normal)
            tangentComponent = dot(relativeV, boundary.tangent)

            // Classify regime
            IF |normalComponent| > |tangentComponent|:
                IF normalComponent < 0:
                    boundary.regime = CONVERGENT
                ELSE:
                    boundary.regime = DIVERGENT
            ELSE:
                boundary.regime = TRANSFORM

            // For convergent: determine interaction type based on maturity
            IF boundary.regime == CONVERGENT:
                maturityA = avgMaturity(boundary.cellsA, crustalState)
                maturityB = avgMaturity(boundary.cellsB, crustalState)

                IF maturityA > CONTINENTAL_THRESHOLD AND maturityB > CONTINENTAL_THRESHOLD:
                    boundary.interaction = CONTINENTAL_COLLISION
                ELSE IF maturityA > CONTINENTAL_THRESHOLD:
                    boundary.interaction = OCEAN_UNDER_CONTINENT
                    boundary.subductingPlate = boundary.plateB
                ELSE IF maturityB > CONTINENTAL_THRESHOLD:
                    boundary.interaction = OCEAN_UNDER_CONTINENT
                    boundary.subductingPlate = boundary.plateA
                ELSE:
                    boundary.interaction = OCEAN_OCEAN_SUBDUCTION
                    // Older oceanic plate subducts
                    boundary.subductingPlate = olderPlate(boundary, crustalState)

        ┌─────────────────────────────────────────────────────────────────┐
        │  STEP 3: APPLY MATERIAL FLOW                                    │
        └─────────────────────────────────────────────────────────────────┘

        updates = new CellUpdates()

        FOR each boundary:
            SWITCH boundary.interaction:

                CASE OCEAN_OCEAN_SUBDUCTION:
                CASE OCEAN_UNDER_CONTINENT:
                    // Subducting plate loses cells
                    consumedCells = selectCellsToConsume(boundary, config.rates.subduction)
                    FOR each cell in consumedCells:
                        updates.consumed.add(cell)
                        evolutionState.lastBoundaryEra[cell] = era
                        evolutionState.lastBoundaryEvent[cell] = SUBDUCTION_CONSUMED

                    // Overriding plate gets volcanic arc
                    arcCells = selectArcCells(boundary, config.zones.arcWidth)
                    FOR each cell in arcCells:
                        updates.volcanic.add(cell)
                        evolutionState.lastBoundaryEra[cell] = era
                        evolutionState.lastBoundaryEvent[cell] = SUBDUCTION_OVERRIDING

                CASE CONTINENTAL_COLLISION:
                    // Neither subducts; crust thickens
                    collisionCells = selectCollisionZone(boundary, config.zones.collisionWidth)
                    FOR each cell in collisionCells:
                        updates.compressed.add(cell)
                        evolutionState.lastBoundaryEra[cell] = era
                        evolutionState.lastBoundaryEvent[cell] = COLLISION_COMPRESSED
                        crustalState.thickness[cell] += COLLISION_THICKENING

                CASE DIVERGENT:
                    // New oceanic crust forms at spreading center
                    FOR each cell in boundary.cells:
                        updates.created.add(cell)
                        evolutionState.lastBoundaryEra[cell] = era
                        evolutionState.lastBoundaryEvent[cell] = RIFT_CREATED
                        crustalState.maturity[cell] = 0.0  // Reset to oceanic
                        crustalState.thickness[cell] = INITIAL_OCEANIC_THICKNESS
                        crustalState.age[cell] = 0

                CASE TRANSFORM:
                    FOR each cell in boundary.cells:
                        updates.sheared.add(cell)
                        evolutionState.lastBoundaryEra[cell] = era
                        evolutionState.lastBoundaryEvent[cell] = TRANSFORM_SHEARED

        ┌─────────────────────────────────────────────────────────────────┐
        │  STEP 4: APPLY CRUSTAL DIFFERENTIATION                          │
        └─────────────────────────────────────────────────────────────────┘

        // This is where continents are MANUFACTURED
        FOR each cell in updates.volcanic:
            currentMaturity = crustalState.maturity[cell]
            headroom = 1.0 - currentMaturity

            // Logistic growth: fast at low maturity, saturates high
            increment = config.rates.differentiation * headroom * headroom
            crustalState.maturity[cell] = min(1.0, currentMaturity + increment)

            // Thickness increases with differentiation
            crustalState.thickness[cell] += increment * THICKNESS_PER_MATURITY

        // Collision also increases maturity (metamorphism)
        FOR each cell in updates.compressed:
            currentMaturity = crustalState.maturity[cell]
            increment = config.rates.collision * (1.0 - currentMaturity)
            crustalState.maturity[cell] = min(1.0, currentMaturity + increment)

        ┌─────────────────────────────────────────────────────────────────┐
        │  STEP 5: APPLY THERMAL FEEDBACK (if enabled)                    │
        └─────────────────────────────────────────────────────────────────┘

        IF config.thermal.enabled:
            FOR each cell i:
                IF crustalState.maturity[i] > INSULATION_THRESHOLD:
                    // Continental crust insulates mantle
                    thermalState.mantleHeat[i] += config.thermal.accumulationRate
                ELSE:
                    // Oceanic crust allows heat escape
                    thermalState.mantleHeat[i] *= config.thermal.dissipationFactor

            // Check for rift initiation (supercontinent breakup)
            FOR each cell i:
                IF thermalState.mantleHeat[i] > config.thermal.riftThreshold:
                    IF crustalState.maturity[i] > CONTINENTAL_THRESHOLD:
                        // Mantle plume initiates rifting
                        initiateRift(i, evolutionState, crustalState)

        ┌─────────────────────────────────────────────────────────────────┐
        │  STEP 6: AGE ALL CRUST AND ACCUMULATE WORK                      │
        └─────────────────────────────────────────────────────────────────┘

        FOR each cell i:
            IF cell not in updates.consumed AND cell not in updates.created:
                crustalState.age[i] += 1

            // Accumulate tectonic work for affected cells
            IF cell in any updates set:
                evolutionState.tectonicWork[i] += computeWorkIntensity(boundary)

        ┌─────────────────────────────────────────────────────────────────┐
        │  STEP 7: SNAPSHOT ERA MASK                                      │
        └─────────────────────────────────────────────────────────────────┘

        eraMask = new EraMask(mesh.cellCount)
        FOR each cell i:
            IF cell in any updates set:
                eraMask.activated[i] = 1
                eraMask.eventType[i] = evolutionState.lastBoundaryEvent[i]
                eraMask.intensity[i] = computeIntensity(evolutionState.tectonicWork[i])
            eraMask.maturitySnapshot[i] = crustalState.maturity[i]

        eraMasks.push(eraMask)

    ═══════════════════════════════════════════════════════════════════════
    END LOOP
    ═══════════════════════════════════════════════════════════════════════

    // Derive discrete crust type for backward compatibility
    discreteCrust = new Uint8Array(mesh.cellCount)
    FOR each cell i:
        discreteCrust[i] = crustalState.maturity[i] >= CONTINENTAL_THRESHOLD ? 1 : 0

    RETURN {
        evolutionState,
        crustalState,
        eraMasks,
        discreteCrust  // For legacy compatibility
    }
```

### 7.4 Visual: Evolution Through Eras

```
ERA-BY-ERA CONTINENTAL EVOLUTION

Era 0: Initial State (Uniform Oceanic)
┌────────────────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                           maturity: 0.0 everywhere                     │
└────────────────────────────────────────────────────────────────────────┘

Era 2: Subduction Begins, Volcanic Arcs Form
┌────────────────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒░░░░░░░░░░░░░░░░░░░░░░░░░│
│                     ▒ = island arc (maturity 0.2-0.3)                  │
└────────────────────────────────────────────────────────────────────────┘

Era 4: Arcs Mature into Proto-Continents
┌────────────────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░▒▓▓▓▒░░░░░░░░░░░░░░░░░░░░░░░░▒▓▓▓▒░░░░░░░░░░░░░░▒▒░░░░░░░│
│░░░░░░░░░░░░▒▓▓▓▒░░░░░░░░░░░░░░░░░░░░░░░░▒▓▓▓▒░░░░░░░░░░░░░░▒▒░░░░░░░│
│░░░░░░░░░░░░▒▓▓▓▒░░░░░░░░░░░░░░░░░░░░░░░░▒▓▓▓▒░░░░░░░░░░░░░░▒▒░░░░░░░│
│                     ▓ = proto-continental (maturity 0.5-0.6)           │
└────────────────────────────────────────────────────────────────────────┘

Era 6: Continents Converge (if "converging" intent)
┌────────────────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░▒▓▓░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓████████▓▓▓░░░░░░░░░░░░░░░░░░░░░▒▓▓░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░▒▓▓░░░░░░│
│             █ = continental collision zone (highest maturity)          │
└────────────────────────────────────────────────────────────────────────┘

Era 8: Supercontinent Rifts (thermal blanketing effect)
┌────────────────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░▓▓▓▓░░░░░░░░░░░░░░░░░▓▓▓░░░░░░░░░░░░░░▓▓▒░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░▓██▓░░░░░░░░░░░░░░░░░███░░░░░░░░░░░░░░▓█▒░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░▓▓▓▓░░░░░░░░░░░░░░░░░▓▓▓░░░░░░░░░░░░░░▓▓▒░░░░░░░░░░│
│         New oceanic crust (░) at rifts; continents separate            │
└────────────────────────────────────────────────────────────────────────┘

Legend:
░ = oceanic (maturity 0.0-0.2)
▒ = transitional/arc (maturity 0.2-0.5)
▓ = continental (maturity 0.5-0.8)
█ = cratonic (maturity 0.8+)
```

### 7.5 Configuration

```typescript
evolution: {
  eras: 8,                            // Number of time steps (5-12 typical)

  rates: {
    differentiation: 0.06,            // Maturity gain at volcanic arcs
    collision: 0.04,                  // Maturity gain at collision zones
    subduction: 0.8,                  // Cells consumed per velocity unit
    spreading: 0.6,                   // New cells created per velocity unit
  },

  zones: {
    arcWidth: 3,                      // Cells behind trench in volcanic arc
    collisionWidth: 5,                // Width of collision deformation zone
    riftShoulderWidth: 2,             // Width of rift flank uplift
  },

  thresholds: {
    continental: 0.5,                 // Maturity above which = continental
    collision: 0.55,                  // Both must exceed for collision
    cratonic: 0.85,                   // Stable ancient shield
  },

  thermal: {
    enabled: true,                    // Enable Wilson Cycle dynamics
    accumulationRate: 0.1,            // Heat buildup under continents
    dissipationFactor: 0.95,          // Heat loss through oceanic crust
    riftThreshold: 1.5,               // Heat level to trigger rifting
  },
}
```

---

## Chapter 8: Layer 3 — Tile-Space Projection

### 8.1 Purpose

Transform mesh-space data into tile-space data that morphology can consume.

### 8.2 Algorithm: Projection with Influence Fields

```
PROJECTION ALGORITHM

    Input: mesh, evolutionResult, plates, width, height

    Step 1: BUILD TILE-TO-CELL MAPPING
    ──────────────────────────────────
    FOR each tile (x, y):
        Convert to hex-space coordinates (hx, hy)
        Find nearest mesh cell via spatial lookup
        tileToCellIndex[tileIndex] = nearestCell

    Step 2: PROJECT BASIC PROPERTIES
    ─────────────────────────────────
    FOR each tile:
        cell = tileToCellIndex[tile]

        // Plate assignment
        tiles.plateId[tile] = evolutionState.currentPlateId[cell]

        // Crustal properties
        tiles.maturity[tile] = crustalState.maturity[cell]
        tiles.thickness[tile] = crustalState.thickness[cell]
        tiles.crustAge[tile] = crustalState.age[cell]
        tiles.crustType[tile] = maturity >= CONTINENTAL_THRESHOLD ? 1 : 0

        // Evolution history
        tiles.lastBoundaryEra[tile] = evolutionState.lastBoundaryEra[cell]
        tiles.lastBoundaryEvent[tile] = evolutionState.lastBoundaryEvent[cell]
        tiles.tectonicWork[tile] = evolutionState.tectonicWork[cell]

        // Kinematics
        plate = plateGraph.plates[tiles.plateId[tile]]
        tiles.movementU[tile] = quantize(plate.velocityX)
        tiles.movementV[tile] = quantize(plate.velocityY)
        tiles.rotation[tile] = quantize(plate.rotation)

    Step 3: COMPUTE BOUNDARY INFLUENCE FIELD
    ────────────────────────────────────────
    // Identify boundary tiles
    boundarySeeds = []
    FOR each tile:
        FOR each hex neighbor:
            IF plateId[tile] ≠ plateId[neighbor]:
                boundarySeeds.add(tile)
                BREAK

    // BFS from boundary seeds
    distance = new Uint8Array(tileCount).fill(255)
    FOR each seed in boundarySeeds:
        distance[seed] = 0

    queue = boundarySeeds
    WHILE queue not empty:
        tile = queue.pop()
        IF distance[tile] >= config.boundaryReachTiles:
            CONTINUE
        FOR each hex neighbor:
            IF distance[neighbor] > distance[tile] + 1:
                distance[neighbor] = distance[tile] + 1
                queue.push(neighbor)

    // Compute closeness with exponential decay
    FOR each tile:
        d = distance[tile]
        IF d < 255:
            tiles.boundaryCloseness[tile] = 255 * exp(-d * config.falloffDecay)
        ELSE:
            tiles.boundaryCloseness[tile] = 0

        // Shield stability is inverse of closeness
        tiles.shieldStability[tile] = 255 - tiles.boundaryCloseness[tile]

    Step 4: PROJECT ERA MASKS
    ─────────────────────────
    tiles.eraMasks = []
    FOR each eraMask in evolutionResult.eraMasks:
        tileEraMask = new TileEraMask(tileCount)
        FOR each tile:
            cell = tileToCellIndex[tile]
            tileEraMask.activated[tile] = eraMask.activated[cell]
            tileEraMask.eventType[tile] = eraMask.eventType[cell]
            tileEraMask.intensity[tile] = eraMask.intensity[cell]
            tileEraMask.maturity[tile] = eraMask.maturitySnapshot[cell]
        tiles.eraMasks.push(tileEraMask)

    Step 5: COMPUTE DERIVED TERRAIN HINTS
    ─────────────────────────────────────
    FOR each tile:
        era = tiles.lastBoundaryEra[tile]
        event = tiles.lastBoundaryEvent[tile]
        totalEras = config.eras

        IF era == 255:
            // Never active: stable craton
            tiles.terrainHint[tile] = TERRAIN_HINT.STABLE_CRATON
        ELSE IF event == COLLISION_COMPRESSED:
            IF era >= totalEras - 2:
                tiles.terrainHint[tile] = TERRAIN_HINT.MOUNTAIN_YOUNG
            ELSE:
                tiles.terrainHint[tile] = TERRAIN_HINT.MOUNTAIN_MATURE
        ELSE IF event == SUBDUCTION_OVERRIDING:
            IF era >= totalEras - 2:
                tiles.terrainHint[tile] = TERRAIN_HINT.VOLCANIC_ARC
            ELSE:
                tiles.terrainHint[tile] = TERRAIN_HINT.MOUNTAIN_MATURE
        ELSE IF event == RIFT_CREATED:
            tiles.terrainHint[tile] = TERRAIN_HINT.RIFT_VALLEY
        ELSE IF event == TRANSFORM_SHEARED:
            tiles.terrainHint[tile] = TERRAIN_HINT.TRANSFORM_ZONE
        ELSE:
            tiles.terrainHint[tile] = TERRAIN_HINT.NONE

    RETURN tiles
```

### 8.3 Artifacts Produced

```typescript
interface FoundationTiles {
  // Plate system
  plateId: Int16Array;              // Plate assignment per tile
  boundaryCloseness: Uint8Array;    // Distance to boundary (0-255)
  shieldStability: Uint8Array;      // Inverse of closeness

  // Crustal properties
  maturity: Float32Array;           // Continuous differentiation (0-1)
  thickness: Float32Array;          // Crustal thickness (km equiv)
  crustAge: Uint16Array;            // Age in eras
  crustType: Uint8Array;            // Discrete: 0=oceanic, 1=continental

  // Evolution history
  lastBoundaryEra: Uint8Array;      // Era of last activity (255=never)
  lastBoundaryEvent: Uint8Array;    // Event type (BOUNDARY_EVENT)
  tectonicWork: Float32Array;       // Accumulated deformation

  // Terrain guidance
  terrainHint: Uint8Array;          // TERRAIN_HINT for morphology

  // Kinematics
  movementU: Int8Array;             // Plate velocity X component
  movementV: Int8Array;             // Plate velocity Y component
  rotation: Int8Array;              // Plate rotation

  // Era masks (per-era snapshots)
  eraMasks: TileEraMask[];
}

interface TileEraMask {
  activated: Uint8Array;            // Was this tile active in this era?
  eventType: Uint8Array;            // What happened?
  intensity: Uint8Array;            // How intense?
  maturity: Float32Array;           // Maturity at end of era
}

enum TERRAIN_HINT {
  NONE = 0,
  MOUNTAIN_YOUNG = 1,               // Recent collision/subduction
  MOUNTAIN_MATURE = 2,              // Older orogeny, eroded
  RIFT_VALLEY = 3,                  // Active rifting
  VOLCANIC_ARC = 4,                 // Subduction volcanism
  TRANSFORM_ZONE = 5,               // Shear zone
  STABLE_CRATON = 6,                // Never-active ancient shield
}
```

### 8.4 Configuration

```typescript
projection: {
  influence: {
    boundaryReachTiles: 12,         // How far boundary effects spread
    falloffProfile: "moderate",      // "sharp"|"moderate"|"gradual"
  },
  // Note: Decay coefficient derived from falloffProfile
  // sharp: 0.7, moderate: 0.55, gradual: 0.4
}
```

---

# Part III: The Unified Configuration Schema

## Chapter 9: Configuration Philosophy

### 9.1 Principles

The current configuration suffers from several problems:
- Duplication (plateCount in two places)
- Derived values exposed as config (referenceArea)
- Magic numbers without semantic meaning
- Unclear relationships between parameters

The refactored configuration follows these principles:

1. **Single source of truth** — Each value appears exactly once
2. **Semantic knobs** — Parameters have meaningful names and units
3. **Layered defaults** — Base → Map Type → User Override
4. **Derived values hidden** — Internal calculations not exposed as config
5. **Coherent grouping** — Related parameters live together

### 9.2 Complete Configuration Schema

```typescript
interface FoundationConfig {
  // ═══════════════════════════════════════════════════════════════════════
  // MESH CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════
  mesh: {
    /**
     * Number of mesh cells per tectonic plate.
     * Higher values = more detailed plate boundaries.
     * Lower values = faster computation, coarser detail.
     * @default 7
     * @range [4, 12]
     */
    cellsPerPlate: number;

    /**
     * Lloyd relaxation iterations for mesh uniformity.
     * Higher = more uniform cell sizes, slower generation.
     * @default 4
     * @range [2, 8]
     */
    relaxationSteps: number;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PLATE SYSTEM
  // ═══════════════════════════════════════════════════════════════════════
  plates: {
    /**
     * Base number of major tectonic plates.
     * Actual count may vary based on scaling.
     * @default 12
     * @range [6, 20]
     */
    count: number;

    /**
     * How plate count scales with map size.
     * - "none": Fixed count regardless of map size
     * - "sublinear": sqrt(area) scaling
     * - "linear": Proportional to area
     * @default "sublinear"
     */
    scalingCurve: "none" | "sublinear" | "linear";

    /**
     * Ratio of major to minor plates.
     * Higher = more small plates filling gaps.
     * @default 0.3
     * @range [0.1, 0.5]
     */
    minorPlateRatio: number;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // KINEMATIC CONTROL
  // ═══════════════════════════════════════════════════════════════════════
  kinematics: {
    /**
     * Global pattern of plate motion.
     * - "converging": Plates move toward map center (assembling)
     * - "dispersing": Plates move away from center (breaking up)
     * - "rotational": Plates rotate around center (carousel)
     * - "diverse": Mixed directions (realistic variety)
     * @default "diverse"
     */
    globalIntent: "converging" | "dispersing" | "rotational" | "diverse";

    /**
     * How strictly plates follow the global intent.
     * 0 = random motion, 1 = pure intent pattern.
     * @default 0.5
     * @range [0, 1]
     */
    coherence: number;

    /**
     * Average plate velocity relative to Earth-like baseline.
     * - "sluggish": Slow motion, fewer boundary interactions
     * - "moderate": Earth-like rates
     * - "vigorous": Fast motion, intense tectonics
     * @default "moderate"
     */
    speedProfile: "sluggish" | "moderate" | "vigorous";
  };

  // ═══════════════════════════════════════════════════════════════════════
  // POLAR REGIONS
  // ═══════════════════════════════════════════════════════════════════════
  polarCaps: {
    /**
     * Whether to reserve polar regions for special treatment.
     * When enabled, creates small plates with tangential motion
     * at map top/bottom.
     * @default true
     */
    enabled: boolean;

    /**
     * Fraction of map height reserved for each polar cap.
     * @default 0.1
     * @range [0.05, 0.15]
     */
    capFraction: number;

    /**
     * Number of small plates in each polar region.
     * @default 2
     * @range [1, 4]
     */
    microplatesPerPole: number;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // EVOLUTION ENGINE
  // ═══════════════════════════════════════════════════════════════════════
  evolution: {
    /**
     * Number of geological eras to simulate.
     * More eras = more realistic continental development,
     * slower generation.
     * @default 8
     * @range [4, 16]
     */
    eras: number;

    /**
     * Material flow rates at boundaries.
     */
    rates: {
      /**
       * Maturity gain per era at volcanic arcs.
       * Controls how fast oceanic crust becomes continental.
       * @default 0.06
       * @range [0.03, 0.12]
       */
      differentiation: number;

      /**
       * Maturity gain per era at collision zones.
       * @default 0.04
       * @range [0.02, 0.08]
       */
      collision: number;

      /**
       * Cell consumption rate at subduction zones.
       * @default 0.8
       * @range [0.4, 1.2]
       */
      subduction: number;

      /**
       * New cell creation rate at spreading centers.
       * @default 0.6
       * @range [0.3, 1.0]
       */
      spreading: number;
    };

    /**
     * Width of tectonic effect zones (in mesh cells).
     */
    zones: {
      /**
       * Width of volcanic arc behind subduction zone.
       * @default 3
       * @range [2, 5]
       */
      arcWidth: number;

      /**
       * Width of deformation at collision zones.
       * @default 5
       * @range [3, 8]
       */
      collisionWidth: number;

      /**
       * Width of rift flank uplift.
       * @default 2
       * @range [1, 4]
       */
      riftShoulderWidth: number;
    };

    /**
     * Maturity thresholds for regime classification.
     */
    thresholds: {
      /**
       * Maturity above which crust is considered continental.
       * Used for subduction decisions.
       * @default 0.5
       * @range [0.4, 0.6]
       */
      continental: number;

      /**
       * Minimum maturity on both sides for collision.
       * @default 0.55
       * @range [0.45, 0.65]
       */
      collision: number;

      /**
       * Maturity above which crust is stable cratonic.
       * @default 0.85
       * @range [0.75, 0.95]
       */
      cratonic: number;
    };

    /**
     * Thermal feedback for Wilson Cycle dynamics.
     */
    thermal: {
      /**
       * Enable heat accumulation under continents.
       * @default true
       */
      enabled: boolean;

      /**
       * Heat accumulation rate under continental crust.
       * @default 0.1
       * @range [0.05, 0.2]
       */
      accumulationRate: number;

      /**
       * Heat dissipation factor through oceanic crust.
       * @default 0.95
       * @range [0.9, 0.98]
       */
      dissipationFactor: number;

      /**
       * Heat threshold to trigger rifting.
       * @default 1.5
       * @range [1.0, 2.5]
       */
      riftThreshold: number;
    };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // TILE PROJECTION
  // ═══════════════════════════════════════════════════════════════════════
  projection: {
    /**
     * Boundary influence field configuration.
     */
    influence: {
      /**
       * Maximum tile distance for boundary effects.
       * @default 12
       * @range [6, 20]
       */
      boundaryReachTiles: number;

      /**
       * How sharply boundary influence falls off.
       * - "sharp": Strong boundaries, distinct zones
       * - "moderate": Balanced falloff
       * - "gradual": Wide, blended boundaries
       * @default "moderate"
       */
      falloffProfile: "sharp" | "moderate" | "gradual";
    };
  };
}
```

### 9.3 Configuration Presets

```typescript
const CONFIG_PRESETS = {
  // ─────────────────────────────────────────────────────────────────────
  // BALANCED (Default)
  // ─────────────────────────────────────────────────────────────────────
  balanced: {
    description: "Earth-like tectonics with moderate activity",
    config: {
      plates: { count: 12, scalingCurve: "sublinear" },
      kinematics: { globalIntent: "diverse", coherence: 0.5 },
      evolution: { eras: 8, rates: { differentiation: 0.06 } },
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // PANGAEA
  // ─────────────────────────────────────────────────────────────────────
  pangaea: {
    description: "Single large continent, supercontinent assembly",
    config: {
      plates: { count: 8, scalingCurve: "none" },
      kinematics: { globalIntent: "converging", coherence: 0.8 },
      evolution: { eras: 10, rates: { differentiation: 0.08 } },
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // ARCHIPELAGO
  // ─────────────────────────────────────────────────────────────────────
  archipelago: {
    description: "Many small landmasses, dispersing continents",
    config: {
      plates: { count: 18, scalingCurve: "sublinear", minorPlateRatio: 0.4 },
      kinematics: { globalIntent: "dispersing", coherence: 0.6 },
      evolution: {
        eras: 12,
        rates: { differentiation: 0.04 },
        thermal: { enabled: true, riftThreshold: 1.0 },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // ANCIENT CRATON
  // ─────────────────────────────────────────────────────────────────────
  ancientCraton: {
    description: "Old stable continents, low tectonic activity",
    config: {
      plates: { count: 6, scalingCurve: "none" },
      kinematics: { globalIntent: "diverse", coherence: 0.3, speedProfile: "sluggish" },
      evolution: {
        eras: 16,
        rates: { differentiation: 0.03, collision: 0.02 },
        thresholds: { cratonic: 0.75 },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // VOLCANIC RING
  // ─────────────────────────────────────────────────────────────────────
  volcanicRing: {
    description: "Intense subduction, many volcanic arcs",
    config: {
      plates: { count: 14, scalingCurve: "sublinear" },
      kinematics: { globalIntent: "converging", coherence: 0.4, speedProfile: "vigorous" },
      evolution: {
        eras: 6,
        rates: { differentiation: 0.10, subduction: 1.0 },
        zones: { arcWidth: 4 },
      },
    },
  },
};
```

### 9.4 Knob-to-Config Mapping Reference

This table helps map author-facing "knobs" to their technical parameters:

```
┌──────────────────────────────────┬─────────────────────────────────────────┐
│ AUTHOR WANTS                     │ CONFIG TO ADJUST                        │
├──────────────────────────────────┼─────────────────────────────────────────┤
│ "Bigger continents"              │ kinematics.globalIntent = "converging"  │
│                                  │ kinematics.coherence ↑                  │
│                                  │ evolution.rates.differentiation ↑       │
├──────────────────────────────────┼─────────────────────────────────────────┤
│ "Many small islands"             │ kinematics.globalIntent = "dispersing"  │
│                                  │ plates.count ↑                          │
│                                  │ plates.minorPlateRatio ↑                │
│                                  │ evolution.rates.differentiation ↓       │
├──────────────────────────────────┼─────────────────────────────────────────┤
│ "More mountains"                 │ kinematics.globalIntent = "converging"  │
│                                  │ kinematics.speedProfile = "vigorous"    │
│                                  │ evolution.zones.collisionWidth ↑        │
├──────────────────────────────────┼─────────────────────────────────────────┤
│ "More volcanoes"                 │ evolution.rates.subduction ↑            │
│                                  │ evolution.zones.arcWidth ↑              │
│                                  │ kinematics.speedProfile = "vigorous"    │
├──────────────────────────────────┼─────────────────────────────────────────┤
│ "Old stable terrain"             │ evolution.eras ↑                        │
│                                  │ kinematics.speedProfile = "sluggish"    │
│                                  │ evolution.thresholds.cratonic ↓         │
├──────────────────────────────────┼─────────────────────────────────────────┤
│ "Distinct plate boundaries"      │ projection.influence.falloffProfile =   │
│                                  │   "sharp"                               │
│                                  │ evolution.zones.* ↓                     │
├──────────────────────────────────┼─────────────────────────────────────────┤
│ "Consistent map size scaling"    │ plates.scalingCurve = "linear"          │
│                                  │ mesh.cellsPerPlate = constant           │
├──────────────────────────────────┼─────────────────────────────────────────┤
│ "More random/chaotic"            │ kinematics.coherence = 0                │
│                                  │ kinematics.globalIntent = "diverse"     │
├──────────────────────────────────┼─────────────────────────────────────────┤
│ "Supercontinent breakup"         │ evolution.thermal.enabled = true        │
│                                  │ evolution.thermal.riftThreshold ↓       │
│                                  │ evolution.eras ↑ (to see the cycle)     │
└──────────────────────────────────┴─────────────────────────────────────────┘
```

---

# Part IV: Downstream Impacts and Behavior Changes

## Chapter 10: What Changes for Morphology

The morphology domain is the primary consumer of foundation outputs. This chapter explains what morphology receives and how it should adapt.

### 10.1 Current vs Refactored Data Contract

```
CURRENT FOUNDATION OUTPUT            REFACTORED FOUNDATION OUTPUT
─────────────────────────            ────────────────────────────

Per-tile:                            Per-tile:
• plateId                            • plateId (unchanged)
• crustType (0/1)                    • crustType (derived, backward compat)
• boundaryCloseness                  • boundaryCloseness (unchanged concept)
• upliftPotential                    • [DEPRECATED] replaced by:
• riftPotential                        ◦ maturity (continuous 0-1)
• shearStress                          ◦ lastBoundaryEra
                                       ◦ lastBoundaryEvent (BOUNDARY_EVENT)
• movementU/V/rotation                 ◦ tectonicWork
                                       ◦ terrainHint (TERRAIN_HINT)
                                     • movementU/V/rotation (unchanged)

No era data                          Era masks (per era):
                                     • activated
                                     • eventType
                                     • intensity
                                     • maturitySnapshot
```

### 10.2 New Signals Available to Morphology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TERRAIN_HINT                                                                 │
│                                                                              │
│ Foundation now provides explicit hints about what terrain to place:          │
│                                                                              │
│   MOUNTAIN_YOUNG      → High, jagged peaks (Himalayas, Andes)               │
│   MOUNTAIN_MATURE     → Rounded, eroded ranges (Appalachians)               │
│   RIFT_VALLEY         → Linear depressions with escarpments (East Africa)   │
│   VOLCANIC_ARC        → Volcanic peaks, calderas (Cascades, Japan)          │
│   TRANSFORM_ZONE      → Fractured terrain, offset features (San Andreas)    │
│   STABLE_CRATON       → Flat shields, peneplains (Canadian Shield)          │
│                                                                              │
│ These hints are based on:                                                    │
│   • lastBoundaryEvent (what happened)                                        │
│   • lastBoundaryEra (how long ago)                                           │
│   • maturity (crustal character)                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Morphology Adaptation Guide

For authors maintaining morphology pipelines, here's how to adapt:

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// BEFORE: Using upliftPotential to decide mountain placement
// ═══════════════════════════════════════════════════════════════════════════

// Old approach
const shouldBeMountain = (tile: number) => {
  return foundation.upliftPotential[tile] > 180 &&
         foundation.crustType[tile] === 1;
};

// ═══════════════════════════════════════════════════════════════════════════
// AFTER: Using terrainHint and era data
// ═══════════════════════════════════════════════════════════════════════════

// New approach: More expressive, more control
const getMountainType = (tile: number) => {
  const hint = foundation.terrainHint[tile];

  switch (hint) {
    case TERRAIN_HINT.MOUNTAIN_YOUNG:
      // Recent collision or subduction → high, rugged
      return { style: "jagged", maxHeight: 6000, minHeight: 3000 };

    case TERRAIN_HINT.MOUNTAIN_MATURE:
      // Old orogeny → eroded, rounded
      return { style: "rounded", maxHeight: 2500, minHeight: 1000 };

    case TERRAIN_HINT.VOLCANIC_ARC:
      // Active subduction → volcanic peaks
      return { style: "volcanic", maxHeight: 4000, minHeight: 1500 };

    default:
      return null;  // Not a mountain location
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED: Using era masks for temporal detail
// ═══════════════════════════════════════════════════════════════════════════

const getGeologicalAge = (tile: number) => {
  const era = foundation.lastBoundaryEra[tile];
  const totalEras = foundation.eraMasks.length;

  if (era === 255) return "archean";           // Never active
  if (era >= totalEras - 2) return "cenozoic"; // Recent
  if (era >= totalEras / 2) return "mesozoic"; // Middle
  return "paleozoic";                          // Ancient
};

const placeVolcano = (tile: number) => {
  const event = foundation.lastBoundaryEvent[tile];
  const age = getGeologicalAge(tile);

  // Only place active volcanoes at recent subduction sites
  if (event === BOUNDARY_EVENT.SUBDUCTION_OVERRIDING && age === "cenozoic") {
    return { active: true, style: "stratovolcano" };
  }

  // Old volcanic arcs become dormant/extinct
  if (event === BOUNDARY_EVENT.SUBDUCTION_OVERRIDING) {
    return { active: false, style: "eroded" };
  }

  return null;
};
```

### 10.4 Visual: Old vs New Mountain Placement

```
OLD SYSTEM: Mountains placed by upliftPotential threshold
─────────────────────────────────────────────────────────

    upliftPotential ≥ 180 → mountain (regardless of context)

    Result:
    ┌────────────────────────────────────────────────────────┐
    │                                                         │
    │    ▲▲▲        ▲▲▲▲        ▲▲▲    ▲▲                    │
    │   ▲▲▲▲▲      ▲▲▲▲▲▲      ▲▲▲▲▲   ▲▲▲   ← All identical│
    │    ▲▲▲        ▲▲▲▲        ▲▲▲    ▲▲                    │
    │                                                         │
    │   All mountains look the same, no context about         │
    │   formation mechanism or age                            │
    └────────────────────────────────────────────────────────┘


NEW SYSTEM: Mountains placed by terrainHint with context
────────────────────────────────────────────────────────

    TERRAIN_HINT → appropriate mountain type

    Result:
    ┌────────────────────────────────────────────────────────┐
    │                                                         │
    │    /\         ∩∩∩∩          ▲▲       ∩∩                │
    │   /\/\       ∩∩∩∩∩∩        ▲▲▲▲      ∩∩∩               │
    │    /\         ∩∩∩∩          ▲▲       ∩∩                │
    │    ↑            ↑            ↑        ↑                 │
    │  Young       Mature       Volcanic  Ancient             │
    │  collision   collision    arc       orogen              │
    │  (Himalayan) (Appalachian)          (eroded)            │
    │                                                         │
    │   Different styles based on formation and age           │
    └────────────────────────────────────────────────────────┘
```

### 10.5 Backward Compatibility

The refactored foundation maintains backward compatibility through:

1. **Discrete crustType** — Derived from maturity using threshold
2. **Legacy upliftPotential** — Can be computed from tectonicWork
3. **boundaryCloseness** — Unchanged concept, same computation

```typescript
// Backward compatibility shims
const legacyUpliftPotential = (tile: number) => {
  // Approximate old behavior from new data
  const event = foundation.lastBoundaryEvent[tile];
  const work = foundation.tectonicWork[tile];

  if (event === BOUNDARY_EVENT.COLLISION_COMPRESSED ||
      event === BOUNDARY_EVENT.SUBDUCTION_OVERRIDING) {
    return Math.min(255, Math.round(work * 255));
  }
  return 0;
};

const legacyRiftPotential = (tile: number) => {
  const event = foundation.lastBoundaryEvent[tile];
  const work = foundation.tectonicWork[tile];

  if (event === BOUNDARY_EVENT.RIFT_CREATED) {
    return Math.min(255, Math.round(work * 255));
  }
  return 0;
};
```

---

## Chapter 11: Behavioral Changes and What to Expect

### 11.1 Continental Distribution

```
CURRENT SYSTEM                       REFACTORED SYSTEM
──────────────                       ─────────────────

Continental ratio is INPUT           Continental ratio is OUTPUT
↓                                    ↓
Crust pre-assigned to hit ratio      Crust emerges from dynamics

┌─────────────────────────┐          ┌─────────────────────────┐
│                         │          │                         │
│   Explicit 30%/70%      │          │   Ratio depends on:     │
│   ocean/land ratio      │          │   • Evolution eras      │
│                         │          │   • Differentiation rate│
│                         │          │   • Plate kinematics    │
│                         │          │                         │
│   Always hit target     │          │   Emerges naturally,    │
│   (forced)              │          │   varies ~25-35%        │
│                         │          │                         │
└─────────────────────────┘          └─────────────────────────┘

Implications:
• Cannot guarantee exact land/water ratio
• More realistic variation between seeds
• Extreme presets (pangaea/archipelago) shift expected range
• For gameplay balance: adjust sea level threshold post-generation
```

### 11.2 Plate Boundary Character

```
CURRENT SYSTEM                       REFACTORED SYSTEM
──────────────                       ─────────────────

All boundaries similar               Boundaries have distinct characters

┌─────────────────────────┐          ┌─────────────────────────┐
│                         │          │                         │
│ Boundary = intensity    │          │ Boundary = event type   │
│ scalar only             │          │ + age + maturity        │
│                         │          │                         │
│ "How much" only         │          │ "What + when + how much"│
│                         │          │                         │
└─────────────────────────┘          └─────────────────────────┘

Example: A convergent boundary between two continents:

Old: upliftPotential = 230 (high)
New: {
  event: COLLISION_COMPRESSED,
  lastEra: 7 (recent),
  maturityA: 0.72 (continental),
  maturityB: 0.68 (continental),
  terrainHint: MOUNTAIN_YOUNG
}

Morphology can now distinguish collision from subduction,
place appropriate terrain features, and vary age-appropriately.
```

### 11.3 Temporal Evolution Visibility

```
CURRENT SYSTEM                       REFACTORED SYSTEM
──────────────                       ─────────────────

Eras are "virtual"                   Eras are real snapshots
(backward extrapolation)             (forward simulation)

┌─────────────────────────┐          ┌─────────────────────────┐
│ Era 0: drift boundaries │          │ Era 0: uniform ocean    │
│        backwards        │          │        (actual state)   │
│                         │          │                         │
│ Era 1: drift more       │          │ Era 1: arcs begin       │
│                         │          │                         │
│ Era 2: drift more       │          │ Era 2: proto-continents │
│        (no real state)  │          │                         │
│                         │          │ Era 3: continents grow  │
│                         │          │        (snapshots!)     │
└─────────────────────────┘          └─────────────────────────┘

Implications:
• Era masks are true historical snapshots
• Can query "what was maturity in era 3?"
• Can see continental growth over time
• Terrain age correlates with geological processes
```

### 11.4 Generation Time Impact

```
PERFORMANCE EXPECTATIONS

┌────────────────────────────┬───────────────────────────────────────────┐
│ Configuration              │ Expected Change                           │
├────────────────────────────┼───────────────────────────────────────────┤
│ evolution.eras = 4         │ ~1.5× current generation time             │
│ (minimal evolution)        │ (baseline forward sim overhead)           │
├────────────────────────────┼───────────────────────────────────────────┤
│ evolution.eras = 8         │ ~2× current generation time               │
│ (default)                  │ (8 simulation passes)                     │
├────────────────────────────┼───────────────────────────────────────────┤
│ evolution.eras = 16        │ ~3× current generation time               │
│ (detailed history)         │ (16 simulation passes)                    │
├────────────────────────────┼───────────────────────────────────────────┤
│ thermal.enabled = false    │ ~10% faster                               │
│ (skip Wilson cycle)        │ (skip heat tracking)                      │
├────────────────────────────┼───────────────────────────────────────────┤
│ mesh.cellsPerPlate ↓       │ Significant speedup                       │
│ (coarser mesh)             │ (O(cells) operations)                     │
└────────────────────────────┴───────────────────────────────────────────┘

Mitigation strategies:
• Use fewer eras for "fast preview" mode
• Disable thermal feedback when Wilson cycle not needed
• Reduce mesh resolution for large maps
• All operations remain O(cells × eras), not O(tiles)
```

### 11.5 RNG Sensitivity

```
SEED BEHAVIOR CHANGES

Current system:
• Same seed → same plates → same static crust assignment
• Very reproducible, limited variation

Refactored system:
• Same seed → same plates → same evolution
• But small config changes cascade through eras

Example: Changing evolution.rates.differentiation from 0.06 to 0.07

Era 0: Identical
Era 1: Slightly higher maturity at arcs
Era 2: Earlier continental classification → changes subduction decisions
Era 3: Different boundary types → different material flow
...
Era N: Potentially quite different final state

Implication:
• Fine-tuning requires understanding which parameters are "stable"
• Plate config changes have large effects (change initial conditions)
• Evolution rates have moderate effects (accumulate over eras)
• Projection config has small effects (post-processing only)
```

---

# Part V: Migration Path

## Chapter 12: Phased Implementation Strategy

### 12.1 Overview

The migration can be executed in phases, with each phase providing standalone value:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MIGRATION PHASES                                    │
│                                                                              │
│  Phase 0     Phase 1         Phase 2           Phase 3        Phase 4       │
│  ────────    ────────        ────────          ────────       ────────      │
│                                                                              │
│  Config      Kinematic       Forward           First-         Morphology    │
│  Cleanup     Intent          Simulation        Principles     Integration   │
│                                                                              │
│  • Unify     • Add intent    • Replace         • Uniform      • Adapt       │
│    config      parameter       backward          oceanic        signals     │
│  • Remove    • Velocity        drift             start        • Add hints   │
│    magic       coherence     • Track           • Differenti-  • Era mask    │
│    numbers   • Speed           material          ation          queries     │
│  • Single      profiles        flow            • Thermal                    │
│    source    • Preserve      • Era masks         feedback                   │
│              current as                                                      │
│              "diverse"                                                       │
│                                                                              │
│  LOW RISK    LOW RISK        MEDIUM RISK       MEDIUM RISK    LOW RISK     │
│  1 week      1-2 weeks       2-3 weeks         2-3 weeks      1-2 weeks    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Phase 0: Configuration Cleanup

**Goal**: Eliminate duplication and magic numbers without changing behavior.

**Changes**:
```typescript
// BEFORE: Duplicated plateCount
foundation: {
  plateCount: 12,  // ← here
  crustSettings: {
    plateCount: 12,  // ← and here
    referenceArea: 72000,  // ← derived value exposed
  },
}

// AFTER: Single source
foundation: {
  plates: {
    count: 12,
    scalingCurve: "sublinear",  // Replaces referenceArea logic
  },
  mesh: {
    cellsPerPlate: 7,  // Controls mesh resolution
  },
}
```

**Files to modify**:
- `domain/foundation/config.ts` — Schema definition
- `domain/foundation/ops/*/contract.ts` — Update contracts
- All ops that read config — Use new paths

**Validation**: Output should be byte-identical with equivalent old config.

### 12.3 Phase 1: Kinematic Intent System

**Goal**: Add coherent plate motion without removing randomness option.

**Changes**:
```typescript
// Add to config
kinematics: {
  globalIntent: "diverse",  // "diverse" = current random behavior
  coherence: 0.0,           // 0 = pure random = current behavior
  speedProfile: "moderate",
}

// Modify assignPlateKinematics
function assignPlateKinematics(plate, config, rng) {
  const randomVelocity = rng.randomDirection();
  const intentVelocity = computeIntentVelocity(plate, config.globalIntent);

  return lerp(randomVelocity, intentVelocity, config.coherence);
}
```

**Backward compatibility**: `globalIntent: "diverse", coherence: 0` = current behavior.

### 12.4 Phase 2: Forward Simulation Engine

**Goal**: Replace backward drift with true forward simulation.

**Changes**:
- New op: `compute-tectonic-evolution`
- Replaces: `compute-tectonic-history`
- New data structures: `CrustalState`, `EvolutionState`, `EraMask`

**Algorithm (summary)**:
1. Initialize uniform oceanic crust (for now, still use pre-assigned for compat)
2. For each era:
   - Detect boundaries
   - Classify interactions
   - Apply material flow
   - Update crustal state
   - Snapshot era mask

**Feature flag**: `evolution.useForwardSimulation: boolean`

When false, use legacy backward-drift. When true, use new engine.

### 12.5 Phase 3: First-Principles Crustal Evolution

**Goal**: Remove pre-assigned continental crust; let it emerge.

**Changes**:
- Remove `crustSettings.targetContinentalRatio`
- Initialize all cells with maturity = 0
- Add differentiation logic at volcanic arcs
- Add thermal feedback for Wilson Cycle

**Feature flag**: `evolution.firstPrinciples: boolean`

When false, pre-seed some continental crust. When true, start uniform.

### 12.6 Phase 4: Morphology Integration

**Goal**: Expose new signals; adapt morphology to use them.

**Changes**:
- Export `TERRAIN_HINT` enum
- Export `BOUNDARY_EVENT` enum
- Add era mask projection
- Update morphology ops to optionally use new signals

**Backward compatibility**: Keep legacy `upliftPotential` etc. as derived fields.

### 12.7 Feature Flag Summary

```typescript
foundation: {
  // Phase 1
  kinematics: {
    globalIntent: "diverse",  // "diverse" = legacy random
    coherence: 0,             // 0 = pure random
  },

  // Phase 2
  evolution: {
    useForwardSimulation: false,  // false = legacy backward-drift
  },

  // Phase 3
  evolution: {
    firstPrinciples: false,  // false = pre-seed continents
  },
}

// To get full new behavior:
foundation: {
  kinematics: { globalIntent: "diverse", coherence: 0.5 },
  evolution: { useForwardSimulation: true, firstPrinciples: true },
}
```

---

# Appendices

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Basalt** | Dense, dark volcanic rock; primary component of oceanic crust |
| **Boundary closeness** | Tile-space measure of distance to nearest plate boundary |
| **Collision** | Convergent boundary between two continental plates; neither subducts |
| **Continental crust** | Buoyant, silica-rich crust; floats above sea level |
| **Craton** | Ancient, stable continental core; high maturity |
| **CSR** | Compressed Sparse Row; efficient adjacency list format |
| **Differentiation** | Process by which oceanic crust becomes continental at subduction zones |
| **Divergent boundary** | Plates moving apart; new oceanic crust forms |
| **Era** | Discrete time step in evolution simulation |
| **Era mask** | Snapshot of which cells were active and what events occurred in an era |
| **Kinematic intent** | High-level pattern of plate motion (converging, dispersing, etc.) |
| **Lloyd relaxation** | Iterative algorithm to create uniform Voronoi cells |
| **Maturity** | Continuous 0-1 measure of crustal differentiation |
| **Oceanic crust** | Dense basaltic crust; created at spreading centers |
| **Orogeny** | Mountain-building event |
| **Spreading center** | Divergent boundary where new oceanic crust forms |
| **Subduction** | Process where one plate descends beneath another |
| **Tectonic work** | Accumulated stress/deformation at a location |
| **Terrain hint** | Semantic label guiding morphology terrain placement |
| **Transform boundary** | Plates sliding past each other; shear zone |
| **Volcanic arc** | Chain of volcanoes behind a subduction zone |
| **Voronoi mesh** | Partition of space into cells based on nearest seed points |
| **Wilson Cycle** | Cycle of supercontinent assembly and breakup (~500 Myr period) |

## Appendix B: Before/After Configuration Comparison

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// BEFORE (Current System)
// ═══════════════════════════════════════════════════════════════════════════

const currentConfig = {
  foundation: {
    plateCount: 12,                    // Duplicated below
    majorPlateRatio: 0.7,
    tectonicSettings: {
      eraWeights: [0.4, 0.6, 1.0],     // Magic numbers
      driftStepsByEra: [6, 3, 0],      // What do these mean?
      beltInfluenceDistance: 8,
      beltDecay: 0.55,
      activityThreshold: 10,
    },
    crustSettings: {
      plateCount: 12,                   // ← Duplicate!
      targetContinentalRatio: 0.3,
      referenceArea: 72000,             // ← Derived value exposed
      continentalResistance: 0.2,
      oceanicResistance: 1.0,
    },
    boundarySettings: {
      influenceDecay: 0.55,
      convergentBias: 200,              // What does 200 mean?
      divergentBias: -100,              // Negative?
      transformBias: 0.8,               // Different scale!
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// AFTER (Refactored System)
// ═══════════════════════════════════════════════════════════════════════════

const refactoredConfig = {
  foundation: {
    mesh: {
      cellsPerPlate: 7,
      relaxationSteps: 4,
    },

    plates: {
      count: 12,                        // Single source of truth
      scalingCurve: "sublinear",
      minorPlateRatio: 0.3,
    },

    kinematics: {
      globalIntent: "diverse",
      coherence: 0.5,
      speedProfile: "moderate",
    },

    evolution: {
      eras: 8,
      rates: {
        differentiation: 0.06,
        collision: 0.04,
        subduction: 0.8,
        spreading: 0.6,
      },
      zones: {
        arcWidth: 3,
        collisionWidth: 5,
        riftShoulderWidth: 2,
      },
      thresholds: {
        continental: 0.5,
        collision: 0.55,
        cratonic: 0.85,
      },
      thermal: {
        enabled: true,
        accumulationRate: 0.1,
        dissipationFactor: 0.95,
        riftThreshold: 1.5,
      },
    },

    projection: {
      influence: {
        boundaryReachTiles: 12,
        falloffProfile: "moderate",
      },
    },
  },
};
```

## Appendix C: Algorithm Complexity Analysis

| Operation | Current | Refactored | Notes |
|-----------|---------|------------|-------|
| Mesh generation | O(c × r) | O(c × r) | c=cells, r=relaxation steps |
| Plate assignment | O(c log c) | O(c log c) | Dijkstra with priority queue |
| Boundary detection | O(c × k) | O(c × k) | k=avg neighbors (~6) |
| Era processing | O(c × e) | O(c × e) | e=eras, c=cells |
| Material flow | — | O(b) | b=boundary cells |
| Tile projection | O(t) | O(t) | t=tiles |
| **Total** | O(c × e + t) | O(c × e + t) | Same asymptotic |

The refactored system has similar asymptotic complexity but higher constant factors due to:
- More data tracked per cell
- More complex boundary classification
- Era mask snapshotting

## Appendix D: ASCII Reference for Tectonic Features

```
CONVERGENT: OCEAN-CONTINENT SUBDUCTION
──────────────────────────────────────

                    Volcanic arc
                       ▲ ▲ ▲
    ══════════════════╧═╧═╧══════════════  Continental plate
                      ╲     ╲
                       ╲     ╲ Oceanic plate subducting
                        ╲     ╲
    ═════════════════════╲═════╲══════════  Mantle


CONVERGENT: CONTINENT-CONTINENT COLLISION
─────────────────────────────────────────

                    Mountains
                      /\  /\
                     /  \/  \
    ════════════════/════════\════════════
                   ╱          ╲
    ═════════════╱════════════╲═══════════  Both plates thicken
                Neither subducts


DIVERGENT: MID-OCEAN RIDGE
──────────────────────────

                New oceanic crust
                    ▲ ▲ ▲ ▲
    ════════════════│═══│════════════════
                  ← │   │ →
    ════════════════│═══│════════════════  Plates separate


TRANSFORM: STRIKE-SLIP FAULT
────────────────────────────

    ════════════════════════════════►
                    ║  Fault zone
                    ║
    ◄════════════════════════════════


RIFT VALLEY (Continental)
─────────────────────────

         Rift shoulders
           ↓     ↓
          /│     │\
         / │     │ \     Graben (down-dropped block)
    ════/══│═════│══\════════════════════
          ←       →
         Extension
```

---

# Conclusion

This unified proposal presents a comprehensive redesign of the foundation domain that:

1. **Grounds the system in physics** — Continental crust emerges from differentiation at subduction zones, following the actual mechanism by which Earth's continents formed

2. **Replaces backward extrapolation with forward simulation** — Era masks represent true historical snapshots, not artificial projections

3. **Provides semantic control** — Authors control kinematic intent, evolution rates, and thermal dynamics rather than tuning magic numbers

4. **Maintains backward compatibility** — Legacy signals can be derived from the richer new data

5. **Improves morphology integration** — Terrain hints provide explicit guidance about feature placement based on geological context

The implementation can proceed in phases, with each phase providing standalone improvements while preserving the ability to fall back to current behavior.

---

*Document version: 1.0*
*Last updated: 2026-01-23*
