# MapGen Config Wiring Status (TypeScript pipeline)

Last audited: 2025-12-11 against `packages/mapgen-core/src`.

This doc maps every field in `packages/mapgen-core/src/config/schema.ts` (the canonical `MapGenConfigSchema`)
to where it is currently consumed in the TypeScript mapgen pipeline. It also calls out legacy-only knobs
(still in schema but only used by archived JS), and “untyped but consumed” keys that are read despite not
being in the schema (because many schemas allow `additionalProperties: true`).

## Legend

- **Wired**: read in current TS stages and affects output.
- **Partially wired**: read only in certain modes, or as a legacy alias to another field.
- **Legacy-only**: used only in archived JS (`docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/**`)
  and has no effect in current TS pipeline.
- **Unused / planned**: present in schema but not read in TS (and not meaningfully used anywhere else).
- **Untyped but consumed**: not in schema, but read by TS due to `additionalProperties: true`.
- **Internal**: schema field marked `@internal`; not part of stable public mod API.

## Canonical Stage Order

From `packages/mapgen-core/src/bootstrap/resolved.ts`:

`foundation` → `landmassPlates` → `coastlines` → `storySeed` → `storyHotspots` → `storyRifts`
→ `storyOrogeny` → `storyCorridorsPre` → `islands` → `mountains` → `volcanoes` → `lakes`
→ `climateBaseline` → `storySwatches` → `rivers` → `storyCorridorsPost`
→ `climateRefine` → `biomes` → `features` → `placement`

## MapGenConfig (Top-Level + Internal Plumbing)

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `presets` | **Unused / planned** | none in mapgen-core | `bootstrap/entry.ts` stores this list, but `parseConfig()` (`config/loader.ts`) does not apply presets. Upstream tooling must merge presets before calling `bootstrap()`/`parseConfig()`. |
| `stageConfig.<stage>` | **Wired (internal)** | `bootstrap/entry.ts`, `bootstrap/resolved.ts` | Boolean enablement overrides; only stages in `STAGE_ORDER` are respected. Unknown keys are preserved but ignored. |
| `stageManifest.order` | **Unused (internal)** | none | Always derived from `stageConfig`; not consulted by orchestrator. |
| `stageManifest.stages.<stage>.enabled` | **Wired (internal)** | `bootstrap/tunables.ts#stageEnabled` | Stage is treated enabled unless `.enabled === false`. Resolver sets enabled based on `stageConfig`. |
| `stageManifest.stages.<stage>.requires` | **Unused / planned (internal)** | none | Accepted for forward-compat; dependency resolution not implemented in TS yet. |
| `stageManifest.stages.<stage>.provides` | **Unused / planned (internal)** | none | Same as above. |
| `stageManifest.stages.<stage>.legacyToggles` | **Unused / planned (internal)** | none | Intended bridge from old `STORY_ENABLE_*` gating. |
| `stageManifest.stages.<stage>.blockedBy` | **Unused / planned (internal)** | none | Not currently enforced. |

### toggles (legacy STORY_ENABLE_*)

These are validated and exposed through `tunables.STORY_ENABLE_*`, but only some are read in TS layers.
`MapOrchestrator` also injects a **separate** toggle set into `MapContext` based on stage enablement, so
for story stages stage flags are the real gating mechanism.

| Toggle | Status | Consumed by | Notes |
|---|---|---|---|
| `STORY_ENABLE_HOTSPOTS` | **Wired** | `layers/features.ts` | Gates paradise reefs + volcanic vegetation embellishments. |
| `STORY_ENABLE_RIFTS` | **Wired** | `layers/biomes.ts` | Gates rift-shoulder biome nudges. |
| `STORY_ENABLE_OROGENY` | **Wired** | `layers/climate-engine.ts` (`climateRefine` pass E) | Gates windward/lee rainfall adjustments. |
| `STORY_ENABLE_SWATCHES` | **Legacy-only / ignored in TS** | none | Story swatches stage is gated via `stageConfig/stageEnabled`; no TS layer reads this toggle. |
| `STORY_ENABLE_PALEO` | **Legacy-only / ignored in TS** | none | TS has no paleo stage; `MapOrchestrator` forces this false in context. |
| `STORY_ENABLE_CORRIDORS` | **Legacy-only / ignored in TS** | none | Corridor stages are gated via stage enablement; no TS layer reads this toggle. |

