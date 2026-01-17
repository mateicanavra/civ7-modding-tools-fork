import { defineArtifact, Type, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
import { HydrologyWindFieldSchema } from "@mapgen/domain/hydrology";

/**
 * Heightfield handle published for downstream dependency gating and typed access.
 *
 * This artifact is a *buffer handle*: it points at the canonical, mutable heightfield working layers used upstream
 * and read by Hydrology. The schema is intentionally permissive here because the authoritative typing lives at the
 * domain boundary (steps/ops consume typed arrays directly).
 */
export const HeightfieldArtifactSchema = Type.Object(
  {
    /** Elevation working layer (typed array/buffer; units: meters). */
    elevation: Type.Any({ description: "Elevation working layer (buffer handle; units: meters)." }),
    /** Terrain classification working layer (typed array/buffer; projection-only). */
    terrain: Type.Any({ description: "Terrain classification working layer (buffer handle; projection-only)." }),
    /** Land mask working layer (typed array/buffer; 1=land, 0=water). */
    landMask: Type.Any({ description: "Land mask working layer (buffer handle; 1=land, 0=water)." }),
  },
  {
    additionalProperties: false,
    description:
      "Heightfield artifact (buffer handle): elevation/terrain/landMask used by Hydrology and downstream domains.",
  }
);

/**
 * Climate field produced by Hydrology climate-baseline.
 *
 * This artifact is a *buffer handle* routed through artifacts for gating/typing: it may be refined later in-place.
 */
export const ClimateFieldArtifactSchema = Type.Object(
  {
    /** Rainfall field (0..200) per tile; consumers should not invent their own rainfall proxies. */
    rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
    /** Humidity field (0..255) per tile; used by hydrology budget and downstream ecology heuristics. */
    humidity: TypedArraySchemas.u8({ description: "Humidity (0..255) per tile." }),
  },
  {
    additionalProperties: false,
    description:
      "Hydrology climate field (buffer handle): rainfall/humidity outputs for Ecology/Narrative/Placement consumption.",
  }
);

export const hydrologyClimateBaselineArtifacts = {
  heightfield: defineArtifact({
    name: "heightfield",
    id: "artifact:heightfield",
    schema: HeightfieldArtifactSchema,
  }),
  climateField: defineArtifact({
    name: "climateField",
    id: "artifact:climateField",
    schema: ClimateFieldArtifactSchema,
  }),
  windField: defineArtifact({
    name: "windField",
    id: "artifact:windField",
    schema: HydrologyWindFieldSchema,
  }),
} as const;
