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
  const iWaterHeight = FractalBuilder.getHeightFromPercent(
    globals.g_LandmassFractal,
    64
  );

  const jitterAmp = Math.max(2, Math.floor(iWidth * 0.03));

  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      let terrain = globals.g_OceanTerrain;

      // Check if this tile should be land based on landmass boundaries
      for (const landmass of landmasses) {
        // Apply a per-row horizontal shift and slight width change to avoid straight columns
        const sinOffset = Math.floor(
          Math.sin((iY + landmass.continent * 13) * 0.25) * jitterAmp
        );
        let noise = FractalBuilder.getHeight(globals.g_HillFractal, iX, iY);
        noise = Math.floor(((noise % 200) / 200 - 0.5) * jitterAmp);
        const shift = sinOffset + Math.floor(noise * 0.5);
        const widthDelta = Math.floor(noise * 0.3);

        const westY = Math.max(
          0,
          Math.min(iWidth - 1, landmass.west + shift + widthDelta)
        );
        const eastY = Math.max(
          0,
          Math.min(iWidth - 1, landmass.east + shift - widthDelta)
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
            iY
          );

          // Bias toward land near center of landmass
          const centerX = (landmass.west + landmass.east) / 2;
          const centerY = (landmass.south + landmass.north) / 2;
          const dx = iX - centerX;
          const dy = iY - centerY;
          const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = Math.sqrt(
            ((landmass.east - landmass.west) / 2) ** 2 +
              ((landmass.north - landmass.south) / 2) ** 2
          );
          const centerBonus = Math.max(
            0,
            (1 - distanceFromCenter / maxDistance) * 110
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
