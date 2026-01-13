import type { ExtendedMapContext, HeightfieldBuffer } from "@swooper/mapgen-core";
import type { Static } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";
import { deriveStepSeed } from "../helpers/seed.js";
import type { BiomeClassificationArtifact } from "../../artifacts.js";

type PlotEffectsInput = Static<typeof ecology.ops.planPlotEffects.input>;

/**
 * Builds the input payload for plot effects planning from published artifacts.
 */
export function buildPlotEffectsInput(
  context: ExtendedMapContext,
  artifacts: {
    classification: BiomeClassificationArtifact;
    heightfield: HeightfieldBuffer;
  }
): PlotEffectsInput {
  const { width, height } = context.dimensions;
  const { classification, heightfield } = artifacts;

  return {
    width,
    height,
    seed: deriveStepSeed(context.env.seed, "ecology:planPlotEffects"),
    biomeIndex: classification.biomeIndex,
    vegetationDensity: classification.vegetationDensity,
    effectiveMoisture: classification.effectiveMoisture,
    surfaceTemperature: classification.surfaceTemperature,
    aridityIndex: classification.aridityIndex,
    freezeIndex: classification.freezeIndex,
    elevation: heightfield.elevation,
    landMask: heightfield.landMask,
  };
}
