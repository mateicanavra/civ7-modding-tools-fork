import { Type } from "@swooper/mapgen-core/authoring";

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
