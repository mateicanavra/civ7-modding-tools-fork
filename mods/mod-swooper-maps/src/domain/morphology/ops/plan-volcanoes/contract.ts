import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

import { VolcanoesConfigSchema } from "../../config.js";

const VolcanoPlanSchema = Type.Object({
  index: Type.Integer({ minimum: 0, description: "Tile index in row-major order." }),
});

/**
 * Plans volcanic placements driven by boundary and hotspot signals.
 */
const PlanVolcanoesContract = defineOp({
  kind: "plan",
  id: "morphology/plan-volcanoes",
  input: Type.Object({
    width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
    height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    boundaryCloseness: TypedArraySchemas.u8({ description: "Boundary proximity per tile (0..255)." }),
    boundaryType: TypedArraySchemas.u8({ description: "Boundary type per tile (1=conv,2=div,3=trans)." }),
    shieldStability: TypedArraySchemas.u8({ description: "Shield stability per tile (0..255)." }),
    volcanism: TypedArraySchemas.u8({ description: "Volcanism signal per tile (0..255)." }),
    rngSeed: Type.Integer({ description: "Seed for deterministic volcano placement." }),
  }),
  output: Type.Object({
    volcanoes: Type.Array(VolcanoPlanSchema, { description: "Planned volcano placements." }),
  }),
  strategies: {
    default: VolcanoesConfigSchema,
  },
});

export default PlanVolcanoesContract;
