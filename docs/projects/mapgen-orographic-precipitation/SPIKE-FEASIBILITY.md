# Spike Feasibility: More Physically Realistic Orographic Precipitation + Rain Shadows

Date: 2026-01-29  
Repo: `/Users/mateicanavra/Documents/.nosync/DEV/civ7-modding-tools`

## 1) Verdict

**Feasible with caveats.** The pipeline already has a dedicated op (`hydrology/compute-precipitation`) that ingests **wind**, **elevation**, and a **humidity proxy**, and already applies a (simplified) **leeward rain-shadow reduction**. The minimal seam is to upgrade the **default strategy’s orographic logic** without needing new upstream inputs.  

Main caveats:
- Current Hydrology “upwind” logic is **cardinal-only** (no diagonal vector tracing), which bounds how directional the orographic model can be without broader changes. See `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/rules/index.ts` (`upwindOffset`) and `mods/mod-swooper-maps/src/domain/hydrology/ops/transport-moisture/rules/index.ts` (`upwindOffset`).
- Humidity “truth” is not depleted by precipitation within the pipeline; precipitation is mapped from a transported humidity proxy and humidity output is derived from rainfall (not a coupled moisture budget). See `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/strategies/baseline.ts` (`defaultStrategy`) and `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/rules/index.ts` (`rainfallToHumidityU8`).

## 2) Scope (One Aspect Only)

Target: **Orographic precipitation + rain shadows** in Hydrology baseline precipitation mapping.

Out of scope:
- Changing wind generation, moisture transport, ocean coupling, or any morphology/erosion systems.
- Full moisture “rainout” coupling (precip reducing downwind humidity during transport).
- Adding new artifacts or reworking downstream ecology/placement.

## 3) Orienting Mental Map (Map Seed)

- Domain docs: `docs/system/libs/mapgen/hydrology.md` (meaning/causality), `docs/system/libs/mapgen/hydrology-api.md` (contracts/entry points).
- Pipeline seam:
  - Baseline climate orchestration (seasonal loop calling precipitation): `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts` (search: `ops.computePrecipitation(`)
  - Precipitation op contract: `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (search: `id: "hydrology/compute-precipitation"`)
  - Precipitation default strategy: `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/strategies/baseline.ts` (`defaultStrategy`)

Navigation note: line anchors are intentionally omitted to avoid brittleness; use the search strings above to jump to the relevant sections.

## 4) Current Implementation (As-Is) — Evidence

### 4.1 Where precipitation is computed

Hydrology baseline step calls `ops.computePrecipitation(...)` with:
- `elevation`, `landMask` from Morphology topography truth,
- `windU/windV` from atmospheric circulation,
- `humidityF32` from moisture transport,
- and a deterministic `perlinSeed`.  
See `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts` (search: `humidityF32: moisture.humidity`) and `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (`ComputePrecipitationInputSchema`).

### 4.2 What “orographic” currently means in code

The `default` precipitation strategy:
- Computes baseline rainfall from transported humidity: `rf = pow(humidityF32[i], exponent) * rainfallScale`.
- Adds a coastal gradient bonus by distance-to-water.
- Computes an **upwind barrier distance** and subtracts `reductionBase + barrierDistance * reductionPerStep` when a barrier is detected.  
See `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/strategies/baseline.ts` (search: `upwindBarrierDistance(`).

The barrier detector:
- Walks upwind for `steps` tiles
- Uses `upwindOffset()` which chooses **dx/dy only in cardinal directions** based on the larger wind component (fallback is latitude-band default).
- Declares a “barrier” if any upwind land tile has elevation ≥ `barrierElevationM`.  
See `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/rules/index.ts` (`upwindOffset`, `upwindBarrierDistance`).

### 4.3 Outputs and downstream sensitivity

