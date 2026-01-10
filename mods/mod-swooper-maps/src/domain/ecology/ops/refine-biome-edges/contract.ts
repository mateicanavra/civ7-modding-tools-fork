import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const RefineBiomeEdgesContract = defineOp({
  kind: "compute",
  id: "ecology/biomes/refine-edge",
  input: Type.Object({
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    biomeIndex: TypedArraySchemas.u8({ description: "Biome indices per tile." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask (1 = land, 0 = water)." }),
  }),
  output: Type.Object({
    biomeIndex: TypedArraySchemas.u8({ description: "Smoothed biome indices per tile." }),
  }),
  strategies: {
    default: Type.Object({
      radius: Type.Integer({ minimum: 1, maximum: 5, default: 1 }),
      iterations: Type.Integer({ minimum: 1, maximum: 4, default: 1 }),
    }),
    morphological: Type.Object({
      radius: Type.Integer({ minimum: 1, maximum: 5, default: 1 }),
      iterations: Type.Integer({ minimum: 1, maximum: 4, default: 1 }),
    }),
    gaussian: Type.Object({
      radius: Type.Integer({ minimum: 1, maximum: 5, default: 1 }),
      iterations: Type.Integer({ minimum: 1, maximum: 4, default: 1 }),
    }),
  },
});

export default RefineBiomeEdgesContract;
