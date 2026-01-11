import { Type, defineOpContract } from "@swooper/mapgen-core/authoring";

const MapInfoSchema = Type.Object(
  {
    NumNaturalWonders: Type.Optional(Type.Number())},
  { additionalProperties: true }
);

const WondersInputSchema = Type.Object(
  {
    mapInfo: MapInfoSchema},
  {}
);

const WondersConfigSchema = Type.Object(
  {
    wondersPlusOne: Type.Boolean({
      description:
        "Whether to add one extra natural wonder beyond map-size defaults to diversify layouts.",
      default: true})},
  {}
);

const WondersOutputSchema = Type.Object(
  {
    wondersCount: Type.Integer({ minimum: 0 })},
  {}
);

const PlanWondersContract = defineOpContract({
  kind: "plan",
  id: "placement/plan-wonders",
  input: WondersInputSchema,
  output: WondersOutputSchema,
  strategies: {
    default: WondersConfigSchema}});

export default PlanWondersContract;