`hydrology/compute-precipitation` outputs:
- `rainfall` as `u8` 0..200 (clamped),
- `humidity` as `u8` 0..255 (currently derived from rainfall).  
See `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (`ComputePrecipitationOutputSchema`) and `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/rules/index.ts` (`clampRainfall`, `rainfallToHumidityU8`).

Downstream consumers:
- Rivers/discharge depend on rainfall/humidity: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts` (search: `rainfall:` and `humidity:`).
- Biomes classification depends on rainfall/humidity: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts` (search: `rainfall:` and `humidity:`).

## 5) Touchpoint Map (Code + Data/Control Seams)

### Domain + op boundary

- Hydrology domain contract wiring: `mods/mod-swooper-maps/src/domain/hydrology/index.ts`
- Hydrology runtime binding: `mods/mod-swooper-maps/src/domain/hydrology/ops.ts`
- Op contract (schemas + defaults):
  - Orographic params schema: `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (`ComputePrecipitationOrographicSchema`)
  - Default strategy includes `waterGradient` + `orographic`: `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (`ComputePrecipitationBaselineStrategySchema`)

### Implementation seam (minimal-change surface)

- Default precipitation strategy implementation: `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/strategies/baseline.ts` (`defaultStrategy`)
- Orographic rules (upwind walk + barrier test): `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/rules/index.ts` (`upwindBarrierDistance`)

### Orchestration seam (where configs are scaled by knobs)

- Baseline stage knobs schema: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/index.ts`
- Baseline step normalizes/adjusts precipitation configs (dryness/seasonality/oceanCoupling): `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts` (search: `normalize:` and `computePrecipitation`)
- Knob numeric multipliers (including orographic reduction bases): `mods/mod-swooper-maps/src/domain/hydrology/shared/knob-multipliers.ts` (search: `HYDROLOGY_OROGRAPHIC_REDUCTION_`)

### Performance context (map sizes)

Canonical Civ7 map sizes (grid width/height) from official resources:
- Huge: 106×66, etc.  
See `.civ7/outputs/resources/Base/modules/base-standard/data/maps.xml` (search: `MapSizeType="MAPSIZE_HUGE"`).

## 6) Constraints (Architectural / Performance / Operational)

### Architectural

- Op boundaries are **data-pure** and deterministic (seeds passed as integers; no RNG functions cross boundaries). See `docs/system/libs/mapgen/hydrology-api.md` and `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (module header comment).
- Hydrology outputs are treated as authoritative downstream; precipitation changes will cascade into rivers and biomes. See `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts` and `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts`.

### Performance

Baseline climate runs precipitation once per “season sample” (2 or 4 seasonal phases). See `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts` (search: `phases` and `seasonalRainfall.push`).

The current orographic cost is `O(width*height*steps)` per seasonal phase (default `steps=4`). See:
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (`ComputePrecipitationOrographicSchema`)
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/rules/index.ts` (`upwindBarrierDistance`)

### Operational / testing

There are deterministic snapshot-style integration tests that hash rainfall/humidity and diagnostics; any precipitation behavior change will require expected-output updates:
- `mods/mod-swooper-maps/test/standard-run.test.ts`
- `mods/mod-swooper-maps/test/hydrology-dryness-effects.test.ts`

## 7) Physics Triangulation (What “More Realistic” Should Capture)

At our scale (tile grids; deterministic), a minimal physically-grounded target is:
- **Windward uplift enhances precipitation** when airflow is forced to ascend terrain (orographic lifting / upslope flow). [Official] NOAA NWS glossary: orographic lifting and precipitation.  
  - https://forecast.weather.gov/glossary.php?word=Orographic%20Lifting  
  - https://forecast.weather.gov/glossary.php?word=Orographic%20Precipitation
- **Leeward rain shadow reduces precipitation** due to descending air warming and cloud dissipation after crossing a barrier. [Official] NOAA NWS glossary.  
  - https://forecast.weather.gov/glossary.php?word=rain%20shadow
- Mountains create strong precipitation gradients; modeling approaches include theoretical and review-level treatments (for our “inspiration and invariants,” not for full implementation). [Official]/[Peer-reviewed]
  - Roe (2005), *Orographic Precipitation*, Annual Review of Earth and Planetary Sciences. DOI: 10.1146/annurev.earth.33.092203.122541  
    - https://www.annualreviews.org/content/journals/10.1146/annurev.earth.33.092203.122541
  - Smith & Barstad (2004), *A Linear Theory of Orographic Precipitation*, Journal of the Atmospheric Sciences. DOI: 10.1175/1520-0469(2004)061<1377:ALTOOP>2.0.CO;2  
    - https://ui.adsabs.harvard.edu/abs/2004JAtS...61.1377S/abstract
- A government example (trade winds + orographic lift creating windward wet / leeward dry patterns). [Official] USGS HVO Volcano Watch.  
  - https://www.usgs.gov/observatories/hvo/news/volcano-watch-complex-interactions-between-air-and-land-help-shape-hawaii

## 8) Proposed Change (Minimal Integration Plan)

### 8.1 Goal

