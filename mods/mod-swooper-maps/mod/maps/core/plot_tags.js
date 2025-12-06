import * as globals from "/base-standard/maps/map-globals.js";

/**
 * Maintain plot tagging (land/water + east/west) independently of Civ7 updates.
 * The base-standard map-utilities no longer ships addPlotTags, so we keep a stable copy here.
 *
 * @param {number} iHeight
 * @param {number} iWidth
 * @param {number} iEastContinentLeftCol - column separating west/east landmasses
 */
export function addPlotTags(iHeight, iWidth, iEastContinentLeftCol) {
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
      const terrain = GameplayMap.getTerrainType(iX, iY);
      const isLand = terrain != globals.g_OceanTerrain && terrain != globals.g_CoastTerrain;
      if (isLand) {
        TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_LANDMASS);
        if (iX >= iEastContinentLeftCol) {
          TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_EAST_LANDMASS);
        } else {
          TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WEST_LANDMASS);
        }
      } else {
        TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WATER);
        if (iX >= iEastContinentLeftCol - 1) {
          TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_EAST_WATER);
        } else {
          TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WEST_WATER);
        }
      }
    }
  }
}
