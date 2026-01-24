# Browser Pipeline Feasibility Analysis

## Executive Summary

**The map generation pipeline can run in the browser with zero code changes.**

| Aspect | Status | Notes |
|--------|--------|-------|
| Node.js APIs | ✅ None used | Pure TypeScript throughout |
| Native modules | ✅ None | No .node, no WASM, no C++ |
| Module format | ✅ ESM | Browser-native imports |
| Dependencies | ✅ Browser-safe | d3-delaunay, typebox |
| Adapter pattern | ✅ Clean | MockAdapter has no engine deps |

**Estimated effort to browser deployment: 2-4 hours**

---

## Part I: Codebase Analysis

### 1.1 Code Volume

```
┌────────────────────────────────────────────────────────────┐
│ CODEBASE SIZE                                               │
│                                                             │
│   packages/mapgen-core/src/       8,555 lines TypeScript   │
│   packages/civ7-adapter/src/      1,916 lines TypeScript   │
│   mods/mod-swooper-maps/src/     29,844 lines TypeScript   │
│   ─────────────────────────────────────────────────────────│
│   TOTAL                          40,315 lines TypeScript   │
│                                                             │
│   Estimated bundle size:                                    │
│   • Unminified:  ~300-400 KB                               │
│   • Minified:    ~100-150 KB                               │
│   • Gzipped:     ~25-40 KB                                 │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 1.2 Dependencies

**Runtime dependencies (all browser-safe):**

| Package | Size (min+gz) | Browser Support | Purpose |
|---------|---------------|-----------------|---------|
| `d3-delaunay` | ~5 KB | ✅ Native | Voronoi mesh generation |
| `typebox` | ~15 KB | ✅ Native | Schema validation |

**No problematic dependencies:**
- ❌ No `fs`, `path`, `os`, `crypto` from Node
- ❌ No native bindings (.node files)
- ❌ No WASM modules
- ❌ No CommonJS `require()`

### 1.3 Node.js API Scan Results

```
SCAN: Node.js APIs in runtime code

  fs/promises, fs           → NOT FOUND ✅
  path, node:path           → NOT FOUND ✅ (only in build config)
  process.env               → NOT FOUND ✅
  process.cwd               → NOT FOUND ✅
  __dirname, __filename     → NOT FOUND ✅
  Buffer                    → NOT FOUND ✅ (uses TypedArrays)
  require(                  → NOT FOUND ✅
  child_process             → NOT FOUND ✅
  node:crypto               → NOT FOUND ✅
  os, util, stream          → NOT FOUND ✅

RESULT: Zero Node.js APIs in runtime code
```

### 1.4 Module Format

All packages use ES Modules:

```json
// package.json (all packages)
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

Browsers support ESM natively via `<script type="module">`.

---

## Part II: Architecture for Browser

### 2.1 The Clean Boundary

The adapter pattern creates a clean separation:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   BROWSER-SAFE                           ENGINE-ONLY                        │
│   ────────────                           ───────────                        │
│                                                                              │
│   ┌─────────────────────────────┐       ┌─────────────────────────────┐    │
│   │ mapgen-core                 │       │ civ7-adapter (production)   │    │
│   │ • Pipeline framework        │       │ • Imports /base-standard/   │    │
│   │ • Domain operations         │       │ • Calls TerrainBuilder      │    │
│   │ • All algorithms            │       │ • Engine-specific globals   │    │
│   └─────────────────────────────┘       └─────────────────────────────┘    │
│                │                                     │                      │
│                │                                     │                      │
│   ┌─────────────────────────────┐                   │                      │
│   │ civ7-adapter (mock)         │                   │                      │
│   │ • Pure TypeScript           │◄──────────────────┘                      │
│   │ • In-memory arrays          │   Same interface,                        │
│   │ • No engine deps            │   different impl                         │
│   └─────────────────────────────┘                                          │
│                │                                                            │
│                ▼                                                            │
│   ┌─────────────────────────────┐                                          │
│   │ Browser Runtime             │                                          │
│   │ • Works today               │                                          │
│   │ • No changes needed         │                                          │
│   └─────────────────────────────┘                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 What Runs Where

```
BROWSER EXECUTION MODEL

┌─────────────────────────────────────────────────────────────────────────────┐
│ MAIN THREAD                                                                  │
│                                                                              │
│   ┌─────────────────┐                                                       │
│   │ React App       │                                                       │
│   │ • Config editor │                                                       │
│   │ • Layer toggles │                                                       │
│   │ • deck.gl viz   │                                                       │
│   └────────┬────────┘                                                       │
│            │                                                                 │
│            │ postMessage({ config, seed })                                  │
│            ▼                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ WEB WORKER (recommended for maps > 64x64)                                   │
│                                                                              │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│   │ createMock      │────▶│ standardRecipe  │────▶│ Extract         │      │
│   │ Adapter()       │     │ .run()          │     │ artifacts       │      │
│   └─────────────────┘     └─────────────────┘     └────────┬────────┘      │
│                                                             │               │
│                                                             │               │
│            ┌────────────────────────────────────────────────┘               │
│            │ postMessage({ artifacts })                                     │
│            ▼                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ MAIN THREAD                                                                  │
│                                                                              │
│   ┌─────────────────┐                                                       │
│   │ Receive data    │                                                       │
│   │ Update deck.gl  │                                                       │
│   │ Render layers   │                                                       │
│   └─────────────────┘                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Why Web Worker?

The pipeline has ~370 `for` loops iterating over tile data. For a 300×240 map (72,000 tiles):

| Operation | Iterations | Estimated Time |
|-----------|------------|----------------|
| Foundation (plates, crust) | ~2,000 cells × 10 passes | ~10-50ms |
| Morphology (elevation, flow) | ~72,000 tiles × 5 passes | ~100-500ms |
| Hydrology (climate, rivers) | ~72,000 tiles × 8 passes | ~200-800ms |
| Ecology (biomes, features) | ~72,000 tiles × 3 passes | ~50-200ms |
| **Total** | | **~500ms - 2s** |

Running 500ms-2s of synchronous computation on the main thread would freeze the UI. A Web Worker keeps the UI responsive.

---

## Part III: Implementation Plan

### 3.1 Minimal Browser Setup (No Build Step)

```html
<!DOCTYPE html>
<html>
<head>
  <title>MapGen Browser</title>
</head>
<body>
  <script type="module">
    // Import directly from CDN or local build
    import { createMockAdapter } from './dist/civ7-adapter/mock-adapter.js';
    import { createExtendedMapContext } from './dist/mapgen-core/index.js';
    import { standardRecipe, initializeStandardRuntime } from './dist/mod-swooper-maps/index.js';

    const width = 128, height = 80, seed = 12345;

    const adapter = createMockAdapter({
      width, height,
      mapInfo: { DefaultPlayers: 6, GridWidth: width, GridHeight: height },
      rng: (max) => Math.floor(Math.random() * max),
    });

    const context = createExtendedMapContext({ width, height }, adapter, {});
    initializeStandardRuntime(context, { mapInfo: adapter.lookupMapInfo(0) });

    console.time('pipeline');
    standardRecipe.run(context, {}, {});
    console.timeEnd('pipeline');

    // Access results
    const topography = context.artifacts.get('artifact:morphology.topography');
    console.log('Elevation sample:', topography.elevation.slice(0, 10));
  </script>
</body>
</html>
```

### 3.2 React + Vite + Web Worker Setup

**Project structure:**
```
packages/mapgen-studio/
├── package.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── worker/
│   │   └── pipeline.worker.ts    # Web Worker for generation
│   ├── components/
│   │   ├── ConfigEditor.tsx
│   │   ├── MapViewport.tsx       # deck.gl visualization
│   │   └── LayerPanel.tsx
│   └── lib/
│       └── artifacts.ts          # Artifact extraction
└── public/
```

**package.json:**
```json
{
  "name": "@swooper/mapgen-studio",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@deck.gl/react": "^9.0.0",
    "@deck.gl/layers": "^9.0.0",
    "d3-scale": "^4.0.0",
    "d3-scale-chromatic": "^3.0.0",
    "@civ7/adapter": "workspace:*",
    "@swooper/mapgen-core": "workspace:*",
    "@swooper/mod-swooper-maps": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.9.0",
    "vite": "^6.0.0"
  }
}
```

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',  // ESM workers
  },
  optimizeDeps: {
    include: ['@swooper/mapgen-core', '@civ7/adapter', '@swooper/mod-swooper-maps'],
  },
});
```

