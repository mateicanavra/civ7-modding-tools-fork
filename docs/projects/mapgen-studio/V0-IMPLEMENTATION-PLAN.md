# V0 Implementation Plan — Dump + Deck.gl Viewer

This plan turns the V0 roadmap into an executable slice: **dump a single layer from one run and render it in MapGen Studio**.

## Definitions (must stay consistent with runtime)

- **Dump folder**: contains `manifest.json` and binary payloads under `data/`.
- **`outputsRoot` (V0)**: the map mod’s built output directory: `mods/mod-swooper-maps/dist`. Dumps are written under it so they travel with the mod artifact.
  - **Shortcut (explicit):** this is runtime/debug output inside a generated directory; it may be overwritten by rebuilds and should not be committed.
- **`layerId`**: stable identifier for a layer; filenames are implementation detail.
- **Trace events**: emitted via the mapgen trace system; note that `step.event` emission may be gated (e.g. verbose-only).

## Goal

Prove the loop:

1) Run mapgen once
2) Emit a replayable dump folder (`manifest.json` + `data/*`, optionally `trace.jsonl`)
3) Open MapGen Studio and render a dumped grid layer via deck.gl

Dump outputs (V0) are written under: `mods/mod-swooper-maps/dist/visualization/<runId>/…`.

## Scope (V0)

- Foundation-first: visualize the plate formation process step-by-step.
- Dump and render multiple layer kinds as needed:
  - tile-space grids (e.g. plateId, boundaryType, crust tiles)
  - mesh-space points (mesh sites, cell-to-plate assignment, crust/tectonics tensors)
  - mesh-space segments where feasible (tectonic segments, neighbor graphs)
- External replay only: viewer **does not execute** pipeline code.
- Default validation target is Civ7 **MAPSIZE_HUGE** (grid **106×66**), as defined in `.civ7/outputs/resources/Base/modules/base-standard/data/maps.xml`.

## Decisions to Lock (Before Coding)

1) **Viewer input mode**
   - **Option A (recommended for static deploy):** user selects a dump folder via file picker (`manifest.json` + binaries).
   - Option B: viewer loads dumps by URL (requires serving dumps over HTTP).
2) **Binary encoding for the first grid layer**
   - Raw typed array bytes + sidecar JSON (recommended).
   - Arrow/Parquet (defer).
3) **Coordinate model**
   - Tile grid coordinates with bounds `[0..width] x [0..height]` (recommended for V0).
   - World lat/lon (defer until there’s a stable mapping contract).

## Open Questions (explicit; do not silently decide)

1) **Which single layer is the V0 slice?**
   - Options: elevation, land/water mask, temperature, rainfall.
   - Recommendation: pick the easiest layer that is available “in one place” without pulling large new dependencies.
2) **How do we guarantee `layer.dump` events are emitted?**
   - Constraint: the trace system may only emit `step.event` in verbose mode.
     - Reference: `packages/mapgen-core/src/trace/index.ts` (`TraceScope.event`).
   - Prework: confirm whether V0 should require verbose trace for the instrumented step(s), or whether the dump sink should also support non-verbose paths.
3) **How should we derive dims for a dump?**
   - Constraint: the dump must include `dims: [width, height]` and match the underlying arrays.
   - Default: for most V0 testing, use Civ7 **MAPSIZE_HUGE** (**106×66**) from `.civ7/outputs/resources/Base/modules/base-standard/data/maps.xml`.
   - Future: allow selecting other map sizes by `MapSizeType` (not needed for V0).

## Pipeline-Side Work (Dump Producer)

### 1) Define the V0 dump contract (types + schema)

Deliver:
- A TypeScript type for the manifest + layer entries.
- A minimal JSON schema section in docs (format/dims/path fields).

Minimum layer entry fields:
- `layerId` (stable `domain.field` identifier)
- `stepId`
- `kind` (`grid`)
- `format` (`uint8`/`uint16`/`float32`)
- `dims` (`[width, height]`)
- `path` (relative path under dump root)
- optional: `palette`, `tags`, `domain`

