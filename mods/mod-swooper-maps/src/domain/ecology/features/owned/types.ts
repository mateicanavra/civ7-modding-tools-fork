export const FEATURE_PLACEMENT_KEYS = [
  "FEATURE_FOREST",
  "FEATURE_RAINFOREST",
  "FEATURE_TAIGA",
  "FEATURE_SAVANNA_WOODLAND",
  "FEATURE_SAGEBRUSH_STEPPE",
  "FEATURE_MARSH",
  "FEATURE_TUNDRA_BOG",
  "FEATURE_MANGROVE",
  "FEATURE_OASIS",
  "FEATURE_WATERING_HOLE",
  "FEATURE_REEF",
  "FEATURE_COLD_REEF",
  "FEATURE_ATOLL",
  "FEATURE_LOTUS",
  "FEATURE_ICE",
] as const;

export type FeaturePlacementKey = (typeof FEATURE_PLACEMENT_KEYS)[number];

export type FeaturesPlacementMode = "owned" | "vanilla";

export interface FeaturePlacementGroupConfig {
  enabled?: boolean;
  multiplier?: number;
}

export interface FeaturesPlacementGroupsConfig {
  vegetated?: FeaturePlacementGroupConfig;
  wet?: FeaturePlacementGroupConfig;
  aquatic?: FeaturePlacementGroupConfig;
  ice?: FeaturePlacementGroupConfig;
}

export interface FeaturesPlacementAtollConfig {
  enableClustering?: boolean;
  clusterRadius?: number;
  shallowWaterAdjacencyGateChance?: number;
  growthChanceEquatorial?: number;
  growthChanceNonEquatorial?: number;
}

export interface FeaturesPlacementAquaticConfig {
  reefLatitudeSplit?: number;
  atoll?: FeaturesPlacementAtollConfig;
}

export interface FeaturesPlacementIceConfig {
  minAbsLatitude?: number;
  forbidAdjacentToLand?: boolean;
  forbidAdjacentToNaturalWonders?: boolean;
}

export type FeaturesPlacementChances = Partial<Record<FeaturePlacementKey, number>>;

export interface FeaturesPlacementConfig {
  mode?: FeaturesPlacementMode;
  groups?: FeaturesPlacementGroupsConfig;
  chances?: FeaturesPlacementChances;
  aquatic?: FeaturesPlacementAquaticConfig;
  ice?: FeaturesPlacementIceConfig;
}

export interface ResolvedFeaturePlacementGroupConfig {
  enabled: boolean;
  multiplier: number;
}

export interface ResolvedFeaturesPlacementConfig {
  mode: FeaturesPlacementMode;
  groups: {
    vegetated: ResolvedFeaturePlacementGroupConfig;
    wet: ResolvedFeaturePlacementGroupConfig;
    aquatic: ResolvedFeaturePlacementGroupConfig;
    ice: ResolvedFeaturePlacementGroupConfig;
  };
  chances: Record<FeaturePlacementKey, number>;
  aquatic: Required<FeaturesPlacementAquaticConfig> & { atoll: Required<FeaturesPlacementAtollConfig> };
  ice: Required<FeaturesPlacementIceConfig>;
}

export const DEFAULT_FEATURE_PLACEMENT_CHANCES: Record<FeaturePlacementKey, number> = {
  FEATURE_FOREST: 50,
  FEATURE_RAINFOREST: 65,
  FEATURE_TAIGA: 50,
  FEATURE_SAVANNA_WOODLAND: 30,
  FEATURE_SAGEBRUSH_STEPPE: 30,
  FEATURE_MARSH: 30,
  FEATURE_TUNDRA_BOG: 30,
  FEATURE_MANGROVE: 30,
  FEATURE_OASIS: 50,
  FEATURE_WATERING_HOLE: 30,
  FEATURE_REEF: 30,
  FEATURE_COLD_REEF: 30,
  FEATURE_ATOLL: 12,
  FEATURE_LOTUS: 15,
  FEATURE_ICE: 90,
};

const DEFAULT_GROUPS: ResolvedFeaturesPlacementConfig["groups"] = {
  vegetated: { enabled: true, multiplier: 1 },
  wet: { enabled: true, multiplier: 1 },
  aquatic: { enabled: true, multiplier: 1 },
  ice: { enabled: true, multiplier: 1 },
};