## landmass (stage: `landmassPlates`)

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `landmass.crustMode` | **Wired** | `layers/landmass-plate.ts`, `layers/landmass-utils.ts` | Selects crust-first solver variant (`legacy` vs `area`) and ocean-separation behavior. |
| `landmass.baseWaterPercent` | **Wired** | `layers/landmass-plate.ts` | Primary land/water target. |
| `landmass.waterScalar` | **Wired** | `layers/landmass-plate.ts` | Multiplier on baseWaterPercent; clamped 0.25–1.75. |
| `landmass.boundaryBias` | **Legacy-only** | legacy `layers/landmass_plate.js` | TS crust-first landmask no longer uses boundary bias. |
| `landmass.boundaryShareTarget` | **Legacy-only** | legacy `layers/landmass_plate.js` | Same as above. |
| `landmass.continentalFraction` | **Wired** | `layers/landmass-plate.ts::tryCrustFirstLandmask` | Target fraction of continental plates. |
| `landmass.crustContinentalFraction` | **Partially wired (legacy alias)** | `layers/landmass-plate.ts` | Fallback alias for continentalFraction. |
| `landmass.crustClusteringBias` | **Wired** | `layers/landmass-plate.ts` | Clusters continental plates. |
| `landmass.microcontinentChance` | **Wired** | `layers/landmass-plate.ts` | Chance of micro-continental shards. |
| `landmass.crustEdgeBlend` | **Wired** | `layers/landmass-plate.ts` | Softens crust edges. |
| `landmass.crustNoiseAmplitude` | **Wired** | `layers/landmass-plate.ts` | Adds interior noise to crust heights. |
| `landmass.continentalHeight` | **Wired** | `layers/landmass-plate.ts` | Base elevation for continental crust. |
| `landmass.oceanicHeight` | **Wired** | `layers/landmass-plate.ts` | Base elevation for oceanic crust. |
| `landmass.tectonics` | **Legacy-only** | legacy `layers/landmass_plate.js` | Tectonic scoring knobs not ported to TS landmask. |
| `landmass.tectonics.interiorNoiseWeight` | **Legacy-only** | legacy landmask | — |
| `landmass.tectonics.boundaryArcWeight` | **Legacy-only** | legacy landmask | — |
| `landmass.tectonics.boundaryArcNoiseWeight` | **Legacy-only** | legacy landmask | — |
| `landmass.tectonics.fractalGrain` | **Legacy-only** | legacy landmask | — |
| `landmass.geometry` | **Wired** | `MapOrchestrator.ts` → `applyLandmassPostAdjustments` | Passed as `options.geometry` to landmass stage. |
| `landmass.geometry.post.expandTiles` | **Wired** | `layers/landmass-plate.ts::computeClosenessLimit`, `layers/landmass-utils.ts` | Also expands windows uniformly. |
| `landmass.geometry.post.expandWestTiles` | **Wired** | `layers/landmass-utils.ts::applyLandmassPostAdjustments` | West expansion. |
| `landmass.geometry.post.expandEastTiles` | **Wired** | same | East expansion. |
| `landmass.geometry.post.clampWestMin` | **Wired** | same | Hard west clamp. |
| `landmass.geometry.post.clampEastMax` | **Wired** | same | Hard east clamp. |
| `landmass.geometry.post.overrideSouth` | **Wired** | same | Fixed south bound for all windows. |
| `landmass.geometry.post.overrideNorth` | **Wired** | same | Fixed north bound for all windows. |
| `landmass.geometry.post.minWidthTiles` | **Wired** | same | Ensures minimum horizontal span. |

