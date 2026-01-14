import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

import { FoundationConfigSchema } from "@mapgen/domain/config";

import type { BoundingBox, RngFunction, VoronoiUtilsInterface } from "../../types.js";

const StrategySchema = Type.Partial(FoundationConfigSchema);

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
    wrapX: Type.Boolean({ description: "Whether the map wraps in X (cylindrical)." }),
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
      wrapX: Type.Boolean(),
      rng: Type.Unsafe<RngFunction>({ description: "Deterministic RNG wrapper (typically ctxRandom)." }),
      voronoiUtils: Type.Unsafe<VoronoiUtilsInterface>({
        description: "Adapter-provided Voronoi utilities (typically adapter.getVoronoiUtils()).",
      }),
      trace: Type.Optional(Type.Any()),
    },
    { additionalProperties: false }
  ),
  output: Type.Object({ mesh: FoundationMeshSchema }, { additionalProperties: false }),
  strategies: {
    default: StrategySchema,
  },
});

export default ComputeMeshContract;
export type ComputeMeshConfig = Static<typeof StrategySchema>;
export type FoundationMesh = Static<typeof FoundationMeshSchema> & Readonly<{ bbox: BoundingBox }>;
