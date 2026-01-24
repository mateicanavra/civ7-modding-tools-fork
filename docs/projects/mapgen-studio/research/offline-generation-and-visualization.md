# Offline Generation and Visualization Feasibility Analysis

## Executive Summary

**Both questions have positive answers:**

1. **Console-only dumps**: Yes, viable with base64 encoding or chunked JSON output
2. **Offline generation**: Yes, fully feasible — tests already run the complete pipeline with MockAdapter

The codebase has excellent architectural separation. The `EngineAdapter` interface cleanly isolates all engine dependencies, and a comprehensive `MockAdapter` already exists that enables full pipeline execution outside the game.

---

# Part I: Architecture Analysis

## Chapter 1: The Engine Boundary

### 1.1 Clean Separation

All engine interaction flows through a single interface:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PIPELINE ARCHITECTURE                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PURE JAVASCRIPT DOMAIN                            │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │ Foundation  │  │ Morphology  │  │  Hydrology  │  │  Ecology    │ │   │
│  │  │   Domain    │  │   Domain    │  │   Domain    │  │   Domain    │ │   │
│  │  │             │  │             │  │             │  │             │ │   │
│  │  │ • Plates    │  │ • Elevation │  │ • Climate   │  │ • Biomes    │ │   │
│  │  │ • Crust     │  │ • Landmass  │  │ • Rainfall  │  │ • Features  │ │   │
│  │  │ • Boundaries│  │ • Rivers    │  │ • Wind      │  │ • Placement │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  │                           │                                          │   │
│  │                           ▼                                          │   │
│  │              ┌───────────────────────────┐                           │   │
│  │              │    ARTIFACTS (canonical)  │  ← All data lives here   │   │
│  │              │    context.artifacts      │                           │   │
│  │              └───────────────────────────┘                           │   │
│  │                                                                       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ═══════════════════════════════════════════════════════════════════════════│
│                         ENGINE ADAPTER BOUNDARY                              │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                    │                                         │
│                    ┌───────────────┴───────────────┐                        │
│                    │                               │                        │
│                    ▼                               ▼                        │
│         ┌─────────────────────┐       ┌─────────────────────┐              │
│         │   Civ7Adapter       │       │   MockAdapter       │              │
│         │   (production)      │       │   (testing/offline) │              │
│         │                     │       │                     │              │
│         │ • Calls engine APIs │       │ • In-memory storage │              │
│         │ • Sets terrain      │       │ • TypedArray buffers│              │
│         │ • Reads back state  │       │ • Stubbed phases    │              │
│         └─────────────────────┘       └─────────────────────┘              │
│                    │                               │                        │
│                    ▼                               ▼                        │
│         ┌─────────────────────┐       ┌─────────────────────┐              │
│         │   Civ7 Game Engine  │       │   Nothing           │              │
│         │   (TerrainBuilder)  │       │   (pure isolation)  │              │
│         └─────────────────────┘       └─────────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 What the Engine Actually Provides

| Engine API | Category | Can Mock? | Notes |
|------------|----------|-----------|-------|
| `getGridWidth/Height()` | Dimensions | ✅ Trivial | Just return config values |
| `getTerrainType()` | Read | ✅ Full | MockAdapter stores in Uint8Array |
| `setTerrainType()` | Write | ✅ Full | MockAdapter writes to Uint8Array |
| `getElevation()` | Read | ✅ Full | MockAdapter stores in Int16Array |
| `getBiomeType()` | Read | ✅ Full | MockAdapter stores in Uint8Array |
| `setBiomeType()` | Write | ✅ Full | MockAdapter writes to Uint8Array |
| `setFeatureType()` | Write | ✅ Full | MockAdapter tracks features |
| `canHaveFeature()` | Validate | ✅ Configurable | Custom predicate function |
| `getRandomNumber()` | RNG | ✅ Full | Seeded RNG function |
| `stampContinents()` | Phase | ✅ No-op | Not needed for visualization |
| `buildElevation()` | Phase | ⚠️ No-op | See below |
| `modelRivers()` | Phase | ✅ Minimal | Creates simple river for verification |
| `designateBiomes()` | Phase | ✅ Unused | Custom system replaces it |
| `addFeatures()` | Phase | ✅ Unused | Custom system replaces it |
| `VoronoiUtils` | Utility | ✅ Full | Deterministic implementation |

