# Spike: Hydrology Domain — Phase 2 Modeling

> **Status:** Canonical (Phase 2 modeling spike; model-first; no slice plan)
>
> **Scope:** Hydrology vertical refactor target model. Hydrology is a single umbrella domain with internal subdomains:
> - Oceanography
> - Climatology (Atmosphere)
> - Cryosphere
> - Surface Hydrology
>
> **Primary deliverables:**
> - Locked authoritative model + domain boundaries
> - Causality spine (step/stage decomposition)
> - Canonical contract surfaces (inputs/outputs)
> - Producer/consumer map (current vs target)
> - Config semantics table (incl. default/empty/determinism/test semantics)
> - Lookback 2

---

## 0) Authority stack

**Authoritative (this refactor):**
1. **This document** (Phase 2 hydrology modeling spike) — the locked model and contracts.
2. `hydrology.md` — canonical *domain meaning + output spine*; this doc extends it with a locked internal model and stricter bans (notably: bans on story-driven overrides).

**Supporting references (non-canonical):**
- Earth-physics modeling spikes (oceanography/climatology/hydrology abstractions).
- Civ7 mapgen feature inventory and gameplay touchpoints evidence.

**Policy:**
- Projections (engine-facing fields) never define internal representation.
- Compatibility is forbidden *inside* Hydrology; if compatibility shims are needed, they live downstream and are explicitly deprecated.

---

## 1) Goals

1. **Physics-first causality (game-scale):** climate + water are derived from landforms + global drivers using field/graph operations.
2. **Deterministic:** same seed + same config => same outputs.
3. **Explainable:** every macro outcome has an inspectable chain of causes (winds → moisture transport → orography → precipitation; precip → runoff → discharge → rivers).
4. **High fidelity where it matters:** explicit modeling of atmospheric circulation, ocean heat transport, cryosphere/albedo feedback, and hydrologic routing.
5. **No author thumb-on-scale:** remove story/hand-edited overrides from Hydrology. Only allow physically meaningful knobs that resolve to internal parameters.
6. **Pipeline-friendly:** fits the sequential stage execution model; uses 1–3 simulation passes (no heavy iterative solvers).

## 2) Non-goals

- Full Navier–Stokes atmosphere/ocean simulation.
- Runtime, in-game climate evolution; this is mapgen-time equilibrium modeling.
- Biome or soil ownership inside Hydrology (those belong to Ecology/Pedology).
- Region- or tile-specific authored overrides inside Hydrology.

---

## 3) Domain boundaries and responsibilities

### Boundary table

| Domain | Owns | Does **not** own |
|---|---|---|
| Foundation | Mesh topology; plates/crust material+age; tectonic potentials | Any climate/water placement logic |
| Morphology | Elevation & land/ocean mask; terrain roughness/cliffs; erosion products (optional flow skeleton) | Final rainfall, rivers, lakes |
| **Hydrology (this doc)** | Climate fields (temperature, wind, precipitation, aridity/freeze); ocean heat transport; cryosphere (snow/ice, albedo feedback); surface routing (rivers/lakes/wetness) | Biomes, soils, resources; authored story overrides |
| Ecology | Biomes/features, soils/pedology, resources | Climate simulation; river/lake solving |
| Placement/GamePlay | Starts, wonders, content placement decisions that depend on climate+water | Physical climate/water computation |
| Narrative | Story overlays derived from climate/water outputs | Forcing climate outcomes inside Hydrology |

### Critical interface notes

- Downstream gameplay/placement logic explicitly scores and biases starts by rivers/coasts/lakes and runs post-processing like water-data storage and fertility recalculation. Hydrology must provide stable river/lake products suitable for these consumers.
- Civ7 gameplay includes a meaningful distinction between **minor rivers (edge rivers)** and **navigable rivers (tile-center rivers treated as water tiles)**; Hydrology must support this classification.

---
## 4) Authoritative model

Hydrology models the **planetary water + energy system** at mapgen time as a quasi-equilibrium state:

