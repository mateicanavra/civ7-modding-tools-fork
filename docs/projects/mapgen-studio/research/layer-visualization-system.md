# Layer Visualization System

## A D3-Based Post-Generation Map Inspection Tool

---

# Part I: Requirements and Current State

## Chapter 1: What We Need

### 1.1 The Goal

Build a system that allows authors to visually inspect any layer of the map generation pipeline after generation completes. This enables:

- **Debugging** — Why did this tile get this biome?
- **Tuning** — How does changing this parameter affect the rainfall distribution?
- **Understanding** — How does data flow through the pipeline?
- **Validation** — Does the output match physical intuition?

### 1.2 Key Requirements

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ REQUIREMENT                        RATIONALE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Post-generation, not live          • No performance impact on generation    │
│                                    • Can inspect same data multiple ways    │
│                                    • Works with existing trace architecture │
├─────────────────────────────────────────────────────────────────────────────┤
│ Works with trace/dump output       • Leverage existing infrastructure       │
│                                    • No coupling to generation runtime      │
│                                    • Enable CI/automated capture            │
├─────────────────────────────────────────────────────────────────────────────┤
│ D3-based rendering                 • Mature, flexible visualization lib     │
│                                    • Hex grid support via d3-hexbin         │
│                                    • Vector/arrow rendering                 │
│                                    • Interactive (zoom, pan, tooltips)      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Multi-layer support                • Toggle layers on/off                   │
│                                    • Compare across pipeline stages         │
│                                    • Overlay complementary data             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Supports all data types            • Scalar heatmaps (temperature)          │
│                                    • Categorical maps (biomes)              │
│                                    • Vector fields (wind)                   │
│                                    • Point features (volcanoes)             │
│                                    • Mesh visualizations (plate cells)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Current Infrastructure Assessment

```
WHAT EXISTS                          WHAT'S MISSING
─────────────                        ──────────────

✓ TraceEvent structure               ✗ File sink for trace events
✓ TraceSink interface (pluggable)    ✗ Buffer serialization format
✓ Per-step trace control             ✗ Layer dump primitives
✓ Deterministic run fingerprints     ✗ Metadata schema for arrays
✓ ASCII rendering utilities          ✗ D3 viewer application
✓ Histogram/summary diagnostics      ✗ Binary dump format for large arrays
```

### 1.4 Data Volume Considerations

```
TYPICAL MAP SIZE: 300 × 240 = 72,000 tiles

Per-layer sizes:
┌───────────────────────┬─────────────┬───────────────┐
│ Data Type             │ Per Element │ Per Layer     │
├───────────────────────┼─────────────┼───────────────┤
│ Uint8Array            │ 1 byte      │ 72 KB         │
│ Int16Array            │ 2 bytes     │ 144 KB        │
│ Float32Array          │ 4 bytes     │ 288 KB        │
│ Vector field (2×Int8) │ 2 bytes     │ 144 KB        │
└───────────────────────┴─────────────┴───────────────┘

Full pipeline dump (all layers): ~3-5 MB uncompressed
                                 ~500 KB - 1 MB gzipped

Foundation mesh: ~2,000 cells × ~20 bytes = 40 KB
```

---

## Chapter 2: Visualization Types Needed

### 2.1 Scalar Heatmaps

For continuous numeric data like temperature, elevation, rainfall.

```
SCALAR HEATMAP EXAMPLE: Surface Temperature

    ┌────────────────────────────────────────────────┐
    │░░░░░░░▒▒▒▒▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒░░░░░░│  Poles: cold
    │░░░░░▒▒▒▒▒▓▓▓▓▓▓████████████▓▓▓▓▒▒▒▒░░░░│
    │░░░▒▒▒▓▓▓▓████████████████████████▓▓▓▒▒░░│
    │░▒▒▓▓████████████████████████████████▓▓▒▒│  Equator: hot
    │░▒▒▓▓████████████████████████████████▓▓▒▒│
    │░░░▒▒▒▓▓▓▓████████████████████████▓▓▓▒▒░░│
    │░░░░░▒▒▒▒▒▓▓▓▓▓▓████████████▓▓▓▓▒▒▒▒░░░░│
    │░░░░░░░▒▒▒▒▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒░░░░░░│  Poles: cold
    └────────────────────────────────────────────────┘

    Color scale: ░ cold (-20°C) ──────────────────▶ █ hot (+40°C)

    D3 implementation:
    • d3.scaleSequential with interpolateRdYlBu (reversed)
    • Hex grid rendering with fill color from scale
    • Tooltip shows exact value on hover
```

**Layers using this type:**
- `surfaceTemperatureC` (hydrology)
- `elevation` (morphology)
- `rainfall` (hydrology)
- `humidity` (hydrology)
- `vegetationDensity` (ecology)
- `maturity` (foundation, proposed)
- `tectonicWork` (foundation, proposed)

### 2.2 Categorical Maps

For discrete classifications like biomes, crust type, plate ID.

```
CATEGORICAL MAP EXAMPLE: Biome Classification

    ┌────────────────────────────────────────────────┐
    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  snow/tundra
    │▓▓▓▓████████████████████████████████▓▓▓▓│  boreal
    │████░░░░░░░░████████████░░░░░░░░████████│  temperate
    │████░░░░░░░░████████████░░░░░░░░████████│
    │████▒▒▒▒▒▒▒▒████░░░░████▒▒▒▒▒▒▒▒████████│  tropical
    │████▒▒▒▒▒▒▒▒████░░░░████▒▒▒▒▒▒▒▒████████│
    │████████████████████████████████████████│  desert
    │▓▓▓▓████████████████████████████████▓▓▓▓│
    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  snow/tundra
    └────────────────────────────────────────────────┘

    Legend:
    ▓ snow/tundra   █ boreal/temperate   ░ tropical   ▒ desert

    D3 implementation:
    • d3.scaleOrdinal with curated color palette
    • Each category gets distinct, visually separable color
    • Legend shows category names
```

