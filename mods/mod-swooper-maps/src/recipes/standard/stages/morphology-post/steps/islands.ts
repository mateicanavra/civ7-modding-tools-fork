import { computeSampleStep, renderAsciiGrid } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import IslandsStepContract from "./islands.contract.js";
import { deriveStepSeed } from "@swooper/mapgen-core/lib/rng";

export default createStep(IslandsStepContract, {
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const plates = deps.artifacts.foundationPlates.read(context);
    const heightfield = context.buffers.heightfield;
    const rngSeed = deriveStepSeed(context.env.seed, "morphology:planIslandChains");

    const plan = ops.islands(
      {
        width,
        height,
        landMask: heightfield.landMask,
        boundaryCloseness: plates.boundaryCloseness,
        boundaryType: plates.boundaryType,
        volcanism: plates.volcanism,
        rngSeed,
      },
      config.islands
    );

    for (const edit of plan.edits) {
      const index = edit.index | 0;
      const y = (index / width) | 0;
      const x = index - y * width;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (edit.kind === "peak") {
        heightfield.landMask[index] = 1;
      }
    }

    context.trace.event(() => {
      let peaks = 0;
      let inBoundsPeaks = 0;
      for (const edit of plan.edits) {
        if (edit.kind !== "peak") continue;
        peaks += 1;
        const index = edit.index | 0;
        const y = (index / width) | 0;
        const x = index - y * width;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        inBoundsPeaks += 1;
      }
      return {
        kind: "morphology.islands.summary",
        edits: plan.edits.length,
        peaks,
        inBoundsPeaks,
      };
    });
    context.trace.event(() => {
      const size = Math.max(0, (width | 0) * (height | 0));
      const editMask = new Uint8Array(size);
      for (const edit of plan.edits) {
        const index = edit.index | 0;
        if (index < 0 || index >= size) continue;
        editMask[index] = 1;
      }

      const sampleStep = computeSampleStep(width, height);
      const rows = renderAsciiGrid({
        width,
        height,
        sampleStep,
        cellFn: (x, y) => {
          const idx = y * width + x;
          const base = heightfield.landMask[idx] === 1 ? "." : "~";
          const overlay = editMask[idx] === 1 ? "I" : undefined;
          return { base, overlay };
        },
      });
      return {
        kind: "morphology.islands.ascii.edits",
        sampleStep,
        legend: ".=land ~=water I=edit",
        rows,
      };
    });
  },
});
