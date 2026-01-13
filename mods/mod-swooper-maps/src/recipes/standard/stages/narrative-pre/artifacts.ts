import { defineArtifact } from "@swooper/mapgen-core/authoring";
import { Type } from "typebox";

export const StoryOverlaysArtifactSchema = Type.Object(
  {
    corridors: Type.Array(Type.Any()),
    swatches: Type.Array(Type.Any()),
    motifs: Type.Array(Type.Any()),
  },
  { additionalProperties: true }
);

export const narrativePreArtifacts = {
  overlays: defineArtifact({
    name: "overlays",
    id: "artifact:storyOverlays",
    schema: StoryOverlaysArtifactSchema,
  }),
} as const;
