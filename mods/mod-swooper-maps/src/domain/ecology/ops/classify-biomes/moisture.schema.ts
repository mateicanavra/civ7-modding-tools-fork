import { Type } from "@swooper/mapgen-core/authoring";

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
