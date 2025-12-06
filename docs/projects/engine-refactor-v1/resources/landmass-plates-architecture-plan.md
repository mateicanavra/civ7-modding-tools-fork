# Plate-Driven Landmass Architecture – Fix Plan (Core vs Boundary Scoring v1)

## 1. Background & Problem Statement

Swooper Maps now routes landmass generation through the physics stack:

- `WorldModel` (`mod/maps/world/model.js`) precomputes plate tensors via `computePlatesVoronoi` in `world/plates.js` and exposes:
  - `plateId`, `boundaryCloseness`, `boundaryType`, `shieldStability`, `upliftPotential`, `riftPotential`, etc.
- `createPlateDrivenLandmasses` in `mod/maps/layers/landmass_plate.js`:
  - Scores each tile using a linear combination of `shieldStability` and `boundaryCloseness`.
  - Uses a binary search on a global score threshold to hit the target land/sea ratio.
  - Adjusts the threshold to ensure a minimum share of land in a high-closeness “boundary band”.
- `map_orchestrator.js` stamps continents from this plate-driven landmask, then subsequent stages (coasts, islands, mountains, climate, story overlays) build on top.

This works, but it bakes in several undesirable behaviors:

- Land is over-coupled to plate boundaries:
  - `shieldStability` is defined as `255 - boundaryCloseness` in `world/plates.js`, so boundary interior signals are perfectly complementary.
  - The land score today is basically: `shield + boundaryBias * closeness (+ convergent/divergent tweaks)`.
  - High `boundaryBias` pushes land to “hug” high-activity zones, encouraging snaky continents and over-strong coast/boundary correlation.
- The landmask is determined by a **global threshold** over all tiles:
  - This differs from the official Civ7 continent generator, which uses rule-driven region growth per landmass with neighbor-based scoring.
  - We still want to keep the simplicity of a threshold for now, but need to reshape the score so “cores” win over “rims” by default.
- Configuration hazards:
  - `LANDMASS_DEFAULT.boundaryBias` is relatively high (`0.6`), making it easy for presets to accidentally invert the intent (“land == boundary”).

From the official Civ7 side (`docs/civ7-official-repomix.xml::voronoi_generators/continent-generator.js`):

- Landmasses are grown iteratively as collections of Voronoi cells, using many rules (`RuleAvoidEdge`, `RuleNearNeighbor`, `RuleAvoidOtherRegions`, `RuleNearPlateBoundary`, etc.).
- Boundaries affect *where* land likes to grow, but land is not simply “top N tiles near the boundary”; it’s region-centric and blob-friendly.

We’re not going to reimplement that full rules engine in this phase, but we can move the current scoring closer to the same spirit:

- **Land is defined by plate cores (interiors), not by boundaries.**
- **Boundaries contribute uplift/opportunity for coastal mountains and island arcs, but they no longer unilaterally define land.**

## 2. Goals and Non-Goals

**Goals**

- Keep the physics pipeline (WorldModel + FoundationContext) intact; avoid breaking downstream consumers.
- Make continent shapes more “plate-core centric” and less boundary-hugging while staying in the existing landmass layer and threshold machinery.
- Introduce controlled, persistent noise to plate interiors so continents don’t look like pristine Voronoi polygons.
- Separate “core continent” vs “boundary uplift/island arc” contributions in land scoring and combine them in an intuitive way.
- Provide configuration guardrails so presets can’t easily drive the system into geologically implausible extremes.

**Non-Goals (for this iteration)**

- No full port of the official `ContinentGenerator` rule stack.
- No changes to WorldModel’s public tensor semantics (`shieldStability`, `boundaryCloseness`, etc.) that would break existing FoundationContext consumers.
- No new XML/game DB content; this is purely script-side behavior and config.

## 3. High-Level Design

We keep the existing architecture but adjust how the landmask is derived:

1. **Interior Robustness Metric (per tile)**
   - Derive an `interiorScore[i]` per tile that combines:
     - A core signal (`255 - boundaryCloseness[i]`).
     - A coarse tectonic noise field (via a dedicated fractal or equivalent).
   - This stays entirely inside the landmass layer; WorldModel’s `shieldStability` remains unchanged.