Upgrade `hydrology/compute-precipitation` **default strategy** to apply both:
- **Windward uplift enhancement** (upslope → more precip), and
- **More nuanced leeward drying** (depends on *barrier height relative to the tile*, not just “any barrier exists”).

Keep the existing stage wiring, inputs, and determinism contract intact.

### 8.2 Minimal change set (files that would be touched in an implementation)

1) Extend the orographic config schema to support windward enhancement (defaults preserve current behavior):
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (`ComputePrecipitationOrographicSchema`)

2) Implement uplift + improved shadow using existing arrays (windU/windV, elevation, latitudeByRow, humidityF32):
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/strategies/baseline.ts` (`defaultStrategy`)

3) Add one helper in rules to compute an upwind “blocking height” (max upwind elevation minus local elevation) rather than only “distance to any barrier”:
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/rules/index.ts` (near `upwindBarrierDistance`)

Optional follow-up (not required for MVP):
- Update diagnostic `rainShadowIndex` to match the new blocking-height metric (purely advisory).  
  - `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-climate-diagnostics/strategies/default.ts` (search: `rainShadowIndex`)

### 8.3 Minimal algorithm spec (intended behavior)

Using existing “upwind” direction selection (`upwindOffset`):

For each land tile:
1. Compute baseline rainfall from humidity as today.
2. Compute `up = upwind neighbor index` (or self if off-map).
3. **Windward uplift boost:** if `dz = elevation[i] - elevation[up] > 0`, add:
   - `rf += upliftGain * hum * f(dz)` (monotone, capped), where `f(dz)` is a small-scale normalization like `min(1, dz / upliftScaleM)`.
4. **Leeward drying:** scan upwind up to `steps`:
   - `maxUpwindElev = max(elevation along the upwind ray over land tiles)`
   - `blockingHeight = max(0, maxUpwindElev - elevation[i])`
   - `rf -= shadowGain * g(blockingHeight)` (monotone, capped)
5. Add deterministic noise and clamp as today.

This is closer to the NOAA mechanism description (upslope enhancement + lee drying) while staying in the current data model and runtime constraints.

## 9) Inputs + Parameters (Reuse + New)

### 9.1 Reused inputs (no new upstream data)

Already present at the op boundary:
- wind direction/intensity proxy: `windU`, `windV` — `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (`ComputePrecipitationInputSchema`)
- elevation/topography: `elevation`, `landMask` — `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (`ComputePrecipitationInputSchema`)
- humidity supply proxy: `humidityF32` — `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (`ComputePrecipitationInputSchema`)
- latitude bands for “upwind fallback”: `latitudeByRow` — `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (`ComputePrecipitationInputSchema`)

### 9.2 Reused parameters

