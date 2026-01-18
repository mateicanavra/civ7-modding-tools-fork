import { Type } from "@swooper/mapgen-core/authoring";

export const RiparianSchema = Type.Object(
  {
    /**
     * Neighborhood radius (tiles) used to consider a tile "near river".
     * @default 1
     */
    adjacencyRadius: Type.Optional(
      Type.Integer({
        description: "Neighborhood radius (tiles) used to consider a tile \"near river\".",
        default: 1,
        minimum: 0,
      })
    ),
    /**
     * Moisture bonus applied when a tile is adjacent to a minor hydrology river (effective moisture units).
     * @default 4
     */
    minorRiverMoistureBonus: Type.Optional(
      Type.Number({
        description:
          "Moisture bonus applied when a tile is adjacent to a minor hydrology river (effective moisture units).",
        default: 4,
      })
    ),
    /**
     * Moisture bonus applied when a tile is adjacent to a major hydrology river (effective moisture units).
     * @default 8
     */
    majorRiverMoistureBonus: Type.Optional(
      Type.Number({
        description:
          "Moisture bonus applied when a tile is adjacent to a major hydrology river (effective moisture units).",
        default: 8,
      })
    ),
  },
  {
    additionalProperties: false,
    description: "Riparian moisture bonuses derived from hydrology river classification.",
  }
);
