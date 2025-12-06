# Crust-First Tectonic Morphology – Implementation Plan (v1)

## 0. Goals & Constraints

- Decouple **land existence** from **boundary stress/uplift** to eliminate “snake continents” vs “inverted worlds” ping–pong.
- Move to a **forward pass**: Crust → Plates/Boundaries → Uplift Matrix → Morphology (landmask, coasts, mountains, rifts) → Story overlays.
- Codify the **tectonic matrix** (convergent / divergent / transform, continental vs oceanic) in one place and feed it through the same pipeline.
- Start modularizing Swooper’s map code into smaller, composable components (a `lib/` structure) so `plates.js`, `landmass_plate.js`, `mountains.js`, etc. become orchestrators, not monoliths.
- Keep `WorldModel` + `FoundationContext` semantics stable where possible; avoid multi-pass runs or tearing down engine globals.

Non-goals (for this phase)
- No reimplementation of Civ7’s full rules-based continent generator.
- No multi-era re-simulation (we stay single-snapshot and analytic for overlays).
- No new XML/DB content; this is script-side + config only.

---

## 1. High-Level Architecture – Forward Pass

New conceptual order (within the existing pipeline envelope):

1. **Foundation / Voronoi Plates** (already present)
   - `computePlatesVoronoi` seeds plates, solves Voronoi, computes movement vectors and boundaries.

2. **Plate Topology (NEW)** – Build plate adjacency and basic per-plate stats.
   - For each plate: track neighbors, area, and centroid for later crust clustering and matrix refinements.

3. **Crust Typing (NEW)** – Assign plate–level crust types and base elevations.
   - For each plate: mark as `continental` or `oceanic` and derive base elevation / depth.

4. **Tectonic Fields (existing WorldModel, extended)** – Compute boundary types, closeness, uplift/rift potentials and a derived **tectonic matrix** per tile.

5. **Base Heightfield & Landmask (NEW)** – Combine crust base elevation + tectonic modifiers + global sea level to decide land vs water, independent of “boundary vs interior” bias knobs.

6. **Morphology Stages (adapted)** – Coasts, mountains, rivers, climate, story overlays act on:
   - `crustType`, `baseElevation`, `upliftMatrix` (matrix-coded), and the final landmask.

7. **Diagnostics & Overlays** – Existing dev logs/ASCII plus new crust/tectonics overlays.

The key shift: **Crust defines where land can exist; boundaries only sculpt height.**

---

## 2. Modularization – `lib/` Layout & Composition

Introduce a small “library” layer for reusable tectonic logic under the mod’s map code.

### 2.1 Directory Structure (proposed)

Under `mods/mod-swooper-maps/mod/maps/`:

- `lib/`
  - `plates/`
    - `topology.js` – builds plate adjacency graph + basic stats.
    - `crust_types.js` – plate-level crust assignment & base elevation helpers.
    - `boundary_matrix.js` – classification and scalar weights for convergent/divergent/transform per crust pairing.
  - `heightfield/`
    - `base_heightfield.js` – constructs the base elevation buffer from crust data.
    - `sea_level.js` – utilities to derive/tune global sea level from config and tensors.
  - `tectonics/`
    - `uplift_matrix.js` – builds a normalized “tectonic matrix” per tile (mountains/rifts/hills signals).
  - `mountains/`
    - `scores_matrix.js` – converts uplift matrix + base height into mountain/hill score buffers using the tectonic matrix spec.
  - `util/`
    - Shared clamps, diagnostics, buffer iterators (pulled out of `landmass_plate.js` / `mountains.js` over time).

Orchestrator files become thin:

- `world/plates.js` → delegates to `lib/plates/crust_types.js` for crust assignment; retains Voronoi + boundary solve.
- `layers/landmass_plate.js` → composes `base_heightfield`, `sea_level`, and landmask creation.
- `layers/mountains.js` → composes `uplift_matrix` + `scores_matrix` and performs threshold selection + terrain writing.

### 2.2 Composition Style

Each orchestrator:

- Imports small, pure helpers from `lib/`.
- Owns I/O with `MapContext`, `WorldModel`, and Civ engine globals.
- Exposes a clear signature for the stage (`(ctx, options)` or `(width, height, ctx, options)`).
- Contains only:
  - Stage-level gating (is WorldModel enabled? are buffers present?).
  - Wiring between `FoundationContext` and lib modules.
  - Dev logging and diagnostics toggles.

---

## 3. Plate Topology (Phase 0.5 – NEW)

Before crust typing, we need an explicit **plate adjacency graph** derived from the Voronoi solve.

### 3.1 Data Model

