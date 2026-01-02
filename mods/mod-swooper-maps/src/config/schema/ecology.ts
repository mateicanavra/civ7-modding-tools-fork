import { Type } from "typebox";

import { classifyBiomes } from "@mapgen/domain/ecology/ops/classify-biomes.js";
import { BiomeEngineBindingsSchema } from "@mapgen/domain/ecology/biome-bindings.js";

/**
 * Biome classification config (Holdridge/Whittaker-inspired).
 * Sourced directly from the ecology domain operation to keep schema + logic colocated.
 * This controls how rainfall/temperature translate into biome symbols and vegetation density.
 */
export const BiomeConfigSchema = classifyBiomes.config;

/**
 * Optional bindings from biome symbols -> engine biome globals.
 * Allows mods to remap symbols without editing the operation config.
 */
export const BiomeBindingsSchema = BiomeEngineBindingsSchema;

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
    shelfReefMultiplier: Type.Optional(
      Type.Number({
        description:
          "Coral reef density multiplier on passive continental shelves (scalar, 0..2 typical).",
        default: 0.6,
      })
    ),
    /**
     * Bonus jungle/rainforest probability in wet tropics.
     * Adds to base chance when humidity and latitude criteria are met.
     * Example: 10 adds 10% extra chance for rainforest tiles.
     */
    rainforestExtraChance: Type.Optional(
      Type.Number({
        description:
          "Bonus jungle/rainforest probability in wet tropics (percent 0..100).",
        default: 55,
      })
    ),
    /**
     * Bonus temperate forest probability in moderate rainfall zones.
     * Adds to base chance in mid-latitude humid regions.
     * Example: 10 adds 10% extra chance for forest tiles.
     */
    forestExtraChance: Type.Optional(
      Type.Number({
        description:
          "Bonus temperate forest probability in moderate rainfall zones (percent 0..100).",
        default: 30,
      })
    ),
    /**
     * Bonus coniferous forest (taiga) probability in cold regions.
     * Adds to base chance near polar latitudes.
     * Example: 5 adds 5% extra chance for taiga tiles.
     */
    taigaExtraChance: Type.Optional(
      Type.Number({
        description:
          "Bonus coniferous forest probability in cold regions (percent 0..100).",
        default: 35,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

const FeaturesPlacementGroupSchema = Type.Object(
  {
    /**
     * Enable/disable an entire placement group.
     * Disable to remove a class of features without changing per-feature chances.
     */
    enabled: Type.Optional(
      Type.Boolean({
        description: "Enable/disable this placement group.",
        default: true,
      })
    ),
    /**
     * Scalar multiplier applied to all per-feature chances in the group.
     * Values > 1 increase prevalence; values < 1 reduce density.
     */
    multiplier: Type.Optional(
      Type.Number({
        description: "Group multiplier applied to per-feature chances (scalar).",
        default: 1,
        minimum: 0,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

const FeaturesPlacementGroupsSchema = Type.Object(
  {
    /**
     * Vegetated scatter features on land (forest/rainforest/taiga/savanna/sagebrush).
     */
    vegetated: Type.Optional(FeaturesPlacementGroupSchema),
    /**
     * Wetland and oasis features (marsh/bog/mangrove/oasis/watering hole).
     */
    wet: Type.Optional(FeaturesPlacementGroupSchema),
    /**
     * Aquatic features (reef/cold reef/atoll/lotus).
     */
    aquatic: Type.Optional(FeaturesPlacementGroupSchema),
    /**
     * Polar ice features (sea ice).
     */
    ice: Type.Optional(FeaturesPlacementGroupSchema),
  },
  { additionalProperties: false, default: {} }
);

const FeaturesPlacementChancesSchema = Type.Object(
  {
    /** Chance per eligible plot to place a temperate forest (percent 0..100). */
    FEATURE_FOREST: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place a temperate forest (percent 0..100).",
        default: 50,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place rainforest/jungle (percent 0..100). */
    FEATURE_RAINFOREST: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place rainforest/jungle (percent 0..100).",
        default: 65,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place taiga/conifer forest (percent 0..100). */
    FEATURE_TAIGA: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place taiga/conifer forest (percent 0..100).",
        default: 50,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place savanna woodland (percent 0..100). */
    FEATURE_SAVANNA_WOODLAND: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place savanna woodland (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place sagebrush steppe (percent 0..100). */
    FEATURE_SAGEBRUSH_STEPPE: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place sagebrush steppe (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place marsh (percent 0..100). */
    FEATURE_MARSH: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place marsh (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place tundra bog (percent 0..100). */
    FEATURE_TUNDRA_BOG: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place tundra bog (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place mangroves on warm coasts (percent 0..100). */
    FEATURE_MANGROVE: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place mangroves on warm coasts (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place oasis in arid interiors (percent 0..100). */
    FEATURE_OASIS: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place oasis in arid interiors (percent 0..100).",
        default: 50,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place watering holes in dry basins (percent 0..100). */
    FEATURE_WATERING_HOLE: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place watering holes in dry basins (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place warm reefs (percent 0..100). */
    FEATURE_REEF: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place warm reefs (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place cold reefs (percent 0..100). */
    FEATURE_COLD_REEF: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place cold reefs (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place atolls (percent 0..100). */
    FEATURE_ATOLL: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place atolls (percent 0..100).",
        default: 12,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place lotus in lakes (percent 0..100). */
    FEATURE_LOTUS: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place lotus in lakes (percent 0..100).",
        default: 15,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place sea ice (percent 0..100). */
    FEATURE_ICE: Type.Optional(
      Type.Number({
        description: "Chance per eligible plot to place sea ice (percent 0..100).",
        default: 90,
        minimum: 0,
        maximum: 100,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

const FeaturesPlacementAtollSchema = Type.Object(
  {
    /**
     * Enable or disable cluster-growth behavior for atolls.
     * When enabled, existing atolls can seed new ones nearby.
     */
    enableClustering: Type.Optional(
      Type.Boolean({
        description: "Enable cluster-growth behavior for atolls.",
        default: true,
      })
    ),
    /** Neighborhood radius (tiles) to treat as a cluster. */
    clusterRadius: Type.Optional(
      Type.Number({
        description: "Neighborhood radius (tiles) to treat as an atoll cluster (0..2).",
        default: 1,
        minimum: 0,
        maximum: 2,
      })
    ),
    /**
     * Extra gating chance when adjacent to shallow water (coast).
     * Use to limit atolls to select coastal-adjacent waters.
     */
    shallowWaterAdjacencyGateChance: Type.Optional(
      Type.Number({
        description:
          "Extra gating chance when adjacent to shallow water (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Growth chance for atolls within tropical latitudes (percent 0..100). */
    growthChanceEquatorial: Type.Optional(
      Type.Number({
        description: "Growth chance for atolls within tropical latitudes (percent 0..100).",
        default: 15,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Growth chance for atolls outside tropical latitudes (percent 0..100). */
    growthChanceNonEquatorial: Type.Optional(
      Type.Number({
        description: "Growth chance for atolls outside tropical latitudes (percent 0..100).",
        default: 5,
        minimum: 0,
        maximum: 100,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

const FeaturesPlacementAquaticSchema = Type.Object(
  {
    /**
     * Absolute latitude split for warm vs cold reefs.
     * Below this latitude uses warm reefs; above uses cold reefs.
     */
    reefLatitudeSplit: Type.Optional(
      Type.Number({
        description: "Absolute latitude split for warm vs cold reefs (degrees).",
        default: 55,
        minimum: 0,
        maximum: 90,
      })
    ),
    /** Atoll clustering and growth settings. */
    atoll: Type.Optional(FeaturesPlacementAtollSchema),
  },
  { additionalProperties: false, default: {} }
);

const FeaturesPlacementIceSchema = Type.Object(
  {
    /**
     * Minimum absolute latitude to place ice (degrees).
     * Higher values confine ice to the poles.
     */
    minAbsLatitude: Type.Optional(
      Type.Number({
        description: "Minimum absolute latitude to place ice (degrees).",
        default: 78,
        minimum: 0,
        maximum: 90,
      })
    ),
    /** Prevent ice placement on water tiles adjacent to land. */
    forbidAdjacentToLand: Type.Optional(
      Type.Boolean({
        description: "Prevent ice placement on water tiles adjacent to land.",
        default: true,
      })
    ),
    /** Prevent ice placement adjacent to natural wonders. */
    forbidAdjacentToNaturalWonders: Type.Optional(
      Type.Boolean({
        description: "Prevent ice placement adjacent to natural wonders.",
        default: true,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Config for the owned baseline feature placement pass.
 */
export const FeaturesPlacementConfigSchema = Type.Object(
  {
    /**
     * Baseline placement strategy.
     * - owned: use mod-owned placement
     * - vanilla: call engine addFeatures
     */
    mode: Type.Optional(
      Type.Union([Type.Literal("owned"), Type.Literal("vanilla")], {
        description: "Baseline placement strategy (owned vs vanilla).",
        default: "owned",
      })
    ),
    /** Group-level knobs for major feature families. */
    groups: Type.Optional(FeaturesPlacementGroupsSchema),
    /** Per-feature chance per eligible plot (percent 0..100). */
    chances: Type.Optional(FeaturesPlacementChancesSchema),
    /** Aquatic feature rules (reefs/atolls/lotus). */
    aquatic: Type.Optional(FeaturesPlacementAquaticSchema),
    /** Polar ice placement rules. */
    ice: Type.Optional(FeaturesPlacementIceSchema),
  },
  { additionalProperties: false, default: {} }
);