2. **Core vs Boundary Scoring**
   - Precompute two scores per tile:
     - `interiorScore[i]` – “how deep inside a plate is this tile, plus some noisy thickness variation?”
     - `arcScore[i]` – “how strong is the case for uplifted land at this boundary tile?”.
   - The final *land* score becomes:
     - `landScore[i] = max(interiorScore[i], arcScore[i])`.
   - Existing threshold search machinery in `createPlateDrivenLandmasses` uses `landScore` instead of the current linear combination.

3. **Landmask → Mountains Contract**
   - Confirm that the mountains layer respects the plate-driven landmask.
   - Optionally tighten mountains’ gating by consulting the heightfield landMask buffer (in addition to `adapter.isWater`) so submerged high-uplift tiles never receive land mountains.

4. **Config Guardrails & Geology Intent**
   - Harden `landmass` defaults and ranges to make boundary-focused settings safer.
   - Introduce controlled knobs for interior noise and boundary arcs.
   - Optionally layer a future `geology` intent group on top without breaking existing presets.

The key choice is to **localize the fix inside `landmass_plate.js`** wherever possible, keeping WorldModel and FoundationContext backwards-compatible for other stages.

## 4. Phase 1 – Interior Robustness Metric

### 4.1 Current Behavior

In `mod/maps/world/plates.js`, function `assignBoundaryTypesWithInheritance(...)` currently computes:

- `boundaryCloseness[i]` – a 0..255 closeness field via BFS from boundaries, with exponential decay.
- `shieldStability[i] = 255 - closeness255` – a simple complement.

Then in `mod/maps/layers/landmass_plate.js`, `computeLandScore(idx)` does roughly:

```js
const shieldVal = shield[idx] | 0;
const closenessVal = closeness[idx] | 0;
let score = shieldVal + Math.round(closenessVal * boundaryBias);
// convergent/divergent tweaks applied when closenessVal is high...
```

This means:

- Every increase in boundary closeness is automatically matched by a decrease in shield, and vice versa.
- The combined score is dominated by whichever term has the larger effective coefficient across the map; with high `boundaryBias`, boundaries win.

### 4.2 Proposed Interior Metric (Local to Landmass Layer)

Instead of changing WorldModel, we define a new *derived* interior metric baked into `createPlateDrivenLandmasses`:

- For each tile `i`:
  - Let `closeness[i]` be `WorldModel.boundaryCloseness[i]` (0..255).
  - Compute a baseline interior signal: `interiorBase = 255 - closeness[i]`.
  - Optionally modulate with a tectonic noise field `noise255[i]` in the same 0..255 range.

**Algorithm sketch inside `createPlateDrivenLandmasses`:**

```js
// Pseudocode inside createPlateDrivenLandmasses(width, height, ctx, options)
const size = width * height;
const interiorScore = new Uint8Array(size);

// Optional tectonic fractal, only if we have a context + adapter
const useFractal =
  !!ctx &&
  !!ctx.adapter &&
  typeof ctx.adapter.createFractal === "function" &&
  typeof ctx.adapter.getFractalHeight === "function";

const tectonicCfg = landmassCfg?.tectonics || {};
const noiseWeight = Number.isFinite(tectonicCfg.interiorNoiseWeight)
  ? Math.max(0, Math.min(1, tectonicCfg.interiorNoiseWeight))
  : 0.3; // default ~30% noise

const baseWeight = 1 - noiseWeight;

// Reserve a dedicated tectonic fractal ID for this mod.
// Base-standard map scripts use 0..2 (landmass, mountains, hills), so we claim 3.
const FRACTAL_TECTONIC_ID = 3;
const fractalGrain = Number.isFinite(tectonicCfg.fractalGrain)
  ? Math.max(1, tectonicCfg.fractalGrain | 0)
  : 4;

if (useFractal && noiseWeight > 0) {
  ctx.adapter.createFractal(FRACTAL_TECTONIC_ID, width, height, fractalGrain, 0);
}

for (let y = 0; y < height; y++) {
  const rowOffset = y * width;
  for (let x = 0; x < width; x++) {
    const idx = rowOffset + x;
    const closenessVal = closeness[idx] | 0; // 0..255
    const interiorBase = 255 - closenessVal;

    let noise255 = 128;
    if (useFractal && noiseWeight > 0) {
      const raw = ctx.adapter.getFractalHeight(FRACTAL_TECTONIC_ID, x, y) | 0; // 0..65535
      noise255 = raw >>> 8; // downscale by 256
    }

    // Center noise around 0, then blend with base interior signal.
    const centeredNoise = noise255 - 128; // -128..127
    const noisy = interiorBase * baseWeight + centeredNoise * noiseWeight;
    const clamped = noisy < 0 ? 0 : noisy > 255 ? 255 : noisy;

    interiorScore[idx] = clamped & 0xff;
  }
}
```

