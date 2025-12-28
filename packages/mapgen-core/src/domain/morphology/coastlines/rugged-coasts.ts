import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { ctxRandom, writeHeightfield } from "@mapgen/core/types.js";
import { assertFoundationPlates } from "@mapgen/core/assertions.js";
import { clamp } from "@mapgen/lib/math/index.js";
import { forEachNeighbor3x3 } from "@mapgen/lib/grid/neighborhood/square-3x3.js";
import { BOUNDARY_TYPE } from "@mapgen/base/foundation/constants.js";
import { COAST_TERRAIN } from "@mapgen/core/terrain-constants.js";
import { getNarrativeCorridors, getNarrativeMotifsMargins } from "@mapgen/domain/narrative/queries.js";
import { computePlateBias } from "@mapgen/domain/morphology/coastlines/plate-bias.js";
import { isAdjacentToLand, isCoastalLand } from "@mapgen/domain/morphology/coastlines/adjacency.js";
import {
  findNeighborSeaLaneAttributes,
  findNeighborSeaLaneEdgeConfig,
  resolveSeaCorridorPolicy,
} from "@mapgen/domain/morphology/coastlines/corridor-policy.js";
import type { CoastlinePlateBiasConfig, CoastlinesConfig, CorridorPolicy } from "@mapgen/domain/morphology/coastlines/types.js";

const HILL_FRACTAL = 1;

