import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const LandmassBoundsSchema = Type.Object(
  {
    west: Type.Integer({ minimum: 0, description: "West bound (inclusive) in tile x-coordinates." }),
    east: Type.Integer({ minimum: 0, description: "East bound (inclusive) in tile x-coordinates." }),
    south: Type.Integer({ minimum: 0, description: "South bound (inclusive) in tile y-coordinates." }),
    north: Type.Integer({ minimum: 0, description: "North bound (inclusive) in tile y-coordinates." }),
  },
  {
    description:
      "Axis-aligned bounds in tile coordinates. West/east may wrap when a landmass crosses the map seam.",
  }
);

/**
 * Decomposes the final land mask into connected landmasses.
 */
const ComputeLandmassesContract = defineOp({
  kind: "compute",
  id: "morphology/compute-landmasses",
  input: Type.Object({
    width: Type.Integer({ minimum: 1, description: "Map width in tiles." }),
    height: Type.Integer({ minimum: 1, description: "Map height in tiles." }),
    landMask: TypedArraySchemas.u8({
      description: "Land mask per tile (1=land, 0=water).",
    }),
  }),
  output: Type.Object({
    landmasses: Type.Array(
      Type.Object({
        id: Type.Integer({ minimum: 0, description: "Stable index within this snapshot (0..n-1)." }),
        tileCount: Type.Integer({ minimum: 0, description: "Number of land tiles in this landmass." }),
        coastlineLength: Type.Integer({
          minimum: 0,
          description: "Count of land↔water adjacency edges along the coastline (canonical hex neighbor graph).",
        }),
        bbox: LandmassBoundsSchema,
      })
    ),
    landmassIdByTile: TypedArraySchemas.i32({
      description: "Per-tile landmass id (-1 for water). Values map to landmasses[].",
    }),
  }),
  strategies: {
    default: Type.Object(
      {},
      {
        description: "No strategy-specific tuning for landmass decomposition.",
      }
    ),
  },
});

export default ComputeLandmassesContract;
