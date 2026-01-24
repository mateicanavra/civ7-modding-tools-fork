import { createOp } from "@swooper/mapgen-core/authoring";
import { wrapDeltaPeriodic } from "@swooper/mapgen-core/lib/math";

import { BOUNDARY_TYPE } from "../../constants.js";
import { requireCrust, requireMesh, requirePlateGraph } from "../../lib/require.js";
import ComputeTectonicSegmentsContract from "./contract.js";

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value))) | 0;
}

function clampInt8(value: number): number {
  return Math.max(-127, Math.min(127, Math.round(value))) | 0;
}

function hypot2(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function normalizeToInt8(x: number, y: number): { u: number; v: number } {
  const len = hypot2(x, y);
  if (!Number.isFinite(len) || len <= 1e-9) return { u: 0, v: 0 };
  return { u: clampInt8((x / len) * 127), v: clampInt8((y / len) * 127) };
}

function velocityAtPoint(params: {
  plate: { velocityX?: number; velocityY?: number; rotation?: number; seedX?: number; seedY?: number };
  x: number;
  y: number;
  wrapWidth: number;
}): { vx: number; vy: number } {
  const plate = params.plate;
  const vx = plate.velocityX ?? 0;
  const vy = plate.velocityY ?? 0;

  const omega = plate.rotation ?? 0;
  if (!omega) return { vx, vy };

  const cx = plate.seedX ?? 0;
  const cy = plate.seedY ?? 0;
  const dx = wrapDeltaPeriodic(params.x - cx, params.wrapWidth);
  const dy = params.y - cy;

  // 2D rigid rotation: v_rot = omega * perp(r)
  return { vx: vx + -dy * omega, vy: vy + dx * omega };
}

function boundaryRegimeFromIntensities(intensities: {
  compression: number;
  extension: number;
  shear: number;
  minIntensity: number;
}): number {
  const c = intensities.compression | 0;
  const e = intensities.extension | 0;
  const s = intensities.shear | 0;
  const max = Math.max(c, e, s);
  if (max < (intensities.minIntensity | 0)) return BOUNDARY_TYPE.none;
  if (c >= e && c >= s) return BOUNDARY_TYPE.convergent;
  if (e >= c && e >= s) return BOUNDARY_TYPE.divergent;
  return BOUNDARY_TYPE.transform;
}

const computeTectonicSegments = createOp(ComputeTectonicSegmentsContract, {
  strategies: {
    default: {
      run: (input, config) => {
        const mesh = requireMesh(input.mesh, "foundation/compute-tectonic-segments");
        const crust = requireCrust(input.crust, mesh.cellCount | 0, "foundation/compute-tectonic-segments");
        const plateGraph = requirePlateGraph(input.plateGraph, mesh.cellCount | 0, "foundation/compute-tectonic-segments");

        const cellCount = mesh.cellCount | 0;
        const wrapWidth = mesh.wrapWidth;
        const intensityScale = config.intensityScale;
        const regimeMinIntensity = config.regimeMinIntensity | 0;

        const aCell: number[] = [];
        const bCell: number[] = [];
        const plateA: number[] = [];
        const plateB: number[] = [];
        const regime: number[] = [];
        const polarity: number[] = [];
        const compression: number[] = [];
        const extension: number[] = [];
        const shear: number[] = [];
        const volcanism: number[] = [];
        const fracture: number[] = [];
        const driftU: number[] = [];
        const driftV: number[] = [];

        for (let i = 0; i < cellCount; i++) {
          const start = mesh.neighborsOffsets[i] | 0;
          const end = mesh.neighborsOffsets[i + 1] | 0;
          const plateAId = plateGraph.cellToPlate[i] | 0;
          const pA = plateGraph.plates[plateAId];
          if (!pA) continue;

          const ax = mesh.siteX[i] ?? 0;
          const ay = mesh.siteY[i] ?? 0;

          for (let cursor = start; cursor < end; cursor++) {
            const j = mesh.neighbors[cursor] | 0;
            if (j <= i) continue;
            if (j < 0 || j >= cellCount) continue;

            const plateBId = plateGraph.cellToPlate[j] | 0;
            if (plateBId === plateAId) continue;

            const pB = plateGraph.plates[plateBId];
            if (!pB) continue;

            const bx = mesh.siteX[j] ?? 0;
            const by = mesh.siteY[j] ?? 0;

            const dx = wrapDeltaPeriodic(bx - ax, wrapWidth);
            const dy = by - ay;
            const len = hypot2(dx, dy);
            if (!Number.isFinite(len) || len <= 1e-9) continue;

            const nx = dx / len;
            const ny = dy / len;
            const tx = -ny;
            const ty = nx;

            const midX = ax + dx * 0.5;
            const midY = ay + dy * 0.5;

            const vA = velocityAtPoint({ plate: pA, x: midX, y: midY, wrapWidth });
            const vB = velocityAtPoint({ plate: pB, x: midX, y: midY, wrapWidth });

            const rvx = (vB.vx ?? 0) - (vA.vx ?? 0);
            const rvy = (vB.vy ?? 0) - (vA.vy ?? 0);

            const vn = rvx * nx + rvy * ny;
            const vt = rvx * tx + rvy * ty;

            const c = clampByte(Math.max(0, -vn) * intensityScale);
            const e = clampByte(Math.max(0, vn) * intensityScale);
            const s = clampByte(Math.abs(vt) * intensityScale);
            const kind = boundaryRegimeFromIntensities({ compression: c, extension: e, shear: s, minIntensity: regimeMinIntensity });

            let pol = 0;
            if (kind === BOUNDARY_TYPE.convergent) {
              const aType = crust.type[i] ?? 0;
              const bType = crust.type[j] ?? 0;
              if (aType !== bType) {
                // Oceanic crust subducts under continental crust.
                if (aType === 0 && bType === 1) pol = -1;
                if (aType === 1 && bType === 0) pol = 1;
              }
            }

            const v = (() => {
              if (kind === BOUNDARY_TYPE.convergent) return clampByte(c * 0.6 + (pol !== 0 ? 40 : 0));
              if (kind === BOUNDARY_TYPE.divergent) return clampByte(e * 0.25);
              if (kind === BOUNDARY_TYPE.transform) return clampByte(s * 0.1);
              return 0;
            })();

            const f = (() => {
              if (kind === BOUNDARY_TYPE.transform) return clampByte(s * 0.7);
              if (kind === BOUNDARY_TYPE.divergent) return clampByte(e * 0.3);
              if (kind === BOUNDARY_TYPE.convergent) return clampByte(c * 0.2);
              return 0;
            })();

            const drift = normalizeToInt8((pA.velocityX ?? 0) + (pB.velocityX ?? 0), (pA.velocityY ?? 0) + (pB.velocityY ?? 0));

            aCell.push(i);
            bCell.push(j);
            plateA.push(plateAId);
            plateB.push(plateBId);
            regime.push(kind);
            polarity.push(pol);
            compression.push(c);
            extension.push(e);
            shear.push(s);
            volcanism.push(v);
            fracture.push(f);
            driftU.push(drift.u);
            driftV.push(drift.v);
          }
        }

        const segmentCount = aCell.length;

        return {
          segments: {
            segmentCount,
            aCell: Int32Array.from(aCell),
            bCell: Int32Array.from(bCell),
            plateA: Int16Array.from(plateA),
            plateB: Int16Array.from(plateB),
            regime: Uint8Array.from(regime),
            polarity: Int8Array.from(polarity),
            compression: Uint8Array.from(compression),
            extension: Uint8Array.from(extension),
            shear: Uint8Array.from(shear),
            volcanism: Uint8Array.from(volcanism),
            fracture: Uint8Array.from(fracture),
            driftU: Int8Array.from(driftU),
            driftV: Int8Array.from(driftV),
          },
        } as const;
      },
    },
  },
});

export default computeTectonicSegments;

