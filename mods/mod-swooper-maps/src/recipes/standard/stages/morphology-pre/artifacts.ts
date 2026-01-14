import { Type, TypedArraySchemas, defineArtifact, type Static } from "@swooper/mapgen-core/authoring";

const MorphologyTopographyArtifactSchema = Type.Object(
  {
    elevation: TypedArraySchemas.i16({ description: "Heightfield elevation buffer (mutable)." }),
    terrain: TypedArraySchemas.u8({ description: "Terrain type buffer (mutable)." }),
    landMask: TypedArraySchemas.u8({ description: "Land/water mask buffer (1=land, 0=water)." }),
  },
  {
    additionalProperties: false,
    description: "Mutable topography buffers published after landmass shaping.",
  }
);

const MorphologyRoutingArtifactSchema = Type.Any({
  description: "Routing buffer handle (flow routing/accumulation); populated in Morphology ops.",
});

const MorphologySubstrateArtifactSchema = Type.Any({
  description: "Substrate buffer handle (geomorphic substrate layers); populated in Morphology ops.",
});

const CoastlineMetricsArtifactSchema = Type.Object(
  {
    landTiles: Type.Integer({ minimum: 0, description: "Total land tiles after coastline shaping." }),
    waterTiles: Type.Integer({ minimum: 0, description: "Total water tiles after coastline shaping." }),
    coastlineTiles: Type.Integer({
      minimum: 0,
      description: "Land tiles adjacent to water (hex adjacency).",
    }),
  },
  {
    additionalProperties: false,
    description: "Derived coastline metrics from the mutable heightfield.",
  }
);

const LandmassSummarySchema = Type.Object(
  {
    id: Type.Integer({ minimum: 1, description: "Stable landmass id (1..n)." }),
    tiles: Type.Integer({ minimum: 1, description: "Land tiles contained in the landmass." }),
  },
  { additionalProperties: false }
);

const LandmassesArtifactSchema = Type.Object(
  {
    tileToLandmass: TypedArraySchemas.i32({
      description: "Landmass id per tile (0=water, 1..n=landmass).",
    }),
    landmasses: Type.Array(LandmassSummarySchema, {
      description: "Summaries sorted by landmass id.",
    }),
    landTiles: Type.Integer({ minimum: 0, description: "Total land tile count." }),
  },
  {
    additionalProperties: false,
    description: "Connected-component landmass decomposition derived from landMask.",
  }
);

export type MorphologyLandmassesArtifact = Static<typeof LandmassesArtifactSchema>;

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
    schema: CoastlineMetricsArtifactSchema,
  }),
  landmasses: defineArtifact({
    name: "landmasses",
    id: "artifact:morphology.landmasses",
    schema: LandmassesArtifactSchema,
  }),
} as const;
