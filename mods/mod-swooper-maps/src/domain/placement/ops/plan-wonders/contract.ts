import { Type, defineOpContract } from "@swooper/mapgen-core/authoring";

const MapInfoSchema = Type.Object(
  {
    NumNaturalWonders: Type.Optional(Type.Number()),
  },
  { additionalProperties: true }
);

const PlanWondersContract = defineOpContract({
  kind: "plan",
  id: "placement/plan-wonders",
  input: Type.Object({
    mapInfo: MapInfoSchema,
  }),
  output: Type.Object({
    wondersCount: Type.Integer({ minimum: 0 }),
  }),
  strategies: {
    default: Type.Object({
      wondersPlusOne: Type.Boolean({
        description:
          "Whether to add one extra natural wonder beyond map-size defaults to diversify layouts.",
        default: true,
      }),
    }),
  },
});

export default PlanWondersContract;
