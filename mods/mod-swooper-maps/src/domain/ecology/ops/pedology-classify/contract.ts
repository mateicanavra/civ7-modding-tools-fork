import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";

const PedologyClassifyInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    landMask: TypedArraySchemas.u8({ description: "Land mask (1 = land, 0 = water)." }),
    elevation: TypedArraySchemas.i16({ description: "Elevation in meters above sea level." }),
    rainfall: TypedArraySchemas.u8({ description: "Rainfall per tile (0..255)." }),
    humidity: TypedArraySchemas.u8({ description: "Humidity per tile (0..255)." }),
    sedimentDepth: Type.Optional(
      Type.Union([
        TypedArraySchemas.f32({ description: "Optional sediment depth proxy (meters)." }),
        Type.Undefined(),
      ])
    ),
    bedrockAge: Type.Optional(
      Type.Union([
        TypedArraySchemas.i16({ description: "Optional bedrock age proxy (millions of years)." }),
        Type.Undefined(),
      ])
    ),
    slope: Type.Optional(
      Type.Union([
        TypedArraySchemas.f32({ description: "Optional slope or relief proxy (0..1)." }),
        Type.Undefined(),
      ])
    ),
  },
  { additionalProperties: false }
);

const PedologyClassifyOutputSchema = Type.Object(
  {
    soilType: TypedArraySchemas.u8({ description: "Soil palette index per tile." }),
    fertility: TypedArraySchemas.f32({ description: "Fertility score per tile (0..1)." }),
  },
  { additionalProperties: false }
);

const PedologyClassifyConfigSchema = Type.Object(
  {
    climateWeight: Type.Number({ minimum: 0, maximum: 5, default: 1.2 }),
    reliefWeight: Type.Number({ minimum: 0, maximum: 5, default: 0.8 }),
    sedimentWeight: Type.Number({ minimum: 0, maximum: 5, default: 1.1 }),
    bedrockWeight: Type.Number({ minimum: 0, maximum: 5, default: 0.6 }),
    fertilityCeiling: Type.Number({ minimum: 0, maximum: 1, default: 0.95 }),
  },
  { additionalProperties: false }
);

export const PedologyClassifyContract = defineOpContract({
  kind: "compute",
  id: "ecology/pedology/classify",
  input: PedologyClassifyInputSchema,
  output: PedologyClassifyOutputSchema,
  strategies: {
    default: PedologyClassifyConfigSchema,
    "coastal-shelf": PedologyClassifyConfigSchema,
    "orogeny-boosted": PedologyClassifyConfigSchema,
  },
});

export default PedologyClassifyContract;
