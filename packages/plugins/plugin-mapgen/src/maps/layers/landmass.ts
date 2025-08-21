// @ts-nocheck
/**
 * Landmass Layer — createDiverseLandmasses
 *
 * Generates three-band continental structure with organic, wiggled edges.
 * This mirrors the existing implementation used in the main script, extracted
 * into a dedicated layer module so the orchestrator (or the main script) can
 * import and call it directly.
 *
 * Responsibilities
 * - Initialize fractals for landmass shape and per-row jitter.
 * - Apply sinusoidal and noise-based horizontal shifts to avoid straight edges.
 * - Bias land probability toward band centers for robust interiors and porous rims.
 * - Write terrain as ocean or flat land; coast expansion happens later.
 *
 * Performance
 * - O(width × height), single pass; uses already-available engine primitives.
 */

import * as globals from "/base-standard/maps/map-globals.js";
import {
    LANDMASS_CFG,
    WORLDMODEL_OCEAN_SEPARATION,
} from "../config/tunables.js";
import { WorldModel } from "../world/model.js";

/**
 * Create continental landmasses with organic variation.
 * @param {number} iWidth
 * @param {number} iHeight
 * @param {Array<{west:number,east:number,south:number,north:number,continent:number}>} landmasses
 */
export function createDiverseLandmasses(iWidth, iHeight, landmasses) {
    // Single fractal with higher water level to ensure real oceans and coasts
    FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, 3, 0);
    // Auxiliary fractal to wiggle band edges by row and add irregularity
    FractalBuilder.create(globals.g_HillFractal, iWidth, iHeight, 4, 0);
    // Size-aware scaling (gentle): derive a sqrt factor from map area
    const area = Math.max(1, iWidth * iHeight);
    const BASE_AREA = 10000;
    const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / BASE_AREA)));

    // Slightly less water on larger maps for fuller continents (clamped)
    const _lm = LANDMASS_CFG || {};
    const baseWaterPct = Number.isFinite(_lm.baseWaterPercent)
        ? _lm.baseWaterPercent
        : 64;
    const waterThumbOnScale = Number.isFinite(_lm.waterThumbOnScale)
        ? _lm.waterThumbOnScale
        : -4;
    const waterPct = Math.max(
        60,
        Math.min(
            64,
            Math.round(baseWaterPct + waterThumbOnScale * (sqrtScale - 1)),
        ),
    );
    const iWaterHeight = FractalBuilder.getHeightFromPercent(
        globals.g_LandmassFractal,
        waterPct,
    );

    // More wiggle on larger maps, but still restrained
    const jitterAmpFracBase = Number.isFinite(_lm.jitterAmpFracBase)
        ? _lm.jitterAmpFracBase
        : 0.03;
    const jitterAmpFracScale = Number.isFinite(_lm.jitterAmpFracScale)
        ? _lm.jitterAmpFracScale
        : 0.015;
    const jitterAmp = Math.max(
        2,
        Math.floor(
            iWidth * (jitterAmpFracBase + jitterAmpFracScale * (sqrtScale - 1)),
        ),
    );
    // Curvature amplitude to bow bands into gentle arcs
    const curveAmpFrac = Number.isFinite(_lm.curveAmpFrac)
        ? _lm.curveAmpFrac
        : 0.05;
    const curveAmp = Math.floor(iWidth * curveAmpFrac * sqrtScale);

    // Plate-aware ocean separation: derive per-row band shifts from WorldModel boundary closeness (optional)
    const sepCfg = WORLDMODEL_OCEAN_SEPARATION || {};
    const sepEnabled =
        !!sepCfg.enabled &&
        !!(
            WorldModel &&
            typeof WorldModel.isEnabled === "function" &&
            WorldModel.isEnabled()
        ) &&
        !!WorldModel.boundaryCloseness;
    const rowShifts = new Array(landmasses.length);
    for (let k = 0; k < landmasses.length; k++)
        rowShifts[k] = new Int16Array(iHeight);

    if (sepEnabled) {
        const BC = WorldModel.boundaryCloseness;
        const pairs = Array.isArray(sepCfg.bandPairs)
            ? sepCfg.bandPairs
            : [
                  [0, 1],
                  [1, 2],
              ];
        const baseSep = Math.max(0, sepCfg.baseSeparationTiles | 0 || 0);
        const mult = Math.max(
            0,
            Number.isFinite(sepCfg.boundaryClosenessMultiplier)
                ? sepCfg.boundaryClosenessMultiplier
                : 1.0,
        );
        const maxDelta = Math.max(0, sepCfg.maxPerRowDelta | 0 || 3);

        for (const p of pairs) {
            const li = Array.isArray(p) ? p[0] | 0 : -1;
            const ri = Array.isArray(p) ? p[1] | 0 : -1;
            if (
                li < 0 ||
                ri < 0 ||
                li >= landmasses.length ||
                ri >= landmasses.length
            )
                continue;
            const left = landmasses[li];
            const right = landmasses[ri];

            for (let y = 0; y < iHeight; y++) {
                // Approximate mid-gap sample between band bounds on this row
                const midX = Math.max(
                    0,
                    Math.min(
                        iWidth - 1,
                        Math.floor((left.east + right.west) / 2),
                    ),
                );
                const i = y * iWidth + midX;
                const clos = BC[i] | 0;
                const f = clos / 255; // 0..1
                let sep = baseSep + Math.round(f * mult * baseSep);
                if (sep > maxDelta) sep = maxDelta;
                if (sep < 0) sep = 0;
                if (sepCfg.respectSeaLanes) {
                    const minCh = Math.max(0, sepCfg.minChannelWidth | 0 || 0);
                    const leftEdge = left.east + rowShifts[li][y] - sep;
                    const rightEdge = right.west + rowShifts[ri][y] + sep;
                    const widthNow = rightEdge - leftEdge;
                    if (widthNow < minCh) {
                        const deficit = minCh - widthNow;
                        sep = Math.max(0, sep - deficit);
                    }
                }

                rowShifts[li][y] -= sep; // push left band left
                rowShifts[ri][y] += sep; // push right band right
            }
        }
        // Edge widening/narrowing (west/east map edges) — optional
        const eW = sepCfg.edgeWest || {};
        const eE = sepCfg.edgeEast || {};
        const firstBand = 0;
        const lastBand = landmasses.length - 1;

        if (firstBand >= 0 && eW && eW.enabled) {
            const baseW = eW.baseTiles | 0 || 0;
            const multW = Number.isFinite(eW.boundaryClosenessMultiplier)
                ? eW.boundaryClosenessMultiplier
                : 1.0;
            const capW = Math.max(0, eW.maxPerRowDelta | 0 || 2);
            for (let y = 0; y < iHeight; y++) {
                const clos = WorldModel.boundaryCloseness[y * iWidth + 0] | 0;
                const f = clos / 255;
                let mag =
                    Math.abs(baseW) + Math.round(f * multW * Math.abs(baseW));
                if (mag > capW) mag = capW;
                // baseW > 0 widens west ocean (push left band left = negative shift)
                const signed = baseW >= 0 ? -mag : mag;
                rowShifts[firstBand][y] += signed;
            }
        }

        if (lastBand >= 0 && eE && eE.enabled) {
            const baseE = eE.baseTiles | 0 || 0;
            const multE = Number.isFinite(eE.boundaryClosenessMultiplier)
                ? eE.boundaryClosenessMultiplier
                : 1.0;
            const capE = Math.max(0, eE.maxPerRowDelta | 0 || 2);
            for (let y = 0; y < iHeight; y++) {
                const clos =
                    WorldModel.boundaryCloseness[y * iWidth + (iWidth - 1)] | 0;
                const f = clos / 255;
                let mag =
                    Math.abs(baseE) + Math.round(f * multE * Math.abs(baseE));
                if (mag > capE) mag = capE;
                // baseE > 0 widens east ocean (push right band right = positive shift)
                const signed = baseE >= 0 ? mag : -mag;
                rowShifts[lastBand][y] += signed;
            }
        }
    }

    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = globals.g_OceanTerrain;

            // Check if this tile should be land based on landmass boundaries
            for (const landmass of landmasses) {
                // Apply a per-row horizontal shift and slight width change to avoid straight columns
                const sinOffset = Math.floor(
                    Math.sin((iY + landmass.continent * 13) * 0.25) * jitterAmp,
                );
                let noise = FractalBuilder.getHeight(
                    globals.g_HillFractal,
                    iX,
                    iY,
                );
                noise = Math.floor(((noise % 200) / 200 - 0.5) * jitterAmp);

                // Bow continents into long, gentle arcs; each band uses a different phase
                const t = iY / Math.max(1, iHeight - 1);
                const curve = Math.floor(
                    curveAmp * Math.sin(Math.PI * t + landmass.continent * 0.7),
                );

                const bandIdx = landmass.continent | 0;
                const sepRowShift = sepEnabled
                    ? rowShifts[bandIdx]?.[iY] | 0
                    : 0;
                const shift =
                    sinOffset + Math.floor(noise * 0.5) + curve + sepRowShift;
                const widthDelta = Math.floor(noise * 0.3);

                const westY = Math.max(
                    0,
                    Math.min(iWidth - 1, landmass.west + shift + widthDelta),
                );
                const eastY = Math.max(
                    0,
                    Math.min(iWidth - 1, landmass.east + shift - widthDelta),
                );

                if (
                    iX >= westY &&
                    iX <= eastY &&
                    iY >= landmass.south &&
                    iY <= landmass.north
                ) {
                    // Use fractal to determine if this specific plot should be land
                    const iPlotHeight = FractalBuilder.getHeight(
                        globals.g_LandmassFractal,
                        iX,
                        iY,
                    );

                    // Bias toward land near center of landmass
                    const centerX = (landmass.west + landmass.east) / 2;
                    const centerY = (landmass.south + landmass.north) / 2;
                    const dx = iX - centerX;
                    const dy = iY - centerY;
                    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
                    const maxDistance = Math.sqrt(
                        ((landmass.east - landmass.west) / 2) ** 2 +
                            ((landmass.north - landmass.south) / 2) ** 2,
                    );
                    const centerBonus = Math.max(
                        0,
                        (1 - distanceFromCenter / maxDistance) *
                            (110 + Math.round(10 * (sqrtScale - 1))),
                    );

                    if (iPlotHeight + centerBonus >= iWaterHeight) {
                        terrain = globals.g_FlatTerrain;
                        break;
                    }
                }
            }

            TerrainBuilder.setTerrainType(iX, iY, terrain);
        }
    }
}

export default createDiverseLandmasses;
