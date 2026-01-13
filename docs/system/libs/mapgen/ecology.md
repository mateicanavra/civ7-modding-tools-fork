# Ecology

## Overview

Ecology turns the physical world (foundation + morphology + climate) into living‑world signals: **soils**, **biomes**, **resources**, and **terrain features**. It follows the operation-module architecture (`docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`): every domain op exports its own schemas/defaults, and steps stay orchestration-only (build inputs → call op → apply/publish).

Baseline non-wonder feature placement is ecology-owned (forests, wetlands, reefs, ice), while placement retains natural wonders and floodplains. The ownership boundary and migration rationale are tracked in `docs/projects/engine-refactor-v1/resources/spike/spike-ecology-feature-placement-ownership.md`.

### Responsibilities (causal chain)

1. **Pedology:** derive soil class + fertility from elevation/relief, rainfall + humidity, and optional bedrock/sediment fields so downstream placement has a physical substrate.
2. **Resource basin mapping:** generate clustered candidate basins for resources from pedology + climate and hand results to placement.
3. **Biome classification:** map temperature + effective moisture into Whittaker/Holdridge-inspired zones with vegetation density, then optionally smooth biome edges.
4. **Feature planning + apply:** plan vegetation, wetlands, reefs, and ice intents using biome + climate + soils, merge intents, and apply them to the engine/fields.

## Architecture (ops, artifacts, and contracts)

- Domains expose **one op per module** with colocated `input`, `config`, and `output` schemas and `defaultConfig`. Steps import ops directly; no wrapper schemas in steps.
- Artifacts are recipe-owned keys with domain-owned shapes; bindings to Civ7 engine IDs stay in the step layer.

| Operation (domain op) | Kind | Inputs | Outputs |
| --- | --- | --- | --- |
| Operation (domain op) | Kind | Inputs | Outputs |
| --- | --- | --- | --- |
| `ecology/pedology/classify` | `compute` | land mask, elevation/relief, rainfall, humidity, optional sediment + bedrock + slope | `artifact:ecology.soils` — `{ soilType: Uint8Array, fertility: Float32Array }` |
| `ecology/pedology/aggregate` | `compute` | soils artifact | region summaries for narrative/placement |
| `ecology/resources/plan-basins` | `plan` | soils artifact, climate, land mask | `artifact:ecology.resourceBasins` — per-resource basin candidates |
| `ecology/resources/score-balance` | `score` | basin candidates | balanced basin candidates |
| `ecology/biomes/classify` | `compute` | `width/height`, rainfall + humidity fields, elevation, latitude, land mask, optional corridor/rift masks | `artifact:ecology.biomeClassification` — `{ width, height, biomeIndex, vegetationDensity, effectiveMoisture, surfaceTemperature, aridityIndex, freezeIndex }` |
| `ecology/biomes/refine-edge` | `compute` | biome indices + land mask | smoothed biome indices |
| `ecology/features/plan-vegetation` | `plan` | biome classification, soils, land mask | vegetation intents |
| `ecology/features/plan-wetlands` | `plan` | biome classification, soils, elevation, land mask | marsh/wetland intents |
| `ecology/features/plan-reefs` | `plan` | surface temperature, land mask | reef intents |
| `ecology/features/plan-ice` | `plan` | surface temperature, elevation, land mask | ice intents |
| `ecology/features/apply` | `apply` | merged feature intents | merged placements applied to engine + `field:featureType` |

### Strategy variants (tuning presets)

- **Pedology classify:** `default`, `coastal-shelf` (boosted sediment + moisture), `orogeny-boosted` (higher relief weight + lower fertility ceiling).
- **Resource basins:** `default`, `hydro-fluvial` (moisture-biased targets), `mixed` (alternating fertility/moisture emphasis by resource index).
- **Biome edge refine:** `default`/`morphological` (cellular smoothing), `gaussian` (kernel-weighted blending).
- **Feature planning:**
  - Vegetation — `default`, `clustered` (adds spatial clustering noise and biome-aware feature swap).
  - Wetlands — `default`, `delta-focused` (extra tolerance for moisture/fertility with delta-style striping).
  - Reefs — `default`, `shipping-lanes` (warm-water stripes that mimic trade routes).
  - Ice — `default`, `continentality` (sea ice scales with ocean distance; alpine ice tapers with inland bias).

