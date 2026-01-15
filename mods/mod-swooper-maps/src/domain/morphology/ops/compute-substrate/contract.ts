import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const SubstrateConfigSchema = Type.Object(
  {
    baseErodibility: Type.Number({
      description: "Baseline erodibility value applied to all tiles.",
      default: 0.6,
    }),
    baseSediment: Type.Number({
      description: "Baseline sediment depth proxy applied to all tiles.",
      default: 0.2,
    }),
    upliftErodibilityBoost: Type.Number({
      description: "Multiplier applied to uplift potential when raising erodibility.",
      default: 0.3,
    }),
    riftSedimentBoost: Type.Number({
      description: "Multiplier applied to rift potential when raising sediment depth.",
      default: 0.2,
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
  input: Type.Object({
    width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
    height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),
    upliftPotential: TypedArraySchemas.u8({
      description: "Uplift potential per tile (0..255).",
    }),
    riftPotential: TypedArraySchemas.u8({
      description: "Rift potential per tile (0..255).",
    }),
  }),
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