## oceanSeparation (stage: `landmassPlates`)

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `oceanSeparation.enabled` | **Wired** | `layers/landmass-utils.ts::applyPlateAwareOceanSeparation` | Master switch. |
| `oceanSeparation.bandPairs` | **Wired** | same | Defaults to `[[0,1],[1,2]]` if absent. |
| `oceanSeparation.baseSeparationTiles` | **Wired** | same | Baseline widening between bands. |
| `oceanSeparation.boundaryClosenessMultiplier` | **Wired** | same | Extra separation near active margins. |
| `oceanSeparation.maxPerRowDelta` | **Wired** | same | North–south smoothness cap. |
| `oceanSeparation.minChannelWidth` | **Partially wired** | same | Only used when `crustMode === "area"`. |
| `oceanSeparation.channelJitter` | **Partially wired** | same | Only used when `crustMode === "area"`. |
| `oceanSeparation.respectSeaLanes` | **Unused / planned** | none | Present in schema, not read in TS. |
| `oceanSeparation.edgeWest.enabled` | **Wired** | same | Edge override. |
| `oceanSeparation.edgeWest.baseTiles` | **Wired** | same | Positive widens ocean; negative fills land. |
| `oceanSeparation.edgeWest.boundaryClosenessMultiplier` | **Wired** | same | Boundary scaling at edge. |
| `oceanSeparation.edgeWest.maxPerRowDelta` | **Wired** | same | Edge cap. |
| `oceanSeparation.edgeEast.*` | **Wired** | same | Symmetric to edgeWest. |

## foundation (stage: `foundation`)

Only plate/dynamics/directionality are fed into `WorldModel` via
`MapOrchestrator.bindWorldModelConfigProvider()` and `world/model.ts`.
Top-level layer blocks (`mountains`, `coastlines`, etc.) are merged into foundation by
`bootstrap/tunables.ts::mergeTopLevelLayer`, so `foundation.<layer>` and top-level `<layer>`
are equivalent.

### foundation.seed

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `foundation.seed.mode` | **Unused / planned** | none | Passed into `FoundationContext.config.seed` snapshot only; not used to seed TS RNG. |
| `foundation.seed.fixedSeed` | **Unused / planned** | none | — |
| `foundation.seed.offset` | **Unused / planned** | none | — |
| *(Actual plate seeding lives in `foundation.plates.seedMode/fixedSeed/seedOffset`.)* |

### foundation.plates

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `foundation.plates.count` | **Wired** | `world/model.ts` → `world/plates.ts` | Plate count for Voronoi diagram. |
| `foundation.plates.relaxationSteps` | **Wired** | same | Lloyd relaxation iterations. |
| `foundation.plates.convergenceMix` | **Wired** | same | Mix of convergent vs divergent boundaries. |
| `foundation.plates.plateRotationMultiple` | **Wired** | same | Scales plate rotational velocity/shear. |
| `foundation.plates.seedMode` | **Wired** | `world/model.ts`, `world/plate-seed.ts` | Controls deterministic plate seeding. |
| `foundation.plates.fixedSeed` | **Wired** | same | Used when seedMode=`fixed`. |
| `foundation.plates.seedOffset` | **Wired** | same | Offset for deterministic runs. |

### foundation.dynamics

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `foundation.dynamics.mantle.bumps` | **Wired** | `world/model.ts` | Number of mantle plumes. |
| `foundation.dynamics.mantle.amplitude` | **Wired** | same | Uplift amplitude. |
| `foundation.dynamics.mantle.scale` | **Wired** | same | Spatial spread of plumes. |
| `foundation.dynamics.wind.jetStreaks` | **Wired** | same | Jet bands count. |
| `foundation.dynamics.wind.jetStrength` | **Wired** | same | Jet intensity. |
| `foundation.dynamics.wind.variance` | **Wired** | same | Directional jitter for winds. |
| `foundation.dynamics.directionality` | **Wired** | `world/plates.ts`, `layers/climate-engine.ts` | See detailed directionality table below. |

