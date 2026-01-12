import { Type, defineOp } from "@swooper/mapgen-core/authoring";

const ResourceScoreBalanceContract = defineOp({
  kind: "score",
  id: "ecology/resources/score-balance",
  input: Type.Object(
    {
      basins: Type.Array(
        Type.Object(
          {
            resourceId: Type.String({
              description: "Resource identifier associated with the basin.",
            }),
            plots: Type.Array(Type.Integer({ minimum: 0 }), {
              description: "Plot indices belonging to the basin.",
            }),
            intensity: Type.Array(Type.Number({ minimum: 0, maximum: 1 }), {
              description: "Per-plot intensity values (0..1).",
            }),
            confidence: Type.Number({
              minimum: 0,
              maximum: 1,
              description: "Confidence weight for the basin (0..1).",
            }),
          },
          {
            description: "Resource basin candidate inputs before balance scoring.",
          }
        ),
        {
          description: "Resource basins to score and rebalance.",
        }
      ),
    },
    {
      description: "Candidate resource basin inputs for balance scoring.",
    }
  ),
  output: Type.Object(
    {
      basins: Type.Array(
        Type.Object(
          {
            resourceId: Type.String({
              description: "Resource identifier associated with the basin.",
            }),
            plots: Type.Array(Type.Integer({ minimum: 0 }), {
              description: "Plot indices belonging to the basin.",
            }),
            intensity: Type.Array(Type.Number({ minimum: 0, maximum: 1 }), {
              description: "Per-plot intensity values (0..1).",
            }),
            confidence: Type.Number({
              minimum: 0,
              maximum: 1,
              description: "Confidence weight for the basin (0..1).",
            }),
          },
          {
            description: "Balanced resource basin outputs after scoring.",
          }
        ),
        {
          description: "Balanced resource basins with updated scores.",
        }
      ),
    },
    {
      description: "Balanced resource basin outputs with adjusted scoring.",
    }
  ),
  strategies: {
    default: Type.Object(
      {
        minConfidence: Type.Number({
          minimum: 0,
          maximum: 1,
          default: 0.3,
          description: "Minimum confidence required for basins to be retained.",
        }),
        maxPerResource: Type.Integer({
          minimum: 1,
          default: 12,
          description: "Maximum basins allowed per resource during balancing.",
        }),
      },
      {
        description: "Constraints applied while balancing resource basin scores.",
      }
    ),
  },
});

export default ResourceScoreBalanceContract;