**Layers using this type:**
- `biomeIndex` (ecology)
- `crustType` (foundation)
- `plateId` (foundation)
- `riverClass` (hydrology)
- `terrainHint` (foundation, proposed)
- `lastBoundaryEvent` (foundation, proposed)

### 2.3 Vector Fields

For directional data like wind, ocean currents, flow direction.

```
VECTOR FIELD EXAMPLE: Wind Circulation

    ┌────────────────────────────────────────────────┐
    │ ←  ←  ←  ←  ←  ←  ←  ←  ←  ←  ←  ←  │  Polar easterlies
    │   ↖  ↖  ↖  ↖  ↖  ↖  ↖  ↖  ↖  ↖     │
    │ →  →  →  →  →  →  →  →  →  →  →  →  │  Westerlies
    │   ↗  ↗  ↗  ↗  ↗  ↗  ↗  ↗  ↗  ↗     │
    │ ←  ←  ←  ←  ←  ←  ←  ←  ←  ←  ←  ←  │  Trade winds
    │   ↙  ↙  ↙  ↙  ↙  ↙  ↙  ↙  ↙  ↙     │
    │ →  →  →  →  →  →  →  →  →  →  →  →  │  Trade winds
    │   ↘  ↘  ↘  ↘  ↘  ↘  ↘  ↘  ↘  ↘     │
    │ ←  ←  ←  ←  ←  ←  ←  ←  ←  ←  ←  ←  │  Polar easterlies
    └────────────────────────────────────────────────┘

    D3 implementation:
    • Arrow markers at grid points
    • Arrow length ∝ magnitude
    • Arrow rotation = direction
    • Subsample for clarity (every Nth tile)
```

**Layers using this type:**
- `windU`, `windV` (hydrology)
- `currentU`, `currentV` (hydrology)
- `movementU`, `movementV` (foundation — plate velocity)
- `flowDir` (morphology — could show as arrows)

### 2.4 Binary Masks

For boolean or presence/absence data.

```
BINARY MASK EXAMPLE: Land Mask

    ┌────────────────────────────────────────────────┐
    │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░░░████████████░░░░░░░░████░░░░░░░░░░░░░░│
    │░░░░░░████████████████░░░░████████░░░░░░░░░░░░│  █ = land
    │░░░░░░██████████████████████████████░░░░░░░░░░│  ░ = water
    │░░░░░░░░████████████████████████░░░░░░░░░░░░░░│
    │░░░░░░░░░░████████████████░░░░░░░░░░░░░░░░░░░░│
    │░░░░░░░░░░░░░░██████░░░░░░░░░░░░░░░░░░░░░░░░░░│
    └────────────────────────────────────────────────┘

    D3 implementation:
    • Two-color scale (transparent/solid or two distinct colors)
    • Often used as overlay on other layers
```

**Layers using this type:**
- `landMask` (morphology)
- `eraMask.activated` (foundation, proposed)
- Feature presence masks

### 2.5 Point Features

For discrete placements like volcanoes, wonders, cities.

```
POINT FEATURES EXAMPLE: Volcano Placements

    ┌────────────────────────────────────────────────┐
    │                                                │
    │         ▲                                      │
    │        ▲▲▲                           ▲        │
    │         ▲                           ▲▲        │  ▲ = volcano
    │                                      ▲        │
    │                     ▲                         │
    │                    ▲▲                         │
    │                                               │
    │                              ▲                │
    └────────────────────────────────────────────────┘

    D3 implementation:
    • SVG symbols at point locations
    • Different symbols for different feature types
    • Optional labels
    • Click to inspect feature metadata
```

**Layers using this type:**
- Volcano placements (morphology)
- Wonder placements (placement)
- Start positions (placement)
- Feature placements (ecology)

### 2.6 Mesh/Graph Visualization

For the foundation mesh structure and plate boundaries.

```
MESH VISUALIZATION EXAMPLE: Plate Boundaries

    ┌────────────────────────────────────────────────┐
    │   ╱╲     ╱╲     ╱╲     ╱╲     ╱╲              │
    │  ╱  ╲   ╱  ╲   ╱  ╲   ╱  ╲   ╱  ╲             │
    │ ╱ A  ╲ ╱ A  ╲ ║ B  ╲ ╱ B  ╲ ╱ B  ╲            │  A, B = plate IDs
    │ ╲    ╱ ╲    ╱ ║    ╱ ╲    ╱ ╲    ╱            │  ║ = convergent
    │  ╲  ╱   ╲  ╱  ║   ╱   ╲  ╱   ╲  ╱             │  ┊ = divergent
    │   ╲╱     ╲╱   ║  ╱     ╲╱     ╲╱              │  ═ = transform
    │   ╱╲     ╱╲   ║ ╱╲     ╱╲     ╱╲              │
    │  ╱  ╲   ╱  ╲  ╱  ╲   ╱  ╲   ╱  ╲             │
    │ ╱ A  ╲ ╱ A  ╲╱ C  ╲ ╱ C  ╲ ╱ C  ╲            │
    └────────────────────────────────────────────────┘

    D3 implementation:
    • Voronoi polygons for cells
    • Cell fill color = plate ID or crustal property
    • Boundary edges highlighted by type
    • Velocity arrows at cell centers
```

