# Foundation Domain Improvement Proposal

## Overview

This document proposes systematic improvements to the foundation domain, addressing algorithmic quality, authoring ergonomics, and configuration architecture. Each proposal follows a consistent structure:

1. **Current State**: What exists and why it's problematic
2. **Proposed Design**: The new approach with theoretical grounding
3. **Downstream Impact**: What this enables for morphology and beyond
4. **Author Experience**: How this improves usability, realism, or robustness

---

# Part I: Configuration Architecture Overhaul

## Proposal 1.1: Eliminate Derived and Duplicated Configuration

### Current State

The foundation domain suffers from significant configuration duplication and exposure of derived values:

```typescript
// In swooper-earthlike.ts - SAME VALUES appear twice:
"mesh": {
  "computeMesh": {
    "config": {
      "plateCount": 19,           // ← Duplicated
      "referenceArea": 16000,     // ← Duplicated (and derived!)
      "plateScalePower": 1        // ← Duplicated
    }
  }
},
"plate-graph": {
  "computePlateGraph": {
    "config": {
      "plateCount": 19,           // ← Same value again
      "referenceArea": 16000,     // ← Same value again
      "plateScalePower": 1        // ← Same value again
    }
  }
}
```

**Problems**:
1. Authors must specify `plateCount` twice and keep them synchronized
2. `referenceArea` is a *calibration constant*, not a creative parameter - it's always relative to "standard" map size
3. If mesh and plate-graph disagree on `plateCount`, behavior is undefined
4. `plateScalePower` is an implementation detail of the scaling algorithm

### Proposed Design

Introduce a **foundation-level shared configuration** that is resolved once and distributed to all steps:

```typescript
// NEW: Foundation stage-level config (not per-step)
foundation: {
  knobs: {
    plateCount: "normal",
    plateActivity: "normal",
  },
  config: {
    // Single source of truth for plate count
    plates: {
      count: 19,                    // Authored plate count for reference size
      scalingCurve: "sublinear",    // "none" | "sublinear" | "linear" | "superlinear"
    },
    // Mesh derives its cellCount from plates.count
    mesh: {
      cellsPerPlate: 7,
      relaxationSteps: 6,
    },
    // Other configs follow...
  }
}
```

**Key changes**:

1. **`referenceArea` is eliminated** - the system uses a fixed internal constant:
   ```typescript
   // constants.ts
   export const FOUNDATION_REFERENCE_MAP_AREA = 16_000;  // tiles (≈ standard map)
   ```

2. **`plateScalePower` becomes `scalingCurve`** - a semantic enum:
   ```typescript
   type ScalingCurve = "none" | "sublinear" | "linear" | "superlinear";

   const SCALING_CURVE_EXPONENTS: Record<ScalingCurve, number> = {
     none: 0,
     sublinear: 0.5,   // sqrt scaling - small maps fewer plates
     linear: 1.0,      // proportional scaling
     superlinear: 1.5, // large maps get proportionally more plates
   };
   ```

3. **`plateCount` appears once** at the foundation level, not per-step

4. **Mesh `cellCount` is derived** internally:
   ```typescript
   // In mesh step (internal, not authored)
   const cellCount = foundationConfig.plates.count * foundationConfig.mesh.cellsPerPlate;
   ```

### Downstream Impact

- Morphology receives the same plate data it currently does - no changes needed
- The `foundationPlateGraph.plates` array has consistent IDs with the mesh cell assignment

### Author Experience

| Before | After |
|--------|-------|
| Must specify `plateCount` in 2 places | Specify once at foundation level |
| Must understand `referenceArea` magic | System handles scaling internally |
| `plateScalePower: 0.5` is opaque | `scalingCurve: "sublinear"` is clear |
| Config can silently desync | Single source of truth |

---

## Proposal 1.2: Consolidate Decay and Influence Constants

### Current State

The foundation has multiple decay and influence parameters with confusing names and unclear relationships:

```typescript
// In compute-tectonic-history
beltInfluenceDistance: 8,    // mesh-neighbor steps
beltDecay: 0.55,             // exponential coefficient

// In compute-plates-tensors (projection)
boundaryInfluenceDistance: 12, // tiles (different unit!)
boundaryDecay: 0.5,            // exponential coefficient (similar but different)
```

**Problems**:
1. `beltInfluenceDistance` is in mesh cells; `boundaryInfluenceDistance` is in tiles - different units, similar names
2. Two separate decay coefficients that should probably be related
3. Authors must understand both mesh-space and tile-space geometry

### Proposed Design

Unify under a single **influence profile** abstraction:

```typescript
foundation: {
  config: {
    influence: {
      // Single parameter: how far tectonic effects spread (in tiles)
      boundaryReachTiles: 12,

      // How sharply effects decay - semantic control
      falloffProfile: "moderate",  // "sharp" | "moderate" | "gradual"
    }
  }
}
```

**Internal mapping**:
```typescript
const FALLOFF_PROFILES = {
  sharp:    { decay: 0.70, beltCells: 4 },
  moderate: { decay: 0.55, beltCells: 6 },
  gradual:  { decay: 0.40, beltCells: 8 },
} as const;

// Mesh-space belt distance derived from tile-space reach
function deriveBeltDistance(boundaryReachTiles: number, cellsPerPlate: number): number {
  // Approximate: mesh cells are larger than tiles
  const tilesPerCell = Math.sqrt(FOUNDATION_REFERENCE_MAP_AREA / typicalCellCount);
  return Math.ceil(boundaryReachTiles / tilesPerCell);
}
```

