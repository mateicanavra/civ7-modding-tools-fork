import { defineArtifact } from "@swooper/mapgen-core/authoring";
import {
  FOUNDATION_CONFIG_ARTIFACT_TAG,
  FOUNDATION_DIAGNOSTICS_ARTIFACT_TAG,
  FOUNDATION_DYNAMICS_ARTIFACT_TAG,
  FOUNDATION_PLATES_ARTIFACT_TAG,
  FOUNDATION_SEED_ARTIFACT_TAG,
} from "@swooper/mapgen-core";
import { Type } from "typebox";

const FoundationArtifactSchema = Type.Any();

export const foundationArtifacts = {
  plates: defineArtifact({
    name: "foundationPlates",
    id: FOUNDATION_PLATES_ARTIFACT_TAG,
    schema: FoundationArtifactSchema,
  }),
  dynamics: defineArtifact({
    name: "foundationDynamics",
    id: FOUNDATION_DYNAMICS_ARTIFACT_TAG,
    schema: FoundationArtifactSchema,
  }),
  seed: defineArtifact({
    name: "foundationSeed",
    id: FOUNDATION_SEED_ARTIFACT_TAG,
    schema: FoundationArtifactSchema,
  }),
  diagnostics: defineArtifact({
    name: "foundationDiagnostics",
    id: FOUNDATION_DIAGNOSTICS_ARTIFACT_TAG,
    schema: FoundationArtifactSchema,
  }),
  config: defineArtifact({
    name: "foundationConfig",
    id: FOUNDATION_CONFIG_ARTIFACT_TAG,
    schema: FoundationArtifactSchema,
  }),
} as const;
