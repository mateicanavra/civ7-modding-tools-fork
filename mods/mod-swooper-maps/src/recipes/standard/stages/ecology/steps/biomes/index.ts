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
    deps.artifacts.biomeClassification.publish(context, {
      width,
      height,
      ...result,
    });
  },
});
