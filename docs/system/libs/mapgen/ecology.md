# Ecology

> **Status:** Canonical (domain-only causality + contract spec)
>
> **This doc is:** what Ecology *means* in the pipeline: responsibilities, inputs, outputs, and the intended “physics → living-world” causal chain.
>
> **This doc is not:** SDK wiring guidance (step/stage file layout, authoring mechanics, adapters).

## Overview

Ecology turns the physical world (foundation + morphology + climate) into living‑world signals: **soils**, **biomes**, **resources**, and **terrain features**.

Baseline non-wonder feature placement is ecology-owned (forests, wetlands, reefs, ice), while placement retains natural wonders and floodplains. Historical rationale: `docs/projects/engine-refactor-v1/resources/spike/_archive/spike-ecology-feature-placement-ownership.md`.

### Responsibilities (causal chain)

1. **Pedology:** derive soil class + fertility from elevation/relief, rainfall + humidity, and optional bedrock/sediment fields so downstream placement has a physical substrate.
2. **Resource basin mapping:** generate clustered candidate basins for resources from pedology + climate and hand results to placement.
3. **Biome classification:** map temperature + effective moisture into Whittaker/Holdridge-inspired zones with vegetation density, then optionally smooth biome edges.
4. **Feature planning + apply:** plan vegetation, wetlands, reefs, and ice intents using biome + climate + soils, merge intents, and apply them to the engine/fields.

## Inputs and outputs (domain contract)

### Inputs (what must exist before Ecology runs)

Ecology consumes:
- **Physical substrate:** elevation + land mask, relief/slope proxies, sediment/erodibility proxies (when available).
- **Climate:** rainfall/moisture and temperature signals (coarse bands are acceptable, but must be stable and interpretable).
- **Optional overlays:** narrative/playability annotations that bias, not replace, the physics (corridors, rift motifs).

### Outputs (products Ecology owns)

Ecology publishes domain-level products that downstream consumers can treat as stable inputs:

- **Soils / fertility:** a compact soil class + fertility signal for resources and start biasing.
- **Biome classification:** biome index/symbol plus derived indices used by features and placement (vegetation density, effective moisture, freeze index).
- **Resource basin candidates:** clustered candidate basins intended for Placement to consume and turn into concrete placements.
- **Baseline features:** planned and applied non-wonder features (forests/wetlands/reefs/ice).

### Buffers vs artifacts (contract nuance)

Ecology is primarily an **artifact-producing** domain built on upstream **buffers**:

- It consumes shared mutable layers (e.g., elevation/heightfield and climate fields) as the physics/climate substrate.
- It publishes soils, biomes, basin candidates, and feature intents as contracted products for downstream consumption.

If Ecology refines an upstream buffer (rare; generally avoid), treat that as an explicit, testable modeling decision. Do not implicitly “smuggle” buffer semantics into published artifacts.

### Overlays (read-only bias inputs)

Ecology may consume upstream **overlays** as bias inputs (not as physics replacements):

- Example: read corridor overlays (e.g., mountain corridors) to bias biome seams, vegetation density, or feature planning along those corridors.
- Rule: overlays should be treated as **read-only** at this layer unless Ecology is explicitly responsible for adding a new overlay type/instance (rare).

## Operation catalog (atomic responsibilities)

Ecology’s model should be expressed as **atomic operations** (single responsibility) that steps/stages orchestrate:

| Operation | Responsibility | Inputs | Outputs |
| --- | --- | --- | --- |
| `ecology.pedology.classify` | Classify soil type and fertility from physics + climate proxies. | elevation/relief, climate, optional sediment/bedrock proxies | soils + fertility |
| `ecology.pedology.aggregate` | Summarize soils to region-level signals for downstream consumers. | soils | region summaries |
| `ecology.resources.planBasins` | Plan candidate resource basins (clustered, explainable). | soils + climate | basin candidates |
| `ecology.resources.balanceBasins` | Apply map-wide balancing constraints (counts, spacing). | basin candidates | balanced candidates |
| `ecology.biomes.classify` | Classify biomes from temperature + effective moisture + land mask. | climate + latitude + elevation + land mask | biome index/symbol + derived indices |
| `ecology.biomes.refineEdges` | Smooth biome seams without destroying macro zones. | biomes + land mask | refined biomes |
| `ecology.features.plan` | Plan baseline non-wonder feature intents (veg/wetlands/reefs/ice). | biomes + soils + climate + land mask | feature intents |
| `ecology.features.apply` | Apply planned intents to engine fields without overwrites. | feature intents + bindings | updated fields |

## Modeling notes (first principles)

### Pedology (soils)

- **CLORPT proxy:** combine **Climate** (temp/moisture), **Relief** (slope/curvature), **Parent material** (bedrock age/type + sediment depth), and **Time** heuristics to classify soil type (e.g., sand/loam/clay/rocky) and fertility (0–1).
- **Signals:** deep sediment + moderate rain → loam/high fertility; steep/young crust + little sediment → rocky/low fertility; cold/arid plateaus → thin, infertile soils.
- **Outputs:** soil class + fertility scalar used by resources and placement biasing.

### Resource basin planning

1. **Candidate mapping:** derive per-resource probabilities from geology + climate (e.g., coal in low, wet sedimentary basins; iron on ancient shields/hills; oil on shelves or wet lowlands).
2. **Clustering:** promote contiguous basins/fields instead of speckled singles; weight by fertility and hydrology proximity.
3. **Culling/balancing:** enforce map-wide counts and spacing caps before placement applies the candidates.

### Biome classification

- **Temperature field:** interpolate equator ↔ pole with lapse-rate and bias; subtract elevation relative to sea level before classifying.
- **Effective moisture:** rainfall + `humidityWeight * humidity` + bias + overlay bonuses (corridors + rift shoulders) plus light noise to avoid banding.
- **Lookup:** Holdridge/Whittaker-inspired table across temperature zones (`polar → cold → temperate → tropical`) and moisture zones (`arid → semiArid → subhumid → humid → perhumid`) returning biome symbols (`snow`, `tundra`, `boreal`, `temperateDry`, `temperateHumid`, `tropicalSeasonal`, `tropicalRainforest`, `desert`).
- **Vegetation density:** normalized blend of moisture + humidity with biome-aware scaling (desert/snow suppress, rainforest boosts).

### Feature planning and apply

- **Forests/jungle/taiga:** use vegetation density + biome validity (and later soil fertility) to boost or restrain tree cover.
- **Marsh/wetlands:** low elevation + high moisture + near water or high fertility basins.
- **Reefs:** shallow warm water; leverage biome temperature and (optional) motif overlays to bias reef belts without inventing new physics.
- **Ice:** very low temperature (water) or high altitude (land) from biome surface temperature field.

## Related references (implementation guidance lives elsewhere)

- Domain layering + boundaries: `docs/system/libs/mapgen/architecture.md`
- Narrative/playability contract: `docs/projects/engine-refactor-v1/resources/PRD-target-narrative-and-playability.md`
