import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

export const BoundingBoxSchema = Type.Object(
  {
    xl: Type.Number(),
    xr: Type.Number(),
    yt: Type.Number(),
    yb: Type.Number(),
  },
  { additionalProperties: false }
);

export type BoundingBox = Static<typeof BoundingBoxSchema>;

export const FoundationMeshSchema = Type.Object(
  {
    cellCount: Type.Integer({ minimum: 1, description: "Number of mesh cells." }),
    wrapWidth: Type.Number({ description: "Periodic wrap width in mesh-space units (hex space)." }),
    siteX: TypedArraySchemas.f32({ shape: null, description: "X coordinate per mesh cell (hex space)." }),
    siteY: TypedArraySchemas.f32({ shape: null, description: "Y coordinate per mesh cell (hex space)." }),
    neighborsOffsets: TypedArraySchemas.i32({
      shape: null,
      description: "CSR offsets into neighbors array (length = cellCount + 1).",
    }),
    neighbors: TypedArraySchemas.i32({ shape: null, description: "CSR neighbor indices." }),
    areas: TypedArraySchemas.f32({ shape: null, description: "Cell area per mesh cell (hex-space units)." }),
    bbox: BoundingBoxSchema,
  },
  { additionalProperties: false }
);

const ComputeMeshContract = defineOp({
  kind: "compute",
  id: "foundation/compute-mesh",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      rngSeed: Type.Integer({
        minimum: 0,
        maximum: 2_147_483_647,
        description: "Deterministic RNG seed (derived in the step; pure data).",
      }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object({ mesh: FoundationMeshSchema }, { additionalProperties: false }),
  strategies: {
    default: Type.Object(
      {
        plateCount: Type.Integer({ default: 8, minimum: 2 }),
        cellsPerPlate: Type.Integer({ default: 2, minimum: 1, maximum: 32 }),
        referenceArea: Type.Integer({ default: 4000, minimum: 1 }),
        plateScalePower: Type.Number({ default: 0.5, minimum: 0, maximum: 2 }),
        relaxationSteps: Type.Integer({ default: 2, minimum: 0, maximum: 50 }),
        cellCount: Type.Optional(
          Type.Integer({ minimum: 1, description: "Derived in normalization (do not author directly)." })
        ),
      },
      { additionalProperties: false }
    ),
  },
});

export default ComputeMeshContract;
export type ComputeMeshConfig = Static<(typeof ComputeMeshContract)["strategies"]["default"]>;
export type FoundationMesh = Static<typeof FoundationMeshSchema> & Readonly<{ bbox: BoundingBox }>;
