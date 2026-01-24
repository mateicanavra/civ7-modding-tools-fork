# PROJECT: MapGen Studio

**Status:** Proposed
**Timeline:** MVP in ~2 weeks, iterative enhancement thereafter
**Teams:** Swooper Maps (solo / AI-assisted)

---

## 1. Purpose & Context

### 1.1 What Is MapGen Studio?

MapGen Studio is a **browser-based development tool** for the Swooper Maps procedural generation pipeline. It enables authors to:

1. **Configure** — Edit map generation parameters via a schema-driven form
2. **Generate** — Run the full pipeline offline (no Civ7 required)
3. **Visualize** — Inspect every layer of the generated map with interactive overlays
4. **Iterate** — Rapidly tune parameters and see results without launching the game

### 1.2 Why Build This?

**Current pain points:**

| Problem | Impact |
|---------|--------|
| Must launch Civ7 to test map changes | 2-5 minute iteration cycles |
| No visibility into intermediate layers | Debugging is guesswork |
| Config changes require JSON editing | Error-prone, no validation feedback |
| Cannot compare parameter variations | Hard to tune for desired results |

**MapGen Studio solves these:**

| Solution | Benefit |
|----------|---------|
| Browser-based offline generation | 1-2 second iteration cycles |
| Layer visualization with toggles | Direct insight into each pipeline stage |
| Schema-driven config editor | Validation, defaults, documentation inline |
| Side-by-side comparison (future) | A/B testing of parameters |

### 1.3 Key Insight: The Pipeline Is Already Browser-Ready

Investigation confirmed that the Swooper Maps pipeline:

