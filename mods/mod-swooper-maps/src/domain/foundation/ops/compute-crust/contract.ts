import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

import type { RngFunction } from "../../types.js";
import { FoundationMeshSchema } from "../compute-mesh/contract.js";

const StrategySchema = Type.Object({}, { additionalProperties: false });

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
      rng: Type.Unsafe<RngFunction>({ description: "Deterministic RNG wrapper (typically ctxRandom)." }),
      trace: Type.Optional(Type.Any()),
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