export function addRuggedCoasts(
  iWidth: number,
  iHeight: number,
  ctx: ExtendedMapContext,
  config: { coastlines?: CoastlinesConfig; corridors?: CorridorPolicy } = {}
): void {
  const plates = assertFoundationPlates(ctx, "coastlines");
  const adapter = ctx.adapter;

  const area = Math.max(1, iWidth * iHeight);
  const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));

  if (adapter?.createFractal) {
    adapter.createFractal(HILL_FRACTAL, iWidth, iHeight, 4, 0);
  }

  const { boundaryCloseness, boundaryType } = plates;

  const cfg = config.coastlines || {};
  const cfgBay = cfg.bay || {};
  const cfgFjord = cfg.fjord || {};

  const bayNoiseExtra = (sqrtScale > 1 ? 1 : 0) + (Number.isFinite(cfgBay.noiseGateAdd) ? cfgBay.noiseGateAdd! : 0);
  const fjordBaseDenom = Math.max(
    6,
    (Number.isFinite(cfgFjord.baseDenom) ? cfgFjord.baseDenom! : 12) - (sqrtScale > 1.3 ? 1 : 0)
  );
  const fjordActiveBonus = Number.isFinite(cfgFjord.activeBonus) ? cfgFjord.activeBonus! : 1;
  const fjordPassiveBonus = Number.isFinite(cfgFjord.passiveBonus) ? cfgFjord.passiveBonus! : 2;
  const bayRollDenActive = Number.isFinite(cfgBay.rollDenActive) ? cfgBay.rollDenActive! : 4;
  const bayRollDenDefault = Number.isFinite(cfgBay.rollDenDefault) ? cfgBay.rollDenDefault! : 5;

  const plateBiasRaw = cfg.plateBias || {};
  const plateBiasCfg: Required<CoastlinePlateBiasConfig> = {
    threshold: clamp(Number.isFinite(plateBiasRaw.threshold) ? plateBiasRaw.threshold! : 0.45, 0, 1),
    power: Math.max(0.1, Number.isFinite(plateBiasRaw.power) ? plateBiasRaw.power! : 1.25),
    convergent: Number.isFinite(plateBiasRaw.convergent) ? plateBiasRaw.convergent! : 1.0,
    transform: Number.isFinite(plateBiasRaw.transform) ? plateBiasRaw.transform! : 0.4,
    divergent: Number.isFinite(plateBiasRaw.divergent) ? plateBiasRaw.divergent! : -0.6,
    interior: Number.isFinite(plateBiasRaw.interior) ? plateBiasRaw.interior! : 0,
    bayWeight: Math.max(0, Number.isFinite(plateBiasRaw.bayWeight) ? plateBiasRaw.bayWeight! : 0.35),
    bayNoiseBonus: Math.max(0, Number.isFinite(plateBiasRaw.bayNoiseBonus) ? plateBiasRaw.bayNoiseBonus! : 1.0),
    fjordWeight: Math.max(0, Number.isFinite(plateBiasRaw.fjordWeight) ? plateBiasRaw.fjordWeight! : 0.8),
  };

  const { protection: SEA_PROTECTION, softChanceMultiplier: SOFT_MULT } = resolveSeaCorridorPolicy(config.corridors);
  const emptySet = new Set<string>();
  const corridors = getNarrativeCorridors(ctx);
  const margins = getNarrativeMotifsMargins(ctx);
  const seaLanes = corridors?.seaLanes ?? emptySet;
  const activeMargin = margins?.activeMargin ?? emptySet;
  const passiveShelf = margins?.passiveShelf ?? emptySet;

  const applyTerrain = (x: number, y: number, terrain: number, isLand: boolean): void => {
    writeHeightfield(ctx, x, y, { terrain, isLand });
  };

  const isWater = (x: number, y: number): boolean => {
    if (adapter) return adapter.isWater(x, y);
    return true;
  };

  const getRandom = (label: string, max: number): number => ctxRandom(ctx, label, max);

  const getFractalHeight = (x: number, y: number): number => {
    if (adapter?.getFractalHeight) return adapter.getFractalHeight(HILL_FRACTAL, x, y);
    return 0;
  };

  for (let y = 1; y < iHeight - 1; y++) {
    for (let x = 1; x < iWidth - 1; x++) {
      const tileKey = `${x},${y}`;
      const onSeaLane = seaLanes.has(tileKey);
      const softMult = onSeaLane && SEA_PROTECTION === "soft" ? SOFT_MULT : 1;

      if (onSeaLane && SEA_PROTECTION === "hard") continue;

      if (isCoastalLand(x, y, iWidth, iHeight, isWater)) {
        const h = getFractalHeight(x, y);

        const i = y * iWidth + x;
        const closenessByte = boundaryCloseness[i] | 0;
        const closenessNorm = closenessByte / 255;
        const bType = boundaryType[i] | 0;
        const nearBoundary = closenessNorm >= plateBiasCfg.threshold;
        const plateBiasValue = computePlateBias(closenessNorm, bType, plateBiasCfg);

        const isActive = activeMargin.has(tileKey) || nearBoundary;
        const noiseGateBonus = plateBiasValue > 0 ? Math.round(plateBiasValue * plateBiasCfg.bayNoiseBonus) : 0;
        const noiseGate = 2 + bayNoiseExtra + (isActive ? 1 : 0) + noiseGateBonus;
        const bayRollDen = isActive ? bayRollDenActive : bayRollDenDefault;
        let bayRollDenUsed = softMult !== 1 ? Math.max(1, Math.round(bayRollDen / softMult)) : bayRollDen;

        if (plateBiasCfg.bayWeight > 0 && plateBiasValue !== 0) {
          const scale = clamp(1 + plateBiasValue * plateBiasCfg.bayWeight, 0.25, 4);
          bayRollDenUsed = Math.max(1, Math.round(bayRollDenUsed / scale));
        }

        const laneAttr = findNeighborSeaLaneAttributes(x, y, iWidth, iHeight, corridors);
        if (laneAttr?.edge) {
          const edgeCfg = laneAttr.edge as Record<string, unknown>;
          const bayMult = Number.isFinite(edgeCfg.bayCarveMultiplier) ? (edgeCfg.bayCarveMultiplier as number) : 1;
          if (bayMult && bayMult !== 1) {
            bayRollDenUsed = Math.max(1, Math.round(bayRollDenUsed / bayMult));
          }
        }

        if (h % 97 < noiseGate && getRandom("Carve Bay", bayRollDenUsed) === 0) {
          applyTerrain(x, y, COAST_TERRAIN, false);
          continue;
        }
      }

      if (isWater(x, y)) {
        if (isAdjacentToLand(x, y, iWidth, iHeight, isWater, 1)) {
          const i = y * iWidth + x;
          const closenessByte = boundaryCloseness[i] | 0;
          const closenessNorm = closenessByte / 255;
          const bType = boundaryType[i] | 0;
          const nearBoundary = closenessNorm >= plateBiasCfg.threshold;
          const plateBiasValue = computePlateBias(closenessNorm, bType, plateBiasCfg);

          let nearActive = nearBoundary;
          let nearPassive = false;
          forEachNeighbor3x3(x, y, iWidth, iHeight, (nx, ny) => {
            if (nearActive && nearPassive) return;
            const k = `${nx},${ny}`;
            if (!nearActive && activeMargin.has(k)) nearActive = true;
            if (!nearPassive && passiveShelf.has(k)) nearPassive = true;
          });

          const denom = Math.max(
            4,
            fjordBaseDenom - (nearPassive ? fjordPassiveBonus : 0) - (nearActive ? fjordActiveBonus : 0)
          );
          let denomUsed = softMult !== 1 ? Math.max(1, Math.round(denom / softMult)) : denom;

          if (plateBiasCfg.fjordWeight > 0 && plateBiasValue !== 0) {
            const fjScale = clamp(1 + plateBiasValue * plateBiasCfg.fjordWeight, 0.2, 5);
            denomUsed = Math.max(1, Math.round(denomUsed / fjScale));
          }

          const edgeCfg = findNeighborSeaLaneEdgeConfig(x, y, iWidth, iHeight, corridors);
          if (edgeCfg) {
            const fj = Number.isFinite(edgeCfg.fjordChance) ? (edgeCfg.fjordChance as number) : 0;
            const cliffs = Number.isFinite(edgeCfg.cliffsChance) ? (edgeCfg.cliffsChance as number) : 0;
            const effect = Math.max(0, Math.min(0.5, fj + cliffs * 0.5));
            if (effect > 0) {
              denomUsed = Math.max(1, Math.round(denomUsed * (1 - effect)));
            }
          }

          if (getRandom("Fjord Coast", denomUsed) === 0) {
            applyTerrain(x, y, COAST_TERRAIN, false);
          }
        }
      }
    }
  }
}
