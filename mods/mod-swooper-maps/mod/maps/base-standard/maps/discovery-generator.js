import { g_OceanWaterColumns, g_RequiredDistanceFromMajorForDiscoveries, g_CoastTerrain, g_OceanTerrain } from './map-globals.js';
import { getDistanceToClosestStart } from './map-utilities.js';

function generateDiscoveries(iWidth, iHeight, startingPositions) {
  if (GameInfo.Ages.lookup(Game.age).GenerateDiscoveries == false) {
    console.log("DISCOVERIES TURNED OFF FOR " + Game.age);
    return;
  }
  if (Configuration.getGameValue("DiscoverySiftingType") == 2316276985) {
    console.log("DISCOVERIES TURNED OFF");
    return;
  }
  console.log("Discovery generation", iWidth, iHeight);
  let discoveryCounter = 0;
  let oceanDiscoveryCounter = 0;
  let discoveryPlacedCounter = 0;
  let totalCoastalDiscoveryNotPlaced = 0;
  let totalOceanDiscoveryNotPlaced = 0;
  const seed = GameplayMap.getRandomSeed();
  const avgDistanceBetweenPoints = 5;
  const normalizedRangeSmoothing = 2;
  const poisson = TerrainBuilder.generatePoissonMap(seed, avgDistanceBetweenPoints, normalizedRangeSmoothing);
  let distanceToClosestStart = 0;
  const uiMapSize = GameplayMap.getMapSize();
  const mapInfo = GameInfo.Maps.lookup(uiMapSize);
  if (mapInfo == null) {
    console.log("Skipping discoveries.  No mapInfo for map of size ", uiMapSize);
    return;
  }
  const iOceanWaterColumns = (g_OceanWaterColumns + mapInfo.OceanWidth) * 1.75;
  const westContinent = {
    west: iOceanWaterColumns / 2,
    east: iWidth / 2 - iOceanWaterColumns / 2,
    south: 0,
    north: 0,
    continent: 0
  };
  const eastContinent = {
    west: iWidth / 2 + iOceanWaterColumns / 2,
    east: iWidth - iOceanWaterColumns / 2,
    south: 0,
    north: 0,
    continent: 0
  };
  function DiscoveryDiceRoller() {
    const randomthing = TerrainBuilder.getRandomNumber(100, "Discovery Type Roll");
    if (randomthing <= 65) {
      return DiscoveryActivationTypes.BASIC;
    } else if (randomthing <= 100) {
      return DiscoveryActivationTypes.INVESTIGATION;
    } else {
      return DiscoveryActivationTypes.MYTHIC;
    }
  }
  function DiscoveryVisualString(numb) {
    switch (numb) {
      case DiscoveryVisualTypes.IMPROVEMENT_CAVE:
        return "Cave";
      case DiscoveryVisualTypes.IMPROVEMENT_RUINS:
        return "Ruins";
      case DiscoveryVisualTypes.IMPROVEMENT_CAMPFIRE:
        return "Campfire";
      case DiscoveryVisualTypes.IMPROVEMENT_TENTS:
        return "Tents";
      case DiscoveryVisualTypes.IMPROVEMENT_CAIRN:
        return "Cairn";
      case DiscoveryVisualTypes.IMPROVEMENT_RICH:
        return "Rich";
      case DiscoveryVisualTypes.IMPROVEMENT_WRECKAGE:
        return "Wreckage";
      default:
        return "";
    }
  }
  function DiscoveryTypeString(numb) {
    switch (numb) {
      case DiscoveryActivationTypes.BASIC:
        return "Basic";
      case DiscoveryActivationTypes.INVESTIGATION:
        return "Investigation";
      default:
        return "Unknown";
    }
  }
  function AllowedDiscoveryVisual(numb) {
    switch (numb) {
      case DiscoveryVisualTypes.IMPROVEMENT_CAVE:
      case DiscoveryVisualTypes.IMPROVEMENT_RUINS:
      case DiscoveryVisualTypes.IMPROVEMENT_CAMPFIRE:
      case DiscoveryVisualTypes.IMPROVEMENT_TENTS:
      case DiscoveryVisualTypes.IMPROVEMENT_CAIRN:
      case DiscoveryVisualTypes.IMPROVEMENT_RICH:
      case DiscoveryVisualTypes.IMPROVEMENT_WRECKAGE:
        return true;
      default:
        return false;
    }
  }
  function AllowedDiscoveryVisualExploration(numb) {
    switch (numb) {
      case DiscoveryVisualTypes.IMPROVEMENT_CAVE:
      case DiscoveryVisualTypes.IMPROVEMENT_RUINS:
      case DiscoveryVisualTypes.IMPROVEMENT_TENTS:
      case DiscoveryVisualTypes.IMPROVEMENT_CAIRN:
      case DiscoveryVisualTypes.IMPROVEMENT_RICH:
      case DiscoveryVisualTypes.IMPROVEMENT_WRECKAGE:
        return true;
      default:
        return false;
    }
  }
  console.log("counting");
  console.log(DiscoveryVisualTypes.IMPROVEMENT_CAVE);
  const basicsMap = [];
  const investigationMap = [];
  if (Game.age == Database.makeHash("AGE_EXPLORATION")) {
    GameInfo.DiscoverySiftingImprovements.forEach((discoverySift) => {
      if (AllowedDiscoveryVisualExploration(Database.makeHash(discoverySift.ConstructibleType))) {
        const amount = GameInfo.NarrativeStories.filter((def) => def.Queue == discoverySift.QueueType).length;
        if (amount > 0) {
          if (discoverySift.Activation === "BASIC") {
            basicsMap.push([Database.makeHash(discoverySift.ConstructibleType), amount]);
          } else if (discoverySift.Activation === "INVESTIGATION") {
            investigationMap.push([Database.makeHash(discoverySift.ConstructibleType), amount]);
          }
        }
      }
    });
  } else {
    GameInfo.DiscoverySiftingImprovements.forEach((discoverySift) => {
      if (AllowedDiscoveryVisual(Database.makeHash(discoverySift.ConstructibleType))) {
        const amount = GameInfo.NarrativeStories.filter((def) => def.Queue == discoverySift.QueueType).length;
        if (amount > 0) {
          if (discoverySift.Activation === "BASIC") {
            basicsMap.push([Database.makeHash(discoverySift.ConstructibleType), amount]);
          } else if (discoverySift.Activation === "INVESTIGATION") {
            investigationMap.push([Database.makeHash(discoverySift.ConstructibleType), amount]);
          }
        }
      }
    });
  }
  console.log("poisson number?: " + poisson);
  for (let iY = iHeight - 1; iY >= 0; iY--) {
    for (let iX = 0; iX < iWidth; iX++) {
      const index = iY * iWidth + iX;
      if (poisson[index] >= 1) {
        const iLocation = GameplayMap.getLocationFromIndex(index);
        const terrainType = GameplayMap.getTerrainType(iX, iY);
        if (startingPositions.length > 0) {
          distanceToClosestStart = getDistanceToClosestStart(
            iX,
            iY,
            startingPositions.length,
            startingPositions
          );
          if (distanceToClosestStart < g_RequiredDistanceFromMajorForDiscoveries) {
            continue;
          }
        } else {
          const owner = GameplayMap.getOwner(iX, iY);
          if (owner != PlayerIds.NO_PLAYER) {
            console.log(
              "Can't Place Discovery, tile already owned: ",
              "X=" + iLocation.x + " Y=" + iLocation.y
            );
            continue;
          }
        }
        if (GameplayMap.isImpassable(iX, iY)) {
          continue;
        }
        if (GameplayMap.isNavigableRiver(iX, iY)) {
          continue;
        }
        const resourceAtThisLocal = GameplayMap.getResourceType(iX, iY);
        if (resourceAtThisLocal !== -1) {
          continue;
        }
        if (GameplayMap.isNaturalWonder(iX, iY)) {
          continue;
        }
        if (terrainType === g_CoastTerrain && TerrainBuilder.getRandomNumber(100, "Coast Check") >= 65) {
          const discoveryType2 = DiscoveryDiceRoller();
          discoveryCounter++;
          if (MapConstructibles.addDiscovery(iX, iY, DiscoveryVisualTypes.IMPROVEMENT_COAST, discoveryType2)) {
            discoveryPlacedCounter++;
            console.log("Discovery #", discoveryCounter);
            console.log(
              "VALID coastal DISCOVERY SPOT FOUND!-------------------------------------",
              "X=" + iLocation.x + " Y=" + iLocation.y
            );
            continue;
          } else {
            ++totalCoastalDiscoveryNotPlaced;
            console.log("did not place COASTAL Discovery#: " + discoveryCounter);
            continue;
          }
        }
        if (terrainType === g_OceanTerrain) {
          if (Game.age == Database.makeHash("AGE_EXPLORATION") && TerrainBuilder.getRandomNumber(100, "Coast Check") >= 65) {
            if (iX < westContinent.west || iX > westContinent.east && iX < eastContinent.west || iX > eastContinent.east) {
              const discoveryType2 = DiscoveryDiceRoller();
              discoveryCounter++;
              if (MapConstructibles.addDiscovery(
                iX,
                iY,
                DiscoveryVisualTypes.IMPROVEMENT_SHIPWRECK,
                discoveryType2
              )) {
                discoveryPlacedCounter++;
                oceanDiscoveryCounter++;
                console.log("Discovery #", discoveryCounter);
                console.log(
                  "VALID coastal DISCOVERY SPOT FOUND!-------------------------------------",
                  "X=" + iLocation.x + " Y=" + iLocation.y
                );
                continue;
              } else {
                ++totalOceanDiscoveryNotPlaced;
                console.log("did not place OCEAN discovery#: " + discoveryCounter);
                continue;
              }
            }
          }
        }
        if (GameplayMap.isWater(iX, iY)) {
          continue;
        }
        discoveryCounter++;
        const discoveryType = DiscoveryDiceRoller();
        const discoveryTypeString = DiscoveryTypeString(discoveryType);
        let discoveryHash = DiscoveryVisualTypes.INVALID;
        let visualIndex = -1;
        if (discoveryType == DiscoveryActivationTypes.BASIC) {
          if (basicsMap.length > 0) {
            visualIndex = TerrainBuilder.getRandomNumber(basicsMap.length, "Discovery roll");
            discoveryHash = basicsMap[visualIndex][0];
          }
        } else {
          if (investigationMap.length > 0) {
            visualIndex = TerrainBuilder.getRandomNumber(investigationMap.length, "Discovery roll");
            discoveryHash = investigationMap[visualIndex][0];
          }
        }
        const discoveryVisual = DiscoveryVisualString(discoveryHash);
        if (discoveryHash == DiscoveryVisualTypes.INVALID) {
          console.log(
            "Could not find available discovery: ",
            discoveryTypeString,
            "Discovery#: ",
            discoveryCounter
          );
          continue;
        }
        if (Game.age == Database.makeHash("AGE_EXPLORATION")) {
          console.log("in exploration age");
          console.log("Discovery #", discoveryCounter);
          console.log(
            "VALID DISCOVERY SPOT FOUND-------------------------------------",
            "X=" + iLocation.x + " Y=" + iLocation.y + "  Type: " + discoveryVisual
          );
          if (MapConstructibles.addDiscovery(iX, iY, discoveryHash, discoveryType)) {
            if (discoveryType == DiscoveryActivationTypes.BASIC) {
              --basicsMap[visualIndex][1];
              if (basicsMap[visualIndex][1] < 1) {
                console.log("No more ", discoveryTypeString, discoveryVisual);
                basicsMap.splice(visualIndex, 1);
              }
            } else {
              --investigationMap[visualIndex][1];
              if (investigationMap[visualIndex][1] < 1) {
                console.log("No more ", discoveryTypeString, discoveryVisual);
                investigationMap.splice(visualIndex, 1);
              }
            }
            discoveryPlacedCounter++;
            const discoveryX = iX;
            const discoveryY = iY;
            console.log(discoveryX, discoveryY, discoveryVisual, discoveryTypeString);
          } else {
            console.log(
              "did not place discovery#: " + discoveryCounter + " discovery visual: " + discoveryVisual + " discovery type: " + discoveryTypeString
            );
          }
        } else {
          console.log("in antiquity age");
          console.log("Discovery #", discoveryCounter);
          console.log(
            "VALID DISCOVERY SPOT FOUND-------------------------------------",
            "X=" + iLocation.x + " Y=" + iLocation.y + "  Type: " + discoveryVisual
          );
          if (MapConstructibles.addDiscovery(iX, iY, discoveryHash, discoveryType)) {
            if (discoveryType == DiscoveryActivationTypes.BASIC) {
              --basicsMap[visualIndex][1];
              if (basicsMap[visualIndex][1] < 1) {
                console.log("No more ", discoveryTypeString, discoveryVisual);
                basicsMap.splice(visualIndex, 1);
              }
            } else {
              --investigationMap[visualIndex][1];
              if (investigationMap[visualIndex][1] < 1) {
                console.log("No more ", discoveryTypeString, discoveryVisual);
                investigationMap.splice(visualIndex, 1);
              }
            }
            discoveryPlacedCounter++;
            const discoveryX = iX;
            const discoveryY = iY;
            console.log(discoveryX, discoveryY, discoveryVisual, discoveryTypeString);
          } else {
            console.log(
              "did not place discovery#: " + discoveryCounter + " discovery visual: " + discoveryVisual + " discovery type: " + discoveryTypeString
            );
          }
        }
      }
    }
  }
  console.log("Basics: ");
  for (const [key, value] of basicsMap) {
    console.log(key, "->", value);
  }
  console.log("investigations: ");
  for (const [key, value] of investigationMap) {
    console.log(key, "->", value);
  }
  console.log("Total Discoveries Placed: " + discoveryPlacedCounter);
  console.log("Total ocean Discoveries Placed: " + oceanDiscoveryCounter);
  console.log("Total Coastal Discoveries Not Placed: " + totalCoastalDiscoveryNotPlaced);
  console.log("Total Ocean Discoveries Not Placed: " + totalOceanDiscoveryNotPlaced);
  console.log("could not place this many discoveries: " + (discoveryCounter - discoveryPlacedCounter));
}

export { generateDiscoveries };
//# sourceMappingURL=discovery-generator.js.map
