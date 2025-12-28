export const STORY_OVERLAY_KEYS = {
  MARGINS: "margins",
  HOTSPOTS: "hotspots",
  RIFTS: "rifts",
  OROGENY: "orogeny",
  CORRIDORS: "corridors",
  SWATCHES: "swatches",
  PALEO: "paleo",
} as const;

export type StoryOverlayKey = (typeof STORY_OVERLAY_KEYS)[keyof typeof STORY_OVERLAY_KEYS];