- **Energy**: insolation → temperature field (with lapse rate + albedo feedback)
- **Atmospheric circulation**: pressure belts → prevailing winds (plus jetstream-strength proxy)
- **Ocean heat engine**: winds + basins → surface currents → sea-surface temperature (SST)
- **Water cycle**: evaporation + moisture advection + orographic lift → precipitation
- **Surface routing**: precipitation + elevation → runoff/discharge → rivers/lakes/wetness

### 4.1 Internal representation vs projections

- **Internal representation** lives in `artifacts.*` and typed buffers. It is the source of truth.
- **Projections** live in `fields.*` and are written only when needed for engine compatibility (e.g., quantized rainfall bands). Projections must be derivable from artifacts.

### 4.2 Canonical artifacts

The artifacts below are the locked surfaces Hydrology produces.

#### Climate artifact

```ts
interface ClimateArtifact {
  /** Air temperature (annual mean), scaled degrees C * 10. */
  tempC_x10: Int16Array;

  /** Annual precipitation in millimeters (unquantized; not a 0-255 band). */
  precipMm: Uint16Array;

  /** Potential evapotranspiration proxy (annual mm). */
  petMm: Uint16Array;

  /** Prevailing surface wind vector (quantized unit-ish). */
  windU_q: Int8Array;
  windV_q: Int8Array;

  /** 0..255 dryness proxy derived from precip + PET. */
  aridity_q: Uint8Array;

  /** 0..255 freezing proxy derived from temp + elevation/latitude. */
  freeze_q: Uint8Array;

  /** 0..255 seasonality proxy (optional but recommended). */
  seasonality_q?: Uint8Array;

  /** Diagnostics: provenance of wet/dry decisions (optional). */
  debug?: {
    reasonCode?: Uint8Array;
    moistureRemaining_q?: Uint8Array;
  };
}
```

#### Ocean artifact

```ts
interface OceanArtifact {
  /** Basin id per cell (0 for land). */
  basinId: Uint16Array;

  /** Sea surface temperature (C * 10); undefined for land. */
  sstC_x10: Int16Array;

  /** Surface current vector (quantized). */
  currentU_q: Int8Array;
  currentV_q: Int8Array;

  /** 0..255 sea ice coverage fraction. */
  seaIce_q: Uint8Array;

  /** Optional bathymetry/depth (meters, negative for depth). */
  bathymetryM?: Int16Array;
}
```

#### Surface hydrology artifact

```ts
type EdgeMask6 = Uint8Array; // 6 low bits = per-edge mask

interface SurfaceHydrologyArtifact {
  /** Flow direction as neighbor index (0..5) or 255 for sink. */
  flowDir6: Uint8Array;

  /** Flow accumulation / discharge proxy (scaled). */
  discharge_q: Uint16Array;

  /** Edge rivers: bitmask of river edges per cell. */
  riverEdgeMask6: EdgeMask6;

  /** Edge navigability: subset of riverEdgeMask6 for navigable segments. */
  navigableEdgeMask6: EdgeMask6;

  /** Navigable river cells (tile-center rivers treated as water tiles). */
  navigableRiverCell_q: Uint8Array; // 0..255 width proxy

  /** Lake id per cell (0 means no lake). */
  lakeId: Uint16Array;

  /** 0..255 wetness proxy for wetlands/floodplains. */
  wetness_q: Uint8Array;

  /** Optional drainage basin id per cell (for debugging + downstream). */
  basinId?: Uint16Array;

  /** Optional endorheic flag per basin id (debug struct). */
  basinIsEndorheic?: Uint8Array;
}
```

### 4.3 Canonical outputs required by downstream domains

- **Ecology** must consume `ClimateArtifact.tempC_x10`, `precipMm`, `aridity_q`, `freeze_q`, plus `SurfaceHydrologyArtifact.wetness_q` for wetlands.
- **Placement/GamePlay** must consume river/lake presence and navigability (for starts, trade, and content placement).

---

## 5) Causality spine (locked)

Hydrology executes as a **multi-stage internal pipeline** under the Hydrology umbrella domain. Stages are sequential but may contain multiple steps/ops.

### Stage H0 — Preconditions & coordinate signals

**Inputs:** elevation + land/ocean mask (from Morphology), latitude/wrap semantics (global).

**Outputs:** per-cell coordinate helpers:
- latitude (if not already present)
- distance-to-coast (optional helper)
- land/ocean classification stability check