### foundation.dynamics.directionality

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `directionality.cohesion` | **Wired** | `world/plates.ts`, `climate-engine.ts` | Global alignment strength. |
| `directionality.primaryAxes.plateAxisDeg` | **Wired** | `world/plates.ts`, `climate-engine.ts` | Preferred plate heading; also affects swatch weighting. |
| `directionality.primaryAxes.windBiasDeg` | **Wired** | `climate-engine.ts::applyClimateSwatches` | Bias for zonal wind direction. |
| `directionality.primaryAxes.currentBiasDeg` | **Unused / planned** | none | Ocean-current modeling not yet ported. |
| `directionality.variability.angleJitterDeg` | **Wired** | `world/plates.ts` | Random angular deviation. |
| `directionality.variability.magnitudeVariance` | **Wired** | `world/plates.ts` | Strength variance. |
| `directionality.hemispheres.southernFlip` | **Unused / planned** | none | Hemispheric mirroring not implemented. |
| `directionality.interplay.windsFollowPlates` | **Wired** | `climate-engine.ts::refineClimateEarthlike` | Increases rain-shadow scan steps when winds align with plates. |
| `directionality.interplay.currentsFollowWinds` | **Unused / planned** | none | No TS current-field coupling yet. |

### foundation.surface (internal)

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `foundation.surface.landmass` | **Internal, partially wired** | `layers/landmass-plate.ts` | Only `foundation.surface.landmass.crustMode` is consulted as a fallback; other landmass fields ignored here. Prefer top-level `landmass`. |
| `foundation.surface.oceanSeparation` | **Internal alias** | `layers/landmass-utils.ts` | Alias container for ocean separation; actual fields are top-level `oceanSeparation`. |
| `foundation.surface.crustMode` | **Internal, partially wired** | `layers/landmass-plate.ts`, `layers/landmass-utils.ts` | Fallback crustMode source. |

### foundation.policy (internal)

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `foundation.policy.oceanSeparation` | **Internal alias** | `layers/landmass-utils.ts` | Used as fallback policy when no explicit/top-level policy passed. |

### foundation.diagnostics (internal)

Schema lists no explicit keys; TS reads **untyped** camelCase DevLogConfig keys from this block.
See “Untyped but consumed keys” below.

### foundation nested layer blocks

These are merged / read exactly like their top-level counterparts:

`foundation.oceanSeparation`, `foundation.coastlines`, `foundation.islands`,
`foundation.mountains`, `foundation.volcanoes`, `foundation.story`,
`foundation.corridors`, `foundation.biomes`, `foundation.featuresDensity`,
`foundation.placement`.

See each group’s section for field-level wiring.

## coastlines (stage: `coastlines`)

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `coastlines.bay.noiseGateAdd` | **Wired** | `layers/coastlines.ts::addRuggedCoasts` | Extra noise gate on large maps. |
| `coastlines.bay.rollDenActive` | **Wired** | same | Bay frequency near active margins. |
| `coastlines.bay.rollDenDefault` | **Wired** | same | Bay frequency elsewhere. |
| `coastlines.fjord.baseDenom` | **Wired** | same | Base fjord frequency. |
| `coastlines.fjord.activeBonus` | **Wired** | same | Bonus on convergent margins. |
| `coastlines.fjord.passiveBonus` | **Wired** | same | Bonus on passive shelves. |
| `coastlines.plateBias.threshold` | **Wired** | same | Closeness threshold. |
| `coastlines.plateBias.power` | **Wired** | same | Bias falloff exponent. |
| `coastlines.plateBias.convergent` | **Wired** | same | Convergent multiplier. |
| `coastlines.plateBias.transform` | **Wired** | same | Transform multiplier. |
| `coastlines.plateBias.divergent` | **Wired** | same | Divergent multiplier. |
| `coastlines.plateBias.interior` | **Wired** | same | Interior residual bias. |
| `coastlines.plateBias.bayWeight` | **Wired** | same | Scales bay denominators. |
| `coastlines.plateBias.bayNoiseBonus` | **Wired** | same | Noise bonus for bays near boundaries. |
| `coastlines.plateBias.fjordWeight` | **Wired** | same | Scales fjord denominators. |
| `coastlines.minSeaLaneWidth` | **Legacy-only** | legacy `layers/coastlines.js` | TS uses `corridors.sea.protection` instead; width knob not ported. |

