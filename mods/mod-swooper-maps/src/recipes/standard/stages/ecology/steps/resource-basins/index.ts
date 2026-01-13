import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { ecologyArtifacts } from "../../artifacts.js";
import { validateResourceBasinsArtifact } from "../../artifact-validation.js";
import ResourceBasinsStepContract from "./contract.js";

export default createStep(ResourceBasinsStepContract, {
  artifacts: implementArtifacts([ecologyArtifacts.resourceBasins], {
    resourceBasins: {
      validate: (value, context) => validateResourceBasinsArtifact(value, context.dimensions),
    },
  }),
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const pedology = deps.artifacts.pedology.read(context);
    const heightfield = deps.artifacts.heightfield.read(context);
    const climate = deps.artifacts.climateField.read(context);

    const planned = ops.plan(
      {
        width,
        height,
        landMask: heightfield.landMask,
        fertility: pedology.fertility,
        soilType: pedology.soilType,
        rainfall: climate.rainfall,
        humidity: climate.humidity,
      },
      config.plan
    );

    const balanced = ops.score(planned, config.score);

    deps.artifacts.resourceBasins.publish(context, balanced);
  },
});
