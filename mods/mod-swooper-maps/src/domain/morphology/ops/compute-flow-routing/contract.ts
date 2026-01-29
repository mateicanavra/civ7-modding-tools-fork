import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const RoutingConfigSchema = Type.Object(
  {},
  {
    description: "Routing configuration (currently no tunable knobs).",
  }
);

/**
 * Computes flow routing and accumulation buffers from elevation and land mask.
 */
const ComputeFlowRoutingContract = defineOp({
  kind: "compute",
  id: "morphology/compute-flow-routing",
  input: Type.Object({
    width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
    height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),
    elevation: TypedArraySchemas.i16({ description: "Elevation per tile (normalized units)." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
  }),
  output: Type.Object({
    flowDir: TypedArraySchemas.i32({
      description: "Steepest-descent receiver index per tile (or -1 for sinks/edges).",
    }),
    flowAccum: TypedArraySchemas.f32({ description: "Drainage area proxy per tile." }),
    routingElevation: Type.Optional(
      TypedArraySchemas.f32({
        description:
          "Optional hydrologically-conditioned routing surface (Float32), used for slope/stream-power when flowDir may climb raw Int16 elevation due to depression filling.",
      })
    ),
    basinId: TypedArraySchemas.i32({
      description: "Optional basin identifier per tile (or -1 when unassigned).",
    }),
  }),
  strategies: {
    default: RoutingConfigSchema,
  },
});

export default ComputeFlowRoutingContract;
