import { Type, type Static } from "typebox";
import { Value } from "typebox/value";

import { logBiomeSummary, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import {
  getPublishedClimateField,
  publishBiomeClassificationArtifact,
} from "../../../../artifacts.js";
import { getNarrativeCorridors, getNarrativeMotifsRifts } from "@mapgen/domain/narrative/queries.js";
import * as ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";
import {
  assertHeightfield,
  buildLatitudeField,
  combineCorridorMasks,
  maskFromCoordSet,
} from "./helpers/inputs.js";
import { clampToByte } from "./helpers/apply.js";

const BiomesStepConfigSchema = Type.Object(
  {
    classify: ecology.ops.classifyBiomes.config,
    bindings: ecology.BiomeEngineBindingsSchema,
  },
  {
    additionalProperties: false,
    default: {
      classify: ecology.ops.classifyBiomes.defaultConfig,
      bindings: {},
    },
  }
);

type BiomesStepConfig = {
  classify: Parameters<typeof ecology.ops.classifyBiomes.run>[1];
  bindings: Static<typeof ecology.BiomeEngineBindingsSchema>;
};

export default createStep({
  id: "biomes",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.climateField,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
  ],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
    M3_DEPENDENCY_TAGS.field.biomeId,
    M4_EFFECT_TAGS.engine.biomesApplied,
  ],
  schema: BiomesStepConfigSchema,
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
    const corridors = getNarrativeCorridors(context);
    const rifts = getNarrativeMotifsRifts(context);

    const corridorMask = maskFromCoordSet(corridors?.landCorridors, width, height);
    const riverCorridorMask = maskFromCoordSet(corridors?.riverCorridors, width, height);
    combineCorridorMasks(corridorMask, riverCorridorMask);

    const riftShoulderMask = maskFromCoordSet(rifts?.riftShoulder, width, height);

    const opConfig = Value.Default(
      ecology.ops.classifyBiomes.config,
      config.classify ?? ecology.ops.classifyBiomes.defaultConfig
    ) as Parameters<typeof ecology.ops.classifyBiomes.run>[1];

    const result = ecology.ops.classifyBiomes.run(
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
      opConfig
    );

    const { land: engineBindings, marine: marineBiome } = ecology.resolveEngineBiomeIds(
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
} as const);