## Step wiring (standard recipe)

1. **Pedology step** — build fields from elevation/relief/climate, call `pedology.classify.run`, publish `artifact:ecology.soils`.
2. **Resource basins step** — require soils + climate + land mask, call `resources.planBasins.run` then `resources.score-balance.run`, publish `artifact:ecology.resourceBasins` for placement.
3. **Biomes step** — build rainfall/humidity/elevation/latitude + corridor/rift masks, call `classifyBiomes.run`, publish `artifact:ecology.biomeClassification`, map symbols → engine biome IDs, set `field:biomeId` (water tiles explicitly assigned `BIOME_MARINE`).
4. **Biome edge refine step** — smooth biome seams via `refineBiomeEdges.run`, republish biome artifact for downstream stages.
5. **Features plan step** — plan vegetation/wetlands/reefs/ice intents using biome + soils + elevation/temperature, publish `artifact:ecology.featureIntents`.
6. **Features apply step** — merge intents via `features/apply`, write engine features + `field:featureType`.

Config is always sourced from op exports (`classifyBiomes.config/defaultConfig`, future pedology/resources/feature configs). Engine binding schemas stay step-side (`BiomeBindingsSchema`).

## Algorithms and research framing

### Pedology (planned)

- **CLORPT proxy:** combine **Climate** (temp/moisture), **Relief** (slope/curvature), **Parent material** (bedrock age/type + sediment depth), and **Time** heuristics to classify soil type (e.g., sand/loam/clay/rocky) and fertility (0–1).
- **Signals:** deep sediment + moderate rain → loam/high fertility; steep/young crust + little sediment → rocky/low fertility; cold/arid plateaus → thin, infertile soils.
- **Outputs:** `soilType: Uint8Array` palette + `fertility: Float32Array` scalar used by placement/resource ops.

### Resource basin planning (planned)

1. **Candidate mapping:** derive per-resource probabilities from geology + climate (e.g., coal in low, wet sedimentary basins; iron on ancient shields/hills; oil on shelves or wet lowlands).
2. **Clustering:** promote contiguous basins/fields instead of speckled singles; weight by fertility and hydrology proximity.
3. **Culling/balancing:** enforce map-wide counts and spacing caps before placement applies the candidates.

### Biome classification (implemented)

- **Temperature field:** interpolate equator ↔ pole with lapse-rate and bias; subtract elevation relative to sea level before classifying.
- **Effective moisture:** rainfall + `humidityWeight * humidity` + bias + overlay bonuses (corridors + rift shoulders) plus light noise to avoid banding.
- **Lookup:** Holdridge/Whittaker-inspired table across temperature zones (`polar → cold → temperate → tropical`) and moisture zones (`arid → semiArid → subhumid → humid → perhumid`) returning biome symbols (`snow`, `tundra`, `boreal`, `temperateDry`, `temperateHumid`, `tropicalSeasonal`, `tropicalRainforest`, `desert`).
- **Vegetation density:** normalized blend of moisture + humidity with biome-aware scaling (desert/snow suppress, rainforest boosts). Stored with the biome artifact for downstream feature tweaks.

### Feature planning and apply (partial/target)

- **Forests/jungle/taiga:** use vegetation density + biome validity (and later soil fertility) to boost or restrain tree cover.
- **Marsh/wetlands:** low elevation + high moisture + near water or high fertility basins.
- **Reefs:** shallow warm water; leverage biome temperature and corridor/rift context to bias toward trade routes.
- **Ice:** very low temperature (water) or high altitude (land) from biome surface temperature field.

## Inputs and data dependencies

- **Physical:** elevation + land mask (heightfield artifact), rainfall + humidity fields (climate artifact), latitude per tile.
- **Overlays:** narrative corridor + rift masks (optional biases).
- **Bindings:** engine biome globals resolved in the step (domain stays symbol-only); future soils/resources keep bindings step-side as well.
