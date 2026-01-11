import { Type, type Static } from "typebox";
import { BiomeEngineBindingsSchema } from "./biome-bindings.js";
import { classifyBiomes } from "./ops/classify-biomes/index.js";
import { planAquaticFeaturePlacements } from "./ops/plan-aquatic-feature-placements/index.js";
import { planIceFeaturePlacements } from "./ops/plan-ice-feature-placements/index.js";
import { planPlotEffects } from "./ops/plan-plot-effects/index.js";
import { planVegetatedFeaturePlacements } from "./ops/plan-vegetated-feature-placements/index.js";
import { planWetFeaturePlacements } from "./ops/plan-wet-feature-placements/index.js";

/**
 * Biome classification config (Holdridge/Whittaker-inspired).
 * Sourced from the ecology domain operation to keep schema + logic colocated.
 */
const BiomeConfigSchema = classifyBiomes.config;

/**
 * Optional bindings from biome symbols -> engine biome globals.
 */
const BiomeBindingsSchema = BiomeEngineBindingsSchema;

/**
 * Baseline feature placement config split by concern (step orchestrates order).
 */
const FeaturesPlacementConfigSchema = Type.Object(
  {
    vegetated: planVegetatedFeaturePlacements.config,
    wet: planWetFeaturePlacements.config,
    aquatic: planAquaticFeaturePlacements.config,
    ice: planIceFeaturePlacements.config,
  },
  { additionalProperties: false }
);

/**
 * Config for climate/ecology plot effects (snow, sand, burned).
 */
const PlotEffectsConfigSchema = planPlotEffects.config;

/**
 * Localized feature bonuses around story elements.
 */
export const FeaturesConfigSchema = Type.Object(
  {
    /** Extra coral reef probability near paradise islands (percent 0..100). */
    paradiseReefChance: Type.Number({
      description: "Extra coral reef probability near paradise islands (percent 0..100).",
      default: 18,
      minimum: 0,
      maximum: 100,
    }),
    /**
     * Radius (tiles) around paradise hotspots to seed bonus reefs.
     * Larger values create larger reef halos around paradise islands.
     */
    paradiseReefRadius: Type.Number({
      description: "Radius (tiles) around paradise hotspots to seed bonus reefs.",
      default: 2,
      minimum: 0,
    }),
    /** Extra temperate forest chance on volcanic slopes in warm climates (percent 0..100). */
    volcanicForestChance: Type.Number({
      description:
        "Extra temperate forest chance on volcanic slopes in warm climates (percent 0..100).",
      default: 22,
      minimum: 0,
      maximum: 100,
    }),
    /**
     * Additional bonus (percent) applied on top of volcanic forest chance.
     * Use to make volcano-adjacent forests stand out without changing the base rate.
     */
    volcanicForestBonus: Type.Number({
      description: "Additional bonus (percent) applied on top of volcanic forest chance.",
      default: 6,
      minimum: 0,
      maximum: 100,
    }),
    /**
     * Minimum rainfall required for volcanic forest growth (rainfall units).
     * Raise to restrict volcanic forests to very wet regions.
     */
    volcanicForestMinRainfall: Type.Number({
      description: "Minimum rainfall required for volcanic forest growth (rainfall units).",
      default: 95,
      minimum: 0,
    }),
    /** Extra coniferous forest chance on volcano-adjacent tiles in cold climates (percent 0..100). */
    volcanicTaigaChance: Type.Number({
      description:
        "Extra coniferous forest chance on volcano-adjacent tiles in cold climates (percent 0..100).",
      default: 25,
      minimum: 0,
      maximum: 100,
    }),
    /**
     * Additional bonus (percent) applied on top of volcanic taiga chance.
     * Use to emphasize taiga halos around volcanic belts.
     */
    volcanicTaigaBonus: Type.Number({
      description: "Additional bonus (percent) applied on top of volcanic taiga chance.",
      default: 5,
      minimum: 0,
      maximum: 100,
    }),
    /**
     * Radius (tiles) around volcanic hotspots to consider for vegetation bonuses.
     * Larger values create broader volcanic vegetation halos.
     */
    volcanicRadius: Type.Number({
      description: "Radius (tiles) around volcanic hotspots to consider for vegetation bonuses.",
      default: 1,
      minimum: 1,
    }),
    /**
     * Minimum absolute latitude (degrees) for volcanic taiga placement.
     * Values near 0 allow taiga in warm latitudes; higher values restrict to cold zones.
     */
    volcanicTaigaMinLatitude: Type.Number({
      description:
        "Minimum absolute latitude (degrees) for volcanic taiga placement (use higher to bias cold zones).",
      default: 20,
      minimum: 0,
    }),
    /**
     * Maximum elevation for volcanic taiga placement (meters).
     * Higher values allow taiga bonuses into highlands.
     */
    volcanicTaigaMaxElevation: Type.Number({
      description: "Maximum elevation for volcanic taiga placement (meters).",
      default: 600,
    }),
    /**
     * Minimum rainfall required for volcanic taiga growth (rainfall units).
     * Raise to restrict taiga to wetter cold regions.
     */
    volcanicTaigaMinRainfall: Type.Number({
      description: "Minimum rainfall required for volcanic taiga growth (rainfall units).",
      default: 70,
      minimum: 0,
    }),
  },
  { additionalProperties: false }
);

/**
 * Feature density controls for vegetation and reef prevalence.
 * These are additive/scale knobs layered on top of the baseline feature pass.
 */
