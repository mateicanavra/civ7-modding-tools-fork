// Epic Diverse Huge Map Generator
/**
 * Custom map script - Produces diverse terrain with cliffs, inland lakes, 
 * coastal regions, mountains, jungle, tundra, and all biome variety on huge maps.
 * @packageDocumentation
 */
console.log("Loading Epic Diverse Huge Map Generator");

import { assignStartPositions, chooseStartSectors } from '/base-standard/maps/assign-starting-plots.js';
import { addMountains, addHills, expandCoasts, buildRainfallMap, generateLakes } from '/base-standard/maps/elevation-terrain-generator.js';
import { addFeatures, designateBiomes } from '/base-standard/maps/feature-biome-generator.js';
import * as globals from '/base-standard/maps/map-globals.js';
import * as utilities from '/base-standard/maps/map-utilities.js';
import { addNaturalWonders } from '/base-standard/maps/natural-wonder-generator.js';
import { generateResources } from '/base-standard/maps/resource-generator.js';
import { addVolcanoes } from '/base-standard/maps/volcano-generator.js';
import { assignAdvancedStartRegions } from '/base-standard/maps/assign-advanced-start-region.js';
import { generateDiscoveries } from '/base-standard/maps/discovery-generator.js';
import { generateSnow } from '/base-standard/maps/snow-generator.js';
import { dumpStartSectors } from '/base-standard/maps/map-debug-helpers.js';

function requestMapData(initParams) {
    console.log("=== EPIC DIVERSE HUGE GENERATOR STARTING ===");
    console.log(`Map dimensions: ${initParams.width} x ${initParams.height}`);
    console.log(`Latitude range: ${initParams.bottomLatitude} to ${initParams.topLatitude}`);
    
    // Log to external monitoring system via console (for communication bridge)
    // console.log("EPIC_MAP_GEN_START|" + JSON.stringify({
    //     width: initParams.width,
    //     height: initParams.height,
    //     timestamp: Date.now(),
    //     mapSize: initParams.mapSize
    // }));

    engine.call("SetMapInitData", initParams);
}