**Key points:**

- This **does not modify** `WorldModel.shieldStability`; it works on `boundaryCloseness` and internal fractal noise.
- The noise is coarse and plate-scale controlled by `tectonicCfg.fractalGrain`, not high-frequency jitter.
- The fractal is created via the adapter, respecting the `EngineAdapter` contract and enabling test doubles in unit tests.

### 4.3 Config Surface

Extend `LANDMASS_DEFAULT` in `mod/maps/bootstrap/defaults/base.js`:

```js
const LANDMASS_DEFAULT = Object.freeze({
  baseWaterPercent: 64,
  waterThumbOnScale: -4,
  jitterAmpFracBase: 0.03,
  jitterAmpFracScale: 0.015,
  curveAmpFrac: 0.05,
  // Mild default coupling to boundaries; cores remain the primary driver.
  boundaryBias: 0.25,
  // Soft backstop: minimum desired share of land in a high-closeness band.
  boundaryShareTarget: 0.15,
  tectonics: Object.freeze({
    interiorNoiseWeight: 0.3,  // 0..1, blend weight for tectonic noise
    fractalGrain: 4,           // coarse tectonic blobs
  }),
  geometry: Object.freeze({
    post: Object.freeze({
      expandTiles: 0,
      expandWestTiles: 0,
      expandEastTiles: 0,
    }),
  }),
});
```

These fields are read via `LANDMASS_CFG` and passed into `createPlateDrivenLandmasses` through `options.landmassCfg` (already present).

## 5. Phase 2 – Core vs Boundary Scoring

### 5.1 Current Behavior

Today `createPlateDrivenLandmasses` does:

- `computeLandScore(idx)`:
  - Base: `shield[idx] + boundaryBias * closeness[idx]`.
  - If `closeness >= convergentClosenessThreshold`:
    - Convergent: add `closeness * convergentLandBonus`.
    - Divergent: subtract `closeness * divergentOceanPenalty`.
- Binary search over score thresholds to hit `targetLandTiles` (subject to `closenessLimit`).
- A follow-up sweep to ensure a minimum share of high-closeness land near boundaries (via `boundaryShareTarget` and a secondary threshold scan).
- Rasterization: any tile with `score >= threshold && closeness <= closenessLimit` becomes land.

This couples land to `shield`+`closeness` in a way that’s hard to untangle.

### 5.2 Proposed Scores

We introduce:

- `interiorScore[idx]` – from Phase 1.
- `arcScore[idx]` – boundary uplift/island-arc score.
- `landScore[idx] = max(interiorScore[idx], arcScore[idx])`.

**Arc score design:**

- Use boundary type, closeness, and (optionally) the same tectonic fractal noise:

```js
const arcCfg = landmassCfg?.tectonics || {};
const arcWeight = Number.isFinite(arcCfg.boundaryArcWeight)
  ? Math.max(0, Math.min(2, arcCfg.boundaryArcWeight))
  : 0.8;

const arcNoiseWeight = Number.isFinite(arcCfg.boundaryArcNoiseWeight)
  ? Math.max(0, Math.min(1, arcCfg.boundaryArcNoiseWeight))
  : 0.5;

const rawArc = closenessVal; // 0..255
let arc = rawArc;

// Emphasize convergent boundaries; suppress divergent
if (bType === BOUNDARY_TYPE.convergent) {
  arc = rawArc * arcWeight;
} else if (bType === BOUNDARY_TYPE.divergent) {
  arc = rawArc * 0.25; // mostly discourage arcs in rifts
} else {
  arc = rawArc * 0.5;
}

// Optional raggedness via fractal
if (useFractal && arcNoiseWeight > 0) {
  const raw = ctx.adapter.getFractalHeight(FRACTAL_TECTONIC_ID, x, y) | 0;
  const noise255 = raw >>> 8;
  const noiseNorm = noise255 / 255; // 0..1
  const noiseMix = 0.5 + (noiseNorm - 0.5) * arcNoiseWeight; // ~[0.5, 1.5]
  arc *= noiseMix;
}

const arcScore = arc > 255 ? 255 : arc < 0 ? 0 : arc;
```