### Downstream Impact

None - morphology continues receiving the same projected fields.

### Author Experience

| Before | After |
|--------|-------|
| Two distance params in different units | One param in tiles (intuitive) |
| Two decay coefficients | One semantic falloff selector |
| Must understand mesh-space | Works in tile-space only |

---

## Proposal 1.3: Named Constants for Algorithm Tuning

### Current State

The plate graph algorithm contains embedded magic numbers:

```typescript
// In compute-plate-graph/index.ts
function computeCellResistance(type: number, age: number): number {
  const a = crustAgeNorm(age);
  const agePenalty = a * a;
  if ((type | 0) === 1) {
    // Continental / cratonic crust: high resistance
    return 2.2 + 2.8 * agePenalty;  // ← Magic numbers
  }
  // Oceanic crust: lower resistance
  return 1.0 + 0.8 * agePenalty;    // ← Magic numbers
}

// Plate weights
if (kind === "major") {
  plateWeights[id] = 1.7 + rng(100, "PlateGraphMajorWeight") / 80;  // ← Magic
} else {
  plateWeights[id] = 0.45 + rng(100, "PlateGraphMinorWeight") / 160; // ← Magic
}
```

**Problems**:
1. These values are load-bearing but undocumented
2. Changing them requires understanding the algorithm
3. No way to tune without editing source code
4. Relationships between values are implicit

### Proposed Design

Extract all tuning parameters into a **named constants module** with documentation:

```typescript
// foundation/constants/plate-resistance.ts

/**
 * Plate Boundary Resistance Model
 *
 * Theory: Dijkstra-based plate assignment uses a "resistance" cost function
 * to determine where plate boundaries naturally form. High resistance means
 * the boundary avoids that region; low resistance attracts boundaries.
 *
 * Continental crust resists bisection (stable cratons), while oceanic crust
 * welcomes boundaries (mid-ocean ridges form naturally in new oceanic crust).
 *
 * The age penalty reflects that older crust is more rigid:
 *   resistance = base + ageFactor × (age/255)²
 */
export const PLATE_RESISTANCE = {
  continental: {
    base: 2.2,        // Baseline continental resistance (high)
    ageFactor: 2.8,   // Additional resistance for ancient cratons
  },
  oceanic: {
    base: 1.0,        // Baseline oceanic resistance (low)
    ageFactor: 0.8,   // Minor increase for older oceanic lithosphere
  },
} as const;

/**
 * Plate Growth Weights
 *
 * Major plates grow faster (larger weight → lower effective resistance).
 * This produces realistic size distribution: few large plates, many small ones.
 */
export const PLATE_GROWTH_WEIGHTS = {
  major: { base: 1.7, variance: 1.25 },   // 1.7 to ~2.95
  minor: { base: 0.45, variance: 0.625 }, // 0.45 to ~1.075
} as const;

/**
 * Polar Cap Kinematics
 *
 * Polar caps rotate tangentially (east-west) to simulate
 * decoupling from equatorial plate system.
 */
export const POLAR_KINEMATICS = {
  tangentialSpeedBase: 0.9,
  speedVariance: 0.25,       // ±25% jitter
  rotationMagnitude: 0.02,   // Radians, small wobble
  microplateJitterDeg: 12,   // Degrees off tangent
} as const;
```

**These are NOT config** - they are implementation constants that define the model's behavior. They can be exposed as "expert mode" config in the future if needed, but the default should be stable and validated.

### Downstream Impact

None - behavior is identical, just better organized.

### Author Experience

| Before | After |
|--------|-------|
| Magic numbers scattered in code | Documented constants in one place |
| No way to understand tuning | Clear comments explain the model |
| Changing requires deep understanding | Well-organized, can be exposed later |

---

# Part II: Plate Kinematics and Control

## Proposal 2.1: Kinematic Intent System

### Current State

Plate velocities are assigned randomly with no coherent pattern:

```typescript
// In compute-plate-graph/index.ts
const baseAngleDeg = rng(360, "PlateGraphAngle");
const speed = 0.5 + rng(100, "PlateGraphSpeed") / 200;
const rad = (baseAngleDeg * Math.PI) / 180;
velocityX = Math.cos(rad) * speed;
velocityY = Math.sin(rad) * speed;
```

**Problems**:
1. No way to create coherent patterns (converging, dispersing, rotating)
2. Random velocities produce random-looking boundaries
3. No author control over plate dynamics
4. Can't simulate supercontinent assembly/breakup

### Proposed Design

Introduce a **kinematic intent** system that guides velocity assignment:

```typescript
foundation: {
  config: {
    kinematics: {
      // Overall pattern - affects all tectonic plates
      globalIntent: "diverse",  // "converging" | "dispersing" | "diverse" | "rotational"

      // How strictly to follow the pattern (0 = pure random, 1 = exact pattern)
      coherence: 0.6,

      // Speed distribution
      speedProfile: "moderate", // "sluggish" | "moderate" | "vigorous"

      // Optional: explicit velocity hints for specific plates (expert mode)
      // plateHints: [
      //   { plateId: 0, direction: "E", speed: "fast" },
      //   { plateId: 2, direction: { toward: 1 }, speed: "slow" },
      // ]
    }
  }
}
```

**Implementation Theory**:

The system generates a **velocity field** based on the global intent, then samples plate velocities from this field with coherence-weighted noise:

