import { g_FlatTerrain, g_HillTerrain, g_MountainTerrain, g_OceanTerrain, g_StandardRainfall, g_MountainTopIncrease, g_MarineBiome, g_PlainsBiome, g_DesertBiome, g_TropicalBiome, g_TundraBiome, g_GrasslandBiome } from './map-globals.js';

function dumpStartSectors(sectors) {
  for (let iX = 0; iX < sectors.length; iX++) {
    console.log(iX + ": " + sectors[iX]);
  }
}
function dumpContinents(iWidth, iHeight) {
  for (let iY = iHeight - 1; iY >= 0; iY--) {
    let str = "";
    if (iY % 2 == 1) {
      str += " ";
    }
    for (let iX = 0; iX < iWidth; iX++) {
      let terrainString = " ";
      if (GameplayMap.isWater(iX, iY) == false) {
        const continent = GameplayMap.getContinentType(iX, iY);
        if (typeof continent == "number") {
          terrainString = Math.floor(continent % 10).toString();
        }
      }
      str += terrainString + " ";
    }
    console.log(str);
  }
}
function dumpTerrain(iWidth, iHeight) {
  for (let iY = iHeight - 1; iY >= 0; iY--) {
    let str = "";
    if (iY % 2 == 1) {
      str += " ";
    }
    for (let iX = 0; iX < iWidth; iX++) {
      const terrain = GameplayMap.getTerrainType(iX, iY);
      let terrainString = " ";
      if (terrain == g_FlatTerrain) {
        terrainString = ".";
      } else if (terrain == g_HillTerrain) {
        terrainString = "^";
      } else if (terrain == g_MountainTerrain) {
        terrainString = "M";
      } else if (terrain == g_OceanTerrain) {
        terrainString = "~";
      }
      str += terrainString + " ";
    }
    console.log(str);
  }
}
function dumpElevation(iWidth, iHeight) {
  for (let iY = iHeight - 1; iY >= 0; iY--) {
    let str = "";
    if (iY % 2 == 1) {
      str += " ";
    }
    for (let iX = 0; iX < iWidth; iX++) {
      if (GameplayMap.isWater(iX, iY) == false) {
        const elevation = GameplayMap.getElevation(iX, iY);
        let elevationToDisplay = " ";
        const iNumToDisplay = Math.floor(elevation / 100);
        elevationToDisplay = iNumToDisplay.toString();
        str += elevationToDisplay + " ";
      } else {
        str += "  ";
      }
    }
    console.log(str);
  }
}
function dumpRainfall(iWidth, iHeight) {
  for (let iY = iHeight - 1; iY >= 0; iY--) {
    let str = "";
    if (iY % 2 == 1) {
      str += " ";
    }
    for (let iX = 0; iX < iWidth; iX++) {
      if (GameplayMap.isWater(iX, iY) == false) {
        const rainfall = GameplayMap.getRainfall(iX, iY);
        let rainfallToDisplay = " ";
        if (rainfall == g_StandardRainfall + g_MountainTopIncrease) {
          rainfallToDisplay = "D";
        } else if (rainfall == g_StandardRainfall) {
          rainfallToDisplay = "s";
        } else {
          const iNumToDisplay = Math.floor(rainfall / 10);
          rainfallToDisplay = iNumToDisplay.toString();
        }
        str += rainfallToDisplay + " ";
      } else {
        str += "  ";
      }
    }
    console.log(str);
  }
}
function dumpBiomes(iWidth, iHeight) {
  const biomes = new Array(GameInfo.Biomes.length);
  for (let biomeIdx = 0; biomeIdx < GameInfo.Biomes.length; biomeIdx++) {
    biomes[biomeIdx] = 0;
  }
  for (let iY = iHeight - 1; iY >= 0; iY--) {
    let str = "";
    if (iY % 2 == 1) {
      str += " ";
    }
    for (let iX = 0; iX < iWidth; iX++) {
      const biome = GameplayMap.getBiomeType(iX, iY);
      let biomeString = " ";
      if (biome == g_MarineBiome) {
        biomeString = " ";
      } else if (biome == g_PlainsBiome) {
        biomeString = "_";
      } else if (biome == g_DesertBiome) {
        biomeString = ".";
      } else if (biome == g_TropicalBiome) {
        biomeString = "#";
      } else if (biome == g_TundraBiome) {
        biomeString = "*";
      } else if (biome == g_GrasslandBiome) {
        biomeString = "~";
      }
      str += biomeString + " ";
      if (typeof biome == "number") {
        biomes[biome]++;
      }
    }
    console.log(str);
  }
  for (let biomeIDx = 0; biomeIDx < GameInfo.Biomes.length; biomeIDx++) {
    let str = "";
    str += GameInfo.Biomes[biomeIDx].Name + " ( " + biomeIDx + " )  Count: " + biomes[biomeIDx];
    console.log(str);
  }
}
function getFeatureTypeIndex(name) {
  const def = GameInfo.Features.lookup(name);
  if (def) {
    return def.$index;
  }
  return -1;
}
function dumpFeatures(iWidth, iHeight) {
  console.log("Feature placement");
  const displayTypes = [
    { index: getFeatureTypeIndex("FEATURE_SAGEBRUSH_STEPPE"), ch: "P" },
    { index: getFeatureTypeIndex("FEATURE_OASIS"), ch: "O" },
    { index: getFeatureTypeIndex("FEATURE_DESERT_FLOODPLAIN_MINOR"), ch: "d" },
    { index: getFeatureTypeIndex("FEATURE_DESERT_FLOODPLAIN_NAVIGABLE"), ch: "d" },
    { index: getFeatureTypeIndex("FEATURE_FOREST"), ch: "F" },
    { index: getFeatureTypeIndex("FEATURE_MARSH"), ch: "M" },
    { index: getFeatureTypeIndex("FEATURE_GRASSLAND_FLOODPLAIN_MINOR"), ch: "g" },
    { index: getFeatureTypeIndex("FEATURE_GRASSLAND_FLOODPLAIN_NAVIGABLE"), ch: "g" },
    { index: getFeatureTypeIndex("FEATURE_REEF"), ch: "E" },
    { index: getFeatureTypeIndex("FEATURE_COLD_REEF"), ch: "E" },
    { index: getFeatureTypeIndex("FEATURE_ICE"), ch: "I" },
    { index: getFeatureTypeIndex("FEATURE_SAVANNA_WOODLAND"), ch: "T" },
    { index: getFeatureTypeIndex("FEATURE_WATERING_HOLE"), ch: "W" },
    { index: getFeatureTypeIndex("FEATURE_PLAINS_FLOODPLAIN_MINOR"), ch: "p" },
    { index: getFeatureTypeIndex("FEATURE_PLAINS_FLOODPLAIN_NAVIGABLE"), ch: "p" },
    { index: getFeatureTypeIndex("FEATURE_RAINFOREST"), ch: "R" },
    { index: getFeatureTypeIndex("FEATURE_MANGROVE"), ch: "G" },
    { index: getFeatureTypeIndex("FEATURE_TROPICAL_FLOODPLAIN_MINOR"), ch: "t" },
    { index: getFeatureTypeIndex("FEATURE_TROPICAL_FLOODPLAIN_NAVIGABLE"), ch: "t" },
    { index: getFeatureTypeIndex("FEATURE_TAIGA"), ch: "T" },
    { index: getFeatureTypeIndex("FEATURE_TUNDRA_BOG"), ch: "B" },
    { index: getFeatureTypeIndex("FEATURE_TUNDRA_FLOODPLAIN_MINOR"), ch: "u" },
    { index: getFeatureTypeIndex("FEATURE_TUNDRA_FLOODPLAIN_NAVIGABLE"), ch: "u" },
    { index: getFeatureTypeIndex("FEATURE_VOLCANO"), ch: "%" },
    // Wonders
    { index: getFeatureTypeIndex("FEATURE_VALLEY_OF_FLOWERS"), ch: "@" },
    { index: getFeatureTypeIndex("FEATURE_BARRIER_REEF"), ch: "@" },
    { index: getFeatureTypeIndex("FEATURE_BERMUDA_TRIANGLE"), ch: "@" },
    { index: getFeatureTypeIndex("FEATURE_REDWOOD_FOREST"), ch: "@" },
    { index: getFeatureTypeIndex("FEATURE_GRAND_CANYON"), ch: "@" },
    { index: getFeatureTypeIndex("FEATURE_GULLFOSS"), ch: "@" },
    { index: getFeatureTypeIndex("FEATURE_IGUAZU_FALLS"), ch: "@" },
    { index: getFeatureTypeIndex("FEATURE_KILIMANJARO"), ch: "@" },
    { index: getFeatureTypeIndex("FEATURE_ZHANGJIAJIE"), ch: "@" },
    { index: getFeatureTypeIndex("FEATURE_THERA"), ch: "@" },
    { index: getFeatureTypeIndex("FEATURE_TORRES_DEL_PAINE"), ch: "@" },
    { index: getFeatureTypeIndex("FEATURE_ULURU"), ch: "@" }
  ];
  for (let iY = iHeight - 1; iY >= 0; iY--) {
    let str = "";
    if (iY % 2 == 1) {
      str += " ";
    }
    for (let iX = 0; iX < iWidth; iX++) {
      let featureString = GameplayMap.isWater(iX, iY) == false ? "." : " ";
      const feature = GameplayMap.getFeatureType(iX, iY);
      if (feature != FeatureTypes.NO_FEATURE) {
        for (const entry of displayTypes) {
          if (entry.index == feature) {
            featureString = entry.ch;
            break;
          }
        }
      }
      str += featureString + " ";
    }
    console.log(str);
  }
}
function dumpResources(iWidth, iHeight) {
  const resources = new Array(GameInfo.Resources.length);
  for (var resourceIdx = 0; resourceIdx < GameInfo.Resources.length; resourceIdx++) {
    resources[resourceIdx] = 0;
  }
  for (let iY = iHeight - 1; iY >= 0; iY--) {
    let str = "";
    if (iY % 2 == 1) {
      str += " ";
    }
    for (let iX = 0; iX < iWidth; iX++) {
      const resource = GameplayMap.getResourceType(iX, iY);
      let resourcestring = " ";
      if (resource != ResourceTypes.NO_RESOURCE && typeof resource == "number") {
        resourcestring = resource.toString();
        resources[resource]++;
      } else {
        if (GameplayMap.isWater(iX, iY) == false) {
          resourcestring = "*";
        }
      }
      str += resourcestring + " ";
    }
    console.log(str);
  }
  let totalCount = 0;
  for (var resourceIdx = 0; resourceIdx < GameInfo.Resources.length; resourceIdx++) {
    let str = "";
    str += GameInfo.Resources[resourceIdx].Name + " ( " + resourceIdx + " )  Count: " + resources[resourceIdx];
    totalCount += resources[resourceIdx];
    console.log(str);
  }
  console.log("Total resources on map after generation: " + totalCount);
}
function dumpNoisePredicate(iWidth, iHeight, noise, pred) {
  console.log("NOISE MAP (Predicate)");
  if (!pred) {
    console.log("dumpNoiseInterp error: no predicate provided");
    return;
  }
  if (noise.length != iWidth * iHeight) {
    console.log("dumpNoiseInterp error: noise map does not match map width*height");
    return;
  }
  for (let iY = iHeight - 1; iY >= 0; iY--) {
    let str = "";
    if (iY % 2 == 1) {
      str += " ";
    }
    for (let iX = 0; iX < iWidth; iX++) {
      const index = iY * iWidth + iX;
      str += pred(noise[index]);
    }
    console.log(str);
  }
}

export { dumpBiomes, dumpContinents, dumpElevation, dumpFeatures, dumpNoisePredicate, dumpRainfall, dumpResources, dumpStartSectors, dumpTerrain };
//# sourceMappingURL=map-debug-helpers.js.map