**Final land score:**

```js
const landScore = interiorScore[idx] >= arcScore ? interiorScore[idx] : arcScore;
```

We precompute `interiorScore[idx]`, `arcScore[idx]`, and `landScore[idx]` once in the outer loop; `computeLandScore(idx)` becomes a trivial accessor over `landScore`.

### 5.3 Thresholding & Boundary Share Logic

We keep the existing binary search machinery but change both the core score and how boundary share is enforced:

```js
const landScore = new Uint16Array(size); // allow >255 intermediate, clamp when needed

// After filling interiorScore and arcScore:
for (let i = 0; i < size; i++) {
  const core = interiorScore[i] | 0;
  const arc = arcScore[i] | 0;
  const s = core >= arc ? core : arc;
  landScore[i] = s;
}

const computeLandScore = (idx) => landScore[idx] | 0;
```

Then the existing helpers (`countTilesAboveTyped`, `computeShares`, main rasterization) operate on `computeLandScore(idx)`, with these updated semantics:

1. **Closeness Limit**
   - We continue to respect `closenessLimit` to avoid selecting tiles extremely close to the boundary when config wants that behavior.
   - We can either keep the current `closenessLimit = MAX_CLOSENESS_LIMIT` default, or reintroduce `computeClosenessLimit(postCfg)` so presets can narrow/widen the active band consistently for both cores and arcs.

2. **Boundary Share Target (Soft Backstop)**
   - Instead of forcefully increasing boundary land regardless of the physics-driven score, we treat `boundaryShareTarget` as a soft backstop:
     - After finding the best threshold via binary search, compute the actual boundary land share using `landScore` and the current high-closeness band (unchanged helper).
     - If the measured share is already ≥ `boundaryShareTarget`, accept the threshold as-is and skip any further lowering.
     - If the measured share is below the target, optionally lower the threshold in small steps, but:
       - Stop as soon as the boundary share reaches or slightly exceeds the target, or
       - Stop once total land exceeds `targetLandTiles` by a small factor (for example, +2–3%) to avoid large overshoot.
   - With this behavior, `interiorScore` and `arcScore` remain the primary drivers of land; `boundaryShareTarget` only nudges the threshold when boundaries are severely under-represented.

### 5.4 Implementation Notes

**Indexing `(x, y)` correctly**

The current landmass code passes only `idx` into `computeLandScore`. For arc noise, we need `(x, y)` for fractal sampling. Implementation options:

- Option A (recommended): Precompute `interiorScore`, `arcScore`, and `landScore` entirely in the main `y/x` loops before defining `computeLandScore`. That way we never compute `(x, y)` inside `computeLandScore`.
- Option B: Compute `x` and `y` from `idx` via `x = idx % width`, `y = (idx / width) | 0` if later code wants to recalc scores lazily.

We should pick **Option A** to avoid recomputation and keep the hot path simple.

**Context-less fallback**

If `ctx` or `ctx.adapter` isn’t available (e.g., legacy code paths that call `createPlateDrivenLandmasses` without a context), we:

- Skip fractal creation and noise; `interiorScore` degenerates to pure `255 - closeness`, and `arcScore` uses only `boundaryType` and `closeness` (no noise).
- Behavior remains deterministic and simple, though less blobby.

## 6. Phase 3 – Landmask → Mountains Contract

### 6.1 Current Contract

`map_orchestrator.js` already:

