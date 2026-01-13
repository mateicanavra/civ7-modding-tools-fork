import { defineArtifact } from "@swooper/mapgen-core/authoring";
import { Type } from "@swooper/mapgen-core/authoring";

export const RiverAdjacencyArtifactSchema = Type.Any();

export const hydrologyCoreArtifacts = {
  riverAdjacency: defineArtifact({
    name: "riverAdjacency",
    id: "artifact:riverAdjacency",
    schema: RiverAdjacencyArtifactSchema,
  }),
} as const;