- Uses **zero Node.js APIs** in runtime code
- Has **zero native dependencies**
- Uses **ESM modules** throughout (browser-native)
- Uses **TypedArrays** (not Node's Buffer)
- Has a **clean adapter boundary** (MockAdapter has no engine deps)

**No code changes required to run in browser.** This is purely a tooling/UI project.

---

## 2. Goals & Non-Goals

### 2.1 Goals (v1)

1. **Offline Generation** — Run the full `standardRecipe` pipeline in-browser using `MockAdapter`
2. **Layer Visualization** — Render any pipeline artifact (elevation, temperature, biomes, etc.) as an interactive map
3. **Config Editing** — Edit recipe configuration via auto-generated forms from JSON Schema
4. **Fast Iteration** — Sub-2-second generation for standard map sizes (128×80)
5. **Deployable** — Host on Railway (or any static host) with zero server requirements
6. **Shareable** — URL-encoded configs for sharing specific setups

### 2.2 Non-Goals (v1)

1. **Game Integration** — Not trying to replace in-game generation
2. **Full Parity** — Engine phases like `buildElevation()` are no-ops; we visualize JS artifacts instead
3. **Multiplayer/Collaboration** — Single-user tool only
4. **Mobile Support** — Desktop browsers only (WebGL required)
5. **Offline-First PWA** — Requires network for initial load (can add later)

### 2.3 Future Goals (v2+)

- Side-by-side seed comparison
- Animated era progression (for foundation evolution)
- Tile inspector with click-to-debug
- Export to PNG/SVG
- Diff view between two configs
- Preset library with thumbnails

---

## 3. Technical Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MAPGEN STUDIO ARCHITECTURE                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                            BROWSER                                      │ │
│  │                                                                         │ │
│  │   ┌─────────────────────┐        ┌─────────────────────────────────┐   │ │
│  │   │    MAIN THREAD      │        │         WEB WORKER              │   │ │
│  │   │                     │        │                                 │   │ │
│  │   │  ┌───────────────┐  │        │  ┌───────────────────────────┐  │   │ │
│  │   │  │ React App     │  │        │  │ Pipeline Runner           │  │   │ │
│  │   │  │               │  │        │  │                           │  │   │ │
│  │   │  │ • ConfigEditor│  │  msg   │  │ • createMockAdapter()     │  │   │ │
│  │   │  │ • LayerPanel  │◄─┼────────┼─►│ • standardRecipe.run()    │  │   │ │
│  │   │  │ • MapViewport │  │        │  │ • Extract artifacts       │  │   │ │
│  │   │  │ • Inspector   │  │        │  │ • Transfer to main        │  │   │ │
│  │   │  └───────────────┘  │        │  └───────────────────────────┘  │   │ │
│  │   │         │           │        │                                 │   │ │
│  │   │         ▼           │        └─────────────────────────────────┘   │ │
│  │   │  ┌───────────────┐  │                                              │ │
│  │   │  │ deck.gl       │  │                                              │ │
│  │   │  │ (WebGL)       │  │                                              │ │
│  │   │  │               │  │                                              │ │
│  │   │  │ • 72k hexes   │  │                                              │ │
│  │   │  │ • 60fps pan   │  │                                              │ │
│  │   │  │ • Hover/pick  │  │                                              │ │
│  │   │  └───────────────┘  │                                              │ │
│  │   │                     │                                              │ │
│  │   └─────────────────────┘                                              │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  DEPLOYMENT: Static files on Railway / Vercel / Cloudflare Pages            │
│  RUNTIME: 100% client-side, zero server required after initial load         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Runtime** | Bun | Required by project, fast, native TS |
| **Framework** | React 19 | Component model for config editor, large ecosystem |
| **Build** | Vite | Fast HMR, ESM-native, works with Bun |
| **Visualization** | deck.gl | WebGL performance for 72k hexes, React bindings |
| **Color Scales** | d3-scale, d3-scale-chromatic | Already use d3-delaunay, lightweight |
| **Forms** | react-jsonschema-form | Auto-generate UI from TypeBox schemas |
| **Styling** | Tailwind CSS | Fast iteration, no runtime CSS-in-JS |
| **State** | Zustand or useState | Simple, no Redux overhead |

### 3.3 Package Structure

```
packages/mapgen-studio/
├── package.json
├── vite.config.ts
├── index.html
├── tailwind.config.js
├── tsconfig.json
│
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component
│   │
│   ├── worker/
│   │   └── pipeline.worker.ts      # Web Worker for generation
│   │
│   ├── components/
│   │   ├── ConfigEditor/
│   │   │   ├── index.tsx           # JSON Schema form wrapper
│   │   │   ├── FieldTemplates.tsx  # Custom field renderers
│   │   │   └── Presets.tsx         # Preset selector
│   │   │
│   │   ├── MapViewport/
│   │   │   ├── index.tsx           # deck.gl container
│   │   │   ├── layers/
│   │   │   │   ├── HexScalarLayer.ts    # Heatmaps (elevation, temp)
│   │   │   │   ├── HexCategoryLayer.ts  # Categories (biomes, plates)
│   │   │   │   ├── VectorFieldLayer.ts  # Arrows (wind, currents)
│   │   │   │   └── PointsLayer.ts       # Features (volcanoes, wonders)
│   │   │   └── colorScales.ts      # d3 color scale definitions
│   │   │
│   │   ├── LayerPanel/
│   │   │   ├── index.tsx           # Layer toggle list
│   │   │   ├── LayerGroup.tsx      # Collapsible domain group
│   │   │   └── LayerItem.tsx       # Individual toggle
│   │   │
│   │   ├── Inspector/
│   │   │   ├── index.tsx           # Tile data panel
│   │   │   └── TileDetails.tsx     # Per-layer values
│   │   │
│   │   └── Header/
│   │       ├── index.tsx           # Top bar
│   │       ├── GenerateButton.tsx  # Run pipeline button
│   │       └── SeedInput.tsx       # Seed control
│   │
│   ├── hooks/
│   │   ├── usePipeline.ts          # Worker communication
│   │   ├── useArtifacts.ts         # Artifact state
│   │   └── useConfig.ts            # Config state + URL sync
│   │
│   ├── lib/
│   │   ├── artifacts.ts            # Artifact type definitions
│   │   ├── layers.ts               # Layer metadata catalog
│   │   └── schema.ts               # TypeBox → JSON Schema conversion
│   │
│   └── styles/
│       └── globals.css             # Tailwind imports
│
├── public/
│   └── favicon.svg
│
└── Dockerfile                      # Railway deployment
```

### 3.4 Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
│                                                                              │
│   USER ACTION                                                                │
│   ───────────                                                                │
│   1. Edit config in form                                                     │
│   2. Click "Generate"                                                        │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────┐                                                        │
│   │ Config State    │                                                        │
│   │ (Zustand)       │                                                        │
│   └────────┬────────┘                                                        │
│            │                                                                 │
│            │ postMessage({ type: 'run', config })                           │
│            ▼                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         WEB WORKER                                   │   │
│   │                                                                      │   │
│   │   config → MockAdapter → standardRecipe.run() → context.artifacts   │   │
│   │                                                                      │   │
│   │   Extract & serialize:                                               │   │
│   │   • topography.elevation (Int16Array)                               │   │
│   │   • topography.landMask (Uint8Array)                                │   │
│   │   • climateField.surfaceTemperatureC (Float32Array)                 │   │
│   │   • climateField.rainfall (Uint8Array)                              │   │
│   │   • biomeClassification.biomeIndex (Uint8Array)                     │   │
│   │   • plates.id (Int16Array)                                          │   │
│   │   • ... (25+ arrays total)                                          │   │
│   │                                                                      │   │
│   └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                           │
│                                  │ postMessage({ type: 'result', artifacts })│
│                                  │ (Transferable for zero-copy)              │
│                                  ▼                                           │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│   │ Artifacts State │────►│ Active Layers   │────►│ deck.gl Render  │       │
│   │ (raw arrays)    │     │ (user toggles)  │     │ (WebGL hexes)   │       │
│   └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Technical Specifications

### 4.1 TypeScript Interfaces

#### 4.1.1 Web Worker Protocol

```typescript
// ============================================================
// WORKER MESSAGE PROTOCOL
// ============================================================

/** Messages sent TO the worker */
type WorkerInMessage = RunMessage | CancelMessage;

interface RunMessage {
  type: 'run';
  id: string;                    // Unique request ID for correlation
  config: PipelineConfig;
}

interface CancelMessage {
  type: 'cancel';
  id: string;                    // Request ID to cancel
}

interface PipelineConfig {
  width: number;                 // Map width in tiles (64-400)
  height: number;                // Map height in tiles (40-250)
  seed: number;                  // RNG seed (0 = random)
  recipe?: Partial<RecipeConfig>;// Optional recipe overrides
}

/** Messages sent FROM the worker */
type WorkerOutMessage = ProgressMessage | ResultMessage | ErrorMessage;

interface ProgressMessage {
  type: 'progress';
  id: string;                    // Correlated request ID
  stage: string;                 // Current stage name
  stageIndex: number;            // 0-indexed stage number
  stageCount: number;            // Total stages
  percent: number;               // 0-100 overall progress
}

interface ResultMessage {
  type: 'result';
  id: string;
  artifacts: ArtifactBundle;
  timing: TimingInfo;
}

interface ErrorMessage {
  type: 'error';
  id: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

#### 4.1.2 Artifact Bundle

```typescript
// ============================================================
// ARTIFACT TYPES
// ============================================================

interface ArtifactBundle {
  // Map dimensions (for interpreting arrays)
  dimensions: {
    width: number;
    height: number;
    tileCount: number;
  };

  // Foundation domain
  foundation: {
    plateId: Int16Array;           // Per-tile plate assignment
    boundaryCloseness: Uint8Array; // 0-255 distance to boundary
    crustType: Uint8Array;         // 0=oceanic, 1=continental
    crustAge: Uint8Array;          // Relative age 0-255
    upliftPotential: Uint8Array;   // 0-255
    riftPotential: Uint8Array;     // 0-255
    volcanism: Uint8Array;         // 0-255
  };

  // Morphology domain
  morphology: {
    elevation: Int16Array;         // Meters (-11000 to +9000)
    landMask: Uint8Array;          // 0=water, 1=land
    coastDistance: Uint8Array;     // Tiles to coast (capped at 255)
    flowDir: Uint8Array;           // 0-7 cardinal/diagonal directions
    flowAccum: Float32Array;       // Log-scale accumulation
    basinId: Int16Array;           // Drainage basin assignment
  };

  // Hydrology domain
  hydrology: {
    temperature: Float32Array;     // Celsius (-50 to +60)
    rainfall: Uint8Array;          // mm/month (0-200)
    humidity: Uint8Array;          // 0-255
    windU: Int8Array;              // East-west component (-127 to +127)
    windV: Int8Array;              // North-south component
    pressure: Float32Array;        // Relative pressure
    riverDischarge: Float32Array;  // Cubic meters/second
    riverClass: Uint8Array;        // 0=none, 1=minor, 2=major, 3=great
  };

  // Ecology domain
  ecology: {
    biomeIndex: Uint8Array;        // Biome classification (see BiomeId)
    vegetation: Uint8Array;        // 0-255 density
    aridity: Uint8Array;           // 0-255 (0=wet, 255=dry)
  };

  // Point features (sparse)
  features: {
    volcanoes: PointFeature[];
    lakes: PointFeature[];
    floodplains: PointFeature[];
  };
}

interface PointFeature {
  x: number;
  y: number;
  index: number;                   // Precomputed tile index
  metadata?: Record<string, unknown>;
}

/** Biome enumeration */
const enum BiomeId {
  OCEAN = 0,
  COAST = 1,
  SNOW = 2,
  TUNDRA = 3,
  BOREAL = 4,
  TEMPERATE_DRY = 5,
  TEMPERATE_HUMID = 6,
  TROPICAL_DRY = 7,
  TROPICAL_HUMID = 8,
  DESERT = 9,
  MARSH = 10,
}
```

#### 4.1.3 Application State

```typescript
// ============================================================
// APPLICATION STATE (Zustand Store)
// ============================================================

interface StudioState {
  // Generation config
  config: PipelineConfig;
  setConfig: (config: Partial<PipelineConfig>) => void;
  loadPreset: (preset: PresetId) => void;

  // Generation state
  isGenerating: boolean;
  progress: ProgressMessage | null;
  lastError: ErrorMessage | null;
  generate: () => void;
  cancel: () => void;

  // Artifacts (result data)
  artifacts: ArtifactBundle | null;
  timing: TimingInfo | null;

  // Visualization state
  activeLayers: Set<string>;
  toggleLayer: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  layerOpacities: Map<string, number>;

  // Viewport state
  viewport: ViewportState;
  panTo: (x: number, y: number) => void;
  zoomTo: (level: number) => void;
  resetViewport: () => void;

  // Inspection
  selectedTile: TileCoord | null;
  selectTile: (tile: TileCoord | null) => void;
  hoveredTile: TileCoord | null;
  setHoveredTile: (tile: TileCoord | null) => void;
}

interface ViewportState {
  x: number;                       // Pan offset X (pixels)
  y: number;                       // Pan offset Y (pixels)
  zoom: number;                    // Zoom level (0.25 - 4.0)
  width: number;                   // Viewport width (pixels)
  height: number;                  // Viewport height (pixels)
}

interface TileCoord {
  x: number;                       // Column (0 to width-1)
  y: number;                       // Row (0 to height-1)
  index: number;                   // Precomputed y * width + x
}

interface TimingInfo {
  total: number;                   // Total generation time (ms)
  stages: Map<string, number>;     // Per-stage timing
}

type PresetId = 'balanced' | 'pangaea' | 'archipelago' | 'continents' | 'fractal';
```

#### 4.1.4 Layer Metadata

```typescript
// ============================================================
// LAYER CATALOG TYPES
// ============================================================

interface LayerDefinition {
  id: string;                      // Unique layer ID (e.g., 'morphology.elevation')
  domain: DomainId;                // Which domain this belongs to
  name: string;                    // Display name
  description: string;             // Tooltip description
  type: LayerType;
  defaultVisible: boolean;

  // For scalar layers
  colorScale?: string;             // d3 interpolator name
  valueRange?: [number, number];   // [min, max]
  unit?: string;                   // Display unit

  // For categorical layers
  categories?: CategoryDef[];

  // For vector layers
  pairedLayerId?: string;          // ID of paired component

  // Rendering hints
  zIndex: number;                  // Layer ordering (higher = on top)
  blendMode?: 'normal' | 'multiply' | 'screen';
}

type DomainId = 'foundation' | 'morphology' | 'hydrology' | 'ecology' | 'features';
type LayerType = 'scalar' | 'categorical' | 'mask' | 'vector' | 'points';

interface CategoryDef {
  value: number;
  label: string;
  color: string;
}

/** Complete layer catalog - source of truth */
const LAYER_CATALOG: LayerDefinition[] = [
  // Foundation
  {
    id: 'foundation.plateId',
    domain: 'foundation',
    name: 'Tectonic Plates',
    description: 'Plate assignment for each tile',
    type: 'categorical',
    defaultVisible: false,
    categories: [], // Dynamically generated from plate count
    zIndex: 10,
  },
  {
    id: 'foundation.crustType',
    domain: 'foundation',
    name: 'Crust Type',
    description: 'Oceanic vs continental crust',
    type: 'categorical',
    defaultVisible: false,
    categories: [
      { value: 0, label: 'Oceanic', color: '#1a5276' },
      { value: 1, label: 'Continental', color: '#784212' },
    ],
    zIndex: 11,
  },
  // ... (full catalog defined in implementation)
];
```

### 4.2 Hex Grid Coordinate System

```typescript
// ============================================================
// HEX GRID MATHEMATICS
// ============================================================

/**
 * MapGen Studio uses OFFSET COORDINATES with pointy-top hexagons.
 *
 * Coordinate system:
 *   - Column (x): 0 at left edge, increases rightward
 *   - Row (y): 0 at top edge, increases downward
 *   - Odd rows are offset right by 0.5 hex widths
 *
 *     0   1   2   3   4        (columns)
 *   ⬡   ⬡   ⬡   ⬡   ⬡     row 0
 *     ⬡   ⬡   ⬡   ⬡   ⬡   row 1 (offset)
 *   ⬡   ⬡   ⬡   ⬡   ⬡     row 2
 */

const HEX_SIZE = 6; // Pixels from center to vertex

/** Convert offset coordinates to pixel position */
function hexToPixel(col: number, row: number, size: number = HEX_SIZE): Point {
  const x = size * Math.sqrt(3) * (col + 0.5 * (row & 1));
  const y = size * 1.5 * row;
  return { x, y };
}

/** Convert pixel position to offset coordinates */
function pixelToHex(px: number, py: number, size: number = HEX_SIZE): TileCoord {
  const q = (px * Math.sqrt(3) / 3 - py / 3) / size;
  const r = py * 2 / 3 / size;
  // Round to nearest hex (cube coordinate rounding)
  const [col, row] = cubeToOffset(cubeRound(axialToCube(q, r)));
  return { x: col, y: row, index: row * mapWidth + col };
}

/** Hex vertex positions (pointy-top, clockwise from top) */
function hexVertices(size: number = HEX_SIZE): Point[] {
  return [0, 60, 120, 180, 240, 300].map(deg => ({
    x: size * Math.sin(deg * Math.PI / 180),
    y: -size * Math.cos(deg * Math.PI / 180),
  }));
}

/** Get the 6 neighbors of a hex (with wrap handling) */
function hexNeighbors(x: number, y: number, width: number, height: number): TileCoord[] {
  const isOddRow = y & 1;
  const offsets = isOddRow
    ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]]
    : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];

  return offsets
    .map(([dx, dy]) => {
      let nx = x + dx;
      const ny = y + dy;
      // Cylindrical wrap (horizontal only)
      if (nx < 0) nx += width;
      if (nx >= width) nx -= width;
      // No vertical wrap
      if (ny < 0 || ny >= height) return null;
      return { x: nx, y: ny, index: ny * width + nx };
    })
    .filter((t): t is TileCoord => t !== null);
}
```

---

## 5. Feature Specifications

### 5.1 Config Editor

**Purpose:** Edit pipeline configuration with validation, documentation, and presets.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| CE-1 | Generate form from TypeBox schema | P0 |
| CE-2 | Show field descriptions as tooltips | P0 |
| CE-3 | Validate on change, show errors inline | P0 |
| CE-4 | Preset dropdown (balanced, pangaea, archipelago, etc.) | P0 |
| CE-5 | Collapse/expand config sections | P1 |
| CE-6 | Reset to defaults button | P1 |
| CE-7 | Import/export config as JSON | P1 |
| CE-8 | URL-encode config for sharing | P2 |

**Schema Integration:**

```typescript
// The pipeline already defines schemas via TypeBox
import { FoundationConfigSchema } from '@swooper/mapgen-core';

