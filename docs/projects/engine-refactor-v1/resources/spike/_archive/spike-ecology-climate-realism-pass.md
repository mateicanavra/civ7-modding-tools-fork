# Spike: Ecology/Climate Realism Pass (De-emphasize Latitude, Emphasize Fields)

## Why this spike exists

We want the ecology + features + climate stack to feel **causally realistic** (per the Earth-physics research spikes), and we want to avoid “latitude tyranny” where hard latitude bands or latitude-gated placements dominate outcomes.

This spike is a short, implementation-oriented inventory of:

- what we already compute in the mod (fields and thresholds),
- where latitude is still acting as a hard gate (directly or indirectly),
- what a “full pass” would require to make **biomes + feature placement** respond to **temperature, elevation, moisture, and aridity** in a consistent way,
- and a shortlist of additional ecology/climate capabilities we should consider integrating (snow/sand plot effects, tundra forests, etc.).

Related research:

- `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling.md`
- `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md`

## Current state (mod, grounded)

### What we already have (the “field” foundation)

- **Temperature is already a field** derived from latitude + elevation:
  - `mods/mod-swooper-maps/src/domain/ops/ecology/classify-biomes/rules/temperature.ts`
  - Uses a lapse-rate penalty (`degrees C / km`) and configurable equator/pole anchors.
- **Effective moisture is already a field** derived from rainfall + humidity (+ overlays + noise):
  - `mods/mod-swooper-maps/src/domain/ops/ecology/classify-biomes/rules/moisture.ts`
  - Output is “effective moisture units” (rainfall + weighted humidity + bonuses).
- **Biome classification is already multi-factor**, not purely latitude:
  - `mods/mod-swooper-maps/src/domain/ops/ecology/classify-biomes/index.ts`
  - Produces `biomeIndex`, `vegetationDensity`, `effectiveMoisture`, `surfaceTemperature`.
- **Feature placement (owned strategy) consumes those fields**:
  - `mods/mod-swooper-maps/src/domain/ops/ecology/features-placement/index.ts`

### Where latitude is still overly “direct”

Even if downstream decisions are “field-based”, latitude can still dominate if we:

- apply **macro climate swatches** keyed by signed latitude bands (hard cutoffs):
  - `mods/mod-swooper-maps/src/domain/hydrology/climate/swatches/**`
  - swatches commonly use `signedLatitudeAt(y)` plus thresholds (and sometimes elevation).
- classify biomes by **temperature zones** that are effectively just remapped latitude zones unless tuned:
  - `mods/mod-swooper-maps/src/domain/ops/ecology/classify-biomes/schema.ts` (`TemperatureSchema` thresholds)

This is not “wrong” physically—latitude is a first-order driver of insolation—but it becomes a problem when:

- latitude is used as a **hard categorical switch**, rather than as one influence on continuous fields, and
- we don’t give elevation/aridity enough leverage to create plausible exceptions (e.g., alpine snow in the tropics, cold deserts, coastal moderation).

### Concrete findings from recent work (snow, banding, and “dead biomes”)

These are the specific places where latitude still dominates *in practice* today.

#### 1) Snow is still delegated, so we don’t control “snowline” behavior yet

- Our placement stage calls a thin wrapper:
  - `mods/mod-swooper-maps/src/domain/placement/snow.ts`
  - which calls `adapter.generateSnow(width, height)`.
- The adapter implementation delegates to the engine-side `generateSnow` function:
  - `packages/civ7-adapter/src/civ7-adapter.ts` (method `generateSnow`).

Implication for realism:

- Until we own snow placement, we cannot drive snow from our **temperature/elevation** field; we only get whatever the delegated generator does.
- Owning snow requires adapter support for plot effects (snow is a plot effect type, not a normal feature placement).

Engine surface note (why this matters):

- Civ7 models snow visuals as **plot effects**, not a `FeatureType`:
  - `apps/docs/site/civ7-official/resources/Base/modules/base-standard/data/plot-effects.xml`
  - includes permanent + transient snow effect types (`PLOTEFFECT_SNOW_*_(TRANSIENT|PERMANENT)`).
- Plot effects are tagged (for discovery via `getPlotEffectTypesContainingTags`):
  - `SNOW` + `LIGHT|MEDIUM|HEAVY` + `TRANSIENT|PERMANENT` (same `plot-effects.xml`).

So “owning snow” means: compute a snow field (and intensity) from our climate/ecology fields, then apply plot effects via adapter APIs.

#### 2) Climate baseline blending currently behaves like “bands dominate by construction”

In `applyClimateBaseline`, we currently clear the rainfall buffers before computing bands:

- `mods/mod-swooper-maps/src/domain/hydrology/climate/baseline.ts`:
  - `ctx.buffers.climate.rainfall.fill(0);`
  - then `const base = readRainfall(x, y);` (reads from the cleared buffer via `createClimateRuntime`)

Implication:

- `blend.baseWeight` is effectively blending against **zero**, not against an existing rainfall field.
- This makes band targets the primary signal, even when “blend” appears to suggest mixing with another baseline.

