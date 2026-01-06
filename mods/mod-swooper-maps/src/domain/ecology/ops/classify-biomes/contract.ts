import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";

import { TemperatureSchema } from "./temperature.schema.js";
import { MoistureSchema } from "./moisture.schema.js";
import { AriditySchema } from "./aridity.schema.js";
import { FreezeSchema } from "./freeze.schema.js";
import { VegetationSchema } from "./vegetation.schema.js";
import { NoiseSchema } from "./noise.schema.js";
import { OverlaySchema } from "./overlays.schema.js";

/** Biome classification parameters for temperature, moisture, vegetation, and overlays. */
const BiomeClassificationConfigSchema = Type.Object(
  {
    /** Temperature model knobs (degrees C, lapse rate, thresholds). */
    temperature: TemperatureSchema,
    /** Moisture model knobs (thresholds, humidity weight, bias). */
    moisture: MoistureSchema,
    /** Aridity/PET proxy knobs (used to shift moisture zones). */
    aridity: AriditySchema,
    /** Freeze index thresholds used for snow/ice suitability. */
    freeze: FreezeSchema,
    /** Vegetation density model knobs (0..1 weights). */
    vegetation: VegetationSchema,
    /** Noise settings for moisture variation. */
    noise: NoiseSchema,
    /** Narrative overlay moisture bonuses. */
    overlays: OverlaySchema,
  },
  {
    additionalProperties: false,
    default: {},
    description: "Biome classification parameters for temperature, moisture, vegetation, and overlays.",
  }
);

const BiomeClassificationInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    rainfall: TypedArraySchemas.u8({ description: "Rainfall per tile (0..255)." }),
    humidity: TypedArraySchemas.u8({ description: "Humidity per tile (0..255)." }),
    elevation: TypedArraySchemas.i16({ description: "Elevation per tile (meters)." }),
    latitude: TypedArraySchemas.f32({ description: "Latitude per tile (degrees)." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    corridorMask: Type.Optional(
      TypedArraySchemas.u8({ description: "Narrative corridor mask per tile." })
    ),
    riftShoulderMask: Type.Optional(
      TypedArraySchemas.u8({ description: "Rift shoulder mask per tile." })
    ),
  },
  { additionalProperties: false }
);

const BiomeClassificationOutputSchema = Type.Object(
  {
    biomeIndex: TypedArraySchemas.u8({ description: "Biome symbol indices per tile." }),
    vegetationDensity: TypedArraySchemas.f32({ description: "Vegetation density per tile (0..1)." }),
    effectiveMoisture: TypedArraySchemas.f32({ description: "Effective moisture per tile." }),
    surfaceTemperature: TypedArraySchemas.f32({ description: "Surface temperature per tile (C)." }),
    aridityIndex: TypedArraySchemas.f32({ description: "Aridity index per tile (0..1)." }),
    freezeIndex: TypedArraySchemas.f32({ description: "Freeze index per tile (0..1)." }),
  },
  { additionalProperties: false }
);

export const BiomeClassificationContract = defineOpContract({
  kind: "compute",
  id: "ecology/biomes/classify",
  input: BiomeClassificationInputSchema,
  output: BiomeClassificationOutputSchema,
  strategies: {
    default: BiomeClassificationConfigSchema,
  },
});