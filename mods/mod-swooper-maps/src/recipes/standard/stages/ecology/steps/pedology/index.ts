import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { getPublishedClimateField } from "../../../../artifacts.js";
import type { HeightfieldBuffer } from "@swooper/mapgen-core";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";
import { PedologyStepContract } from "./contract.js";

type PedologyStepConfig = Static<typeof PedologyStepContract.schema>;

function assertHeightfield(
  value: unknown,
  expectedSize: number
): asserts value is HeightfieldBuffer {
  if (!value || typeof value !== "object") {
    throw new Error("PedologyStep: Missing heightfield artifact.");
  }
  const candidate = value as HeightfieldBuffer;
  if (
    !(candidate.landMask instanceof Uint8Array) ||
    !(candidate.elevation instanceof Int16Array) ||
    candidate.landMask.length !== expectedSize ||
    candidate.elevation.length !== expectedSize
  ) {
    throw new Error("PedologyStep: Invalid heightfield artifact.");
  }
}

export default createStep(PedologyStepContract, {
  normalize: (config, ctx) => ({
    classify: ecology.ops.classifyPedology.normalize(config.classify, ctx),
  }),
  run: (context, config: PedologyStepConfig) => {
    const { width, height } = context.dimensions;
    const size = width * height;

    const climateField = getPublishedClimateField(context);
    if (!climateField) {
      throw new Error("PedologyStep: Missing artifact:climateField.");
    }

    const heightfieldArtifact = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield);
    assertHeightfield(heightfieldArtifact, size);

    const result = ecology.ops.classifyPedology.runValidated(
      {
        width,
        height,
        landMask: heightfieldArtifact.landMask,
        elevation: heightfieldArtifact.elevation,
        rainfall: climateField.rainfall,
        humidity: climateField.humidity,
      },
      config.classify
    );

    context.artifacts.set(M3_DEPENDENCY_TAGS.artifact.pedologyV1, {
      width,
      height,
      ...result,
    });
  },
});