// Convert to JSON Schema for react-jsonschema-form
const jsonSchema = typeboxToJsonSchema(FoundationConfigSchema);

// Render form
<Form schema={jsonSchema} formData={config} onChange={handleChange} />
```

### 5.2 Map Viewport

**Purpose:** Render generated map layers with WebGL performance.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| MV-1 | Render 72k hexes at 60fps | P0 |
| MV-2 | Pan and zoom with mouse/trackpad | P0 |
| MV-3 | Hover tooltip showing tile coords | P0 |
| MV-4 | Click to select tile for inspector | P1 |
| MV-5 | Minimap for navigation (large maps) | P2 |
| MV-6 | Screenshot/export current view | P2 |

**Hex Rendering:**

```typescript
// Pointy-top hex coordinates
const hexToPixel = (col: number, row: number, size: number) => ({
  x: size * Math.sqrt(3) * (col + 0.5 * (row & 1)),
  y: size * 1.5 * row,
});

// deck.gl layer for scalar data
new SolidPolygonLayer({
  id: 'elevation',
  data: hexPositions,
  getPolygon: d => hexVertices(d.x, d.y, hexSize),
  getFillColor: d => colorScale(artifacts.elevation[d.index]),
  pickable: true,
});
```

### 5.3 Layer Panel

**Purpose:** Toggle visibility of map layers, organized by domain.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| LP-1 | List all available layers grouped by domain | P0 |
| LP-2 | Checkbox to toggle layer visibility | P0 |
| LP-3 | Show layer legend (color scale or categories) | P0 |
| LP-4 | Collapse/expand domain groups | P1 |
| LP-5 | Reorder layers (z-index) via drag | P2 |
| LP-6 | Opacity slider per layer | P2 |

**Layer Catalog:**

```typescript
const LAYER_CATALOG = {
  foundation: [
    { id: 'plates.id', name: 'Plate ID', type: 'categorical' },
    { id: 'plates.boundaryCloseness', name: 'Boundary Distance', type: 'scalar' },
    { id: 'crust.type', name: 'Crust Type', type: 'categorical' },
  ],
  morphology: [
    { id: 'topography.elevation', name: 'Elevation', type: 'scalar', unit: 'm' },
    { id: 'topography.landMask', name: 'Land/Water', type: 'mask' },
    { id: 'routing.flowDir', name: 'Flow Direction', type: 'vector' },
  ],
  hydrology: [
    { id: 'climate.temperature', name: 'Temperature', type: 'scalar', unit: '°C' },
    { id: 'climate.rainfall', name: 'Rainfall', type: 'scalar', unit: 'mm' },
    { id: 'circulation.wind', name: 'Wind', type: 'vector' },
  ],
  ecology: [
    { id: 'biomes.index', name: 'Biome', type: 'categorical' },
    { id: 'biomes.vegetation', name: 'Vegetation', type: 'scalar' },
  ],
};
```

### 5.4 Inspector Panel

**Purpose:** Show detailed values for a selected tile.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| IP-1 | Show tile coordinates (x, y, index) | P0 |
| IP-2 | Show value from each layer at tile | P0 |
| IP-3 | Format values with units | P1 |
| IP-4 | Show hex neighbors | P2 |
| IP-5 | Copy tile data as JSON | P2 |

### 5.5 Generation Controls

**Purpose:** Configure and trigger map generation.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| GC-1 | Map dimensions selector (width × height) | P0 |
| GC-2 | Seed input (number or "random") | P0 |
| GC-3 | Generate button with loading state | P0 |
| GC-4 | Show generation time | P0 |
| GC-5 | Cancel in-progress generation | P1 |
| GC-6 | Progress indicator during generation | P2 |

---

## 6. Layer Catalog

### 6.1 Foundation Domain

| Layer | Array Type | Viz Type | Color Scale |
|-------|------------|----------|-------------|
| `plates.id` | Int16Array | Categorical | d3.schemeTableau10 |
| `plates.boundaryCloseness` | Uint8Array | Scalar | interpolateYlOrRd |
| `plates.boundaryType` | Uint8Array | Categorical | Custom (conv/div/trans) |
| `plates.upliftPotential` | Uint8Array | Scalar | interpolateOranges |
| `plates.riftPotential` | Uint8Array | Scalar | interpolatePurples |
| `plates.shieldStability` | Uint8Array | Scalar | interpolateGreens |
| `plates.volcanism` | Uint8Array | Scalar | interpolateReds |
| `plates.movementU/V` | Int8Array | Vector | Arrows |
| `crust.type` | Uint8Array | Categorical | Blue/Brown |
| `crust.age` | Uint8Array | Scalar | interpolateViridis |

### 6.2 Morphology Domain

| Layer | Array Type | Viz Type | Color Scale |
|-------|------------|----------|-------------|
| `topography.elevation` | Int16Array | Scalar | interpolateTerrain |
| `topography.landMask` | Uint8Array | Mask | Blue/Green |
| `topography.bathymetry` | Int16Array | Scalar | interpolateBlues (inv) |
| `relief.mountainMask` | Uint8Array | Mask | Brown overlay |
| `relief.hillMask` | Uint8Array | Mask | Tan overlay |
| `routing.flowDir` | Uint8Array | Vector | Arrows (8-dir) |
| `routing.flowAccum` | Float32Array | Scalar | interpolateBlues (log) |
| `routing.basinId` | Int16Array | Categorical | schemeCategory10 |
| `volcanoes` | number[] | Points | Red triangles |
| `ridges` | number[] | Points | Brown lines |

### 6.3 Hydrology Domain

| Layer | Array Type | Viz Type | Color Scale |
|-------|------------|----------|-------------|
| `climate.temperature` | Float32Array | Scalar | interpolateRdYlBu (inv) |
| `climate.insolation` | Float32Array | Scalar | interpolateYlOrRd |
| `climate.humidity` | Uint8Array | Scalar | interpolateBlues |
| `climate.rainfall` | Uint8Array | Scalar | interpolateGnBu |
| `climate.evaporation` | Uint8Array | Scalar | interpolateOrRd |
| `circulation.windU/V` | Int8Array | Vector | Arrows |
| `circulation.pressure` | Float32Array | Scalar | interpolateRdBu |
| `hydrography.discharge` | Float32Array | Scalar | interpolateBlues (log) |
| `hydrography.riverClass` | Uint8Array | Categorical | Blue shades |
| `lakes` | number[] | Points | Blue circles |

### 6.4 Ecology Domain

| Layer | Array Type | Viz Type | Color Scale |
|-------|------------|----------|-------------|
| `biomes.index` | Uint8Array | Categorical | Custom biome colors |
| `biomes.vegetation` | Float32Array | Scalar | interpolateGreens |
| `biomes.aridity` | Float32Array | Scalar | interpolateYlOrBr |
| `features.forest` | number[] | Points | Green circles |
| `features.marsh` | number[] | Points | Cyan circles |
| `features.reef` | number[] | Points | Pink circles |

---

## 7. Milestones

### 7.1 Milestone 1 — Minimal Viable Product (MVP)

**Timeline:** ~1 week
**Goal:** End-to-end proof of concept

**Deliverables:**

- [ ] Vite + React + Bun project scaffold
- [ ] Web Worker running pipeline
- [ ] deck.gl rendering one scalar layer (elevation)
- [ ] deck.gl rendering one categorical layer (biomes)
- [ ] Basic config form (width, height, seed)
- [ ] Generate button
- [ ] Deployable to Railway

**Success Criteria:**

- Can generate a 128×80 map in browser
- Can view elevation and biome layers
- Deployed and accessible via URL

### 7.2 Milestone 2 — Full Layer Support

**Timeline:** ~1 week
**Goal:** All layers visualizable

**Deliverables:**

- [ ] All foundation layers
- [ ] All morphology layers
- [ ] All hydrology layers
- [ ] All ecology layers
- [ ] Vector field rendering (wind, flow)
- [ ] Point feature rendering (volcanoes)
- [ ] Layer panel with domain grouping
- [ ] Layer legends

**Success Criteria:**

- Can toggle any of 25+ layers
- Vector fields render as arrows
- Legends show correct scales

### 7.3 Milestone 3 — Config Editor

**Timeline:** ~1 week
**Goal:** Full config editing experience

**Deliverables:**

- [ ] TypeBox → JSON Schema conversion
- [ ] react-jsonschema-form integration
- [ ] All config sections editable
- [ ] Presets (balanced, pangaea, archipelago, etc.)
- [ ] Validation with inline errors
- [ ] Import/export JSON

**Success Criteria:**

- Can edit any config value
- Validation prevents invalid configs
- Presets work correctly

### 7.4 Milestone 4 — Polish & DX

**Timeline:** ~1 week
**Goal:** Production-quality tool

**Deliverables:**

- [ ] Inspector panel (click tile to see values)
- [ ] URL-encoded configs for sharing
- [ ] Performance optimization (larger maps)
- [ ] Error handling and recovery
- [ ] Loading states and feedback
- [ ] Keyboard shortcuts
- [ ] Documentation / help

**Success Criteria:**

- Can share map configs via URL
- 300×240 maps generate in <5s
- No crashes or unhandled errors

---

## 8. Deployment

### 8.1 Railway Configuration

**Dockerfile:**

```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
COPY packages/mapgen-core/package.json packages/mapgen-core/
COPY packages/civ7-adapter/package.json packages/civ7-adapter/
COPY mods/mod-swooper-maps/package.json mods/mod-swooper-maps/
COPY packages/mapgen-studio/package.json packages/mapgen-studio/
RUN bun install

