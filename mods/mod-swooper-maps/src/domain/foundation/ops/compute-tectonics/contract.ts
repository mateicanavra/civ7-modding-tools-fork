import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

import { FoundationMeshSchema } from "../compute-mesh/contract.js";
import { FoundationCrustSchema } from "../compute-crust/contract.js";
import { FoundationPlateGraphSchema } from "../compute-plate-graph/contract.js";

const PolarBoundaryRegimeSchema = Type.Union([
  Type.Literal("convergent"),
  Type.Literal("divergent"),
  Type.Literal("transform"),
]);

const PolarBoundaryEdgeSchema = Type.Object(
  {
    regime: PolarBoundaryRegimeSchema,
    intensity: Type.Number({
      minimum: 0,
      maximum: 2,
      description: "Edge interaction intensity multiplier (0..2).",
    }),
  },
  { additionalProperties: false }
);

const StrategySchema = Type.Object(
  {
    polarBandFraction: Type.Number({
      default: 0.12,
      minimum: 0,
      maximum: 0.5,
      description: "Fraction of the mesh Y-span treated as the polar edge interaction band.",
    }),
    polarBoundary: Type.Optional(
      Type.Object(
        {
          north: PolarBoundaryEdgeSchema,
          south: PolarBoundaryEdgeSchema,
        },
        {
          additionalProperties: false,
          default: {
            north: { regime: "transform", intensity: 1.0 },
            south: { regime: "transform", intensity: 1.0 },
          },
        }
      )
    ),
  },
  { additionalProperties: false }
);

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
