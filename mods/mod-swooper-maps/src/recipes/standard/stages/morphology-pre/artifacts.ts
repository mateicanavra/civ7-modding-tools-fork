import { TypedArraySchemas, Type, defineArtifact } from "@swooper/mapgen-core/authoring";

const MorphologyTopographyArtifactSchema = Type.Object(
  {
    elevation: TypedArraySchemas.i16({
      description:
        "Signed heightfield elevation per tile. Publish-once buffer handle; steps may mutate in-place via ctx.buffers.heightfield.",
    }),
    terrain: TypedArraySchemas.u8({
      description:
        "Engine terrain id per tile. Publish-once buffer handle; steps may mutate in-place via ctx.buffers.heightfield.",
    }),
    landMask: TypedArraySchemas.u8({
      description:
        "Land/water mask per tile (1=land, 0=water). Publish-once buffer handle; steps may mutate in-place via ctx.buffers.heightfield.",
    }),
  },
  { additionalProperties: false, description: "Canonical morphology topography buffer handle (publish once)." }
);

const MorphologyRoutingArtifactSchema = Type.Object(
  {
    flowDir: TypedArraySchemas.i32({
      description: "Steepest-descent receiver index per tile (or -1 for sinks/edges).",
    }),
    flowAccum: TypedArraySchemas.f32({ description: "Drainage area proxy per tile." }),
    basinId: Type.Optional(
      TypedArraySchemas.i32({ description: "Optional basin identifier per tile (or -1 when unassigned)." })
    ),
  },
  { additionalProperties: false, description: "Morphology routing buffer handle (publish once)." }
);

const MorphologySubstrateArtifactSchema = Type.Object(
  {
    erodibilityK: TypedArraySchemas.f32({
      description: "Erodibility / resistance proxy per tile (higher = easier incision).",
    }),
    sedimentDepth: TypedArraySchemas.f32({
      description: "Loose sediment thickness proxy per tile (higher = deeper deposits).",
    }),
  },
  { additionalProperties: false, description: "Morphology substrate buffer handle (publish once)." }
);

const MorphologyCoastlineMetricsArtifactSchema = Type.Object(
  {
    coastalLand: TypedArraySchemas.u8({ description: "Mask (1/0): land tiles adjacent to water." }),
    coastalWater: TypedArraySchemas.u8({ description: "Mask (1/0): water tiles adjacent to land." }),
  },
  { additionalProperties: false, description: "Derived coastline metrics snapshot (immutable)." }
);

const MorphologyLandmassArtifactSchema = Type.Object(
  {
    id: Type.Integer({ minimum: 0, description: "Stable index within this snapshot (0..n-1)." }),
    tileCount: Type.Integer({ minimum: 0, description: "Number of land tiles in this landmass." }),
    bbox: Type.Object(
      {
        west: Type.Integer({ minimum: 0, description: "West bound (inclusive) in tile x-coordinates." }),
        east: Type.Integer({ minimum: 0, description: "East bound (inclusive) in tile x-coordinates." }),
        south: Type.Integer({ minimum: 0, description: "South bound (inclusive) in tile y-coordinates." }),
        north: Type.Integer({ minimum: 0, description: "North bound (inclusive) in tile y-coordinates." }),
      },
      {
        additionalProperties: false,
        description:
          "Axis-aligned bounds in tile coordinates. Note: west/east may wrap if a landmass crosses the map seam.",
      }
    ),
  },
  { additionalProperties: false, description: "One connected land component derived from the landMask." }
);

const MorphologyLandmassesArtifactSchema = Type.Object(
  {
    landmasses: Type.Immutable(Type.Array(MorphologyLandmassArtifactSchema)),
  },
  { additionalProperties: false, description: "Landmass decomposition snapshot (immutable)." }
);

export const morphologyArtifacts = {
  topography: defineArtifact({
    name: "topography",
    id: "artifact:morphology.topography",
    schema: MorphologyTopographyArtifactSchema,
  }),
  routing: defineArtifact({
    name: "routing",
    id: "artifact:morphology.routing",
    schema: MorphologyRoutingArtifactSchema,
  }),
  substrate: defineArtifact({
    name: "substrate",
    id: "artifact:morphology.substrate",
    schema: MorphologySubstrateArtifactSchema,
  }),
  coastlineMetrics: defineArtifact({
    name: "coastlineMetrics",
    id: "artifact:morphology.coastlineMetrics",
    schema: MorphologyCoastlineMetricsArtifactSchema,
  }),
  landmasses: defineArtifact({
    name: "landmasses",
    id: "artifact:morphology.landmasses",
    schema: MorphologyLandmassesArtifactSchema,
  }),
} as const;