# Copy source and build
COPY . .
RUN bun run --filter=@swooper/mapgen-studio build

# Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/packages/mapgen-studio/dist /usr/share/nginx/html
COPY packages/mapgen-studio/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

### 8.2 Railway CLI Deployment

```bash
cd packages/mapgen-studio
railway login
railway init        # Create project
railway up          # Deploy
railway domain      # Get URL
```

### 8.3 Environment Variables

None required — fully static client-side application.

---

## 9. Error Handling Strategy

### 9.1 Error Categories

| Category | Example | User Impact | Handling |
|----------|---------|-------------|----------|
| **Config Validation** | Invalid seed format | Prevents generation | Inline form errors, prevent submit |
| **Worker Crash** | Out of memory | Generation fails | Show error toast, offer retry |
| **Pipeline Error** | Recipe assertion fails | Generation fails | Show error with stage info |
| **Render Error** | WebGL context lost | Visualization fails | Show fallback message, offer reload |
| **Network Error** | CDN unavailable | App won't load | Service worker cache fallback |

### 9.2 Error Handling Patterns

```typescript
// Worker-side error handling
self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  try {
    const result = await runPipeline(e.data.config);
    self.postMessage({ type: 'result', id: e.data.id, ...result });
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: e.data.id,
      error: {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }
};

// Main thread error boundary
function App() {
  return (
    <ErrorBoundary
      fallback={<CrashScreen onReset={() => window.location.reload()} />}
      onError={(error, info) => console.error('React error:', error, info)}
    >
      <StudioApp />
    </ErrorBoundary>
  );
}

// WebGL context loss recovery
useEffect(() => {
  const canvas = canvasRef.current;
  const handleContextLost = (e: Event) => {
    e.preventDefault();
    setWebGLError('WebGL context lost. Click to restore.');
  };
  const handleContextRestored = () => {
    setWebGLError(null);
    reinitializeDeckGL();
  };
  canvas?.addEventListener('webglcontextlost', handleContextLost);
  canvas?.addEventListener('webglcontextrestored', handleContextRestored);
  return () => {
    canvas?.removeEventListener('webglcontextlost', handleContextLost);
    canvas?.removeEventListener('webglcontextrestored', handleContextRestored);
  };
}, []);
```

