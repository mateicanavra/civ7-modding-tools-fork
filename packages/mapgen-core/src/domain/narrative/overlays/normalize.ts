import type { StoryOverlaySnapshot } from "../../../core/types.js";

export function normalizeOverlay(key: string, overlay: Partial<StoryOverlaySnapshot>): StoryOverlaySnapshot {
  const base = overlay && typeof overlay === "object" ? overlay : {};
  const width = Number.isFinite(base.width) ? (base.width as number) : 0;
  const height = Number.isFinite(base.height) ? (base.height as number) : 0;
  const version = Number.isFinite(base.version) ? (base.version as number) : 1;
  const kind = typeof base.kind === "string" && base.kind.length > 0 ? base.kind : key;
  const active = freezeKeyArray(base.active);
  const passive = freezeKeyArray(base.passive);
  const summary = freezeSummary(base.summary);

  return Object.freeze({
    key,
    kind,
    version,
    width,
    height,
    active,
    passive,
    summary,
  });
}

function freezeKeyArray(values: readonly string[] | undefined): readonly string[] {
  if (!Array.isArray(values)) return Object.freeze([]);

  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") continue;
    if (seen.has(value)) continue;
    seen.add(value);
    deduped.push(value);
  }

  return Object.freeze(deduped);
}

function freezeSummary(
  summary: Readonly<Record<string, unknown>> | undefined
): Readonly<Record<string, unknown>> {
  if (!summary || typeof summary !== "object") {
    return Object.freeze({});
  }
  return Object.freeze({ ...summary });
}