## islands (stage: `islands`)

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `islands.fractalThresholdPercent` | **Wired** | `layers/islands.ts` | Noise cutoff for island seeds. |
| `islands.minDistFromLandRadius` | **Wired** | same | Keeps islands off continental coasts. |
| `islands.baseIslandDenNearActive` | **Wired** | same | Island odds near active boundaries. |
| `islands.baseIslandDenElse` | **Wired** | same | Island odds elsewhere. |
| `islands.hotspotSeedDenom` | **Wired** | same | Extra seed chance along hotspot trails. |
| `islands.clusterMax` | **Wired** | same | Caps tiles per cluster. |

## mountains (stage: `mountains`)

All fields are wired in `layers/mountains.ts`:

| Field | Status | Notes |
|---|---|---|
| `mountains.tectonicIntensity` | **Wired** | Global scaler. |
| `mountains.mountainThreshold` | **Wired** | Peak cutoff. |
| `mountains.hillThreshold` | **Wired** | Hill cutoff. |
| `mountains.upliftWeight` | **Wired** | Uplift contribution. |
| `mountains.fractalWeight` | **Wired** | Noise contribution. |
| `mountains.riftDepth` | **Wired** | Rift depressions. |
| `mountains.boundaryWeight` | **Wired** | Boundary closeness pull. |
| `mountains.boundaryExponent` | **Wired** | Boundary falloff exponent. |
| `mountains.interiorPenaltyWeight` | **Wired** | Currently defaulted to 0, but still applied. |
| `mountains.convergenceBonus` | **Wired** | Bonus on convergent tiles. |
| `mountains.transformPenalty` | **Wired** | Softens transform ridges. |
| `mountains.riftPenalty` | **Wired** | Reduces scores on divergent tiles. |
| `mountains.hillBoundaryWeight` | **Wired** | Foothills near margins. |
| `mountains.hillRiftBonus` | **Wired** | Rift shoulders. |
| `mountains.hillConvergentFoothill` | **Wired** | Convergent foothills. |
| `mountains.hillInteriorFalloff` | **Wired** | Interior hill suppression. |
| `mountains.hillUpliftWeight` | **Wired** | Uplift contribution to hills. |

## volcanoes (stage: `volcanoes`)

All fields are wired in `layers/volcanoes.ts`:

| Field | Status | Notes |
|---|---|---|
| `volcanoes.enabled` | **Wired** | Master switch. |
| `volcanoes.baseDensity` | **Wired** | Baseline vents per land tile. |
| `volcanoes.minSpacing` | **Wired** | Minimum spacing. |
| `volcanoes.boundaryThreshold` | **Wired** | Closeness threshold. |
| `volcanoes.boundaryWeight` | **Wired** | Base boundary weight. |
| `volcanoes.convergentMultiplier` | **Wired** | Arc multiplier. |
| `volcanoes.transformMultiplier` | **Wired** | Transform multiplier. |
| `volcanoes.divergentMultiplier` | **Wired** | Rift multiplier. |
| `volcanoes.hotspotWeight` | **Wired** | Interior hotspot weight. |
| `volcanoes.shieldPenalty` | **Wired** | Suppresses on stable shields. |
| `volcanoes.randomJitter` | **Wired** | Random additive jitter. |
| `volcanoes.minVolcanoes` | **Wired** | Minimum count backstop. |
| `volcanoes.maxVolcanoes` | **Wired** | Hard cap when >0. |

