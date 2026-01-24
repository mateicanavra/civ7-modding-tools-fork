import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static, TSchema } from "@swooper/mapgen-core/authoring";
import { FoundationMeshSchema } from "../compute-mesh/contract.js";

function withDescription<T extends TSchema>(schema: T, description: string) {
  const { additionalProperties: _additionalProperties, default: _default, ...rest } = schema as any;
  return Type.Unsafe<Static<T>>({ ...rest, description } as any);
}

/** Default strategy configuration for computing crust drivers. */
const StrategySchema = Type.Object(
  {
    /** Fraction of cells assigned continental crust (default: 0.3). Increase to bias more cells toward continental crust; decrease for more oceanic coverage. */
    continentalRatio: Type.Number({
      default: 0.3,
      minimum: 0,
      maximum: 1,
      description:
        "Fraction of cells assigned continental crust (default: 0.3). Increase to bias more cells toward continental crust; decrease for more oceanic coverage.",
    }),
    /** Shelf/margin influence radius in mesh-cell steps (default: 6). Increase to widen the shelf/passive-margin transition; decrease to tighten it. */
    shelfWidthCells: Type.Integer({
      default: 6,
      minimum: 1,
      maximum: 64,
      description:
        "Shelf/margin influence radius in mesh-cell steps (default: 6). Increase to widen the shelf/passive-margin transition; decrease to tighten it.",
    }),
    /** BaseElevation boost applied to oceanic cells near continental boundaries (default: 0.12). Increase to raise continental shelves; decrease to flatten shelves. */
    shelfElevationBoost: Type.Number({
      default: 0.12,
      minimum: 0,
      maximum: 1,
      description:
        "BaseElevation boost applied to oceanic cells near continental boundaries (default: 0.12). Increase to raise continental shelves; decrease to flatten shelves.",
    }),
    /** BaseElevation penalty applied to continental cells near boundaries (default: 0.04). Increase to lower passive margins; decrease to keep margins closer to interior elevation. */
    marginElevationPenalty: Type.Number({
      default: 0.04,
      minimum: 0,
      maximum: 1,
      description:
        "BaseElevation penalty applied to continental cells near boundaries (default: 0.04). Increase to lower passive margins; decrease to keep margins closer to interior elevation.",
    }),
    /** Baseline isostatic baseElevation for continental crust (default: 0.78). Increase to raise continental interiors; decrease to lower them. */
    continentalBaseElevation: Type.Number({
      default: 0.78,
      minimum: 0,
      maximum: 1,
      description:
        "Baseline isostatic baseElevation for continental crust (default: 0.78). Increase to raise continental interiors; decrease to lower them.",
    }),
    /** Age-based baseElevation boost for continental interiors (default: 0.12). Increase to make old continental crust higher; decrease to reduce age-driven uplift. */
    continentalAgeBoost: Type.Number({
      default: 0.12,
      minimum: 0,
      maximum: 1,
      description:
        "Age-based baseElevation boost for continental interiors (default: 0.12). Increase to make old continental crust higher; decrease to reduce age-driven uplift.",
    }),
    /** Baseline isostatic baseElevation for oceanic crust (default: 0.32). Increase to make oceans shallower; decrease to deepen oceans. */
    oceanicBaseElevation: Type.Number({
      default: 0.32,
      minimum: 0,
      maximum: 1,
      description:
        "Baseline isostatic baseElevation for oceanic crust (default: 0.32). Increase to make oceans shallower; decrease to deepen oceans.",
    }),
    /** Age-based baseElevation depth increase for oceanic crust (default: 0.22). Increase to deepen old oceanic crust; decrease to flatten age-driven deepening. */
    oceanicAgeDepth: Type.Number({
      default: 0.22,
      minimum: 0,
      maximum: 1,
      description:
        "Age-based baseElevation depth increase for oceanic crust (default: 0.22). Increase to deepen old oceanic crust; decrease to flatten age-driven deepening.",
    }),
  },
  { description: "Default strategy configuration for computing crust drivers." }
);

/** Crust drivers (type/age/buoyancy/baseElevation/strength) per mesh cell. */
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
    buoyancy: TypedArraySchemas.f32({
      shape: null,
      description: "Crust buoyancy proxy per mesh cell (0..1).",
    }),
    baseElevation: TypedArraySchemas.f32({
      shape: null,
      description: "Isostatic base elevation proxy per mesh cell (0..1).",
    }),
    strength: TypedArraySchemas.f32({
      shape: null,
      description: "Lithospheric strength proxy per mesh cell (0..1).",
    }),
  },
  { description: "Crust drivers (type/age/buoyancy/baseElevation/strength) per mesh cell." }
);

/** Input payload for foundation/compute-crust. */
const InputSchema = Type.Object(
  {
    /** Foundation mesh (cells, adjacency, site coordinates). */
    mesh: withDescription(
      FoundationMeshSchema,
      "Foundation mesh (cells, adjacency, site coordinates)."
    ),
    /** Deterministic RNG seed (derived in the step; pure data). */
    rngSeed: Type.Integer({
      minimum: 0,
      maximum: 2_147_483_647,
      description: "Deterministic RNG seed (derived in the step; pure data).",
    }),
  },
  { description: "Input payload for foundation/compute-crust." }
);

/** Output payload for foundation/compute-crust. */
const OutputSchema = Type.Object(
  {
    /** Crust drivers (type/age/buoyancy/baseElevation/strength) per mesh cell. */
    crust: FoundationCrustSchema,
  },
  { description: "Output payload for foundation/compute-crust." }
);

const ComputeCrustContract = defineOp({
  kind: "compute",
  id: "foundation/compute-crust",
  input: InputSchema,
  output: OutputSchema,
  strategies: {
    default: StrategySchema,
  },
});

export default ComputeCrustContract;
export type ComputeCrustConfig = Static<typeof StrategySchema>;
export type FoundationCrust = Static<typeof FoundationCrustSchema>;
