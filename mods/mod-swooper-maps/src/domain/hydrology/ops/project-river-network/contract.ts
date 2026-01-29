import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

/**
 * Projects a discrete river network classification from discharge.
 *
 * This op is physics-oriented: it converts discharge (and optional slope/confinement) into stable river classes
 * via a deterministic channel geometry proxy.
 */
const ProjectRiverNetworkInputSchema = Type.Object(
  {
    /** Tile grid width. */
    width: Type.Integer({ minimum: 1, description: "Tile grid width (columns)." }),
    /** Tile grid height. */
    height: Type.Integer({ minimum: 1, description: "Tile grid height (rows)." }),
    /** Land mask per tile (1=land, 0=water). */
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    /** Discharge proxy per tile. */
    discharge: TypedArraySchemas.f32({ description: "Discharge proxy per tile." }),
    /** Optional slope proxy per tile (0..1). */
    slope01: Type.Optional(
      TypedArraySchemas.f32({ description: "Optional slope proxy per tile (0..1)." })
    ),
    /** Optional confinement proxy per tile (0..1; higher = more confined). */
    confinement01: Type.Optional(
      TypedArraySchemas.f32({ description: "Optional confinement proxy per tile (0..1; higher = more confined)." })
    ),
  },
  {
    additionalProperties: false,
    description: "Inputs for river network projection from discharge (deterministic, data-only).",
  }
);

/**
 * River projection outputs.
 */
const ProjectRiverNetworkOutputSchema = Type.Object(
  {
    /** River class per tile (0=none, 1=minor, 2=major). */
    riverClass: TypedArraySchemas.u8({
      description: "River class per tile (0=none, 1=minor, 2=major).",
    }),
    /** Optional channel width proxy in tiles (continuous; strategy-dependent). */
    channelWidthTiles: Type.Optional(
      TypedArraySchemas.f32({
        description: "Optional channel width proxy in tiles (continuous; strategy-dependent).",
      })
    ),
    /** Optional mask (1/0): tiles classified as navigable channels (strategy-dependent). */
    navigableMask: Type.Optional(
      TypedArraySchemas.u8({
        description: "Optional mask (1/0): tiles classified as navigable channels (strategy-dependent).",
      })
    ),
    /** Computed discharge threshold for minor rivers (same units as discharge). */
    minorThreshold: Type.Number({
      description: "Computed discharge threshold for minor rivers (same units as discharge).",
    }),
    /** Computed discharge threshold for major rivers (same units as discharge). */
    majorThreshold: Type.Number({
      description: "Computed discharge threshold for major rivers (same units as discharge).",
    }),
  },
  {
    additionalProperties: false,
    description: "River projection outputs (class map + computed discharge thresholds).",
  }
);

/**
 * Default river projection parameters.
 *
 * Rivers are classified via a
 * deterministic channel geometry proxy from discharge (optionally modulated by slope/confinement).
 */
const ProjectRiverNetworkDefaultStrategySchema = Type.Object(
  {
    /** Width coefficient (tiles) applied to discharge^b. */
    widthCoeff: Type.Number({
      default: 0.035,
      minimum: 0,
      maximum: 10,
      description: "Width coefficient (tiles) applied to discharge^b.",
    }),
    /** Discharge exponent b in width ∝ Q^b. */
    dischargeExponent: Type.Number({
      default: 0.45,
      minimum: 0,
      maximum: 2,
      description: "Discharge exponent b in width ∝ Q^b.",
    }),
    /** How strongly slope suppresses width (width *= (1 - slope01)^k). */
    slopeWidthExponent: Type.Number({
      default: 1.25,
      minimum: 0,
      maximum: 8,
      description: "How strongly slope suppresses width (width *= (1 - slope01)^k).",
    }),
    /** How strongly confinement suppresses width (width *= (1 - confinement01)^k). */
    confinementWidthExponent: Type.Number({
      default: 1.0,
      minimum: 0,
      maximum: 8,
      description: "How strongly confinement suppresses width (width *= (1 - confinement01)^k).",
    }),
    /** Minimum channel width (tiles) to classify a minor river. */
    minorWidthTiles: Type.Number({
      default: 0.6,
      minimum: 0,
      maximum: 50,
      description: "Minimum channel width (tiles) to classify a minor river.",
    }),
    /** Minimum channel width (tiles) to classify a major river. */
    majorWidthTiles: Type.Number({
      default: 1.15,
      minimum: 0,
      maximum: 50,
      description: "Minimum channel width (tiles) to classify a major river.",
    }),
    /** Major rivers above this slope (0..1) are suppressed to minor. */
    majorSlopeMax01: Type.Number({
      default: 0.45,
      minimum: 0,
      maximum: 1,
      description: "Major rivers above this slope (0..1) are suppressed to minor.",
    }),
    /** Major rivers above this confinement (0..1) are suppressed to minor. */
    majorConfinementMax01: Type.Number({
      default: 0.8,
      minimum: 0,
      maximum: 1,
      description: "Major rivers above this confinement (0..1) are suppressed to minor.",
    }),
    /** Minimum channel width (tiles) to classify a navigable river tile. */
    navigableWidthTiles: Type.Number({
      default: 1.75,
      minimum: 0,
      maximum: 50,
      description: "Minimum channel width (tiles) to classify a navigable river tile.",
    }),
    /** Navigable channels above this slope (0..1) are suppressed. */
    navigableSlopeMax01: Type.Number({
      default: 0.35,
      minimum: 0,
      maximum: 1,
      description: "Navigable channels above this slope (0..1) are suppressed.",
    }),
    /** Navigable channels above this confinement (0..1) are suppressed. */
    navigableConfinementMax01: Type.Number({
      default: 0.7,
      minimum: 0,
      maximum: 1,
      description: "Navigable channels above this confinement (0..1) are suppressed.",
    }),
  },
  {
    additionalProperties: false,
    description: "River classification parameters (default strategy).",
  }
);

const ProjectRiverNetworkContract = defineOp({
  kind: "compute",
  id: "hydrology/project-river-network",
  input: ProjectRiverNetworkInputSchema,
  output: ProjectRiverNetworkOutputSchema,
  strategies: {
    default: ProjectRiverNetworkDefaultStrategySchema,
  },
});

export default ProjectRiverNetworkContract;
