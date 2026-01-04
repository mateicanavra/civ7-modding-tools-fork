# SPEC: Target Architecture (Canonical)

## 7. Appendix: Canonical Target Trees (Full)

### 7.1 Core SDK: `CORE_SDK_ROOT` (full)

```text
CORE_SDK_ROOT/
├─ AGENTS.md
├─ bunfig.toml
├─ package.json
├─ tsconfig.json
├─ tsconfig.paths.json
├─ tsconfig.tsup.json
├─ tsup.config.ts
├─ src/
│  ├─ AGENTS.md
│  ├─ index.ts
│  ├─ authoring/
│  │  ├─ index.ts
│  │  ├─ recipe.ts
│  │  ├─ stage.ts
│  │  ├─ step.ts
│  │  └─ types.ts
│  ├─ core/
│  │  ├─ index.ts
│  │  ├─ context/
│  │  │  ├─ index.ts
│  │  │  ├─ types.ts
│  │  │  ├─ createExtendedMapContext.ts
│  │  │  └─ writers.ts
│  │  └─ platform/
│  │     ├─ index.ts
│  │     ├─ PlotTags.ts
│  │     └─ TerrainConstants.ts
│  ├─ dev/
│  │  ├─ ascii.ts
│  │  ├─ flags.ts
│  │  ├─ histograms.ts
│  │  ├─ index.ts
│  │  ├─ introspection.ts
│  │  ├─ logging.ts
│  │  ├─ summaries.ts
│  │  └─ timing.ts
│  ├─ engine/
│  │  ├─ index.ts
│  │  ├─ errors.ts
│  │  ├─ types.ts
│  │  ├─ ExecutionPlan.ts
│  │  ├─ Observability.ts
│  │  ├─ PipelineExecutor.ts
│  │  ├─ StepConfig.ts
│  │  ├─ StepRegistry.ts
│  │  └─ TagRegistry.ts
│  ├─ lib/
│  │  ├─ collections/
│  │  │  ├─ freeze-clone.ts
│  │  │  ├─ index.ts
│  │  │  └─ record.ts
│  │  ├─ grid/
│  │  │  ├─ bounds.ts
│  │  │  ├─ distance/
│  │  │  │  └─ bfs.ts
│  │  │  ├─ index.ts
│  │  │  ├─ indexing.ts
│  │  │  ├─ neighborhood/
│  │  │  │  ├─ hex-oddq.ts
│  │  │  │  └─ square-3x3.ts
│  │  │  └─ wrap.ts
│  │  ├─ heightfield/
│  │  │  ├─ base.ts
│  │  │  ├─ index.ts
│  │  │  └─ sea-level.ts
│  │  ├─ math/
│  │  │  ├─ clamp.ts
│  │  │  ├─ index.ts
│  │  │  └─ lerp.ts
│  │  ├─ noise/
│  │  │  ├─ fractal.ts
│  │  │  ├─ index.ts
│  │  │  └─ perlin.ts
│  │  ├─ plates/
│  │  │  ├─ crust.ts
│  │  │  ├─ index.ts
│  │  │  └─ topology.ts
│  │  └─ rng/
│  │     ├─ index.ts
│  │     ├─ pick.ts
│  │     ├─ unit.ts
│  │     └─ weighted-choice.ts
│  ├─ polyfills/
│  │  └─ text-encoder.ts
│  ├─ shims/
│  │  └─ typebox-format.ts
│  └─ trace/
│     └─ index.ts
└─ test/
   ├─ authoring/
   │  └─ authoring.test.ts
   ├─ engine/
   │  ├─ execution-plan.test.ts
   │  ├─ hello-mod.smoke.test.ts
   │  ├─ placement-gating.test.ts
   │  ├─ tag-registry.test.ts
   │  ├─ tracing.test.ts
   │  └─ smoke.test.ts
   └─ setup.ts
```

### 7.2 Standard content package: `STANDARD_CONTENT_ROOT` (full)