```typescript
type GlobalIntent = "converging" | "dispersing" | "diverse" | "rotational";

function computeIntentVelocity(
  seedX: number,
  seedY: number,
  intent: GlobalIntent,
  mapCenter: { x: number; y: number }
): { vx: number; vy: number } {
  const dx = seedX - mapCenter.x;
  const dy = seedY - mapCenter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = dist > 0 ? dx / dist : 0;
  const ny = dist > 0 ? dy / dist : 0;

  switch (intent) {
    case "converging":
      // Plates move toward center (supercontinent assembly)
      return { vx: -nx, vy: -ny };

    case "dispersing":
      // Plates move away from center (supercontinent breakup)
      return { vx: nx, vy: ny };

    case "rotational":
      // Plates rotate around center (carousel pattern)
      return { vx: -ny, vy: nx };

    case "diverse":
    default:
      // Random direction
      const angle = Math.random() * 2 * Math.PI;
      return { vx: Math.cos(angle), vy: Math.sin(angle) };
  }
}

// Final velocity = coherence × intentVelocity + (1 - coherence) × randomVelocity
```

**Speed profile mapping**:
```typescript
const SPEED_PROFILES = {
  sluggish:  { base: 0.3, variance: 0.2 },
  moderate:  { base: 0.6, variance: 0.3 },
  vigorous:  { base: 0.9, variance: 0.4 },
} as const;
```

### Downstream Impact

- **Tectonic segments**: More coherent convergent/divergent patterns
- **Tectonic history**: More realistic orogeny patterns
- **Morphology**: Mountain chains form in predictable zones

### Author Experience

| Before | After |
|--------|-------|
| No control over plate dynamics | Clear intent system |
| Random = random-looking | Coherent geological patterns |
| Can't simulate specific scenarios | "converging" makes supercontinent |
| No speed control | Speed profiles for world age feel |

**Example presets**:
```typescript
// "Supercontinent World" - plates converging
kinematics: { globalIntent: "converging", coherence: 0.7, speedProfile: "vigorous" }

// "Breakup World" - Pangaea aftermath
kinematics: { globalIntent: "dispersing", coherence: 0.6, speedProfile: "moderate" }

// "Chaotic Archean" - random early Earth
kinematics: { globalIntent: "diverse", coherence: 0.2, speedProfile: "vigorous" }
```

---

## Proposal 2.2: Per-Plate Velocity Override System

### Current State

No way to specify individual plate behavior. All plates follow the same random distribution.

### Proposed Design

Add an **optional expert mode** for per-plate velocity control:

```typescript
kinematics: {
  globalIntent: "diverse",
  coherence: 0.5,

  // Expert mode: override specific plates
  plateOverrides: [
    {
      // Match by role
      match: { role: "polarCap" },
      direction: "tangential",  // Special polar behavior
      speedMultiplier: 0.5,     // Slower than average
    },
    {
      // Match by seed location
      match: { region: { yMin: 0.3, yMax: 0.7 } },  // Equatorial plates
      direction: { azimuth: 90 },  // Move east
      speedMultiplier: 1.2,
    },
    {
      // Match by plate kind
      match: { kind: "major" },
      speedMultiplier: 0.8,  // Major plates move slower
    },
  ]
}
```

**Matching system**:
```typescript
type PlateMatch =
  | { role: "polarCap" | "polarMicroplate" | "tectonic" }
  | { kind: "major" | "minor" }
  | { region: { xMin?: number; xMax?: number; yMin?: number; yMax?: number } }
  | { plateId: number };

type DirectionSpec =
  | "tangential"      // Perpendicular to radius from center
  | "radialIn"        // Toward center
  | "radialOut"       // Away from center
  | { azimuth: number }  // Compass degrees (0=N, 90=E)
  | { toward: number }   // Toward another plate's centroid
  | { away: number };    // Away from another plate's centroid
```

### Downstream Impact

Enables sophisticated scenarios like:
- Pacific-style subduction ring (all plates converge on central plate)
- Atlantic-style spreading (two mega-plates separate)
- Rotating plate systems (mantle plume simulation)

### Author Experience

This is **opt-in complexity**. Authors who don't specify overrides get the default behavior. Power users can sculpt specific plate dynamics.

---

# Part III: Continental Shape and Distribution

## Proposal 3.1: Continental Morphology Control

### Current State

Continental crust forms via simple region-growing, producing blob-like shapes:

```typescript
// Current: random seed selection + frontier growth
// Result: amorphous continental blobs
```

**Problems**:
1. Continents are always blob-shaped
2. No control over elongation (Africa vs South America)
3. No control over fragmentation (Eurasia vs archipelago)
4. Coastlines are mesh-resolution jagged, not fractally interesting

### Proposed Design

Replace region-growing with a **continental morphology system**:

```typescript
foundation: {
  config: {
    continents: {
      // How many distinct landmasses to target
      count: { min: 2, max: 5 },

      // Shape distribution
      morphology: "varied",  // "blocky" | "elongated" | "fragmented" | "varied"

      // Size distribution
      sizeDistribution: "earthlike",  // "uniform" | "earthlike" | "one-dominant"

      // How tightly clustered
      clustering: 0.4,  // 0 = scattered, 1 = supercontinent
    }
  }
}
```

**Implementation Theory**:

Use **anisotropic region-growing** with shape constraints:

```typescript
interface ContinentSeed {
  centroid: { x: number; y: number };
  targetArea: number;        // In mesh cells
  aspectRatio: number;       // 1.0 = circular, 3.0 = elongated
  orientation: number;       // Radians, major axis direction
  fragmentation: number;     // 0 = solid, 1 = archipelago
}

function growContinent(seed: ContinentSeed, mesh: Mesh): Set<number> {
  // Use elliptical distance metric instead of Euclidean
  // This naturally produces elongated shapes

  function ellipticalDistance(cell: number): number {
    const dx = mesh.siteX[cell] - seed.centroid.x;
    const dy = mesh.siteY[cell] - seed.centroid.y;

    // Rotate to seed's coordinate system
    const cos = Math.cos(seed.orientation);
    const sin = Math.sin(seed.orientation);
    const u = dx * cos + dy * sin;  // Along major axis
    const v = -dx * sin + dy * cos; // Along minor axis

    // Elliptical distance: stretch minor axis
    return Math.sqrt(u * u + (v * seed.aspectRatio) ** 2);
  }

  // Priority queue growth with fragmentation noise
  // High fragmentation → more islands break off during growth
}
```

**Morphology profiles**:
```typescript
const MORPHOLOGY_PROFILES = {
  blocky: { aspectRange: [1.0, 1.5], fragmentation: 0.1 },
  elongated: { aspectRange: [2.0, 4.0], fragmentation: 0.2 },
  fragmented: { aspectRange: [1.5, 2.5], fragmentation: 0.6 },
  varied: { aspectRange: [1.0, 3.5], fragmentation: 0.35 },
} as const;
```

**Size distribution**:
```typescript
const SIZE_DISTRIBUTIONS = {
  uniform: (n: number) => Array(n).fill(1 / n),
  earthlike: (n: number) => {
    // Zipf-like: largest gets ~40%, then ~25%, then ~15%, etc.
    const sizes = Array.from({ length: n }, (_, i) => 1 / (i + 1) ** 0.8);
    const sum = sizes.reduce((a, b) => a + b, 0);
    return sizes.map(s => s / sum);
  },
  "one-dominant": (n: number) => {
    const sizes = [0.6, ...Array(n - 1).fill(0.4 / (n - 1))];
    return sizes;
  },
} as const;
```

### Downstream Impact

- **Plate graph**: Boundaries naturally form around continental edges
- **Projection**: More varied coastline shapes
- **Morphology**: Natural variation in continental terrain patterns
- **Islands**: Fragmented continents provide island chain seeds

### Author Experience

| Before | After |
|--------|-------|
| One blob shape | Blocky, elongated, fragmented options |
| No continent count control | Explicit count range |
| No size distribution | Earthlike, uniform, dominant options |
| No clustering control | Supercontinent to scattered spectrum |

---

## Proposal 3.2: Continental Shelf and Margin System

### Current State

Shelf and margin effects are controlled by confusing parameters:

```typescript
shelfWidthCells: 6,           // In mesh cells (what does 6 mean?)
shelfElevationBoost: 0.12,    // Arbitrary 0-1 value
marginElevationPenalty: 0.04, // Another arbitrary value
```

### Proposed Design

Replace with geologically-meaningful parameters:

```typescript
continents: {
  margins: {
    // Continental shelf width as fraction of continent size
    shelfWidthFraction: 0.15,  // 15% of continent width

    // Shelf depth profile
    shelfProfile: "gradual",  // "steep" | "gradual" | "wide"

    // Passive vs active margin character (affects elevation profile)
    marginCharacter: "mixed", // "passive" | "active" | "mixed"
  }
}
```

**Profile definitions**:
```typescript
const SHELF_PROFILES = {
  steep: { widthMultiplier: 0.5, elevationGradient: 0.08 },
  gradual: { widthMultiplier: 1.0, elevationGradient: 0.04 },
  wide: { widthMultiplier: 2.0, elevationGradient: 0.02 },
} as const;

const MARGIN_CHARACTERS = {
  passive: { oceanBoost: 0.15, continentPenalty: 0.06 },  // Atlantic-like
  active: { oceanBoost: 0.05, continentPenalty: 0.02 },   // Pacific-like
  mixed: { oceanBoost: 0.10, continentPenalty: 0.04 },
} as const;
```

**Derivation**:
```typescript
// Internal computation from semantic config
function deriveShelfParameters(
  config: MarginConfig,
  averageContinentSize: number
): { shelfWidthCells: number; shelfBoost: number; marginPenalty: number } {
  const profile = SHELF_PROFILES[config.shelfProfile];
  const character = MARGIN_CHARACTERS[config.marginCharacter];

  const baseWidth = config.shelfWidthFraction * Math.sqrt(averageContinentSize);
  const shelfWidthCells = Math.round(baseWidth * profile.widthMultiplier);

  return {
    shelfWidthCells,
    shelfBoost: profile.elevationGradient + character.oceanBoost,
    marginPenalty: profile.elevationGradient + character.continentPenalty,
  };
}
```

### Downstream Impact

- Better shelf/margin representation for coastal morphology
- More realistic continental edge profiles

### Author Experience

| Before | After |
|--------|-------|
| `shelfWidthCells: 6` | `shelfWidthFraction: 0.15` (15% of continent) |
| `shelfElevationBoost: 0.12` | `shelfProfile: "gradual"` |
| Unclear relationship | Unified margin model |

---

# Part IV: Tectonic History and Evolution

## Proposal 4.1: Geological Time Model

### Current State

The era system uses backward drift, which is conceptually confusing:

```typescript
driftStepsByEra: [2, 1, 0],  // What does this mean?
eraWeights: [0.35, 0.35, 0.3], // Why these weights?
```