**Invariant:** land/ocean mask is final for hydrology; Hydrology does not change sea level.

### Stage H1 — Atmospheric baseline (insolation → temperature + winds)

1. Insolation model (latitude + axial tilt) → baseline temperature.
2. Lapse rate correction using elevation.
3. Pressure belts + 3-cell circulation approximation → wind vectors.

**Outputs:** Climate buffer: temp, wind.

### Stage H2 — Oceanography (winds + basins → currents → SST → sea ice)

1. Basin identification (flood fill on ocean mask) → basinId.
2. Current vector field construction (wind + gyres + coast-tangent).
3. SST advection/diffusion along currents.
4. Sea ice thresholding from SST.

**Outputs:** Ocean artifact (basinId, currents, SST, seaIce).

### Stage H3 — Atmospheric moisture transport + precipitation (SST → evaporation → orographic rainfall)

1. Evaporation source strength from SST (ocean) and temperature (land).
2. Moisture advection along winds (water-bucket model) with moisture conservation.
3. Orographic lift (windward ascent) → precipitation extraction.
4. Rain shadow: lee-side moisture depletion.

**Outputs:** Climate buffer: precip.

### Stage H4 — Cryosphere + albedo feedback (1 iteration)

1. Land snow/ice eligibility from temperature + precip + elevation.
2. Albedo adjustment (cool icy tiles) → temperature correction.
3. Recompute freeze index.

**Outputs:** Climate artifact final (temp/precip/aridity/freeze).

### Stage H5 — Surface routing (precip + elevation → rivers/lakes/wetness)

1. Depression filling (for valid drainage topology).
2. Flow direction solving (steepest descent).
3. Flow accumulation / discharge from precipitation (and snowmelt proxy where relevant).
4. River extraction:
   - edge rivers from discharge threshold
   - navigable classification from higher discharge threshold
   - optional conversion to navigable river *cells* in low-gradient reaches
5. Lake formation from filled depressions; endorheic identification.
6. Wetness index from (precip + discharge + slope - PET).

**Outputs:** SurfaceHydrology artifact.

### Stage H6 — Projection & publish

1. Publish artifacts to context.
2. Emit optional engine-facing fields:
   - rainfall band (0..255)
   - river adjacency masks (if needed by engine API)

**Invariant:** Projections are derivable; they do not add semantics.

---

## 6) Contract surfaces (locked)

### 6.1 Upstream intake (required)

| Upstream | Required | Optional | Change-candidates |
|---|---|---|---|
| Morphology | elevation; land/ocean mask | slope; cliffs; flow skeleton | Provide explicit coast distance; bathymetry; cliff edges for waterfalls |
| Foundation | mesh topology | crust/age; plate hints | Promote crust/age as stable artifacts |
| Global | latitude; wrap semantics; seed | map size metadata | Standardize coordinate mapping to avoid ad-hoc latitude lookups |

### 6.2 Downstream outputs (required)

| Consumer | Requires |
|---|---|
| Ecology | ClimateArtifact + wetness_q + lake/riv proximity |
| Placement | river/lake presence + navigability + coasts |
| Narrative | read-only access to climate/hydrology fields (no mutation) |
| Gameplay scripts | water data and fertility recalculation inputs |

---

## 7) Upstream change proposals (to enable the model)

These are model-required changes (not a slice plan).

1. **Morphology must not place rivers/lakes.** It may output erosion-based flow skeletons, but Hydrology owns final routing.
2. **Provide bathymetry or a proxy:** Oceanography needs depth/shelf hints. If not available, Hydrology will approximate via distance-to-coast.
3. **Expose cliffs/steep edges:** If waterfalls or river-cliff interactions are gameplay-relevant, Morphology should expose cliff edges.
4. **Coordinate normalization:** Latitude and wrap semantics must be explicit, not hidden engine globals.

---

## 8) Downstream change proposals (to leverage the model)

1. **Ecology biome logic must be climate-driven** (temp/precip/aridity/freeze) rather than latitude bands.
2. **Placement must consume hydrology products** for start and content placement (rivers, lakes, coasts, navigability).
3. **Gameplay scripts that depend on water data** must read from Hydrology projections (river masks, lake masks) and/or artifacts.
4. **Kill any ecology-owned humidity proxies** that duplicate rainfall; replace with climate artifacts.

