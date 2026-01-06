import { Type, type Static } from "typebox";
import { createOp } from "@swooper/mapgen-core/authoring";
import {
  FeaturesPlacementConfigSchema,
  FeaturesPlacementStrategySchema,
  resolveFeaturesPlacementConfig,
  type FeaturesPlacementConfig,
  type ResolvedFeaturesPlacementOwnedConfig,
  type FeaturesPlacementStrategy,
} from "./schema.js";
import type { FeaturesPlacementInput } from "./types.js";
import { planOwnedFeaturePlacements } from "./strategies/owned.js";
import { planVanillaFeaturePlacements } from "./strategies/vanilla.js";

const FeaturesPlacementInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    adapter: Type.Any({ description: "Engine adapter (read-only queries)." }),
    biomeIndex: Type.Any({ description: "Biome symbol indices per tile." }),
    vegetationDensity: Type.Any({ description: "Vegetation density per tile (0..1)." }),
    effectiveMoisture: Type.Any({ description: "Effective moisture per tile." }),
    surfaceTemperature: Type.Any({ description: "Surface temperature per tile (C)." }),
    aridityIndex: Type.Any({ description: "Aridity index per tile (0..1)." }),
    freezeIndex: Type.Any({ description: "Freeze index per tile (0..1)." }),
    rand: Type.Any({ description: "Deterministic RNG (ctxRandom wrapper)." }),
  },
  { additionalProperties: false }
);

const FeaturePlacementSchema = Type.Object(
  {
    x: Type.Integer({ minimum: 0 }),
    y: Type.Integer({ minimum: 0 }),
    feature: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false }
);

const FeaturesPlacementOutputSchema = Type.Object(
  {
    strategy: FeaturesPlacementStrategySchema,
    useEngineBaseline: Type.Boolean({
      description:
        "When true, the step should call adapter.addFeatures instead of applying placements.",
    }),
    placements: Type.Array(FeaturePlacementSchema),
  },
  { additionalProperties: false }
);

export const featuresPlacement = createOp({
  kind: "compute",
  id: "ecology/features/placement",
  input: FeaturesPlacementInputSchema,
  output: FeaturesPlacementOutputSchema,
  config: FeaturesPlacementConfigSchema,
  resolveConfig: (config: FeaturesPlacementConfig) =>
    resolveFeaturesPlacementConfig(config),
  run: (input: FeaturesPlacementInput, config: FeaturesPlacementConfig) => {
    const strategy: FeaturesPlacementStrategy =
      config.strategy === "vanilla" ? "vanilla" : "owned";
    if (strategy === "vanilla") {
      return {
        strategy,
        useEngineBaseline: true,
        placements: planVanillaFeaturePlacements(),
      };
    }

    const placements = planOwnedFeaturePlacements(
      input,
      config.config as ResolvedFeaturesPlacementOwnedConfig
    );
    return {
      strategy,
      useEngineBaseline: false,
      placements,
    };
  },
} as const);

export type FeaturesPlacementOutput = Static<typeof FeaturesPlacementOutputSchema>;

export * from "./schema.js";
export * from "./types.js";