**Problems**:
1. "Drift steps" is implementation-specific, not geologically meaningful
2. Era weights are arbitrary
3. No connection to geological time or events
4. Can't simulate specific geological scenarios

### Proposed Design

Replace with a **geological time model** that maps to real concepts:

```typescript
foundation: {
  config: {
    geologicalHistory: {
      // How old is this world?
      worldAge: "mature",  // "young" | "mature" | "ancient"

      // What major events occurred?
      events: "standard",  // "standard" | "recent-orogeny" | "recent-rifting" | "stable"

      // How much have old features eroded?
      erosionLevel: "moderate",  // "minimal" | "moderate" | "extensive"
    }
  }
}
```

**World age mapping**:
```typescript
const WORLD_AGE_PROFILES = {
  young: {
    // Young world: features are all recent, little drift
    eraCount: 2,
    eraWeights: [0.3, 0.7],
    driftSteps: [1, 0],
    description: "Geologically young world, most features are recent",
  },
  mature: {
    // Mature world: mix of old and new features
    eraCount: 3,
    eraWeights: [0.25, 0.35, 0.4],
    driftSteps: [2, 1, 0],
    description: "Earth-like mix of ancient shields and active margins",
  },
  ancient: {
    // Ancient world: deep history, much drift
    eraCount: 4,
    eraWeights: [0.15, 0.25, 0.30, 0.30],
    driftSteps: [4, 2, 1, 0],
    description: "Multiple supercontinent cycles, complex geological history",
  },
} as const;
```

**Event profiles**:
```typescript
const EVENT_PROFILES = {
  standard: {
    // Normal distribution of events
    recentUpliftBias: 0,
    recentRiftBias: 0,
  },
  "recent-orogeny": {
    // Recent mountain building (Himalayas, Andes)
    recentUpliftBias: 0.3,  // Boost newest era uplift
    recentRiftBias: -0.1,
  },
  "recent-rifting": {
    // Recent continental breakup (East Africa, Red Sea)
    recentUpliftBias: -0.1,
    recentRiftBias: 0.3,
  },
  stable: {
    // Tectonically quiet world
    recentUpliftBias: -0.2,
    recentRiftBias: -0.2,
  },
} as const;
```

### Downstream Impact

- **Morphology**: `upliftRecentFraction` drives mountain "freshness"
- **Geomorphology**: `worldAge` informs erosion parameters
- **Ecology**: Ancient worlds have different soil development

### Author Experience

| Before | After |
|--------|-------|
| `driftStepsByEra: [2, 1, 0]` | `worldAge: "mature"` |
| `eraWeights: [0.35, 0.35, 0.3]` | (derived from worldAge) |
| No event control | `events: "recent-orogeny"` |
| No erosion concept | `erosionLevel: "moderate"` |

---

## Proposal 4.2: Belt Influence Unification

### Current State

`beltInfluenceDistance` and `beltDecay` are exposed as separate mesh-space parameters that are difficult to understand.

### Proposed Design

Unify under the **influence profile** system from Proposal 1.2:

```typescript
// Already proposed in 1.2:
influence: {
  boundaryReachTiles: 12,
  falloffProfile: "moderate",
}

// This single config drives BOTH:
// 1. Mesh-space belt influence (compute-tectonic-history)
// 2. Tile-space boundary closeness (compute-plates-tensors)
```

The implementation derives mesh-space parameters from tile-space ones:

```typescript
function deriveBeltInfluence(tileReach: number, cellsPerPlate: number): number {
  // Mesh cells are larger; scale accordingly
  const typicalTilesPerCell = Math.sqrt(FOUNDATION_REFERENCE_MAP_AREA / (24 * cellsPerPlate));
  return Math.max(2, Math.ceil(tileReach / typicalTilesPerCell));
}
```

---

# Part V: Projection and Output

## Proposal 5.1: Projection Quality Options

### Current State

Projection uses brute-force nearest-neighbor lookup and simple BFS for influence:

```typescript
// Current: O(tiles × cells) nearest lookup
for (let tile = 0; tile < tileCount; tile++) {
  for (let cell = 0; cell < cellCount; cell++) {
    // Find nearest...
  }
}
```

**Problems**:
1. Performance scales poorly with map size
2. Nearest-neighbor creates blocky boundaries
3. No interpolation between cells
4. BFS influence is axis-aligned, not smooth

### Proposed Design

Add **projection quality options**:

```typescript
foundation: {
  config: {
    projection: {
      // Spatial lookup method
      cellLookup: "kdtree",  // "bruteforce" | "kdtree"

      // How to sample cell properties
      sampling: "interpolated",  // "nearest" | "interpolated"

      // Boundary influence method
      boundaryMethod: "distance-field",  // "bfs" | "distance-field"
    }
  }
}
```

**K-d tree acceleration**:
```typescript
// Build k-d tree once from mesh sites
const kdTree = buildKdTree(mesh.siteX, mesh.siteY);

// O(log cells) per tile instead of O(cells)
for (let tile = 0; tile < tileCount; tile++) {
  const nearestCell = kdTree.nearest(tileX[tile], tileY[tile]);
}
```

**Interpolated sampling**:
```typescript
function sampleInterpolated(
  tileX: number,
  tileY: number,
  kdTree: KdTree,
  property: Float32Array
): number {
  // Find 3 nearest cells
  const nearest = kdTree.nearestK(tileX, tileY, 3);

  // Inverse distance weighting
  let sum = 0, weightSum = 0;
  for (const { cell, dist } of nearest) {
    const weight = 1 / (dist + 0.001);
    sum += property[cell] * weight;
    weightSum += weight;
  }
  return sum / weightSum;
}
```

