import { logBiomeSummary } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import PlotBiomesStepContract from "./plotBiomes.contract.js";
import { clampToByte } from "./plot-biomes/helpers/apply.js";
import { resolveEngineBiomeIds } from "./plot-biomes/helpers/engine-bindings.js";

export default createStep(PlotBiomesStepContract, {
  run: (context, config, _ops, deps) => {
    const { width, height } = context.dimensions;
    const classification = deps.artifacts.biomeClassification.read(context);
    const topography = deps.artifacts.topography.read(context);
    const { land: engineBindings, marine: marineBiome } = resolveEngineBiomeIds(
      context.adapter,
      config.bindings
    );

    const biomeField = context.fields.biomeId;
    const temperatureField = context.fields.temperature;
    if (!biomeField || !temperatureField) {
      throw new Error("PlotBiomesStep: Missing biomeId or temperature field buffers.");
    }

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x;
        if (topography.landMask[idx] === 0) {
          context.adapter.setBiomeType(x, y, marineBiome);
          biomeField[idx] = marineBiome;
          temperatureField[idx] = clampToByte(classification.surfaceTemperature[idx]! + 50);
          continue;
        }
        const biomeIdx = classification.biomeIndex[idx]!;
        if (biomeIdx === 255) continue;
        const symbol = ecology.biomeSymbolFromIndex(biomeIdx);
        const engineId = engineBindings[symbol];
        context.adapter.setBiomeType(x, y, engineId);
        biomeField[idx] = engineId;
        temperatureField[idx] = clampToByte(classification.surfaceTemperature[idx]! + 50);
      }
    }

    logBiomeSummary(context.trace, context.adapter, width, height);
  },
});
