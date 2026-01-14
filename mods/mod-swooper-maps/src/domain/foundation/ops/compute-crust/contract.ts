import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";
import { FoundationMeshSchema } from "../compute-mesh/contract.js";

const StrategySchema = Type.Object(
  {
    continentalRatio: Type.Number({
      default: 0.3,
      minimum: 0,
      maximum: 1,
      description: "Fraction of cells assigned continental crust (remainder = oceanic).",
    }),
  },
  { additionalProperties: false }
);

export const FoundationCrustSchema = Type.Object(
  {
    type: TypedArraySchemas.u8({
      shape: null,
      description: "Crust type per mesh cell (0=oceanic, 1=continental).",
    }),
    age: TypedArraySchemas.u8({
      shape: null,
      description: "Crust age per mesh cell (0=new, 255=ancient).",
    }),
  },
  { additionalProperties: false }
);

const ComputeCrustContract = defineOp({
  kind: "compute",
  id: "foundation/compute-crust",
  input: Type.Object(
    {
      mesh: FoundationMeshSchema,
      rngSeed: Type.Integer({
        minimum: 0,
        maximum: 2_147_483_647,
        description: "Deterministic RNG seed (derived in the step; pure data).",
      }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object({ crust: FoundationCrustSchema }, { additionalProperties: false }),
  strategies: {
    default: StrategySchema,
  },
});

export default ComputeCrustContract;
export type ComputeCrustConfig = Static<typeof StrategySchema>;
export type FoundationCrust = Static<typeof FoundationCrustSchema>;
