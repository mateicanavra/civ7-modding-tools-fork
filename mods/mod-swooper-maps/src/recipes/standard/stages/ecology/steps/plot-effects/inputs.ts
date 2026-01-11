import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { getPublishedBiomeClassification, heightfieldArtifact } from "../../../../artifacts.js";
import type * as ecology from "@mapgen/domain/ecology";
import { deriveStepSeed } from "../helpers/seed.js";

type PlotEffectsInput = Parameters<typeof ecology.ops.planPlotEffects.run>[0];

export function buildPlotEffectsInput(context: ExtendedMapContext): PlotEffectsInput {
  const { width, height } = context.dimensions;
  const classification = getPublishedBiomeClassification(context);
  const heightfield = heightfieldArtifact.get(context);

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