```text
STANDARD_CONTENT_ROOT/
├─ AGENTS.md
├─ package.json
├─ tsconfig.json
├─ tsconfig.tsup.json
├─ tsup.config.ts
├─ mod/
│  ├─ config/
│  │  └─ config.xml
│  ├─ swooper-maps.modinfo
│  └─ text/
│     └─ en_us/
│        ├─ MapText.xml
│        └─ ModuleText.xml
├─ src/
│  ├─ AGENTS.md
│  ├─ mod.ts
│  ├─ maps/
│  │  ├─ gate-a-continents.ts
│  │  ├─ shattered-ring.ts
│  │  ├─ sundered-archipelago.ts
│  │  ├─ swooper-desert-mountains.ts
│  │  ├─ swooper-earthlike.ts
│  │  └─ _runtime/
│  │     ├─ helpers.ts
│  │     ├─ map-init.ts
│  │     ├─ run-standard.ts
│  │     ├─ standard-config.ts
│  │     └─ types.ts
│  ├─ domain/
│  │  ├─ config/
│  │  │  └─ schema/
│  │  │     ├─ index.ts
│  │  │     ├─ common.ts
│  │  │     ├─ ecology.ts
│  │  │     ├─ foundation.ts
│  │  │     ├─ hydrology.ts
│  │  │     ├─ landmass.ts
│  │  │     ├─ morphology.ts
│  │  │     └─ narrative.ts
│  │  ├─ ecology/
│  │  │  ├─ index.ts
│  │  │  ├─ biomes/
│  │  │  │  ├─ coastal.ts
│  │  │  │  ├─ globals.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ types.ts
│  │  │  │  └─ nudges/
│  │  │  │     ├─ corridor-bias.ts
│  │  │  │     ├─ corridor-edge-hints.ts
│  │  │  │     ├─ rift-shoulder.ts
│  │  │  │     ├─ river-valley.ts
│  │  │  │     ├─ tropical-coast.ts
│  │  │  │     └─ tundra-restraint.ts
│  │  │  └─ features/
│  │  │     ├─ density-tweaks.ts
│  │  │     ├─ index.ts
│  │  │     ├─ indices.ts
│  │  │     ├─ paradise-reefs.ts
│  │  │     ├─ place-feature.ts
│  │  │     ├─ shelf-reefs.ts
│  │  │     ├─ types.ts
│  │  │     └─ volcanic-vegetation.ts
│  │  ├─ foundation/
│  │  │  ├─ constants.ts
│  │  │  ├─ index.ts
│  │  │  ├─ plate-seed.ts
│  │  │  ├─ plates.ts
│  │  │  └─ types.ts
│  │  ├─ hydrology/
│  │  │  ├─ index.ts
│  │  │  └─ climate/
│  │  │     ├─ baseline.ts
│  │  │     ├─ distance-to-water.ts
│  │  │     ├─ index.ts
│  │  │     ├─ orographic-shadow.ts
│  │  │     ├─ runtime.ts
│  │  │     ├─ types.ts
│  │  │     ├─ refine/
│  │  │     │  ├─ hotspot-microclimates.ts
│  │  │     │  ├─ index.ts
│  │  │     │  ├─ orogeny-belts.ts
│  │  │     │  ├─ orographic-shadow.ts
│  │  │     │  ├─ rift-humidity.ts
│  │  │     │  ├─ river-corridor.ts
│  │  │     │  └─ water-gradient.ts
│  │  │     └─ swatches/
│  │  │        ├─ chooser.ts
│  │  │        ├─ equatorial-rainbelt.ts
│  │  │        ├─ great-plains.ts
│  │  │        ├─ index.ts
│  │  │        ├─ macro-desert-belt.ts
│  │  │        ├─ monsoon-bias.ts
│  │  │        ├─ mountain-forests.ts
│  │  │        ├─ rainforest-archipelago.ts
│  │  │        └─ types.ts
│  │  ├─ morphology/
│  │  │  ├─ index.ts
│  │  │  ├─ coastlines/
│  │  │  │  ├─ adjacency.ts
│  │  │  │  ├─ corridor-policy.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ plate-bias.ts
│  │  │  │  ├─ rugged-coasts.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ islands/
│  │  │  │  ├─ adjacency.ts
│  │  │  │  ├─ fractal-threshold.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ placement.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ landmass/
│  │  │  │  ├─ crust-first-landmask.ts
│  │  │  │  ├─ diagnostics.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ plate-stats.ts
│  │  │  │  ├─ post-adjustments.ts
│  │  │  │  ├─ terrain-apply.ts
│  │  │  │  ├─ types.ts
│  │  │  │  ├─ water-target.ts
│  │  │  │  ├─ windows.ts
│  │  │  │  └─ ocean-separation/
│  │  │  │     ├─ apply.ts
│  │  │  │     ├─ carve.ts
│  │  │  │     ├─ fill.ts
│  │  │  │     ├─ index.ts
│  │  │  │     ├─ policy.ts
│  │  │  │     ├─ row-state.ts
│  │  │  │     └─ types.ts
│  │  │  ├─ mountains/
│  │  │  │  ├─ apply.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ scoring.ts
│  │  │  │  ├─ selection.ts
│  │  │  │  └─ types.ts
│  │  │  └─ volcanoes/
│  │  │     ├─ apply.ts
│  │  │     ├─ index.ts
│  │  │     ├─ scoring.ts
│  │  │     ├─ selection.ts
│  │  │     └─ types.ts
│  │  ├─ narrative/
│  │  │  ├─ index.ts
│  │  │  ├─ queries.ts
│  │  │  ├─ swatches.ts
│  │  │  ├─ paleo/
│  │  │  │  ├─ index.ts
│  │  │  ├─ views/
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ keys.ts
│  │  │  │  ├─ normalize.ts
│  │  │  │  └─ derive.ts
│  │  │  ├─ corridors/
│  │  │  │  ├─ backfill.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ island-hop.ts
│  │  │  │  ├─ land-corridors.ts
│  │  │  │  ├─ river-chains.ts
│  │  │  │  ├─ runtime.ts
│  │  │  │  ├─ sea-lanes.ts
│  │  │  │  ├─ state.ts
│  │  │  │  ├─ style-cache.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ orogeny/
│  │  │  │  ├─ belts.ts
│  │  │  │  ├─ cache.ts
│  │  │  │  ├─ index.ts
│  │  │  │  └─ wind.ts
│  │  │  ├─ tagging/
│  │  │  │  ├─ hotspots.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ margins.ts
│  │  │  │  ├─ rifts.ts
│  │  │  │  └─ types.ts
│  │  │  └─ utils/
│  │  │     ├─ adjacency.ts
│  │  │     ├─ dims.ts
│  │  │     ├─ latitude.ts
│  │  │     ├─ rng.ts
│  │  │     └─ water.ts
│  │  ├─ placement/
│  │  │  ├─ advanced-start.ts
│  │  │  ├─ areas.ts
│  │  │  ├─ diagnostics.ts
│  │  │  ├─ discoveries.ts
│  │  │  ├─ fertility.ts
│  │  │  ├─ floodplains.ts
│  │  │  ├─ index.ts
│  │  │  ├─ resources.ts
│  │  │  ├─ snow.ts
│  │  │  ├─ starts.ts
│  │  │  ├─ terrain-validation.ts
│  │  │  ├─ types.ts
│  │  │  ├─ water-data.ts
│  │  │  └─ wonders.ts
│  │  └─ index.ts
│  └─ recipes/
│     └─ standard/
│        ├─ recipe.ts
│        ├─ runtime.ts
│        └─ stages/
│           ├─ ecology/
│           │  ├─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ biomes.model.ts
│           │     ├─ biomes.ts
│           │     ├─ features.model.ts
│           │     └─ features.ts
│           ├─ foundation/
│           │  ├─ index.ts
│           │  ├─ producer.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ foundation.model.ts
│           │     └─ foundation.ts
│           ├─ hydrology-core/
│           │  ├─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ rivers.model.ts
│           │     └─ rivers.ts
│           ├─ hydrology-post/
│           │  ├─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ climateRefine.model.ts
│           │     └─ climateRefine.ts
│           ├─ hydrology-pre/
│           │  ├─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ climateBaseline.model.ts
│           │     ├─ climateBaseline.ts
│           │     ├─ lakes.model.ts
│           │     └─ lakes.ts
│           ├─ morphology-mid/
│           │  ├─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ ruggedCoasts.model.ts
│           │     └─ ruggedCoasts.ts
│           ├─ morphology-post/
│           │  ├─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ islands.model.ts
│           │     ├─ islands.ts
│           │     ├─ mountains.model.ts
│           │     ├─ mountains.ts
│           │     ├─ volcanoes.model.ts
│           │     └─ volcanoes.ts
│           ├─ morphology-pre/
│           │  ├─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ coastlines.model.ts
│           │     ├─ coastlines.ts
│           │     ├─ landmassPlates.model.ts
│           │     └─ landmassPlates.ts
│           ├─ narrative-mid/
│           │  ├─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ storyCorridorsPre.model.ts
│           │     ├─ storyCorridorsPre.ts
│           │     ├─ storyOrogeny.model.ts
│           │     └─ storyOrogeny.ts
│           ├─ narrative-post/
│           │  ├─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ storyCorridorsPost.model.ts
│           │     └─ storyCorridorsPost.ts
│           ├─ narrative-pre/
│           │  ├─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ storyHotspots.model.ts
│           │     ├─ storyHotspots.ts
│           │     ├─ storyRifts.model.ts
│           │     ├─ storyRifts.ts
│           │     ├─ storySeed.model.ts
│           │     └─ storySeed.ts
│           ├─ narrative-swatches/
│           │  ├─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ storySwatches.model.ts
│           │     └─ storySwatches.ts
│           └─ placement/
│              ├─ index.ts
│              ├─ placement-inputs.ts
│              ├─ placement-outputs.ts
│              └─ steps/
│                 ├─ index.ts
│                 ├─ derivePlacementInputs.model.ts
│                 ├─ derivePlacementInputs.ts
│                 ├─ placement.model.ts
│                 └─ placement.ts
└─ test/
   ├─ dev/
   │  └─ crust-map.test.ts
   ├─ foundation/
   │  ├─ plate-seed.test.ts
   │  ├─ plates.test.ts
   │  └─ voronoi.test.ts
   ├─ layers/
   │  └─ callsite-fixes.test.ts
   ├─ pipeline/
   │  └─ artifacts.test.ts
   ├─ story/
   │  ├─ corridors.test.ts
   │  ├─ orogeny.test.ts
   │  ├─ overlays.test.ts
   │  ├─ paleo.test.ts
   │  └─ tags.test.ts
   ├─ standard-recipe.test.ts
   └─ standard-run.test.ts
```
