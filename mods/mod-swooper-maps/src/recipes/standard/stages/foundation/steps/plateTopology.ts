import { buildPlateTopology } from "@swooper/mapgen-core/lib/plates";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";

import { foundationArtifacts } from "../artifacts.js";
import PlateTopologyStepContract from "./plateTopology.contract.js";
import { validatePlateTopologyArtifact, wrapFoundationValidateNoDims } from "./validation.js";

function validateTopologySymmetry(plates: ReadonlyArray<{ id: number; neighbors: number[] }>): void {
  const neighborSets = new Map<number, Set<number>>();
  for (const p of plates) neighborSets.set(p.id, new Set(p.neighbors));

  for (const p of plates) {
    const s = neighborSets.get(p.id);
    if (!s) continue;
    for (const n of s) {
      const back = neighborSets.get(n);
      if (!back || !back.has(p.id)) {
        throw new Error("[FoundationArtifact] Invalid foundation plateTopology neighbor symmetry.");
      }
    }
  }
}

export default createStep(PlateTopologyStepContract, {
  artifacts: implementArtifacts([foundationArtifacts.plateTopology], {
    foundationPlateTopology: {
      validate: (value) => wrapFoundationValidateNoDims(value, validatePlateTopologyArtifact),
    },
  }),
  run: (context, config, ops, deps) => {
    void config;
    void ops;

    const { width, height } = context.dimensions;
    const plates = deps.artifacts.foundationPlates.read(context);
    const plateIds = plates.id;

    let maxId = -1;
    for (let i = 0; i < plateIds.length; i++) {
      const v = plateIds[i] | 0;
      if (v > maxId) maxId = v;
    }
    const plateCount = Math.max(0, maxId + 1);
    if (plateCount <= 0) {
      throw new Error("[FoundationArtifact] Invalid foundation plateTopology.plateCount.");
    }

    const topologyPlates = buildPlateTopology(plateIds, width, height, plateCount);
    validateTopologySymmetry(topologyPlates);

    deps.artifacts.foundationPlateTopology.publish(context, { plateCount, plates: topologyPlates });
  },
});