- Runs `createPlateDrivenLandmasses(...)` with a live `MapContext`.
- Writes terrain and land/water flags via `writeHeightfield(ctx, x, y, { terrain, elevation, isLand })` inside the landmass rasterization loop.
- Calls:
  - `TerrainBuilder.validateAndFixTerrain()`
  - `AreaBuilder.recalculateAreas()`
  - `TerrainBuilder.stampContinents()`

before running mountains and other morphology.

`layerAddMountainsPhysics(ctx, options)` in `mod/maps/layers/mountains.js`:

- Computes placement scores using WorldModel tensors (`upliftPotential`, `boundaryType`, `boundaryCloseness`, `riftPotential`) plus fractal noise.
- Uses `adapter.isWater(x, y)` in selection helpers (`selectTilesAboveThreshold`, `selectTopTiles`) to skip water tiles.
- Includes diagnostic logic that already inspects `ctx.buffers.heightfield.landMask` to understand uplift/closeness on land only.

### 6.2 Proposed Tightening

To make the dependency explicit and robust:

1. Define an `isWater` helper in mountains that prefers the heightfield landMask when present:

   ```js
   function isWaterTile(ctx, adapter, x, y) {
     const dims = ctx?.dimensions || {};
     const width = dims.width | 0;
     const height = dims.height | 0;

     if (width > 0 && height > 0 && ctx?.buffers?.heightfield?.landMask) {
       const i = y * width + x;
       const lm = ctx.buffers.heightfield.landMask;
       if (i >= 0 && i < lm.length) {
         return lm[i] === 0;
       }
     }

     return adapter.isWater(x, y);
   }
   ```

2. Use `isWaterTile` in:
   - The `landTiles` counting loop at the start of `layerAddMountainsPhysics`.
   - `selectTilesAboveThreshold` and `selectTopTiles` instead of directly calling `adapter.isWater`.

This guarantees that:

- Mountains never appear where the landmass pass explicitly said “this is water”, even if the engine’s `GameplayMap.isWater` lags or diverges in edge cases.
- Underwater high-uplift convergence zones remain available for future seamount/trench work without accidentally getting land mountains.

Underwater convergence enhancements (e.g., reef or trench placement based on upliftPotential in water tiles) are explicitly left as **future work**.

## 7. Phase 4 – Config Guardrails and Geology Intent

### 7.1 Harden Landmass Defaults and Ranges

In `mod/maps/bootstrap/defaults/base.js` today:

```js
const LANDMASS_DEFAULT = Object.freeze({
  baseWaterPercent: 64,
  waterThumbOnScale: -4,
  jitterAmpFracBase: 0.03,
  jitterAmpFracScale: 0.015,
  curveAmpFrac: 0.05,
  boundaryBias: 0.25,
  boundaryShareTarget: 0.15,
  geometry: { ... },
});
```

We should:

1. Lower the default `boundaryBias` into a safer band (e.g., `0.2`–`0.3`) to align with the “core-first” philosophy.
2. Clamp `boundaryBias` at runtime inside `createPlateDrivenLandmasses`:
   - `const boundaryBias = Math.max(0, Math.min(0.4, landmassCfg.boundaryBias ?? 0.25));`
3. Clarify that `boundaryShareTarget` is now a soft backstop:
   - It is only used when boundary land is severely under-represented; it does not override the physics-driven scoring when arcs already produce enough boundary land.
4. Introduce a small set of tectonic tuning knobs:

   ```js
   tectonics: Object.freeze({
     interiorNoiseWeight: 0.3,      // 0..1
     fractalGrain: 4,               // 1..8, coarse tectonic blobs
     boundaryArcWeight: 0.8,        // 0..1.5, convergent arc strength multiplier
     boundaryArcNoiseWeight: 0.5,   // 0..1, how ragged arcs are
   }),
   ```

Presets can override these, but clamping in `createPlateDrivenLandmasses` ensures we don’t exceed safe ranges even if a preset goes wild.

### 7.2 Optional Future: `geology` Intent Group

In a later phase (not required to fix the current issue), we can introduce a high-level `geology` group in the config:

```ts
type GeologyTectonicActivity = "oldStable" | "active" | "volcanic";

interface GeologyConfig {
  tectonicActivity: GeologyTectonicActivity;
}
```