function generateMap() {
    console.log("Generating Epic Diverse Map with maximum terrain variety!");

    let iWidth = GameplayMap.getGridWidth();
    let iHeight = GameplayMap.getGridHeight();
    let uiMapSize = GameplayMap.getMapSize();
    let startPositions = [];

    let mapInfo = GameInfo.Maps.lookup(uiMapSize);
    if (mapInfo == null) return;

let iNumNaturalWonders = Math.max(mapInfo.NumNaturalWonders + 1, mapInfo.NumNaturalWonders);
let iTilesPerLake = Math.max(10, mapInfo.LakeGenerationFrequency * 2); // fewer lakes than base script used
    let iNumPlayers1 = mapInfo.PlayersLandmass1;
    let iNumPlayers2 = mapInfo.PlayersLandmass2;
    let iStartSectorRows = mapInfo.StartSectorRows;
    let iStartSectorCols = mapInfo.StartSectorCols;

    // Set up start sectors first (before terrain generation)
    let bHumanNearEquator = utilities.needHumanNearEquator();
    let startSectors = chooseStartSectors(iNumPlayers1, iNumPlayers2, iStartSectorRows, iStartSectorCols, bHumanNearEquator);
    console.log("Start sectors chosen successfully");

    // Create continent boundaries for start position assignment (simplified for compatibility)
    let westContinent = {
        west: globals.g_AvoidSeamOffset,
        east: (iWidth / 2) - globals.g_AvoidSeamOffset,
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0
    };
    
    let eastContinent = {
        west: (iWidth / 2) + globals.g_AvoidSeamOffset,
        east: iWidth - globals.g_AvoidSeamOffset,
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0
    };
    
    // Create more complex continent boundaries for our diverse terrain generation
    // Increase ocean columns so there is true ocean on the sides and between land bands
    let iOceanWaterColumns = Math.floor(globals.g_OceanWaterColumns * 1.1);
    
// Landmass approach – 3 vertical bands, slightly narrower to widen oceans
let landmass1 = {
        west: Math.floor(iOceanWaterColumns),
        east: Math.floor(iWidth * 0.25) - Math.floor(iOceanWaterColumns * 0.5),
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0
    };
    
    let landmass2 = {
        west: Math.floor(iWidth * 0.38) + Math.floor(iOceanWaterColumns * 0.35),
        east: Math.floor(iWidth * 0.62) - Math.floor(iOceanWaterColumns * 0.35),
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 1
    };
    
    let landmass3 = {
        west: Math.floor(iWidth * 0.75) + Math.floor(iOceanWaterColumns * 0.5),
        east: iWidth - Math.floor(iOceanWaterColumns),
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 2
    };

    // Generate landmasses without creating a hard horizontal ocean band
    createDiverseLandmasses(iWidth, iHeight, [landmass1, landmass2, landmass3]);
    
    TerrainBuilder.validateAndFixTerrain();
    expandCoasts(iWidth, iHeight);

    // Add post-processing to make coasts more rugged and place a few islands
    addRuggedCoasts(iWidth, iHeight);
    addIslandChains(iWidth, iHeight);
    
    // Remove aggressive cliff systems for playability
    
    AreaBuilder.recalculateAreas();
    TerrainBuilder.stampContinents();
    
// Mountains – use base generator only (fewer peaks)
    addMountains(iWidth, iHeight);
    addVolcanoes(iWidth, iHeight);
    
    // Lakes – fewer than before
    generateLakes(iWidth, iHeight, iTilesPerLake);
    
    AreaBuilder.recalculateAreas();
    TerrainBuilder.buildElevation();
    addHills(iWidth, iHeight);
    
// Create moderated rainfall patterns (keep enhanced but gentle)
    buildEnhancedRainfall(iWidth, iHeight);
    
    // Rivers – closer to base values for balance
    TerrainBuilder.modelRivers(5, 15, globals.g_NavigableRiverTerrain);
    TerrainBuilder.validateAndFixTerrain();
    TerrainBuilder.defineNamedRivers();

    // Refine rainfall with earthlike dynamics after rivers exist
    refineRainfallEarthlike(iWidth, iHeight);
    
    // Enhanced biome diversity
    designateEnhancedBiomes(iWidth, iHeight);
    
addNaturalWonders(iWidth, iHeight, iNumNaturalWonders);
    TerrainBuilder.addFloodplains(4, 10);
    
    // Add extensive feature variety
    addDiverseFeatures(iWidth, iHeight);
    
    TerrainBuilder.validateAndFixTerrain();
    AreaBuilder.recalculateAreas();
    TerrainBuilder.storeWaterData();
    generateSnow(iWidth, iHeight);

// Debug output (kept disabled for performance)
    // dumpContinents(iWidth, iHeight);
    // dumpTerrain(iWidth, iHeight);
    // dumpElevation(iWidth, iHeight);
    // dumpRainfall(iWidth, iHeight);
    // dumpBiomes(iWidth, iHeight);
    // dumpFeatures(iWidth, iHeight);

    generateResources(iWidth, iHeight);
    
    // Assign start positions using proper method like working mod
    console.log("Assigning start positions using proper method...");
    try {
        startPositions = assignStartPositions(iNumPlayers1, iNumPlayers2, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors);
        console.log("Start positions assigned successfully");
    } catch (error) {
        console.log("Error in start position assignment: " + error);
        startPositions = [];
    }
    
    // Generate discoveries for exploration
    try {
        generateDiscoveries(iWidth, iHeight, startPositions);
        console.log("Discoveries generated successfully");
    } catch (error) {
        console.log("Error generating discoveries: " + error);
    }

    // dumpResources(iWidth, iHeight); // COMMENTED OUT TO PREVENT CRASHES

    FertilityBuilder.recalculate();

    // Noise generation for additional texture - COMMENTED OUT TO PREVENT CRASHES
    // let seed = GameplayMap.getRandomSeed();
    // let avgDistanceBetweenPoints = 2; // Denser features
    // let normalizedRangeSmoothing = 3;
    // let poisson = TerrainBuilder.generatePoissonMap(seed, avgDistanceBetweenPoints, normalizedRangeSmoothing);
    // let poissonPred = function(val) {
    //     return val >= 1.5 ? "#" : val >= 1 ? "*" : val >= 0.5 ? "." : " ";
    // };
    // dumpNoisePredicate(iWidth, iHeight, poisson, poissonPred);

    assignAdvancedStartRegions();
    
    // Log completion with statistics
    // console.log("EPIC_MAP_GEN_COMPLETE|" + JSON.stringify({
    //     timestamp: Date.now(),
    //     naturalWonders: iNumNaturalWonders,
    //     lakeDensity: iTilesPerLake,
    //     biomeVariety: "maximum"
    // }));
    
    console.log("=== EPIC DIVERSE HUGE GENERATOR COMPLETED ===");
}

