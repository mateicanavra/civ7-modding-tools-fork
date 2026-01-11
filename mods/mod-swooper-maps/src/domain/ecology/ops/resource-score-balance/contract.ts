import { Type, defineOpContract } from "@swooper/mapgen-core/authoring";

const ResourceScoreBalanceContract = defineOpContract({
  kind: "score",
  id: "ecology/resources/score-balance",
  input: Type.Object({
    basins: Type.Array(
      Type.Object({
        resourceId: Type.String(),
        plots: Type.Array(Type.Integer({ minimum: 0 })),
        intensity: Type.Array(Type.Number({ minimum: 0, maximum: 1 })),
        confidence: Type.Number({ minimum: 0, maximum: 1 }),
      })
    ),
  }),
  output: Type.Object({
    basins: Type.Array(
      Type.Object({
        resourceId: Type.String(),
        plots: Type.Array(Type.Integer({ minimum: 0 })),
        intensity: Type.Array(Type.Number({ minimum: 0, maximum: 1 })),
        confidence: Type.Number({ minimum: 0, maximum: 1 }),
      })
    ),
  }),
  strategies: {
    default: Type.Object({
      minConfidence: Type.Number({ minimum: 0, maximum: 1, default: 0.3 }),
      maxPerResource: Type.Integer({ minimum: 1, default: 12 }),
    }),
  },
});

export default ResourceScoreBalanceContract;
