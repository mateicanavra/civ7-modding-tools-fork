import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { ecologyArtifacts } from "../../artifacts.js";
import { validateFeatureIntentsArtifact } from "../../artifact-validation.js";
import FeaturesPlanStepContract from "./contract.js";
import { computeRiverAdjacencyMask } from "../../../hydrology-hydrography/river-adjacency.js";
import { deriveStepSeed } from "../helpers/seed.js";

export default createStep(FeaturesPlanStepContract, {
  artifacts: implementArtifacts([ecologyArtifacts.featureIntents], {
    featureIntents: {
      validate: (value, context) => validateFeatureIntentsArtifact(value, context.dimensions),
    },
  }),
  run: (context, config, ops, deps) => {
    const classification = deps.artifacts.biomeClassification.read(context);
    const pedology = deps.artifacts.pedology.read(context);
    const heightfield = deps.artifacts.heightfield.read(context);

    const { width, height } = context.dimensions;
    const seed = deriveStepSeed(context.env.seed, "ecology:planFeatureIntents");
    const size = width * height;
    const emptyFeatureKeyField = (): Int16Array => new Int16Array(size).fill(-1);
    const terrainType = heightfield.terrain;
    const navigableRiverTerrain = context.adapter.getTerrainTypeIndex("TERRAIN_NAVIGABLE_RIVER");

    const vegetationPlacements = config.vegetatedFeaturePlacements
      ? ops.vegetatedFeaturePlacements(
          {
            width,
            height,
            seed,
            biomeIndex: classification.biomeIndex,
            vegetationDensity: classification.vegetationDensity,
            effectiveMoisture: classification.effectiveMoisture,
            surfaceTemperature: classification.surfaceTemperature,
            aridityIndex: classification.aridityIndex,
            freezeIndex: classification.freezeIndex,
            landMask: heightfield.landMask,
            terrainType,
            featureKeyField: emptyFeatureKeyField(),
            navigableRiverTerrain,
          },
          config.vegetatedFeaturePlacements
        ).placements
      : ops.vegetation(
          {
            width,
            height,
            biomeIndex: classification.biomeIndex,
            vegetationDensity: classification.vegetationDensity,
            effectiveMoisture: classification.effectiveMoisture,
            surfaceTemperature: classification.surfaceTemperature,
            fertility: pedology.fertility,
            landMask: heightfield.landMask,
          },
          config.vegetation
        ).placements;

    const wetlandsPlan = ops.wetlands(
      {
        width,
        height,
        landMask: heightfield.landMask,
        effectiveMoisture: classification.effectiveMoisture,
        surfaceTemperature: classification.surfaceTemperature,
        fertility: pedology.fertility,
        elevation: heightfield.elevation,
      },
      config.wetlands
    );

    const wetPlacements = config.wetFeaturePlacements
      ? ops.wetFeaturePlacements(
          {
            width,
            height,
            seed,
            biomeIndex: classification.biomeIndex,
            surfaceTemperature: classification.surfaceTemperature,
            landMask: heightfield.landMask,
            terrainType,
            featureKeyField: emptyFeatureKeyField(),
            nearRiverMask: computeRiverAdjacencyMask(
              context,
              Math.max(
                1,
                Math.floor(config.wetFeaturePlacements.config?.rules?.nearRiverRadius ?? 2)
              )
            ),
            isolatedRiverMask: computeRiverAdjacencyMask(
              context,
              Math.max(
                1,
                Math.floor(
                  config.wetFeaturePlacements.config?.rules?.isolatedRiverRadius ?? 1
                )
              )
            ),
            navigableRiverTerrain,
          },
          config.wetFeaturePlacements
        ).placements
      : [];

    const reefsPlan = ops.reefs(
      {
        width,
        height,
        landMask: heightfield.landMask,
        surfaceTemperature: classification.surfaceTemperature,
      },
      config.reefs
    );

    const icePlan = ops.ice(
      {
        width,
        height,
        landMask: heightfield.landMask,
        surfaceTemperature: classification.surfaceTemperature,
        elevation: heightfield.elevation,
      },
      config.ice
    );

    deps.artifacts.featureIntents.publish(context, {
      vegetation: vegetationPlacements,
      wetlands: [...wetlandsPlan.placements, ...wetPlacements],
      reefs: reefsPlan.placements,
      ice: icePlan.placements,
    });
  },
});