This isn’t necessarily incorrect for the “baseline pass” intent, but it is a key lever for reducing visible latitude band cutoffs: we need a clear decision on what `base` is supposed to represent (engine rainfall, previous pass rainfall, or a constant/reference field).

#### 3) We still have at least one hard exclusion that creates sterile cold tiles

In owned feature placement, snow biomes are excluded from vegetated placement entirely:

- `mods/mod-swooper-maps/src/domain/ops/ecology/features-placement/rules/selection.ts`:
  - `if (symbol === "snow") return null;`

Implication:

- Even if we tune `vegetationDensity` to allow sparse cold vegetation, the selection rule blocks it.
- If the intent is “snow biome can still have sparse tundra vegetation”, this needs to become a configurable envelope (not a hardcoded branch).

Related “dead biome” failure mode:

- Vegetation density is computed as a weighted combination of normalized moisture + humidity, then multiplied by per-biome modifiers:
  - `mods/mod-swooper-maps/src/domain/ops/ecology/classify-biomes/rules/vegetation.ts`
  - `mods/mod-swooper-maps/src/domain/ops/ecology/classify-biomes/schema.ts` (`VegetationBiomeModifiersSchema` defaults)
- Feature placement then gates on vegetation thresholds:
  - `mods/mod-swooper-maps/src/domain/ops/ecology/features-placement/schema.ts` (`minVegetation`, `desertSagebrushMinVegetation`, `tundraTaigaMinVegetation`, …)

If a biome’s multipliers drive `vegetationDensity` below the gating thresholds, the result is “correct-by-code but sterile-by-experience”. A realism pass should replace global gates with per-biome envelopes (and ensure cold/desert biomes have plausible low-density placements).

## Other opportunities discovered (within climate/ecology/features scope)

These are “available primitives” we can leverage to improve realism without stepping into resource/start placement.

### 1) Additional plot effects beyond snow (sand, burned)

The plot effects catalog includes:

- `PLOTEFFECT_SAND`
- `PLOTEFFECT_BURNED`

Source:

- `apps/docs/site/civ7-official/resources/Base/modules/base-standard/data/plot-effects.xml`

For realism, these can become *secondary outputs* of the climate/ecology stack:

- sand as an aridity/wind-driven effect (desertification / dunes)
- burned as a fire-risk proxy (likely needs a “dry lightning” / biomass / drought driver)

### 2) Cold/wet feature variants exist in the feature catalog

The base feature set includes options that support “non-empty cold biomes”, e.g.:

- `FEATURE_TAIGA` (vegetated)
- `FEATURE_TUNDRA_BOG` (wet, near river)

Source:

- `apps/docs/site/civ7-official/resources/Base/modules/base-standard/data/terrain.xml` (feature rows)

This supports a realism direction where:

- tundra is sparse but not sterile,
- cold wetlands appear along rivers when local moisture is higher,
- and “snow biome” can still host limited, high-latitude vegetation where climate supports it (configurable).

## What “escaping latitude tyranny” should mean (for the mod)

The goal is not “remove latitude”.

The goal is:

- Latitude is used only to shape **baseline insolation** (temperature potential) and broad circulation.
- Everything that looks like “a band” is an emergent effect of **fields** + **terrain** + **moisture transport**, not a direct latitude gate.
- Most author-facing knobs tune *field construction* (temperature/moisture/aridity) and *field-to-biome/feature mapping*, not swatch cutoffs.

This lines up with the research spikes’ recommended abstraction strategy: field-based modeling with tunable levers (e.g., lapse rate, aridity thresholds, orographic lift) rather than discrete latitude paint.

## “Full pass” scope: what it would take (biomes + features)

### 1) Inventory every decision point that uses climate/ecology inputs

Create a single checklist (by file/symbol) of every place we:

- compute a climate/ecology field (rainfall, humidity, temperature, moisture),
- classify a biome,
- decide whether a feature can/should be placed,
- gate vegetation density (thresholds), and
- apply any “macro pattern” (swatches/overlays).

This is the “map of knobs and gates” needed to prevent hidden latitude dependencies.

### 2) Promote missing “physics fields” (aridity, seasonality proxies)

Right now we have:

- `surfaceTemperature` (C)
- `effectiveMoisture` (rainfall + humidity + bonuses)

For more realistic deserts/tundras/forests, we likely need at least:

- **Potential evapotranspiration (PET)** proxy (function of temperature + humidity; optional wind)
- **Aridity index** proxy (e.g., `aridity = PET - rainfall` or `rainfall / PET`)
- Optional **freeze index** proxy (e.g., `freezePotential = clamp01((0 - temp) / k)`), used for snow/ice probabilities

The research spikes explicitly call out lapse rate and aridity as primary levers; without PET/aridity, “hot deserts” and “cold deserts” are hard to distinguish using rainfall alone.

Design principle:

- New fields must be first-class artifacts (typed arrays), not implicit recomputations hidden inside rules.
- Every multiplier/threshold that affects those fields must be surfaced in schema/config.

