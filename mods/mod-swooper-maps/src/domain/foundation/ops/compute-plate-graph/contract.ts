import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";
import { FoundationMeshSchema } from "../compute-mesh/contract.js";
import { FoundationCrustSchema } from "../compute-crust/contract.js";

const StrategySchema = Type.Object(
  {
    plateCount: Type.Integer({
      default: 8,
      minimum: 2,
      maximum: 256,
      description:
        "Authored plate count (scaled to the runtime map size in normalization).",
    }),
    referenceArea: Type.Integer({
      default: 4000,
      minimum: 1,
      description: "Reference map area (width*height) used for plateCount scaling.",
    }),
    plateScalePower: Type.Number({
      default: 0.5,
      minimum: 0,
      maximum: 2,
      description: "Exponent applied to (area/referenceArea) when scaling plateCount.",
    }),
  },
  { additionalProperties: false }
);

export const FoundationPlateSchema = Type.Object(
  {
    id: Type.Integer({ minimum: 0 }),
    kind: Type.Union([Type.Literal("major"), Type.Literal("minor")]),
    seedX: Type.Number({ description: "Seed location X in mesh hex space." }),
    seedY: Type.Number({ description: "Seed location Y in mesh hex space." }),
    velocityX: Type.Number(),
    velocityY: Type.Number(),
    rotation: Type.Number(),
  },
  { additionalProperties: false }
);

export const FoundationPlateGraphSchema = Type.Object(
  {
    cellToPlate: TypedArraySchemas.i16({ shape: null, description: "Plate id per mesh cell." }),
    plates: Type.Immutable(Type.Array(FoundationPlateSchema)),
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
      rngSeed: Type.Integer({
        minimum: 0,
        maximum: 2_147_483_647,
        description: "Deterministic RNG seed (derived in the step; pure data).",
      }),
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
