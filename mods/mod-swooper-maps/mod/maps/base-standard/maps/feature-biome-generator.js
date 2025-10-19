import { g_PlainsLatitude, g_MarineBiome, g_TropicalLatitude, g_PlainsBiome, g_TropicalBiome, g_DesertLatitude, g_DesertBiome, g_GrasslandLatitude, g_GrasslandBiome, g_TundraBiome } from './map-globals.js';
import { isAdjacentToNaturalWonder } from './map-utilities.js';

function designateBiomes(iWidth, iHeight) {
  console.log("Biomes");
  let iTotalLandPlots = 0;
  let iTotalLandPlotsAbove = 0;
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      const latitude = GameplayMap.getPlotLatitude(iX, iY);
      if (!GameplayMap.isWater(iX, iY)) {
        iTotalLandPlots = iTotalLandPlots + 1;
      }
      if (!GameplayMap.isWater(iX, iY) && g_PlainsLatitude < latitude) {
        iTotalLandPlotsAbove = iTotalLandPlotsAbove + 1;
      }
    }
  }
  let iPlainsLowering = 0;
  let iDesertLowering = 0;
  let iGrassLowering = 0;
  let iTropicalLowering = 0;
  if (Math.round(iTotalLandPlots / 5 * 2 * 0.75) > iTotalLandPlotsAbove) {
    iPlainsLowering += 5;
    iDesertLowering += 4;
    iGrassLowering += 4;
    iTropicalLowering += 2;
    console.log(
      "Less  iTotalLandPlots: " + iTotalLandPlots + " iTotalLandPlotsAbove: " + iTotalLandPlotsAbove
    );
  }
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      if (GameplayMap.isWater(iX, iY)) {
        TerrainBuilder.setBiomeType(iX, iY, g_MarineBiome);
      } else {
        let latitude = GameplayMap.getPlotLatitude(iX, iY);
        if (latitude < 0) latitude = -1 * latitude;
        latitude += Math.round(GameplayMap.getElevation(iX, iY) / 120);
        if (GameplayMap.isRiver(iX, iY)) {
          latitude -= 10;
        } else if (GameplayMap.isAdjacentToRivers(iX, iY, 1)) {
          latitude -= 5;
        }
        const rainfall = GameplayMap.getRainfall(iX, iY);
        if (latitude < g_TropicalLatitude - iTropicalLowering && rainfall < 85) {
          TerrainBuilder.setBiomeType(iX, iY, g_PlainsBiome);
        } else if (latitude < g_TropicalLatitude - iTropicalLowering) {
          TerrainBuilder.setBiomeType(iX, iY, g_TropicalBiome);
        } else if (latitude < g_PlainsLatitude - iPlainsLowering || latitude < g_TropicalLatitude - iTropicalLowering && rainfall < 85) {
          TerrainBuilder.setBiomeType(iX, iY, g_PlainsBiome);
        } else if (latitude < g_DesertLatitude - iDesertLowering || latitude < g_PlainsLatitude - iPlainsLowering && rainfall < 85) {
          TerrainBuilder.setBiomeType(iX, iY, g_DesertBiome);
        } else if (latitude < g_GrasslandLatitude - iGrassLowering) {
          TerrainBuilder.setBiomeType(iX, iY, g_GrasslandBiome);
        } else {
          TerrainBuilder.setBiomeType(iX, iY, g_TundraBiome);
        }
      }
    }
  }
}
function addFeatures(iWidth, iHeight) {
  console.log("Features");
  addPositionalFeatures(iWidth, iHeight);
  scatterFeatures(iWidth, iHeight);
  addIce(iWidth, iHeight);
  addReefs(iWidth, iHeight);
}
function addPositionalFeatures(iWidth, iHeight) {
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      const feature = GameplayMap.getFeatureType(iX, iY);
      if (GameplayMap.isWater(iX, iY) == false && feature == FeatureTypes.NO_FEATURE && GameplayMap.isNavigableRiver(iX, iY) == false) {
        if (GameplayMap.isCoastalLand(iX, iY)) {
          for (var featIdx = 0; featIdx < GameInfo.Features.length; featIdx++) {
            if (canAddFeature(
              iX,
              iY,
              featIdx,
              false,
              false,
              true,
              false,
              false,
              false,
              false
            )) {
              const iScatterChance = GameInfo.Features[featIdx].PlacementDensity;
              const iRoll = TerrainBuilder.getRandomNumber(100, "Feature Scatter");
              if (iRoll < iScatterChance) {
                const featureParam = {
                  Feature: featIdx,
                  Direction: -1,
                  Elevation: 0
                };
                TerrainBuilder.setFeatureType(iX, iY, featureParam);
                break;
              }
            }
          }
        } else if (GameplayMap.isAdjacentToRivers(iX, iY, 2)) {
          for (var featIdx = 0; featIdx < GameInfo.Features.length; featIdx++) {
            if (canAddFeature(
              iX,
              iY,
              featIdx,
              false,
              false,
              false,
              true,
              false,
              false,
              false
            )) {
              const iScatterChance = GameInfo.Features[featIdx].PlacementDensity;
              const iRoll = TerrainBuilder.getRandomNumber(100, "Feature Scatter");
              if (iRoll < iScatterChance) {
                const featureParam = {
                  Feature: featIdx,
                  Direction: -1,
                  Elevation: 0
                };
                TerrainBuilder.setFeatureType(iX, iY, featureParam);
                break;
              }
            }
          }
        } else {
          if (GameplayMap.isAdjacentToRivers(iX, iY, 1)) {
            continue;
          } else if (GameplayMap.isCoastalLand(iX, iY)) {
            continue;
          }
          for (var featIdx = 0; featIdx < GameInfo.Features.length; featIdx++) {
            if (!GameplayMap.isAdjacentToFeature(iX, iY, featIdx) && canAddFeature(
              iX,
              iY,
              featIdx,
              false,
              false,
              false,
              false,
              true,
              false,
              false
            )) {
              const iScatterChance = GameInfo.Features[featIdx].PlacementDensity;
              const iRoll = TerrainBuilder.getRandomNumber(100, "Feature Scatter");
              if (iRoll < iScatterChance) {
                const featureParam = {
                  Feature: featIdx,
                  Direction: -1,
                  Elevation: 0
                };
                TerrainBuilder.setFeatureType(iX, iY, featureParam);
                break;
              }
            }
          }
        }
      }
    }
  }
}
function scatterFeatures(iWidth, iHeight) {
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      const feature = GameplayMap.getFeatureType(iX, iY);
      if (GameplayMap.isWater(iX, iY) == false && feature == FeatureTypes.NO_FEATURE && GameplayMap.isNavigableRiver(iX, iY) == false) {
        for (let featIdx = 0; featIdx < GameInfo.Features.length; featIdx++) {
          if (canAddFeature(
            iX,
            iY,
            featIdx,
            true,
            false,
            false,
            false,
            false,
            false,
            false
          )) {
            const iScatterChance = GameInfo.Features[featIdx].PlacementDensity;
            const iRoll = TerrainBuilder.getRandomNumber(100, "Feature Scatter");
            if (iRoll < iScatterChance) {
              const featureParam = {
                Feature: featIdx,
                Direction: -1,
                Elevation: 0
              };
              TerrainBuilder.setFeatureType(iX, iY, featureParam);
              break;
            }
          }
        }
      }
    }
  }
}
function addReefs(iWidth, iHeight) {
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      const feature = GameplayMap.getFeatureType(iX, iY);
      if (GameplayMap.isWater(iX, iY) == true && feature == FeatureTypes.NO_FEATURE) {
        let latitude = GameplayMap.getPlotLatitude(iX, iY);
        if (latitude < 0) latitude = -1 * latitude;
        for (let featIdx = 0; featIdx < GameInfo.Features.length; featIdx++) {
          if (canAddFeature(
            iX,
            iY,
            featIdx,
            false,
            false,
            false,
            false,
            false,
            true,
            false
          )) {
            if (GameInfo.Features[featIdx].MinLatitude <= latitude && GameInfo.Features[featIdx].MaxLatitude > latitude) {
              const iScatterChance = GameInfo.Features[featIdx].PlacementDensity;
              const iWeight = (latitude + 50) * 2;
              const iRoll = TerrainBuilder.getRandomNumber(iWeight, "Feature Reef");
              if (iRoll < iScatterChance) {
                const featureParam = {
                  Feature: featIdx,
                  Direction: -1,
                  Elevation: 0
                };
                TerrainBuilder.setFeatureType(iX, iY, featureParam);
                break;
              }
            }
          }
        }
      }
    }
  }
}
function addIce(iWidth, iHeight) {
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      const feature = GameplayMap.getFeatureType(iX, iY);
      if (GameplayMap.isWater(iX, iY) == true && feature == FeatureTypes.NO_FEATURE) {
        let latitude = GameplayMap.getPlotLatitude(iX, iY);
        if (latitude < 0) latitude = -1 * latitude - 5;
        if (latitude > 78) {
          for (let featIdx = 0; featIdx < GameInfo.Features.length; featIdx++) {
            if (canAddFeature(
              iX,
              iY,
              featIdx,
              false,
              false,
              false,
              false,
              false,
              false,
              true
            )) {
              const iScatterChance = GameInfo.Features[featIdx].PlacementDensity;
              let iScore = TerrainBuilder.getRandomNumber(100, "Feature Ice");
              iScore = iScore + latitude;
              if (GameplayMap.isAdjacentToLand(iX, iY)) {
                iScore = 0;
              }
              if (isAdjacentToNaturalWonder(iX, iY)) {
                iScore = 0;
              }
              if (iScore > iScatterChance) {
                const featureParam = {
                  Feature: featIdx,
                  Direction: -1,
                  Elevation: 0
                };
                TerrainBuilder.setFeatureType(iX, iY, featureParam);
                break;
              }
            }
          }
        }
      }
    }
  }
}
function canAddFeature(iX, iY, feature, bScatterable, bRiverMouth, bCoastal, bNearRiver, bIsolated, bReef, bIce) {
  if (!bScatterable || GameInfo.Features[feature].PlacementClass == "SCATTER") {
    if (!bRiverMouth || GameInfo.Features[feature].PlacementClass == "RIVERMOUTH") {
      if (!bCoastal || GameInfo.Features[feature].PlacementClass == "COASTAL") {
        if (!bNearRiver || GameInfo.Features[feature].PlacementClass == "NEARRIVER") {
          if (!bIsolated || GameInfo.Features[feature].PlacementClass == "ISOLATED") {
            if (!bReef || GameInfo.Features[feature].PlacementClass == "REEF") {
              if (!bIce || GameInfo.Features[feature].PlacementClass == "ICE") {
                return TerrainBuilder.canHaveFeature(iX, iY, feature);
              }
            }
          }
        }
      }
    }
  }
  return false;
}

export { addFeatures, designateBiomes };
//# sourceMappingURL=feature-biome-generator.js.map