**Layers using this type:**
- Foundation mesh structure
- Plate boundaries with regime
- Crustal maturity per cell
- Tectonic segments

---

# Part II: System Architecture

## Chapter 3: The Dump Format

### 3.1 Design Principles

The dump format must:
1. Be self-describing (include metadata)
2. Support efficient binary data (TypedArrays)
3. Be streamable/appendable (for incremental dumps)
4. Be consumable by browser JavaScript (D3)

### 3.2 Proposed Format: JSONL + Binary Blobs

```
DUMP FILE STRUCTURE

    map-dump-{runId}/
    ├── manifest.json           # Run metadata + layer index
    ├── layers.jsonl            # Layer metadata (one JSON object per line)
    └── data/
        ├── foundation.mesh.siteX.f32          # Raw Float32Array
        ├── foundation.mesh.siteY.f32          # Raw Float32Array
        ├── foundation.plates.cellToPlate.i16  # Raw Int16Array
        ├── morphology.elevation.i16           # Raw Int16Array
        ├── morphology.landMask.u8             # Raw Uint8Array
        ├── hydrology.temperature.f32          # Raw Float32Array
        ├── hydrology.windU.i8                 # Raw Int8Array
        ├── hydrology.windV.i8                 # Raw Int8Array
        ├── ecology.biomeIndex.u8              # Raw Uint8Array
        └── ...
```

### 3.3 Manifest Schema

```typescript
interface DumpManifest {
  version: "1.0";
  runId: string;                    // From trace session
  planFingerprint: string;          // Recipe + config hash
  timestamp: string;                // ISO 8601
  mapDimensions: {
    width: number;                  // Tile columns
    height: number;                 // Tile rows
    tileCount: number;              // width × height
  };
  meshDimensions?: {
    cellCount: number;              // Foundation mesh cells
    wrapWidth: number;              // Cylindrical wrap
  };
  layers: LayerDescriptor[];        // Index of all dumped layers
}
```

### 3.4 Layer Descriptor Schema

```typescript
interface LayerDescriptor {
  // Identity
  id: string;                       // e.g., "hydrology.temperature"
  domain: string;                   // "foundation" | "morphology" | "hydrology" | "ecology" | "placement"
  operation: string;                // e.g., "compute-thermal-state"
  name: string;                     // Human-readable: "Surface Temperature"

  // Data shape
  shape: "per-tile" | "per-cell" | "scalar" | "array";
  dtype: "f32" | "i32" | "i16" | "i8" | "u8" | "u16" | "u32";
  count: number;                    // Number of elements

  // Visualization hints
  vizType: "scalar" | "categorical" | "vector" | "mask" | "points" | "mesh";

  // For scalar visualization
  valueRange?: {
    min: number;
    max: number;
    unit?: string;                  // "°C", "mm", "m", etc.
  };
  colorScale?: string;              // D3 interpolator name or "custom"
  customColors?: string[];          // For categorical

  // For categorical visualization
  categories?: {
    value: number;
    label: string;
    color?: string;
  }[];

  // For vector visualization
  vectorPair?: string;              // ID of paired component (e.g., "hydrology.windV")

  // File reference
  dataFile: string;                 // Relative path to binary file
  byteOffset?: number;              // If concatenated into single file
  byteLength: number;               // Size in bytes
}
```

### 3.5 Example Layer Descriptors

```json
[
  {
    "id": "hydrology.temperature",
    "domain": "hydrology",
    "operation": "compute-thermal-state",
    "name": "Surface Temperature",
    "shape": "per-tile",
    "dtype": "f32",
    "count": 72000,
    "vizType": "scalar",
    "valueRange": { "min": -40, "max": 50, "unit": "°C" },
    "colorScale": "interpolateRdYlBu",
    "dataFile": "data/hydrology.temperature.f32",
    "byteLength": 288000
  },
  {
    "id": "ecology.biomeIndex",
    "domain": "ecology",
    "operation": "classify-biomes",
    "name": "Biome Classification",
    "shape": "per-tile",
    "dtype": "u8",
    "count": 72000,
    "vizType": "categorical",
    "categories": [
      { "value": 0, "label": "Snow", "color": "#FFFFFF" },
      { "value": 1, "label": "Tundra", "color": "#A0C4A0" },
      { "value": 2, "label": "Boreal", "color": "#2D5A27" },
      { "value": 3, "label": "Temperate Dry", "color": "#8B9A46" },
      { "value": 4, "label": "Temperate Humid", "color": "#228B22" },
      { "value": 5, "label": "Tropical Seasonal", "color": "#90EE90" },
      { "value": 6, "label": "Tropical Rainforest", "color": "#006400" },
      { "value": 7, "label": "Desert", "color": "#EDC9AF" }
    ],
    "dataFile": "data/ecology.biomeIndex.u8",
    "byteLength": 72000
  },
  {
    "id": "hydrology.windU",
    "domain": "hydrology",
    "operation": "compute-atmospheric-circulation",
    "name": "Wind U Component",
    "shape": "per-tile",
    "dtype": "i8",
    "count": 72000,
    "vizType": "vector",
    "vectorPair": "hydrology.windV",
    "valueRange": { "min": -127, "max": 127 },
    "dataFile": "data/hydrology.windU.i8",
    "byteLength": 72000
  }
]
```

---

## Chapter 4: The Dump Sink

### 4.1 New Primitive: LayerDump

The trace system emits events. We need a new primitive for emitting layer data.

