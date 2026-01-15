import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

import { ReliefConfigSchema } from "../../config.js";

/**
 * Converts tectonic uplift potentials into the initial elevation field.
 */
const ComputeBaseTopographyContract = defineOp({
  kind: "compute",
  id: "morphology/compute-base-topography",
  input: Type.Object({
    width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
    height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),
    boundaryCloseness: TypedArraySchemas.u8({
      description: "Boundary proximity per tile (0..255).",
    }),
    upliftPotential: TypedArraySchemas.u8({
      description: "Uplift potential per tile (0..255).",
    }),
    riftPotential: TypedArraySchemas.u8({
      description: "Rift potential per tile (0..255).",
    }),
    rngSeed: Type.Integer({ description: "Seed for deterministic base-topography noise." }),
  }),
  output: Type.Object({
    elevation: TypedArraySchemas.i16({
      description: "Base elevation per tile (normalized, scaled to int16).",
    }),
  }),
  strategies: {
    default: ReliefConfigSchema,
  },
});

export default ComputeBaseTopographyContract;
