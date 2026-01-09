import { Type } from "@swooper/mapgen-core/authoring";

const VegetationBiomeModifierSchema = Type.Object(
  {
    /**
     * Multiplier applied after vegetation density is computed for the biome.
     * Values < 1 thin vegetation; values > 1 densify the biome.
     */
    multiplier: Type.Optional(
      Type.Number({
        description:
          "Biome-specific multiplier applied after vegetation density is computed (scalar).",
        default: 1,
        minimum: 0,
      })
    ),
    /**
     * Additive bonus applied after the multiplier (0..1 typical).
     * Use small values (0.05-0.25) to make a biome feel lush without changing global weights.
     */
    bonus: Type.Optional(
      Type.Number({
        description:
          "Biome-specific additive bonus applied after multiplier (0..1 typical).",
        default: 0,
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Per-biome vegetation multiplier/bonus applied after base density.",
  }
);

type VegetationBiomeModifierDefault = { multiplier: number; bonus: number };
type VegetationBiomeModifiersDefault = {
  snow: VegetationBiomeModifierDefault;
  tundra: VegetationBiomeModifierDefault;
  boreal: VegetationBiomeModifierDefault;
  temperateDry: VegetationBiomeModifierDefault;
  temperateHumid: VegetationBiomeModifierDefault;
  tropicalSeasonal: VegetationBiomeModifierDefault;
  tropicalRainforest: VegetationBiomeModifierDefault;
  desert: VegetationBiomeModifierDefault;
};

const DEFAULT_VEGETATION_BIOME_MODIFIERS: VegetationBiomeModifiersDefault = {
  snow: { multiplier: 0.05, bonus: 0 },
  tundra: { multiplier: 0.35, bonus: 0 },
  boreal: { multiplier: 0.75, bonus: 0 },
  temperateDry: { multiplier: 0.75, bonus: 0 },
  temperateHumid: { multiplier: 1, bonus: 0 },
  tropicalSeasonal: { multiplier: 1, bonus: 0 },
  tropicalRainforest: { multiplier: 1, bonus: 0.25 },
  desert: { multiplier: 0.1, bonus: 0 },
};

const VegetationBiomeModifiersSchema = Type.Object(
  {
    /** Modifiers for snow/ice biomes. */
    snow: Type.Optional(VegetationBiomeModifierSchema),
    /** Modifiers for tundra biomes. */
    tundra: Type.Optional(VegetationBiomeModifierSchema),
    /** Modifiers for boreal forests. */
    boreal: Type.Optional(VegetationBiomeModifierSchema),
    /** Modifiers for dry temperate grasslands/steppes. */
    temperateDry: Type.Optional(VegetationBiomeModifierSchema),
    /** Modifiers for humid temperate plains/forests. */
    temperateHumid: Type.Optional(VegetationBiomeModifierSchema),
    /** Modifiers for seasonal tropical savannas. */
    tropicalSeasonal: Type.Optional(VegetationBiomeModifierSchema),
    /** Modifiers for tropical rainforest zones. */
    tropicalRainforest: Type.Optional(VegetationBiomeModifierSchema),
    /** Modifiers for desert basins. */
    desert: Type.Optional(VegetationBiomeModifierSchema),
  },
  {
    additionalProperties: false,
    default: DEFAULT_VEGETATION_BIOME_MODIFIERS,
    description: "Per-biome vegetation adjustments applied after base density.",
  }
);

export const VegetationSchema = Type.Object(
  {
    /**
     * Baseline vegetation density (0..1).
     * Acts as the floor for vegetation even in marginal climates.
     */
    base: Type.Number({
      description:
        "Baseline vegetation density (0..1). Acts as the floor even in marginal climates.",
      default: 0.2,
      minimum: 0,
      maximum: 1,
    }),
    /**
     * Weight applied to effective moisture when computing vegetation density.
     * Higher values mean wetter regions get denser vegetation.
     */
    moistureWeight: Type.Number({
      description:
        "Weight applied to effective moisture when computing vegetation density (scalar).",
      default: 0.55,
      minimum: 0,
    }),
    /**
     * Weight applied to humidity when computing vegetation density.
     * Higher values favor lush vegetation even if rainfall is moderate.
     */
    humidityWeight: Type.Number({
      description:
        "Weight applied to humidity when computing vegetation density (scalar).",
      default: 0.25,
      minimum: 0,
    }),
    /**
     * Extra padding added to the humid threshold when normalizing moisture (units).
     * Larger values soften how quickly vegetation saturates as rainfall increases.
     */
    moistureNormalizationPadding: Type.Number({
      description:
        "Padding added to humid threshold when normalizing moisture (effective moisture units).",
      default: 40,
      minimum: 0,
    }),
    /**
     * Per-biome vegetation modifiers applied after the base density calculation.
     * Use this to thin deserts/snow or boost tropical rainforest lushness.
     */
    biomeModifiers: Type.Optional(VegetationBiomeModifiersSchema),
  },
  {
    additionalProperties: false,
    default: { biomeModifiers: DEFAULT_VEGETATION_BIOME_MODIFIERS },
    description: "Vegetation density model knobs (base, moisture/humidity weights, biome tweaks).",
  }
);