**src/worker/pipeline.worker.ts:**
```typescript
import { createMockAdapter } from '@civ7/adapter/mock-adapter';
import { createExtendedMapContext } from '@swooper/mapgen-core';
import { standardRecipe, initializeStandardRuntime } from '@swooper/mod-swooper-maps';

interface RunMessage {
  type: 'run';
  config: {
    width: number;
    height: number;
    seed: number;
    recipe?: object;
  };
}

interface ProgressMessage {
  type: 'progress';
  stage: string;
  percent: number;
}

interface ResultMessage {
  type: 'result';
  artifacts: {
    elevation: Int16Array;
    landMask: Uint8Array;
    temperature: Float32Array;
    rainfall: Uint8Array;
    biomeIndex: Uint8Array;
    plateId: Int16Array;
    // ... other layers
  };
  timing: {
    total: number;
  };
}

self.onmessage = (e: MessageEvent<RunMessage>) => {
  if (e.data.type !== 'run') return;

  const { width, height, seed, recipe } = e.data.config;
  const startTime = performance.now();

  // Create seeded RNG
  let rngState = seed;
  const rng = (max: number) => {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState % max;
  };

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
    rng,
  });

  // Create context
  const context = createExtendedMapContext({ width, height }, adapter, {
    trace: { enabled: false },
  });

  initializeStandardRuntime(context, {
    mapInfo: adapter.lookupMapInfo(1),
    logPrefix: '[browser]',
    storyEnabled: false,
  });

  // Run pipeline
  standardRecipe.run(context, {}, recipe ?? {}, { log: () => {} });

  // Extract artifacts
  const topography = context.artifacts.get('artifact:morphology.topography') as any;
  const climate = context.artifacts.get('artifact:hydrology.climateField') as any;
  const biomes = context.artifacts.get('artifact:ecology.biomeClassification') as any;
  const plates = context.artifacts.get('artifact:foundation.plates') as any;

  // Send results back (transfer ownership for performance)
  const result: ResultMessage = {
    type: 'result',
    artifacts: {
      elevation: topography?.elevation,
      landMask: topography?.landMask,
      temperature: climate?.surfaceTemperatureC,
      rainfall: climate?.rainfall,
      biomeIndex: biomes?.biomeIndex,
      plateId: plates?.id,
    },
    timing: {
      total: performance.now() - startTime,
    },
  };

  // Transfer TypedArrays to avoid copying
  const transferables = Object.values(result.artifacts)
    .filter((arr): arr is ArrayBufferView => arr?.buffer instanceof ArrayBuffer)
    .map(arr => arr.buffer);

  self.postMessage(result, transferables);
};
```

