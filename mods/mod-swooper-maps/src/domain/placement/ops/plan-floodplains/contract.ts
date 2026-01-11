import { Type, defineOpContract } from "@swooper/mapgen-core/authoring";

const PlanFloodplainsContract = defineOpContract({
  kind: "plan",
  id: "placement/plan-floodplains",
  input: Type.Object({}),
  output: Type.Object({
    minLength: Type.Integer({
      description: "Minimum river segment length that can host floodplains (tiles).",
      minimum: 1,
      default: 4,
    }),
    maxLength: Type.Integer({
      description: "Maximum contiguous river length converted to floodplains (tiles).",
      minimum: 1,
      default: 10,
    }),
  }),
  strategies: {
    default: Type.Object({
      minLength: Type.Integer({
        description: "Minimum river segment length that can host floodplains (tiles).",
        minimum: 1,
        default: 4,
      }),
      maxLength: Type.Integer({
        description: "Maximum contiguous river length converted to floodplains (tiles).",
        minimum: 1,
        default: 10,
      }),
    }),
  },
});

export default PlanFloodplainsContract;