### 9.3 User Feedback

| State | Visual Indicator | User Action |
|-------|------------------|-------------|
| Generating | Spinner + progress bar | Cancel button |
| Success | Map renders, timing shown | Inspect, toggle layers |
| Validation Error | Red border on field, message | Fix input |
| Generation Error | Toast with message | Retry or change config |
| WebGL Error | Overlay message | Reload page |

---

## 10. Testing Strategy

### 10.1 Test Pyramid

```
                    ┌─────────────┐
                    │   E2E (5%)  │  Playwright: critical paths
                   ─┴─────────────┴─
                  ┌─────────────────┐
                  │Integration (20%)│  Vitest: worker + rendering
                 ─┴─────────────────┴─
                ┌─────────────────────┐
                │   Unit Tests (75%)  │  Vitest: pure functions
               ─┴─────────────────────┴─
```

### 10.2 Test Categories

#### Unit Tests (Vitest)
```typescript
// Coordinate conversion
describe('hexToPixel', () => {
  it('converts origin correctly', () => {
    expect(hexToPixel(0, 0, 10)).toEqual({ x: 0, y: 0 });
  });
  it('offsets odd rows', () => {
    const even = hexToPixel(0, 0, 10);
    const odd = hexToPixel(0, 1, 10);
    expect(odd.x).toBeGreaterThan(even.x);
  });
});

// Color scale mapping
describe('colorScale', () => {
  it('maps min to first color', () => {
    const scale = createElevationScale(-100, 100);
    expect(scale(-100)).toBe('#000080'); // Deep blue
  });
});

// State management
describe('studioStore', () => {
  it('toggles layer visibility', () => {
    const store = createStudioStore();
    store.getState().toggleLayer('morphology.elevation');
    expect(store.getState().activeLayers.has('morphology.elevation')).toBe(true);
  });
});
```

