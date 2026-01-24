import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import ecologyOps from "@mapgen/domain/ecology/ops";
import { ecologyArtifacts } from "../../artifacts.js";
import { validateFeatureIntentsArtifact } from "../../artifact-validation.js";
import FeaturesPlanStepContract from "./contract.js";
import { computeRiverAdjacencyMaskFromRiverClass } from "../../../hydrology-hydrography/river-adjacency.js";
import { deriveStepSeed } from "@swooper/mapgen-core/lib/rng";

export default createStep(FeaturesPlanStepContract, {
  artifacts: implementArtifacts([ecologyArtifacts.featureIntents], {
    featureIntents: {
      validate: (value, context) => validateFeatureIntentsArtifact(value, context.dimensions),
    },
  }),
  normalize: (config, ctx) => {
    let next = config;

    if (next.vegetatedFeaturePlacements) {
      const normalize = ecologyOps.ops.planVegetatedFeaturePlacements.normalize;
      if (typeof normalize === "function") {
        next = {
          ...next,
          vegetatedFeaturePlacements: normalize(next.vegetatedFeaturePlacements, ctx),
        };
      }
    }

    if (next.wetFeaturePlacements) {
      const normalize = ecologyOps.ops.planWetFeaturePlacements.normalize;
      if (typeof normalize === "function") {
        next = {
          ...next,
          wetFeaturePlacements: normalize(next.wetFeaturePlacements, ctx),
        };
      }
    }

    return next;
  },
  run: (context, config, ops, deps) => {
    const classification = deps.artifacts.biomeClassification.read(context);
    const pedology = deps.artifacts.pedology.read(context);
    const topography = deps.artifacts.topography.read(context);
    const hydrography = deps.artifacts.hydrography.read(context);

    const { width, height } = context.dimensions;
    const seed = deriveStepSeed(context.env.seed, "ecology:planFeatureIntents");
    const size = width * height;
    const emptyFeatureKeyField = (): Int16Array => new Int16Array(size).fill(-1);
    const navigableRiverMask = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      navigableRiverMask[i] = hydrography.riverClass[i] === 2 ? 1 : 0;
    }

    const vegetationPlacements = config.vegetatedFeaturePlacements
      ? ecologyOps.ops.planVegetatedFeaturePlacements.run(
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
            landMask: topography.landMask,
            navigableRiverMask,
            featureKeyField: emptyFeatureKeyField(),
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
            landMask: topography.landMask,
          },
          config.vegetation
        ).placements;

    const wetlandsPlan = ops.wetlands(
      {
        width,
        height,
        landMask: topography.landMask,
        effectiveMoisture: classification.effectiveMoisture,
        surfaceTemperature: classification.surfaceTemperature,
        fertility: pedology.fertility,
        elevation: topography.elevation,
      },
      config.wetlands
    );

    const wetPlacements = config.wetFeaturePlacements
      ? ecologyOps.ops.planWetFeaturePlacements.run(
          {
            width,
            height,
            seed,
            biomeIndex: classification.biomeIndex,
            surfaceTemperature: classification.surfaceTemperature,
            landMask: topography.landMask,
            navigableRiverMask,
            featureKeyField: emptyFeatureKeyField(),
            nearRiverMask: computeRiverAdjacencyMaskFromRiverClass({
              width,
              height,
              riverClass: hydrography.riverClass,
              radius: Math.max(
                1,
                Math.floor(config.wetFeaturePlacements.config?.rules?.nearRiverRadius ?? 2)
              ),
            }),
            isolatedRiverMask: computeRiverAdjacencyMaskFromRiverClass({
              width,
              height,
              riverClass: hydrography.riverClass,
              radius: Math.max(
                1,
                Math.floor(
                  config.wetFeaturePlacements.config?.rules?.isolatedRiverRadius ?? 1
                )
              ),
            }),
          },
          config.wetFeaturePlacements
        ).placements
      : [];

    const reefsPlan = ops.reefs(
      {
        width,
        height,
        landMask: topography.landMask,
        surfaceTemperature: classification.surfaceTemperature,
      },
      config.reefs
    );

    const icePlan = ops.ice(
      {
        width,
        height,
        landMask: topography.landMask,
        surfaceTemperature: classification.surfaceTemperature,
        elevation: topography.elevation,
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
