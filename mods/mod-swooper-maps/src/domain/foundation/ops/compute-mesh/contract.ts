import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

import type { BoundingBox, RngFunction } from "../../types.js";

export const BoundingBoxSchema = Type.Object(
  {
    xl: Type.Number(),
    xr: Type.Number(),
    yt: Type.Number(),
    yb: Type.Number(),
  },
  { additionalProperties: false }
);

export const FoundationMeshSchema = Type.Object(
  {
    cellCount: Type.Integer({ minimum: 1, description: "Number of mesh cells." }),
    siteX: TypedArraySchemas.f32({ shape: null, description: "X coordinate per mesh cell." }),
    siteY: TypedArraySchemas.f32({ shape: null, description: "Y coordinate per mesh cell." }),
    neighborsOffsets: TypedArraySchemas.i32({
      shape: null,
      description: "CSR offsets into neighbors array (length = cellCount + 1).",
    }),
    neighbors: TypedArraySchemas.i32({ shape: null, description: "CSR neighbor indices." }),
    areas: TypedArraySchemas.f32({ shape: null, description: "Cell area per mesh cell (units: bbox space)." }),
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
      rng: Type.Unsafe<RngFunction>({ description: "Deterministic RNG wrapper (typically ctxRandom)." }),
      trace: Type.Optional(Type.Any()),
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
        cellCount: Type.Optional(Type.Integer({ minimum: 1 })),
      },
      { additionalProperties: false }
    ),
  },
});

export default ComputeMeshContract;
export type ComputeMeshConfig = Static<(typeof ComputeMeshContract)["strategies"]["default"]>;
export type FoundationMesh = Static<typeof FoundationMeshSchema> & Readonly<{ bbox: BoundingBox }>;