#### Integration Tests (Vitest + jsdom)
```typescript
// Worker communication
describe('pipeline worker', () => {
  it('returns artifacts for valid config', async () => {
    const worker = new Worker('./pipeline.worker.ts', { type: 'module' });
    const result = await sendAndWait(worker, {
      type: 'run',
      id: 'test-1',
      config: { width: 64, height: 40, seed: 12345 },
    });
    expect(result.type).toBe('result');
    expect(result.artifacts.morphology.elevation).toBeInstanceOf(Int16Array);
  });

  it('reports progress during generation', async () => {
    const messages: ProgressMessage[] = [];
    worker.onmessage = (e) => {
      if (e.data.type === 'progress') messages.push(e.data);
    };
    await runGeneration(worker, { width: 128, height: 80, seed: 1 });
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[messages.length - 1].percent).toBe(100);
  });
});

// Rendering pipeline
describe('MapViewport', () => {
  it('renders elevation layer when active', async () => {
    render(<MapViewport artifacts={mockArtifacts} activeLayers={new Set(['morphology.elevation'])} />);
    await waitFor(() => {
      expect(screen.getByTestId('deck-gl-canvas')).toBeInTheDocument();
    });
  });
});
```

#### E2E Tests (Playwright)
```typescript
// Critical user journey
test('generate and inspect map', async ({ page }) => {
  await page.goto('/');

  // Set seed for reproducibility
  await page.fill('[data-testid="seed-input"]', '42');

  // Generate
  await page.click('[data-testid="generate-button"]');
  await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
  await expect(page.locator('[data-testid="timing-display"]')).toBeVisible({ timeout: 30000 });

  // Toggle layer
  await page.click('[data-testid="layer-toggle-morphology.elevation"]');

  // Inspect tile
  await page.click('[data-testid="map-viewport"]', { position: { x: 400, y: 300 } });
  await expect(page.locator('[data-testid="inspector-panel"]')).toContainText('Elevation');
});
```