function createDiverseLandmasses(iWidth, iHeight, landmasses) {
    // Single fractal with higher water level to ensure real oceans and coasts
    FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, 3, 0);
    // Auxiliary fractal to wiggle band edges by row and add irregularity
    FractalBuilder.create(globals.g_HillFractal, iWidth, iHeight, 4, 0);
    let iWaterHeight = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, 64);

    const jitterAmp = Math.max(2, Math.floor(iWidth * 0.03));

    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = globals.g_OceanTerrain;

            // Check if this tile should be land based on landmass boundaries
            let inLandmass = false;
            for (let landmass of landmasses) {
                // Apply a per-row horizontal shift and slight width change to avoid straight columns
                let sinOffset = Math.floor(Math.sin((iY + (landmass.continent * 13)) * 0.25) * jitterAmp);
                let noise = FractalBuilder.getHeight(globals.g_HillFractal, iX, iY);
                noise = Math.floor(((noise % 200) / 200 - 0.5) * jitterAmp);
                let shift = sinOffset + Math.floor(noise * 0.5);
                let widthDelta = Math.floor(noise * 0.3);
                let westY = Math.max(0, Math.min(iWidth - 1, landmass.west + shift + widthDelta));
                let eastY = Math.max(0, Math.min(iWidth - 1, landmass.east + shift - widthDelta));

                if (iX >= westY && iX <= eastY && 
                    iY >= landmass.south && iY <= landmass.north) {
                    
                    // Use fractal to determine if this specific plot should be land
                    let iPlotHeight = FractalBuilder.getHeight(globals.g_LandmassFractal, iX, iY);
                    
                    // Bias toward land near center of landmass
                    let centerX = (landmass.west + landmass.east) / 2;
                    let centerY = (landmass.south + landmass.north) / 2;
                    let distanceFromCenter = Math.sqrt((iX - centerX) ** 2 + (iY - centerY) ** 2);
                    let maxDistance = Math.sqrt(((landmass.east - landmass.west) / 2) ** 2 + ((landmass.north - landmass.south) / 2) ** 2);
let centerBonus = Math.max(0, (1 - (distanceFromCenter / maxDistance)) * 110);
                    
                    if (iPlotHeight + centerBonus >= iWaterHeight) {
                        terrain = globals.g_FlatTerrain;
                        inLandmass = true;
                        break;
                    }
                }
            }

            TerrainBuilder.setTerrainType(iX, iY, terrain);
        }
    }
}


function addRuggedCoasts(iWidth, iHeight) {
    // Carve bays and peninsulas along existing coastlines using hill fractal as noise
    FractalBuilder.create(globals.g_HillFractal, iWidth, iHeight, 4, 0);

    for (let iY = 1; iY < iHeight - 1; iY++) {
        for (let iX = 1; iX < iWidth - 1; iX++) {
            // Occasionally turn shallow coast land into shallow water to create bays
            if (GameplayMap.isCoastalLand(iX, iY)) {
                let h = FractalBuilder.getHeight(globals.g_HillFractal, iX, iY);
                if (h % 97 < 2 && TerrainBuilder.getRandomNumber(5, "Carve Bay") === 0) {
                    TerrainBuilder.setTerrainType(iX, iY, globals.g_CoastTerrain);
                }
            }
            // Occasionally convert adjacent ocean to coast to create peninsulas/fjords
            if (GameplayMap.isWater(iX, iY)) {
                // Check if adjacent to land (approximate "deep" water by not being shallow coast already)
                if (isAdjacentToLand(iX, iY, 1)) {
                    if (TerrainBuilder.getRandomNumber(12, "Fjord Coast") === 0) {
                        TerrainBuilder.setTerrainType(iX, iY, globals.g_CoastTerrain);
                    }
                }
            }
        }
    }
}

