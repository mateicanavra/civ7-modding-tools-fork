import type { FoundationPlateActivityKnob, FoundationPlateCountKnob } from "./knobs.js";

/**
 * Plate count multipliers are applied after schema defaults/advanced config are resolved.
 * They intentionally scale authored `plateCount` rather than hard-overriding it.
 */
export const FOUNDATION_PLATE_COUNT_MULTIPLIER: Readonly<Record<FoundationPlateCountKnob, number>> =
  {
    sparse: 0.8,
    normal: 1.0,
    dense: 1.25,
  };

/**
 * Plate activity scales kinematics used to project motion tensors.
 */
export const FOUNDATION_PLATE_ACTIVITY_KINEMATICS_MULTIPLIER: Readonly<
  Record<FoundationPlateActivityKnob, number>
> = {
  low: 0.8,
  normal: 1.0,
  high: 1.2,
};

/**
 * Plate activity shifts boundary influence distance (tiles). This is additive so maps with authored
 * advanced configs remain meaningful while still responding to knobs-last tuning.
 */
export const FOUNDATION_PLATE_ACTIVITY_BOUNDARY_INFLUENCE_DISTANCE_DELTA: Readonly<
  Record<FoundationPlateActivityKnob, number>
> = {
  low: -1,
  normal: 0,
  high: 2,
};

