import { Type, type Static } from "typebox";

export const MapInfoSchema = Type.Object(
  {
    NumNaturalWonders: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export type MapInfo = Static<typeof MapInfoSchema>;

export const PlanWondersConfigSchema = Type.Object(
  {
    wondersPlusOne: Type.Boolean({
      description: "Whether to add one extra natural wonder beyond map-size defaults to diversify layouts.",
      default: true,
    }),
  },
  { additionalProperties: false, default: { wondersPlusOne: true } }
);

export type PlanWondersConfig = Static<typeof PlanWondersConfigSchema>;

export const PlanWondersInputSchema = Type.Object(
  {
    mapInfo: MapInfoSchema,
  },
  { additionalProperties: false }
);

export type PlanWondersInput = Static<typeof PlanWondersInputSchema>;

export const PlanWondersOutputSchema = Type.Object(
  {
    wondersCount: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false }
);

export type PlanWondersOutput = Static<typeof PlanWondersOutputSchema>;
