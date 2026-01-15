import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

import { HotspotBiasTunablesSchema, IslandsConfigSchema } from "../../config.js";

const IslandChainsConfigSchema = Type.Object({
  islands: IslandsConfigSchema,
  hotspot: HotspotBiasTunablesSchema,
  seaLaneAvoidRadius: Type.Number({
    description: "Radius (tiles) to avoid placing islands on sea lanes.",
    default: 2,
    minimum: 0,
  }),
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
    seaLaneMask: TypedArraySchemas.u8({ description: "Mask of protected sea lanes (1=protected)." }),
    activeMarginMask: TypedArraySchemas.u8({ description: "Mask of active margin tiles (1=active)." }),
    passiveShelfMask: TypedArraySchemas.u8({ description: "Mask of passive shelf tiles (1=passive)." }),
    hotspotMask: TypedArraySchemas.u8({ description: "Mask of hotspot trail tiles (1=hotspot)." }),
    fractal: TypedArraySchemas.i16({ description: "Island fractal noise per tile." }),
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