Keep current fields as-is (backwards-compatible semantics):
- `orographic.steps` (scan distance) — `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (`ComputePrecipitationOrographicSchema`)
- `orographic.barrierElevationM` (still useful as a floor for what counts as a “blocking feature”) — `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts` (`ComputePrecipitationOrographicSchema`)

### 9.3 Minimal new parameters (suggested)

Add 2–3 fields to `ComputePrecipitationOrographicSchema` with defaults preserving current behavior:
- `windwardUpliftGain` (default `0`): strength of windward uplift enhancement.
- `windwardUpliftScaleM` (default `250`–`500`): meters of upslope that maps to “full” uplift.
- `leeBlockingHeightScaleM` (default `500`–`1000`): meters of blocking height that maps to “full” lee drying (so a low hill doesn’t create an extreme rain shadow).

Rationale: current parameters (`reductionBase`/`reductionPerStep`) are distance-based and “binary barrier exists.” For a more physical model, we want **height-relative** effects without expanding scope.

## 10) Risks + Mitigations

1) **Regression risk (downstream cascades):** Rivers, biomes, and placement signals will shift.  
Mitigation: keep defaults backward compatible (new uplift parameters default to zero; shadow mapping tuned to approximate current effect), then introduce new “realism preset” configs intentionally.

2) **Directional artifacts (cardinal-only winds):** The ray-cast upwind direction ignores diagonals, limiting realism and potentially creating blocky rain shadows.  
Mitigation: keep MVP aligned with current `upwindOffset` to avoid broad changes; document as a caveat and optionally add an 8-direction quantization as a follow-up only if warranted.

3) **Edge/seam artifacts:** Current upwind scans and distance-to-water do not encode wrapX semantics.  
Mitigation: treat wrap-aware scanning as out-of-scope for MVP; if artifacts are visible, add a dedicated follow-up that passes wrap semantics through op inputs (would be a broader contract change).

4) **Test stability / snapshot churn:** Standard-run hashes will change.  
Mitigation: add a focused unit test for “windward > leeward” on a tiny synthetic ridge so behavior is pinned; then update integration snapshot expectations with a one-time recalibration.

## 11) Validation Plan (What Proves This Worked)

**Unit-level (fast):**
- New test for `compute-precipitation` on a small grid with:
  - a ridge line,
  - a constant wind direction,
  - constant humidity,
  - asserts:
    - windward slope rainfall increases vs flat baseline,
    - leeward tiles behind high ridge are drier than windward.  
Suggested file location: `mods/mod-swooper-maps/test/` alongside `hydrology-knobs.test.ts` and `hydrology-dryness-effects.test.ts`.

**Integration-level (existing harness):**
- Run/refresh `mods/mod-swooper-maps/test/standard-run.test.ts` hash fixtures after tuning.
- Ensure monotonic dryness knob behavior remains true. See `mods/mod-swooper-maps/test/hydrology-dryness-effects.test.ts`.

**Diagnostics sanity:**
- Compare `rainShadowIndex` diagnostics to actual rainfall gradients in a few seeded maps. See `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-climate-diagnostics/strategies/default.ts`.

## 12) References + Breadcrumbs

### References (with authority tags)

- [Official] NOAA NWS Glossary — Orographic Lifting: https://forecast.weather.gov/glossary.php?word=Orographic%20Lifting
- [Official] NOAA NWS Glossary — Orographic Precipitation: https://forecast.weather.gov/glossary.php?word=Orographic%20Precipitation
- [Official] NOAA NWS Glossary — Rain Shadow: https://forecast.weather.gov/glossary.php?word=rain%20shadow
- [Official] USGS (HVO) — orographic lift and rain shadow example: https://www.usgs.gov/observatories/hvo/news/volcano-watch-complex-interactions-between-air-and-land-help-shape-hawaii
- [Official]/[Peer-reviewed] Roe (2005) Annual Reviews — Orographic Precipitation (review): https://www.annualreviews.org/content/journals/10.1146/annurev.earth.33.092203.122541
- [Official]/[Peer-reviewed] Smith & Barstad (2004) — linear theory (abstract + DOI): https://ui.adsabs.harvard.edu/abs/2004JAtS...61.1377S/abstract

### Breadcrumbs (local files visited)

- `docs/system/ARCHITECTURE.md`
- `docs/system/libs/mapgen/architecture.md`
- `docs/system/libs/mapgen/hydrology.md`
- `docs/system/libs/mapgen/hydrology-api.md`
- `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md`
- `.civ7/outputs/resources/Base/modules/base-standard/data/maps.xml`
- `mods/mod-swooper-maps/src/domain/hydrology/index.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/shared/knobs.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/shared/knob-multipliers.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/contract.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/index.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/strategies/baseline.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/strategies/refine.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-precipitation/rules/index.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/transport-moisture/rules/index.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/transport-moisture/strategies/default.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-atmospheric-circulation/contract.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-climate-diagnostics/contract.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-climate-diagnostics/rules/index.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/compute-climate-diagnostics/strategies/default.ts`
- `mods/mod-swooper-maps/src/domain/hydrology/ops/shared/wind-field.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/artifacts.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/steps/climateRefine.contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/steps/climateRefine.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts`
- `mods/mod-swooper-maps/test/hydrology-knobs.test.ts`
- `mods/mod-swooper-maps/test/hydrology-dryness-effects.test.ts`
- `mods/mod-swooper-maps/test/standard-run.test.ts`

### Breadcrumbs (web URLs visited)

- https://www.annualreviews.org/content/journals/10.1146/annurev.earth.33.092203.122541
- https://ui.adsabs.harvard.edu/abs/2005AREPS..33..645R/abstract
- https://ui.adsabs.harvard.edu/abs/2004JAtS...61.1377S/abstract
- https://forecast.weather.gov/glossary.php?word=Orographic%20Lifting
- https://forecast.weather.gov/glossary.php?word=Orographic%20Precipitation
- https://forecast.weather.gov/glossary.php?word=rain%20shadow
- https://www.usgs.gov/observatories/hvo/news/volcano-watch-complex-interactions-between-air-and-land-help-shape-hawaii
