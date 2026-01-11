import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";

const AggregatePedologyInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    soilType: TypedArraySchemas.u8({ description: "Soil palette indices." }),
    fertility: TypedArraySchemas.f32({ description: "Fertility values (0..1)." }),
  },
  { additionalProperties: false }
);

const AggregatePedologyOutputSchema = Type.Object(
  {
    cells: Type.Array(
      Type.Object(
        {
          x: Type.Integer({ minimum: 0 }),
          y: Type.Integer({ minimum: 0 }),
          width: Type.Integer({ minimum: 1 }),
          height: Type.Integer({ minimum: 1 }),
          meanFertility: Type.Number({ minimum: 0, maximum: 1 }),
          dominantSoil: Type.Integer({ minimum: 0 }),
        },
        { additionalProperties: false }
      )
    ),
  },
  { additionalProperties: false }
);

const AggregatePedologyConfigSchema = Type.Object(
  {
    cellSize: Type.Integer({ minimum: 1, default: 8 }),
  },
  { additionalProperties: false }
);

export const AggregatePedologyContract = defineOpContract({
  kind: "compute",
  id: "ecology/pedology/aggregate",
  input: AggregatePedologyInputSchema,
  output: AggregatePedologyOutputSchema,
  strategies: {
    default: AggregatePedologyConfigSchema,
  },
});

export default AggregatePedologyContract;
