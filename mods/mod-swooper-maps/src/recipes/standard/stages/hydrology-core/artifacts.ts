import { TypedArraySchemas, Type, defineArtifact } from "@swooper/mapgen-core/authoring";

export const RiverAdjacencyArtifactSchema = TypedArraySchemas.u8({
  description: "Mask (1/0): tiles adjacent to projected rivers. Projection-only; does not define Hydrology truth.",
});

export const HydrologyHydrographyArtifactSchema = Type.Object(
  {
    runoff: TypedArraySchemas.f32({
      description: "Local runoff source proxy per tile (derived from precipitation/humidity).",
    }),
    discharge: TypedArraySchemas.f32({
      description: "Accumulated discharge proxy per tile (routing + runoff accumulation).",
    }),
    riverClass: TypedArraySchemas.u8({
      description: "River class per tile (0=none, 1=minor, 2=major).",
    }),
    sinkMask: TypedArraySchemas.u8({
      description: "Mask (1/0): land tiles that are routing sinks (candidate endorheic basins).",
    }),
    outletMask: TypedArraySchemas.u8({
      description: "Mask (1/0): land tiles that drain directly to ocean/edges (land→water/out-of-bounds).",
    }),
    basinId: Type.Optional(
      TypedArraySchemas.i32({ description: "Optional basin identifier per tile (or -1 when unassigned)." })
    ),
  },
  {
    additionalProperties: false,
    description:
      "Hydrology hydrography snapshot derived from Morphology routing + Hydrology discharge projection. Engine rivers/lakes may differ (projection-only).",
  }
);

export const hydrologyCoreArtifacts = {
  riverAdjacency: defineArtifact({
    name: "riverAdjacency",
    id: "artifact:riverAdjacency",
    schema: RiverAdjacencyArtifactSchema,
  }),
  hydrography: defineArtifact({
    name: "hydrography",
    id: "artifact:hydrology.hydrography",
    schema: HydrologyHydrographyArtifactSchema,
  }),
} as const;