```typescript
// New interface for layer dumping
interface LayerDumpSink {
  /**
   * Emit layer data for visualization.
   * Called by ops when they want to expose intermediate results.
   */
  emitLayer(descriptor: Omit<LayerDescriptor, 'dataFile' | 'byteLength'>, data: TypedArray): void;

  /**
   * Emit point features for visualization.
   */
  emitPoints(id: string, domain: string, name: string, points: Array<{x: number, y: number, [key: string]: unknown}>): void;

  /**
   * Finalize and write manifest.
   */
  finalize(): Promise<void>;
}

// Integration with existing trace context
interface TraceScope {
  level: TraceLevel;
  isEnabled: boolean;
  isVerbose: boolean;
  event(data?: unknown | (() => unknown)): void;

  // NEW: Layer dumping
  dump?: LayerDumpSink;
}
```

### 4.2 File-Based Dump Sink Implementation

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

class FileDumpSink implements LayerDumpSink {
  private outputDir: string;
  private manifest: DumpManifest;
  private layers: LayerDescriptor[] = [];

  constructor(
    outputDir: string,
    runId: string,
    planFingerprint: string,
    mapDimensions: { width: number; height: number },
    meshDimensions?: { cellCount: number; wrapWidth: number }
  ) {
    this.outputDir = outputDir;
    this.manifest = {
      version: "1.0",
      runId,
      planFingerprint,
      timestamp: new Date().toISOString(),
      mapDimensions: {
        ...mapDimensions,
        tileCount: mapDimensions.width * mapDimensions.height,
      },
      meshDimensions,
      layers: [],
    };
  }

  async emitLayer(
    descriptor: Omit<LayerDescriptor, 'dataFile' | 'byteLength'>,
    data: TypedArray
  ): Promise<void> {
    // Determine file extension from dtype
    const ext = this.dtypeToExtension(descriptor.dtype);
    const filename = `${descriptor.id}.${ext}`;
    const dataDir = path.join(this.outputDir, 'data');

    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });

    // Write binary data
    const filePath = path.join(dataDir, filename);
    await fs.writeFile(filePath, Buffer.from(data.buffer, data.byteOffset, data.byteLength));

    // Record layer descriptor
    const fullDescriptor: LayerDescriptor = {
      ...descriptor,
      dataFile: `data/${filename}`,
      byteLength: data.byteLength,
    };
    this.layers.push(fullDescriptor);
  }

  async emitPoints(
    id: string,
    domain: string,
    name: string,
    points: Array<{x: number, y: number, [key: string]: unknown}>
  ): Promise<void> {
    const filename = `${id}.json`;
    const dataDir = path.join(this.outputDir, 'data');

    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(
      path.join(dataDir, filename),
      JSON.stringify(points)
    );

    this.layers.push({
      id,
      domain,
      operation: 'points',
      name,
      shape: 'array',
      dtype: 'f32',  // Not really applicable
      count: points.length,
      vizType: 'points',
      dataFile: `data/${filename}`,
      byteLength: 0,  // JSON file
    });
  }

  async finalize(): Promise<void> {
    this.manifest.layers = this.layers;

    // Write manifest
    await fs.writeFile(
      path.join(this.outputDir, 'manifest.json'),
      JSON.stringify(this.manifest, null, 2)
    );

    // Write JSONL for streaming access
    const jsonlLines = this.layers.map(l => JSON.stringify(l)).join('\n');
    await fs.writeFile(
      path.join(this.outputDir, 'layers.jsonl'),
      jsonlLines
    );
  }

  private dtypeToExtension(dtype: string): string {
    const map: Record<string, string> = {
      'f32': 'f32', 'f64': 'f64',
      'i8': 'i8', 'i16': 'i16', 'i32': 'i32',
      'u8': 'u8', 'u16': 'u16', 'u32': 'u32',
    };
    return map[dtype] || 'bin';
  }
}
```

### 4.3 Usage in Ops

```typescript
// Example: In compute-thermal-state op
function apply(context: AuthoringContext, inputs: Inputs): Outputs {
  const { trace } = context;

  // ... compute temperature ...
  const surfaceTemperatureC = new Float32Array(tileCount);
  // ... fill array ...

  // Dump for visualization
  trace.dump?.emitLayer({
    id: 'hydrology.temperature',
    domain: 'hydrology',
    operation: 'compute-thermal-state',
    name: 'Surface Temperature',
    shape: 'per-tile',
    dtype: 'f32',
    count: tileCount,
    vizType: 'scalar',
    valueRange: { min: -40, max: 50, unit: '°C' },
    colorScale: 'interpolateRdYlBu',
  }, surfaceTemperatureC);

  return { surfaceTemperatureC };
}
```

### 4.4 Helper Functions for Common Patterns

```typescript
// Convenience wrappers for common dump patterns

const dumpScalar = (
  dump: LayerDumpSink | undefined,
  id: string,
  domain: string,
  name: string,
  data: Float32Array,
  options: { min: number; max: number; unit?: string; colorScale?: string }
) => {
  dump?.emitLayer({
    id, domain, operation: id.split('.').pop()!, name,
    shape: 'per-tile', dtype: 'f32', count: data.length,
    vizType: 'scalar',
    valueRange: { min: options.min, max: options.max, unit: options.unit },
    colorScale: options.colorScale || 'interpolateViridis',
  }, data);
};

const dumpCategorical = (
  dump: LayerDumpSink | undefined,
  id: string,
  domain: string,
  name: string,
  data: Uint8Array,
  categories: Array<{ value: number; label: string; color: string }>
) => {
  dump?.emitLayer({
    id, domain, operation: id.split('.').pop()!, name,
    shape: 'per-tile', dtype: 'u8', count: data.length,
    vizType: 'categorical',
    categories,
  }, data);
};

