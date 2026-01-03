import { Type, type Static } from "typebox";
import { createOp, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
import {
  PlotEffectsConfigSchema,
  resolvePlotEffectsConfig,
  type PlotEffectKey,
  type PlotEffectsConfig,
  type ResolvedPlotEffectsConfig,
} from "./schema.js";
import type { PlotEffectsInput } from "./types.js";
import { planPlotEffects as planPlotEffectsImpl } from "./plan.js";

const PlotEffectKeySchema = Type.Unsafe<PlotEffectKey>(
  Type.String({
    description: "Plot effect key (PLOTEFFECT_*).",
    pattern: "^PLOTEFFECT_",
  })
);

const PlotEffectsInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    seed: Type.Number({ description: "Deterministic seed for plot-effect RNG." }),
    biomeIndex: TypedArraySchemas.u8({ description: "Biome symbol indices per tile." }),
    vegetationDensity: TypedArraySchemas.f32({ description: "Vegetation density per tile (0..1)." }),
    effectiveMoisture: TypedArraySchemas.f32({ description: "Effective moisture per tile." }),
    surfaceTemperature: TypedArraySchemas.f32({ description: "Surface temperature per tile (C)." }),
    aridityIndex: TypedArraySchemas.f32({ description: "Aridity index per tile (0..1)." }),
    freezeIndex: TypedArraySchemas.f32({ description: "Freeze index per tile (0..1)." }),
    elevation: TypedArraySchemas.i16({ description: "Elevation per tile (meters)." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
  },
  { additionalProperties: false }
);

const PlotEffectPlacementSchema = Type.Object(
  {
    x: Type.Integer({ minimum: 0 }),
    y: Type.Integer({ minimum: 0 }),
    plotEffect: PlotEffectKeySchema,
  },
  { additionalProperties: false }
);

const PlotEffectsOutputSchema = Type.Object(
  {
    placements: Type.Array(PlotEffectPlacementSchema),
  },
  { additionalProperties: false }
);

export const planPlotEffects = createOp({
  kind: "plan",
  id: "ecology/plot-effects/placement",
  input: PlotEffectsInputSchema,
  output: PlotEffectsOutputSchema,
  config: PlotEffectsConfigSchema,
  resolveConfig: (config: PlotEffectsConfig) => resolvePlotEffectsConfig(config),
  run: (input: PlotEffectsInput, config: PlotEffectsConfig) => {
    const placements = planPlotEffectsImpl(input, config as ResolvedPlotEffectsConfig);
    return { placements };
  },
} as const);

export type PlotEffectsOutput = Static<typeof PlotEffectsOutputSchema>;

export * from "./schema.js";
export * from "./types.js";
