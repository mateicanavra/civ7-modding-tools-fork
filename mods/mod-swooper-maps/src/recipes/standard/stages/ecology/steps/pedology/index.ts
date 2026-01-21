import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { ecologyArtifacts } from "../../artifacts.js";
import { validatePedologyArtifact } from "../../artifact-validation.js";
import PedologyStepContract from "./contract.js";

export default createStep(PedologyStepContract, {
  artifacts: implementArtifacts([ecologyArtifacts.pedology], {
    pedology: {
      validate: (value, context) => validatePedologyArtifact(value, context.dimensions),
    },
  }),
  run: (context, config, ops, deps) => {
    const climateField = deps.artifacts.climateField.read(context);
    const topography = deps.artifacts.topography.read(context);
    const { width, height } = context.dimensions;

    const result = ops.classify(
      {
        width,
        height,
        landMask: topography.landMask,
        elevation: topography.elevation,
        rainfall: climateField.rainfall,
        humidity: climateField.humidity,
      },
      config.classify
    );

    deps.artifacts.pedology.publish(context, {
      width,
      height,
      ...result,
    });
  },
});