### 3) Rework biome classification to use a coherent multi-axis mapping

Current biome classification uses:

- temperature zones derived from `surfaceTemperature`
- moisture zones derived from `effectiveMoisture`

For a full realism pass, ensure the mapping is:

- stable across parameter changes (small knob tweaks don’t cause huge “band flips”),
- capable of producing:
  - cold deserts (low moisture + low temperature)
  - alpine tundra at low lat (high elevation + cold temp)
  - temperate rainforests (high moisture + moderate temp)

This likely means:

- adjusting thresholds to be less “latitude proxy” and more “temperature proxy”
- adding aridity into desert/steppe discrimination (not just rainfall/humidity)
- optionally moving from “zone bins” to a **scored selection** against biome envelopes:
  - each biome defines preferred ranges over (temp, moisture, aridity, seasonality)

### 4) Make feature placement a “climate envelope” system, not a biome gate system

Instead of “if biome == X then pick from set Y”, move toward:

- each feature group defines an **envelope** over (temperature, moisture, aridity, elevation),
- plus local constraints (coast/river adjacency, shallow water, slope),
- and placement selects the best match (weighted) subject to engine placement constraints.

This is the core way to:

- allow tundra forests / boreal features where conditions permit,
- allow sparse desert shrubs/oases where microclimate supports it,
- allow alpine snow/ice on high peaks without requiring high latitude,
- and avoid “dead biomes” where nothing places because a single gate is too strict.

### 5) De-risk with a parity + observability harness

Before changing rules deeply:

- Add lightweight “distribution summaries” as artifacts/logs:
  - counts by biome
  - counts by feature type
  - histogram/quantiles for fields (temp/moisture/aridity)
- Add small grid tests that assert invariants, not exact layouts:
  - no features on water (unless aquatic)
  - no vegetated features on `vegetationDensity < threshold` (if that gate remains)
  - “some tundra vegetation exists” given a known cold-but-not-zero vegetation config

This prevents the common failure mode: “we made it more realistic but accidentally made half the map sterile”.

### 6) Retune maps only after the field model is stable

Map presets should not compensate for algorithmic gaps with extreme swatches/thresholds.

After field model changes:

- retune per-map configs to reflect intent (earthlike vs desert mountains vs archipelago),
- ensure the “field distribution” (temp/moisture/aridity) matches the intended climate story,
- then tune feature envelopes/densities.

## Shortlist: ecology/climate capabilities we’re likely missing (and should consider)

This list intentionally stays within the ecology/climate/features-ish scope.

### A) Plot effects as climate/ecology outputs (snow/sand/burned)

The engine supports plot effects for:

- snow (light/medium/heavy, transient/permanent)
- sand
- burned

See (engine resources for types/tags):  
`apps/docs/site/civ7-official/resources/Base/modules/base-standard/data/plot-effects.xml`

What a realism pass would do:

- treat plot effects as another output channel from climate/ecology (alongside features),
- make them respond to **freeze potential** (snow), **aridity/wind** (sand), and **fire risk** (burned),
- keep all effect intensities/thresholds tunable in config.

### B) Cold biome vegetation shouldn’t be “none”

Engine feature catalog includes cold/wet-adjacent options:

- `FEATURE_TAIGA` (vegetated)
- `FEATURE_TUNDRA_BOG` (wet, near river)

See: `apps/docs/site/civ7-official/resources/Base/modules/base-standard/data/terrain.xml` (features list)

A realism pass should ensure:

- tundra tiles can receive taiga (or other sparse vegetation) when `vegetationDensity` is low-but-nonzero,
- near-river tundra can receive tundra bogs when moisture is locally higher.

### C) Rivers/lakes as microclimate drivers

We already have corridor/rift overlays and climate refinements, but a realism pass should explicitly decide:

- whether rivers/lakes increase local humidity/moisture for ecology decisions,
- whether they affect temperature moderation (small effect, but meaningful for “oasis”/riparian biomes),
- and whether those effects are applied:
  - upstream in climate field construction, or
  - downstream as ecology “microclimate bonuses”.

### D) Orography beyond rain shadow: snowline + alpine biomes

We already apply elevation-based temperature penalties in ecology.

A realism pass extends that to:

- define an explicit snowline function (temperature + elevation),
- allow alpine tundra/snow at low latitudes on high peaks,
- and ensure adjacent lowlands aren’t forced into cold biomes just because of one nearby mountain chain.

## Proposed next step (the “short spike” work items)

1) **Audit all latitude gates in the mod**
   - climate swatches
   - biome thresholds
   - feature placement gates
2) **Define the minimal new fields** needed for realism:
   - PET proxy + aridity index + freeze index (if we agree)
3) **Draft a unified config surface** for:
   - field generation (temperature/moisture/aridity)
   - mapping (biomes + features)
4) **Propose invariants + tests** to keep worlds playable during iteration.

Deliverable for implementation planning:

- A single “full pass” checklist + proposed ordering (climate fields → biomes → features → plot effects),
- plus a clear list of what becomes out-of-scope if we stay “minimal” for the current refactor tranche.
