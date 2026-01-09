import { createStep } from "@mapgen/authoring/steps";
import type { HeightfieldBuffer } from "@swooper/mapgen-core";
import type { Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import {
  isBiomeClassificationArtifactV1,
  isPedologyArtifactV1,
} from "../../../../artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";
import { FeaturesPlanStepContract } from "./contract.js";

type FeaturesPlanConfig = Static<typeof FeaturesPlanStepContract.schema>;

const isHeightfield = (value: unknown, size: number): value is HeightfieldBuffer => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HeightfieldBuffer>;
  return (
    candidate.landMask instanceof Uint8Array &&
    candidate.elevation instanceof Int16Array &&
    candidate.landMask.length === size &&
    candidate.elevation.length === size
  );
};

export default createStep(FeaturesPlanStepContract, {
  normalize: (config, ctx) => ({
    vegetation: ecology.ops.planVegetation.normalize(config.vegetation, ctx),
    wetlands: ecology.ops.planWetlands.normalize(config.wetlands, ctx),
    reefs: ecology.ops.planReefs.normalize(config.reefs, ctx),
    ice: ecology.ops.planIce.normalize(config.ice, ctx),
  }),
  run: (context, config: FeaturesPlanConfig) => {
    const classificationArtifact = context.artifacts.get(
      M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1
    );
    if (!isBiomeClassificationArtifactV1(classificationArtifact)) {
      throw new Error("FeaturesPlanStep: Missing biome classification artifact.");
    }
    const classification = classificationArtifact;

    const pedologyArtifact = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.pedologyV1);
    if (!isPedologyArtifactV1(pedologyArtifact)) {
      throw new Error("FeaturesPlanStep: Missing pedology artifact.");
    }
    const pedology = pedologyArtifact;

    const heightfieldArtifact = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield);
    const size = context.dimensions.width * context.dimensions.height;
    if (!isHeightfield(heightfieldArtifact, size)) {
      throw new Error("FeaturesPlanStep: Missing heightfield artifact.");
    }
    const heightfield = heightfieldArtifact as HeightfieldBuffer;

    const { width, height } = context.dimensions;
    const vegetationPlan = ecology.ops.planVegetation.runValidated(
      {
        width,
        height,
        biomeIndex: classification.biomeIndex,
        vegetationDensity: classification.vegetationDensity,
        effectiveMoisture: classification.effectiveMoisture,
        surfaceTemperature: classification.surfaceTemperature,
        fertility: pedology.fertility,
        landMask: heightfield.landMask,
      },
      config.vegetation
    );

    const wetlandsPlan = ecology.ops.planWetlands.runValidated(
      {
        width,
        height,
        landMask: heightfield.landMask,
        effectiveMoisture: classification.effectiveMoisture,
        surfaceTemperature: classification.surfaceTemperature,
        fertility: pedology.fertility,
        elevation: heightfield.elevation,
      },
      config.wetlands
    );

    const reefsPlan = ecology.ops.planReefs.runValidated(
      {
        width,
        height,
        landMask: heightfield.landMask,
        surfaceTemperature: classification.surfaceTemperature,
      },
      config.reefs
    );

    const icePlan = ecology.ops.planIce.runValidated(
      {
        width,
        height,
        landMask: heightfield.landMask,
        surfaceTemperature: classification.surfaceTemperature,
        elevation: heightfield.elevation,
      },
      config.ice
    );

    context.artifacts.set(M3_DEPENDENCY_TAGS.artifact.featureIntentsV1, {
      vegetation: vegetationPlan.placements,
      wetlands: wetlandsPlan.placements,
      reefs: reefsPlan.placements,
      ice: icePlan.placements,
    });
  },
});
