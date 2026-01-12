import { createStep, type Static } from "@swooper/mapgen-core/authoring";
import {
  getPublishedClimateField,
  heightfieldArtifact,
  pedologyArtifact,
  resourceBasinsArtifact,
} from "../../../../artifacts.js";
import ResourceBasinsStepContract from "./contract.js";
type ResourceBasinsStepConfig = Static<typeof ResourceBasinsStepContract.schema>;

export default createStep(ResourceBasinsStepContract, {
  run: (context, config: ResourceBasinsStepConfig, ops) => {
    const { width, height } = context.dimensions;
    const pedology = pedologyArtifact.get(context);
    const heightfield = heightfieldArtifact.get(context);
    const climate = getPublishedClimateField(context);

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

    resourceBasinsArtifact.set(context, balanced);
  },
});
