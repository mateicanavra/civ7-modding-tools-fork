import type { FoundationContext } from "../../../core/types.js";
import type { ClimateAdapter } from "./types.js";

/**
 * Upwind barrier utility (legacy helper).
 */
export function hasUpwindBarrier(
  x: number,
  y: number,
  dx: number,
  dy: number,
  steps: number,
  adapter: ClimateAdapter,
  width: number,
  height: number
): number {
  for (let s = 1; s <= steps; s++) {
    const nx = x + dx * s;
    const ny = y + dy * s;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;
    if (!adapter.isWater(nx, ny)) {
      if (adapter.isMountain && adapter.isMountain(nx, ny)) return s;
      const elev = adapter.getElevation(nx, ny);
      if (elev >= 500) return s;
    }
  }
  return 0;
}

/**
 * Upwind barrier using foundation dynamics wind vectors.
 */
export function hasUpwindBarrierWM(
  x: number,
  y: number,
  steps: number,
  adapter: ClimateAdapter,
  width: number,
  height: number,
  dynamics: FoundationContext["dynamics"]
): number {
  const U = dynamics.windU;
  const V = dynamics.windV;
  if (!U || !V) return 0;

  let cx = x;
  let cy = y;

  for (let s = 1; s <= steps; s++) {
    const i = cy * width + cx;
    let ux = 0;
    let vy = 0;

    if (i >= 0 && i < U.length) {
      const u = U[i] | 0;
      const v = V[i] | 0;
      if (Math.abs(u) >= Math.abs(v)) {
        ux = u === 0 ? 0 : u > 0 ? 1 : -1;
        vy = 0;
      } else {
        ux = 0;
        vy = v === 0 ? 0 : v > 0 ? 1 : -1;
      }
      if (ux === 0 && vy === 0) {
        const lat = Math.abs(adapter.getLatitude(cx, cy));
        ux = lat < 30 || lat >= 60 ? -1 : 1;
        vy = 0;
      }
    } else {
      const lat = Math.abs(adapter.getLatitude(cx, cy));
      ux = lat < 30 || lat >= 60 ? -1 : 1;
      vy = 0;
    }

    const nx = cx + ux;
    const ny = cy + vy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;

    if (!adapter.isWater(nx, ny)) {
      if (adapter.isMountain && adapter.isMountain(nx, ny)) return s;
      const elev = adapter.getElevation(nx, ny);
      if (elev >= 500) return s;
    }
    cx = nx;
    cy = ny;
  }
  return 0;
}

