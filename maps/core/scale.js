/**
 * Size scaling utilities for the Epic Diverse Huge map generator.
 *
 * Intent
 * - Provide stable, conservative scale factors derived from the current grid size.
 * - Let layers nudge probabilities, radii, counts, or amplitudes so large maps
 *   form broader, less "dotted" patterns while tiny maps remain coherent.
 *
 * Engine prerequisites
 * - Relies on GameplayMap (provided by the game at runtime). If unavailable
 *   (e.g., static analysis), the helpers fall back to a reasonable dummy size.
 *
 * Exported API
 * - getSizeScale(): { w, h, area, baseArea, linear, sqrt }
 *     linear = clamp(area/baseArea, [0.36, 3.00])
 *     sqrt   = clamp(sqrt(area/baseArea), [0.60, 2.00])
 *   Notes:
 *     • Use sqrt for “radius/length-like” quantities and subtle probability shifts.
 *     • Use linear sparingly for hard counts (with additional caps in callers).
 *
 * - scaleBySqrt(base, opts?): number
 *     Convenience helper: scales a base value toward larger maps using the
 *     sqrt factor. Options let you choose additive and/or multiplicative
 *     components and clamp the final value.
 *
 * Guidance
 * - Prefer sqrt scaling for almost everything (feels natural and restrained).
 * - Always keep caller-side caps and guardrails (lane width, rainfall clamp, etc.).
 */

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Best-effort dimension fetch from the engine with safe fallbacks.
 * @returns {{w:number,h:number}}
 */
function readDims() {
  try {
    const w = typeof GameplayMap?.getGridWidth === "function" ? GameplayMap.getGridWidth() : 100;
    const h = typeof GameplayMap?.getGridHeight === "function" ? GameplayMap.getGridHeight() : 80;
    return { w: Math.max(1, w | 0), h: Math.max(1, h | 0) };
  } catch (_) {
    return { w: 100, h: 80 };
  }
}

/**
 * Compute conservative size scale factors from current grid dimensions.
 * @returns {{ w:number, h:number, area:number, baseArea:number, linear:number, sqrt:number }}
 */
export function getSizeScale() {
  const { w, h } = readDims();
  const area = Math.max(1, w * h);

  // Baseline chosen to keep Huge around ~1.2–1.6× sqrt factor depending on your setup.
  const BASE_AREA = 10000;

  const linearRaw = area / BASE_AREA;
  const sqrtRaw = Math.sqrt(linearRaw);

  // Clamp ranges keep behavior stable across extreme sizes.
  const linear = clamp(linearRaw, 0.36, 3.0);
  const sqrt = clamp(sqrtRaw, 0.60, 2.00);

  return { w, h, area, baseArea: BASE_AREA, linear, sqrt };
}

/**
 * Scale a base value using the current sqrt size factor.
 *
 * Example usages (call-site intentions):
 * - Probability nudges: scaleBySqrt(12, { addPerSqrt: 2, min: 10, max: 20 })
 * - Count caps:          scaleBySqrt(3,  { mulPerSqrt: 0.4, min: 2,  max: 6  })
 * - Radii/lengths:       scaleBySqrt(2,  { mulPerSqrt: 0.3, min: 1,  max: 4  })
 *
 * @param {number} base - The nominal value tuned for Standard/Large maps.
 * @param {object} [opts]
 * @param {number} [opts.addPerSqrt=0] - Additive growth per (sqrt-1). Example: +8 at sqrt=2 when addPerSqrt=8.
 * @param {number} [opts.mulPerSqrt=0] - Multiplicative growth applied to base per (sqrt-1). Example: base*(1+0.4) at sqrt=2 when mulPerSqrt=0.4.
 * @param {number} [opts.min=-Infinity] - Clamp minimum.
 * @param {number} [opts.max=Infinity]  - Clamp maximum.
 * @returns {number}
 */
export function scaleBySqrt(base, opts = {}) {
  const { sqrt } = getSizeScale();
  const {
    addPerSqrt = 0,
    mulPerSqrt = 0,
    min = -Infinity,
    max = Infinity,
  } = opts;

  const growth = (sqrt - 1);
  let v = base + addPerSqrt * growth + base * (mulPerSqrt * growth);
  return clamp(v, min, max);
}

export default {
  getSizeScale,
  scaleBySqrt,
};
