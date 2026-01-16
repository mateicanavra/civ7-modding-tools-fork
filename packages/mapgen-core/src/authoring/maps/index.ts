/// <reference types="@civ7/types" />

import "../../polyfills/text-encoder.js";

import type { MapInfo, MapInitParams, MapSizeId } from "@civ7/adapter";
import { createCiv7Adapter } from "@civ7/adapter/civ7";

import { createExtendedMapContext, type ExtendedMapContext } from "../../core/types.js";
import type { Env } from "../../engine/index.js";
import type { RecipeModule } from "../types.js";

type RecipeConfigInputOfRecipe<TRecipe extends RecipeModule<any, any, any>> =
  TRecipe extends RecipeModule<any, infer TConfigInput, any> ? TConfigInput : never;

export type MapLatitudeBounds = Readonly<{
  topLatitude: number;
  bottomLatitude: number;
}>;

export type MapDefinition<TRecipe extends RecipeModule<ExtendedMapContext, any, any>> = Readonly<{
  id: string;
  name: string;
  recipe: TRecipe;
  config: RecipeConfigInputOfRecipe<TRecipe>;
  description?: string;
  latitudeBounds?: MapLatitudeBounds;
  logPrefix?: string;
  seed?: number;
}>;

type MapDefinitionInput<TRecipe extends RecipeModule<ExtendedMapContext, any, any>> =
  MapDefinition<TRecipe>;

type CivEngine = {
  on: (event: string, handler: (...args: any[]) => void) => void;
  call: (method: string, ...args: any[]) => unknown;
};

type InitCapture = {
  mapSizeId: MapSizeId;
  mapInfo: MapInfo;
  params: Required<Pick<MapInitParams, "width" | "height">> &
    Required<Pick<MapInitParams, "topLatitude" | "bottomLatitude">> &
    Pick<MapInitParams, "mapSize">;
};

function resolveSeed(def: MapDefinition<any>): number {
  const seed = def.seed ?? GameplayMap.getRandomSeed();
  if (!Number.isFinite(seed)) {
    throw new Error(
      `${def.logPrefix ?? "[SWOOPER_MOD]"} Missing map seed (GameplayMap.getRandomSeed() returned non-finite).`
    );
  }
  return seed;
}

function resolveLatitudeBounds(def: MapDefinition<any>, base: { topLatitude: number; bottomLatitude: number }): {
  topLatitude: number;
  bottomLatitude: number;
} {
  if (!def.latitudeBounds) return base;
  const { topLatitude, bottomLatitude } = def.latitudeBounds;
  if (!Number.isFinite(topLatitude) || !Number.isFinite(bottomLatitude)) {
    throw new Error(
      `${def.logPrefix ?? "[SWOOPER_MOD]"} Invalid latitudeBounds override (must be finite numbers).`
    );
  }
  if (topLatitude <= bottomLatitude) {
    throw new Error(
      `${def.logPrefix ?? "[SWOOPER_MOD]"} Invalid latitudeBounds override (topLatitude must be greater than bottomLatitude).`
    );
  }
  return { topLatitude, bottomLatitude };
}

function resolveMapInfo(mapSizeId: MapSizeId): MapInfo {
  const adapter = createCiv7Adapter();
  const mapInfo = adapter.lookupMapInfo(mapSizeId);
  if (!mapInfo) {
    throw new Error(
      `[SWOOPER_MOD] Failed to resolve mapInfo for mapSizeId=${String(mapSizeId)} (adapter.lookupMapInfo returned null).`
    );
  }
  return mapInfo;
}

function resolveInitCapture(def: MapDefinition<any>, initParams: Partial<MapInitParams> | null | undefined): InitCapture {
  const mapSizeId: MapSizeId = initParams?.mapSize ?? GameplayMap.getMapSize();
  const mapInfo = resolveMapInfo(mapSizeId);

  const width = initParams?.width ?? mapInfo.GridWidth;
  const height = initParams?.height ?? mapInfo.GridHeight;
  const baseTopLatitude = initParams?.topLatitude ?? mapInfo.MaxLatitude;
  const baseBottomLatitude = initParams?.bottomLatitude ?? mapInfo.MinLatitude;

  if (typeof width !== "number" || !Number.isFinite(width) || typeof height !== "number" || !Number.isFinite(height)) {
    throw new Error(
      `${def.logPrefix ?? "[SWOOPER_MOD]"} Missing map dimensions (width/height not provided by init params and not present in mapInfo).`
    );
  }
  if (
    typeof baseTopLatitude !== "number" ||
    !Number.isFinite(baseTopLatitude) ||
    typeof baseBottomLatitude !== "number" ||
    !Number.isFinite(baseBottomLatitude)
  ) {
    throw new Error(
      `${def.logPrefix ?? "[SWOOPER_MOD]"} Missing map latitude bounds (top/bottom not provided by init params and not present in mapInfo).`
    );
  }

  const { topLatitude, bottomLatitude } = resolveLatitudeBounds(def, {
    topLatitude: baseTopLatitude,
    bottomLatitude: baseBottomLatitude,
  });

  const params: InitCapture["params"] = {
    width,
    height,
    topLatitude,
    bottomLatitude,
    mapSize: mapSizeId,
  };

  return { mapSizeId, mapInfo, params };
}

export function createMap<const TRecipe extends RecipeModule<ExtendedMapContext, any, any>>(
  def: MapDefinitionInput<TRecipe>
): MapDefinition<TRecipe> {
  const engineApi = engine as unknown as CivEngine;
  let captured: InitCapture | null = null;

  engineApi.on("RequestMapInitData", (initParams) => {
    captured = resolveInitCapture(def, initParams as Partial<MapInitParams>);
    engineApi.call("SetMapInitData", captured.params);
  });

  engineApi.on("GenerateMap", () => {
    if (!captured) {
      throw new Error(
        `${def.logPrefix ?? "[SWOOPER_MOD]"} GenerateMap fired before RequestMapInitData (no init captured).`
      );
    }

    const { width, height, topLatitude, bottomLatitude } = captured.params;
    const seed = resolveSeed(def);

    const adapter = createCiv7Adapter();
    if (adapter.width !== width || adapter.height !== height) {
      throw new Error(
        `${def.logPrefix ?? "[SWOOPER_MOD]"} Adapter dimensions ${adapter.width}x${adapter.height} do not match init ${width}x${height}.`
      );
    }

    const env: Env = {
      seed,
      dimensions: { width, height },
      latitudeBounds: { topLatitude, bottomLatitude },
    };

    const context = createExtendedMapContext({ width, height }, adapter, env);

    const prefix = def.logPrefix ?? "[SWOOPER_MOD]";
    try {
      def.recipe.run(context, env, def.config, {
        log: (message) => console.log(prefix, message),
      });
    } catch (err) {
      console.error(prefix, "Map generation failed:", err);
      throw err;
    }
  });

  return def;
}