- `PlateGraph`: array indexed by `plateId`, entries like:
  - `id: number`
  - `neighbors: number[]` (sorted, unique)
  - `area: number` (tile count)
  - `centroid: { x: number, y: number }` (in tile space)

### 3.2 Implementation (`lib/plates/topology.js`)

Inputs:
- `plateId` tensor (per tile).
- Map `width`, `height`.

Outputs:
- `plateGraph` as above (or individual arrays for neighbors/area/centroids).

Algorithm sketch:
- Scan each tile `(x, y)`:
  - For each 4-direction neighbor `(x+dx, y+dy)` in-bounds:
    - If `plateId[i] !== plateId[j]`, add each to the other’s neighbor set.
  - Accumulate per-plate area and centroid sums (`sumX`, `sumY`).
- After pass:
  - Convert neighbor sets to sorted arrays.
  - Convert centroid sums to `centroid = { x: sumX / area, y: sumY / area }`.

Integration:
- Called from `world/plates.js` after Voronoi & boundary computation.
- Stored on `WorldModel` or inside the `plates` group in `FoundationContext` for reuse by crust typing and future matrix refinements.

### 3.3 Uses

- Crust typing:
  - Implement `supercontinentBias` by BFS/region-growing over `plateGraph` instead of random scatter.
  - Prefer larger, better-connected plates when seeding continental clusters.
- Tectonic matrix (later phase):
  - Use `plateGraph` + per-plate crust types to recognize **continental–continental**, **oceanic–continental**, and **oceanic–oceanic** boundaries when refining uplift and mountainFavor.

---

## 4. Crust Typing Stage (NEW)

### 4.1 Data Model

Plate-level:

- `WorldModel.plateCrustType: Uint8Array` (per plate)
  - 0 = oceanic
  - 1 = continental
  - (optionally 2 = microcontinent/arc later)
- `WorldModel.plateBaseElevation: Float32Array` (per plate)
  - Signed height relative to “nominal” sea level (e.g., `+0.4` = high continent, `-0.6` = deep ocean).

Tile-level:

- `WorldModel.crustType: Uint8Array` (per tile; derived from `plateId` → `plateCrustType`).
- `WorldModel.baseElevation: Float32Array` (per tile; derived from `plateBaseElevation`, possibly jittered).

### 4.2 Config Surface

Add to `LANDMASS`/`FOUNDATION` config (exact location to be refined in follow-up implementation):

- `crust` group:
  - `continentalPlateFraction` (default ~0.3).
  - `supercontinentBias` (0–1): probability of cluster formation vs dispersed continents.
  - `continentalBaseHeight` (e.g., `+0.35`).
  - `oceanicBaseHeight` (e.g., `-0.65`).
  - Optional ranges / noise weights for per-plate variation.

### 4.3 Implementation Steps

In `lib/plates/crust_types.js`:

- Inputs:
  - Plate graph/topology (`PlateGraph` from Phase 0.5).
  - RNG (`ctxRandom` or adapter RNG).
  - Crust config.
- Outputs:
  - `plateCrustType`, `plateBaseElevation`.

Algorithm sketch:

1. Seed a set of continental plates:
   - Sample `targetContinental = round(plateCount * continentalPlateFraction)`.
   - Optionally bias selection toward larger plates (so continents aren’t tiny shards).
2. If `supercontinentBias > 0`:
   - Start with 1–2 seeds; grow continental status to neighboring plates with probability influenced by the bias and remaining quota.
3. Assign base elevations:
   - Continental plates get `continentalBaseHeight + jitter`.
   - Oceanic plates get `oceanicBaseHeight + jitter`.
4. Publish:
   - Write arrays into `WorldModel` or return them for `WorldModel.init()` to store.

Tile projection (inside `world/plates.js` or in a helper):

- For each tile:
  - Look up `plateId[i]`.
  - Set `crustType[i] = plateCrustType[plateId[i]]`.
  - Set `baseElevation[i] = plateBaseElevation[plateId[i]]` (plus optional low-amplitude, plate-local noise for variation).

---

## 4. Tectonic Matrix & Uplift

### 4.1 Tectonic Matrix Concept

For each tile we want a small, explicit struct that can drive both landmask sculpting and mountains:

- Inputs:
  - `crustType` (continental/oceanic).
  - `boundaryType` (none / convergent / divergent / transform).
  - `boundaryCloseness` (0–255 ⇒ normalized).
  - `upliftPotential`, `riftPotential`.
- Output (per tile):
  - `tectonicMatrix[i] = {`
    - `convergentStrength`, `riftStrength`, `transformStrength`, // 0–1
    - `mountainFavor`, `hillFavor`, `riftValleyFavor`, `plateauFavor`, // derived blend fields
  - `}`

Implementation (`lib/tectonics/uplift_matrix.js`):

