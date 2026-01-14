import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

import { FoundationMeshSchema } from "../compute-mesh/contract.js";
import { FoundationCrustSchema } from "../compute-crust/contract.js";
import { FoundationPlateGraphSchema } from "../compute-plate-graph/contract.js";

const StrategySchema = Type.Object({}, { additionalProperties: false });

export const FoundationTectonicsSchema = Type.Object(
  {
    boundaryType: TypedArraySchemas.u8({
      shape: null,
      description: "Boundary type per mesh cell (BOUNDARY_TYPE values; 0 when non-boundary/unknown).",
    }),
    upliftPotential: TypedArraySchemas.u8({ shape: null, description: "Uplift potential per mesh cell (0..255)." }),
    riftPotential: TypedArraySchemas.u8({ shape: null, description: "Rift potential per mesh cell (0..255)." }),
    shearStress: TypedArraySchemas.u8({ shape: null, description: "Shear stress per mesh cell (0..255)." }),
    volcanism: TypedArraySchemas.u8({ shape: null, description: "Volcanism per mesh cell (0..255)." }),
    fracture: TypedArraySchemas.u8({ shape: null, description: "Fracture potential per mesh cell (0..255)." }),
    cumulativeUplift: TypedArraySchemas.u8({ shape: null, description: "Accumulated uplift per mesh cell (0..255)." }),
  },
  { additionalProperties: false }
);

const ComputeTectonicsContract = defineOp({
  kind: "compute",
  id: "foundation/compute-tectonics",
  input: Type.Object(
    {
      mesh: FoundationMeshSchema,
      crust: FoundationCrustSchema,
      plateGraph: FoundationPlateGraphSchema,
      trace: Type.Optional(Type.Any()),
    },
    { additionalProperties: false }
  ),
  output: Type.Object({ tectonics: FoundationTectonicsSchema }, { additionalProperties: false }),
  strategies: {
    default: StrategySchema,
  },
});

export default ComputeTectonicsContract;
export type ComputeTectonicsConfig = Static<typeof StrategySchema>;
export type FoundationTectonics = Static<typeof FoundationTectonicsSchema>;
