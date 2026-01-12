import { createStep, type Static } from "@swooper/mapgen-core/authoring";
import { getPublishedClimateField, heightfieldArtifact, pedologyArtifact } from "../../../../artifacts.js";
import PedologyStepContract from "./contract.js";
type PedologyStepConfig = Static<typeof PedologyStepContract.schema>;

export default createStep(PedologyStepContract, {
  run: (context, config: PedologyStepConfig, ops) => {
    const climateField = getPublishedClimateField(context);
    const heightfield = heightfieldArtifact.get(context);
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

    pedologyArtifact.set(context, {
      width,
      height,
      ...result,
    });
  },
});
