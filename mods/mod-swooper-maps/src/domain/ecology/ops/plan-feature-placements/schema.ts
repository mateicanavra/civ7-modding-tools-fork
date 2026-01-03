import { Type, type Static } from "typebox";
import { applySchemaDefaults } from "@swooper/mapgen-core/authoring";

import type { BiomeSymbol } from "../../types.js";

export const FEATURE_PLACEMENT_KEYS = [
  "FEATURE_FOREST",
  "FEATURE_RAINFOREST",
  "FEATURE_TAIGA",
  "FEATURE_SAVANNA_WOODLAND",
  "FEATURE_SAGEBRUSH_STEPPE",
  "FEATURE_MARSH",
  "FEATURE_TUNDRA_BOG",
  "FEATURE_MANGROVE",
  "FEATURE_OASIS",
  "FEATURE_WATERING_HOLE",
  "FEATURE_REEF",
  "FEATURE_COLD_REEF",
  "FEATURE_ATOLL",
  "FEATURE_LOTUS",
  "FEATURE_ICE",
] as const;

export type FeatureKey = (typeof FEATURE_PLACEMENT_KEYS)[number];

const BiomeSymbolSchema = Type.Union(
  [
    Type.Literal("snow"),
    Type.Literal("tundra"),
    Type.Literal("boreal"),
    Type.Literal("temperateDry"),
    Type.Literal("temperateHumid"),
    Type.Literal("tropicalSeasonal"),
    Type.Literal("tropicalRainforest"),
    Type.Literal("desert"),
  ],
  {
    description:
      "Biome symbol names used by the ecology classifier (maps to engine biome bindings).",
  }
);

export const FeaturesPlacementVegetatedMinByBiomeSchema = Type.Object(
  {
    /** Minimum vegetation density for snow biomes (0..1). */
    snow: Type.Number({
      description: "Minimum vegetation density for snow biomes (0..1).",
      default: 0.05,
      minimum: 0,
      maximum: 1,
    }),
    /** Minimum vegetation density for tundra biomes (0..1). */
    tundra: Type.Number({
      description: "Minimum vegetation density for tundra biomes (0..1).",
      default: 0.03,
      minimum: 0,
      maximum: 1,
    }),
    /** Minimum vegetation density for boreal biomes (0..1). */
    boreal: Type.Number({
      description: "Minimum vegetation density for boreal biomes (0..1).",
      default: 0.05,
      minimum: 0,
      maximum: 1,
    }),
    /** Minimum vegetation density for temperate dry biomes (0..1). */
    temperateDry: Type.Number({
      description: "Minimum vegetation density for temperate dry biomes (0..1).",
      default: 0.05,
      minimum: 0,
      maximum: 1,
    }),
    /** Minimum vegetation density for temperate humid biomes (0..1). */
    temperateHumid: Type.Number({
      description: "Minimum vegetation density for temperate humid biomes (0..1).",
      default: 0.05,
      minimum: 0,
      maximum: 1,
    }),
    /** Minimum vegetation density for tropical seasonal biomes (0..1). */
    tropicalSeasonal: Type.Number({
      description: "Minimum vegetation density for tropical seasonal biomes (0..1).",
      default: 0.05,
      minimum: 0,
      maximum: 1,
    }),
    /** Minimum vegetation density for tropical rainforest biomes (0..1). */
    tropicalRainforest: Type.Number({
      description: "Minimum vegetation density for tropical rainforest biomes (0..1).",
      default: 0.05,
      minimum: 0,
      maximum: 1,
    }),
    /** Minimum vegetation density for desert biomes (0..1). */
    desert: Type.Number({
      description: "Minimum vegetation density for desert biomes (0..1).",
      default: 0.02,
      minimum: 0,
      maximum: 1,
    }),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Per-biome vegetation thresholds for enabling scatter vegetation.",
  }
);