### 1.3 The `buildElevation()` Question

This is the **only potentially problematic** engine call. Let's analyze it:

```
ELEVATION DATA FLOW

  ┌─────────────────────────────────────────────────────────────────────────┐
  │ PURE JS (artifacts)                                                      │
  │                                                                          │
  │  Foundation → topography.elevation (Int16Array)                          │
  │       │       • Computed from crustal isostasy                           │
  │       │       • Tectonic stress applied                                  │
  │       │       • Fractal noise added                                      │
  │       │                                                                  │
  │       ▼                                                                  │
  │  topography.landMask (Uint8Array)                                        │
  │       • Derived from elevation > seaLevel                                │
  │       • Used by ALL downstream stages                                    │
  │                                                                          │
  │  This is the CANONICAL TRUTH for visualization                           │
  └─────────────────────────────────────────────────────────────────────────┘
                           │
                           │ (parallel, separate concern)
                           ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ENGINE (gameplay layer)                                                  │
  │                                                                          │
  │  setTerrainType(MOUNTAIN/HILL/FLAT) → buildElevation() → getElevation() │
  │       │                                      │                           │
  │       │         Engine synthesizes          │                           │
  │       └─────────gameplay elevation──────────┘                           │
  │                  from terrain types                                      │
  │                                                                          │
  │  This is for IN-GAME playability, not for pipeline logic                 │
  └─────────────────────────────────────────────────────────────────────────┘

KEY INSIGHT: The JS artifacts already contain all elevation data needed
for visualization. The engine's buildElevation() is only for gameplay
smoothing - it doesn't affect the pipeline's data generation.
```

**Conclusion**: For visualization purposes, we don't need `buildElevation()` at all. The `topography.elevation` artifact from pure JS is the geologically-meaningful data.

---

## Chapter 2: What Data Exists in Artifacts

All the important visualization data is computed in pure JavaScript and stored in artifacts:

### 2.1 Foundation Domain

```typescript
// Computed purely in JS
interface FoundationArtifacts {
  plates: {
    id: Int16Array;              // Plate assignment per tile
    boundaryCloseness: Uint8Array;
    boundaryType: Uint8Array;
    tectonicStress: Uint8Array;
    upliftPotential: Uint8Array;
    riftPotential: Uint8Array;
    shieldStability: Uint8Array;
    volcanism: Uint8Array;
    movementU: Int8Array;
    movementV: Int8Array;
    rotation: Int8Array;
  };
  crust: {
    type: Uint8Array;            // Oceanic vs continental
    age: Uint8Array;
  };
}
```

### 2.2 Morphology Domain

```typescript
// Computed purely in JS
interface MorphologyArtifacts {
  topography: {
    elevation: Int16Array;       // ← This is the canonical elevation!
    seaLevel: number;
    landMask: Uint8Array;
    bathymetry: Int16Array;
  };
  relief: {
    mountainMask: Uint8Array;
    hillMask: Uint8Array;
    volcanoIndices: number[];
    ridgeIndices: number[];
  };
  routing: {
    flowDir: Uint8Array;
    flowAccum: Float32Array;
    basinId: Int16Array;
  };
}
```

### 2.3 Hydrology Domain

