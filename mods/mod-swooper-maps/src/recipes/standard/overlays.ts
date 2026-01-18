import type { StoryOverlaySnapshot } from "@swooper/mapgen-core";
import { STORY_OVERLAY_KEYS, type StoryOverlayKey } from "@mapgen/domain/narrative/overlays/index.js";
import type {
  NarrativeCorridors,
  NarrativeCorridorAttributes,
  NarrativeMotifsHotspots,
  NarrativeMotifsMargins,
  NarrativeMotifsRifts,
} from "@mapgen/domain/narrative/models.js";
import type { CorridorKind, CorridorStyle } from "@mapgen/domain/narrative/corridors/types.js";

type UnknownRecord = Record<string, unknown>;

type OverlayRegistryView = Readonly<{
  corridors: ReadonlyArray<StoryOverlaySnapshot>;
  swatches: ReadonlyArray<StoryOverlaySnapshot>;
  motifs: ReadonlyArray<StoryOverlaySnapshot>;
}>;

const OVERLAY_COLLECTION_BY_KEY: Record<StoryOverlayKey, keyof OverlayRegistryView> = {
  [STORY_OVERLAY_KEYS.CORRIDORS]: "corridors",
  [STORY_OVERLAY_KEYS.MARGINS]: "motifs",
  [STORY_OVERLAY_KEYS.HOTSPOTS]: "motifs",
  [STORY_OVERLAY_KEYS.RIFTS]: "motifs",
  [STORY_OVERLAY_KEYS.OROGENY]: "motifs",
};

const asRecord = (value: unknown): UnknownRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
};

const toStringSet = (value: unknown): Set<string> => new Set(asStringArray(value));

const readOverlaySnapshot = (
  overlays: OverlayRegistryView,
  key: StoryOverlayKey
): StoryOverlaySnapshot | null => {
  const collection = OVERLAY_COLLECTION_BY_KEY[key];
  const entries = overlays[collection];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.key === key) return entry;
  }
  return null;
};

export const readOverlayMotifsMargins = (
  overlays: OverlayRegistryView
): NarrativeMotifsMargins | null => {
  const snapshot = readOverlaySnapshot(overlays, STORY_OVERLAY_KEYS.MARGINS);
  if (!snapshot) return null;
  return {
    activeMargin: toStringSet(snapshot.active),
    passiveShelf: toStringSet(snapshot.passive),
  };
};

export const readOverlayMotifsHotspots = (
  overlays: OverlayRegistryView
): NarrativeMotifsHotspots | null => {
  const snapshot = readOverlaySnapshot(overlays, STORY_OVERLAY_KEYS.HOTSPOTS);
  if (!snapshot) return null;
  const summary = asRecord(snapshot.summary);
  const trails = Array.isArray(summary?.trails) ? summary?.trails : undefined;
  return {
    points: toStringSet(snapshot.active),
    paradise: toStringSet(summary?.paradise),
    volcanic: toStringSet(summary?.volcanic),
    trails: trails as NarrativeMotifsHotspots["trails"],
  };
};

export const readOverlayMotifsRifts = (
  overlays: OverlayRegistryView
): NarrativeMotifsRifts | null => {
  const snapshot = readOverlaySnapshot(overlays, STORY_OVERLAY_KEYS.RIFTS);
  if (!snapshot) return null;
  return {
    riftLine: toStringSet(snapshot.active),
    riftShoulder: toStringSet(snapshot.passive),
  };
};

export const readOverlayCorridors = (
  overlays: OverlayRegistryView
): NarrativeCorridors | null => {
  const snapshot = readOverlaySnapshot(overlays, STORY_OVERLAY_KEYS.CORRIDORS);
  if (!snapshot) return null;
  const summary = asRecord(snapshot.summary);
  const seaLanes = toStringSet(summary?.seaLane);
  const islandHops = toStringSet(summary?.islandHop);
  const landCorridors = toStringSet(summary?.landOpen);
  const riverCorridors = toStringSet(summary?.riverChain);
  const kindByTile = new Map<string, CorridorKind>();
  const styleByTile = new Map<string, CorridorStyle>();
  const attributesByTile = new Map<string, NarrativeCorridorAttributes>();

  const kindRecord = asRecord(summary?.kindByTile);
  if (kindRecord) {
    for (const [key, value] of Object.entries(kindRecord)) {
      if (typeof value === "string") {
        kindByTile.set(key, value as CorridorKind);
      }
    }
  }

  const styleRecord = asRecord(summary?.styleByTile);
  if (styleRecord) {
    for (const [key, value] of Object.entries(styleRecord)) {
      if (typeof value === "string") {
        styleByTile.set(key, value as CorridorStyle);
      }
    }
  }

  const attributesRecord = asRecord(summary?.attributesByTile);
  if (attributesRecord) {
    for (const [key, value] of Object.entries(attributesRecord)) {
      const entry = asRecord(value);
      if (entry) {
        attributesByTile.set(key, entry);
      }
    }
  }

  return {
    seaLanes,
    islandHops,
    landCorridors,
    riverCorridors,
    kindByTile,
    styleByTile,
    attributesByTile,
  };
};
