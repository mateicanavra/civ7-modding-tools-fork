import { Type } from "@swooper/mapgen-core/authoring";

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
    description: "Narrative overlay moisture bonuses (corridors, rifts).",
  }
);