```typescript
// Computed purely in JS
interface HydrologyArtifacts {
  climateField: {
    surfaceTemperatureC: Float32Array;
    insolation: Float32Array;
    humidity: Uint8Array;
    rainfall: Uint8Array;
    evaporation: Uint8Array;
  };
  circulation: {
    windU: Int8Array;
    windV: Int8Array;
    pressurePa: Float32Array;
  };
  hydrography: {
    discharge: Float32Array;
    riverClass: Uint8Array;
    lakeIndices: number[];
  };
}
```

### 2.4 Ecology Domain

```typescript
// Computed purely in JS
interface EcologyArtifacts {
  biomeClassification: {
    biomeIndex: Uint8Array;
    vegetationDensity: Float32Array;
    aridity: Float32Array;
  };
  featureIntents: {
    forestIndices: number[];
    marshIndices: number[];
    reefIndices: number[];
    // etc.
  };
}
```

**All of this data is available for visualization without any engine dependency.**

---

# Part II: Offline Generation

## Chapter 3: How to Run Offline

### 3.1 The Pattern Already Exists

Tests already run the full pipeline offline:

```typescript
// From mods/mod-swooper-maps/test/standard-run.test.ts

import { createMockAdapter } from "@civ7/adapter/mock-adapter";
import { createExtendedMapContext } from "@civ7-mapgen/core";
import { standardRecipe, initializeStandardRuntime } from "../src/index.js";

const width = 128;
const height = 80;
const seed = 12345;

// Create mock adapter (no engine)
const adapter = createMockAdapter({
  width,
  height,
  mapInfo: { DefaultPlayers: 6, ... },
  mapSizeId: 1,
  rng: createLabelRng(seed),
});

// Create context
const context = createExtendedMapContext({ width, height }, adapter, env);
initializeStandardRuntime(context, { mapInfo, logPrefix: "[test]", storyEnabled: true });

// Run full pipeline!
standardRecipe.run(context, env, config, { log: () => {} });

// Access all artifacts
const topography = context.artifacts.get("artifact:morphology.topography");
const climateField = context.artifacts.get("artifact:hydrology.climateField");
const biomes = context.artifacts.get("artifact:ecology.biomeClassification");
```

### 3.2 Offline Runner Design

