import { Type, type Static } from "typebox";

export const TemperatureSchema = Type.Object(
  {
    /**
     * Baseline equatorial temperature at sea level (degrees C).
     * Higher values expand tropical biomes and shrink cold zones.
     */
    equator: Type.Number({
      description: "Baseline equatorial temperature at sea level (degrees C).",
      default: 28,
    }),
    /**
     * Baseline polar temperature at sea level (degrees C).
     * Lower values expand snow/tundra coverage.
     */
    pole: Type.Number({
      description: "Baseline polar temperature at sea level (degrees C).",
      default: -8,
    }),
    /**
     * Temperature drop per kilometer of elevation (degrees C / km).
     * Higher values make mountains colder and expand tundra/ice.
     */
    lapseRate: Type.Number({
      description: "Temperature drop per kilometer of elevation (degrees C / km).",
      default: 6.5,
    }),
    /**
     * Elevation reference point for temperature (meters).
     * Temperatures are computed relative to this sea-level baseline.
     */
    seaLevel: Type.Number({
      description: "Elevation reference point for temperature (meters).",
      default: 0,
    }),
    /**
     * Global temperature offset applied after latitude and elevation (degrees C).
     * Use this to uniformly warm/cool the world.
     */
    bias: Type.Number({
      description: "Global temperature offset after latitude/elevation (degrees C).",
      default: 0,
    }),
    /**
     * Temperature threshold for polar zone classification (degrees C).
     * Values at or below this become snow/ice biomes.
     */
    polarCutoff: Type.Number({
      description: "Temperature threshold for polar zone classification (degrees C).",
      default: -5,
    }),
    /**
     * Temperature threshold for cold/tundra zone classification (degrees C).
     * Values at or below this become tundra-like biomes.
     */
    tundraCutoff: Type.Number({
      description: "Temperature threshold for cold/tundra zone classification (degrees C).",
      default: 2,
    }),
    /**
     * Upper bound for temperate zone classification (degrees C).
     * Values above this are eligible to become tropical if warm enough.
     */
    midLatitude: Type.Number({
      description: "Upper bound for temperate zone classification (degrees C).",
      default: 12,
    }),
    /**
     * Temperature threshold for tropical zone classification (degrees C).
     * Values at or above this become tropical biomes.
     */
    tropicalThreshold: Type.Number({
      description: "Temperature threshold for tropical zone classification (degrees C).",
      default: 24,
    }),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Temperature model parameters (degrees C, lapse rate, thresholds).",
  }
);

export const MoistureSchema = Type.Object(
  {
    /**
     * Moisture thresholds (arid -> semi-arid -> subhumid -> humid -> perhumid).
     * Units are "effective moisture" (rainfall + humidity contribution + overlays).
     */
    thresholds: Type.Tuple(
      [
        Type.Number({
          description: "Arid threshold (effective moisture units).",
          default: 45,
        }),
        Type.Number({
          description: "Semi-arid threshold (effective moisture units).",
          default: 90,
        }),
        Type.Number({
          description: "Subhumid threshold (effective moisture units).",
          default: 140,
        }),
        Type.Number({
          description: "Humid threshold (effective moisture units).",
          default: 190,
        }),
      ],
      {
        default: [45, 90, 140, 190],
        description:
          "Moisture thresholds in effective moisture units (rainfall + humidity weight + overlays).",
      }
    ),
    /**
     * Global moisture bias (effective moisture units).
     * Positive values make the world wetter; negative values dry it out.
     */
    bias: Type.Number({
      description: "Global moisture bias (effective moisture units).",
      default: 0,
    }),
    /**
     * Weight applied to humidity when computing effective moisture (scalar).
     * Higher values make humidity matter more than rainfall.
     */
    humidityWeight: Type.Number({
      description: "Weight applied to humidity when computing effective moisture (scalar).",
      default: 0.35,
    }),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Effective moisture thresholds and weighting (rainfall + humidity + overlays).",
  }
);