## story (consumed by `islands` and `features`)

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `story.hotspot.paradiseBias` | **Wired** | `layers/islands.ts` | Weights paradise vs volcanic hotspots. |
| `story.hotspot.volcanicBias` | **Wired** | same | — |
| `story.hotspot.volcanicPeakChance` | **Wired** | same | Peak chance for volcanic hotspots. |
| `story.features.paradiseReefChance` | **Wired** | `layers/features.ts` | Extra reef chance near paradise centers. |
| `story.features.volcanicForestChance` | **Wired** | same | Forest chance near volcanic centers. |
| `story.features.volcanicTaigaChance` | **Wired** | same | Taiga chance near volcanic centers. |

## corridors (stages: `coastlines`, `islands`, `biomes`)

Schema only defines `sea`, but TS reads additional untyped sub-policies.

### Schema-defined sea policy

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `corridors.sea.protection` | **Wired** | `layers/coastlines.ts` | `hard` blocks bay/fjord edits; `soft` allows with reduced chance. |
| `corridors.sea.softChanceMultiplier` | **Wired** | same | Probability scalar when protection is soft. |
| `corridors.sea.avoidRadius` | **Partially wired** | `layers/islands.ts` | Used to keep island clusters out of lanes; not used elsewhere yet. |

Untyped corridor keys in use are listed later.

## climate (stages: `climateBaseline`, `storySwatches`, `climateRefine`)

### climate.baseline

All baseline sub-fields are wired in `layers/climate-engine.ts::applyClimateBaseline`.

| Field | Status | Notes |
|---|---|---|
| `climate.baseline.bands.deg0to10` | **Wired** | Latitude rainfall target. |
| `climate.baseline.bands.deg10to20` | **Wired** | — |
| `climate.baseline.bands.deg20to35` | **Wired** | — |
| `climate.baseline.bands.deg35to55` | **Wired** | — |
| `climate.baseline.bands.deg55to70` | **Wired** | — |
| `climate.baseline.bands.deg70plus` | **Wired** | — |
| `climate.baseline.blend.baseWeight` | **Wired** | Engine vs band mix. |
| `climate.baseline.blend.bandWeight` | **Wired** | — |
| `climate.baseline.orographic.hi1Threshold` | **Wired** | Elevation gate. |
| `climate.baseline.orographic.hi1Bonus` | **Wired** | Rain bonus. |
| `climate.baseline.orographic.hi2Threshold` | **Wired** | Elevation gate. |
| `climate.baseline.orographic.hi2Bonus` | **Wired** | Rain bonus. |
| `climate.baseline.coastal.coastalLandBonus` | **Wired** | Coastal humidity bonus. |
| `climate.baseline.coastal.spread` | **Wired** | Inland spread (tiles). |
| `climate.baseline.noise.baseSpanSmall` | **Wired** | Noise span on small maps. |
| `climate.baseline.noise.spanLargeScaleFactor` | **Wired** | Extra span on big maps. |
| `climate.baseline.noise.scale` | **Wired** | Perlin scale. |

### climate.refine

All refine sub-fields except `pressure` are wired in `layers/climate-engine.ts::refineClimateEarthlike`.