### 10.3 Test Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/*.test.ts', 'test/**'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
});
```

---

## 11. Browser Compatibility

### 11.1 Supported Browsers

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 90+ | Primary target, best WebGL performance |
| Firefox | 90+ | Full support |
| Safari | 15+ | Requires WebGL 2 (Safari 15+) |
| Edge | 90+ | Chromium-based, same as Chrome |

**Not Supported:**
- Internet Explorer (any version)
- Safari < 15 (no WebGL 2)
- Mobile browsers (not optimized, may work)

### 11.2 Required Browser Features

| Feature | Usage | Fallback |
|---------|-------|----------|
| ES2022 | Async/await, optional chaining | None (required) |
| Web Workers | Pipeline execution | None (required) |
| WebGL 2 | deck.gl rendering | None (required) |
| ResizeObserver | Responsive viewport | Polyfill available |
| CSS Grid | Layout | None (required) |
| ES Modules | All imports | None (required) |

### 11.3 Feature Detection

```typescript
// Startup checks
function checkBrowserSupport(): SupportResult {
  const issues: string[] = [];

  // Web Worker support
  if (typeof Worker === 'undefined') {
    issues.push('Web Workers not supported');
  }

  // WebGL 2 support
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    issues.push('WebGL 2 not supported');
  }

  // ES Module support (implicit - if this code runs, it's supported)

  return {
    supported: issues.length === 0,
    issues,
  };
}

// Show unsupported browser message
function App() {
  const support = useMemo(() => checkBrowserSupport(), []);

  if (!support.supported) {
    return <UnsupportedBrowser issues={support.issues} />;
  }

  return <StudioApp />;
}
```

---

## 12. Performance Budgets

### 12.1 Generation Time Targets

| Map Size | Tiles | Target Time | Acceptable |
|----------|-------|-------------|------------|
| Small (64×40) | 2,560 | < 200ms | < 500ms |
| Standard (128×80) | 10,240 | < 500ms | < 1,500ms |
| Large (200×125) | 25,000 | < 1,500ms | < 3,000ms |
| Huge (300×240) | 72,000 | < 3,000ms | < 6,000ms |
| Maximum (400×250) | 100,000 | < 5,000ms | < 10,000ms |

### 12.2 Rendering Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial render | < 100ms | Time from artifacts received to first frame |
| Pan/zoom | 60 fps | No frame drops during interaction |
| Layer toggle | < 50ms | Time to show/hide layer |
| Tile hover | < 16ms | Highlight response time |

### 12.3 Bundle Size Budget

| Chunk | Target | Maximum |
|-------|--------|---------|
| Main app (React, UI) | < 50 KB | 80 KB |
| Pipeline (mapgen-core, mod) | < 80 KB | 120 KB |
| Visualization (deck.gl) | < 150 KB | 200 KB |
| **Total (gzipped)** | **< 280 KB** | **400 KB** |

### 12.4 Memory Budget

| Map Size | Peak Memory | Artifact Storage |
|----------|-------------|------------------|
| Standard (128×80) | < 50 MB | ~5 MB |
| Large (200×125) | < 100 MB | ~15 MB |
| Huge (300×240) | < 200 MB | ~45 MB |

### 12.5 Monitoring

```typescript
// Performance marks for profiling
performance.mark('generation-start');
worker.postMessage({ type: 'run', config });

