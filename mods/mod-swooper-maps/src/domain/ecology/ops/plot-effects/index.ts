import { Type, type Static } from "typebox";
import { createOp } from "@swooper/mapgen-core/authoring";

import {
  PlotEffectsConfigSchema,
  resolvePlotEffectsConfig,
  type PlotEffectsConfig,
} from "./schema.js";
import type { PlotEffectsInput } from "./types.js";
import { planOwnedPlotEffects } from "./strategies/owned.js";
import { logSnowEligibilitySummary } from "./diagnostics.js";

const PlotEffectsInputSchema = Type.Object(
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
    elevation: Type.Any({ description: "Elevation per tile (meters)." }),
    rand: Type.Any({ description: "Deterministic RNG (ctxRandom wrapper)." }),
  },
  { additionalProperties: false }
);

const PlotEffectPlacementSchema = Type.Object(
  {
    x: Type.Integer({ minimum: 0 }),
    y: Type.Integer({ minimum: 0 }),
    plotEffectType: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false }
);

const PlotEffectsOutputSchema = Type.Object(
  {
    placements: Type.Array(PlotEffectPlacementSchema),
  },
  { additionalProperties: false }
);

export const plotEffects = createOp({
  kind: "compute",
  id: "ecology/plot-effects/placement",
  input: PlotEffectsInputSchema,
  output: PlotEffectsOutputSchema,
  config: PlotEffectsConfigSchema,
  run: (input: PlotEffectsInput, config: PlotEffectsConfig) => {
    const resolved = resolvePlotEffectsConfig(config);
    const placements = planOwnedPlotEffects(input, resolved);
    logSnowEligibilitySummary(input, resolved, placements);
    return {
      placements,
    };
  },
} as const);

export type PlotEffectsOutput = Static<typeof PlotEffectsOutputSchema>;

export * from "./schema.js";
export * from "./types.js";
