import { computeSampleStep, renderAsciiGrid } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import VolcanoesStepContract from "./volcanoes.contract.js";
import { deriveStepSeed } from "@swooper/mapgen-core/lib/rng";

type ArtifactValidationIssue = Readonly<{ message: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateVolcanoes(value: unknown): ArtifactValidationIssue[] {
  if (!isRecord(value)) {
    return [{ message: "Missing volcanoes artifact." }];
  }
  const candidate = value as { volcanoes?: unknown };
  if (!Array.isArray(candidate.volcanoes)) {
    return [{ message: "Expected volcanoes.volcanoes to be an array." }];
  }
  for (const entry of candidate.volcanoes) {
    if (!isRecord(entry) || typeof entry.index !== "number" || entry.index < 0) {
      return [{ message: "Expected volcanoes.volcanoes entries to include a non-negative index." }];
    }
  }
  return [];
}

export default createStep(VolcanoesStepContract, {
  artifacts: implementArtifacts(VolcanoesStepContract.artifacts!.provides!, {
    volcanoes: {
      validate: (value) => validateVolcanoes(value),
    },
  }),
  run: (context, config, ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    const topography = deps.artifacts.topography.read(context);
    const { width, height } = context.dimensions;
    const rngSeed = deriveStepSeed(context.env.seed, "morphology:planVolcanoes");

    const plan = ops.volcanoes(
      {
        width,
        height,
        landMask: topography.landMask,
        boundaryCloseness: plates.boundaryCloseness,
        boundaryType: plates.boundaryType,
        shieldStability: plates.shieldStability,
        volcanism: plates.volcanism,
        rngSeed,
      },
      config.volcanoes
    );

    context.trace.event(() => ({
      kind: "morphology.volcanoes.summary",
      volcanoes: plan.volcanoes.length,
    }));
    context.trace.event(() => {
      const size = Math.max(0, (width | 0) * (height | 0));
      const volcanoMask = new Uint8Array(size);
      for (const entry of plan.volcanoes) {
        const index = entry.index | 0;
        if (index < 0 || index >= size) continue;
        volcanoMask[index] = 1;
      }

      const sampleStep = computeSampleStep(width, height);
      const rows = renderAsciiGrid({
        width,
        height,
        sampleStep,
        cellFn: (x, y) => {
          const idx = y * width + x;
          const base = topography.landMask[idx] === 1 ? "." : "~";
          const overlay = volcanoMask[idx] === 1 ? "V" : undefined;
          return { base, overlay };
        },
      });
      return {
        kind: "morphology.volcanoes.ascii.indices",
        sampleStep,
        legend: ".=land ~=water V=volcano",
        rows,
      };
    });

    deps.artifacts.volcanoes.publish(context, {
      volcanoes: plan.volcanoes,
    });
  },
});
