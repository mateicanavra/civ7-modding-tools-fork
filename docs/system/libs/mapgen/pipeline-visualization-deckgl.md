# Pipeline Visualization (Deck.gl) Proposal

> **System:** Mapgen diagnostics and external visualization.
> **Scope:** Capture per-step artifacts/buffers as post-run dumps and render them in a deck.gl viewer.
> **Status:** Proposed (design outline).

## Purpose

We want a **post-generation visualization system** that can replay any run and show how each layer (buffers, artifacts, and indices) evolves through the pipeline. The viewer must operate **externally** from the pipeline runtime, consuming **logs/trace/dumps** emitted during a run.

Key goals:

- **External replay:** run once, inspect later.
- **Layered inspection:** show buffers (e.g., temperature), indices (e.g., biome IDs), and derived fields (e.g., mountain masks).
- **Deterministic provenance:** every layer is tagged with run/step/plan fingerprints.
- **Zero coupling to runtime:** pipeline must not depend on deck.gl.

---

## Can We Use Trace as-is?

We can keep the existing trace system as the **primary event spine** and add **lightweight dump primitives** on top:

- **Trace already supports** run/step events and allows custom payloads via `trace.event(...)` in step scopes.
- **Trace sinks are pluggable**, so we can implement a sink that writes **JSONL events + a binary data directory**.
- **Missing piece:** a standardized, structured **layer dump format** that references large buffers without bloating the trace stream.

### Conclusion

- **No new runtime primitive is required** to emit diagnostics: the trace system is enough.
- **One new convention is needed:** a **layer dump manifest** + optional helpers to write binary payloads.

---

## System Architecture (Data Flow)

```
Pipeline run
  → trace session (runId + planFingerprint)
  → step.event payloads (metadata only)
  → dump sink writes:
       - trace.jsonl   (events)
       - manifest.json (layer index)
       - data/         (binary arrays)
  → deck.gl viewer loads manifest + data
```

**Key property:** the viewer never runs pipeline code; it replays serialized outputs.

---

## Proposed Dump Primitives

### 1) Trace Sink: `TraceSinkDump`

A drop-in sink that writes events and data to disk:

```
.civ7/outputs/visualization/<runId>/
  trace.jsonl
  manifest.json
  data/
    layer-<id>.bin
    layer-<id>.json
```

- `trace.jsonl`: every `TraceEvent` as JSON per line.
- `manifest.json`: index of layers (for fast viewer loading).
- `data/`: raw typed arrays, encoded as binary + sidecar metadata.

### 2) Layer Manifest Schema

```json
{
  "runId": "<hash>",
  "planFingerprint": "<hash>",
  "layers": [
    {
      "id": "foundation.crust.type",
      "stepId": "foundation/compute-crust",
      "era": 0,
      "kind": "grid",
      "format": "uint8",
      "dims": [width, height],
      "path": "data/layer-foundation-crust-type.bin",
      "palette": "crustType",
      "domain": "foundation",
      "tags": ["artifact", "crust"]
    }
  ]
}
```

### 3) Layer Dump Event Convention

Layer dumps can be emitted via `trace.event` with a stable payload shape:

```ts
trace.event(() => ({
  type: "layer.dump",
  layerId: "foundation.crust.type",
  path: "data/layer-foundation-crust-type.bin",
  dims: [width, height],
  format: "uint8",
  palette: "crustType",
  tags: ["artifact", "crust"],
}));
```

The sink can normalize these into `manifest.json` while keeping the raw event stream intact.

---

## Layer Taxonomy (What We Visualize)

**Layer kinds:**

- **Grid layers** (tile fields): elevation, temperature, biome IDs, masks.
- **Mesh layers** (graph): region mesh, plate boundaries, tectonic edges.
- **Vector layers** (paths): rivers, fault lines, corridors.
- **Point layers** (samples): craton seeds, hotspots, volcanoes.
- **Polygon layers** (regions): landmasses, plates.

**Sources:**

- **Buffers:** mutable but snapshot-able (elevation, climate fields).
- **Artifacts:** immutable products (crust, plate graph, tectonic history).
- **Fields:** engine-facing outputs (biome IDs, terrain IDs).

---

## Deck.gl Viewer Design

### Viewer App Shape

A standalone web app (or an extension of `apps/playground`) that can load a dump folder:

- **Input:** `manifest.json` + `trace.jsonl` + binary data.
- **UI:** layer list, time/era controls, palette controls, min/max/legend.
- **Playback:** step-by-step overlay of layer changes.

### Deck.gl Layer Mapping

| Layer kind | deck.gl layer | Notes |
|---|---|---|
| Grid | `BitmapLayer` / `TileLayer` | Texture for tile grids (fast). |
| Mesh | `MeshLayer` / `PolygonLayer` | Region mesh or plate polygons. |
| Vector | `PathLayer` | Rivers, rifts, corridors. |
| Point | `ScatterplotLayer` | Seeds, hotspots, volcanoes. |
| Polygon | `PolygonLayer` | Plate/continent extents. |

### Layer Loading Path (Pseudo)

```ts
const manifest = await fetch("manifest.json").then(r => r.json());
const layer = manifest.layers.find(l => l.id === activeLayerId);
const data = await fetch(layer.path).then(r => r.arrayBuffer());
const texture = toTexture(data, layer.format, layer.dims, palette);
return new BitmapLayer({ id: layer.id, image: texture, bounds });
```

---

## What Needs to Change in the Pipeline?

### Minimal changes (preferred)

- **Add a dump sink** implementation (no changes to core trace primitives).
- **Introduce optional helpers** to format layer payloads consistently.
- **Emit layer dump events** for core artifacts/buffers (guarded by trace verbosity).

### Optional enhancements

- **Step-level opt-in registry** (e.g., `diagnostics.layers` for a step).
- **Palette registry** in docs (shared legend definitions for IDs/fields).
- **Layer diff events** (for deltas vs full snapshots).

---

## Visualization of the Pipeline (Conceptual)

```
Foundation
  ├─ crust type / age / strength (grid)
  ├─ plates + boundaries (mesh + vector)
  └─ tectonic history (grid per era)

Morphology
  ├─ elevation / slope / erosion (grid)
  └─ landmass masks (grid + polygons)

Hydrology
  ├─ rainfall / temp / rivers (grid + vector)

Ecology
  ├─ biome IDs / soil signals (grid)

Placement
  └─ starts / wonders (points)
```

---

## What This Enables

- **Postmortem debugging:** compare two runs by diffing manifests.
- **Model transparency:** show why a biome landed where it did.
- **Authoring confidence:** validate knobs and presets visually.

---

## Implementation Sequence (Suggested)

1. Add a **trace dump sink** that writes `trace.jsonl` + `manifest.json` + `data/`.
2. Add **layer dump helpers** in mapgen-core (format + validation).
3. Emit layer dumps for the core pipeline (Foundation → Placement).
4. Build a **deck.gl viewer** (standalone or in `apps/playground`).
5. Add palette definitions + legend mapping docs.

---

## Open Questions

- **Binary format:** raw typed arrays + sidecar JSON vs Arrow/Parquet.
- **File size controls:** snapshot every step vs key steps only.
- **Layer privacy:** remove any user identifiers from dumps.
