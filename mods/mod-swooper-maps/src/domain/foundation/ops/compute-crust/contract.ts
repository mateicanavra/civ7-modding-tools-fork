import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";
import { FoundationMeshSchema } from "../compute-mesh/contract.js";

const StrategySchema = Type.Object(
  {
    /** Fraction of cells assigned continental crust (remainder = oceanic). */
    continentalRatio: Type.Number({
      default: 0.3,
      minimum: 0,
      maximum: 1,
      description: "Fraction of cells assigned continental crust (remainder = oceanic).",
    }),
    /** Shelf/margin influence radius in mesh-cell steps (used when shaping baseElevation). */
    shelfWidthCells: Type.Integer({
      default: 6,
      minimum: 1,
      maximum: 64,
      description: "Shelf/margin influence radius in mesh-cell steps (used when shaping baseElevation).",
    }),
    /** BaseElevation boost applied to oceanic cells near continental boundaries (continental shelf proxy). */
    shelfElevationBoost: Type.Number({
      default: 0.12,
      minimum: 0,
      maximum: 1,
      description: "BaseElevation boost applied to oceanic cells near continental boundaries (continental shelf proxy).",
    }),
    /** BaseElevation penalty applied to continental cells near boundaries (passive margin proxy). */
    marginElevationPenalty: Type.Number({
      default: 0.04,
      minimum: 0,
      maximum: 1,
      description: "BaseElevation penalty applied to continental cells near boundaries (passive margin proxy).",
    }),
    /** Baseline isostatic baseElevation for continental crust (0..1). */
    continentalBaseElevation: Type.Number({
      default: 0.78,
      minimum: 0,
      maximum: 1,
      description: "Baseline isostatic baseElevation for continental crust (0..1).",
    }),
    /** Age-based baseElevation boost for continental interiors (craton proxy; 0..1 of age01). */
    continentalAgeBoost: Type.Number({
      default: 0.12,
      minimum: 0,
      maximum: 1,
      description: "Age-based baseElevation boost for continental interiors (craton proxy; 0..1 of age01).",
    }),
    /** Baseline isostatic baseElevation for oceanic crust (0..1). */
    oceanicBaseElevation: Type.Number({
      default: 0.32,
      minimum: 0,
      maximum: 1,
      description: "Baseline isostatic baseElevation for oceanic crust (0..1).",
    }),
    /** Age-based baseElevation depth increase for oceanic crust (0..1 of age01). */
    oceanicAgeDepth: Type.Number({
      default: 0.22,
      minimum: 0,
      maximum: 1,
      description: "Age-based baseElevation depth increase for oceanic crust (0..1 of age01).",
    }),
  },
  { additionalProperties: false }
);

export const FoundationCrustSchema = Type.Object(
  {
    /** Crust type per mesh cell (0=oceanic, 1=continental). */
    type: TypedArraySchemas.u8({
      shape: null,
      description: "Crust type per mesh cell (0=oceanic, 1=continental).",
    }),
    /** Crust age per mesh cell (0=new, 255=ancient). */
    age: TypedArraySchemas.u8({
      shape: null,
      description: "Crust age per mesh cell (0=new, 255=ancient).",
    }),
    /** Crust buoyancy proxy per mesh cell (0..1). */
    buoyancy: TypedArraySchemas.f32({
      shape: null,
      description: "Crust buoyancy proxy per mesh cell (0..1).",
    }),
    /** Isostatic base elevation proxy per mesh cell (0..1). */
    baseElevation: TypedArraySchemas.f32({
      shape: null,
      description: "Isostatic base elevation proxy per mesh cell (0..1).",
    }),
    /** Lithospheric strength proxy per mesh cell (0..1). */
    strength: TypedArraySchemas.f32({
      shape: null,
      description: "Lithospheric strength proxy per mesh cell (0..1).",
    }),
  },
  { additionalProperties: false }
);

const ComputeCrustContract = defineOp({
  kind: "compute",
  id: "foundation/compute-crust",
  input: Type.Object(
    {
      /** Foundation mesh (cells, adjacency, site coordinates). */
      mesh: FoundationMeshSchema,
      /** Deterministic RNG seed (derived in the step; pure data). */
      rngSeed: Type.Integer({
        minimum: 0,
        maximum: 2_147_483_647,
        description: "Deterministic RNG seed (derived in the step; pure data).",
      }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      /** Crust drivers (type/age/buoyancy/baseElevation/strength) per mesh cell. */
      crust: FoundationCrustSchema,
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: StrategySchema,
  },
});

export default ComputeCrustContract;
export type ComputeCrustConfig = Static<typeof StrategySchema>;
export type FoundationCrust = Static<typeof FoundationCrustSchema>;
