import { ctxRandom, type ExtendedMapContext } from "@swooper/mapgen-core";
import { getPublishedBiomeClassification } from "@mapgen/domain/artifacts.js";
import type { PlotEffectsInput } from "@mapgen/domain/ecology/ops/plot-effects/index.js";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";
import { assertHeightfield } from "../biomes/helpers/inputs.js";

export function buildPlotEffectsInput(context: ExtendedMapContext): PlotEffectsInput {
  const { width, height } = context.dimensions;
  const classification = getPublishedBiomeClassification(context);
  if (!classification) {
    throw new Error("PlotEffectsStep: Missing artifact:ecology.biomeClassification@v1.");
  }

  const heightfield = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield);
  assertHeightfield(heightfield, width * height);

  const rand = (label: string, max: number): number => ctxRandom(context, label, max);

  return {
    width,
    height,
    adapter: context.adapter,
    biomeIndex: classification.biomeIndex,
    vegetationDensity: classification.vegetationDensity,
    effectiveMoisture: classification.effectiveMoisture,
    surfaceTemperature: classification.surfaceTemperature,
    aridityIndex: classification.aridityIndex,
    freezeIndex: classification.freezeIndex,
    elevation: heightfield.elevation,
    rand,
  };
}