- Normalize closeness:

  ```js
  const c = boundaryCloseness[i] / 255;
  const gate = boundaryGate; // e.g. 0.2
  const normalized = c <= gate ? 0 : (c - gate) / (1 - gate);
  ```

- Base intensities:
  - `convergentStrength` non-zero only for convergent tiles, shaped by exponent.
  - `riftStrength` non-zero only for divergent tiles.
  - `transformStrength` for transform tiles.
- Favor fields:
  - `mountainFavor` high when `convergentStrength` + uplift is high (continental–continental or oceanic–continental).
  - `hillFavor` high for:
    - Transforms.
    - Rift shoulders (bell curve around normalized ~0.5).
  - `riftValleyFavor` high when `riftStrength` is high and crust is continental (deep rifts); may be low for oceanic.

These are **dimensionless scores** (0–1) the rest of the pipeline can read.

### 4.2 Plate Pair Awareness (Optional v1.5)

If boundary solve already knows plate pairs, we can refine:

- Continental + continental convergent → stronger `mountainFavor`.
- Oceanic + continental convergent → moderate `mountainFavor`, maybe more `hillFavor`.
- Oceanic + oceanic convergent → low `mountainFavor`, but can feed future seamount arcs.

This can be added incrementally to `boundary_matrix.js` and read in `uplift_matrix.js`.

---

## 5. Base Heightfield & Landmask (Crust-First)

### 5.1 Base Heightfield

In `lib/heightfield/base_heightfield.js`:

- Inputs:
  - `crustType[i]`, `baseElevation[i]`.
  - Tectonic matrix (optional for early uplift application).
- Output:
  - `baseHeight[i]: Float32Array` (pre-sea-level heightfield).

Baseline v1:

- Start from `baseElevation[i]` (continental vs oceanic) and apply **plate-scale fractal noise** before sea-level cut:
  - Use a dedicated fractal ID and 2–3 octaves so coastlines blur straight Voronoi edges but plates remain contiguous.
  - Noise amplitude should be large enough to bend/coarsen coasts (e.g. ±15–25% of continental height) but not so large that it inverts plate interiors into isolated islands.
- Optionally add a small fraction of `mountainFavor` / `upliftPotential` as broad shaping, keeping sharp orogenesis in the mountains stage.

### 5.2 Sea Level Computation

In `lib/heightfield/sea_level.js`:

- Inputs:
  - `baseHeight` array.
  - Config: target water percent, maybe climate-related hints.
- Output:
  - `seaLevel` scalar.

Algorithm:

1. Take percentile of `baseHeight` such that tiles below it match target water fraction (e.g., 0.64).
2. Allow config overrides to nudge up/down (wet/dry worlds).

### 5.3 Landmask Creation – New Contract

`layers/landmass_plate.js` becomes responsible for:

- Creating `baseHeight` (via `lib/heightfield`).
- Computing `seaLevel`.
- Writing:
  - `landMask` (per tile).
  - Terrain & elevation for land/water tiles using `writeHeightfield`.
  - Land windows / continents from connected land regions (still grouped via `plateId` for start placement).

Key differences from the current implementation:

- No global score threshold search over `shield + boundaryBias*closeness`.
- Boundaries **do not** directly drive land vs water; they modulate height around the base crust but land primarily remains where crust is continental.
- `boundaryBias` becomes strictly a **mountains/coastline shaping** input, not a land existence knob (or is removed entirely from landmass).

---

## 6. Mountains Layer – Matrix-Driven, Crust-Aware

`layers/mountains.js` will be refactored to lean on:

- `WorldModel.crustType`.
- Tectonic matrix (`mountainFavor`, `hillFavor`, `riftValleyFavor`, etc.).
- `baseHeight` and final landmask (for gating).

### 6.1 Score Computation – Using Tectonic Matrix

In `lib/mountains/scores_matrix.js`:

- Inputs per tile:
  - `mountainFavor`, `hillFavor`, `riftValleyFavor`.
  - Fractal noise for variation.
  - `crustType`, `baseHeight`, and water state (`landMask`).
- Outputs:
  - `mountainScore[i]`, `hillScore[i]`.

Matrix logic (from the other AI’s spec, adapted):

- Convergent:
  - Strong boost to `mountainScore` on land, modulated by fractal (peaks/saddles).
  - Hills form broader belts via `hillFavor`.
- Divergent:
  - Strong suppression of `mountainScore` at the rift center (flat or depressed valley).
  - Bell-shaped `hillScore` around the shoulders (donut profile).
  - Optionally depress `baseHeight` further where `riftValleyFavor` is high.
- Transform:
  - Supress big peaks.
  - Boost hill score with high-frequency noise for “broken ground” ridges.
