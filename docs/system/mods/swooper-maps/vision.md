# Epic Diverse Huge Generator – Terrain & Plate Smash Plan

> Working design doc for improving the Civilization‑style “Epic Diverse Huge” map generator, with a focus on terrain distribution (mountains / hills / plains) and a plate‑aware “ceramic smash” landmass pipeline.

---

## High‑Level Structure

- [Goals](#goals)
- [System Overview](#system-overview)
- [Pipeline Summary](#pipeline-summary)
- [Detailed Stages](#detailed-stages)
  - [1. Plate and Boundary Input](#1-plate-and-boundary-input)
  - [2. Orogeny Field](#2-orogeny-field)
  - [3. Elevation Field](#3-elevation-field)
  - [4. Terrain Classification](#4-terrain-classification)
  - [5. Post‑Processing & Style Modes](#5-post-processing--style-modes)
  - [6. Debugging & Validation](#6-debugging--validation)
- [Implementation Plan](#implementation-plan)

```mermaid
flowchart LR
  A[Plate & Boundary Map<br/>+ Mode Config] --> B[Orogeny Field<br/>(mountain potential)]
  B --> C[Elevation Field<br/>+ Sea Level]
  C --> D[Terrain Classification<br/>(water / plains / hills / mountains)]
  D --> E[Post‑Processing<br/>(passes, ridge jitter, style modes)]
  E --> F[Outputs<br/>ASCII debug, game map, metadata]
```

---

## Goals

- Fix current “wall of mountains + bottom band of hills + almost no plains” behavior.
- Preserve the idea that mountains and hills are tectonically grounded (plates and boundaries still matter).
- Introduce a clean separation between:
  - Plate simulation / boundary layout.
  - Continuous heightfield computation.
  - Discrete terrain classification.
  - Presentation / debugging (ASCII art in logs).
- Support multiple world styles (Pangea, Continents, Archipelago) without rewriting core logic.
- Emit useful metadata (plate id, boundary type, orogeny strength) for future systems: climate, biomes, rivers, cultures.

---

## System Overview

Core concepts:

- **Grid:** Hex/square map represented in code as a 2D grid with indices `(x, y)`.
- **Fields:** Separate logical layers stored per cell:
  - `plateId` – which tectonic plate the cell belongs to.
  - `boundaryType` – convergent / divergent / transform / none.
  - `orogeny` – scalar mountain potential (0–1).
  - `elevation` – continuous height value.
  - `slope` – local gradient magnitude (derived from `elevation`).
  - `terrain` – discrete enum (Ocean / Coast / Plains / Hills / Mountains, etc.).
  - `biome` (future) – desert / forest / tundra, etc.
- **Modes:** High‑level style presets:
  - `PANGEA` – few, large landmasses; broad, continuous mountain chains.
  - `CONTINENTS` – several mid‑sized landmasses with moderate fragmentation.
  - `ARCHIPELAGO` – many small landmasses, lots of coastline and islands.

All terrain placement should flow through `orogeny → elevation → terrain`, not directly stamped mountains/hills.

---

## Pipeline Summary

1. **Plate & Boundary Input**
   - Consume existing plate / boundary solution (already logged as ASCII with `M`, `^`, `~`, `.` in the scripting log).
   - For each cell, know: `plateId` and whether it lies on a boundary, plus boundary type and relative convergence strength.

2. **Orogeny Field**
   - Create a scalar field representing “how strong mountain building should be” at each cell, based on convergent boundaries and plate stress.
   - Diffuse / blur this field to spread mountain influence a few tiles into the plate interiors.

3. **Elevation Field**
   - Combine:
     - Base continental vs. oceanic height.
     - Orogeny contribution.
     - Multi‑scale noise (large‑scale continents, smaller‑scale variation).
   - Choose a sea level so target land/ocean ratios are achieved.

4. **Terrain Classification**
   - Use **percentiles and slope** to map elevation to discrete terrain:
     - Highest percentiles + steep slopes → mountains.
     - Next band or moderate slopes → hills.
     - Remaining land above sea level → plains.
   - Ensure explicit targets for ratios (e.g., mountains 8–12% of land, hills 15–25%, rest plains).

5. **Post‑Processing & Style Modes**
   - Soften mountain walls, add passes and jitter.
   - Tune density, width, and continuity per mode (Pangea vs. Continents vs. Archipelago).

6. **Debugging & Validation**
   - ASCII prints per stage (orogeny, elevation bands, terrain).
   - Simple statistics: percentage of land that is mountains/hills/plains, average ridge width, etc.

---

## Detailed Stages

### 1. Plate and Boundary Input

**Inputs**

- Plate tessellation (from the game’s plate generator or imported dataset).
- Boundary classification for each pair of neighboring cells:
  - `convergent`, `divergent`, `transform`, `inactive`.
- Plate velocities and relative convergence speed (if available).

**Responsibilities**

- Produce these base fields:
  - `plateId[x, y]`
  - `boundaryType[x, y]`
  - Optional: `convergenceStrength[x, y]` (0–1).
- No terrain types are assigned here; this stage is tectonics‑only.

### 2. Orogeny Field

**Goal:** Translate boundaries into a smooth mountain‑building potential.

**Algorithm Sketch**

1. Initialize `orogeny[x, y] = 0`.
2. For every **convergent boundary cell**:
   - Set `orogeny[x, y] = baseConvergenceValue * convergenceStrength`.
3. Optionally seed elevated values at **triple junctions** or sharp bends in boundaries (these tend to be complex mountainous regions).
4. Run a **diffusion / blur** pass:
   - For `k` iterations (2–5):  
     `orogeny[x, y] = lerp(orogeny[x, y], average(neighbors’ orogeny), diffusionAlpha)`  
   - This spreads mountain potential 1–4 tiles away from the boundary and softens sharp lines.
5. Clamp `orogeny` to `[0, 1]`.

**Tuning**

- `baseConvergenceValue`, `convergenceStrength`, `k`, and `diffusionAlpha` control ridge width and intensity.
- Style modes can override these:
  - Pangea: higher base, wider ridges.
  - Archipelago: lower base, narrower ridges; more islands come from elevation noise instead.

### 3. Elevation Field

**Goal:** Produce a continuous heightmap that combines tectonics and noise.

**Components**

- `continentMask[x, y]` – large‑scale pattern distinguishing continental vs. oceanic crust.
- `noiseLarge[x, y]` – very low‑frequency noise for continent shapes.
- `noiseSmall[x, y]` – mid/hi‑frequency noise for local variation.

**Formula (conceptual)**

```text
base = mix(oceanFloorHeight, continentBaseHeight, continentMask)
tectonic = orogeny[x, y] * mountainScale
noise = noiseLarge * largeNoiseScale + noiseSmall * smallNoiseScale

elevation[x, y] = base + tectonic + noise
```

**Sea Level Selection**

- Choose `seaLevel` by:
  - Either a direct parameter (e.g., 30–40% of cells underwater), or
  - A percentile of the elevation distribution (e.g., `seaLevel = percentile(elevation, 0.35)`).
- A repeatable random seed ensures deterministic output for a given configuration.

### 4. Terrain Classification

**Goal:** Convert `elevation` (and derived `slope`) into discrete terrain, fixing the “no plains” problem.

**Derived Fields**

- Compute `slope[x, y]` from neighboring elevation values (gradient magnitude).
- For all land cells (`elevation > seaLevel`), compute elevation percentiles.

**Classification Strategy**

- For each cell:
  - If `elevation <= seaLevel`:
    - Use finer categories like deep ocean / shallow ocean / coast if desired.
  - Else (land):
    - Let `p = percentileRank(elevation among land cells)`.
    - Example thresholds:
      - `p >= 0.88` and `slope >= slopeHigh` → `Mountains`.
      - `0.70 <= p < 0.88` or `slope >= slopeMedium` → `Hills`.
      - Otherwise → `Plains`.

This guarantees that:

- At least ~12% of land becomes mountains.
- At least ~18% becomes hills.
- The remaining majority is plains (fixing the “normal land basically doesn't exist” issue).

**Hill Placement Improvements**

- Hills are **not** tied to a single latitude band.
- Hills naturally cluster:
  - Around mountains (distance‑to‑ridge effect).
  - In regions with moderate elevation variance even away from major ranges (e.g., uplands).

### 5. Post‑Processing & Style Modes

**Mountain Wall Softening**

- Identify **ridge lines**: contiguous patches of mountain cells where `orogeny` is high.
- For each ridge:
  - Enforce a maximum width (e.g., 1–3 tiles). Extra layers downgraded to hills.
  - Randomly carve **passes**:
    - Pick a few positions along each ridge.
    - Downgrade cell(s) from `Mountain → Hill → Plains` to create gaps.
  - Apply a small amount of morphological erosion/dilation to avoid perfect straight segments.

**Jitter**

- Multiply the mountain mask by a low‑frequency noise field before final classification:
  - Slightly displaces where the highest `orogeny` values actually hit threshold.
  - Produces bulges, forks, and isolated high peaks.

**Style Modes**

- `PANGEA`
  - Fewer plates, high `continentMask` coherence.
  - Stronger orogeny and wider ridges.
  - Slightly lower sea level (more landmass).
- `CONTINENTS`
  - Moderate number of plates and boundaries.
  - Balanced orogeny strength.
  - Sea level tuned so ocean coverage ~55–65%.
- `ARCHIPELAGO`
  - Many plates and microplates.
  - Lower orogeny; mountains less dominant.
  - Higher sea level; islands emerge from noise patterns and thinned continents.

### 6. Debugging & Validation

**ASCII Debug Layers**

- Stage‑specific dumps to the scripting log, each labeled clearly:
  - `OROGENY FIELD` – map of `orogeny` using characters like ` . : * M` by intensity.
  - `ELEVATION BANDS` – coarse elevation ranges (e.g., A/B/C/D) before terrain classification.
  - `TERRAIN TYPES` – final `~ . ^ M` map (water / plains / hills / mountains).

**Statistics**

- After generation, log:
  - Land vs. water percentage.
  - Mountain / hill / plains percentages (of land).
  - Average ridge length and width.
  - Hill density vs. distance from nearest mountain.

These metrics make it trivial to tell when changes have broken the expected distribution, even without visually inspecting ASCII.

---

## Implementation Plan

This plan assumes the existing Civ VII scripts are refactorable into smaller helpers; function names are illustrative, not prescriptive.

1. **Introduce Continuous Fields (Non‑Breaking)**
   - Add internal storage for `orogeny` and `elevation` alongside any existing height/terrain grids.
   - Keep current terrain stamping logic intact while scaffolding the new fields.

2. **Implement `computeOrogenyField`**
   - Extract all “mountains from boundaries” logic into a pure function that:
     - Reads plate IDs and boundary types.
     - Returns an `orogeny` scalar per cell.
   - Replace direct “mountain on line” writes with orogeny seeding + diffusion.

3. **Implement `computeElevation`**
   - Introduce continent vs. ocean base heights.
   - Layer in `orogeny` and noise as described.
   - Choose sea level by target water ratio.

4. **Implement `classifyTerrain`**
   - New pure function that:
     - Takes `elevation`, `slope`, `seaLevel`, and style mode.
     - Computes percentiles on land cells.
     - Emits terrain types (`Ocean / Coast / Plains / Hills / Mountains`).
   - Redirect all terrain placement to go through this classifier.

5. **Add Post‑Processing**

   - Implement ridge detection and mountain‑wall softening (passes, width constraints, small erosions).
   - Add jitter via low‑frequency noise in orogeny or mountain thresholds.

6. **Wire Style Modes**

   - Define a small configuration struct per mode:

     ```text
     struct WorldgenModeConfig {
       name: PANGEA | CONTINENTS | ARCHIPELAGO
       targetWaterFraction
       orogenyBase
       orogenyDiffusionSteps
       mountainPercentile
       hillPercentile
       ridgeMaxWidth
       noiseScales
     }
     ```

   - Pass this config through the pipeline so each stage can adjust behavior without conditionals scattered everywhere.

7. **Improve Debug/Logs**

   - Replace single‑stage ASCII dump with:
     - One line announcing each stage.
     - Optional per‑stage maps (toggleable via a debug flag).
     - Summary statistics for terrain distribution.

8. **Iterative Tuning**

   - Use a fixed seed and consistent camera/log zoom to:
     - Compare old vs. new terrain outputs.
     - Tweak percentiles, ridge widths, diffusion steps, and noise scales.
   - Capture “good” parameter sets as named presets checked in with the code.

Once these steps are done, the generator should:

- Still honor plate boundaries for mountain placement.
- Avoid giant, perfectly linear walls of `M`.
- Distribute hills as a natural transition between mountains and plains instead of a hard latitudinal band.
- Guarantee a healthy amount of “normal” land for cities, resources, and adventures.

