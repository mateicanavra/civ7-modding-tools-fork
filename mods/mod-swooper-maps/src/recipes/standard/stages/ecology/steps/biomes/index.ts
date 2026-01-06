import { logBiomeSummary, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import {
  getPublishedClimateField,
  getPublishedNarrativeCorridors,
  getPublishedNarrativeMotifsRifts,
  publishBiomeClassificationArtifact,
} from "../../../../artifacts.js";
import * as ecology from "@mapgen/domain/ecology";
import { BiomesStepContract } from "./contract.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";
import {
  assertHeightfield,
  buildLatitudeField,
  combineCorridorMasks,
  maskFromCoordSet,
} from "./helpers/inputs.js";
import { clampToByte } from "./helpers/apply.js";
import { resolveEngineBiomeIds } from "./helpers/engine-bindings.js";

type BiomesStepConfig = Static<typeof BiomesStepContract.schema>;

export default createStep(BiomesStepContract, {
  run: (context: ExtendedMapContext, config: BiomesStepConfig) => {
    const { width, height } = context.dimensions;
    const size = width * height;

    const climateField = getPublishedClimateField(context);
    if (!climateField) {
      throw new Error("BiomesStep: Missing artifact:climateField.");
    }

    const heightfieldArtifact = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield);
    assertHeightfield(heightfieldArtifact, size);
    const { landMask, elevation } = heightfieldArtifact;

    const biomeField = context.fields.biomeId;
    const temperatureField = context.fields.temperature;
    if (!biomeField || !temperatureField) {
      throw new Error("BiomesStep: Missing biomeId or temperature field buffers.");
    }

    const latitude = buildLatitudeField(context.adapter, width, height);
    const corridors = getPublishedNarrativeCorridors(context);
    if (!corridors) {
      throw new Error("BiomesStep: Missing artifact:narrative.corridors@v1.");
    }
    const rifts = getPublishedNarrativeMotifsRifts(context);
    if (!rifts) {
      throw new Error("BiomesStep: Missing artifact:narrative.motifs.rifts@v1.");
    }

    const corridorMask = maskFromCoordSet(corridors?.landCorridors, width, height);
    const riverCorridorMask = maskFromCoordSet(corridors?.riverCorridors, width, height);
    combineCorridorMasks(corridorMask, riverCorridorMask);

    const riftShoulderMask = maskFromCoordSet(rifts?.riftShoulder, width, height);

    const result = ecology.ops.classifyBiomes.runValidated(
      {
        width,
        height,
        rainfall: climateField.rainfall,
        humidity: climateField.humidity,
        elevation,
        latitude,
        landMask,
        corridorMask,
        riftShoulderMask,
      },
      config.classify
    );

    const { land: engineBindings, marine: marineBiome } = resolveEngineBiomeIds(
      context.adapter,
      config.bindings
    );
    publishBiomeClassificationArtifact(context, {
      width,
      height,
      ...result,
    });

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x;
        if (landMask[idx] === 0) {
          context.adapter.setBiomeType(x, y, marineBiome);
          biomeField[idx] = marineBiome;
          temperatureField[idx] = clampToByte(result.surfaceTemperature[idx]! + 50);
          continue;
        }
        const biomeIdx = result.biomeIndex[idx]!;
        if (biomeIdx === 255) continue;
        const symbol = ecology.biomeSymbolFromIndex(biomeIdx);
        const engineId = engineBindings[symbol];
        context.adapter.setBiomeType(x, y, engineId);
        biomeField[idx] = engineId;
        temperatureField[idx] = clampToByte(result.surfaceTemperature[idx]! + 50);
      }
    }

    logBiomeSummary(context.trace, context.adapter, width, height);
  },
});
