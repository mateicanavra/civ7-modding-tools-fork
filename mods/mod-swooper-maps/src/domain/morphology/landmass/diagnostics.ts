import type { CrustFirstResult } from "@mapgen/domain/morphology/landmass/types.js";

export const LANDMASS_LOG_PREFIX = "[landmass-plate]";

export function logCrustFirstDiagnostics(
  crustResult: CrustFirstResult,
  size: number,
  targetLandTiles: number,
  closenessLimit: number,
  waterPct: number
): void {
  const applied = crustResult.crustConfigApplied;
  console.log(
    `${LANDMASS_LOG_PREFIX} Crust mode=${crustResult.mode} seaLevel=${crustResult.seaLevel != null && Number.isFinite(crustResult.seaLevel) ? crustResult.seaLevel.toFixed(3) : "n/a"}, landTiles=${crustResult.landTiles}/${size} (${((crustResult.landTiles / size) * 100).toFixed(1)}%), targetLandTiles=${targetLandTiles}, continentalArea=${crustResult.continentalArea}, oceanicArea=${crustResult.oceanicArea}, waterPct=${waterPct.toFixed(1)}%`
  );
  console.log(
    `${LANDMASS_LOG_PREFIX} Crust config: plates=${crustResult.continentalPlates}/${crustResult.plateCount} continental, mode=${applied ? applied.mode : crustResult.mode}, edgeBlend=${applied ? applied.edgeBlend.toFixed(2) : "n/a"}, noise=${applied ? applied.noiseAmplitude.toFixed(2) : "n/a"}, heights=[${applied ? applied.oceanicHeight.toFixed(2) : "n/a"},${applied ? applied.continentalHeight.toFixed(2) : "n/a"}], closenessLimit=${closenessLimit}`
  );
  console.log(
    `${LANDMASS_LOG_PREFIX} Continental plates (${crustResult.continentalPlateIds.length}): [${crustResult.continentalPlateIds.join(",")}]`
  );
  console.log(
    `${LANDMASS_LOG_PREFIX} Oceanic plates (${crustResult.oceanicPlateIds.length}): [${crustResult.oceanicPlateIds.join(",")}]`
  );

  if (crustResult.mode === "area" && crustResult.oceanicPlateIds.length === 0) {
    console.log(`${LANDMASS_LOG_PREFIX} WARNING: Area crust typing produced no oceanic plates`);
  }

  const baseHeightRange = crustResult.baseHeightRange;
  if (baseHeightRange) {
    console.log(
      `${LANDMASS_LOG_PREFIX} Height range: [${baseHeightRange.min.toFixed(3)},${baseHeightRange.max.toFixed(3)}]`
    );
  }
}

export function logLandmassWindowsSummary(plateCountWithLand: number, windowCount: number): void {
  console.log(
    `${LANDMASS_LOG_PREFIX} Plates with land: ${plateCountWithLand}, windows generated: ${windowCount}`
  );
}

export function logNoWindowsGeneratedDiagnostics(
  finalLandTiles: number,
  plateStatsSize: number,
  seaLevel: number,
  closenessLimit: number,
  closeness: Uint8Array | null,
  size: number,
  plateIds: Int16Array | Int8Array | Uint16Array | Uint8Array | number[]
): void {
  console.log(`${LANDMASS_LOG_PREFIX} WARNING: No landmass windows generated!`);
  console.log(`${LANDMASS_LOG_PREFIX}   - finalLandTiles: ${finalLandTiles}`);
  console.log(`${LANDMASS_LOG_PREFIX}   - plateStats entries: ${plateStatsSize}`);
  console.log(`${LANDMASS_LOG_PREFIX}   - seaLevel: ${seaLevel}`);
  console.log(`${LANDMASS_LOG_PREFIX}   - closenessLimit: ${closenessLimit}`);

  const closenessAboveLimit = closeness ? closeness.filter((v) => v > closenessLimit).length : 0;
  if (closeness) {
    console.log(
      `${LANDMASS_LOG_PREFIX}   - tiles with closeness > ${closenessLimit}: ${closenessAboveLimit}/${size}`
    );
  }

  const validPlateIds = new Set<number>();
  for (let i = 0; i < size; i++) {
    if (plateIds[i] >= 0) validPlateIds.add(plateIds[i]);
  }
  console.log(`${LANDMASS_LOG_PREFIX}   - unique valid plate IDs: ${validPlateIds.size}`);
}

