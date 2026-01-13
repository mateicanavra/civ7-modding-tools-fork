import { logBiomeSummary } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import BiomesStepContract from "./contract.js";
import {
  buildLatitudeField,
  combineCorridorMasks,
  maskFromCoordSet,
} from "./helpers/inputs.js";
import { clampToByte } from "./helpers/apply.js";
import { resolveEngineBiomeIds } from "./helpers/engine-bindings.js";
import { ecologyArtifacts } from "../../artifacts.js";
import { validateBiomeClassificationArtifact } from "../../artifact-validation.js";

export default createStep(BiomesStepContract, {
  artifacts: implementArtifacts([ecologyArtifacts.biomeClassification], {
    biomeClassification: {
      validate: (value, context) => validateBiomeClassificationArtifact(value, context.dimensions),
    },
  }),
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;

    const climateField = deps.artifacts.climateField.read(context);
    const heightfield = deps.artifacts.heightfield.read(context);
    const { landMask, elevation } = heightfield;

    const biomeField = context.fields.biomeId;
    const temperatureField = context.fields.temperature;
    if (!biomeField || !temperatureField) {
      throw new Error("BiomesStep: Missing biomeId or temperature field buffers.");
    }

    const latitude = buildLatitudeField(context.adapter, width, height);
    const corridors = deps.artifacts.corridors.read(context);
    const rifts = deps.artifacts.motifsRifts.read(context);

    const corridorMask = maskFromCoordSet(corridors.landCorridors, width, height);
    const riverCorridorMask = maskFromCoordSet(corridors.riverCorridors, width, height);
    combineCorridorMasks(corridorMask, riverCorridorMask);

    const riftShoulderMask = maskFromCoordSet(rifts.riftShoulder, width, height);

    const result = ops.classify(
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
    deps.artifacts.biomeClassification.publish(context, {
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