---

## 9) Modeling loop (required: 2 iterations)

### Iteration 1 (baseline model)

- H1: insolation + lapse rate → temp
- H1: 3-cell winds → wind field
- H3: moisture bucket + orography → rainfall
- H5: depression fill + discharge thresholds → rivers/lakes

**Result:** credible rain shadows and major drainage, but weak coastal climate realism (no SST) and weak ice-margin stability (no albedo feedback).

### Iteration 2 (stabilized model)

Add:
- H2: Oceanography (currents + SST + sea ice)
- H4: Cryosphere/albedo feedback pass
- Improve PET + aridity index and wetness proxy
- Lock river classification for minor vs navigable

**Result:** coastal anomalies become explainable (warm/cold currents), ice margins stabilize, and downstream consumers get complete climate fields.

**Model lock:** Iteration 2 is the authoritative model.

---

## 10) Config semantics table (semantic knobs)

> **All knobs are reclassified from scratch.** Any legacy keys are assumed **KILL** unless explicitly mapped in Phase 3.

Conventions:
- Missing = defaulted deterministically.
- Empty list/map = treated as “none” (not an override).
- Null = invalid (schema error) unless stated.

| Knob | Type | Meaning | Missing default | Empty behavior | Determinism constraints | Tests to lock semantics |
|---|---|---|---|---|---|---|
| planet.axialTiltDeg | number | Obliquity; drives seasonality/insolation | 23.5 | n/a | Pure function of config | Tilt=0 yields minimal seasonality_q |
| planet.solarConstant | number | Global temperature scale | 1.0 | n/a | Pure function | Increase => higher mean temp |
| planet.rotationSign | enum(+1/-1) | Coriolis sign affecting winds/gyres | +1 | n/a | Pure function | Flip => mirrored wind + currents |
| climate.lapseRateCPerKm | number | Temperature drop per km elevation | 6.5 | n/a | Pure function | Higher lapse => colder mountains |
| climate.hadleyExtentDeg | number | Cell boundary; impacts desert belt | 30 | n/a | Pure function | Wider extent shifts arid belt |
| climate.windStrength | number | Scales wind vectors | 1.0 | n/a | Pure function | Higher => inland moisture carry changes |
| climate.moistureEvapFactor | number | Evaporation scaling from SST/temp | 1.0 | n/a | Pure function | Higher => higher precipMm globally |
| climate.orographicLiftFactor | number | How strongly ascent rains out | 1.0 | n/a | Pure function | Higher => sharper rain shadows |
| climate.tempDiffusionIters | int | Smoothing passes for temp field | 1 | 0 means none | Iter count deterministic | 0 => more extreme gradients |
| climate.moistureAdvectionIters | int | Moisture bucket passes | 2 | 0 means none (invalid) | Iter count deterministic | Increasing iters should converge | 
| ocean.enable | boolean | Enables oceanography | true | n/a | Deterministic | When false, SST uses latitude-only |
| ocean.heatTransportEff | number | Strength of SST advection/diffusion | 1.0 | n/a | Pure function | Higher => flatter SST gradient |
| ocean.gyreStrength | number | Gyre component of currents | 1.0 | n/a | Pure function | Non-zero produces rotating basins |
| ocean.coastHugStrength | number | Coast tangent component | 1.0 | n/a | Pure function | Higher => boundary currents |
| ocean.seaIceThresholdC | number | Freezing point threshold | -2 | n/a | Pure function | Higher => more seaIce_q |
| cryosphere.enable | boolean | Enables land ice + albedo pass | true | n/a | Deterministic | Disable => no ice-albedo correction |
| cryosphere.albedoStrength | number | Cooling delta for icy tiles | 1.0 | n/a | Pure function | Higher => larger ice margins |
| cryosphere.landIceTempC | number | Mean temp threshold for land ice | 0 | n/a | Pure function | Lower => less land ice |
| hydro.runoffFraction | number | Fraction of precip that becomes runoff | 0.6 | n/a | Pure function | Higher => higher discharge_q |
| hydro.depressionFillMode | enum(spill/endorheic) | Whether closed basins spill or stay endorheic | spill | n/a | Pure function | Endorheic => more lakes in arid basins |
| hydro.endoEvapFactor | number | Shrinks endorheic lakes by aridity | 1.0 | n/a | Pure function | Higher => fewer endorheic lakes |
| hydro.riverThresholdMinor | number | Discharge threshold for edge rivers | derived | n/a | Pure function | Lower => denser riverEdgeMask6 |
| hydro.riverThresholdNavigable | number | Discharge threshold for navigability | derived | n/a | Pure function | Higher => fewer navigable segments |
| hydro.navigableCellSlopeMax | number | Max slope for tile-center rivers | derived | n/a | Pure function | Lower => fewer navigable river cells |
| hydro.wetlandThreshold | number | Wetness_q threshold for wetlands | 0.7 | n/a | Pure function | Higher => fewer wetland candidates |
| debug.emitReasonCodes | boolean | Emit climate debug.reasonCode | false | n/a | No randomness | Turning on must not change outputs |

