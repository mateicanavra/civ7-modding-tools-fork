import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

import { IslandsConfigSchema } from "../../config.js";

const IslandChainsConfigSchema = Type.Object({
  islands: IslandsConfigSchema,
});

const IslandEditSchema = Type.Object({
  index: Type.Integer({ minimum: 0, description: "Tile index in row-major order." }),
  kind: Type.Union([Type.Literal("coast"), Type.Literal("peak")], {
    description: "Island terrain kind to apply at this tile.",
  }),
});

/**
 * Plans island chain edits to apply after base land/sea shaping.
 */
const PlanIslandChainsContract = defineOp({
  kind: "plan",
  id: "morphology/plan-island-chains",
  input: Type.Object({
    width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
    height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    boundaryCloseness: TypedArraySchemas.u8({ description: "Boundary proximity per tile (0..255)." }),
    boundaryType: TypedArraySchemas.u8({ description: "Boundary type per tile (1=conv,2=div,3=trans)." }),
    volcanism: TypedArraySchemas.u8({ description: "Volcanism signal per tile (0..255)." }),
    rngSeed: Type.Integer({ description: "Seed for deterministic island placement." }),
  }),
  output: Type.Object({
    edits: Type.Array(IslandEditSchema, {
      description: "Terrain edits to apply for island chains.",
    }),
  }),
  strategies: {
    default: IslandChainsConfigSchema,
  },
});

export default PlanIslandChainsContract;
