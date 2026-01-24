import { createOp } from "@swooper/mapgen-core/authoring";
import { wrapDeltaPeriodic } from "@swooper/mapgen-core/lib/math";

import { BOUNDARY_TYPE } from "../../constants.js";
import type { BoundaryType } from "../../constants.js";
import { requireCrust, requireMesh, requirePlateGraph } from "../../lib/require.js";
import ComputeTectonicsContract from "./contract.js";

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, value | 0)) | 0;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function boundaryTypeForRegime(regime: string): BoundaryType {
  switch (regime) {
    case "convergent":
      return BOUNDARY_TYPE.convergent;
    case "divergent":
      return BOUNDARY_TYPE.divergent;
    case "transform":
      return BOUNDARY_TYPE.transform;
    default:
      return BOUNDARY_TYPE.none;
  }
}

const computeTectonics = createOp(ComputeTectonicsContract, {
  strategies: {
    default: {
      run: (input, config) => {
        const mesh = requireMesh(input.mesh, "foundation/compute-tectonics");
        const crust = requireCrust(input.crust, mesh.cellCount | 0, "foundation/compute-tectonics");
        const plateGraph = requirePlateGraph(input.plateGraph, mesh.cellCount | 0, "foundation/compute-tectonics");

        const cellCount = mesh.cellCount | 0;
        const wrapWidth = mesh.wrapWidth;

        const yt = mesh.bbox.yt ?? 0;
        const yb = mesh.bbox.yb ?? 0;
        const spanY = Math.max(1e-6, yb - yt);
        const polarBandFraction = clamp01((config.polarBandFraction ?? 0.12) as number);
        const band = Math.max(1e-6, spanY * polarBandFraction);

        const northType = boundaryTypeForRegime(config.polarBoundary?.north?.regime ?? "transform");
        const northIntensityScale = clamp01((config.polarBoundary?.north?.intensity ?? 1.0) / 2);
        const southType = boundaryTypeForRegime(config.polarBoundary?.south?.regime ?? "transform");
        const southIntensityScale = clamp01((config.polarBoundary?.south?.intensity ?? 1.0) / 2);

        const boundaryType = new Uint8Array(cellCount);
        const upliftPotential = new Uint8Array(cellCount);
        const riftPotential = new Uint8Array(cellCount);
        const shearStress = new Uint8Array(cellCount);
        const volcanism = new Uint8Array(cellCount);
        const fracture = new Uint8Array(cellCount);
        const cumulativeUplift = new Uint8Array(cellCount);

        for (let i = 0; i < cellCount; i++) {
          const plateAId = plateGraph.cellToPlate[i] | 0;
          const plateA = plateGraph.plates[plateAId];
          if (!plateA) continue;

          const ax = mesh.siteX[i] ?? 0;
          const ay = mesh.siteY[i] ?? 0;

          let chosenType: BoundaryType = BOUNDARY_TYPE.none;
          let bestIntensity = 0;

          const start = mesh.neighborsOffsets[i] | 0;
          const end = mesh.neighborsOffsets[i + 1] | 0;
          for (let cursor = start; cursor < end; cursor++) {
            const j = mesh.neighbors[cursor] | 0;
            if (j < 0 || j >= cellCount) continue;

            const plateBId = plateGraph.cellToPlate[j] | 0;
            if (plateBId === plateAId) continue;

            const plateB = plateGraph.plates[plateBId];
            if (!plateB) continue;

            const bx = mesh.siteX[j] ?? 0;
            const by = mesh.siteY[j] ?? 0;

            const dx = wrapDeltaPeriodic(bx - ax, wrapWidth);
            const dy = by - ay;

            const rvx = (plateB.velocityX ?? 0) - (plateA.velocityX ?? 0);
            const rvy = (plateB.velocityY ?? 0) - (plateA.velocityY ?? 0);

            const relSpeed = Math.sqrt(rvx * rvx + rvy * rvy);
            const intensity = clampByte(Math.round(relSpeed * 180));

            const dot = dx * rvx + dy * rvy;
            const threshold = 0.05;
            const type: BoundaryType =
              dot > threshold
                ? BOUNDARY_TYPE.divergent
                : dot < -threshold
                  ? BOUNDARY_TYPE.convergent
                  : BOUNDARY_TYPE.transform;

            if (intensity > bestIntensity) {
              bestIntensity = intensity;
              chosenType = type;
            }
          }

          boundaryType[i] = chosenType;

          if (chosenType === BOUNDARY_TYPE.convergent) {
            upliftPotential[i] = bestIntensity;
            cumulativeUplift[i] = bestIntensity;
            volcanism[i] = clampByte(Math.round(bestIntensity * 0.5) + (crust.type[i] === 0 ? 40 : 0));
          } else if (chosenType === BOUNDARY_TYPE.divergent) {
            riftPotential[i] = bestIntensity;
            fracture[i] = clampByte(Math.round(bestIntensity * 0.25));
          } else if (chosenType === BOUNDARY_TYPE.transform) {
            shearStress[i] = bestIntensity;
            fracture[i] = clampByte(Math.round(bestIntensity * 0.5));
          }

          const northInfluence = clamp01(1 - (ay - yt) / band);
          const southInfluence = clamp01(1 - (yb - ay) / band);

          const northIntensity = clampByte(Math.round(255 * northInfluence * northIntensityScale));
          const southIntensity = clampByte(Math.round(255 * southInfluence * southIntensityScale));

          if (northIntensity > 0) {
            if (northIntensity > bestIntensity) {
              bestIntensity = northIntensity;
              chosenType = northType;
              boundaryType[i] = chosenType;
            }
            if (northType === BOUNDARY_TYPE.convergent) {
              upliftPotential[i] = Math.max(upliftPotential[i] ?? 0, northIntensity);
              cumulativeUplift[i] = Math.max(cumulativeUplift[i] ?? 0, northIntensity);
              volcanism[i] = Math.max(
                volcanism[i] ?? 0,
                clampByte(Math.round(northIntensity * 0.5) + (crust.type[i] === 0 ? 40 : 0))
              );
            } else if (northType === BOUNDARY_TYPE.divergent) {
              riftPotential[i] = Math.max(riftPotential[i] ?? 0, northIntensity);
              fracture[i] = Math.max(fracture[i] ?? 0, clampByte(Math.round(northIntensity * 0.25)));
            } else if (northType === BOUNDARY_TYPE.transform) {
              shearStress[i] = Math.max(shearStress[i] ?? 0, northIntensity);
              fracture[i] = Math.max(fracture[i] ?? 0, clampByte(Math.round(northIntensity * 0.5)));
            }
          }

          if (southIntensity > 0) {
            if (southIntensity > bestIntensity) {
              bestIntensity = southIntensity;
              chosenType = southType;
              boundaryType[i] = chosenType;
            }
            if (southType === BOUNDARY_TYPE.convergent) {
              upliftPotential[i] = Math.max(upliftPotential[i] ?? 0, southIntensity);
              cumulativeUplift[i] = Math.max(cumulativeUplift[i] ?? 0, southIntensity);
              volcanism[i] = Math.max(
                volcanism[i] ?? 0,
                clampByte(Math.round(southIntensity * 0.5) + (crust.type[i] === 0 ? 40 : 0))
              );
            } else if (southType === BOUNDARY_TYPE.divergent) {
              riftPotential[i] = Math.max(riftPotential[i] ?? 0, southIntensity);
              fracture[i] = Math.max(fracture[i] ?? 0, clampByte(Math.round(southIntensity * 0.25)));
            } else if (southType === BOUNDARY_TYPE.transform) {
              shearStress[i] = Math.max(shearStress[i] ?? 0, southIntensity);
              fracture[i] = Math.max(fracture[i] ?? 0, clampByte(Math.round(southIntensity * 0.5)));
            }
          }
        }

        return {
          tectonics: {
            boundaryType,
            upliftPotential,
            riftPotential,
            shearStress,
            volcanism,
            fracture,
            cumulativeUplift,
          },
        } as const;
      },
    },
  },
});

export default computeTectonics;
