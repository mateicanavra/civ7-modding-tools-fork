import { createStrategy } from "@swooper/mapgen-core/authoring";
import ProjectRiverNetworkContract from "../contract.js";
import { clamp01 } from "../rules/index.js";

export const physicsStrategy = createStrategy(ProjectRiverNetworkContract, "physics", {
  run: (input, config) => {
    const width = input.width | 0;
    const height = input.height | 0;
    const size = Math.max(0, width * height);

    if (!(input.landMask instanceof Uint8Array) || input.landMask.length !== size) {
      throw new Error("[Hydrology] Invalid landMask for hydrology/project-river-network.");
    }
    if (!(input.discharge instanceof Float32Array) || input.discharge.length !== size) {
      throw new Error("[Hydrology] Invalid discharge for hydrology/project-river-network.");
    }
    if (input.slope01 != null && (!(input.slope01 instanceof Float32Array) || input.slope01.length !== size)) {
      throw new Error("[Hydrology] Invalid slope01 for hydrology/project-river-network (physics).");
    }
    if (
      input.confinement01 != null &&
      (!(input.confinement01 instanceof Float32Array) || input.confinement01.length !== size)
    ) {
      throw new Error("[Hydrology] Invalid confinement01 for hydrology/project-river-network (physics).");
    }

    const riverClass = new Uint8Array(size);
    const channelWidthTiles = new Float32Array(size);
    const navigableMask = new Uint8Array(size);

    const widthCoeff = Math.max(0, config.widthCoeff);
    const dischargeExponent = Math.max(0, config.dischargeExponent);
    const slopeWidthExponent = Math.max(0, config.slopeWidthExponent);
    const confinementWidthExponent = Math.max(0, config.confinementWidthExponent);

    const minorWidthTiles = Math.max(0, config.minorWidthTiles);
    const majorWidthTiles = Math.max(minorWidthTiles, config.majorWidthTiles);

    const majorSlopeMax01 = clamp01(config.majorSlopeMax01);
    const majorConfinementMax01 = clamp01(config.majorConfinementMax01);

    const navigableWidthTiles = Math.max(0, config.navigableWidthTiles);
    const navigableSlopeMax01 = clamp01(config.navigableSlopeMax01);
    const navigableConfinementMax01 = clamp01(config.navigableConfinementMax01);

    const slope01 = input.slope01;
    const confinement01 = input.confinement01;

    for (let i = 0; i < size; i++) {
      if (input.landMask[i] !== 1) continue;
      const q = Math.max(0, input.discharge[i] ?? 0);
      if (q <= 0) continue;

      let w = widthCoeff > 0 ? widthCoeff * Math.pow(q, dischargeExponent) : 0;
      if (w <= 0) continue;

      const s = slope01 ? clamp01(slope01[i] ?? 0) : 0;
      const c = confinement01 ? clamp01(confinement01[i] ?? 0) : 0;

      if (slopeWidthExponent > 0) w *= Math.pow(1 - s, slopeWidthExponent);
      if (confinementWidthExponent > 0) w *= Math.pow(1 - c, confinementWidthExponent);

      channelWidthTiles[i] = w;

      if (w < minorWidthTiles) continue;

      if (w >= majorWidthTiles && s <= majorSlopeMax01 && c <= majorConfinementMax01) {
        riverClass[i] = 2;
      } else {
        riverClass[i] = 1;
      }

      if (w >= navigableWidthTiles && s <= navigableSlopeMax01 && c <= navigableConfinementMax01) {
        navigableMask[i] = 1;
      }
    }

    const invertWidthToDischarge = (w: number): number => {
      if (widthCoeff <= 0) return 0;
      if (dischargeExponent <= 0) return w > 0 ? Infinity : 0;
      return Math.pow(Math.max(0, w) / widthCoeff, 1 / dischargeExponent);
    };

    const minorThreshold = invertWidthToDischarge(minorWidthTiles);
    const majorThreshold = invertWidthToDischarge(majorWidthTiles);

    return { riverClass, channelWidthTiles, navigableMask, minorThreshold, majorThreshold } as const;
  },
});
