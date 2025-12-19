import type { MapGenConfig } from "./schema.js";

type DeepPartial<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepPartial<U>[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    v != null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
  );
}

function clone<T>(v: T): T {
  if (Array.isArray(v)) return v.slice() as unknown as T;
  if (isPlainObject(v)) {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v)) o[k] = (v as Record<string, unknown>)[k];
    return o as T;
  }
  return v;
}

function deepMerge<T>(base: T, src: DeepPartial<T> | undefined): T {
  if (!src || !isPlainObject(src)) return clone(base);
  if (!isPlainObject(base)) return clone(src) as T;

  const out: Record<string, unknown> = {};
  for (const k of Object.keys(base)) out[k] = clone((base as Record<string, unknown>)[k]);
  for (const k of Object.keys(src)) {
    const b = out[k];
    const s = (src as Record<string, unknown>)[k];
    if (isPlainObject(b) && isPlainObject(s)) out[k] = deepMerge(b, s);
    else out[k] = clone(s);
  }
  return out as T;
}

/**
 * Supported preset names for M3.
 *
 * Legacy preset names from the archived JS mod (`classic`, `temperate`) are preserved 1:1.
 */
export type MapGenPresetName = "classic" | "temperate";

const PRESETS: Readonly<Record<MapGenPresetName, DeepPartial<MapGenConfig>>> = Object.freeze({
  classic: {
    stageConfig: {
      foundation: true,
      landmassPlates: true,
    },
    foundation: {
      diagnostics: {
        enabled: false,
        logTiming: false,
        logStoryTags: false,
      },
    },
  },
  temperate: {
    stageConfig: {
      foundation: true,
      landmassPlates: true,
    },
    foundation: {
      dynamics: {
        directionality: {
          cohesion: 0.6,
        },
      },
      diagnostics: {
        enabled: false,
        logTiming: false,
        logStoryTags: false,
      },
    },
  },
});

export function getPresetConfig(name: string): DeepPartial<MapGenConfig> {
  const preset = (PRESETS as Record<string, DeepPartial<MapGenConfig> | undefined>)[name];
  if (!preset) {
    const valid = Object.keys(PRESETS).join(", ");
    throw new Error(`Unknown MapGen preset "${name}". Valid presets: ${valid}`);
  }
  return preset;
}

export function applyPresets(
  base: DeepPartial<MapGenConfig>,
  presetNames: readonly string[]
): DeepPartial<MapGenConfig> {
  let out = clone(base);
  for (const name of presetNames) {
    out = deepMerge(out, getPresetConfig(name));
  }
  return out;
}
