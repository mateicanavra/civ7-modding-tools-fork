import type { ExtendedMapContext } from "../core/types.js";
import type { PlacementConfig } from "../config/index.js";
import { runPlacement, type PlacementOptions } from "../layers/placement.js";
import type { MapGenStep } from "../pipeline/types.js";

function deepMerge<T extends object>(base: T, override: Partial<T> | undefined): T {
  if (!override || typeof override !== "object") {
    return base;
  }

  const result = { ...base } as Record<string, unknown>;

  for (const key of Object.keys(override)) {
    const baseVal = (base as Record<string, unknown>)[key];
    const overrideVal = (override as Record<string, unknown>)[key];

    if (
      baseVal &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal) &&
      overrideVal &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal)
    ) {
      result[key] = deepMerge(baseVal as object, overrideVal as object);
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal;
    }
  }

  return result as T;
}

export interface LegacyPlacementStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  placementOptions: Omit<PlacementOptions, "placementConfig">;
  shouldRun?: () => boolean;
  beforeRun?: (context: ExtendedMapContext) => void;
  afterRun?: (context: ExtendedMapContext, startPositions: number[]) => void;
}

export function createLegacyPlacementStep(
  options: LegacyPlacementStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "placement",
    phase: "placement",
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      options.beforeRun?.(context);

      const placementConfig = deepMerge<PlacementConfig>(
        context.config.foundation?.placement ?? {},
        context.config.placement
      );
      const { width, height } = context.dimensions;

      const startPositions = runPlacement(context.adapter, width, height, {
        ...options.placementOptions,
        placementConfig,
      });

      options.afterRun?.(context, startPositions);
    },
  };
}