export const FeaturesDensityConfigSchema = Type.Object(
  {
    /**
     * Coral reef density multiplier on passive continental shelves.
     * - Values > 1 increase reef prevalence along shelf edges
     * - Values < 1 reduce reef spawning
     * @default 0.6
     */
    shelfReefMultiplier: Type.Number({
      description:
        "Coral reef density multiplier on passive continental shelves (scalar, 0..2 typical).",
      default: 0.6,
      minimum: 0,
    }),
    /**
     * Radius (tiles) around passive shelf markers to seed extra reefs.
     * Larger values widen reef skirts around continental shelves.
     */
    shelfReefRadius: Type.Number({
      description: "Radius (tiles) around passive shelves to seed extra reefs.",
      default: 1,
      minimum: 0,
    }),
    /**
     * Bonus jungle/rainforest probability in wet tropics.
     * Adds to base chance when humidity and latitude criteria are met.
     * Example: 10 adds 10% extra chance for rainforest tiles.
     */
    rainforestExtraChance: Type.Number({
      description:
        "Bonus jungle/rainforest probability in wet tropics (percent 0..100).",
      default: 55,
      minimum: 0,
      maximum: 100,
    }),
    /**
     * Bonus temperate forest probability in moderate rainfall zones.
     * Adds to base chance in mid-latitude humid regions.
     * Example: 10 adds 10% extra chance for forest tiles.
     */
    forestExtraChance: Type.Number({
      description:
        "Bonus temperate forest probability in moderate rainfall zones (percent 0..100).",
      default: 30,
      minimum: 0,
      maximum: 100,
    }),
    /**
     * Bonus coniferous forest (taiga) probability in cold regions.
     * Adds to base chance near polar latitudes.
     * Example: 5 adds 5% extra chance for taiga tiles.
     */
    taigaExtraChance: Type.Number({
      description:
        "Bonus coniferous forest probability in cold regions (percent 0..100).",
      default: 35,
      minimum: 0,
      maximum: 100,
    }),
    /**
     * Vegetation scaling factor for rainforest extra chance.
     * Higher values make dense vegetation add more rainforest bonus.
     */
    rainforestVegetationScale: Type.Number({
      description:
        "Vegetation scaling factor for rainforest extra chance (percent per 1.0 vegetation).",
      default: 50,
      minimum: 0,
    }),
    /**
     * Vegetation scaling factor for temperate forest extra chance.
     * Higher values make dense vegetation add more forest bonus.
     */
    forestVegetationScale: Type.Number({
      description:
        "Vegetation scaling factor for temperate forest extra chance (percent per 1.0 vegetation).",
      default: 30,
      minimum: 0,
    }),
    /**
     * Vegetation scaling factor for taiga extra chance.
     * Higher values make dense vegetation add more taiga bonus.
     */
    taigaVegetationScale: Type.Number({
      description: "Vegetation scaling factor for taiga extra chance (percent per 1.0 vegetation).",
      default: 20,
      minimum: 0,
    }),
    /**
     * Minimum rainfall needed before rainforest density bonuses apply.
     * Use to prevent rainforests from appearing in marginally wet tropics.
     */
    rainforestMinRainfall: Type.Number({
      description: "Minimum rainfall needed before rainforest bonuses apply.",
      default: 130,
      minimum: 0,
    }),
    /**
     * Minimum rainfall needed before temperate forest density bonuses apply.
     * Use to keep forests from appearing in dry grasslands.
     */
    forestMinRainfall: Type.Number({
      description: "Minimum rainfall needed before forest bonuses apply.",
      default: 100,
      minimum: 0,
    }),
    /**
     * Maximum elevation for taiga density bonuses (meters).
     * Lower values confine taiga boosts to lowlands.
     */
    taigaMaxElevation: Type.Number({
      description: "Maximum elevation for taiga density bonuses (meters).",
      default: 300,
    }),
    /**
     * Minimum vegetation density (0..1) before any extra density bonuses apply.
     * Raise this to keep barren regions from receiving bonus forests.
     */
    minVegetationForBonus: Type.Number({
      description: "Minimum vegetation density before density bonuses apply (0..1).",
      default: 0.01,
      minimum: 0,
      maximum: 1,
    }),
  },
  { additionalProperties: false }
);

export const EcologyConfigSchema = Type.Object(
  {
    biomes: Type.Optional(BiomeConfigSchema),
    bindings: Type.Optional(BiomeBindingsSchema),
    featuresPlacement: Type.Optional(FeaturesPlacementConfigSchema),
    plotEffects: Type.Optional(PlotEffectsConfigSchema),
    features: Type.Optional(FeaturesConfigSchema),
    featuresDensity: Type.Optional(FeaturesDensityConfigSchema),
  },
  { additionalProperties: false }
);

export type BiomeConfig = Static<typeof EcologyConfigSchema["properties"]["biomes"]>;
export type BiomeBindings = Static<typeof EcologyConfigSchema["properties"]["bindings"]>;
export type FeaturesPlacementConfig =
  Static<typeof EcologyConfigSchema["properties"]["featuresPlacement"]>;
export type PlotEffectsConfig =
  Static<typeof EcologyConfigSchema["properties"]["plotEffects"]>;
export type FeaturesConfig = Static<typeof EcologyConfigSchema["properties"]["features"]>;
export type FeaturesDensityConfig =
  Static<typeof EcologyConfigSchema["properties"]["featuresDensity"]>;
export type EcologyConfig = Static<typeof EcologyConfigSchema>;