```typescript
// packages/mapgen-offline/src/runner.ts

import { createMockAdapter } from "@civ7/adapter/mock-adapter";
import { createExtendedMapContext } from "@civ7-mapgen/core";
import { standardRecipe, initializeStandardRuntime } from "@mod-swooper-maps";
import { FileDumpSink } from "./dump-sink.js";

interface OfflineRunnerConfig {
  width: number;
  height: number;
  seed: number;
  outputDir: string;
  config: RecipeConfig;
}

export async function runOffline(options: OfflineRunnerConfig) {
  const { width, height, seed, outputDir, config } = options;

  // Create seeded RNG
  const rng = createSeededRng(seed);

  // Create mock adapter
  const adapter = createMockAdapter({
    width,
    height,
    mapInfo: {
      DefaultPlayers: 6,
      GridWidth: width,
      GridHeight: height,
      NumNaturalWonders: 4,
    },
    mapSizeId: 1,
    rng: (max, label) => rng.next(max),
  });

  // Create dump sink for visualization
  const dumpSink = new FileDumpSink(outputDir, `run-${seed}`);

  // Create context with dump capability
  const env = { trace: { enabled: true, dump: dumpSink } };
  const context = createExtendedMapContext({ width, height }, adapter, env);
  initializeStandardRuntime(context, {
    mapInfo: adapter.lookupMapInfo(1),
    logPrefix: "[offline]",
    storyEnabled: false,
  });

  // Run pipeline
  console.log(`Running pipeline: ${width}×${height}, seed=${seed}`);
  standardRecipe.run(context, env, config, { log: console.log });

  // Dump all artifacts
  await dumpAllArtifacts(context, dumpSink);
  await dumpSink.finalize();

  console.log(`Output written to: ${outputDir}`);
  return context;
}

async function dumpAllArtifacts(
  context: ExtendedMapContext,
  sink: FileDumpSink
) {
  // Foundation
  const plates = context.artifacts.get("artifact:foundation.plates");
  if (plates) {
    await sink.emitLayer({
      id: "foundation.plates.id",
      domain: "foundation",
      name: "Plate ID",
      shape: "per-tile",
      dtype: "i16",
      count: plates.id.length,
      vizType: "categorical",
    }, plates.id);
    // ... other plate fields
  }

  // Topography
  const topography = context.artifacts.get("artifact:morphology.topography");
  if (topography) {
    await sink.emitLayer({
      id: "morphology.elevation",
      domain: "morphology",
      name: "Elevation",
      shape: "per-tile",
      dtype: "i16",
      count: topography.elevation.length,
      vizType: "scalar",
      valueRange: { min: -8000, max: 8000, unit: "m" },
      colorScale: "interpolateTerrain",
    }, topography.elevation);

    await sink.emitLayer({
      id: "morphology.landMask",
      domain: "morphology",
      name: "Land Mask",
      shape: "per-tile",
      dtype: "u8",
      count: topography.landMask.length,
      vizType: "mask",
    }, topography.landMask);
  }

  // Climate
  const climate = context.artifacts.get("artifact:hydrology.climateField");
  if (climate) {
    await sink.emitLayer({
      id: "hydrology.temperature",
      domain: "hydrology",
      name: "Temperature",
      shape: "per-tile",
      dtype: "f32",
      count: climate.surfaceTemperatureC.length,
      vizType: "scalar",
      valueRange: { min: -40, max: 50, unit: "°C" },
      colorScale: "interpolateRdYlBu",
    }, climate.surfaceTemperatureC);

    await sink.emitLayer({
      id: "hydrology.rainfall",
      domain: "hydrology",
      name: "Rainfall",
      shape: "per-tile",
      dtype: "u8",
      count: climate.rainfall.length,
      vizType: "scalar",
      valueRange: { min: 0, max: 200, unit: "mm" },
      colorScale: "interpolateBlues",
    }, climate.rainfall);
  }

  // Biomes
  const biomes = context.artifacts.get("artifact:ecology.biomeClassification");
  if (biomes) {
    await sink.emitLayer({
      id: "ecology.biomeIndex",
      domain: "ecology",
      name: "Biome",
      shape: "per-tile",
      dtype: "u8",
      count: biomes.biomeIndex.length,
      vizType: "categorical",
      categories: BIOME_CATEGORIES,
    }, biomes.biomeIndex);
  }
}
```

### 3.3 CLI Tool

```typescript
// packages/mapgen-offline/src/cli.ts

#!/usr/bin/env node

import { runOffline } from "./runner.js";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    width: { type: "string", default: "128" },
    height: { type: "string", default: "80" },
    seed: { type: "string", default: String(Date.now()) },
    output: { type: "string", short: "o", default: "./output" },
    config: { type: "string", short: "c" },
  },
});

const config = values.config
  ? JSON.parse(await fs.readFile(values.config, "utf-8"))
  : createDefaultConfig();

await runOffline({
  width: parseInt(values.width!, 10),
  height: parseInt(values.height!, 10),
  seed: parseInt(values.seed!, 10),
  outputDir: values.output!,
  config,
});
```

Usage:
```bash
# Run offline generation
npx mapgen-offline --width 256 --height 160 --seed 42 -o ./map-dump

# View results
npx mapgen-viewer ./map-dump
```

---

# Part III: Console-Only Dumps (In-Game)

## Chapter 4: Dumping to Console

If we cannot write to the filesystem during generation (running inside the Civ7 engine), we can still capture data via console output.

### 4.1 Approach: Base64-Encoded Chunks

