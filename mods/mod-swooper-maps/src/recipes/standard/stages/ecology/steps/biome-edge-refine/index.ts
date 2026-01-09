import { createStep } from "@mapgen/authoring/steps";
import type { HeightfieldBuffer } from "@swooper/mapgen-core";
import type { Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { isBiomeClassificationArtifactV1 } from "../../../../artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";
import { BiomeEdgeRefineStepContract } from "./contract.js";

type BiomeEdgeRefineConfig = Static<typeof BiomeEdgeRefineStepContract.schema>;

const isHeightfield = (value: unknown, size: number): value is HeightfieldBuffer => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HeightfieldBuffer>;
  return candidate.landMask instanceof Uint8Array && candidate.landMask.length === size;
};

export default createStep(BiomeEdgeRefineStepContract, {
  normalize: (config, ctx) => ({
    refine: ecology.ops.refineBiomeEdges.normalize(config.refine, ctx),
  }),
  run: (context, config: BiomeEdgeRefineConfig) => {
    const classification = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1);
    if (!isBiomeClassificationArtifactV1(classification)) {
      throw new Error("BiomeEdgeRefineStep: Missing biome classification artifact.");
    }

    const { width, height } = context.dimensions;
    const heightfieldArtifact = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield);
    if (!isHeightfield(heightfieldArtifact, width * height)) {
      throw new Error("BiomeEdgeRefineStep: Missing heightfield for land mask.");
    }
    const heightfield = heightfieldArtifact as HeightfieldBuffer;

    const refined = ecology.ops.refineBiomeEdges.runValidated(
      {
        width,
        height,
        biomeIndex: classification.biomeIndex,
        landMask: heightfield.landMask,
      },
      config.refine
    );

    context.artifacts.set(M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1, {
      ...classification,
      biomeIndex: refined.biomeIndex,
    });
  },
});
