export var g_MountainTerrain: TerrainType = GameInfo.Terrains.find(t => t.TerrainType == 'TERRAIN_MOUNTAIN')!.$index;
export var g_HillTerrain: TerrainType = GameInfo.Terrains.find(t => t.TerrainType == 'TERRAIN_HILL')!.$index;
export var g_FlatTerrain: TerrainType = GameInfo.Terrains.find(t => t.TerrainType == 'TERRAIN_FLAT')!.$index;
export var g_CoastTerrain: TerrainType = GameInfo.Terrains.find(t => t.TerrainType == 'TERRAIN_COAST')!.$index;
export var g_OceanTerrain: TerrainType = GameInfo.Terrains.find(t => t.TerrainType == 'TERRAIN_OCEAN')!.$index;
export var g_NavigableRiverTerrain: TerrainType = GameInfo.Terrains.find(t => t.TerrainType == 'TERRAIN_NAVIGABLE_RIVER')!.$index;

export var g_TundraBiome: BiomeType = GameInfo.Biomes.find(t => t.BiomeType == 'BIOME_TUNDRA')!.$index;
export var g_GrasslandBiome: BiomeType = GameInfo.Biomes.find(t => t.BiomeType == 'BIOME_GRASSLAND')!.$index;
export var g_PlainsBiome: BiomeType = GameInfo.Biomes.find(t => t.BiomeType == 'BIOME_PLAINS')!.$index;
export var g_TropicalBiome: BiomeType = GameInfo.Biomes.find(t => t.BiomeType == 'BIOME_TROPICAL')!.$index;
export var g_DesertBiome: BiomeType = GameInfo.Biomes.find(t => t.BiomeType == 'BIOME_DESERT')!.$index;
export var g_MarineBiome: BiomeType = GameInfo.Biomes.find(t => t.BiomeType == 'BIOME_MARINE')!.$index;

export var g_VolcanoFeature: FeatureType = GameInfo.Features.find(t => t.FeatureType == 'FEATURE_VOLCANO')!.$index;

var temp;
export var g_GrasslandLatitude: number = 0;
export var g_PlainsLatitude: number = 0;
export var g_DesertLatitude: number = 0;
export var g_TropicalLatitude: number = 0;
temp = GameInfo.Biomes.find(t => t.BiomeType == 'BIOME_GRASSLAND')!.MaxLatitude;
if (temp) g_GrasslandLatitude = temp;
temp = GameInfo.Biomes.find(t => t.BiomeType == 'BIOME_PLAINS')!.MaxLatitude;
if (temp) g_PlainsLatitude = temp;
temp = GameInfo.Biomes.find(t => t.BiomeType == 'BIOME_DESERT')!.MaxLatitude;
if (temp) g_DesertLatitude = temp;
temp = GameInfo.Biomes.find(t => t.BiomeType == 'BIOME_TROPICAL')!.MaxLatitude;
if (temp) g_TropicalLatitude = temp;

// Global map parameters
export var g_LandmassFractal = 0;
export var g_MountainFractal = 1;
export var g_HillFractal = 2;

// Global continent map parameters
export var g_PolarWaterRows = 2;
export var g_OceanWaterColumns = 4;

// Tuning Parameters to adjust shape
export var g_FractalWeight = 0.8;
export var g_WaterPercent = 20;
export var g_IgnoreStartSectorPctFromCtr = 93;
export var g_StartSectorWeight = 0.5;
export var g_CenterWeight = 0.7;
export var g_CenterExponent = 1.5;      // Reduce to spread further from center
export var g_Cutoff = 2.0;    			// Should be sum of all weights above
export var g_AvoidSeamOffset = 2;
export var g_IslandWidth = 5;

// Rainfall and floodplain data
export var g_StandardRainfall = 100;
export var g_MountainTopIncrease = 100;
export var g_RainShadowDrop = -80;
export var g_RainShadowIncreasePerHex = 10;

// Start position data
export var g_RequiredBufferBetweenMajorStarts = 6;
export var g_DesiredBufferBetweenMajorStarts = 12;
export var g_RequiredDistanceFromMajorForDiscoveries = 3;