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

## 4. Feature Specifications

### 4.1 Config Editor

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

### 4.2 Map Viewport

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

### 4.3 Layer Panel

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

### 4.4 Inspector Panel

**Purpose:** Show detailed values for a selected tile.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| IP-1 | Show tile coordinates (x, y, index) | P0 |
| IP-2 | Show value from each layer at tile | P0 |
| IP-3 | Format values with units | P1 |
| IP-4 | Show hex neighbors | P2 |
| IP-5 | Copy tile data as JSON | P2 |

### 4.5 Generation Controls

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

## 5. Layer Catalog

### 5.1 Foundation Domain

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

### 5.2 Morphology Domain

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

### 5.3 Hydrology Domain

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

### 5.4 Ecology Domain

| Layer | Array Type | Viz Type | Color Scale |
|-------|------------|----------|-------------|
| `biomes.index` | Uint8Array | Categorical | Custom biome colors |
| `biomes.vegetation` | Float32Array | Scalar | interpolateGreens |
| `biomes.aridity` | Float32Array | Scalar | interpolateYlOrBr |
| `features.forest` | number[] | Points | Green circles |
| `features.marsh` | number[] | Points | Cyan circles |
| `features.reef` | number[] | Points | Pink circles |

---

## 6. Milestones

### 6.1 Milestone 1 — Minimal Viable Product (MVP)

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

### 6.2 Milestone 2 — Full Layer Support

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

### 6.3 Milestone 3 — Config Editor

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

### 6.4 Milestone 4 — Polish & DX

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

## 7. Deployment

### 7.1 Railway Configuration

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

### 7.2 Railway CLI Deployment

```bash
cd packages/mapgen-studio
railway login
railway init        # Create project
railway up          # Deploy
railway domain      # Get URL
```

### 7.3 Environment Variables

None required — fully static client-side application.

---

## 8. Open Questions

| Question | Status | Notes |
|----------|--------|-------|
| Should we support map sizes > 300×240? | Open | May need chunked rendering |
| Should we add comparison mode (two seeds)? | Deferred | v2 feature |
| Should we persist configs to localStorage? | Open | Nice UX but scope creep |
| Should we add export to PNG? | Deferred | v2 feature |
| Should we integrate with GitHub for config storage? | Deferred | v2 feature |

---

## 9. Related Documents

### 9.1 Research (in this project)

- `research/layer-visualization-system.md` — Original visualization system design
- `research/offline-generation-and-visualization.md` — Offline generation feasibility
- `research/browser-pipeline-feasibility.md` — Browser compatibility analysis

### 9.2 External Dependencies

- `docs/projects/engine-refactor-v1/` — Pipeline architecture and config schemas
- `packages/mapgen-core/` — Core pipeline implementation
- `mods/mod-swooper-maps/` — Standard recipe and domain operations

---

## 10. Glossary

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