### 2) Implement a trace dump sink (events spine + manifest builder)

Target: `packages/mapgen-core/src/trace/…` using the existing `TraceSink` interface.

Responsibilities:
- Append all trace events to `trace.jsonl` (1 JSON object per line).
- Detect `step.event` payloads of the form `{ type: "layer.dump", ... }`.
- Maintain an in-memory manifest and write/refresh `manifest.json`.

Notes:
- The current trace system only emits `step.event` when the step is configured as `verbose`.
- The sink must never throw (trace is non-functional / best-effort).

### 3) Implement a grid layer dump helper (writes binary + emits event)

Provide a helper that:
- Writes a single typed array to `data/<file>.bin` (filename is an implementation detail; `layerId` stays stable in the manifest).
- Writes a small sidecar JSON if needed (format/dims/palette) or embeds that in the event.
- Emits the `layer.dump` step event referencing the relative path.

### 4) Instrument one step to dump one layer

Pick a layer that is:
- stable and easy to extract in a single step, and
- useful for verifying the viewer’s correctness.

Deliver:
- One step emits one `layer.dump` event in verbose mode.

### 5) Producer validation

Add/extend a `packages/mapgen-core` test:
- Run a minimal plan with the dump sink enabled.
- Assert `manifest.json` exists and includes the dumped layer entry.
- Assert the referenced `data/*` file exists and has the expected byte length.

## Viewer-Side Work (MapGen Studio)

### 6) Add deck.gl-based grid rendering

Target: `apps/mapgen-studio`.

Deliver:
- Add deck.gl (and required peer deps) to the app.
- Render one grid layer from a selected dump:
  - decode binary (based on `format`)
  - colorize via a simple palette mapping (start with grayscale if needed)
  - render with a deck.gl layer suitable for textures (e.g., `BitmapLayer`)

### 7) Implement dump loading UX (V0 input mode)

If choosing **folder upload**:
- UI: “Open dump folder”
- Require at minimum: `manifest.json` + referenced binaries.
- Keep all paths relative to the selected folder; no network required.

If choosing **URL load**:
- UI: URL input + query param (`?dumpUrl=...`) support.

### 8) Viewer validation

Deliver:
- A fixture dump folder (small, committed under an appropriate test/fixture location) or a scripted generator.
- A basic integration check (manual is acceptable for V0; automated if a test harness exists).

## Operator Workflow (Glue)

### 9) One command to produce + open

Deliver one of:
- A `bun` script that runs a known seed/plan and writes `mods/mod-swooper-maps/dist/visualization/<runId>/…`.
- A small CLI wrapper command (if an existing CLI entrypoint is the right home).

Acceptance:
- Running the command produces a dump folder and opens MapGen Studio pointed at it (or prints exact “how to open” instructions).

V0 local entrypoint (current intent):
- Produce foundation dump: `bun run --cwd mods/mod-swooper-maps viz:foundation`
- Open MapGen Studio: `bun run --cwd apps/mapgen-studio dev` then “Open dump folder” and select `mods/mod-swooper-maps/dist/visualization/<runId>`

## Acceptance Criteria (V0)

- Dump producer: produces `manifest.json` + one grid layer binary for a seed/plan.
- Viewer: loads the dump and renders the grid layer with correct dimensions and a stable palette.
- No pipeline runtime code is bundled into the browser app.

## Verification Methods (V0)

Producer:
- Run mapgen-core tests: `bun run test:mapgen`
- If adding a dedicated dump test, keep it small and deterministic (tiny grid dims, fixed seed).

Viewer:
- Dev run: `bun run --cwd apps/mapgen-studio dev`
- Build check: `bun run --cwd apps/mapgen-studio build`

## Out of Scope / Defer

- In-browser pipeline runner (Web Worker).
- Multi-layer playback, diffs, and advanced legend tooling.
- Geometry layers (paths/polygons/meshes) beyond the first proven slice.
