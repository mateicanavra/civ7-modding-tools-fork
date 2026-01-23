import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";
import { FoundationMeshSchema } from "../compute-mesh/contract.js";
import { FoundationTectonicSegmentsSchema } from "../compute-tectonic-segments/contract.js";

const StrategySchema = Type.Object(
  {
    eraWeights: Type.Array(Type.Number({ minimum: 0, maximum: 10 }), {
      default: [0.35, 0.35, 0.3],
      description: "Per-era weight multipliers (3 eras).",
    }),
    driftStepsByEra: Type.Array(Type.Integer({ minimum: 0, maximum: 16 }), {
      default: [2, 1, 0],
      description: "How many discrete neighbor steps to drift segment seeds per era (3 eras; oldest→newest).",
    }),
    beltInfluenceDistance: Type.Integer({
      default: 8,
      minimum: 1,
      maximum: 64,
      description: "Maximum belt influence distance in mesh-neighbor steps.",
    }),
    beltDecay: Type.Number({
      default: 0.55,
      minimum: 0.01,
      maximum: 10,
      description: "Exponential decay coefficient for belt influence per mesh-neighbor step.",
    }),
    activityThreshold: Type.Integer({
      default: 1,
      minimum: 0,
      maximum: 255,
      description: "Threshold used to compute lastActiveEra (0..255).",
    }),
  },
  { additionalProperties: false }
);

const EraFieldsSchema = Type.Object(
  {
    boundaryType: TypedArraySchemas.u8({ shape: null, description: "Boundary regime per mesh cell (BOUNDARY_TYPE values)." }),
    upliftPotential: TypedArraySchemas.u8({ shape: null, description: "Uplift potential per mesh cell (0..255)." }),
    riftPotential: TypedArraySchemas.u8({ shape: null, description: "Rift potential per mesh cell (0..255)." }),
    shearStress: TypedArraySchemas.u8({ shape: null, description: "Shear stress per mesh cell (0..255)." }),
    volcanism: TypedArraySchemas.u8({ shape: null, description: "Volcanism potential per mesh cell (0..255)." }),
    fracture: TypedArraySchemas.u8({ shape: null, description: "Fracture potential per mesh cell (0..255)." }),
  },
  { additionalProperties: false }
);

export const FoundationTectonicHistorySchema = Type.Object(
  {
    eraCount: Type.Integer({ minimum: 1, maximum: 8 }),
    eras: Type.Array(EraFieldsSchema, { description: "Era fields (oldest→newest)." }),
    upliftTotal: TypedArraySchemas.u8({ shape: null, description: "Accumulated uplift across eras (0..255)." }),
    fractureTotal: TypedArraySchemas.u8({ shape: null, description: "Accumulated fracture across eras (0..255)." }),
    volcanismTotal: TypedArraySchemas.u8({ shape: null, description: "Accumulated volcanism across eras (0..255)." }),
    upliftRecentFraction: TypedArraySchemas.u8({
      shape: null,
      description: "Fraction of total uplift contributed by newest era (0..255).",
    }),
    lastActiveEra: TypedArraySchemas.u8({
      shape: null,
      description: "Most recent active era index per cell (0..eraCount-1), or 255 when never active.",
    }),
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
    cumulativeUplift: TypedArraySchemas.u8({
      shape: null,
      description: "Accumulated uplift per mesh cell (0..255).",
    }),
  },
  { additionalProperties: false }
);

const ComputeTectonicHistoryContract = defineOp({
  kind: "compute",
  id: "foundation/compute-tectonic-history",
  input: Type.Object(
    {
      mesh: FoundationMeshSchema,
      segments: FoundationTectonicSegmentsSchema,
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    { tectonicHistory: FoundationTectonicHistorySchema, tectonics: FoundationTectonicsSchema },
    { additionalProperties: false }
  ),
  strategies: {
    default: StrategySchema,
  },
});

export default ComputeTectonicHistoryContract;
export type ComputeTectonicHistoryConfig = Static<typeof StrategySchema>;
export type FoundationTectonicHistory = Static<typeof FoundationTectonicHistorySchema>;
export type FoundationTectonics = Static<typeof FoundationTectonicsSchema>;
