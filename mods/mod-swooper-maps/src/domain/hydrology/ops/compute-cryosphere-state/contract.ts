import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

/**
 * Computes cryosphere state (snow/sea-ice/albedo proxies) and a freeze persistence index.
 *
 * This op is deterministic and bounded. It exists to provide gameplay-facing “coldness” and ice masks that downstream
 * domains can consume without embedding cryosphere heuristics elsewhere.
 */
const ComputeCryosphereStateInputSchema = Type.Object(
  {
    /** Tile grid width. */
    width: Type.Integer({ minimum: 1, description: "Tile grid width (columns)." }),
    /** Tile grid height. */
    height: Type.Integer({ minimum: 1, description: "Tile grid height (rows)." }),
    /** Land mask per tile (1=land, 0=water). */
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    /** Surface temperature proxy (C). */
    surfaceTemperatureC: TypedArraySchemas.f32({ description: "Surface temperature proxy (C)." }),
    /** Rainfall (0..200) per tile; used as a precipitation signal for snow cover. */
    rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
  },
  {
    additionalProperties: false,
    description: "Inputs for cryosphere state computation (deterministic, data-only).",
  }
);

/**
 * Cryosphere outputs (snow/ice cover, albedo, freeze index).
 */
const ComputeCryosphereStateOutputSchema = Type.Object(
  {
    /** Snow cover fraction (0..255) per tile. */
    snowCover: TypedArraySchemas.u8({ description: "Snow cover fraction (0..255) per tile." }),
    /** Sea ice cover fraction (0..255) per tile. */
    seaIceCover: TypedArraySchemas.u8({ description: "Sea ice cover fraction (0..255) per tile." }),
    /** Albedo proxy (0..255) per tile. */
    albedo: TypedArraySchemas.u8({ description: "Albedo proxy (0..255) per tile." }),
    /** Freeze persistence index (0..1) per tile (advisory). */
    freezeIndex: TypedArraySchemas.f32({
      description: "Freeze persistence index (0..1) per tile (advisory).",
    }),
    /** Ground ice persistence proxy (0..1) per tile; land-only. */
    groundIce01: TypedArraySchemas.f32({
      description: "Ground ice persistence proxy (0..1) per tile; land-only.",
    }),
    /** Permafrost proxy (0..1) per tile; land-only. */
    permafrost01: TypedArraySchemas.f32({
      description: "Permafrost proxy (0..1) per tile; land-only.",
    }),
    /** Melt potential proxy (0..1) per tile; land-only and snow-weighted. */
    meltPotential01: TypedArraySchemas.f32({
      description: "Melt potential proxy (0..1) per tile; land-only and snow-weighted.",
    }),
  },
  {
    additionalProperties: false,
    description: "Cryosphere outputs (snow/sea-ice/albedo proxies + freeze persistence index).",
  }
);

/**
 * Default cryosphere parameters.
 *
 * Practical guidance:
 * - If snowline is too low/high: adjust `landSnowStartC` / `landSnowFullC`.
 * - If sea ice forms too easily: lower `seaIceStartC` / `seaIceFullC` (more negative = harder to form).
 * - If precipitation should matter more for snow: increase `precipitationInfluence`.
 */
const ComputeCryosphereStateDefaultStrategySchema = Type.Object(
  {
    /** Temperature at which snow starts to accumulate on land (C). */
    landSnowStartC: Type.Number({
      default: 0,
      minimum: -60,
      maximum: 30,
      description: "Temperature at which snow starts to accumulate on land (C).",
    }),
    /** Temperature at which land snow cover is saturated (C). */
    landSnowFullC: Type.Number({
      default: -12,
      minimum: -80,
      maximum: 10,
      description: "Temperature at which land snow cover is saturated (C).",
    }),
    /** Temperature at which sea ice starts to form (C). */
    seaIceStartC: Type.Number({
      default: -1,
      minimum: -60,
      maximum: 10,
      description: "Temperature at which sea ice starts to form (C).",
    }),
    /** Temperature at which sea ice cover is saturated (C). */
    seaIceFullC: Type.Number({
      default: -10,
      minimum: -80,
      maximum: 10,
      description: "Temperature at which sea ice cover is saturated (C).",
    }),
    /** Temperature at which freezeIndex begins increasing (C). */
    freezeIndexStartC: Type.Number({
      default: 2,
      minimum: -60,
      maximum: 30,
      description: "Temperature at which freezeIndex begins increasing (C).",
    }),
    /** Temperature at which freezeIndex is saturated (C). */
    freezeIndexFullC: Type.Number({
      default: -12,
      minimum: -80,
      maximum: 10,
      description: "Temperature at which freezeIndex is saturated (C).",
    }),
    /** How much rainfall boosts snow cover accumulation (dimensionless). */
    precipitationInfluence: Type.Number({
      default: 0.25,
      minimum: 0,
      maximum: 1,
      description: "How much rainfall boosts snow cover accumulation (dimensionless).",
    }),
    /** Permafrost start threshold on freezeIndex (0..1). */
    permafrostStartFreezeIndex: Type.Number({
      default: 0.4,
      minimum: 0,
      maximum: 1,
      description: "Permafrost start threshold on freezeIndex (0..1).",
    }),
    /** Permafrost full threshold on freezeIndex (0..1). */
    permafrostFullFreezeIndex: Type.Number({
      default: 0.8,
      minimum: 0,
      maximum: 1,
      description: "Permafrost full threshold on freezeIndex (0..1).",
    }),
    /** Temperature at which meltPotential begins increasing (C). */
    meltStartC: Type.Number({
      default: 0,
      minimum: -60,
      maximum: 30,
      description: "Temperature at which meltPotential begins increasing (C).",
    }),
    /** Temperature at which meltPotential is saturated (C). */
    meltFullC: Type.Number({
      default: 10,
      minimum: -60,
      maximum: 60,
      description: "Temperature at which meltPotential is saturated (C).",
    }),
    /** How strongly snow cover weights ground ice persistence (0..1). */
    groundIceSnowInfluence: Type.Number({
      default: 0.75,
      minimum: 0,
      maximum: 1,
      description: "How strongly snow cover weights ground ice persistence (0..1).",
    }),
    /** Baseline albedo proxy when no snow/ice is present. */
    baseAlbedo: Type.Integer({
      default: 30,
      minimum: 0,
      maximum: 255,
      description: "Baseline albedo proxy when no snow/ice is present.",
    }),
    /** Albedo boost at full snow cover. */
    snowAlbedoBoost: Type.Integer({
      default: 140,
      minimum: 0,
      maximum: 255,
      description: "Albedo boost at full snow cover.",
    }),
    /** Albedo boost at full sea ice cover. */
    seaIceAlbedoBoost: Type.Integer({
      default: 180,
      minimum: 0,
      maximum: 255,
      description: "Albedo boost at full sea ice cover.",
    }),
  },
  {
    additionalProperties: false,
    description: "Cryosphere state parameters (default strategy).",
  }
);

const ComputeCryosphereStateContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-cryosphere-state",
  input: ComputeCryosphereStateInputSchema,
  output: ComputeCryosphereStateOutputSchema,
  strategies: {
    default: ComputeCryosphereStateDefaultStrategySchema,
  },
});

export default ComputeCryosphereStateContract;