const dumpVector = (
  dump: LayerDumpSink | undefined,
  idU: string,
  idV: string,
  domain: string,
  nameU: string,
  nameV: string,
  dataU: Int8Array,
  dataV: Int8Array
) => {
  dump?.emitLayer({
    id: idU, domain, operation: idU.split('.').pop()!, name: nameU,
    shape: 'per-tile', dtype: 'i8', count: dataU.length,
    vizType: 'vector', vectorPair: idV,
    valueRange: { min: -127, max: 127 },
  }, dataU);

  dump?.emitLayer({
    id: idV, domain, operation: idV.split('.').pop()!, name: nameV,
    shape: 'per-tile', dtype: 'i8', count: dataV.length,
    vizType: 'vector', vectorPair: idU,
    valueRange: { min: -127, max: 127 },
  }, dataV);
};

const dumpMask = (
  dump: LayerDumpSink | undefined,
  id: string,
  domain: string,
  name: string,
  data: Uint8Array
) => {
  dump?.emitLayer({
    id, domain, operation: id.split('.').pop()!, name,
    shape: 'per-tile', dtype: 'u8', count: data.length,
    vizType: 'mask',
    categories: [
      { value: 0, label: 'Off', color: 'transparent' },
      { value: 1, label: 'On', color: '#FF6600' },
    ],
  }, data);
};
```

---

## Chapter 5: The D3 Viewer Application

### 5.1 Application Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           D3 LAYER VIEWER                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ HEADER                                                               │   │
│  │ ┌───────────────┐ ┌───────────────┐ ┌─────────────────────────────┐ │   │
│  │ │ Load Dump...  │ │ Run: abc123   │ │ Map: 300×240 (72,000 tiles) │ │   │
│  │ └───────────────┘ └───────────────┘ └─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────┐ ┌────────────────────────────────────────────────────┐   │
│  │ LAYER PANEL  │ │ MAP VIEWPORT                                        │   │
│  │              │ │                                                      │   │
│  │ □ Foundation │ │    ┌────────────────────────────────────────────┐  │   │
│  │   ☑ plateId  │ │    │                                            │  │   │
│  │   □ maturity │ │    │                                            │  │   │
│  │   □ boundary │ │    │            [D3 SVG CANVAS]                 │  │   │
│  │              │ │    │                                            │  │   │
│  │ □ Morphology │ │    │         Rendered map layers                │  │   │
│  │   ☑ elevation│ │    │                                            │  │   │
│  │   ☑ landMask │ │    │                                            │  │   │
│  │   □ flowDir  │ │    │                                            │  │   │
│  │              │ │    └────────────────────────────────────────────┘  │   │
│  │ □ Hydrology  │ │                                                      │   │
│  │   □ temp     │ │  ┌─────────────────────────────────────────────────┐│   │
│  │   □ rainfall │ │  │ LEGEND                                          ││   │
│  │   □ wind →   │ │  │ ████████████████████████                        ││   │
│  │              │ │  │ -40°C            0            +50°C              ││   │
│  │ □ Ecology    │ │  └─────────────────────────────────────────────────┘│   │
│  │   ☑ biome    │ │                                                      │   │
│  │   □ vegetation│ │                                                      │   │
│  │              │ │                                                      │   │
│  │ □ Placement  │ │                                                      │   │
│  │   □ starts   │ │                                                      │   │
│  │   □ wonders  │ │                                                      │   │
│  └──────────────┘ └────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ INSPECTOR                                                            │   │
│  │ Tile (142, 87)                                                       │   │
│  │ ├─ plateId: 7                                                        │   │
│  │ ├─ elevation: 1,234 m                                                │   │
│  │ ├─ temperature: 18.3 °C                                              │   │
│  │ ├─ biome: Temperate Humid                                            │   │
│  │ └─ rainfall: 127 mm                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Core Components

```typescript
// Main application structure

interface ViewerState {
  manifest: DumpManifest | null;
  loadedLayers: Map<string, LoadedLayer>;
  activeLayers: Set<string>;         // Which layers are visible
  viewport: {
    x: number;                        // Pan offset
    y: number;
    zoom: number;                     // 1.0 = 100%
  };
  inspectedTile: { x: number; y: number } | null;
}

interface LoadedLayer {
  descriptor: LayerDescriptor;
  data: TypedArray | object[];        // Binary data or point array
}

// React component structure (or vanilla JS equivalent)
const App = () => {
  const [state, dispatch] = useReducer(viewerReducer, initialState);

  return (
    <div className="viewer">
      <Header manifest={state.manifest} onLoad={handleLoad} />
      <div className="main">
        <LayerPanel
          manifest={state.manifest}
          activeLayers={state.activeLayers}
          onToggle={handleToggleLayer}
        />
        <MapViewport
          manifest={state.manifest}
          loadedLayers={state.loadedLayers}
          activeLayers={state.activeLayers}
          viewport={state.viewport}
          onPan={handlePan}
          onZoom={handleZoom}
          onTileClick={handleTileClick}
        />
      </div>
      <Inspector
        tile={state.inspectedTile}
        loadedLayers={state.loadedLayers}
      />
    </div>
  );
};
```

### 5.3 D3 Rendering Pipeline

```typescript
// Core rendering logic

class MapRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private layerGroups: Map<string, d3.Selection<SVGGElement, unknown, null, undefined>>;
  private hexSize: number;

  constructor(container: HTMLElement, width: number, height: number) {
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    this.layerGroups = new Map();
    this.hexSize = 6;  // Pixels per hex
  }

  // Render a scalar heatmap layer
  renderScalarLayer(
    layer: LoadedLayer,
    mapWidth: number,
    mapHeight: number
  ): void {
    const { descriptor, data } = layer;
    const group = this.getOrCreateGroup(descriptor.id);

    // Create color scale
    const colorScale = d3.scaleSequential()
      .domain([descriptor.valueRange!.min, descriptor.valueRange!.max])
      .interpolator(d3[descriptor.colorScale!] || d3.interpolateViridis);

    // Generate hex positions
    const hexes = this.generateHexPositions(mapWidth, mapHeight);

    // Bind data and render
    group.selectAll('path')
      .data(hexes)
      .join('path')
      .attr('d', this.hexPath())
      .attr('transform', (d, i) => `translate(${d.x}, ${d.y})`)
      .attr('fill', (d, i) => {
        const value = (data as Float32Array)[i];
        return colorScale(value);
      })
      .attr('stroke', 'none');
  }

  // Render a categorical layer
  renderCategoricalLayer(
    layer: LoadedLayer,
    mapWidth: number,
    mapHeight: number
  ): void {
    const { descriptor, data } = layer;
    const group = this.getOrCreateGroup(descriptor.id);

    // Create ordinal color scale
    const colorScale = d3.scaleOrdinal<number, string>()
      .domain(descriptor.categories!.map(c => c.value))
      .range(descriptor.categories!.map(c => c.color!));

    const hexes = this.generateHexPositions(mapWidth, mapHeight);

    group.selectAll('path')
      .data(hexes)
      .join('path')
      .attr('d', this.hexPath())
      .attr('transform', (d, i) => `translate(${d.x}, ${d.y})`)
      .attr('fill', (d, i) => {
        const value = (data as Uint8Array)[i];
        return colorScale(value);
      })
      .attr('stroke', 'none');
  }

  // Render a vector field layer
  renderVectorLayer(
    layerU: LoadedLayer,
    layerV: LoadedLayer,
    mapWidth: number,
    mapHeight: number,
    subsample: number = 8  // Show every Nth vector
  ): void {
    const group = this.getOrCreateGroup(layerU.descriptor.id + '.vectors');
    const dataU = layerU.data as Int8Array;
    const dataV = layerV.data as Int8Array;

    const arrows: Array<{ x: number; y: number; u: number; v: number }> = [];

    for (let y = 0; y < mapHeight; y += subsample) {
      for (let x = 0; x < mapWidth; x += subsample) {
        const i = y * mapWidth + x;
        const pos = this.hexToPixel(x, y);
        arrows.push({
          x: pos.x,
          y: pos.y,
          u: dataU[i],
          v: dataV[i],
        });
      }
    }

    // Render arrows
    const maxMag = 127;
    const arrowScale = this.hexSize * subsample * 0.4;

    group.selectAll('line')
      .data(arrows)
      .join('line')
      .attr('x1', d => d.x)
      .attr('y1', d => d.y)
      .attr('x2', d => d.x + (d.u / maxMag) * arrowScale)
      .attr('y2', d => d.y + (d.v / maxMag) * arrowScale)
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
      .attr('marker-end', 'url(#arrowhead)');
  }

  // Render point features
  renderPointsLayer(layer: LoadedLayer): void {
    const { descriptor, data } = layer;
    const group = this.getOrCreateGroup(descriptor.id);
    const points = data as Array<{ x: number; y: number; [key: string]: unknown }>;

    group.selectAll('circle')
      .data(points)
      .join('circle')
      .attr('cx', d => this.hexToPixel(d.x, d.y).x)
      .attr('cy', d => this.hexToPixel(d.x, d.y).y)
      .attr('r', this.hexSize * 0.8)
      .attr('fill', '#FF4444')
      .attr('stroke', '#000')
      .attr('stroke-width', 1);
  }

  // Helper: generate hex grid positions
  private generateHexPositions(width: number, height: number) {
    const positions: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        positions.push(this.hexToPixel(x, y));
      }
    }
    return positions;
  }

  // Helper: convert hex coords to pixel coords (pointy-top hexes)
  private hexToPixel(col: number, row: number): { x: number; y: number } {
    const size = this.hexSize;
    const x = size * Math.sqrt(3) * (col + 0.5 * (row & 1));
    const y = size * 1.5 * row;
    return { x, y };
  }

  // Helper: hex path generator
  private hexPath(): string {
    const size = this.hexSize;
    const angles = [0, 60, 120, 180, 240, 300].map(a => a * Math.PI / 180);
    const points = angles.map(a => `${size * Math.cos(a)},${size * Math.sin(a)}`);
    return `M${points.join('L')}Z`;
  }

  private getOrCreateGroup(id: string) {
    if (!this.layerGroups.has(id)) {
      const group = this.svg.append('g').attr('class', `layer-${id}`);
      this.layerGroups.set(id, group);
    }
    return this.layerGroups.get(id)!;
  }
}
```

### 5.4 Data Loading

```typescript
// Binary data loader

class DumpLoader {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async loadManifest(): Promise<DumpManifest> {
    const response = await fetch(`${this.baseUrl}/manifest.json`);
    return response.json();
  }

