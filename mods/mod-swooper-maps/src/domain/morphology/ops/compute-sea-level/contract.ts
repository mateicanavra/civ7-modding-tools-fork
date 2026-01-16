import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

import { HypsometryConfigSchema } from "../../config.js";

const ComputeSeaLevelContract = defineOp({
  kind: "compute",
  id: "morphology/compute-sea-level",
  input: Type.Object({
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    elevation: TypedArraySchemas.i16({ description: "Base elevation per tile (normalized units)." }),
    boundaryCloseness: TypedArraySchemas.u8({
      description: "Boundary proximity per tile (0..255).",
    }),
    upliftPotential: TypedArraySchemas.u8({
      description: "Uplift potential per tile (0..255).",
    }),
    rngSeed: Type.Integer({ description: "Seed for hypsometry variance (deterministic)." }),
  }),
  output: Type.Object({
    seaLevel: Type.Number({ description: "Sea level threshold derived from hypsometry targets." }),
  }),
  strategies: {
    default: HypsometryConfigSchema,
  },
});

export default ComputeSeaLevelContract;
