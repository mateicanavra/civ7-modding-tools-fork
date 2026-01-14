import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

import type { RngFunction } from "../../types.js";
import { FoundationMeshSchema } from "../compute-mesh/contract.js";
import { FoundationCrustSchema } from "../compute-crust/contract.js";

const StrategySchema = Type.Object(
  {
    plateCount: Type.Optional(
      Type.Integer({
        default: 8,
        minimum: 2,
        maximum: 32,
        description: "Number of plates used to seed the plate graph partition.",
      })
    ),
  },
  { additionalProperties: false }
);

export const FoundationPlateSchema = Type.Object(
  {
    id: Type.Integer({ minimum: 0 }),
    kind: Type.Union([Type.Literal("major"), Type.Literal("minor")]),
    seedX: Type.Number(),
    seedY: Type.Number(),
    velocityX: Type.Number(),
    velocityY: Type.Number(),
    rotation: Type.Number(),
  },
  { additionalProperties: false }
);

export const FoundationPlateGraphSchema = Type.Object(
  {
    cellToPlate: TypedArraySchemas.i16({ shape: null, description: "Plate id per mesh cell." }),
    plates: Type.Array(FoundationPlateSchema),
  },
  { additionalProperties: false }
);

const ComputePlateGraphContract = defineOp({
  kind: "compute",
  id: "foundation/compute-plate-graph",
  input: Type.Object(
    {
      mesh: FoundationMeshSchema,
      crust: FoundationCrustSchema,
      rng: Type.Unsafe<RngFunction>({ description: "Deterministic RNG wrapper (typically ctxRandom)." }),
      trace: Type.Optional(Type.Any()),
    },
    { additionalProperties: false }
  ),
  output: Type.Object({ plateGraph: FoundationPlateGraphSchema }, { additionalProperties: false }),
  strategies: {
    default: StrategySchema,
  },
});

export default ComputePlateGraphContract;
export type ComputePlateGraphConfig = Static<typeof StrategySchema>;
export type FoundationPlate = Static<typeof FoundationPlateSchema>;
export type FoundationPlateGraph = Static<typeof FoundationPlateGraphSchema>;