**src/App.tsx:**
```tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { MapViewport } from './components/MapViewport';
import { LayerPanel } from './components/LayerPanel';
import { ConfigEditor } from './components/ConfigEditor';

interface Artifacts {
  elevation?: Int16Array;
  landMask?: Uint8Array;
  temperature?: Float32Array;
  rainfall?: Uint8Array;
  biomeIndex?: Uint8Array;
  plateId?: Int16Array;
}

export function App() {
  const [artifacts, setArtifacts] = useState<Artifacts | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timing, setTiming] = useState<number | null>(null);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(['biomeIndex']));
  const [config, setConfig] = useState({ width: 128, height: 80, seed: 12345 });

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create worker on mount
    workerRef.current = new Worker(
      new URL('./worker/pipeline.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'result') {
        setArtifacts(e.data.artifacts);
        setTiming(e.data.timing.total);
        setIsRunning(false);
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  const runPipeline = useCallback(() => {
    if (!workerRef.current || isRunning) return;
    setIsRunning(true);
    setArtifacts(null);
    workerRef.current.postMessage({ type: 'run', config });
  }, [config, isRunning]);

  return (
    <div className="flex h-screen">
      {/* Left sidebar: config + layers */}
      <div className="w-80 border-r flex flex-col">
        <ConfigEditor config={config} onChange={setConfig} />
        <button
          onClick={runPipeline}
          disabled={isRunning}
          className="m-4 p-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {isRunning ? 'Generating...' : 'Generate Map'}
        </button>
        {timing && <div className="px-4 text-sm">Generated in {timing.toFixed(0)}ms</div>}
        <LayerPanel
          artifacts={artifacts}
          activeLayers={activeLayers}
          onToggle={(layer) => {
            const next = new Set(activeLayers);
            if (next.has(layer)) next.delete(layer);
            else next.add(layer);
            setActiveLayers(next);
          }}
        />
      </div>

      {/* Main viewport */}
      <div className="flex-1">
        <MapViewport
          width={config.width}
          height={config.height}
          artifacts={artifacts}
          activeLayers={activeLayers}
        />
      </div>
    </div>
  );
}
```

