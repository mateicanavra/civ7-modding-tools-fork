import { Type } from "@swooper/mapgen-core/authoring";

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
    description: "Temperature model parameters (degrees C, lapse rate, thresholds).",
  }
);