Then in `bootstrap/resolved.js`, we can add a helper:

```js
function deriveGeologyTuning(geology) {
  const activity = geology?.tectonicActivity || "active";
  switch (activity) {
    case "oldStable":
      return {
        landmass: {
          tectonics: {
            interiorNoiseWeight: 0.2,
            boundaryArcWeight: 0.4,
          },
        },
        mountains: {
          tectonicIntensity: 0.7,
        },
      };
    case "volcanic":
      return {
        landmass: {
          tectonics: {
            interiorNoiseWeight: 0.35,
            boundaryArcWeight: 1.2,
          },
        },
        mountains: {
          tectonicIntensity: 1.3,
        },
      };
    case "active":
    default:
      return {
        landmass: {
          tectonics: {
            interiorNoiseWeight: 0.3,
            boundaryArcWeight: 0.8,
          },
        },
        mountains: {
          tectonicIntensity: 1.0,
        },
      };
  }
}
```

This helper’s output can be merged into the resolved config before `tunables.rebind()`, keeping it optional and non-breaking for existing presets that don’t specify `geology` at all.

## 8. Migration & Compatibility

**WorldModel and FoundationContext**

- No changes to:
  - `WorldModel.boundaryCloseness`
  - `WorldModel.shieldStability`
  - `WorldModel.upliftPotential`, `riftPotential`
  - `createFoundationContext` or its `plates` fields
- All changes are contained within `createPlateDrivenLandmasses` and the mountains layer’s interpretation of the landmask, plus configuration defaults.

**Landmass Layer API**

- `createPlateDrivenLandmasses` still returns:
  - `windows: Array<{ west, east, south, north, continent }>`
  - `landMask: Uint8Array`
  - `landTiles: number`
  - `threshold: number`
- Callers (`map_orchestrator.js`, story tagging, etc.) remain unchanged.

## 9. Implementation Checklist

**1. `mod/maps/layers/landmass_plate.js`**

- [ ] Add `tectonics` config handling (`interiorNoiseWeight`, `fractalGrain`, `boundaryArcWeight`, `boundaryArcNoiseWeight`).
- [ ] Create an optional tectonic fractal via `ctx.adapter.createFractal` when `ctx` and adapter are present.
- [ ] Precompute `interiorScore`, `arcScore`, and `landScore` in the main `(y, x)` loops.
- [ ] Replace `computeLandScore` with a simple accessor over `landScore[idx]`.
- [ ] Keep the existing binary search, but update the boundary-share adjustment to treat `boundaryShareTarget` as a soft backstop (skip adjustment when arcs already provide enough boundary land; cap overshoot when lowering the threshold).
- [ ] Respect a clamped `boundaryBias` for any residual logic that still uses it.

**2. `mod/maps/bootstrap/defaults/base.js`**

- [ ] Extend `LANDMASS_DEFAULT` with the `tectonics` block described above.
- [ ] Reduce the default `boundaryBias` and document the new “core-first” range and the soft-backstop semantics for `boundaryShareTarget` in comments.

**3. `mod/maps/layers/mountains.js`**

- [ ] Add an `isWaterTile(ctx, adapter, x, y)` helper that prefers `ctx.buffers.heightfield.landMask` when present.
- [ ] Use `isWaterTile` in the land tile counting loop and selection helpers (`selectTilesAboveThreshold`, `selectTopTiles`) instead of directly calling `adapter.isWater`.

**4. `mod/maps/map_orchestrator.js`**

- [ ] Verify (and document) that the stage manifest order still guarantees: `foundation` → `landmassPlates` → `coastlines` → `mountains`.

**5. Docs**

- [ ] Update `docs/system/mods/swooper-maps/design.md` to mention:
  - The new core vs boundary scoring model.
  - How `landmass.tectonics.*` knobs influence continent shapes.
  - The expectation that land is plate-core-defined, boundaries are uplift opportunities.

Once these steps are implemented, we should be able to:

- Maintain compatibility with existing presets and downstream systems.
- Produce more geologically plausible continent shapes centered on plate interiors.
- Retain boundary-driven uplift and island arcs without making “plate boundary == land” the default. 
