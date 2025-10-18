const g_MountainTerrain = GameInfo.Terrains.find(
  (t) => t.TerrainType == "TERRAIN_MOUNTAIN"
).$index;
const g_HillTerrain = GameInfo.Terrains.find((t) => t.TerrainType == "TERRAIN_HILL").$index;
const g_FlatTerrain = GameInfo.Terrains.find((t) => t.TerrainType == "TERRAIN_FLAT").$index;
const g_CoastTerrain = GameInfo.Terrains.find((t) => t.TerrainType == "TERRAIN_COAST").$index;
const g_OceanTerrain = GameInfo.Terrains.find((t) => t.TerrainType == "TERRAIN_OCEAN").$index;
const g_NavigableRiverTerrain = GameInfo.Terrains.find(
  (t) => t.TerrainType == "TERRAIN_NAVIGABLE_RIVER"
).$index;
const g_TundraBiome = GameInfo.Biomes.find((t) => t.BiomeType == "BIOME_TUNDRA").$index;
const g_GrasslandBiome = GameInfo.Biomes.find((t) => t.BiomeType == "BIOME_GRASSLAND").$index;
const g_PlainsBiome = GameInfo.Biomes.find((t) => t.BiomeType == "BIOME_PLAINS").$index;
const g_TropicalBiome = GameInfo.Biomes.find((t) => t.BiomeType == "BIOME_TROPICAL").$index;
const g_DesertBiome = GameInfo.Biomes.find((t) => t.BiomeType == "BIOME_DESERT").$index;
const g_MarineBiome = GameInfo.Biomes.find((t) => t.BiomeType == "BIOME_MARINE").$index;
const g_VolcanoFeature = GameInfo.Features.find((t) => t.FeatureType == "FEATURE_VOLCANO").$index;
let temp;
let g_GrasslandLatitude = 0;
let g_PlainsLatitude = 0;
let g_DesertLatitude = 0;
let g_TropicalLatitude = 0;
temp = GameInfo.Biomes.find((t) => t.BiomeType == "BIOME_GRASSLAND").MaxLatitude;
if (temp) g_GrasslandLatitude = temp;
temp = GameInfo.Biomes.find((t) => t.BiomeType == "BIOME_PLAINS").MaxLatitude;
if (temp) g_PlainsLatitude = temp;
temp = GameInfo.Biomes.find((t) => t.BiomeType == "BIOME_DESERT").MaxLatitude;
if (temp) g_DesertLatitude = temp;
temp = GameInfo.Biomes.find((t) => t.BiomeType == "BIOME_TROPICAL").MaxLatitude;
if (temp) g_TropicalLatitude = temp;
const g_LandmassFractal = 0;
const g_MountainFractal = 1;
const g_HillFractal = 2;
const g_PolarWaterRows = 2;
const g_OceanWaterColumns = 4;
const g_FractalWeight = 0.8;
const g_WaterPercent = 20;
const g_IgnoreStartSectorPctFromCtr = 93;
const g_StartSectorWeight = 0.5;
const g_CenterWeight = 0.7;
const g_CenterExponent = 1.5;
const g_Cutoff = 2;
const g_AvoidSeamOffset = 2;
const g_IslandWidth = 5;
const g_StandardRainfall = 100;
const g_MountainTopIncrease = 100;
const g_RainShadowDrop = -80;
const g_RainShadowIncreasePerHex = 10;
const g_RequiredBufferBetweenMajorStarts = 6;
const g_DesiredBufferBetweenMajorStarts = 12;
const g_RequiredDistanceFromMajorForDiscoveries = 3;

export { g_AvoidSeamOffset, g_CenterExponent, g_CenterWeight, g_CoastTerrain, g_Cutoff, g_DesertBiome, g_DesertLatitude, g_DesiredBufferBetweenMajorStarts, g_FlatTerrain, g_FractalWeight, g_GrasslandBiome, g_GrasslandLatitude, g_HillFractal, g_HillTerrain, g_IgnoreStartSectorPctFromCtr, g_IslandWidth, g_LandmassFractal, g_MarineBiome, g_MountainFractal, g_MountainTerrain, g_MountainTopIncrease, g_NavigableRiverTerrain, g_OceanTerrain, g_OceanWaterColumns, g_PlainsBiome, g_PlainsLatitude, g_PolarWaterRows, g_RainShadowDrop, g_RainShadowIncreasePerHex, g_RequiredBufferBetweenMajorStarts, g_RequiredDistanceFromMajorForDiscoveries, g_StandardRainfall, g_StartSectorWeight, g_TropicalBiome, g_TropicalLatitude, g_TundraBiome, g_VolcanoFeature, g_WaterPercent };
//# sourceMappingURL=map-globals.js.map
