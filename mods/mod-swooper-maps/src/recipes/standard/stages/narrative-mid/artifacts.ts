import { defineArtifact } from "@swooper/mapgen-core/authoring";
import { Type } from "typebox";

const NarrativeMotifsSchema = Type.Any();

export const narrativeMidArtifacts = {
  motifsOrogeny: defineArtifact({
    name: "motifsOrogeny",
    id: "artifact:narrative.motifs.orogeny",
    schema: NarrativeMotifsSchema,
  }),
} as const;
