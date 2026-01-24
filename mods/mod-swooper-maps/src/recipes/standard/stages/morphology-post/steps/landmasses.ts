import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";

import LandmassesStepContract from "./landmasses.contract.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateLandmassesSnapshot(value: unknown): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing landmasses snapshot." });
    return errors;
  }

  const candidate = value as { landmasses?: unknown; landmassIdByTile?: unknown };
  if (!Array.isArray(candidate.landmasses)) {
    errors.push({ message: "Expected landmasses.landmasses to be an array." });
  } else {
    for (const entry of candidate.landmasses) {
      if (!isRecord(entry)) {
        errors.push({ message: "Expected landmasses.landmasses entries to be objects." });
        continue;
      }
      if (typeof entry.id !== "number" || entry.id < 0) {
        errors.push({ message: "Expected landmasses.landmasses entries to include a non-negative id." });
      }
      if (typeof entry.tileCount !== "number" || entry.tileCount < 0) {
        errors.push({ message: "Expected landmasses.landmasses entries to include a non-negative tileCount." });
      }
      if (typeof entry.coastlineLength !== "number" || entry.coastlineLength < 0) {
        errors.push({ message: "Expected landmasses.landmasses entries to include a non-negative coastlineLength." });
      }
      const bbox = (entry as { bbox?: unknown }).bbox;
      if (!isRecord(bbox)) {
        errors.push({ message: "Expected landmasses.landmasses entries to include bbox." });
      }
    }
  }
  if (!(candidate.landmassIdByTile instanceof Int32Array)) {
    errors.push({ message: "Expected landmasses.landmassIdByTile to be an Int32Array." });
  }

  return errors;
}

export default createStep(LandmassesStepContract, {
  artifacts: implementArtifacts(LandmassesStepContract.artifacts!.provides!, {
    landmasses: {
      validate: (value) => validateLandmassesSnapshot(value),
    },
  }),
  run: (context, config, ops, deps) => {
    const topography = deps.artifacts.topography.read(context);
    const { width, height } = context.dimensions;
    const snapshot = ops.landmasses(
      {
        width,
        height,
        landMask: topography.landMask,
      },
      config.landmasses
    );
    deps.artifacts.landmasses.publish(context, snapshot);
  },
});
