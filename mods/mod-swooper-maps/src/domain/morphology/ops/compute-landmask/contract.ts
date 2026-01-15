import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

import { OceanSeparationConfigSchema } from "../../config.js";

const LandmaskConfigSchema = Type.Object(
  {
    basinSeparation: OceanSeparationConfigSchema,
  },
  {
    description: "Landmask shaping controls, including ocean separation policy.",
  }
);

/**
 * Derives the land mask and coastline distance field from elevation and sea level.
 */
const ComputeLandmaskContract = defineOp({
  kind: "compute",
  id: "morphology/compute-landmask",
  input: Type.Object({
    width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
    height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),
    elevation: TypedArraySchemas.i16({ description: "Elevation per tile (normalized units)." }),
    seaLevel: Type.Number({ description: "Sea level threshold." }),
    boundaryCloseness: TypedArraySchemas.u8({
      description: "Boundary proximity per tile (0..255).",
    }),
  }),
  output: Type.Object({
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    distanceToCoast: TypedArraySchemas.u16({
      description: "Distance to nearest coast in tiles (0=coast).",
    }),
  }),
  strategies: {
    default: LandmaskConfigSchema,
  },
});

export default ComputeLandmaskContract;
