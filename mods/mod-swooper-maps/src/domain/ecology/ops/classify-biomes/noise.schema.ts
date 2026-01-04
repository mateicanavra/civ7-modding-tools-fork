import { Type } from "@swooper/mapgen-core/authoring";

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