**Distance field boundaries** (optional, for higher quality):
```typescript
// Instead of BFS, compute true Euclidean distance to boundary
function computeBoundaryDistanceField(
  plateIds: Int16Array,
  width: number,
  height: number
): Float32Array {
  // Sweep algorithm or jump flooding for O(tiles) distance field
}
```

### Downstream Impact

- Smoother plate boundaries in morphology
- Better performance on large maps
- More accurate boundary influence gradients

### Author Experience

For most users, the defaults work well. Power users can tune for quality vs performance:

```typescript
// Fast (current behavior)
projection: { cellLookup: "bruteforce", sampling: "nearest" }

// High quality (smoother, but slower)
projection: { cellLookup: "kdtree", sampling: "interpolated" }
```

---

## Proposal 5.2: Movement Scale Unification

### Current State

Movement and rotation scales are arbitrary:

```typescript
movementScale: 65,   // What does 65 mean?
rotationScale: 80,   // What does 80 mean?
```

These convert float velocities to int8 ranges, but the values are opaque.

### Proposed Design

Remove from config entirely - these are pure implementation details:

```typescript
// Internal constants, not config
const MOVEMENT_INT8_SCALE = 100;  // velocity 1.0 → int8 100
const ROTATION_INT8_SCALE = 100;  // rotation 1.0 → int8 100

// If we need to expose "activity" control, use semantic knob:
plateActivity: "normal"  // Already exists, affects velocity magnitude upstream
```

The current `movementScale` and `rotationScale` are essentially post-hoc normalization that shouldn't vary between maps.

---

# Part VI: Comprehensive Configuration Schema

## Proposal 6.1: New Foundation Configuration Shape

Bringing together all proposals, here is the **new foundation configuration schema**:

```typescript
type FoundationConfig = {
  knobs: {
    // High-level controls that scale multiple parameters
    plateCount: "sparse" | "normal" | "dense";
    plateActivity: "low" | "normal" | "high";
    worldAge: "young" | "mature" | "ancient";
  };

  config: {
    // Plate system
    plates: {
      count: number;                              // Target plate count at reference size
      scalingCurve: "none" | "sublinear" | "linear" | "superlinear";
    };

    // Mesh generation
    mesh: {
      cellsPerPlate: number;                      // Cells per plate (detail level)
      relaxationSteps: number;                    // Lloyd iterations
    };

    // Continental crust
    continents: {
      ratio: number;                              // 0-1, fraction continental
      count: { min: number; max: number };        // Distinct landmass count
      morphology: "blocky" | "elongated" | "fragmented" | "varied";
      sizeDistribution: "uniform" | "earthlike" | "one-dominant";
      clustering: number;                         // 0 = scattered, 1 = supercontinent
      margins: {
        shelfWidthFraction: number;
        shelfProfile: "steep" | "gradual" | "wide";
        marginCharacter: "passive" | "active" | "mixed";
      };
    };

    // Plate kinematics
    kinematics: {
      globalIntent: "converging" | "dispersing" | "diverse" | "rotational";
      coherence: number;                          // 0-1, pattern adherence
      speedProfile: "sluggish" | "moderate" | "vigorous";
      plateOverrides?: PlateOverride[];           // Expert mode
    };

    // Geological history
    geologicalHistory: {
      worldAge: "young" | "mature" | "ancient";
      events: "standard" | "recent-orogeny" | "recent-rifting" | "stable";
      erosionLevel: "minimal" | "moderate" | "extensive";
    };

    // Influence fields
    influence: {
      boundaryReachTiles: number;                 // How far effects spread
      falloffProfile: "sharp" | "moderate" | "gradual";
    };

    // Polar caps (optional)
    polarCaps?: {
      enabled: boolean;
      capFraction: number;
      microplatesPerPole: number;
    };
  };
};
```

---

## Proposal 6.2: Knob-to-Config Mapping

The knobs provide simple high-level control that modifies the underlying config:

```typescript
const KNOB_MODIFIERS = {
  plateCount: {
    sparse: { "plates.count": (v) => v * 0.8 },
    normal: {},
    dense: { "plates.count": (v) => v * 1.25 },
  },
  plateActivity: {
    low: {
      "kinematics.speedProfile": "sluggish",
      "influence.boundaryReachTiles": (v) => v - 2,
    },
    normal: {},
    high: {
      "kinematics.speedProfile": "vigorous",
      "influence.boundaryReachTiles": (v) => v + 3,
    },
  },
  worldAge: {
    young: { "geologicalHistory.worldAge": "young" },
    mature: { "geologicalHistory.worldAge": "mature" },
    ancient: { "geologicalHistory.worldAge": "ancient" },
  },
} as const;
```

---

## Proposal 6.3: Migration Path

Existing configs would be migrated via a **compatibility layer**:

```typescript
function migrateFoundationConfig(legacy: LegacyConfig): FoundationConfig {
  return {
    knobs: {
      plateCount: legacy.knobs?.plateCount ?? "normal",
      plateActivity: legacy.knobs?.plateActivity ?? "normal",
      worldAge: "mature",
    },
    config: {
      plates: {
        count: legacy.advanced?.["plate-graph"]?.computePlateGraph?.config?.plateCount ?? 12,
        scalingCurve: mapPowerToCurve(
          legacy.advanced?.mesh?.computeMesh?.config?.plateScalePower ?? 0.5
        ),
      },
      mesh: {
        cellsPerPlate: legacy.advanced?.mesh?.computeMesh?.config?.cellsPerPlate ?? 7,
        relaxationSteps: legacy.advanced?.mesh?.computeMesh?.config?.relaxationSteps ?? 2,
      },
      continents: {
        ratio: legacy.advanced?.crust?.computeCrust?.config?.continentalRatio ?? 0.3,
        count: { min: 2, max: 5 },  // New, no legacy equivalent
        morphology: "varied",
        sizeDistribution: "earthlike",
        clustering: 0.4,
        margins: {
          shelfWidthFraction: cellsToFraction(
            legacy.advanced?.crust?.computeCrust?.config?.shelfWidthCells ?? 6
          ),
          shelfProfile: "gradual",
          marginCharacter: "mixed",
        },
      },
      // ... continue for all fields
    },
  };
}
```

---

# Part VII: Algorithm Improvements

## Proposal 7.1: Physically-Motivated Plate Resistance

### Current State

Plate resistance is a simple function of crust type and age:
```typescript
resistance = base + ageFactor × age²
```

### Proposed Design

Add **lithospheric thickness** as a proxy for physical plate strength:

```typescript
function computePlateResistance(
  crustType: 0 | 1,
  crustAge: number,         // 0-255
  distanceToRidge: number,  // In cells
  distanceToSubduction: number
): number {
  // Lithosphere thickens with distance from ridge (cooling)
  // thickness ∝ sqrt(age) in reality
  const thermalAge = crustAge / 255;
  const thickness = 0.3 + 0.7 * Math.sqrt(thermalAge);

  // Subduction weakens nearby lithosphere
  const subductionWeakening = distanceToSubduction < 3
    ? 1 - 0.3 * (1 - distanceToSubduction / 3)
    : 1.0;

  // Continental crust is thicker and more resistant
  const crustFactor = crustType === 1 ? 1.5 : 1.0;

  return thickness * crustFactor * subductionWeakening;
}
```

This is more physically motivated: hot thin lithosphere at ridges allows plate boundaries; cold thick continental lithosphere resists them.

### Downstream Impact

- More realistic plate boundary placement
- Boundaries naturally prefer young oceanic regions

---

## Proposal 7.2: Mantle-Inspired Velocity Field

### Current State

Plate velocities are random, unrelated to any physical driver.

### Proposed Design (Advanced, Optional)

Model a simplified **mantle convection pattern** to drive plate velocities:

```typescript
/**
 * Simplified 2D mantle convection model
 *
 * Theory: Mantle convection creates cells of upwelling and downwelling.
 * Upwelling zones push plates apart (divergent); downwelling zones
 * pull plates together (convergent). We approximate this with a
 * procedural velocity field.
 *
 * NOT physically accurate, but creates coherent patterns.
 */
function generateMantleVelocityField(
  width: number,
  height: number,
  cellScale: number,  // Size of convection cells
  rng: RngFn
): (x: number, y: number) => { vx: number; vy: number } {
  // Generate Perlin-like convection potential field
  const potential = generatePotentialField(width, height, cellScale, rng);

  // Velocity is perpendicular to potential gradient
  return (x, y) => {
    const dpx = (potential(x + 0.1, y) - potential(x - 0.1, y)) / 0.2;
    const dpy = (potential(x, y + 0.1) - potential(x, y - 0.1)) / 0.2;

    // Perpendicular to gradient (like stream function)
    return { vx: -dpy, vy: dpx };
  };
}
```

This could be an **optional mode** for authors who want more physically-inspired plate dynamics:

```typescript
kinematics: {
  driver: "random" | "intent" | "convection",
  // If convection:
  convectionCellScale: 0.25,  // Fraction of map width
}
```

---

## Proposal 7.3: Coastline Fractal Refinement

### Current State

Coastlines follow mesh cell boundaries, which are smooth Voronoi edges without fractal detail.

### Proposed Design

Add a **coastline refinement pass** in projection:

```typescript
type CoastlineStyle = "smooth" | "moderate" | "rugged";

config: {
  projection: {
    coastlineRefinement: {
      enabled: true,
      style: "moderate",  // Controls fractal dimension
      seed: 12345,        // For reproducibility
    }
  }
}

// Implementation: fractal subdivision of continental edges
function refineContinentalBoundary(
  boundary: Array<{ x: number; y: number }>,
  style: CoastlineStyle,
  rng: RngFn
): Array<{ x: number; y: number }> {
  const fractalDimensions = {
    smooth: 1.1,
    moderate: 1.25,
    rugged: 1.4,
  };

  const D = fractalDimensions[style];

  // Midpoint displacement algorithm
  // Each subdivision adds noise proportional to segment length^(2-D)
  return midpointDisplacement(boundary, D, rng);
}
```

### Downstream Impact

- More interesting coastline shapes for morphology
- Better visual quality without increasing mesh resolution

---

# Summary: Priority Matrix

| Proposal | Impact | Effort | Priority |
|----------|--------|--------|----------|
| 1.1 Eliminate duplication | High (authoring) | Medium | **P0** |
| 1.2 Consolidate decay | Medium (clarity) | Low | **P0** |
| 1.3 Named constants | Medium (maintainability) | Low | **P1** |
| 2.1 Kinematic intent | High (control) | Medium | **P0** |
| 2.2 Per-plate override | Medium (power users) | Medium | **P2** |
| 3.1 Continental morphology | High (realism) | High | **P1** |
| 3.2 Margin system | Medium (clarity) | Low | **P1** |
| 4.1 Geological time | High (authoring) | Medium | **P0** |
| 4.2 Belt unification | Low (cleanup) | Low | **P1** |
| 5.1 Projection quality | Medium (quality) | High | **P2** |
| 5.2 Scale unification | Low (cleanup) | Low | **P1** |
| 6.1-6.3 Schema redesign | High (architecture) | High | **P0** |
| 7.1 Physical resistance | Medium (realism) | Medium | **P2** |
| 7.2 Mantle convection | Medium (realism) | High | **P3** |
| 7.3 Coastline fractal | Medium (quality) | Medium | **P2** |

