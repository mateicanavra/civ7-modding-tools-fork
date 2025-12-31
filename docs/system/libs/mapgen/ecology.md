# Ecology

## Overview

Ecology turns the physical world (foundation + morphology + climate) into living‑world signals: **soils**, **biomes**, **resources**, and **terrain features**. It follows the operation-module architecture (`docs/projects/engine-refactor-v1/resources/spec/SPEC-pending-step-domain-operation-modules.md`): every domain op exports its own schemas/defaults, and steps stay orchestration-only (build inputs → call op → apply/publish).

### Responsibilities (causal chain)

1. **Pedology (planned):** derive soil class + fertility from bedrock age/type, sediment depth, slope, and climate (CLORPT proxy) so downstream placement has a physical substrate.
2. **Resource basin mapping (planned):** generate clustered candidate basins for coal/iron/oil from pedology + tectonics + hydrology, then hand results to placement.
3. **Biome classification (implemented):** map temperature + effective moisture into Whittaker/Holdridge-inspired zones with vegetation density.
4. **Feature planning (partial):** propose feature tweaks (reefs/vegetation/taiga/ice) using biome + climate (and later soils/hydrology), then apply via the step/adapters.

## Architecture (ops, artifacts, and contracts)

- Domains expose **one op per module** with colocated `input`, `config`, and `output` schemas and `defaultConfig`. Steps import ops directly; no wrapper schemas in steps.
- Artifacts are recipe-owned keys with domain-owned shapes; bindings to Civ7 engine IDs stay in the step layer.

| Operation (domain op) | Kind | Inputs | Outputs |
| --- | --- | --- | --- |
| `ecology/pedology/classify` (planned) | `compute` | bedrock age/type, sediment depth, slope/relief, climate fields | `artifact:ecology.soils@v1` — `{ soilType: Uint8Array, fertility: Float32Array }` |
| `ecology/resources/plan-basins` (planned) | `plan` | soils artifact, tectonics, hydrology, climate | `artifact:ecology.resourceBasins@v1` — per-resource probability maps and clustered basin candidates |
| `ecology/biomes/classify` (implemented) | `compute` | `width/height`, rainfall + humidity fields, elevation, latitude, land mask, optional corridor/rift masks | `artifact:ecology.biomeClassification@v1` — `{ width, height, biomeIndex, vegetationDensity, effectiveMoisture, surfaceTemperature }` |
| `ecology/features/plan` (planned) | `plan` | biome classification, soils/hydrology overlays, story overlays | feature intents (reef/vegetation/taiga/ice) + density tweaks |

## Step wiring (standard recipe)

1. **Pedology step (planned)** — build fields from bedrock/slope/sediment/climate, call `pedology.classify.run`, publish `artifact:ecology.soils@v1`.
2. **Resource basins step (planned)** — require soils + tectonics/hydrology, call `resources.planBasins.run`, publish `artifact:ecology.resourceBasins@v1` for placement.
3. **Biomes step (implemented)** — build rainfall/humidity/elevation/latitude + corridor/rift masks, call `classifyBiomes.run`, publish `artifact:ecology.biomeClassification@v1`, map symbols → engine biome IDs, set `field:biomeId` (water tiles explicitly assigned `BIOME_MARINE`).
4. **Features step (partial)** — require biome classification (and later soils/hydrology/story overlays), gate embellishments using vegetation density and biases, write engine features + `field:featureType`.

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
