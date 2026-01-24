import type {
  MorphologyCoastRuggednessKnob,
  MorphologyErosionKnob,
  MorphologyOrogenyKnob,
  MorphologySeaLevelKnob,
  MorphologyVolcanismKnob,
} from "./knobs.js";

export const MORPHOLOGY_SEA_LEVEL_TARGET_WATER_PERCENT_DELTA: Readonly<
  Record<MorphologySeaLevelKnob, number>
> = {
  "land-heavy": -7,
  earthlike: 0,
  "water-heavy": 7,
};

export const MORPHOLOGY_EROSION_RATE_MULTIPLIER: Readonly<Record<MorphologyErosionKnob, number>> =
  {
    low: 0.75,
    normal: 1.0,
    high: 1.35,
  };

export const MORPHOLOGY_COAST_RUGGEDNESS_MULTIPLIER: Readonly<
  Record<MorphologyCoastRuggednessKnob, number>
> = {
  smooth: 0.65,
  normal: 1.0,
  rugged: 1.4,
};

export const MORPHOLOGY_VOLCANISM_BASE_DENSITY_MULTIPLIER: Readonly<
  Record<MorphologyVolcanismKnob, number>
> = {
  low: 0.7,
  normal: 1.0,
  high: 1.5,
};

export const MORPHOLOGY_VOLCANISM_HOTSPOT_WEIGHT_MULTIPLIER: Readonly<
  Record<MorphologyVolcanismKnob, number>
> = {
  low: 0.7,
  normal: 1.0,
  high: 1.5,
};

export const MORPHOLOGY_VOLCANISM_CONVERGENT_MULTIPLIER_MULTIPLIER: Readonly<
  Record<MorphologyVolcanismKnob, number>
> = {
  low: 0.85,
  normal: 1.0,
  high: 1.25,
};

export const MORPHOLOGY_OROGENY_TECTONIC_INTENSITY_MULTIPLIER: Readonly<
  Record<MorphologyOrogenyKnob, number>
> = {
  low: 0.8,
  normal: 1.0,
  high: 1.25,
};

export const MORPHOLOGY_OROGENY_MOUNTAIN_THRESHOLD_DELTA: Readonly<Record<MorphologyOrogenyKnob, number>> =
  {
    low: 0.05,
    normal: 0,
    high: -0.05,
  };

export const MORPHOLOGY_OROGENY_HILL_THRESHOLD_DELTA: Readonly<Record<MorphologyOrogenyKnob, number>> =
  {
    low: 0.03,
    normal: 0,
    high: -0.03,
  };