### 3.3 Railway Deployment

**Dockerfile:**
```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy workspace files
COPY package.json bun.lockb ./
COPY packages/mapgen-core/package.json packages/mapgen-core/
COPY packages/civ7-adapter/package.json packages/civ7-adapter/
COPY mods/mod-swooper-maps/package.json mods/mod-swooper-maps/
COPY packages/mapgen-studio/package.json packages/mapgen-studio/

# Install deps
RUN bun install

# Copy source
COPY . .

# Build all packages
RUN bun run build --filter=@swooper/mapgen-studio

# Serve static files
FROM nginx:alpine
COPY --from=builder /app/packages/mapgen-studio/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Or simpler with Bun serving:

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY --from=builder /app/packages/mapgen-studio/dist ./dist
EXPOSE 3000
CMD ["bun", "x", "serve", "dist", "-p", "3000"]
```

**railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "packages/mapgen-studio/Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE"
  }
}
```

---

## Part IV: Performance Considerations

### 4.1 Bundle Size Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'mapgen': [
            '@swooper/mapgen-core',
            '@civ7/adapter',
            '@swooper/mod-swooper-maps',
          ],
          'viz': ['@deck.gl/react', '@deck.gl/layers', 'd3-scale'],
        },
      },
    },
  },
});
```

Expected chunks:
- `mapgen.js`: ~100 KB (gzipped: ~25 KB)
- `viz.js`: ~200 KB (gzipped: ~60 KB)
- `app.js`: ~20 KB (gzipped: ~6 KB)

### 4.2 Web Worker Data Transfer

TypedArrays can be transferred (zero-copy) instead of cloned:

```typescript
// In worker
const elevation = new Int16Array(72000);
self.postMessage({ elevation }, [elevation.buffer]); // Transfer, not copy

// Main thread receives ownership - original array is neutered
```

For a 300×240 map:
- Without transfer: ~3 MB copied per run
- With transfer: ~0 MB copied (instant)

### 4.3 Progressive Rendering (Future)

Could emit partial results during generation:

```typescript
// Worker sends progress updates
self.postMessage({ type: 'progress', stage: 'foundation', percent: 15 });
self.postMessage({ type: 'progress', stage: 'morphology', percent: 40 });
// ...

// Main thread updates UI progressively
worker.onmessage = (e) => {
  if (e.data.type === 'progress') {
    setProgress(e.data);
  }
};
```

---

## Part V: Summary

### What We Learned

1. **Zero code changes needed** — The pipeline is already browser-compatible
2. **Clean architecture pays off** — The adapter pattern enables this naturally
3. **ESM throughout** — No CommonJS conversion needed
4. **TypedArrays, not Buffer** — Already using browser-native data types
5. **Small bundle** — ~25 KB gzipped for core pipeline

### Implementation Effort

| Task | Effort | Priority |
|------|--------|----------|
| Basic browser demo (no worker) | 1 hour | P0 |
| Web Worker integration | 2-3 hours | P0 |
| deck.gl visualization | 4-6 hours | P0 |
| Config editor UI | 4-6 hours | P1 |
| Layer panel + inspector | 2-3 hours | P1 |
| Railway deployment | 1 hour | P1 |
| Progressive rendering | 4-6 hours | P2 |
| **Total MVP** | **~2 days** | |

### Architecture Decision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                      RECOMMENDED ARCHITECTURE                                │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                         BROWSER                                       │  │
│   │                                                                       │  │
│   │   React App                Web Worker                                 │  │
│   │   ─────────                ──────────                                 │  │
│   │   • Config form            • Pipeline execution                       │  │
│   │   • Layer toggles          • Artifact extraction                      │  │
│   │   • deck.gl viewport       • Transfer to main thread                  │  │
│   │   • Inspector panel                                                   │  │
│   │                                                                       │  │
│   │   Bun + Vite (dev)         ESM Worker                                 │  │
│   │   Static hosting (prod)    Runs mapgen-core + mod-swooper-maps       │  │
│   │                                                                       │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   ZERO SERVER NEEDED                                                        │
│   • Fully client-side generation                                            │
│   • Can host on any static CDN                                              │
│   • Railway just serves built files                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*Document version: 1.0*
*Last updated: 2026-01-23*
