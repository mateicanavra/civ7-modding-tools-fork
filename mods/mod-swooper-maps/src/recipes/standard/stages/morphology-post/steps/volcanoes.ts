import { computeSampleStep, renderAsciiGrid } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { clamp01 } from "@swooper/mapgen-core/lib/math";
import VolcanoesStepContract from "./volcanoes.contract.js";
import { deriveStepSeed } from "@swooper/mapgen-core/lib/rng";
import {
  MORPHOLOGY_VOLCANISM_BASE_DENSITY_MULTIPLIER,
  MORPHOLOGY_VOLCANISM_CONVERGENT_MULTIPLIER_MULTIPLIER,
  MORPHOLOGY_VOLCANISM_HOTSPOT_WEIGHT_MULTIPLIER,
} from "@mapgen/domain/morphology/shared/knob-multipliers.js";
import type { MorphologyVolcanismKnob } from "@mapgen/domain/morphology/shared/knobs.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;
type VolcanoKind = "subductionArc" | "rift" | "hotspot";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateVolcanoes(value: unknown): ArtifactValidationIssue[] {
  if (!isRecord(value)) {
    return [{ message: "Missing volcanoes artifact." }];
  }
  const candidate = value as { volcanoMask?: unknown; volcanoes?: unknown };
  if (!(candidate.volcanoMask instanceof Uint8Array)) {
    return [{ message: "Expected volcanoes.volcanoMask to be a Uint8Array." }];
  }
  if (!Array.isArray(candidate.volcanoes)) {
    return [{ message: "Expected volcanoes.volcanoes to be an array." }];
  }
  for (const entry of candidate.volcanoes) {
    if (!isRecord(entry) || typeof entry.tileIndex !== "number" || entry.tileIndex < 0) {
      return [{ message: "Expected volcanoes.volcanoes entries to include a non-negative tileIndex." }];
    }
    if (entry.kind !== "subductionArc" && entry.kind !== "rift" && entry.kind !== "hotspot") {
      return [{ message: "Expected volcanoes.volcanoes entries to include a Phase 2 kind." }];
    }
    if (typeof entry.strength01 !== "number" || entry.strength01 < 0 || entry.strength01 > 1) {
      return [{ message: "Expected volcanoes.volcanoes entries to include strength01 within [0,1]." }];
    }
  }
  return [];
}

function clampNumber(value: number, bounds: { min: number; max?: number }): number {
  if (!Number.isFinite(value)) return bounds.min;
  const max = bounds.max ?? Number.POSITIVE_INFINITY;
  return Math.max(bounds.min, Math.min(max, value));
}

export default createStep(VolcanoesStepContract, {
  artifacts: implementArtifacts(VolcanoesStepContract.artifacts!.provides!, {
    volcanoes: {
      validate: (value) => validateVolcanoes(value),
    },
  }),
  normalize: (config, ctx) => {
    const { volcanism } = ctx.knobs as Readonly<{ volcanism?: MorphologyVolcanismKnob }>;
    const densityMultiplier = MORPHOLOGY_VOLCANISM_BASE_DENSITY_MULTIPLIER[volcanism ?? "normal"] ?? 1.0;
    const hotspotMultiplier = MORPHOLOGY_VOLCANISM_HOTSPOT_WEIGHT_MULTIPLIER[volcanism ?? "normal"] ?? 1.0;
    const convergentMultiplier =
      MORPHOLOGY_VOLCANISM_CONVERGENT_MULTIPLIER_MULTIPLIER[volcanism ?? "normal"] ?? 1.0;

    const volcanoesSelection =
      config.volcanoes.strategy === "default"
        ? {
            ...config.volcanoes,
            config: {
              ...config.volcanoes.config,
              baseDensity: clampNumber(config.volcanoes.config.baseDensity * densityMultiplier, { min: 0 }),
              hotspotWeight: clampNumber(config.volcanoes.config.hotspotWeight * hotspotMultiplier, { min: 0 }),
              convergentMultiplier: clampNumber(config.volcanoes.config.convergentMultiplier * convergentMultiplier, {
                min: 0,
              }),
            },
          }
        : config.volcanoes;

    return { ...config, volcanoes: volcanoesSelection };
  },
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

    const size = Math.max(0, (width | 0) * (height | 0));
    const volcanoMask = new Uint8Array(size);
    const volcanoes = plan.volcanoes
      .map((entry) => entry.index | 0)
      .filter((tileIndex) => tileIndex >= 0 && tileIndex < size && (topography.landMask[tileIndex] | 0) === 1)
      .sort((a, b) => a - b)
      .map((tileIndex) => {
        volcanoMask[tileIndex] = 1;
        const bType = plates.boundaryType?.[tileIndex] ?? 0;
        const kind: VolcanoKind = bType === 1 ? "subductionArc" : bType === 2 ? "rift" : "hotspot";
        const strength01 = clamp01((plates.volcanism?.[tileIndex] ?? 0) / 255);
        return { tileIndex, kind, strength01 };
      });

    context.trace.event(() => ({
      kind: "morphology.volcanoes.summary",
      volcanoes: volcanoes.length,
    }));
    context.trace.event(() => {
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
      volcanoMask,
      volcanoes,
    });
  },
});
