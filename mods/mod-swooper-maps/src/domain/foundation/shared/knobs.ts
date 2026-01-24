import { Type, type Static } from "@swooper/mapgen-core/authoring";

/**
 * Foundation plate count knob (semantic intent).
 *
 * Meaning:
 * - Scales the number of plates and plate graph seeds (after normalization).
 *
 * Stage scope:
 * - Used by `foundation` mesh + plate graph steps.
 */
export const FoundationPlateCountKnobSchema = Type.Union(
  [Type.Literal("sparse"), Type.Literal("normal"), Type.Literal("dense")],
  {
    default: "normal",
    description:
      "Plate count preset (sparse/normal/dense). Applies as a deterministic multiplier over authored/defaulted plateCount (no presence-gating).",
  }
);

export type FoundationPlateCountKnob = Static<typeof FoundationPlateCountKnobSchema>;

/**
 * Foundation plate activity knob (semantic intent).
 *
 * Meaning:
 * - Scales kinematics + boundary influence posture for projected plate driver fields.
 *
 * Stage scope:
 * - Used by `foundation` projection step only.
 */
export const FoundationPlateActivityKnobSchema = Type.Union(
  [Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")],
  {
    default: "normal",
    description:
      "Plate activity preset (low/normal/high). Applies as deterministic transforms over projection kinematics and boundary influence distance.",
  }
);

export type FoundationPlateActivityKnob = Static<typeof FoundationPlateActivityKnobSchema>;

