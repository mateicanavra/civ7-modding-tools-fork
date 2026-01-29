import { TypedArraySchemas, Type, defineArtifact } from "@swooper/mapgen-core/authoring";

const MorphologyTopographyArtifactSchema = Type.Object(
  {
    elevation: TypedArraySchemas.i16({
      description:
        "Signed elevation per tile (integer meters). Publish-once buffer handle; steps may mutate in-place via ctx.buffers.heightfield.",
    }),
    seaLevel: Type.Number({
      description:
        "Global sea level threshold in the same datum/units as elevation (meters; may be fractional).",
    }),
    landMask: TypedArraySchemas.u8({
      description:
        "Land/water mask per tile (1=land, 0=water). Must be consistent with elevation > seaLevel.",
    }),
    bathymetry: TypedArraySchemas.i16({
      description:
        "Derived bathymetry per tile (integer meters): 0 on land; <=0 in water; consistent with elevation/seaLevel.",
    }),
  },
  {
    additionalProperties: false,
    description: "Canonical Morphology topography truth (Phase 2 schema; publish-once handle).",
  }
);

const MorphologyRoutingArtifactSchema = Type.Object(
  {
    flowDir: TypedArraySchemas.i32({
      description: "Steepest-descent receiver index per tile (or -1 for sinks/edges).",
    }),
    flowAccum: TypedArraySchemas.f32({ description: "Drainage area proxy per tile." }),
    routingElevation: Type.Optional(
      TypedArraySchemas.f32({
        description:
          "Optional hydrologically-conditioned routing surface (Float32), used for slope/stream-power when flowDir may climb raw Int16 elevation due to depression filling.",
      })
    ),
    basinId: Type.Optional(
      TypedArraySchemas.i32({ description: "Optional basin identifier per tile (or -1 when unassigned)." })
    ),
  },
  { description: "Morphology routing buffer handle (publish once)." }
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
  { description: "Morphology substrate buffer handle (publish once)." }
);

const MorphologyCoastlineMetricsArtifactSchema = Type.Object(
  {
    coastalLand: TypedArraySchemas.u8({ description: "Mask (1/0): land tiles adjacent to water." }),
    coastalWater: TypedArraySchemas.u8({ description: "Mask (1/0): water tiles adjacent to land." }),
    distanceToCoast: TypedArraySchemas.u16({
      description:
        "Minimum tile-graph distance to any coastline tile (0=coast), using wrapX=true and wrapY=false.",
    }),
  },
  {
    additionalProperties: false,
    description: "Derived coastline metrics snapshot (Phase 2 schema; immutable at F2).",
  }
);

const MorphologyLandmassArtifactSchema = Type.Object(
  {
    id: Type.Integer({ minimum: 0, description: "Stable index within this snapshot (0..n-1)." }),
    tileCount: Type.Integer({ minimum: 0, description: "Number of land tiles in this landmass." }),
    coastlineLength: Type.Integer({
      minimum: 0,
      description:
        "Count of land↔water adjacency edges along the coastline (canonical hex neighbor graph; wrapX=true).",
    }),
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
  {
    additionalProperties: false,
    description: "One connected land component derived from the landMask (Phase 2 schema).",
  }
);

const MorphologyLandmassesArtifactSchema = Type.Object(
  {
    landmasses: Type.Immutable(Type.Array(MorphologyLandmassArtifactSchema)),
    landmassIdByTile: TypedArraySchemas.i32({
      description:
        "Per-tile landmass component id (-1 for water). Values map to the landmasses[] entries.",
    }),
  },
  {
    additionalProperties: false,
    description: "Landmass decomposition snapshot (Phase 2 schema; immutable at F2).",
  }
);

const VolcanoKindSchema = Type.Union([
  Type.Literal("subductionArc"),
  Type.Literal("rift"),
  Type.Literal("hotspot"),
]);

const MorphologyVolcanoesArtifactSchema = Type.Object(
  {
    volcanoMask: TypedArraySchemas.u8({ description: "Mask (1/0): tiles containing a volcano vent." }),
    volcanoes: Type.Immutable(
      Type.Array(
      Type.Object(
        {
          tileIndex: Type.Integer({ minimum: 0, description: "Tile index in row-major order." }),
          kind: VolcanoKindSchema,
          strength01: Type.Number({
            minimum: 0,
            maximum: 1,
            description: "Normalized intensity (0..1) derived from volcanism driver strength.",
          }),
        },
        { additionalProperties: false }
      )
    ),
    ),
  },
  {
    additionalProperties: false,
    description: "Volcano intent snapshot (Phase 2 schema; immutable at F2).",
  }
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
  volcanoes: defineArtifact({
    name: "volcanoes",
    id: "artifact:morphology.volcanoes",
    schema: MorphologyVolcanoesArtifactSchema,
  }),
} as const;
