import { BOUNDARY_TYPE } from "../../../world/constants.js";
import { clamp } from "../../../lib/math/index.js";
import type { CoastlinePlateBiasConfig } from "./types.js";

export function computePlateBias(
  closenessNorm: number | null | undefined,
  boundaryType: number,
  cfg: Required<CoastlinePlateBiasConfig>
): number {
  let cn = closenessNorm;
  if (cn == null || Number.isNaN(cn)) cn = 0;

  const threshold = cfg.threshold;
  const power = cfg.power;
  let weight = 0;

  if (cn >= threshold) {
    const span = Math.max(1e-3, 1 - threshold);
    const normalized = clamp((cn - threshold) / span, 0, 1);
    const ramp = Math.pow(normalized, power);

    let typeMul = 0;
    if (boundaryType === BOUNDARY_TYPE.convergent) typeMul = cfg.convergent;
    else if (boundaryType === BOUNDARY_TYPE.transform) typeMul = cfg.transform;
    else if (boundaryType === BOUNDARY_TYPE.divergent) typeMul = cfg.divergent;

    weight = ramp * typeMul;
  } else if (cfg.interior !== 0 && threshold > 0) {
    const normalized = clamp(1 - cn / threshold, 0, 1);
    weight = Math.pow(normalized, power) * cfg.interior;
  }

  return weight;
}

