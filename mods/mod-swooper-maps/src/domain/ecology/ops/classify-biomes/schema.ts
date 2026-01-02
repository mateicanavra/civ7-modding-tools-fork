import { Type, type Static } from "typebox";

export const TemperatureSchema = Type.Object(
  {
    equator: Type.Number({ default: 28 }),
    pole: Type.Number({ default: -8 }),
    lapseRate: Type.Number({ default: 6.5 }),
    seaLevel: Type.Number({ default: 0 }),
    bias: Type.Number({ default: 0 }),
    polarCutoff: Type.Number({ default: -5 }),
    tundraCutoff: Type.Number({ default: 2 }),
    midLatitude: Type.Number({ default: 12 }),
    tropicalThreshold: Type.Number({ default: 24 }),
  },
  { additionalProperties: false, default: {} }
);

export const MoistureSchema = Type.Object(
  {
    thresholds: Type.Tuple(
      [
        Type.Number({ default: 45 }),
        Type.Number({ default: 90 }),
        Type.Number({ default: 140 }),
        Type.Number({ default: 190 }),
      ],
      { default: [45, 90, 140, 190] }
    ),
    bias: Type.Number({ default: 0 }),
    humidityWeight: Type.Number({ default: 0.35 }),
  },
  { additionalProperties: false, default: {} }
);

export const VegetationSchema = Type.Object(
  {
    base: Type.Number({ default: 0.2 }),
    moistureWeight: Type.Number({ default: 0.55 }),
    humidityWeight: Type.Number({ default: 0.25 }),
  },
  { additionalProperties: false, default: {} }
);

export const NoiseSchema = Type.Object(
  {
    amplitude: Type.Number({ default: 0.03 }),
    seed: Type.Number({ default: 1337 }),
  },
  { additionalProperties: false, default: {} }
);

export const OverlaySchema = Type.Object(
  {
    corridorMoistureBonus: Type.Number({ default: 8 }),
    riftShoulderMoistureBonus: Type.Number({ default: 5 }),
  },
  { additionalProperties: false, default: {} }
);

export const BiomeClassificationConfigSchema = Type.Object(
  {
    temperature: TemperatureSchema,
    moisture: MoistureSchema,
    vegetation: VegetationSchema,
    noise: NoiseSchema,
    overlays: OverlaySchema,
  },
  { additionalProperties: false, default: {} }
);

export const BiomeClassificationInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    rainfall: Type.Any(),
    humidity: Type.Any(),
    elevation: Type.Any(),
    latitude: Type.Any(),
    landMask: Type.Any(),
    corridorMask: Type.Optional(Type.Any()),
    riftShoulderMask: Type.Optional(Type.Any()),
  },
  { additionalProperties: false }
);

export const BiomeClassificationOutputSchema = Type.Object(
  {
    biomeIndex: Type.Any(),
    vegetationDensity: Type.Any(),
    effectiveMoisture: Type.Any(),
    surfaceTemperature: Type.Any(),
  },
  { additionalProperties: false }
);

export type BiomeClassificationConfig = Static<typeof BiomeClassificationConfigSchema>;
export type BiomeClassificationInput = Static<typeof BiomeClassificationInputSchema>;
export type BiomeClassificationOutput = Static<typeof BiomeClassificationOutputSchema>;