export const AriditySchema = Type.Object(
  {
    /**
     * Minimum temperature (C) used to normalize PET/aridity calculations.
     * Temps below this clamp to 0 for aridity.
     */
    temperatureMin: Type.Number({
      description: "Minimum temperature for aridity normalization (C).",
      default: 0,
    }),
    /**
     * Maximum temperature (C) used to normalize PET/aridity calculations.
     * Temps above this clamp to 1 for aridity.
     */
    temperatureMax: Type.Number({
      description: "Maximum temperature for aridity normalization (C).",
      default: 35,
    }),
    /**
     * Base PET-like moisture demand (rainfall units).
     * Higher values make aridity more likely overall.
     */
    petBase: Type.Number({
      description: "Base PET-like moisture demand (rainfall units).",
      default: 20,
      minimum: 0,
    }),
    /**
     * PET temperature weight (rainfall units).
     * Higher values make hot climates more arid.
     */
    petTemperatureWeight: Type.Number({
      description: "PET temperature weight (rainfall units).",
      default: 80,
      minimum: 0,
    }),
    /**
     * Humidity dampening factor (0..1).
     * Higher values reduce PET more in humid regions.
     */
    humidityDampening: Type.Number({
      description: "Humidity dampening factor (0..1).",
      default: 0.5,
      minimum: 0,
      maximum: 1,
    }),
    /**
     * Rainfall weight used when subtracting supply from PET (scalar).
     * Higher values make rainfall offset aridity more strongly.
     */
    rainfallWeight: Type.Number({
      description: "Rainfall weight when subtracting supply from PET (scalar).",
      default: 1,
      minimum: 0,
    }),
    /**
     * Bias applied to aridity raw units (rainfall units).
     * Positive values make the world more arid.
     */
    bias: Type.Number({
      description: "Bias applied to aridity raw units (rainfall units).",
      default: 0,
    }),
    /**
     * Normalization scale that maps aridity raw units into 0..1.
     * Increase this to reduce aridity sensitivity.
     */
    normalization: Type.Number({
      description: "Normalization scale for aridity index (rainfall units).",
      default: 120,
      minimum: 1,
    }),
    /**
     * Aridity thresholds (0..1) that shift moisture zones toward drier classes.
     * Example: [0.45, 0.7] shifts by 1 at 0.45+, by 2 at 0.7+.
     */
    moistureShiftThresholds: Type.Tuple(
      [
        Type.Number({
          description: "Aridity threshold for first moisture-zone shift (0..1).",
          default: 0.45,
          minimum: 0,
          maximum: 1,
        }),
        Type.Number({
          description: "Aridity threshold for second moisture-zone shift (0..1).",
          default: 0.7,
          minimum: 0,
          maximum: 1,
        }),
      ],
      {
        default: [0.45, 0.7],
        description: "Aridity thresholds that shift moisture zones toward drier classes.",
      }
    ),
    /**
     * Vegetation density penalty applied by aridity (0..1).
     * Higher values make arid regions sparser even if moisture is high.
     */
    vegetationPenalty: Type.Number({
      description: "Vegetation density penalty applied by aridity (0..1).",
      default: 0.15,
      minimum: 0,
      maximum: 1,
    }),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Aridity/PET proxy controls for dry-climate modeling.",
  }
);

export const FreezeSchema = Type.Object(
  {
    /**
     * Temperature (C) at or below which freeze index is 1.0.
     * Lower values restrict full freeze to colder conditions.
     */
    minTemperature: Type.Number({
      description: "Temperature at/below which freeze index is 1 (C).",
      default: -10,
    }),
    /**
     * Temperature (C) at or above which freeze index is 0.0.
     * Higher values broaden the near-freeze zone.
     */
    maxTemperature: Type.Number({
      description: "Temperature at/above which freeze index is 0 (C).",
      default: 2,
    }),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Freeze index thresholds for snow/ice suitability.",
  }
);

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

