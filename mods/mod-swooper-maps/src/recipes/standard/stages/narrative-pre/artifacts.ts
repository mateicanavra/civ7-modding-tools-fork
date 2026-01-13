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

const NarrativeMotifsSchema = Type.Any();
const NarrativeCorridorsSchema = Type.Any();

export const narrativePreArtifacts = {
  overlays: defineArtifact({
    name: "overlays",
    id: "artifact:storyOverlays",
    schema: StoryOverlaysArtifactSchema,
  }),
  motifsMargins: defineArtifact({
    name: "motifsMargins",
    id: "artifact:narrative.motifs.margins",
    schema: NarrativeMotifsSchema,
  }),
  motifsHotspots: defineArtifact({
    name: "motifsHotspots",
    id: "artifact:narrative.motifs.hotspots",
    schema: NarrativeMotifsSchema,
  }),
  motifsRifts: defineArtifact({
    name: "motifsRifts",
    id: "artifact:narrative.motifs.rifts",
    schema: NarrativeMotifsSchema,
  }),
  corridors: defineArtifact({
    name: "corridors",
    id: "artifact:narrative.corridors",
    schema: NarrativeCorridorsSchema,
  }),
} as const;
