import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { Static } from "@swooper/mapgen-core/authoring";
import { getPublishedBiomeClassification, heightfieldArtifact } from "../../../../artifacts.js";
import ecology from "@mapgen/domain/ecology";
import { deriveStepSeed } from "../helpers/seed.js";

type PlotEffectsInput = Static<typeof ecology.ops.planPlotEffects.input>;

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