**Derived defaults:** thresholds marked “derived” must be a deterministic function of map size/cellCount and global wetness.

---

## 11) Current vs target producer/consumer map

### Current (Phase 1 evidence summary)

- Rivers/lakes are effectively static artifacts.
- Climate inputs are coarse/implicit.
- Manual overrides exist.

### Target (this model)

```
Foundation ──> Morphology ──> Hydrology ──> Ecology ──> Placement/GamePlay
  mesh/crust     elevation       climate+water   biomes      starts/resources
                 landmask        rivers/lakes

Hydrology internal:
  H1 Atmosphere
  H2 Ocean
  H3 Precip
  H4 Ice/Albedo
  H5 Routing
```

Key adjustment: consumers stop recomputing climate/water heuristics and read Hydrology artifacts.

---

## 12) Verification & guardrails (Phase 2-level)

Hydrology implementation must lock these invariants with tests:

- **Determinism:** same seed/config produces identical artifacts bit-for-bit.
- **Mass monotonicity:** discharge increases downstream except in lakes/endorheic sinks.
- **Drainage validity:** every land cell drains to an ocean outlet or a lake basin.
- **Rain shadow sanity:** leeward moisture depletion occurs behind major ranges.
- **No debug side effects:** enabling debug outputs never changes climate/water results.

---

## 13) Lookback 2 (Phase 2)

### What changed from Phase 0.5 due to Phase 1 evidence

- **Hard ban on authored overrides inside Hydrology.** The Phase 0.5 sketch allowed optional regional overrides; Phase 1 showed these are a legacy trap. Overrides move to a future overlay project.
- **Contract tightening:** Hydrology outputs must be sufficient for gameplay consumers that score starts and store water data.

### Hard decisions locked here

- Climate stays **inside Hydrology** (as a subdomain) for the vertical refactor.
- Oceanography + cryosphere are internal steps, not top-level domains.
- Internal representation = artifacts; projections are derived only.
- River representation must support both edge rivers and tile-center navigable rivers.

### Open uncertainties (to resolve in Phase 3 without changing the model)

- Exact engine adapter/projection shapes for water storage.
- Final numeric scaling (mm/yr vs normalized units) and thresholds calibration.
- Whether bathymetry is available upstream or must be approximated.

### Note on possible top-level domain split

If Hydrology grows beyond a single vertical (e.g., oceanography becomes a major standalone system), Climate/Ocean could be promoted to a top-level domain later. For this refactor, they remain subdomains within Hydrology to preserve orchestration stability.

---

## References used

- `hydrology.md` (canonical domain-only causality + contract spine)
- `SPIKE-synthesis-earth-physics-systems-swooper-engine.md` (pipeline decomposition and artifact container suggestions)
- `SPIKE-earth-physics-systems-modeling.md` and `...-alt.md` (oceanography/climatology/hydrology abstractions)
- `SPIKE-civ7-map-generation-features.md` (feature inventory: navigable vs minor rivers)
- `SPIKE-gameplay-mapgen-touchpoints.md` (gameplay touchpoints: start biases, water/fertility updates)