worker.onmessage = (e) => {
  if (e.data.type === 'result') {
    performance.mark('generation-end');
    performance.measure('generation', 'generation-start', 'generation-end');

    const measure = performance.getEntriesByName('generation')[0];
    console.log(`Generation took ${measure.duration.toFixed(0)}ms`);

    // Report to analytics if over budget
    if (measure.duration > GENERATION_BUDGET[config.size]) {
      reportSlowGeneration(config, measure.duration);
    }
  }
};
```

---

## 13. Accessibility

### 13.1 Requirements

| Category | Requirement | Implementation |
|----------|-------------|----------------|
| Keyboard | All interactive elements focusable | tabIndex, focus styles |
| Keyboard | Layer toggles via Enter/Space | Button elements |
| Keyboard | Map pan via arrow keys | Keyboard event handlers |
| Screen Reader | Layer names announced | aria-label on toggles |
| Screen Reader | Generation status announced | aria-live region |
| Color | Non-color indicators for state | Icons + text labels |
| Motion | Respect prefers-reduced-motion | Disable animations |

### 13.2 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `G` | Generate new map |
| `Esc` | Cancel generation / deselect tile |
| `1-9` | Toggle layer groups |
| `+` / `-` | Zoom in / out |
| `Arrow keys` | Pan map |
| `R` | Reset viewport |
| `?` | Show keyboard shortcuts |

### 13.3 Implementation

```typescript
// Keyboard handler
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't capture when typing in inputs
    if (e.target instanceof HTMLInputElement) return;

    switch (e.key) {
      case 'g':
        if (!isGenerating) generate();
        break;
      case 'Escape':
        if (isGenerating) cancel();
        else selectTile(null);
        break;
      case 'ArrowUp':
        panBy(0, -PAN_STEP);
        break;
      // ... etc
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isGenerating, generate, cancel, panBy]);

// Announce generation status
<div role="status" aria-live="polite" className="sr-only">
  {isGenerating
    ? `Generating map: ${progress?.percent}% complete`
    : timing
      ? `Map generated in ${timing.total}ms`
      : ''}
</div>

// Layer toggle with accessibility
<button
  role="switch"
  aria-checked={isActive}
  aria-label={`${layer.name} layer: ${isActive ? 'visible' : 'hidden'}`}
  onClick={() => toggleLayer(layer.id)}
>
  <span className="sr-only">{layer.name}</span>
  <CheckIcon aria-hidden={!isActive} />
</button>
```

---

## 14. Design Decisions

### 14.1 Resolved Questions

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Map sizes > 300×240?** | Yes, support up to 400×250 | deck.gl handles 100k hexes at 60fps. Memory budget allows ~200MB peak. User can choose smaller if their hardware struggles. |
| **Persist configs to localStorage?** | Yes, v1 feature | Essential UX - users expect their settings to persist. Implementation is trivial (<20 lines). |
| **Default preset?** | "Balanced" (128×80, seed=random) | Most common use case. Generates fast, shows all layer types. |
| **Layer toggle behavior?** | Radio groups per domain + global multi-select | Most users want one layer per domain visible. Power users can Shift+click for multi. |
| **URL encoding for sharing?** | Base64 of JSON config | Compact, doesn't break on special characters, easily decoded. |

### 14.2 Deferred to v2

| Feature | Why Deferred | Prerequisites |
|---------|--------------|---------------|
| Side-by-side seed comparison | Requires dual viewport architecture | v1 viewport stable |
| Export to PNG/SVG | Needs canvas rendering for quality | v1 rendering complete |
| GitHub config storage | OAuth complexity, scope creep | v1 deployed, user feedback |
| Animated era progression | Requires pipeline changes for snapshots | Foundation refactor landed |
| Mobile support | Touch interactions, responsive layout | v1 desktop stable |

### 14.3 Open Questions (Awaiting User Feedback)

| Question | Options | Leaning Toward |
|----------|---------|----------------|
| Color scheme for UI? | Dark (dev tool vibe) vs Light (doc-like) | Dark - easier on eyes for extended use |
| Show hex grid lines? | Always / Zoom-dependent / Toggle | Zoom-dependent (show at zoom > 2x) |
| Inspector position? | Right panel / Bottom panel / Floating | Right panel - consistent with dev tools |

---

## 15. Related Documents

### 15.1 Research (in this project)

- `research/layer-visualization-system.md` — Original visualization system design
- `research/offline-generation-and-visualization.md` — Offline generation feasibility
- `research/browser-pipeline-feasibility.md` — Browser compatibility analysis

### 15.2 External Dependencies

- `docs/projects/engine-refactor-v1/` — Pipeline architecture and config schemas
- `packages/mapgen-core/` — Core pipeline implementation
- `mods/mod-swooper-maps/` — Standard recipe and domain operations

---

## 16. Glossary

| Term | Definition |
|------|------------|
| **Artifact** | Named output from a pipeline step (e.g., `artifact:morphology.topography`) |
| **deck.gl** | Uber's WebGL visualization framework for large datasets |
| **MockAdapter** | Test implementation of EngineAdapter with no Civ7 dependencies |
| **Recipe** | Configuration of pipeline stages and steps |
| **TypeBox** | TypeScript-first JSON Schema builder used for config validation |
| **Web Worker** | Browser API for running JavaScript in a background thread |

---

*Document version: 1.0*
*Created: 2026-01-23*
*Last updated: 2026-01-23*
