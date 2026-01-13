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
    const heightfield = deps.artifacts.heightfield.read(context);
    const { width, height } = context.dimensions;

    const result = ops.classify(
      {
        width,
        height,
        landMask: heightfield.landMask,
        elevation: heightfield.elevation,
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