| Field | Status | Notes |
|---|---|---|
| `climate.refine.waterGradient.radius` | **Wired** | Inland scan radius. |
| `climate.refine.waterGradient.perRingBonus` | **Wired** | Humidity per ring. |
| `climate.refine.waterGradient.lowlandBonus` | **Wired** | Lowland coastal bonus. |
| `climate.refine.orographic.steps` | **Wired** | Upwind scan steps. |
| `climate.refine.orographic.reductionBase` | **Wired** | Base shadow drying. |
| `climate.refine.orographic.reductionPerStep` | **Wired** | Extra per-step drying. |
| `climate.refine.riverCorridor.lowlandAdjacencyBonus` | **Wired** | Bonus by rivers in lowlands. |
| `climate.refine.riverCorridor.highlandAdjacencyBonus` | **Wired** | Bonus by rivers in highlands. |
| `climate.refine.lowBasin.radius` | **Wired** | Basin detection radius. |
| `climate.refine.lowBasin.delta` | **Wired** | Basin humidity bonus. |
| `climate.refine.pressure` | **Unused / planned** | Placeholder; not read in TS. |

### climate.swatches

| Field | Status | Notes |
|---|---|---|
| `climate.swatches` | **Unused / planned** | Schema placeholder. TS instead reads `climate.story.swatches` (untyped) for macro swatch logic. |

Untyped climate.story keys in use are listed later.

## biomes (stage: `biomes`)

All schema fields are wired in `layers/biomes.ts::designateEnhancedBiomes`.

| Field | Status |
|---|---|
| `biomes.tundra.latMin` | **Wired** |
| `biomes.tundra.elevMin` | **Wired** |
| `biomes.tundra.rainMax` | **Wired** |
| `biomes.tropicalCoast.latMax` | **Wired** |
| `biomes.tropicalCoast.rainMin` | **Wired** |
| `biomes.riverValleyGrassland.latMax` | **Wired** |
| `biomes.riverValleyGrassland.rainMin` | **Wired** |
| `biomes.riftShoulder.grasslandLatMax` | **Wired** |
| `biomes.riftShoulder.grasslandRainMin` | **Wired** |
| `biomes.riftShoulder.tropicalLatMax` | **Wired** |
| `biomes.riftShoulder.tropicalRainMin` | **Wired** |

## featuresDensity (stage: `features`)

All schema fields are wired in `layers/features.ts`.

| Field | Status | Notes |
|---|---|---|
| `featuresDensity.shelfReefMultiplier` | **Wired** | Scales reef chance on shelves. |
| `featuresDensity.rainforestExtraChance` | **Wired** | Extra jungle odds in wet tropics. |
| `featuresDensity.forestExtraChance` | **Wired** | Extra forest odds in temperate wet zones. |
| `featuresDensity.taigaExtraChance` | **Wired** | Extra taiga odds in cold wet zones. |

## placement (stage: `placement`)

### placement root

| Field | Status | Consumed by | Notes |
|---|---|---|---|
| `placement.wondersPlusOne` | **Wired** | `layers/placement.ts` | Adds +1 natural wonder if true. |
| `placement.floodplains` | **Wired** | same | See floodplains subfields. |
| `placement.starts` | **Wired** | same | Required block for custom starts. |

### placement.floodplains

| Field | Status | Notes |
|---|---|---|
| `placement.floodplains.minLength` | **Wired** | Min river length to host floodplains. |
| `placement.floodplains.maxLength` | **Wired** | Max contiguous floodplain stretch. |

### placement.starts

All fields wired in `layers/placement.ts` and/or MapOrchestrator-derived continent windows.

| Field | Status | Notes |
|---|---|---|
| `placement.starts.playersLandmass1` | **Wired** | Player split west band. |
| `placement.starts.playersLandmass2` | **Wired** | Player split east band. |
| `placement.starts.westContinent.west/east/south/north/continent?` | **Wired** | Used when assigning starts. |
| `placement.starts.eastContinent.west/east/south/north/continent?` | **Wired** | — |
| `placement.starts.startSectorRows` | **Wired** | Sector grid rows. |
| `placement.starts.startSectorCols` | **Wired** | Sector grid cols. |
| `placement.starts.startSectors` | **Wired** | Explicit sector list passed through. |

## diagnostics (top-level)

| Field | Status | Notes |
|---|---|---|
| `diagnostics.logAscii` | **Unused / planned** | No TS stage reads this. ASCII output is controlled by `foundation.diagnostics` dev flags (untyped). |
| `diagnostics.logHistograms` | **Unused / planned** | Histograms currently controlled by dev flags (untyped). |

