import { defineArtifact, Type, TypedArraySchemas } from "@swooper/mapgen-core/authoring";
import { HydrologyWindFieldSchema } from "@mapgen/domain/hydrology";

/**
 * Climate field produced by Hydrology climate-baseline.
 *
 * This artifact is a *buffer handle* routed through artifacts for gating/typing: it may be refined later in-place.
 */
export const ClimateFieldArtifactSchema = Type.Object(
  {
    /** Rainfall field (0..200) per tile; consumers should not invent their own rainfall proxies. */
    rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
    /** Humidity field (0..255) per tile; used by hydrology budget and downstream ecology heuristics. */
    humidity: TypedArraySchemas.u8({ description: "Humidity (0..255) per tile." }),
  },
  {
    additionalProperties: false,
    description:
      "Hydrology climate field (buffer handle): rainfall/humidity outputs for Ecology/Narrative/Placement consumption.",
  }
);

/**
 * Seasonal amplitude for Hydrology’s climate field outputs.
 *
 * This is the *public* seasonality output surface: Hydrology may internally simulate 2–4 seasonal modes, but it only
 * publishes the annual mean (via `artifact:climateField`) and the corresponding amplitude fields here.
 */
export const ClimateSeasonalityArtifactSchema = Type.Object(
  {
    /** Number of seasonal modes used internally when computing amplitudes (2 or 4). */
    modeCount: Type.Union([Type.Literal(2), Type.Literal(4)], {
      description: "Seasonal mode count used for internal sampling (2=solstices, 4=quarter-year).",
    }),
    /** Effective axial tilt (declination amplitude) in degrees used for seasonal forcing. */
    axialTiltDeg: Type.Number({
      minimum: 0,
      maximum: 45,
      description:
        "Axial tilt in degrees used to simulate seasonal declination forcing (0 disables seasonal amplitudes).",
    }),
    /** Seasonal rainfall amplitude per tile (0..255), computed from the spread across seasonal modes. */
    rainfallAmplitude: TypedArraySchemas.u8({
      description: "Seasonal rainfall amplitude per tile (0..255; derived from seasonal spread).",
    }),
    /** Seasonal humidity amplitude per tile (0..255), computed from the spread across seasonal modes. */
    humidityAmplitude: TypedArraySchemas.u8({
      description: "Seasonal humidity amplitude per tile (0..255; derived from seasonal spread).",
    }),
  },
  {
    additionalProperties: false,
    description:
      "Hydrology climate seasonality outputs: annual amplitude fields corresponding to `artifact:climateField` mean signals.",
  }
);

export const hydrologyClimateBaselineArtifacts = {
  climateField: defineArtifact({
    name: "climateField",
    id: "artifact:climateField",
    schema: ClimateFieldArtifactSchema,
  }),
  climateSeasonality: defineArtifact({
    name: "climateSeasonality",
    id: "artifact:hydrology.climateSeasonality",
    schema: ClimateSeasonalityArtifactSchema,
  }),
  windField: defineArtifact({
    name: "windField",
    id: "artifact:hydrology._internal.windField",
    schema: HydrologyWindFieldSchema,
  }),
} as const;
