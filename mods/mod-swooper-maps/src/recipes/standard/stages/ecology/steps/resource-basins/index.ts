import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import type { HeightfieldBuffer } from "@swooper/mapgen-core";
import * as ecology from "@mapgen/domain/ecology";
import { getPublishedClimateField, isPedologyArtifactV1 } from "../../../../artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";
import { ResourceBasinsStepContract } from "./contract.js";

type ResourceBasinsStepConfig = Static<typeof ResourceBasinsStepContract.schema>;

const isHeightfield = (value: unknown, size: number): value is HeightfieldBuffer => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HeightfieldBuffer>;
  return candidate.landMask instanceof Uint8Array && candidate.landMask.length === size;
};

export default createStep(ResourceBasinsStepContract, {
  resolveConfig: (config, settings) => ({
    plan: ecology.ops.planResourceBasins.resolveConfig(config.plan, settings),
    score: ecology.ops.scoreResourceBasins.resolveConfig(config.score, settings),
  }),
  run: (context, config: ResourceBasinsStepConfig) => {
    const { width, height } = context.dimensions;
    const size = width * height;

    const pedologyArtifact = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.pedologyV1);
    if (!isPedologyArtifactV1(pedologyArtifact)) {
      throw new Error("ResourceBasinsStep: Missing artifact:ecology.soils@v1.");
    }
    const pedology = pedologyArtifact;
    if (pedology.soilType.length !== size || pedology.fertility.length !== size) {
      throw new Error("ResourceBasinsStep: Pedology artifact size mismatch.");
    }

    const heightfieldArtifact = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield);
    if (!isHeightfield(heightfieldArtifact, size)) {
      throw new Error("ResourceBasinsStep: Missing heightfield.");
    }
    const heightfield = heightfieldArtifact as HeightfieldBuffer;

    const climate = getPublishedClimateField(context);
    if (!climate) throw new Error("ResourceBasinsStep: Missing climate field.");

    const planned = ecology.ops.planResourceBasins.runValidated(
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

    const balanced = ecology.ops.scoreResourceBasins.runValidated(planned, config.score);

    context.artifacts.set(M3_DEPENDENCY_TAGS.artifact.resourceBasinsV1, balanced);
  },
});
