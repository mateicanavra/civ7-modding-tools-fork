import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

import { FoundationConfigSchema } from "@mapgen/domain/config";

import type { DirectionalityConfig, RngFunction, VoronoiUtilsInterface } from "../../types.js";

const StrategySchema = Type.Partial(FoundationConfigSchema);

const ComputePlatesTensorsContract = defineOp({
  kind: "compute",
  id: "foundation/compute-plates-tensors",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      directionality: Type.Unsafe<DirectionalityConfig | null>({
        description: "Directionality configuration (authoritative: env.directionality).",
      }),
      rng: Type.Unsafe<RngFunction>({ description: "Deterministic RNG wrapper (typically ctxRandom)." }),
      voronoiUtils: Type.Unsafe<VoronoiUtilsInterface>({
        description: "Adapter-provided Voronoi utilities (typically adapter.getVoronoiUtils()).",
      }),
      trace: Type.Optional(Type.Any()),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      plates: Type.Object(
        {
          id: TypedArraySchemas.i16({ description: "Plate id per tile." }),
          boundaryCloseness: TypedArraySchemas.u8({ description: "Boundary proximity per tile (0..255)." }),
          boundaryType: TypedArraySchemas.u8({ description: "Boundary type per tile (BOUNDARY_TYPE values)." }),
          tectonicStress: TypedArraySchemas.u8({ description: "Tectonic stress per tile (0..255)." }),
          upliftPotential: TypedArraySchemas.u8({ description: "Uplift potential per tile (0..255)." }),
          riftPotential: TypedArraySchemas.u8({ description: "Rift potential per tile (0..255)." }),
          shieldStability: TypedArraySchemas.u8({ description: "Shield stability per tile (0..255)." }),
          movementU: TypedArraySchemas.i8({ description: "Plate movement U component per tile (-127..127)." }),
          movementV: TypedArraySchemas.i8({ description: "Plate movement V component per tile (-127..127)." }),
          rotation: TypedArraySchemas.i8({ description: "Plate rotation per tile (-127..127)." }),
        },
        { additionalProperties: false }
      ),
      plateSeed: Type.Any(),
      diagnostics: Type.Any(),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: StrategySchema,
  },
});

export default ComputePlatesTensorsContract;
export type ComputePlatesTensorsConfig = Static<typeof StrategySchema>;
