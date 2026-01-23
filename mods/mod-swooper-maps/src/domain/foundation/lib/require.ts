import type { FoundationMesh } from "../ops/compute-mesh/contract.js";
import type { FoundationCrust } from "../ops/compute-crust/contract.js";
import type { FoundationPlateGraph } from "../ops/compute-plate-graph/contract.js";
import type { FoundationTectonics } from "../ops/compute-tectonic-history/contract.js";

export function requireMesh(mesh: FoundationMesh | undefined, scope: string): FoundationMesh {
  if (!mesh) {
    throw new Error(`[Foundation] Mesh not provided for ${scope}.`);
  }

  const cellCount = mesh.cellCount | 0;
  if (cellCount <= 0) throw new Error(`[Foundation] Invalid mesh.cellCount for ${scope}.`);

  if (typeof mesh.wrapWidth !== "number" || !Number.isFinite(mesh.wrapWidth) || mesh.wrapWidth <= 0) {
    throw new Error(`[Foundation] Invalid mesh.wrapWidth for ${scope}.`);
  }

  if (!(mesh.siteX instanceof Float32Array) || mesh.siteX.length !== cellCount) {
    throw new Error(`[Foundation] Invalid mesh.siteX for ${scope}.`);
  }
  if (!(mesh.siteY instanceof Float32Array) || mesh.siteY.length !== cellCount) {
    throw new Error(`[Foundation] Invalid mesh.siteY for ${scope}.`);
  }

  if (!(mesh.neighborsOffsets instanceof Int32Array) || mesh.neighborsOffsets.length !== cellCount + 1) {
    throw new Error(`[Foundation] Invalid mesh.neighborsOffsets for ${scope}.`);
  }
  if (!(mesh.neighbors instanceof Int32Array)) {
    throw new Error(`[Foundation] Invalid mesh.neighbors for ${scope}.`);
  }

  if (!(mesh.areas instanceof Float32Array) || mesh.areas.length !== cellCount) {
    throw new Error(`[Foundation] Invalid mesh.areas for ${scope}.`);
  }

  return mesh;
}

export function requireCrust(crust: FoundationCrust | undefined, cellCount: number, scope: string): FoundationCrust {
  if (!crust) {
    throw new Error(`[Foundation] Crust not provided for ${scope}.`);
  }

  if (!(crust.type instanceof Uint8Array) || crust.type.length !== cellCount) {
    throw new Error(`[Foundation] Invalid crust.type for ${scope}.`);
  }
  if (!(crust.age instanceof Uint8Array) || crust.age.length !== cellCount) {
    throw new Error(`[Foundation] Invalid crust.age for ${scope}.`);
  }

  return crust;
}

export function requirePlateGraph(
  graph: FoundationPlateGraph | undefined,
  cellCount: number,
  scope: string
): FoundationPlateGraph {
  if (!graph) {
    throw new Error(`[Foundation] PlateGraph not provided for ${scope}.`);
  }

  if (!(graph.cellToPlate instanceof Int16Array) || graph.cellToPlate.length !== cellCount) {
    throw new Error(`[Foundation] Invalid plateGraph.cellToPlate for ${scope}.`);
  }
  if (!Array.isArray(graph.plates) || graph.plates.length <= 0) {
    throw new Error(`[Foundation] Invalid plateGraph.plates for ${scope}.`);
  }

  return graph;
}

export function requireTectonics(
  tectonics: FoundationTectonics | undefined,
  cellCount: number,
  scope: string
): FoundationTectonics {
  if (!tectonics) {
    throw new Error(`[Foundation] Tectonics not provided for ${scope}.`);
  }

  const mustMatch = [
    ["boundaryType", tectonics.boundaryType],
    ["upliftPotential", tectonics.upliftPotential],
    ["riftPotential", tectonics.riftPotential],
    ["shearStress", tectonics.shearStress],
    ["volcanism", tectonics.volcanism],
    ["fracture", tectonics.fracture],
    ["cumulativeUplift", tectonics.cumulativeUplift],
  ] as const;

  for (const [key, value] of mustMatch) {
    if (!(value instanceof Uint8Array) || value.length !== cellCount) {
      throw new Error(`[Foundation] Invalid tectonics.${key} for ${scope}.`);
    }
  }

  return tectonics;
}
