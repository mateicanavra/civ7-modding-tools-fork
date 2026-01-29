import { TypedArraySchemas, Type, defineArtifact } from "@swooper/mapgen-core/authoring";

/**
 * Snapshot of Hydrology hydrography derived from Morphology topography + Hydrology discharge projection.
 *
 * This is the canonical read path for “river-ness” and discharge-like signals inside the pipeline.
 * Engine rivers/lakes may differ (engine projection), and must not be treated as Hydrology internal truth.
 */
export const HydrologyHydrographyArtifactSchema = Type.Object(
  {
    /** Local runoff source proxy per tile (derived from precipitation/humidity inputs). */
    runoff: TypedArraySchemas.f32({
      description: "Local runoff source proxy per tile (derived from precipitation/humidity).",
    }),
    /** Accumulated discharge proxy per tile (routing + runoff accumulation). */
    discharge: TypedArraySchemas.f32({
      description: "Accumulated discharge proxy per tile (routing + runoff accumulation).",
    }),
    /** Optional local slope proxy on the routing surface (0..1). */
    slope01: Type.Optional(
      TypedArraySchemas.f32({
        description: "Optional slope proxy per tile (0..1) on the routing surface.",
      })
    ),
    /** Optional valley confinement proxy (0..1; higher = more confined). */
    confinement01: Type.Optional(
      TypedArraySchemas.f32({
        description: "Optional valley confinement proxy per tile (0..1; higher = more confined).",
      })
    ),
    /** Optional channel width proxy in tiles (continuous). */
    channelWidthTiles: Type.Optional(
      TypedArraySchemas.f32({
        description: "Optional channel width proxy in tiles (continuous).",
      })
    ),
    /** Discrete river class derived from discharge thresholds (0=none, 1=minor, 2=major). */
    riverClass: TypedArraySchemas.u8({
      description: "River class per tile (0=none, 1=minor, 2=major).",
    }),
    /** Routing sinks: candidate endorheic basins / internal drainage endpoints. */
    sinkMask: TypedArraySchemas.u8({
      description: "Mask (1/0): land tiles that are routing sinks (candidate endorheic basins).",
    }),
    /** Routing outlets: land tiles that drain to ocean/edges (land→water/out-of-bounds). */
    outletMask: TypedArraySchemas.u8({
      description: "Mask (1/0): land tiles that drain directly to ocean/edges (land→water/out-of-bounds).",
    }),
    /** Optional basin identifier per tile (or -1 when unassigned). */
    basinId: Type.Optional(
      TypedArraySchemas.i32({ description: "Optional basin identifier per tile (or -1 when unassigned)." })
    ),
  },
  {
    additionalProperties: false,
    description:
      "Hydrology hydrography snapshot derived from Morphology topography + Hydrology discharge projection. Engine rivers/lakes may differ (projection-only).",
  }
);

export const hydrologyHydrographyArtifacts = {
  hydrography: defineArtifact({
    name: "hydrography",
    id: "artifact:hydrology.hydrography",
    schema: HydrologyHydrographyArtifactSchema,
  }),
} as const;
