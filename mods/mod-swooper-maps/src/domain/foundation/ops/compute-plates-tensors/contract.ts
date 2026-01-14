import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

import type { RngFunction, VoronoiUtilsInterface } from "../../types.js";

const StrategySchema = Type.Object(
  {
    plateCount: Type.Optional(
      Type.Integer({
        default: 8,
        minimum: 2,
        maximum: 32,
        description: "Number of plates to project onto tiles.",
      })
    ),
    relaxationSteps: Type.Optional(
      Type.Integer({
        default: 5,
        minimum: 0,
        maximum: 50,
        description: "Lloyd relaxation iterations for plate Voronoi.",
      })
    ),
    convergenceMix: Type.Optional(
      Type.Number({
        default: 0.5,
        minimum: 0,
        maximum: 1,
        description: "Ratio of convergent vs divergent boundaries (0..1).",
      })
    ),
    plateRotationMultiple: Type.Optional(
      Type.Number({
        default: 1,
        minimum: 0,
        maximum: 5,
        description: "Multiplier applied to plate rotation weighting along boundaries.",
      })
    ),
    seedMode: Type.Optional(
      Type.Union([Type.Literal("engine"), Type.Literal("fixed")], {
        default: "engine",
        description: "Choose engine RNG or a fixed seed for plate projection.",
      })
    ),
    fixedSeed: Type.Optional(
      Type.Integer({
        description: "Explicit plate seed value when seedMode is 'fixed'.",
      })
    ),
    seedOffset: Type.Optional(
      Type.Integer({
        default: 0,
        description: "Integer offset applied to the selected base plate seed.",
      })
    ),
  },
  { additionalProperties: false }
);

const ComputePlatesTensorsContract = defineOp({
  kind: "compute",
  id: "foundation/compute-plates-tensors",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
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
