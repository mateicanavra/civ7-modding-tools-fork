import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

import { GeomorphologyConfigSchema, WorldAgeSchema } from "../../config.js";

const GeomorphicCycleConfigSchema = Type.Object({
  geomorphology: GeomorphologyConfigSchema,
  worldAge: WorldAgeSchema,
});

const ComputeGeomorphicCycleContract = defineOp({
  kind: "compute",
  id: "morphology/compute-geomorphic-cycle",
  input: Type.Object({
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    elevation: TypedArraySchemas.i16({ description: "Elevation per tile (normalized units)." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    flowAccum: TypedArraySchemas.f32({ description: "Flow accumulation per tile." }),
    erodibilityK: TypedArraySchemas.f32({ description: "Erodibility proxy per tile." }),
    sedimentDepth: TypedArraySchemas.f32({ description: "Sediment depth proxy per tile." }),
  }),
  output: Type.Object({
    elevationDelta: TypedArraySchemas.f32({
      description: "Elevation delta per tile to apply for geomorphic relaxation.",
    }),
    sedimentDelta: TypedArraySchemas.f32({
      description: "Sediment depth delta per tile to apply for geomorphic relaxation.",
    }),
  }),
  strategies: {
    default: GeomorphicCycleConfigSchema,
  },
});

export default ComputeGeomorphicCycleContract;