## Untyped but consumed keys (not in schema)

Because most schemas allow `additionalProperties: true`, TS reads several keys that are not currently modeled in `schema.ts`.

### corridors.land / corridors.river (biomes stage)

Read in `layers/biomes.ts`:

| Key | Used by | Meaning |
|---|---|---|
| `corridors.land.biomesBiasStrength` | `biomes` | Bias strength for “edge hints” near land corridors. Default ~0.6. |
| `corridors.river.biomesBiasStrength` | `biomes` | Bias strength for river corridors. Default ~0.5. |

### climate.story.* (storySwatches + climateRefine)

Read in `layers/climate-engine.ts`:

| Key | Used by | Notes |
|---|---|---|
| `climate.story.swatches.types.<kind>.weight` | `storySwatches` | Weight for choosing swatch type. |
| `climate.story.swatches.types.<kind>.latitudeCenterDeg` | `storySwatches` | Center latitude for banded swatches. |
| `climate.story.swatches.types.<kind>.halfWidthDeg` | `storySwatches` | Half-width of latitude band (scaled by map size). |
| `climate.story.swatches.types.<kind>.drynessDelta` | `storySwatches` | Used by `macroDesertBelt`. |
| `climate.story.swatches.types.<kind>.wetnessDelta` | `storySwatches` | Used by `equatorialRainbelt` / `rainforestArchipelago`. |
| `climate.story.swatches.types.<kind>.windwardBonus` | `storySwatches` | Used by `mountainForests`. |
| `climate.story.swatches.types.<kind>.leePenalty` | `storySwatches` | Used by `mountainForests`. |
| `climate.story.swatches.types.<kind>.lowlandMaxElevation` | `storySwatches` | Used by `greatPlains`. |
| `climate.story.swatches.types.<kind>.dryDelta` | `storySwatches` | Used by `greatPlains`. |
| `climate.story.swatches.sizeScaling.widthMulSqrt` | `storySwatches` | Scales band widths with map area. |
| `climate.story.rainfall.riftRadius` | `climateRefine` | Pass D rift humidity radius. |
| `climate.story.rainfall.riftBoost` | `climateRefine` | Pass D rift humidity delta. |
| `climate.story.rainfall.paradiseDelta` | `climateRefine` | Pass F paradise hotspot humidity. |
| `climate.story.rainfall.volcanicDelta` | `climateRefine` | Pass F volcanic hotspot humidity. |
| `climate.story.orogeny.windwardBoost` | `climateRefine` | Pass E windward rainfall bonus (gated by STORY_ENABLE_OROGENY). |
| `climate.story.orogeny.leeDrynessAmplifier` | `climateRefine` | Pass E lee-side drying multiplier. |

Swatch kinds currently recognized by code: `macroDesertBelt`, `equatorialRainbelt`, `rainforestArchipelago`,
`mountainForests`, `greatPlains` (others ignored unless code adds handlers).

### foundation.diagnostics (dev flags)

`MapOrchestrator.generateMap()` reads this block and passes it to
`dev/flags.ts::initDevFlags` (camelCase). Keys currently recognized:

`enabled`, `logTiming`, `logFoundationSeed`, `logFoundationPlates`, `logFoundationDynamics`,
`logFoundationSurface`, `logFoundationSummary`, `logFoundationAscii`, `logLandmassAscii`,
`logLandmassWindows`, `logReliefAscii`, `logRainfallAscii`, `logRainfallSummary`,
`logBiomeAscii`, `logBiomeSummary`, `logStoryTags`, `logCorridorAscii`,
`logBoundaryMetrics`, `logMountains`, `logVolcanoes`, `foundationHistograms`, `layerCounts`.

These map 1:1 to DEV flags in `packages/mapgen-core/src/dev/flags.ts`.
