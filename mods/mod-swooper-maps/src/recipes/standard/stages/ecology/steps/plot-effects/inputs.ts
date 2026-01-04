import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { getPublishedBiomeClassification } from "../../../../artifacts.js";
import type * as ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";
import { assertHeightfield } from "../biomes/helpers/inputs.js";
import { deriveStepSeed } from "../helpers/seed.js";

type PlotEffectsInput = Parameters<typeof ecology.ops.planPlotEffects.run>[0];

export function buildPlotEffectsInput(context: ExtendedMapContext): PlotEffectsInput {
  const { width, height } = context.dimensions;
  const classification = getPublishedBiomeClassification(context);
  if (!classification) {
    throw new Error("PlotEffectsStep: Missing artifact:ecology.biomeClassification@v1.");
  }

  const heightfield = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield);
  assertHeightfield(heightfield, width * height);

  return {
    width,
    height,
    seed: deriveStepSeed(context.settings.seed, "ecology:planPlotEffects"),
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