export const FeaturesPlacementGroupSchema = Type.Object(
  {
    /**
     * Scalar multiplier applied to all per-feature chances in the group.
     * Values > 1 increase prevalence; values < 1 reduce density.
     */
    multiplier: Type.Optional(
      Type.Number({
        description:
          "Group multiplier applied to per-feature chances (scalar, 0..2 typical).",
        default: 1,
        minimum: 0,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

export const FeaturesPlacementGroupsSchema = Type.Object(
  {
    /** Vegetated scatter features on land (forest/rainforest/taiga/savanna/sagebrush). */
    vegetated: Type.Optional(FeaturesPlacementGroupSchema),
    /** Wetland and oasis features (marsh/bog/mangrove/oasis/watering hole). */
    wet: Type.Optional(FeaturesPlacementGroupSchema),
    /** Aquatic features (reef/cold reef/atoll/lotus). */
    aquatic: Type.Optional(FeaturesPlacementGroupSchema),
    /** Polar ice features (sea ice). */
    ice: Type.Optional(FeaturesPlacementGroupSchema),
  },
  { additionalProperties: false, default: {} }
);

export const FeaturesPlacementChancesSchema = Type.Object(
  {
    /** Chance per eligible plot to place a temperate forest (percent 0..100). */
    FEATURE_FOREST: Type.Optional(
      Type.Number({
        description:
          "Chance per eligible plot to place a temperate forest (percent 0..100).",
        default: 50,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place rainforest/jungle (percent 0..100). */
    FEATURE_RAINFOREST: Type.Optional(
      Type.Number({
        description:
          "Chance per eligible plot to place rainforest/jungle (percent 0..100).",
        default: 65,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place taiga/conifer forest (percent 0..100). */
    FEATURE_TAIGA: Type.Optional(
      Type.Number({
        description:
          "Chance per eligible plot to place taiga/conifer forest (percent 0..100).",
        default: 50,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place savanna woodland (percent 0..100). */
    FEATURE_SAVANNA_WOODLAND: Type.Optional(
      Type.Number({
        description:
          "Chance per eligible plot to place savanna woodland (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place sagebrush steppe (percent 0..100). */
    FEATURE_SAGEBRUSH_STEPPE: Type.Optional(
      Type.Number({
        description:
          "Chance per eligible plot to place sagebrush steppe (percent 0..100).",
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
        description:
          "Chance per eligible plot to place tundra bog (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place mangroves on warm coasts (percent 0..100). */
    FEATURE_MANGROVE: Type.Optional(
      Type.Number({
        description:
          "Chance per eligible plot to place mangroves on warm coasts (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place oasis in arid interiors (percent 0..100). */
    FEATURE_OASIS: Type.Optional(
      Type.Number({
        description:
          "Chance per eligible plot to place oasis in arid interiors (percent 0..100).",
        default: 50,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place watering holes in dry basins (percent 0..100). */
    FEATURE_WATERING_HOLE: Type.Optional(
      Type.Number({
        description:
          "Chance per eligible plot to place watering holes in dry basins (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place warm reefs (percent 0..100). */
    FEATURE_REEF: Type.Optional(
      Type.Number({
        description:
          "Chance per eligible plot to place warm reefs (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Chance per eligible plot to place cold reefs (percent 0..100). */
    FEATURE_COLD_REEF: Type.Optional(
      Type.Number({
        description:
          "Chance per eligible plot to place cold reefs (percent 0..100).",
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

export const FeaturesPlacementVegetatedRulesSchema = Type.Object(
  {
    /**
     * Minimum vegetation density (0..1) required before any scatter vegetation can spawn,
     * keyed by biome symbol. This is the primary knob for letting deserts/tundra stay sparse
     * while still allowing occasional vegetation in harsh climates.
     */
    minVegetationByBiome: Type.Optional(FeaturesPlacementVegetatedMinByBiomeSchema),
    /**
     * Scalar multiplier applied to vegetation density when scaling scatter chance.
     * Values > 1 make vegetation more decisive; values < 1 soften its influence.
     */
    vegetationChanceScalar: Type.Optional(
      Type.Number({
        description:
          "Scalar multiplier applied to vegetation density when scaling scatter chance (0..2 typical).",
        default: 1,
        minimum: 0,
      })
    ),
    /** Vegetation density required for sagebrush steppe in deserts (0..1). */
    desertSagebrushMinVegetation: Type.Optional(
      Type.Number({
        description:
          "Vegetation density required for sagebrush steppe in deserts (0..1).",
        default: 0.2,
        minimum: 0,
        maximum: 1,
      })
    ),
    /**
     * Maximum aridity index (0..1) that still allows sagebrush in deserts.
     * Lower values keep the driest basins completely barren.
     */
    desertSagebrushMaxAridity: Type.Optional(
      Type.Number({
        description:
          "Maximum aridity index that still allows sagebrush in deserts (0..1).",
        default: 0.85,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Vegetation density required for taiga in tundra (0..1). */
    tundraTaigaMinVegetation: Type.Optional(
      Type.Number({
        description:
          "Vegetation density required for taiga in tundra (0..1).",
        default: 0.25,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Minimum surface temperature (C) for taiga in tundra zones. */
    tundraTaigaMinTemperature: Type.Optional(
      Type.Number({
        description:
          "Minimum surface temperature (C) for taiga in tundra zones.",
        default: -2,
      })
    ),
    /** Maximum freeze index (0..1) that still allows taiga in tundra. */
    tundraTaigaMaxFreeze: Type.Optional(
      Type.Number({
        description: "Maximum freeze index that still allows taiga in tundra (0..1).",
        default: 0.9,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Effective moisture threshold to prefer forest over steppe in temperate dry zones. */
    temperateDryForestMoisture: Type.Optional(
      Type.Number({
        description:
          "Effective moisture threshold to prefer forest over steppe in temperate dry zones.",
        default: 120,
      })
    ),
    /** Maximum aridity index (0..1) to allow temperate forests in dry zones. */
    temperateDryForestMaxAridity: Type.Optional(
      Type.Number({
        description:
          "Maximum aridity index to allow temperate forests in dry zones (0..1).",
        default: 0.65,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Vegetation density threshold to prefer forest over steppe in temperate dry zones. */
    temperateDryForestVegetation: Type.Optional(
      Type.Number({
        description:
          "Vegetation density threshold to prefer forest over steppe in temperate dry zones (0..1).",
        default: 0.45,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Effective moisture threshold to prefer rainforest over savanna in tropical seasonal zones. */
    tropicalSeasonalRainforestMoisture: Type.Optional(
      Type.Number({
        description:
          "Effective moisture threshold to prefer rainforest over savanna in tropical seasonal zones.",
        default: 140,
      })
    ),
    /** Maximum aridity index (0..1) to allow rainforests in tropical seasonal zones. */
    tropicalSeasonalRainforestMaxAridity: Type.Optional(
      Type.Number({
        description:
          "Maximum aridity index to allow rainforests in tropical seasonal zones (0..1).",
        default: 0.6,
        minimum: 0,
        maximum: 1,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

export const FeaturesPlacementWetRulesSchema = Type.Object(
  {
    /**
     * River adjacency radius (tiles) used for marsh/bog placement.
     * Larger values increase wetland spread along tributaries.
     */
    nearRiverRadius: Type.Optional(
      Type.Number({
        description:
          "River adjacency radius (tiles) used for marsh/bog placement.",
        default: 2,
        minimum: 1,
      })
    ),
    /**
     * Surface temperature (C) at or below which cold wetlands (bogs) are favored.
     * Use a higher value to push bogs further toward temperate latitudes.
     */
    coldTemperatureMax: Type.Optional(
      Type.Number({
        description:
          "Surface temperature (C) at or below which bogs are favored.",
        default: 2,
      })
    ),
    /** Biome symbols that always count as cold wetlands, regardless of temperature. */
    coldBiomeSymbols: Type.Optional(
      Type.Array(BiomeSymbolSchema, {
        description:
          "Biome symbols that always count as cold wetlands, regardless of temperature.",
        default: ["snow", "tundra", "boreal"],
      })
    ),
    /**
     * Surface temperature (C) at or above which mangroves can appear on coasts.
     * Lower values allow mangroves into subtropics.
     */
    mangroveWarmTemperatureMin: Type.Optional(
      Type.Number({
        description:
          "Surface temperature (C) at or above which mangroves can appear on coasts.",
        default: 18,
      })
    ),
    /** Biome symbols considered warm enough for mangroves, regardless of temperature. */
    mangroveWarmBiomeSymbols: Type.Optional(
      Type.Array(BiomeSymbolSchema, {
        description:
          "Biome symbols considered warm enough for mangroves, regardless of temperature.",
        default: ["tropicalRainforest", "tropicalSeasonal"],
      })
    ),
    /**
     * Radius (tiles) to treat land as coastal for mangroves and coastal exclusion.
     * Increasing this makes mangroves appear further inland.
     */
    coastalAdjacencyRadius: Type.Optional(
      Type.Number({
        description:
          "Radius (tiles) to treat land as coastal for mangroves and coastal exclusion.",
        default: 1,
        minimum: 1,
      })
    ),
    /**
     * River adjacency radius (tiles) used to exclude isolated oasis/watering-hole placement.
     * Larger values keep isolated wetlands farther from rivers.
     */
    isolatedRiverRadius: Type.Optional(
      Type.Number({
        description:
          "River adjacency radius (tiles) used to exclude isolated oasis/watering-hole placement.",
        default: 1,
        minimum: 1,
      })
    ),
    /**
     * Spacing radius (tiles) used to avoid clumping oasis or watering holes.
     * Increase to spread isolated features farther apart.
     */
    isolatedSpacingRadius: Type.Optional(
      Type.Number({
        description:
          "Spacing radius (tiles) used to avoid clumping oasis or watering holes.",
        default: 1,
        minimum: 1,
      })
    ),
    /** Biome symbols that prefer oasis over watering holes in isolated basins. */
    oasisBiomeSymbols: Type.Optional(
      Type.Array(BiomeSymbolSchema, {
        description:
          "Biome symbols that prefer oasis over watering holes in isolated basins.",
        default: ["desert", "temperateDry"],
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

export const FeaturesPlacementAtollSchema = Type.Object(
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
    /** Neighborhood radius (tiles) to treat as an atoll cluster. */
    clusterRadius: Type.Optional(
      Type.Number({
        description: "Neighborhood radius (tiles) to treat as an atoll cluster (0..2).",
        default: 1,
        minimum: 0,
        maximum: 2,
      })
    ),
    /** Maximum absolute latitude (degrees) considered equatorial for atoll growth. */
    equatorialBandMaxAbsLatitude: Type.Optional(
      Type.Number({
        description: "Maximum absolute latitude (degrees) considered equatorial for atoll growth.",
        default: 23,
        minimum: 0,
        maximum: 90,
      })
    ),
    /**
     * Extra gating chance when adjacent to shallow water (coast).
     * Use to limit atolls to select coastal-adjacent waters.
     */
    shallowWaterAdjacencyGateChance: Type.Optional(
      Type.Number({
        description: "Extra gating chance when adjacent to shallow water (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /** Radius (tiles) for detecting shallow-water adjacency in the gate check. */
    shallowWaterAdjacencyRadius: Type.Optional(
      Type.Number({
        description: "Radius (tiles) for detecting shallow-water adjacency in the gate check.",
        default: 1,
        minimum: 1,
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
        description:
          "Growth chance for atolls outside tropical latitudes (percent 0..100).",
        default: 5,
        minimum: 0,
        maximum: 100,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

export const FeaturesPlacementAquaticSchema = Type.Object(
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

export const FeaturesPlacementIceSchema = Type.Object(
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
    /** Radius (tiles) for land adjacency checks when forbidding ice. */
    landAdjacencyRadius: Type.Optional(
      Type.Number({
        description: "Radius (tiles) for land adjacency checks when forbidding ice.",
        default: 1,
        minimum: 1,
      })
    ),
    /** Prevent ice placement adjacent to natural wonders. */
    forbidAdjacentToNaturalWonders: Type.Optional(
      Type.Boolean({
        description: "Prevent ice placement adjacent to natural wonders.",
        default: true,
      })
    ),
    /** Radius (tiles) for natural-wonder adjacency checks when forbidding ice. */
    naturalWonderAdjacencyRadius: Type.Optional(
      Type.Number({
        description:
          "Radius (tiles) for natural-wonder adjacency checks when forbidding ice.",
        default: 1,
        minimum: 1,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

export const FeaturesPlacementConfigSchema = Type.Object(
  {
    /** Group-level knobs for major feature families. */
    groups: Type.Optional(FeaturesPlacementGroupsSchema),
    /** Per-feature chance per eligible plot (percent 0..100). */
    chances: Type.Optional(FeaturesPlacementChancesSchema),
    /** Vegetated scatter selection rules. */
    vegetated: Type.Optional(FeaturesPlacementVegetatedRulesSchema),
    /** Wetland selection and spacing rules. */
    wet: Type.Optional(FeaturesPlacementWetRulesSchema),
    /** Aquatic feature rules (reefs/atolls/lotus). */
    aquatic: Type.Optional(FeaturesPlacementAquaticSchema),
    /** Polar ice placement rules. */
    ice: Type.Optional(FeaturesPlacementIceSchema),
  },
  { additionalProperties: false, default: {} }
);

export type FeaturesPlacementGroupsConfig = Static<typeof FeaturesPlacementGroupsSchema>;
export type FeaturesPlacementGroupConfig = Static<typeof FeaturesPlacementGroupSchema>;
export type FeaturesPlacementChances = Static<typeof FeaturesPlacementChancesSchema>;
export type FeaturesPlacementVegetatedMinByBiome = Static<
  typeof FeaturesPlacementVegetatedMinByBiomeSchema
>;
export type FeaturesPlacementVegetatedRules = Static<typeof FeaturesPlacementVegetatedRulesSchema>;
export type FeaturesPlacementWetRules = Static<typeof FeaturesPlacementWetRulesSchema>;
export type FeaturesPlacementAquaticConfig = Static<typeof FeaturesPlacementAquaticSchema>;
export type FeaturesPlacementAtollConfig = Static<typeof FeaturesPlacementAtollSchema>;
export type FeaturesPlacementIceConfig = Static<typeof FeaturesPlacementIceSchema>;
export type FeaturesPlacementConfig = Static<typeof FeaturesPlacementConfigSchema>;

export type FeaturesPlacementResolvedGroup = { multiplier: number };

export type ResolvedFeaturesPlacementConfig = {
  groups: {
    vegetated: FeaturesPlacementResolvedGroup;
    wet: FeaturesPlacementResolvedGroup;
    aquatic: FeaturesPlacementResolvedGroup;
    ice: FeaturesPlacementResolvedGroup;
  };
  chances: Record<FeatureKey, number>;
  vegetated: Required<FeaturesPlacementVegetatedRules>;
  wet: Required<FeaturesPlacementWetRules>;
  aquatic: Required<FeaturesPlacementAquaticConfig> & {
    atoll: Required<FeaturesPlacementAtollConfig>;
  };
  ice: Required<FeaturesPlacementIceConfig>;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const readNumber = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readSymbolArray = (
  input: BiomeSymbol[] | undefined,
  fallback: BiomeSymbol[]
): BiomeSymbol[] => (Array.isArray(input) && input.length > 0 ? input : fallback);

export function resolveFeaturesPlacementConfig(
  input: FeaturesPlacementConfig
): ResolvedFeaturesPlacementConfig {
  const chanceDefaults = applySchemaDefaults(
    FeaturesPlacementChancesSchema,
    {}
  ) as Required<FeaturesPlacementChances>;
  const groupDefaults = applySchemaDefaults(
    FeaturesPlacementGroupSchema,
    {}
  ) as Required<FeaturesPlacementGroupConfig>;
  const vegetatedDefaults = applySchemaDefaults(
    FeaturesPlacementVegetatedRulesSchema,
    {}
  ) as Required<FeaturesPlacementVegetatedRules>;
  const minVegDefaults = applySchemaDefaults(
    FeaturesPlacementVegetatedMinByBiomeSchema,
    {}
  ) as Required<FeaturesPlacementVegetatedMinByBiome>;
  const wetDefaults = applySchemaDefaults(
    FeaturesPlacementWetRulesSchema,
    {}
  ) as Required<FeaturesPlacementWetRules>;
  const aquaticDefaults = applySchemaDefaults(
    FeaturesPlacementAquaticSchema,
    {}
  ) as Required<FeaturesPlacementAquaticConfig>;
  const atollDefaults = applySchemaDefaults(
    FeaturesPlacementAtollSchema,
    {}
  ) as Required<FeaturesPlacementAtollConfig>;
  const iceDefaults = applySchemaDefaults(
    FeaturesPlacementIceSchema,
    {}
  ) as Required<FeaturesPlacementIceConfig>;

  const rawChances = input.chances;
  if (rawChances) {
    const unknownKeys = Object.keys(rawChances).filter(
      (key) => !FEATURE_PLACEMENT_KEYS.includes(key as FeatureKey)
    );
    if (unknownKeys.length > 0) {
      throw new Error(
        `planFeaturePlacements.chances contains unknown feature keys: ${unknownKeys.join(", ")}`
      );
    }
  }

  const ownedInput = applySchemaDefaults(
    FeaturesPlacementConfigSchema,
    input
  ) as Required<FeaturesPlacementConfig>;
  const vegetatedInput = applySchemaDefaults(
    FeaturesPlacementVegetatedRulesSchema,
    ownedInput.vegetated
  ) as Required<FeaturesPlacementVegetatedRules>;
  const minVegInput = applySchemaDefaults(
    FeaturesPlacementVegetatedMinByBiomeSchema,
    ownedInput.vegetated.minVegetationByBiome
  ) as Required<FeaturesPlacementVegetatedMinByBiome>;
  const wetInput = applySchemaDefaults(
    FeaturesPlacementWetRulesSchema,
    ownedInput.wet
  ) as Required<FeaturesPlacementWetRules>;
  const aquaticInput = applySchemaDefaults(
    FeaturesPlacementAquaticSchema,
    ownedInput.aquatic
  ) as Required<FeaturesPlacementAquaticConfig>;
  const atollInput = applySchemaDefaults(
    FeaturesPlacementAtollSchema,
    ownedInput.aquatic.atoll
  ) as Required<FeaturesPlacementAtollConfig>;
  const iceInput = applySchemaDefaults(
    FeaturesPlacementIceSchema,
    ownedInput.ice
  ) as Required<FeaturesPlacementIceConfig>;

  const chancesInput = ownedInput.chances;

  const chances = FEATURE_PLACEMENT_KEYS.reduce((acc, key) => {
    acc[key] = clamp(readNumber(chancesInput[key], chanceDefaults[key]), 0, 100);
    return acc;
  }, {} as Record<FeatureKey, number>);

  return {
    groups: {
      vegetated: {
        multiplier: Math.max(
          0,
          readNumber(ownedInput.groups.vegetated?.multiplier, groupDefaults.multiplier)
        ),
      },
      wet: {
        multiplier: Math.max(
          0,
          readNumber(ownedInput.groups.wet?.multiplier, groupDefaults.multiplier)
        ),
      },
      aquatic: {
        multiplier: Math.max(
          0,
          readNumber(ownedInput.groups.aquatic?.multiplier, groupDefaults.multiplier)
        ),
      },
      ice: {
        multiplier: Math.max(
          0,
          readNumber(ownedInput.groups.ice?.multiplier, groupDefaults.multiplier)
        ),
      },
    },
    chances,
    vegetated: {
      minVegetationByBiome: {
        snow: clamp(readNumber(minVegInput.snow, minVegDefaults.snow), 0, 1),
        tundra: clamp(readNumber(minVegInput.tundra, minVegDefaults.tundra), 0, 1),
        boreal: clamp(readNumber(minVegInput.boreal, minVegDefaults.boreal), 0, 1),
        temperateDry: clamp(
          readNumber(minVegInput.temperateDry, minVegDefaults.temperateDry),
          0,
          1
        ),
        temperateHumid: clamp(
          readNumber(minVegInput.temperateHumid, minVegDefaults.temperateHumid),
          0,
          1
        ),
        tropicalSeasonal: clamp(
          readNumber(minVegInput.tropicalSeasonal, minVegDefaults.tropicalSeasonal),
          0,
          1
        ),
        tropicalRainforest: clamp(
          readNumber(minVegInput.tropicalRainforest, minVegDefaults.tropicalRainforest),
          0,
          1
        ),
        desert: clamp(readNumber(minVegInput.desert, minVegDefaults.desert), 0, 1),
      },
      vegetationChanceScalar: Math.max(
        0,
        readNumber(
          vegetatedInput.vegetationChanceScalar,
          vegetatedDefaults.vegetationChanceScalar
        )
      ),
      desertSagebrushMinVegetation: clamp(
        readNumber(
          vegetatedInput.desertSagebrushMinVegetation,
          vegetatedDefaults.desertSagebrushMinVegetation
        ),
        0,
        1
      ),
      desertSagebrushMaxAridity: clamp(
        readNumber(
          vegetatedInput.desertSagebrushMaxAridity,
          vegetatedDefaults.desertSagebrushMaxAridity
        ),
        0,
        1
      ),
      tundraTaigaMinVegetation: clamp(
        readNumber(
          vegetatedInput.tundraTaigaMinVegetation,
          vegetatedDefaults.tundraTaigaMinVegetation
        ),
        0,
        1
      ),
      tundraTaigaMinTemperature: readNumber(
        vegetatedInput.tundraTaigaMinTemperature,
        vegetatedDefaults.tundraTaigaMinTemperature
      ),
      tundraTaigaMaxFreeze: clamp(
        readNumber(
          vegetatedInput.tundraTaigaMaxFreeze,
          vegetatedDefaults.tundraTaigaMaxFreeze
        ),
        0,
        1
      ),
      temperateDryForestMoisture: readNumber(
        vegetatedInput.temperateDryForestMoisture,
        vegetatedDefaults.temperateDryForestMoisture
      ),
      temperateDryForestMaxAridity: clamp(
        readNumber(
          vegetatedInput.temperateDryForestMaxAridity,
          vegetatedDefaults.temperateDryForestMaxAridity
        ),
        0,
        1
      ),
      temperateDryForestVegetation: clamp(
        readNumber(
          vegetatedInput.temperateDryForestVegetation,
          vegetatedDefaults.temperateDryForestVegetation
        ),
        0,
        1
      ),
      tropicalSeasonalRainforestMoisture: readNumber(
        vegetatedInput.tropicalSeasonalRainforestMoisture,
        vegetatedDefaults.tropicalSeasonalRainforestMoisture
      ),
      tropicalSeasonalRainforestMaxAridity: clamp(
        readNumber(
          vegetatedInput.tropicalSeasonalRainforestMaxAridity,
          vegetatedDefaults.tropicalSeasonalRainforestMaxAridity
        ),
        0,
        1
      ),
    },
    wet: {
      nearRiverRadius: Math.max(
        1,
        Math.floor(readNumber(wetInput.nearRiverRadius, wetDefaults.nearRiverRadius))
      ),
      coldTemperatureMax: readNumber(wetInput.coldTemperatureMax, wetDefaults.coldTemperatureMax),
      coldBiomeSymbols: readSymbolArray(wetInput.coldBiomeSymbols, wetDefaults.coldBiomeSymbols),
      mangroveWarmTemperatureMin: readNumber(
        wetInput.mangroveWarmTemperatureMin,
        wetDefaults.mangroveWarmTemperatureMin
      ),
      mangroveWarmBiomeSymbols: readSymbolArray(
        wetInput.mangroveWarmBiomeSymbols,
        wetDefaults.mangroveWarmBiomeSymbols
      ),
      coastalAdjacencyRadius: Math.max(
        1,
        Math.floor(readNumber(wetInput.coastalAdjacencyRadius, wetDefaults.coastalAdjacencyRadius))
      ),
      isolatedRiverRadius: Math.max(
        1,
        Math.floor(readNumber(wetInput.isolatedRiverRadius, wetDefaults.isolatedRiverRadius))
      ),
      isolatedSpacingRadius: Math.max(
        1,
        Math.floor(readNumber(wetInput.isolatedSpacingRadius, wetDefaults.isolatedSpacingRadius))
      ),
      oasisBiomeSymbols: readSymbolArray(wetInput.oasisBiomeSymbols, wetDefaults.oasisBiomeSymbols),
    },
    aquatic: {
      reefLatitudeSplit: clamp(
        readNumber(aquaticInput.reefLatitudeSplit, aquaticDefaults.reefLatitudeSplit),
        0,
        90
      ),
      atoll: {
        enableClustering: atollInput.enableClustering ?? atollDefaults.enableClustering,
        clusterRadius: clamp(
          Math.floor(readNumber(atollInput.clusterRadius, atollDefaults.clusterRadius)),
          0,
          2
        ),
        equatorialBandMaxAbsLatitude: clamp(
          readNumber(
            atollInput.equatorialBandMaxAbsLatitude,
            atollDefaults.equatorialBandMaxAbsLatitude
          ),
          0,
          90
        ),
        shallowWaterAdjacencyGateChance: clamp(
          readNumber(
            atollInput.shallowWaterAdjacencyGateChance,
            atollDefaults.shallowWaterAdjacencyGateChance
          ),
          0,
          100
        ),
        shallowWaterAdjacencyRadius: Math.max(
          1,
          Math.floor(
            readNumber(
              atollInput.shallowWaterAdjacencyRadius,
              atollDefaults.shallowWaterAdjacencyRadius
            )
          )
        ),
        growthChanceEquatorial: clamp(
          readNumber(atollInput.growthChanceEquatorial, atollDefaults.growthChanceEquatorial),
          0,
          100
        ),
        growthChanceNonEquatorial: clamp(
          readNumber(atollInput.growthChanceNonEquatorial, atollDefaults.growthChanceNonEquatorial),
          0,
          100
        ),
      },
    },
    ice: {
      minAbsLatitude: clamp(readNumber(iceInput.minAbsLatitude, iceDefaults.minAbsLatitude), 0, 90),
      forbidAdjacentToLand: iceInput.forbidAdjacentToLand ?? iceDefaults.forbidAdjacentToLand,
      landAdjacencyRadius: Math.max(
        1,
        Math.floor(readNumber(iceInput.landAdjacencyRadius, iceDefaults.landAdjacencyRadius))
      ),
      forbidAdjacentToNaturalWonders:
        iceInput.forbidAdjacentToNaturalWonders ?? iceDefaults.forbidAdjacentToNaturalWonders,
      naturalWonderAdjacencyRadius: Math.max(
        1,
        Math.floor(
          readNumber(
            iceInput.naturalWonderAdjacencyRadius,
            iceDefaults.naturalWonderAdjacencyRadius
          )
        )
      ),
    },
  };
}

export type { BiomeSymbol };
