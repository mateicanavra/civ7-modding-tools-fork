import { clamp01 } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import BiomesStepContract from "./contract.js";
import { buildLatitudeField } from "./helpers/inputs.js";
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
    const topography = deps.artifacts.topography.read(context);
    const { landMask, elevation } = topography;
    const latitude = buildLatitudeField(context.env.latitudeBounds, width, height);
    const hydrography = deps.artifacts.hydrography.read(context);
    const cryosphere = deps.artifacts.cryosphere.read(context);

    const result = ops.classify(
      {
        width,
        height,
        rainfall: climateField.rainfall,
        humidity: climateField.humidity,
        elevation,
        latitude,
        landMask,
        riverClass: hydrography.riverClass,
      },
      config.classify
    );

    const size = Math.max(0, (width | 0) * (height | 0));
    const treeLine01 = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      treeLine01[i] = clamp01(1 - (cryosphere.permafrost01?.[i] ?? 0));
    }

    deps.artifacts.biomeClassification.publish(context, {
      width,
      height,
      ...result,
      groundIce01: cryosphere.groundIce01,
      permafrost01: cryosphere.permafrost01,
      meltPotential01: cryosphere.meltPotential01,
      treeLine01,
    });
  },
});
