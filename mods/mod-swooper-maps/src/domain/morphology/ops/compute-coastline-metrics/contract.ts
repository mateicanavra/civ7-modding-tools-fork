import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

import { CoastConfigSchema } from "../../config.js";

const SeaLaneProtectionSchema = Type.Object(
  {
    mode: Type.Union([Type.Literal("none"), Type.Literal("soft"), Type.Literal("hard")], {
      description: "Sea-lane protection mode applied to coastline carving.",
      default: "soft",
    }),
    softChanceMultiplier: Type.Number({
      description: "Chance multiplier applied to carving when protection mode is soft.",
      default: 1,
      minimum: 0,
    }),
  },
  {
    description: "Sea lane protection policy for coastline carving.",
  }
);

const CoastlineMetricsConfigSchema = Type.Object(
  {
    coast: CoastConfigSchema,
    seaLanes: SeaLaneProtectionSchema,
  },
  {
    description: "Coastline carving controls, including sea lane protection policy.",
  }
);

/**
 * Derives coastline adjacency masks and updated land/coast masks.
 */
const ComputeCoastlineMetricsContract = defineOp({
  kind: "compute",
  id: "morphology/compute-coastline-metrics",
  input: Type.Object({
    width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
    height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    boundaryCloseness: TypedArraySchemas.u8({ description: "Boundary proximity per tile (0..255)." }),
    boundaryType: TypedArraySchemas.u8({ description: "Boundary type per tile (1=conv,2=div,3=trans)." }),
    seaLaneMask: TypedArraySchemas.u8({ description: "Mask of protected sea lanes (1=protected)." }),
    activeMarginMask: TypedArraySchemas.u8({ description: "Mask of active margin tiles (1=active)." }),
    passiveShelfMask: TypedArraySchemas.u8({ description: "Mask of passive shelf tiles (1=passive)." }),
    fractal: TypedArraySchemas.i16({ description: "Coastline fractal noise per tile." }),
    rngSeed: Type.Integer({ description: "Seed for deterministic coastline carving." }),
  }),
  output: Type.Object({
    coastalLand: TypedArraySchemas.u8({ description: "Mask (1/0): land tiles adjacent to water." }),
    coastalWater: TypedArraySchemas.u8({ description: "Mask (1/0): water tiles adjacent to land." }),
    coastMask: TypedArraySchemas.u8({ description: "Mask (1/0): water tiles assigned to coast terrain." }),
    landMask: TypedArraySchemas.u8({ description: "Updated land mask after coastal carving." }),
  }),
  strategies: {
    default: CoastlineMetricsConfigSchema,
  },
});

export default ComputeCoastlineMetricsContract;
