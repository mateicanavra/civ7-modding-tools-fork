import { describe, it, expect } from "bun:test";
import planRidgesAndFoothills from "../../src/domain/morphology/ops/plan-ridges-and-foothills/index.js";

function countMask(mask: Uint8Array, start: number, end: number): number {
  let count = 0;
  for (let i = start; i < end; i++) if (mask[i] === 1) count++;
  return count;
}

describe("m11 mountains (physics-anchored)", () => {
  it("correlates convergence regime with mountain density (noise minimized)", () => {
    const width = 20;
    const height = 1;
    const size = width * height;

    const landMask = new Uint8Array(size);
    landMask.fill(1);

    const boundaryCloseness = new Uint8Array(size);
    const boundaryType = new Uint8Array(size);
    const upliftPotential = new Uint8Array(size);
    const riftPotential = new Uint8Array(size);
    const tectonicStress = new Uint8Array(size);
    const fractalMountain = new Int16Array(size);
    const fractalHill = new Int16Array(size);

    for (let i = 0; i < 10; i++) {
      boundaryCloseness[i] = 255;
      boundaryType[i] = 1;
      upliftPotential[i] = 220;
      tectonicStress[i] = 220;
    }

    const plan = planRidgesAndFoothills.run(
      {
        width,
        height,
        landMask,
        boundaryCloseness,
        boundaryType,
        upliftPotential,
        riftPotential,
        tectonicStress,
        fractalMountain,
        fractalHill,
      },
      {
        strategy: "default",
        config: {
          ...(planRidgesAndFoothills.defaultConfig as any).config,
          boundaryGate: 0,
          boundaryExponent: 1,
          fractalWeight: 0,
          mountainThreshold: 0.15,
          hillThreshold: 0.1,
        },
      }
    );

    const mountainsNearConvergence = countMask(plan.mountainMask, 0, 10);
    const mountainsInterior = countMask(plan.mountainMask, 10, 20);
    expect(mountainsNearConvergence).toBeGreaterThan(0);
    expect(mountainsInterior).toBe(0);
  });

  it("noise-only runs cannot create mountain belts without orogeny signal", () => {
    const width = 20;
    const height = 1;
    const size = width * height;

    const landMask = new Uint8Array(size);
    landMask.fill(1);

    const boundaryCloseness = new Uint8Array(size);
    const boundaryType = new Uint8Array(size);
    const upliftPotential = new Uint8Array(size);
    const riftPotential = new Uint8Array(size);
    const tectonicStress = new Uint8Array(size);

    const fractalMountain = new Int16Array(size);
    const fractalHill = new Int16Array(size);
    fractalMountain.fill(255);
    fractalHill.fill(255);

    const plan = planRidgesAndFoothills.run(
      {
        width,
        height,
        landMask,
        boundaryCloseness,
        boundaryType,
        upliftPotential,
        riftPotential,
        tectonicStress,
        fractalMountain,
        fractalHill,
      },
      {
        strategy: "default",
        config: {
          ...(planRidgesAndFoothills.defaultConfig as any).config,
          boundaryGate: 0,
          boundaryExponent: 1,
          fractalWeight: 5,
          mountainThreshold: 0.01,
          hillThreshold: 0.01,
        },
      }
    );

    expect(countMask(plan.mountainMask, 0, size)).toBe(0);
    expect(countMask(plan.hillMask, 0, size)).toBe(0);
    expect(Array.from(plan.orogenyPotential01)).toEqual(Array.from(new Uint8Array(size)));
    expect(Array.from(plan.fracture01)).toEqual(Array.from(new Uint8Array(size)));
  });
});