  async loadLayer(descriptor: LayerDescriptor): Promise<TypedArray | object[]> {
    const url = `${this.baseUrl}/${descriptor.dataFile}`;

    // Points are JSON
    if (descriptor.vizType === 'points') {
      const response = await fetch(url);
      return response.json();
    }

    // Binary data
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    switch (descriptor.dtype) {
      case 'f32': return new Float32Array(buffer);
      case 'f64': return new Float64Array(buffer);
      case 'i32': return new Int32Array(buffer);
      case 'i16': return new Int16Array(buffer);
      case 'i8': return new Int8Array(buffer);
      case 'u32': return new Uint32Array(buffer);
      case 'u16': return new Uint16Array(buffer);
      case 'u8': return new Uint8Array(buffer);
      default: throw new Error(`Unknown dtype: ${descriptor.dtype}`);
    }
  }

  // Load multiple layers in parallel
  async loadLayers(descriptors: LayerDescriptor[]): Promise<Map<string, LoadedLayer>> {
    const results = await Promise.all(
      descriptors.map(async (d) => ({
        descriptor: d,
        data: await this.loadLayer(d),
      }))
    );

    return new Map(results.map(r => [r.descriptor.id, r]));
  }
}
```

---

# Part III: Implementation Plan

## Chapter 6: What Needs to Be Built

### 6.1 Component Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ COMPONENT                  EFFORT    DEPENDENCIES    PRIORITY               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. LayerDumpSink interface   S       Trace system    HIGH (foundation)      │
│ 2. FileDumpSink impl         M       #1              HIGH                   │
│ 3. Dump helper functions     S       #1              HIGH                   │
│ 4. Instrument foundation ops M       #1-3            MEDIUM                 │
│ 5. Instrument morphology ops M       #1-3            MEDIUM                 │
│ 6. Instrument hydrology ops  M       #1-3            MEDIUM                 │
│ 7. Instrument ecology ops    M       #1-3            MEDIUM                 │
│ 8. D3 viewer scaffolding     M       None            HIGH (parallel)        │
│ 9. Scalar heatmap renderer   S       #8              HIGH                   │
│ 10. Categorical renderer     S       #8              HIGH                   │
│ 11. Vector field renderer    M       #8              MEDIUM                 │
│ 12. Point feature renderer   S       #8              MEDIUM                 │
│ 13. Layer panel UI           M       #8              MEDIUM                 │
│ 14. Inspector panel UI       S       #8-12           LOW                    │
│ 15. Mesh visualizer (found.) L       #8              LOW (optional)         │
└─────────────────────────────────────────────────────────────────────────────┘

S = Small (< 1 day), M = Medium (1-3 days), L = Large (3-5 days)
```

### 6.2 Phased Delivery

```
PHASE 1: MINIMUM VIABLE DUMP (1 week)
─────────────────────────────────────

Goal: Be able to dump and view one layer

• LayerDumpSink interface
• FileDumpSink implementation (basic)
• Instrument ONE op (e.g., classify-biomes)
• Basic D3 viewer with categorical rendering
• Manual dump loading (file picker)

Deliverable: Can view biome map from dump file


PHASE 2: CORE LAYERS (2 weeks)
──────────────────────────────

Goal: Dump and view all key layers

• Instrument all foundation ops
• Instrument all morphology ops
• Instrument all hydrology ops
• Scalar heatmap renderer
• Vector field renderer
• Layer toggle panel

Deliverable: Full pipeline visualization


PHASE 3: POLISH (1 week)
────────────────────────

Goal: Production-quality tool

• Inspector panel (tile details)
• Legend rendering
• Zoom/pan controls
• Point feature renderer
• Export current view as image
• Keyboard shortcuts


PHASE 4: ADVANCED (optional)
────────────────────────────

Goal: Power-user features

• Mesh visualization for foundation
• Side-by-side comparison view
• Animation of era progression
• Layer arithmetic (diff two dumps)
• CLI dump generation
```

### 6.3 File Structure

```
packages/
├── mapgen-core/
│   └── src/
│       ├── trace/
│       │   ├── index.ts              # Existing trace system
│       │   └── dump.ts               # NEW: LayerDumpSink, helpers
│       └── dev/
│           └── ...                   # Existing dev utilities
│
├── mapgen-viewer/                    # NEW PACKAGE
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts                # Vite for dev server
│   ├── index.html
│   └── src/
│       ├── main.ts                   # Entry point
│       ├── state.ts                  # Viewer state management
│       ├── loader.ts                 # DumpLoader
│       ├── renderer/
│       │   ├── MapRenderer.ts        # D3 rendering orchestration
│       │   ├── ScalarRenderer.ts     # Heatmap rendering
│       │   ├── CategoricalRenderer.ts
│       │   ├── VectorRenderer.ts
│       │   ├── PointsRenderer.ts
│       │   └── MeshRenderer.ts       # For foundation cells
│       ├── components/
│       │   ├── Header.ts
│       │   ├── LayerPanel.ts
│       │   ├── Inspector.ts
│       │   └── Legend.ts
│       └── styles/
│           └── main.css
│
mods/
└── mod-swooper-maps/
    └── src/
        └── domain/
            └── */ops/*/apply.ts      # Add dump calls
```

---

## Chapter 7: Example: Full Instrumentation

### 7.1 Instrumenting classify-biomes

