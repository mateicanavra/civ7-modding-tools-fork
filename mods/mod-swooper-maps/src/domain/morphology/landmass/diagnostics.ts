import type { TraceScope } from "@swooper/mapgen-core";
import type { CrustFirstResult } from "@mapgen/domain/morphology/landmass/types.js";

export const LANDMASS_LOG_PREFIX = "[landmass-plate]";

export function logCrustFirstDiagnostics(
  trace: TraceScope | null | undefined,
  crustResult: CrustFirstResult,
  size: number,
  targetLandTiles: number,
  closenessLimit: number,
  waterPct: number
): void {
  if (!trace?.isVerbose) return;
  const applied = crustResult.crustConfigApplied;
  const lines = [
    `${LANDMASS_LOG_PREFIX} Crust mode=${crustResult.mode} seaLevel=${crustResult.seaLevel != null && Number.isFinite(crustResult.seaLevel) ? crustResult.seaLevel.toFixed(3) : "n/a"}, landTiles=${crustResult.landTiles}/${size} (${((crustResult.landTiles / size) * 100).toFixed(1)}%), targetLandTiles=${targetLandTiles}, continentalArea=${crustResult.continentalArea}, oceanicArea=${crustResult.oceanicArea}, waterPct=${waterPct.toFixed(1)}%`,
    `${LANDMASS_LOG_PREFIX} Crust config: plates=${crustResult.continentalPlates}/${crustResult.plateCount} continental, mode=${applied ? applied.mode : crustResult.mode}, edgeBlend=${applied ? applied.edgeBlend.toFixed(2) : "n/a"}, noise=${applied ? applied.noiseAmplitude.toFixed(2) : "n/a"}, heights=[${applied ? applied.oceanicHeight.toFixed(2) : "n/a"},${applied ? applied.continentalHeight.toFixed(2) : "n/a"}], closenessLimit=${closenessLimit}`,
    `${LANDMASS_LOG_PREFIX} Continental plates (${crustResult.continentalPlateIds.length}): [${crustResult.continentalPlateIds.join(",")}]`,
    `${LANDMASS_LOG_PREFIX} Oceanic plates (${crustResult.oceanicPlateIds.length}): [${crustResult.oceanicPlateIds.join(",")}]`,
  ];

  if (crustResult.mode === "area" && crustResult.oceanicPlateIds.length === 0) {
    lines.push(`${LANDMASS_LOG_PREFIX} WARNING: Area crust typing produced no oceanic plates`);
  }

  const baseHeightRange = crustResult.baseHeightRange;
  if (baseHeightRange) {
    lines.push(
      `${LANDMASS_LOG_PREFIX} Height range: [${baseHeightRange.min.toFixed(3)},${baseHeightRange.max.toFixed(3)}]`
    );
  }

  trace.event(() => ({ type: "landmass.crust.diagnostics", lines }));
}

export function logLandmassWindowsSummary(
  trace: TraceScope | null | undefined,
  plateCountWithLand: number,
  windowCount: number
): void {
  if (!trace?.isVerbose) return;
  trace.event(() => ({
    type: "landmass.windows.summary",
    plateCountWithLand,
    windowCount,
  }));
}

export function logNoWindowsGeneratedDiagnostics(
  trace: TraceScope | null | undefined,
  finalLandTiles: number,
  plateStatsSize: number,
  seaLevel: number,
  closenessLimit: number,
  closeness: Uint8Array | null,
  size: number,
  plateIds: Int16Array | Int8Array | Uint16Array | Uint8Array | number[]
): void {
  if (!trace?.isVerbose) return;
  const lines = [
    `${LANDMASS_LOG_PREFIX} WARNING: No landmass windows generated!`,
    `${LANDMASS_LOG_PREFIX}   - finalLandTiles: ${finalLandTiles}`,
    `${LANDMASS_LOG_PREFIX}   - plateStats entries: ${plateStatsSize}`,
    `${LANDMASS_LOG_PREFIX}   - seaLevel: ${seaLevel}`,
    `${LANDMASS_LOG_PREFIX}   - closenessLimit: ${closenessLimit}`,
  ];

  const closenessAboveLimit = closeness ? closeness.filter((v) => v > closenessLimit).length : 0;
  if (closeness) {
    lines.push(
      `${LANDMASS_LOG_PREFIX}   - tiles with closeness > ${closenessLimit}: ${closenessAboveLimit}/${size}`
    );
  }

  const validPlateIds = new Set<number>();
  for (let i = 0; i < size; i++) {
    if (plateIds[i] >= 0) validPlateIds.add(plateIds[i]);
  }
  lines.push(`${LANDMASS_LOG_PREFIX}   - unique valid plate IDs: ${validPlateIds.size}`);

  trace.event(() => ({ type: "landmass.windows.missing", lines }));
}