**Recommended implementation order**:

1. **Phase 1 (P0)**: Config architecture overhaul (1.1, 1.2, 6.1-6.3), kinematic intent (2.1), geological time (4.1)
2. **Phase 2 (P1)**: Named constants (1.3), continental morphology (3.1, 3.2), belt unification (4.2), scale cleanup (5.2)
3. **Phase 3 (P2)**: Per-plate overrides (2.2), projection quality (5.1), physical resistance (7.1), coastline refinement (7.3)
4. **Phase 4 (P3)**: Mantle convection (7.2) - optional advanced feature

---

# Appendix: Before/After Comparison

## Example: Swooper Earthlike Config

### Before (Current)

```typescript
"foundation": {
  "knobs": {
    "plateCount": "normal",
    "plateActivity": "normal"
  },
  "advanced": {
    "mesh": {
      "computeMesh": {
        "strategy": "default",
        "config": {
          "plateCount": 19,
          "cellsPerPlate": 7,
          "relaxationSteps": 6,
          "referenceArea": 16000,
          "plateScalePower": 1
        }
      }
    },
    "crust": {
      "computeCrust": {
        "strategy": "default",
        "config": {
          "continentalRatio": 0.37,
          "shelfWidthCells": 6,
          "shelfElevationBoost": 0.12,
          "marginElevationPenalty": 0.04,
          "continentalBaseElevation": 0.78,
          "continentalAgeBoost": 0.12,
          "oceanicBaseElevation": 0.32,
          "oceanicAgeDepth": 0.22
        }
      }
    },
    "plate-graph": {
      "computePlateGraph": {
        "strategy": "default",
        "config": {
          "plateCount": 19,           // DUPLICATED
          "referenceArea": 16000,     // DUPLICATED
          "plateScalePower": 1,       // DUPLICATED
          "polarCaps": { ... }
        }
      }
    },
    "tectonics": {
      "computeTectonicSegments": {
        "config": {
          "intensityScale": 180,
          "regimeMinIntensity": 4
        }
      },
      "computeTectonicHistory": {
        "config": {
          "eraWeights": [0.35, 0.35, 0.3],
          "driftStepsByEra": [2, 1, 0],
          "beltInfluenceDistance": 8,
          "beltDecay": 0.55,
          "activityThreshold": 1
        }
      }
    },
    "projection": {
      "computePlates": {
        "config": {
          "boundaryInfluenceDistance": 12,
          "boundaryDecay": 0.5,
          "movementScale": 65,
          "rotationScale": 80
        }
      }
    }
  }
}
```

**Line count: ~80 lines, 6 nesting levels, 3 duplications**

### After (Proposed)

```typescript
"foundation": {
  "knobs": {
    "plateCount": "normal",
    "plateActivity": "normal",
    "worldAge": "mature"
  },
  "config": {
    "plates": {
      "count": 19,
      "scalingCurve": "linear"
    },
    "mesh": {
      "cellsPerPlate": 7,
      "relaxationSteps": 6
    },
    "continents": {
      "ratio": 0.37,
      "count": { "min": 3, "max": 6 },
      "morphology": "varied",
      "sizeDistribution": "earthlike",
      "clustering": 0.35,
      "margins": {
        "shelfWidthFraction": 0.12,
        "shelfProfile": "gradual",
        "marginCharacter": "mixed"
      }
    },
    "kinematics": {
      "globalIntent": "diverse",
      "coherence": 0.4,
      "speedProfile": "moderate"
    },
    "geologicalHistory": {
      "worldAge": "mature",
      "events": "standard",
      "erosionLevel": "moderate"
    },
    "influence": {
      "boundaryReachTiles": 12,
      "falloffProfile": "moderate"
    },
    "polarCaps": {
      "enabled": true,
      "capFraction": 0.1,
      "microplatesPerPole": 2
    }
  }
}
```

**Line count: ~50 lines, 4 nesting levels, 0 duplications**

### Improvements

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Lines of config | 80 | 50 | -38% |
| Max nesting depth | 6 | 4 | -33% |
| Duplicated values | 3 | 0 | -100% |
| Magic numbers | 12+ | 0 | -100% |
| Semantic clarity | Low | High | ↑↑ |

---

# Appendix: Glossary of Terms

| Term | Definition |
|------|------------|
| **Craton** | Stable continental interior, ancient and thick lithosphere |
| **Isostasy** | Gravitational equilibrium of crustal blocks floating on mantle |
| **Orogeny** | Mountain-building process at convergent boundaries |
| **Passive margin** | Continental edge not at plate boundary (e.g., Atlantic coast) |
| **Active margin** | Continental edge at subduction zone (e.g., Pacific coast) |
| **Lithosphere** | Rigid outer shell (crust + upper mantle) that forms plates |
| **Convection cell** | Circulation pattern in mantle driving plate motion |
| **Wilson cycle** | Assembly and breakup of supercontinents over ~500 Myr |
