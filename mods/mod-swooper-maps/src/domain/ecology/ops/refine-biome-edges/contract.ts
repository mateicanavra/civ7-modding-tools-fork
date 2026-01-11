import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";

const RefineBiomeEdgesInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    biomeIndex: TypedArraySchemas.u8({ description: "Biome indices per tile." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask (1 = land, 0 = water)." }),
  },
  { additionalProperties: false }
);

const RefineBiomeEdgesOutputSchema = Type.Object(
  {
    biomeIndex: TypedArraySchemas.u8({ description: "Smoothed biome indices per tile." }),
  },
  { additionalProperties: false }
);

const RefineBiomeEdgesConfigSchema = Type.Object(
  {
    radius: Type.Integer({ minimum: 1, maximum: 5, default: 1 }),
    iterations: Type.Integer({ minimum: 1, maximum: 4, default: 1 }),
  },
  { additionalProperties: false }
);

export const RefineBiomeEdgesContract = defineOpContract({
  kind: "compute",
  id: "ecology/biomes/refine-edge",
  input: RefineBiomeEdgesInputSchema,
  output: RefineBiomeEdgesOutputSchema,
  strategies: {
    default: RefineBiomeEdgesConfigSchema,
    morphological: RefineBiomeEdgesConfigSchema,
    gaussian: RefineBiomeEdgesConfigSchema,
  },
});

export default RefineBiomeEdgesContract;