const DEFAULT_ATOLL: Required<FeaturesPlacementAtollConfig> = {
  enableClustering: true,
  clusterRadius: 1,
  shallowWaterAdjacencyGateChance: 30,
  growthChanceEquatorial: 15,
  growthChanceNonEquatorial: 5,
};

const DEFAULT_AQUATIC: ResolvedFeaturesPlacementConfig["aquatic"] = {
  reefLatitudeSplit: 55,
  atoll: DEFAULT_ATOLL,
};

const DEFAULT_ICE: ResolvedFeaturesPlacementConfig["ice"] = {
  minAbsLatitude: 78,
  forbidAdjacentToLand: true,
  forbidAdjacentToNaturalWonders: true,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const readNumber = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const resolveGroup = (
  input: FeaturePlacementGroupConfig | undefined,
  fallback: ResolvedFeaturePlacementGroupConfig
): ResolvedFeaturePlacementGroupConfig => ({
  enabled: input?.enabled ?? fallback.enabled,
  multiplier: Math.max(0, readNumber(input?.multiplier, fallback.multiplier)),
});

const resolveAtoll = (
  input: FeaturesPlacementAtollConfig | undefined
): Required<FeaturesPlacementAtollConfig> => ({
  enableClustering: input?.enableClustering ?? DEFAULT_ATOLL.enableClustering,
  clusterRadius: Math.min(
    2,
    Math.max(0, Math.floor(readNumber(input?.clusterRadius, DEFAULT_ATOLL.clusterRadius)))
  ),
  shallowWaterAdjacencyGateChance: clamp(
    readNumber(input?.shallowWaterAdjacencyGateChance, DEFAULT_ATOLL.shallowWaterAdjacencyGateChance),
    0,
    100
  ),
  growthChanceEquatorial: clamp(
    readNumber(input?.growthChanceEquatorial, DEFAULT_ATOLL.growthChanceEquatorial),
    0,
    100
  ),
  growthChanceNonEquatorial: clamp(
    readNumber(input?.growthChanceNonEquatorial, DEFAULT_ATOLL.growthChanceNonEquatorial),
    0,
    100
  ),
});

export function resolveFeaturesPlacementConfig(
  input?: FeaturesPlacementConfig
): ResolvedFeaturesPlacementConfig {
  const mode = input?.mode === "vanilla" ? "vanilla" : "owned";
  const groupsInput = input?.groups;
  const chancesInput = input?.chances ?? {};

  const chances = FEATURE_PLACEMENT_KEYS.reduce((acc, key) => {
    acc[key] = clamp(readNumber(chancesInput[key], DEFAULT_FEATURE_PLACEMENT_CHANCES[key]), 0, 100);
    return acc;
  }, {} as Record<FeaturePlacementKey, number>);

  return {
    mode,
    groups: {
      vegetated: resolveGroup(groupsInput?.vegetated, DEFAULT_GROUPS.vegetated),
      wet: resolveGroup(groupsInput?.wet, DEFAULT_GROUPS.wet),
      aquatic: resolveGroup(groupsInput?.aquatic, DEFAULT_GROUPS.aquatic),
      ice: resolveGroup(groupsInput?.ice, DEFAULT_GROUPS.ice),
    },
    chances,
    aquatic: {
      reefLatitudeSplit: clamp(readNumber(input?.aquatic?.reefLatitudeSplit, DEFAULT_AQUATIC.reefLatitudeSplit), 0, 90),
      atoll: resolveAtoll(input?.aquatic?.atoll),
    },
    ice: {
      minAbsLatitude: clamp(readNumber(input?.ice?.minAbsLatitude, DEFAULT_ICE.minAbsLatitude), 0, 90),
      forbidAdjacentToLand: input?.ice?.forbidAdjacentToLand ?? DEFAULT_ICE.forbidAdjacentToLand,
      forbidAdjacentToNaturalWonders:
        input?.ice?.forbidAdjacentToNaturalWonders ?? DEFAULT_ICE.forbidAdjacentToNaturalWonders,
    },
  };
}