```typescript
// In-game dump sink that outputs to console

class ConsoleDumpSink implements LayerDumpSink {
  private layers: LayerDescriptor[] = [];
  private runId: string;

  constructor(runId: string) {
    this.runId = runId;
  }

  emitLayer(
    descriptor: Omit<LayerDescriptor, 'dataFile' | 'byteLength'>,
    data: TypedArray
  ): void {
    // Convert TypedArray to base64
    const base64 = arrayBufferToBase64(data.buffer, data.byteOffset, data.byteLength);

    // Chunk if necessary (console may have line length limits)
    const CHUNK_SIZE = 4096;  // Characters per line
    const chunks = chunkString(base64, CHUNK_SIZE);

    // Output header
    console.log(`[DUMP:${this.runId}:LAYER:${descriptor.id}:META]${JSON.stringify(descriptor)}`);

    // Output chunks
    chunks.forEach((chunk, i) => {
      console.log(`[DUMP:${this.runId}:LAYER:${descriptor.id}:DATA:${i}/${chunks.length}]${chunk}`);
    });

    // Record for manifest
    this.layers.push({
      ...descriptor,
      dataFile: `inline:${descriptor.id}`,
      byteLength: data.byteLength,
    } as LayerDescriptor);
  }

  emitPoints(
    id: string,
    domain: string,
    name: string,
    points: Array<{x: number, y: number, [key: string]: unknown}>
  ): void {
    const json = JSON.stringify(points);
    const chunks = chunkString(json, 4096);

    console.log(`[DUMP:${this.runId}:POINTS:${id}:META]{"id":"${id}","domain":"${domain}","name":"${name}","count":${points.length}}`);

    chunks.forEach((chunk, i) => {
      console.log(`[DUMP:${this.runId}:POINTS:${id}:DATA:${i}/${chunks.length}]${chunk}`);
    });
  }

  finalize(): void {
    const manifest = {
      runId: this.runId,
      timestamp: new Date().toISOString(),
      layers: this.layers,
    };
    console.log(`[DUMP:${this.runId}:MANIFEST]${JSON.stringify(manifest)}`);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer, offset: number, length: number): string {
  const bytes = new Uint8Array(buffer, offset, length);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}
```

### 4.2 Console Output Format

```
[DUMP:abc123:LAYER:morphology.elevation:META]{"id":"morphology.elevation","domain":"morphology","name":"Elevation","dtype":"i16","count":72000,"vizType":"scalar"}
[DUMP:abc123:LAYER:morphology.elevation:DATA:0/18]SGVsbG8gV29ybGQhIFRoaXMgaXMgYSB0ZXN0IG9mIGJhc2U2NCBlbmNvZGluZy4uLg==
[DUMP:abc123:LAYER:morphology.elevation:DATA:1/18]...
[DUMP:abc123:LAYER:morphology.elevation:DATA:17/18]...
[DUMP:abc123:LAYER:ecology.biomeIndex:META]{"id":"ecology.biomeIndex",...}
[DUMP:abc123:LAYER:ecology.biomeIndex:DATA:0/6]...
...
[DUMP:abc123:MANIFEST]{"runId":"abc123","timestamp":"2026-01-23T...","layers":[...]}
```

### 4.3 Log Parser Tool

