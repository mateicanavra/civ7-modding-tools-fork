# MapGen Studio Roadmap

This roadmap describes the incremental path to a practical, external visualization workflow for Civ7 mapgen.

## Definitions (shared terminology)

- **Dump**: a replayable folder containing at minimum `manifest.json` and referenced payload files under `data/`.
- **Layer**: a single visualizable artifact (grid/mesh/vector/points/polygons) described in the manifest.
- **`layerId`**: stable identifier for a layer (recommended form: `<domain>.<name>`), used for UI selection and comparisons.
- **`runId` / `planFingerprint`**: identifiers for a particular execution; exact semantics must match the mapgen trace/plan implementation.
- **`outputsRoot`**: where dump folders are written. For V0 we keep dumps local to the map mod’s `dist/` output (see V0 plan).

## North Star

MapGen Studio becomes the place to **inspect mapgen runs** via:
- **Replayable dumps** emitted during a run (no “debug mode” required).
- A **fast, rich viewer** (deck.gl) that can scrub steps, toggle layers, and compare runs.

## V0 — Dump + deck.gl Viewer (Vertical Slice)

Goal: prove the end-to-end loop: **run once → dump artifacts → view later**.

Implementation plan: `docs/projects/mapgen-studio/V0-IMPLEMENTATION-PLAN.md`.

### Deliverables

**1) Dump format + writer (pipeline-side)**
- A deterministic output folder per run:
  - `trace.jsonl` (events/spine; optional but recommended)
  - `manifest.json` (index of layers)
  - `data/*` (binary payloads + optional sidecars)
- Foundation-first: dump and visualize the plate-formation process “bottom-up”, capturing as many intermediate steps as practical.
- Minimum set (separate layers):
  - mesh (sites / adjacency where feasible)
  - plates (assignments + boundaries)
  - crust (cell-space + tile-space)

**2) MapGen Studio viewer MVP (browser-side)**
- Load a local/hosted dump folder (at minimum: `manifest.json`).
- Render multiple layer kinds as needed for Foundation (grid + points + segments).
- Minimal UI:
  - Layer picker
  - Step picker (plate formation process is step-by-step)
  - Legend/palette mapping for the layer
  - Fit-to-viewport / pan / zoom

**3) Operator workflow**
- A single command/workflow to produce a dump for a seed and open the viewer pointing at it.

### Acceptance Criteria
- A run dump can be produced deterministically for a given seed/plan.
- MapGen Studio can open that dump and render the grid layer reliably.
- The dump+viewer loop works without importing pipeline runtime code into the browser.

### Verification (V0)
- Producer: `manifest.json` is present and references at least one grid layer payload under `data/`.
- Viewer: MapGen Studio can load the dump and render the layer at correct dimensions with stable pan/zoom.
- Defaults: we typically validate on Civ7 **MAPSIZE_HUGE** (grid **106×66**).

### Non-goals (V0)
- Running the pipeline in-browser (Web Worker runner).
- Full step scrubbing, diffing runs, or deep layer taxonomy coverage.
- Complex geometry layers (rivers/paths/polygons/meshes) beyond the one proven slice.

## V0.1 — More Layers + Step Playback

Goal: make the viewer meaningfully useful for debugging.

- Add a small set of “core” layers across domains (Foundation → Placement).
- Add step/era controls:
  - Render “latest at step” for each layer, or allow step snapshots.
- Add basic diagnostics:
  - min/max histogram, value probe on hover, and palette controls.

## V0.2 — Geometry Support

Goal: make non-grid artifacts first-class.

- Add vector/path and point layers (rivers, faults, hotspots).
- Add polygon/mesh layers (plates, landmasses) where feasible.
- Add consistent coordinate mapping between dumps and viewer bounds.

## V1 — Comparison + Sharing

Goal: move from “viewer” to “debugging platform”.

- Compare two runs (seed/config diffs) with layer selection.
- Save/share view state (deep links, presets).
- Integrate with CLI/CI:
  - attach dumps to artifacts for regression inspection.
