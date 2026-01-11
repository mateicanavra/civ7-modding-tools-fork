import { Type, defineOpContract } from "@swooper/mapgen-core/authoring";

const ResourceScoreBalanceInputSchema = Type.Object(
  {
    basins: Type.Array(
      Type.Object(
        {
          resourceId: Type.String(),
          plots: Type.Array(Type.Integer({ minimum: 0 })),
          intensity: Type.Array(Type.Number({ minimum: 0, maximum: 1 })),
          confidence: Type.Number({ minimum: 0, maximum: 1 }),
        },
        { additionalProperties: false }
      )
    ),
  },
  { additionalProperties: false }
);

const ResourceScoreBalanceOutputSchema = Type.Object(
  {
    basins: Type.Array(
      Type.Object(
        {
          resourceId: Type.String(),
          plots: Type.Array(Type.Integer({ minimum: 0 })),
          intensity: Type.Array(Type.Number({ minimum: 0, maximum: 1 })),
          confidence: Type.Number({ minimum: 0, maximum: 1 }),
        },
        { additionalProperties: false }
      )
    ),
  },
  { additionalProperties: false }
);

const ResourceScoreBalanceConfigSchema = Type.Object(
  {
    minConfidence: Type.Number({ minimum: 0, maximum: 1, default: 0.3 }),
    maxPerResource: Type.Integer({ minimum: 1, default: 12 }),
  },
  { additionalProperties: false }
);

export const ResourceScoreBalanceContract = defineOpContract({
  kind: "score",
  id: "ecology/resources/score-balance",
  input: ResourceScoreBalanceInputSchema,
  output: ResourceScoreBalanceOutputSchema,
  strategies: {
    default: ResourceScoreBalanceConfigSchema,
  },
});

export default ResourceScoreBalanceContract;
