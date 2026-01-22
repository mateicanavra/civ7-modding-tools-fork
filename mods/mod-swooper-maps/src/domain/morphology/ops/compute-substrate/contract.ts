import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const SubstrateConfigSchema = Type.Object(
  {
    continentalBaseErodibility: Type.Number({
      description: "Baseline erodibility for continental crust tiles.",
      default: 0.45,
    }),
    oceanicBaseErodibility: Type.Number({
      description: "Baseline erodibility for oceanic crust tiles.",
      default: 0.35,
    }),
    continentalBaseSediment: Type.Number({
      description: "Baseline sediment depth proxy for continental crust tiles.",
      default: 0.15,
    }),
    oceanicBaseSediment: Type.Number({
      description: "Baseline sediment depth proxy for oceanic crust tiles.",
      default: 0.25,
    }),
    ageErodibilityReduction: Type.Number({
      description: "Multiplier applied to crust age (0..1) when reducing erodibility.",
      default: 0.25,
    }),
    ageSedimentBoost: Type.Number({
      description: "Multiplier applied to crust age (0..1) when raising sediment depth.",
      default: 0.15,
    }),
    upliftErodibilityBoost: Type.Number({
      description: "Multiplier applied to uplift potential when raising erodibility.",
      default: 0.3,
    }),
    riftSedimentBoost: Type.Number({
      description: "Multiplier applied to rift potential when raising sediment depth.",
      default: 0.2,
    }),
    convergentBoundaryErodibilityBoost: Type.Number({
      description: "Multiplier applied to boundary closeness (0..1) when boundaryType is convergent.",
      default: 0.12,
    }),
    divergentBoundaryErodibilityBoost: Type.Number({
      description: "Multiplier applied to boundary closeness (0..1) when boundaryType is divergent.",
      default: 0.18,
    }),
    transformBoundaryErodibilityBoost: Type.Number({
      description: "Multiplier applied to boundary closeness (0..1) when boundaryType is transform.",
      default: 0.08,
    }),
    convergentBoundarySedimentBoost: Type.Number({
      description: "Multiplier applied to boundary closeness (0..1) when boundaryType is convergent.",
      default: 0.05,
    }),
    divergentBoundarySedimentBoost: Type.Number({
      description: "Multiplier applied to boundary closeness (0..1) when boundaryType is divergent.",
      default: 0.1,
    }),
    transformBoundarySedimentBoost: Type.Number({
      description: "Multiplier applied to boundary closeness (0..1) when boundaryType is transform.",
      default: 0.03,
    }),
  },
  {
    description: "Tuning for substrate erodibility and sediment baselines.",
  }
);

/**
 * Computes substrate buffers (erodibility and sediment depth) from tectonic potentials.
 */
const ComputeSubstrateContract = defineOp({
  kind: "compute",
  id: "morphology/compute-substrate",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
      height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),
      upliftPotential: TypedArraySchemas.u8({
        description: "Uplift potential per tile (0..255).",
      }),
      riftPotential: TypedArraySchemas.u8({
        description: "Rift potential per tile (0..255).",
      }),
      boundaryCloseness: TypedArraySchemas.u8({
        description: "Boundary proximity per tile (0..255).",
      }),
      boundaryType: TypedArraySchemas.u8({
        description: "Boundary type per tile (BOUNDARY_TYPE values).",
      }),
      crustType: TypedArraySchemas.u8({
        description: "Crust type per tile (0=oceanic, 1=continental).",
      }),
      crustAge: TypedArraySchemas.u8({
        description: "Crust age per tile (0=new, 255=ancient).",
      }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object({
    erodibilityK: TypedArraySchemas.f32({
      description: "Erodibility / resistance proxy per tile (higher = easier incision).",
    }),
    sedimentDepth: TypedArraySchemas.f32({
      description: "Loose sediment thickness proxy per tile (higher = deeper deposits).",
    }),
  }),
  strategies: {
    default: SubstrateConfigSchema,
  },
});

export default ComputeSubstrateContract;
