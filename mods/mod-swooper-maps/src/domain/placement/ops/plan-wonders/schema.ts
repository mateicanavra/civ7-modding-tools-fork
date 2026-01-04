import { Type, defineOpSchema } from "@swooper/mapgen-core/authoring";

const MapInfoSchema = Type.Object(
  {
    NumNaturalWonders: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

const WondersInputSchema = Type.Object(
  {
    mapInfo: MapInfoSchema,
  },
  { additionalProperties: false }
);

const WondersConfigSchema = Type.Object(
  {
    wondersPlusOne: Type.Boolean({
      description:
        "Whether to add one extra natural wonder beyond map-size defaults to diversify layouts.",
      default: true,
    }),
  },
  { additionalProperties: false, default: { wondersPlusOne: true } }
);

const WondersOutputSchema = Type.Object(
  {
    wondersCount: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false }
);

export const PlanWondersSchema = defineOpSchema<
  typeof WondersInputSchema,
  typeof WondersConfigSchema,
  typeof WondersOutputSchema
>(
  {
    input: WondersInputSchema,
    config: WondersConfigSchema,
    output: WondersOutputSchema,
  },
  {
    title: "PlanWondersSchema",
    description: "Plan natural wonder counts",
    additionalProperties: false,
  }
);
