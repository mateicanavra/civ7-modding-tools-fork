import { Type, type Static } from "typebox";

export const PlanFloodplainsConfigSchema = Type.Object(
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

export type PlanFloodplainsConfig = Static<typeof PlanFloodplainsConfigSchema>;

export const PlanFloodplainsInputSchema = Type.Object({}, { additionalProperties: false, default: {} });

export type PlanFloodplainsInput = Static<typeof PlanFloodplainsInputSchema>;

export const PlanFloodplainsOutputSchema = Type.Object(
  {
    minLength: Type.Integer({ minimum: 1 }),
    maxLength: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false }
);

export type PlanFloodplainsOutput = Static<typeof PlanFloodplainsOutputSchema>;
