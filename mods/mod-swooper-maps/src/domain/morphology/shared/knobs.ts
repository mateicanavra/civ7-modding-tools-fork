import { Type, type Static } from "@swooper/mapgen-core/authoring";

export const MorphologySeaLevelKnobSchema = Type.Union(
  [Type.Literal("land-heavy"), Type.Literal("earthlike"), Type.Literal("water-heavy")],
  {
    default: "earthlike",
    description:
      "Sea level posture (land-heavy/earthlike/water-heavy). Applies as a deterministic delta to hypsometry targets (targetWaterPercent).",
  }
);

export type MorphologySeaLevelKnob = Static<typeof MorphologySeaLevelKnobSchema>;

export const MorphologyErosionKnobSchema = Type.Union(
  [Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")],
  {
    default: "normal",
    description:
      "Erosion posture (low/normal/high). Applies as a deterministic multiplier over geomorphology rates (no presence-gating).",
  }
);

export type MorphologyErosionKnob = Static<typeof MorphologyErosionKnobSchema>;

export const MorphologyCoastRuggednessKnobSchema = Type.Union(
  [Type.Literal("smooth"), Type.Literal("normal"), Type.Literal("rugged")],
  {
    default: "normal",
    description:
      "Coastline ruggedness posture (smooth/normal/rugged). Applies as deterministic multipliers over bay/fjord carving parameters.",
  }
);

export type MorphologyCoastRuggednessKnob = Static<typeof MorphologyCoastRuggednessKnobSchema>;

export const MorphologyVolcanismKnobSchema = Type.Union(
  [Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")],
  {
    default: "normal",
    description:
      "Volcanism posture (low/normal/high). Applies as deterministic transforms over volcano plan weights/density.",
  }
);

export type MorphologyVolcanismKnob = Static<typeof MorphologyVolcanismKnobSchema>;

export const MorphologyOrogenyKnobSchema = Type.Union(
  [Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")],
  {
    default: "normal",
    description:
      "Orogeny posture (low/normal/high). Applies as deterministic transforms over mountain planning thresholds/intensity.",
  }
);

export type MorphologyOrogenyKnob = Static<typeof MorphologyOrogenyKnobSchema>;

