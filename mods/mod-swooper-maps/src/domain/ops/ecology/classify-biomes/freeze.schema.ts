import { Type } from "@swooper/mapgen-core/authoring";

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