const DEFAULT_VEGETATION_BIOME_MODIFIERS = {
  snow: { multiplier: 0.05, bonus: 0 },
  tundra: { multiplier: 0.35, bonus: 0 },
  boreal: { multiplier: 0.75, bonus: 0 },
  temperateDry: { multiplier: 0.75, bonus: 0 },
  temperateHumid: { multiplier: 1, bonus: 0 },
  tropicalSeasonal: { multiplier: 1, bonus: 0 },
  tropicalRainforest: { multiplier: 1, bonus: 0.25 },
  desert: { multiplier: 0.1, bonus: 0 },
} as const;

export const VegetationBiomeModifiersSchema = Type.Object(
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

export const NoiseSchema = Type.Object(
  {
    /**
     * Noise amplitude applied to moisture (scalar).
     * Acts as a multiplier against 0..255 moisture units.
     */
    amplitude: Type.Number({
      description: "Noise amplitude applied to moisture (scalar, multiplies 0..255).",
      default: 0.03,
    }),
    /**
     * Seed for deterministic biome noise variation.
     * Change to re-roll biome noise patterns without altering other config.
     */
    seed: Type.Number({
      description: "Seed for deterministic biome noise variation.",
      default: 1337,
    }),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Noise settings for biome moisture variation.",
  }
);

export const OverlaySchema = Type.Object(
  {
    /**
     * Moisture bonus applied along story corridors (effective moisture units).
     * Raises vegetation density where corridors pass.
     */
    corridorMoistureBonus: Type.Number({
      description: "Moisture bonus along narrative corridors (effective moisture units).",
      default: 8,
    }),
    /**
     * Moisture bonus applied on rift shoulders (effective moisture units).
     * Adds localized wetness around rift-adjacent terrain.
     */
    riftShoulderMoistureBonus: Type.Number({
      description: "Moisture bonus on rift shoulders (effective moisture units).",
      default: 5,
    }),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Narrative overlay moisture bonuses (corridors, rifts).",
  }
);

export const BiomeClassificationConfigSchema = Type.Object(
  {
    /** Temperature model knobs (degrees C, lapse rate, thresholds). */
    temperature: TemperatureSchema,
    /** Moisture model knobs (thresholds, humidity weight, bias). */
    moisture: MoistureSchema,
    /** Aridity/PET proxy knobs (used to shift moisture zones). */
    aridity: AriditySchema,
    /** Freeze index thresholds used for snow/ice suitability. */
    freeze: FreezeSchema,
    /** Vegetation density model knobs (0..1 weights). */
    vegetation: VegetationSchema,
    /** Noise settings for moisture variation. */
    noise: NoiseSchema,
    /** Narrative overlay moisture bonuses. */
    overlays: OverlaySchema,
  },
  {
    additionalProperties: false,
    default: {},
    description: "Biome classification parameters for temperature, moisture, vegetation, and overlays.",
  }
);

export const BiomeClassificationInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    rainfall: Type.Any(),
    humidity: Type.Any(),
    elevation: Type.Any(),
    latitude: Type.Any(),
    landMask: Type.Any(),
    corridorMask: Type.Optional(Type.Any()),
    riftShoulderMask: Type.Optional(Type.Any()),
  },
  { additionalProperties: false }
);

export const BiomeClassificationOutputSchema = Type.Object(
  {
    biomeIndex: Type.Any(),
    vegetationDensity: Type.Any(),
    effectiveMoisture: Type.Any(),
    surfaceTemperature: Type.Any(),
    aridityIndex: Type.Any(),
    freezeIndex: Type.Any(),
  },
  { additionalProperties: false }
);

export type BiomeClassificationConfig = Static<typeof BiomeClassificationConfigSchema>;
export type BiomeClassificationInput = Static<typeof BiomeClassificationInputSchema>;
export type BiomeClassificationOutput = Static<typeof BiomeClassificationOutputSchema>;