```typescript
// packages/mapgen-viewer/src/log-parser.ts

interface ParsedDump {
  runId: string;
  manifest: DumpManifest;
  layers: Map<string, { descriptor: LayerDescriptor; data: TypedArray }>;
}

export function parseConsoleDump(logContent: string): ParsedDump {
  const lines = logContent.split('\n');
  const chunks = new Map<string, string[]>();
  const descriptors = new Map<string, LayerDescriptor>();
  let manifest: DumpManifest | null = null;
  let runId = '';

  for (const line of lines) {
    // Parse layer metadata
    const metaMatch = line.match(/\[DUMP:([^:]+):LAYER:([^:]+):META\](.+)/);
    if (metaMatch) {
      runId = metaMatch[1];
      const layerId = metaMatch[2];
      descriptors.set(layerId, JSON.parse(metaMatch[3]));
      chunks.set(layerId, []);
      continue;
    }

    // Parse layer data chunk
    const dataMatch = line.match(/\[DUMP:([^:]+):LAYER:([^:]+):DATA:\d+\/\d+\](.+)/);
    if (dataMatch) {
      const layerId = dataMatch[2];
      chunks.get(layerId)?.push(dataMatch[3]);
      continue;
    }

    // Parse manifest
    const manifestMatch = line.match(/\[DUMP:([^:]+):MANIFEST\](.+)/);
    if (manifestMatch) {
      manifest = JSON.parse(manifestMatch[2]);
      continue;
    }
  }

  // Reassemble layers
  const layers = new Map<string, { descriptor: LayerDescriptor; data: TypedArray }>();

  for (const [layerId, chunkList] of chunks) {
    const descriptor = descriptors.get(layerId);
    if (!descriptor) continue;

    const base64 = chunkList.join('');
    const data = base64ToTypedArray(base64, descriptor.dtype);

    layers.set(layerId, { descriptor, data });
  }

  return {
    runId,
    manifest: manifest!,
    layers,
  };
}

function base64ToTypedArray(base64: string, dtype: string): TypedArray {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  switch (dtype) {
    case 'f32': return new Float32Array(bytes.buffer);
    case 'i32': return new Int32Array(bytes.buffer);
    case 'i16': return new Int16Array(bytes.buffer);
    case 'i8': return new Int8Array(bytes.buffer);
    case 'u32': return new Uint32Array(bytes.buffer);
    case 'u16': return new Uint16Array(bytes.buffer);
    case 'u8': return bytes;
    default: throw new Error(`Unknown dtype: ${dtype}`);
  }
}
```

### 4.4 Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CONSOLE DUMP WORKFLOW                                    │
│                                                                              │
│   IN-GAME                                                                    │
│   ───────                                                                    │
│   1. Enable trace.dump with ConsoleDumpSink                                 │
│   2. Run map generation                                                      │
│   3. Console receives [DUMP:...] lines                                      │
│   4. Civ7 logs to file or external capture                                  │
│                                                                              │
│                              │                                               │
│                              ▼                                               │
│                                                                              │
│   POST-GAME                                                                  │
│   ─────────                                                                  │
│   5. Extract game log file                                                   │
│   6. Filter for [DUMP:...] lines                                            │
│   7. Run log parser                                                          │
│   8. Output: reconstructed dump files                                        │
│                                                                              │
│                              │                                               │
│                              ▼                                               │
│                                                                              │
│   VISUALIZATION                                                              │
│   ─────────────                                                              │
│   9. Load reconstructed dump in D3 viewer                                   │
│   10. Inspect layers, toggle visibility, explore data                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# Part IV: Comparison of Approaches

## Chapter 5: Trade-offs

| Aspect | Offline Generation | Console Dump (In-Game) |
|--------|-------------------|------------------------|
| **Data Fidelity** | Full artifacts | Selective (what we emit) |
| **Engine Phases** | Stubbed (no-op) | Real execution |
| **Performance** | No game overhead | Game running |
| **Iteration Speed** | Fast (CLI) | Slow (launch game) |
| **File Access** | Direct write | Parse from log |
| **Data Size** | Binary (efficient) | Base64 (~33% overhead) |
| **Workflow** | Single command | Multi-step extraction |
| **Best For** | Development, testing | Validating real behavior |

## Chapter 6: Recommendation

### 6.1 Primary Path: Offline Generation

For visualization and development, **offline generation is superior**:

1. **Fast iteration** — No game launch required
2. **Direct file output** — No parsing needed
3. **Full artifact access** — Everything computed in JS is available
4. **CI integration** — Can run in automated pipelines
5. **Reproducible** — Seeded RNG ensures identical results

### 6.2 Secondary Path: Console Dump

Use console dumps when you need to:

