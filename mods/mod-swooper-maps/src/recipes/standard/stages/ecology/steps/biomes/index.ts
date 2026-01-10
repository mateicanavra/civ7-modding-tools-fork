import { logBiomeSummary, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import { bindCompileOps, bindRuntimeOps, type Static } from "@swooper/mapgen-core/authoring";
import {
  getPublishedClimateField,
  getPublishedNarrativeCorridors,
  getPublishedNarrativeMotifsRifts,
  heightfieldArtifact,
  publishBiomeClassificationArtifact,
} from "../../../../artifacts.js";
import * as ecology from "@mapgen/domain/ecology";
import * as ecologyContracts from "@mapgen/domain/ecology/contracts";
import { BiomesStepContract } from "./contract.js";
import {
  buildLatitudeField,
  combineCorridorMasks,
  maskFromCoordSet,
} from "./helpers/inputs.js";
import { clampToByte } from "./helpers/apply.js";
import { resolveEngineBiomeIds } from "./helpers/engine-bindings.js";

type BiomesStepConfig = Static<typeof BiomesStepContract.schema>;

const opContracts = {
  classifyBiomes: ecologyContracts.BiomeClassificationContract,
} as const;

const compileOps = bindCompileOps(opContracts, ecology.compileOpsById);
const runtimeOps = bindRuntimeOps(opContracts, ecology.runtimeOpsById);

export default createStep(BiomesStepContract, {
  normalize: (config, ctx) => ({
    classify: compileOps.classifyBiomes.normalize(config.classify, ctx),
    bindings: config.bindings,
  }),
  run: (context: ExtendedMapContext, config: BiomesStepConfig) => {
    const { width, height } = context.dimensions;

    const climateField = getPublishedClimateField(context);

    const heightfield = heightfieldArtifact.get(context);
    const { landMask, elevation } = heightfield;

    const biomeField = context.fields.biomeId;
    const temperatureField = context.fields.temperature;
    if (!biomeField || !temperatureField) {
      throw new Error("BiomesStep: Missing biomeId or temperature field buffers.");
    }

    const latitude = buildLatitudeField(context.adapter, width, height);
    const corridors = getPublishedNarrativeCorridors(context);
    const rifts = getPublishedNarrativeMotifsRifts(context);

    const corridorMask = maskFromCoordSet(corridors.landCorridors, width, height);
    const riverCorridorMask = maskFromCoordSet(corridors.riverCorridors, width, height);
    combineCorridorMasks(corridorMask, riverCorridorMask);

    const riftShoulderMask = maskFromCoordSet(rifts.riftShoulder, width, height);

    const result = runtimeOps.classifyBiomes.run(
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
