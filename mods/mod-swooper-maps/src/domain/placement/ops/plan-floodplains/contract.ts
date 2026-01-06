import { Type, defineOpContract } from "@swooper/mapgen-core/authoring";

const FloodplainsInputSchema = Type.Object({}, { additionalProperties: false, default: {} });

const FloodplainsConfigSchema = Type.Object(
  {
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
  },
  { additionalProperties: false, default: { minLength: 4, maxLength: 10 } }
);

const FloodplainsOutputSchema = Type.Object(
  {
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
  },
  { additionalProperties: false, default: { minLength: 4, maxLength: 10 } }
);

export const PlanFloodplainsContract = defineOpContract({
  kind: "plan",
  id: "placement/plan-floodplains",
  input: FloodplainsInputSchema,
  output: FloodplainsOutputSchema,
  strategies: {
    default: FloodplainsConfigSchema,
  },
} as const);
