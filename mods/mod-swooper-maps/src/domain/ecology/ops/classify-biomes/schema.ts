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
  { additionalProperties: false, default: {} }
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
  { additionalProperties: false, default: {} }
);

export const VegetationSchema = Type.Object(
  {
    /**
     * Baseline vegetation density (0..1).
     * Acts as the floor for vegetation even in marginal climates.
     */
    base: Type.Number({
      description: "Baseline vegetation density (0..1).",
      default: 0.2,
    }),
    /**
     * Weight applied to effective moisture when computing vegetation density.
     * Higher values mean wetter regions get denser vegetation.
     */
    moistureWeight: Type.Number({
      description: "Weight applied to effective moisture when computing vegetation density.",
      default: 0.55,
    }),
    /**
     * Weight applied to humidity when computing vegetation density.
     * Higher values favor lush vegetation even if rainfall is moderate.
     */
    humidityWeight: Type.Number({
      description: "Weight applied to humidity when computing vegetation density.",
      default: 0.25,
    }),
  },
  { additionalProperties: false, default: {} }
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
  { additionalProperties: false, default: {} }
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
  { additionalProperties: false, default: {} }
);

export const BiomeClassificationConfigSchema = Type.Object(
  {
    /** Temperature model knobs (degrees C, lapse rate, thresholds). */
    temperature: TemperatureSchema,
    /** Moisture model knobs (thresholds, humidity weight, bias). */
    moisture: MoistureSchema,
    /** Vegetation density model knobs (0..1 weights). */
    vegetation: VegetationSchema,
    /** Noise settings for moisture variation. */
    noise: NoiseSchema,
    /** Narrative overlay moisture bonuses. */
    overlays: OverlaySchema,
  },
  { additionalProperties: false, default: {} }
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
  },
  { additionalProperties: false }
);

export type BiomeClassificationConfig = Static<typeof BiomeClassificationConfigSchema>;
export type BiomeClassificationInput = Static<typeof BiomeClassificationInputSchema>;
export type BiomeClassificationOutput = Static<typeof BiomeClassificationOutputSchema>;