function addIslandChains(iWidth, iHeight) {
    // Use mountain fractal as a sparse mask to create island seeds out at sea
    FractalBuilder.create(globals.g_MountainFractal, iWidth, iHeight, 5, 0);
    let threshold = FractalBuilder.getHeightFromPercent(globals.g_MountainFractal, 92);

    for (let iY = 2; iY < iHeight - 2; iY++) {
        for (let iX = 2; iX < iWidth - 2; iX++) {
            if (GameplayMap.isWater(iX, iY)) {
                // Prefer tiles that are not immediately adjacent to land (keep sea lanes open)
                if (!isAdjacentToLand(iX, iY, 2)) {
                    let v = FractalBuilder.getHeight(globals.g_MountainFractal, iX, iY);
                    if (v > threshold && TerrainBuilder.getRandomNumber(8, "Island Seed") === 0) {
                        // Create a tiny island cluster (1–3 coast tiles)
                        TerrainBuilder.setTerrainType(iX, iY, globals.g_CoastTerrain);
                        let count = 1 + TerrainBuilder.getRandomNumber(3, "Island Size");
                        for (let n = 0; n < count; n++) {
                            let dx = (TerrainBuilder.getRandomNumber(3, "dx") - 1);
                            let dy = (TerrainBuilder.getRandomNumber(3, "dy") - 1);
                            let nx = iX + dx, ny = iY + dy;
                            if (nx > 0 && nx < iWidth && ny > 0 && ny < iHeight) {
                                if (GameplayMap.isWater(nx, ny)) {
                                    TerrainBuilder.setTerrainType(nx, ny, globals.g_CoastTerrain);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

function buildEnhancedRainfall(iWidth, iHeight) {
    console.log("Building enhanced rainfall patterns...");
    
    // Start with the base rainfall so we keep vanilla assumptions
    buildRainfallMap(iWidth, iHeight);
    
    // Apply climate bands: wet equator, dry subtropics, temperate mid-lats, dry poles
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            if (!GameplayMap.isWater(iX, iY)) {
                let base = GameplayMap.getRainfall(iX, iY);
                let elevation = GameplayMap.getElevation(iX, iY);
                let lat = Math.abs(GameplayMap.getPlotLatitude(iX, iY)); // 0 at equator, 90 at poles
                
                // Climate band target rainfall
                // Equator (0-10): very wet; 10-20: wet; 20-35: temperate-dry; 35-55: temperate; 55-70: cool but not barren; 70+: cold/dry
                let bandRain = 0;
                if (lat < 10) bandRain = 115;
                else if (lat < 20) bandRain = 100;
                else if (lat < 35) bandRain = 75;
                else if (lat < 55) bandRain = 70;
                else if (lat < 70) bandRain = 60;
                else bandRain = 45;
                
                // Blend base with band target (lean a bit more on the base map to keep variety)
                let currentRainfall = Math.round((base * 0.6) + (bandRain * 0.4));
                
                // Orographic effects: mountains add rain at higher elevations
                if (elevation > 350) currentRainfall += 8;
                if (elevation > 600) currentRainfall += 7;
                
                // Local water humidity
                if (GameplayMap.isCoastalLand(iX, iY)) currentRainfall += 18;
                if (GameplayMap.isAdjacentToShallowWater(iX, iY)) currentRainfall += 12;
                
                // Light noise to avoid hard bands
                currentRainfall += TerrainBuilder.getRandomNumber(6, "Rain Noise") - 3;
                
                TerrainBuilder.setRainfall(iX, iY, Math.max(0, Math.min(200, currentRainfall)));
            }
        }
    }
}

// Additional realistic refinements applied after rivers are generated
function refineRainfallEarthlike(iWidth, iHeight) {
    // Precompute for clamping
    const clamp = (v) => Math.max(0, Math.min(200, v));

    // Pass A: coastal and lake humidity gradient (decays with distance up to 4)
    const maxR = 4;
    for (let y = 0; y < iHeight; y++) {
        for (let x = 0; x < iWidth; x++) {
            if (GameplayMap.isWater(x, y)) continue;
            let dist = distanceToNearestWater(x, y, maxR);
            if (dist >= 0) {
                // Closer to water -> more humidity; stronger if also low elevation
                let elev = GameplayMap.getElevation(x, y);
                let bonus = Math.max(0, (maxR - dist)) * 4;
                if (elev < 150) bonus += 2;
                let rf = GameplayMap.getRainfall(x, y);
                TerrainBuilder.setRainfall(x, y, clamp(rf + bonus));
            }
        }
    }

    // Pass B: orographic rain shadows with latitude-dependent prevailing winds
    for (let y = 0; y < iHeight; y++) {
        for (let x = 0; x < iWidth; x++) {
            if (GameplayMap.isWater(x, y)) continue;
            let lat = Math.abs(GameplayMap.getPlotLatitude(x, y));
            // Trade winds (0-30): E->W; Westerlies (30-60): W->E; Polar easterlies (60+): E->W
            let dx = (lat < 30 || lat >= 60) ? -1 : 1;
            let dy = 0; // simplify: zonal winds
            let barrier = hasUpwindBarrier(x, y, dx, dy, 4);
            if (barrier) {
                let strength = barrier; // 1..4
                let rf = GameplayMap.getRainfall(x, y);
                let reduction = 8 + strength * 6; // 14..32
                TerrainBuilder.setRainfall(x, y, clamp(rf - reduction));
            }
        }
    }

    // Pass C: river corridor greening and basin humidity
    for (let y = 0; y < iHeight; y++) {
        for (let x = 0; x < iWidth; x++) {
            if (GameplayMap.isWater(x, y)) continue;
            let rf = GameplayMap.getRainfall(x, y);
            let elev = GameplayMap.getElevation(x, y);
            if (GameplayMap.isAdjacentToRivers(x, y, 1)) {
                rf += (elev < 250) ? 14 : 10;
            }
            // Slight wetness in enclosed low basins (surrounded by higher elevation in radius 2)
            let lowBasin = true;
            for (let dy2 = -2; dy2 <= 2 && lowBasin; dy2++) {
                for (let dx2 = -2; dx2 <= 2; dx2++) {
                    if (dx2 === 0 && dy2 === 0) continue;
                    let nx = x + dx2, ny = y + dy2;
                    if (nx >= 0 && nx < iWidth && ny >= 0 && ny < iHeight) {
                        if (GameplayMap.getElevation(nx, ny) < elev + 20) { lowBasin = false; break; }
                    }
                }
            }
            if (lowBasin && elev < 200) rf += 6;
            TerrainBuilder.setRainfall(x, y, clamp(rf));
        }
    }
}

function distanceToNearestWater(x, y, maxR) {
    for (let r = 1; r <= maxR; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx === 0 && dy === 0) continue;
                let nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < GameplayMap.getGridWidth() && ny >= 0 && ny < GameplayMap.getGridHeight()) {
                    if (GameplayMap.isWater(nx, ny)) return r;
                }
            }
        }
    }
    return -1;
}

function hasUpwindBarrier(x, y, dx, dy, steps) {
    // Returns number of steps to first barrier (mountain or steep elevation), or 0 if none
    let width = GameplayMap.getGridWidth();
    let height = GameplayMap.getGridHeight();
    for (let s = 1; s <= steps; s++) {
        let nx = x + dx * s, ny = y + dy * s;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;
        if (!GameplayMap.isWater(nx, ny)) {
            if (GameplayMap.isMountain && GameplayMap.isMountain(nx, ny)) return s;
            let elev = GameplayMap.getElevation(nx, ny);
            if (elev >= 500) return s;
        }
    }
    return 0;
}

function designateEnhancedBiomes(iWidth, iHeight) {
    console.log("Creating enhanced biome diversity (climate-aware)...");
    
    // Start with base biomes so the engine sets deserts/jungle from our rainfall bands
    designateBiomes(iWidth, iHeight);
    
    // Apply light, logical tweaks only where it clearly helps
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            if (!GameplayMap.isWater(iX, iY)) {
                let lat = Math.abs(GameplayMap.getPlotLatitude(iX, iY));
                let elevation = GameplayMap.getElevation(iX, iY);
                let rainfall = GameplayMap.getRainfall(iX, iY);
                
                // Force tundra only at very high latitudes or extreme elevations and low rainfall
                if ((lat > 70 || elevation > 850) && rainfall < 90) {
                    TerrainBuilder.setBiomeType(iX, iY, globals.g_TundraBiome);
                    continue;
                }
                
                // Encourage tropical biome on wet, warm coasts near the equator
                if (lat < 18 && GameplayMap.isCoastalLand(iX, iY) && rainfall > 105) {
                    TerrainBuilder.setBiomeType(iX, iY, globals.g_TropicalBiome);
                }
                
                // River valleys in warm/temperate zones trend grassland for playability
                if (GameplayMap.isAdjacentToRivers(iX, iY, 1) && rainfall > 75 && lat < 50) {
                    TerrainBuilder.setBiomeType(iX, iY, globals.g_GrasslandBiome);
                }
            }
        }
    }
}

function addDiverseFeatures(iWidth, iHeight) {
    console.log("Adding diverse terrain features...");
    
    // Call standard feature generation
    addFeatures(iWidth, iHeight);
    
    // Add extra feature density in specific biomes
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            if (!GameplayMap.isWater(iX, iY) && GameplayMap.getFeatureType(iX, iY) == FeatureTypes.NO_FEATURE) {
                let biome = GameplayMap.getBiomeType(iX, iY);
                let elevation = GameplayMap.getElevation(iX, iY);
                let rainfall = GameplayMap.getRainfall(iX, iY);
                
                // Enhanced jungle in tropical high-rainfall areas
                if (biome == globals.g_TropicalBiome && rainfall > 140) {
                    if (TerrainBuilder.getRandomNumber(100, "Extra Jungle") < 40) {
                        let featureParam = { Feature: getFeatureTypeIndex("FEATURE_RAINFOREST"), Direction: -1, Elevation: 0 };
                        if (TerrainBuilder.canHaveFeature(iX, iY, featureParam.Feature)) {
                            TerrainBuilder.setFeatureType(iX, iY, featureParam);
                        }
                    }
                }
                
                // Enhanced forests in temperate areas
                if (biome == globals.g_GrasslandBiome && rainfall > 100) {
                    if (TerrainBuilder.getRandomNumber(100, "Extra Forest") < 30) {
                        let featureParam = { Feature: getFeatureTypeIndex("FEATURE_FOREST"), Direction: -1, Elevation: 0 };
                        if (TerrainBuilder.canHaveFeature(iX, iY, featureParam.Feature)) {
                            TerrainBuilder.setFeatureType(iX, iY, featureParam);
                        }
                    }
                }
                
                // Taiga in cold areas
                if (biome == globals.g_TundraBiome && elevation < 300) {
                    if (TerrainBuilder.getRandomNumber(100, "Extra Taiga") < 35) {
                        let featureParam = { Feature: getFeatureTypeIndex("FEATURE_TAIGA"), Direction: -1, Elevation: 0 };
                        if (TerrainBuilder.canHaveFeature(iX, iY, featureParam.Feature)) {
                            TerrainBuilder.setFeatureType(iX, iY, featureParam);
                        }
                    }
                }
            }
        }
    }
}

function isAdjacentToLand(iX, iY, radius) {
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx === 0 && dy === 0) continue;
            let nx = iX + dx, ny = iY + dy;
            if (nx >= 0 && nx < GameplayMap.getGridWidth() && ny >= 0 && ny < GameplayMap.getGridHeight()) {
                if (!GameplayMap.isWater(nx, ny)) return true;
            }
        }
    }
    return false;
}

function getFeatureTypeIndex(name) {
    let def = GameInfo.Features.lookup(name);
    if (def) {
        return def.$index;
    }
    return -1;
}


// Register listeners
engine.on('RequestMapInitData', requestMapData);
engine.on('GenerateMap', generateMap);

console.log("Epic Diverse Huge Map Generator loaded and ready!");