1. **Validate real engine behavior** — See what `buildElevation()` actually produces
2. **Debug in-game issues** — Capture state during actual gameplay
3. **Compare offline vs in-game** — Verify MockAdapter fidelity

### 6.3 Hybrid Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       RECOMMENDED WORKFLOW                                   │
│                                                                              │
│  DEVELOPMENT LOOP                                                            │
│  ────────────────                                                            │
│                                                                              │
│   ┌──────────────┐                                                          │
│   │ Edit config  │                                                          │
│   │ or code      │                                                          │
│   └──────┬───────┘                                                          │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │ Run offline  │────▶│ View in D3   │────▶│ Iterate      │───┐           │
│   │ generation   │     │ viewer       │     │              │   │           │
│   └──────────────┘     └──────────────┘     └──────────────┘   │           │
│          │                                                      │           │
│          └──────────────────────────────────────────────────────┘           │
│                                                                              │
│  VALIDATION (occasional)                                                     │
│  ───────────────────────                                                     │
│                                                                              │
│   ┌──────────────┐                                                          │
│   │ Run in-game  │                                                          │
│   │ with dump    │                                                          │
│   └──────┬───────┘                                                          │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │ Extract log  │────▶│ Parse dump   │────▶│ Compare to   │               │
│   │              │     │              │     │ offline      │               │
│   └──────────────┘     └──────────────┘     └──────────────┘               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# Part V: What's Missing from MockAdapter

## Chapter 7: Gap Analysis

### 7.1 Currently No-Op (Acceptable for Visualization)

These engine calls are no-ops in MockAdapter, which is fine for visualization:

| Call | Why It's OK |
|------|-------------|
| `stampContinents()` | Continent IDs not needed for visualization |
| `buildElevation()` | JS topography.elevation is the canonical data |
| `defineNamedRivers()` | River names not needed for visualization |
| `storeWaterData()` | Internal engine state only |
| `validateAndFixTerrain()` | Validation not needed for visualization |
| `recalculateAreas()` | Area recalc not needed for visualization |
| `assignStartPositions()` | Returns mock positions |
| `generateResources()` | Resource placement not needed for layer viz |
| `addNaturalWonders()` | Wonder placement not needed for layer viz |
| `generateDiscoveries()` | Discovery placement not needed for layer viz |

### 7.2 Partially Implemented (May Need Enhancement)

| Call | Current State | Enhancement Needed? |
|------|--------------|---------------------|
| `modelRivers()` | Creates minimal river | Could be more realistic |
| `expandCoasts()` | Basic coast detection | Works for visualization |
| `VoronoiUtils` | Deterministic sites | Could add real relaxation |

### 7.3 Fully Implemented (No Changes Needed)

| Call | Notes |
|------|-------|
| All terrain/biome/feature reads | Full in-memory storage |
| All terrain/biome/feature writes | Full in-memory storage |
| `getRandomNumber()` | Configurable seeded RNG |
| `canHaveFeature()` | Configurable predicate |
| All type/tag lookups | Configurable indices |

---

# Conclusion

## Feasibility Summary

| Question | Answer | Confidence |
|----------|--------|------------|
| Can we run offline? | **YES** | High — tests already do this |
| Can we visualize all layers? | **YES** | High — all in JS artifacts |
| Does MockAdapter need work? | **Minimal** | Most functionality exists |
| Is console dump viable? | **YES** | Medium complexity |

## Recommended Implementation Order

1. **Create mapgen-offline package** — CLI runner using existing MockAdapter
2. **Add artifact dumping** — Walk context.artifacts, serialize to files
3. **Create basic D3 viewer** — Load dumps, render scalar/categorical
4. **Add ConsoleDumpSink** — For in-game capture when needed
5. **Enhance visualizations** — Vector fields, mesh view, etc.

The architecture is already well-suited for offline execution. The main work is building the visualization tooling, not fixing infrastructure.

---

*Document version: 1.0*
*Last updated: 2026-01-23*