```typescript
// Before: No dump
function apply(context: AuthoringContext, inputs: Inputs): Outputs {
  const { temperature, rainfall, landMask } = inputs;
  const biomeIndex = new Uint8Array(tileCount);

  for (let i = 0; i < tileCount; i++) {
    if (!landMask[i]) {
      biomeIndex[i] = BIOME.OCEAN;
      continue;
    }
    biomeIndex[i] = classifyBiome(temperature[i], rainfall[i]);
  }

  return { biomeIndex };
}

// After: With dump instrumentation
function apply(context: AuthoringContext, inputs: Inputs): Outputs {
  const { temperature, rainfall, landMask } = inputs;
  const { trace } = context;
  const biomeIndex = new Uint8Array(tileCount);

  for (let i = 0; i < tileCount; i++) {
    if (!landMask[i]) {
      biomeIndex[i] = BIOME.OCEAN;
      continue;
    }
    biomeIndex[i] = classifyBiome(temperature[i], rainfall[i]);
  }

  // Dump for visualization
  dumpCategorical(trace.dump, 'ecology.biomeIndex', 'ecology', 'Biome Classification',
    biomeIndex, [
      { value: 0, label: 'Snow', color: '#FFFFFF' },
      { value: 1, label: 'Tundra', color: '#A0C4A0' },
      { value: 2, label: 'Boreal', color: '#2D5A27' },
      { value: 3, label: 'Temperate Dry', color: '#8B9A46' },
      { value: 4, label: 'Temperate Humid', color: '#228B22' },
      { value: 5, label: 'Tropical Seasonal', color: '#90EE90' },
      { value: 6, label: 'Tropical Rainforest', color: '#006400' },
      { value: 7, label: 'Desert', color: '#EDC9AF' },
    ]);

  return { biomeIndex };
}
```

### 7.2 Instrumenting Wind Vectors

```typescript
// In compute-atmospheric-circulation
function apply(context: AuthoringContext, inputs: Inputs): Outputs {
  const { trace } = context;

  // ... compute wind ...
  const windU = new Int8Array(tileCount);
  const windV = new Int8Array(tileCount);

  // ... fill arrays ...

  // Dump vector pair
  dumpVector(trace.dump,
    'hydrology.windU', 'hydrology.windV',
    'hydrology',
    'Wind U Component', 'Wind V Component',
    windU, windV
  );

  return { windU, windV };
}
```

### 7.3 Instrumenting Feature Placements

```typescript
// In plan-volcanoes
function apply(context: AuthoringContext, inputs: Inputs): Outputs {
  const { trace } = context;

  const volcanoes: Placement[] = [];
  // ... compute placements ...

  // Dump point features
  trace.dump?.emitPoints(
    'morphology.volcanoes',
    'morphology',
    'Volcano Placements',
    volcanoes.map(v => ({
      x: v.x,
      y: v.y,
      type: v.type,
      elevation: v.elevation,
    }))
  );

  return { volcanoPlacements: volcanoes };
}
```

---

# Appendix: Layer Catalog

## Recommended Layers to Instrument

### Foundation Domain

| Layer ID | Type | Description |
|----------|------|-------------|
| `foundation.mesh.cells` | mesh | Voronoi cell polygons |
| `foundation.plates.id` | categorical | Plate assignment per cell |
| `foundation.plates.velocity` | vector | Plate velocity per cell |
| `foundation.crust.type` | categorical | Oceanic vs continental |
| `foundation.crust.maturity` | scalar | 0-1 differentiation level |
| `foundation.crust.age` | scalar | Age in eras |
| `foundation.boundary.regime` | categorical | Convergent/divergent/transform |
| `foundation.boundary.intensity` | scalar | Boundary stress intensity |
| `foundation.era.{N}.activated` | mask | Cells active in era N |

### Morphology Domain

| Layer ID | Type | Description |
|----------|------|-------------|
| `morphology.elevation` | scalar | Elevation in meters |
| `morphology.landMask` | mask | Land vs water |
| `morphology.coastDistance` | scalar | Distance to coast |
| `morphology.flowDir` | vector | Drainage flow direction |
| `morphology.flowAccum` | scalar | Flow accumulation |
| `morphology.basinId` | categorical | Drainage basin ID |
| `morphology.ridges` | points | Ridge placements |
| `morphology.volcanoes` | points | Volcano placements |

### Hydrology Domain

| Layer ID | Type | Description |
|----------|------|-------------|
| `hydrology.temperature` | scalar | Surface temperature (°C) |
| `hydrology.insolation` | scalar | Solar radiation (0-1) |
| `hydrology.wind` | vector | Wind (U, V components) |
| `hydrology.pressure` | scalar | Atmospheric pressure |
| `hydrology.humidity` | scalar | Moisture content (0-255) |
| `hydrology.rainfall` | scalar | Precipitation (0-200) |
| `hydrology.evaporation` | scalar | Evaporation rate |
| `hydrology.currents` | vector | Ocean surface currents |
| `hydrology.snowLine` | scalar | Snow elevation threshold |
| `hydrology.discharge` | scalar | River discharge |
| `hydrology.riverClass` | categorical | River classification |

### Ecology Domain

| Layer ID | Type | Description |
|----------|------|-------------|
| `ecology.biomeIndex` | categorical | Biome classification |
| `ecology.vegetation` | scalar | Vegetation density (0-1) |
| `ecology.aridity` | scalar | Aridity index (0-1) |
| `ecology.moisture` | scalar | Effective moisture |
| `ecology.soilType` | categorical | Soil classification |
| `ecology.features.forest` | points | Forest placements |
| `ecology.features.marsh` | points | Marsh placements |
| `ecology.features.reef` | points | Reef placements |

### Placement Domain

| Layer ID | Type | Description |
|----------|------|-------------|
| `placement.starts` | points | Civilization start positions |
| `placement.wonders` | points | Natural wonder locations |
| `placement.floodplains` | points | Floodplain locations |

---

*Document version: 1.0*
*Last updated: 2026-01-23*