- Ocean–ocean:
  - If `crustType === oceanic` on both sides, treat peaks as submarine (no land mountains); this can feed future seamount logic.

This logic becomes centralized and unit-testable in `lib/mountains/scores_matrix.js`.

### 6.2 Selection & Placement

`layerAddMountainsPhysics` in `layers/mountains.js`:

- Obtains `mountainScore`/`hillScore` from `scores_matrix.js`.
- Uses **threshold-based selection** (`selectTilesAboveThreshold`) with:
  - Config thresholds for mountains/hills.
  - Landmask gating (`ctx.buffers.heightfield.landMask` first, then adapter).
- Writes terrain via `writeHeightfield`.

The “Fail Hard” ethos remains:

- If scores never exceed thresholds (e.g., config or matrix bug), mountain counts can be low/zero, but this should be rare once the crust-based landmask ensures reasonable `mountainFavor` bands inside land.

---

## 7. Integration with Existing Pipeline

### 7.1 Stage Ordering (Manifest)

Ensure manifest order (or explicit comments) reflects:

1. `foundation` – WorldModel init, plates Voronoi, movement, boundaries.
2. `platesCrust` (new internal stage, likely part of foundation) – crust typing + base elevation.
3. `landmassPlates` – base heightfield + sea level + landmask/windows.
4. `coastlines` – coastline refinement using landmask + baseHeight + boundary matrix.
5. `mountainsPhysics` – matrix-driven mountain/hill placement.
6. Other morphology (rivers, climate, overlays).

### 7.2 Backward Compatibility / API Contracts

We maintain:

- `WorldModel` API:
  - Existing tensors stay (boundaryCloseness, shieldStability, upliftPotential, riftPotential).
  - New tensors added (`crustType`, `baseElevation`, possibly `plateCrustType`).
- `MapContext` / `FoundationContext`:
  - Foundation includes new `plates.crust` group documenting crust-related config and derived tensors.
  - Downstream stages can query `ctx.foundation.plates.crust` instead of re-deriving.

Landmass return shape:

- Still returns `windows`, `startRegions`, `landMask`, plus any useful diagnostics (landTiles, seaLevel).

---

## 8. Implementation Phases & Risk

### Phase A – Crust Typing & Base Heightfield

- Add `lib/plates/crust_types.js`.
- Extend `world/plates.js` and/or `WorldModel.init` to:
  - Build `plateCrustType` / `plateBaseElevation`.
  - Generate tile-level `crustType` / `baseElevation`.
- Add `lib/heightfield/base_heightfield.js` and `sea_level.js`.
- Refactor `landmass_plate.js` to:
  - Consume `baseHeight` + `seaLevel`.
  - Produce landmask/windows without relying on `shieldStability + boundaryBias * closeness`.

Risk: Medium — changes how land is decided. Mitigation: add detailed dev logs (histograms, percentiles, ASCII) and feature flags for temporary fallback during development.

### Phase B – Tectonic Matrix & Mountains Refactor

- Add `lib/tectonics/uplift_matrix.js`:
  - Build matrix fields (`mountainFavor`, `hillFavor`, `riftValleyFavor`, etc.).
- Add `lib/mountains/scores_matrix.js`:
  - Implement matrix-based mountain/hill scoring logic.
- Refactor `layers/mountains.js` to:
  - Use matrix scores.
  - Keep threshold-based selection and landmask gating.

Risk: Medium — changes mountains distribution. Mitigation: strong logging (`LOG_MOUNTAINS`), ASCII ridges, and count summaries.

### Phase C – Cleanup & Modularization

- Gradually move shared clamps, probes, and diagnostic helpers into `lib/util/`.
- Simplify orchestrator files and update docs to reflect new composition style.
- Optionally split more stages (coasts, rivers) into lib components following the same pattern.

---

## 9. Diagnostics & Validation Checklist

For each phase, validate via:

- **Landmass diagnostics:**
  - Log baseHeight min/max/percentiles.
  - Log `seaLevel` and land/water counts vs target.
  - ASCII map showing continent cores vs oceans (without mountains).
- **Tectonic matrix diagnostics:**
  - Histograms of `mountainFavor`, `hillFavor`, `riftValleyFavor` on land vs ocean.
  - Sample rows north–south to detect unintended biases.
- **Mountains diagnostics:**
  - Counts and percentages of mountains/hills.
  - Row-wise distribution to avoid bottom/edge aggregation artifacts.
  - Visual checks of ridges along convergent boundaries and rift valleys along divergent ones.
- **Start placement:**
  - Ensure reasonable continent windows and start plots post-refactor.

If any stage fails, logs should clearly indicate which buffer (crust, matrix, thresholds) is misbehaving so we can adjust the math, not just tune magic constants.
