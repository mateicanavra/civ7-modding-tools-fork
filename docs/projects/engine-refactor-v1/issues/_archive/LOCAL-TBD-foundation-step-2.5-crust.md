---
id: LOCAL-TBD-2.5
title: Implement Crust Generation Strategy
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: [codex]
labels: [Improvement, Architecture]
parent: LOCAL-TBD
children: []
blocked_by: [LOCAL-TBD-2]
blocked: [LOCAL-TBD-4]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Define the "Material" (Crust). Implement the `CrustGenerator` strategy to define Continental vs. Oceanic crust **independent of plate boundaries**, enabling realistic passive margins (like the East Coast of the USA) and supporting material-aware tectonic physics.

## Deliverables
- `packages/mapgen-core/src/strategies/crust-generator.ts` implementing the `MapGenStep` interface.
- Logic to seed "Craton" centers (ancient stable continental cores).
- Noise/distance field growth algorithm to expand Continental crust around Cratons.
- `CrustData` output with `type` (Continental=1, Oceanic=0) and `age` (Ancient=255, New=0) arrays.
- Unit tests verifying crust distribution matches configuration (continental ratio, craton count).

## Acceptance Criteria
- [ ] `CrustGenerator` implements `MapGenStep` with ID `core.crust.craton`.
- [ ] `run()` populates `context.artifacts.crust` with valid `type` and `age` arrays.
- [ ] Cratons are placed with distance buffers to ensure spread across the map.
- [ ] Continental crust ratio approximately matches `config.crust.continentalRatio`.
- [ ] Crust boundaries do NOT align with plate boundaries (verified by comparing `crust.type` vs `plateGraph.cellToPlate`).
- [ ] Ancient crust (`age > 200`) is concentrated at Craton cores, with younger crust at edges.

## Testing / Verification
- `pnpm test:mapgen`
- Verify that `context.artifacts.crust.type` contains both 0s and 1s in expected proportions.
- Verify that crust boundaries visually differ from plate boundaries (continental shelves can be mid-plate).

## Dependencies / Notes
- **Blocked by:** LOCAL-TBD-2 (Mesh Generation Strategy) - requires `context.artifacts.mesh`.
- **Blocked:** LOCAL-TBD-4 (Tectonic Physics Strategy) - physics needs crust type for material-aware interactions.
- **Reference:** [Foundation Stage Architecture - Strategy 2: Crust Generation](../../../../system/libs/mapgen/foundation.md#32-strategy-2-crust-generation)
- **Key Insight:** Crust defines the "Anvil" that receives tectonic forces. A single plate can contain both ocean and continent (like the African Plate).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Algorithm (from Foundation Architecture)
1. **Seed Cratons:** Place `cratonCount` seed points with distance buffers (ancient continental cores).
2. **Grow Continental Crust:** Use noise + distance fields to grow continental crust around Cratons.
3. **Define Oceanic:** Remaining area is defined as Oceanic Crust.
**Result:** A `CrustData` mask defining where the "Land" is, independent of where the plates will be.

### Craton Seeding Strategy
```typescript
function seedCratons(mesh: RegionMesh, config: CrustConfig, rng: RNG): number[] {
  const cratonCells: number[] = [];
  const minDistance = Math.sqrt(mesh.areas.length / config.cratonCount) * 1.5;

  for (let i = 0; i < config.cratonCount; i++) {
    // Pick random cell far from existing cratons
    const candidate = pickFarFromExisting(mesh, cratonCells, minDistance, rng);
    if (candidate !== -1) {
      cratonCells.push(candidate);
    }
  }
  return cratonCells;
}
```

### Continental Growth Algorithm
```typescript
function growContinentalCrust(
  mesh: RegionMesh,
  cratonCells: number[],
  config: CrustConfig,
  rng: RNG
): CrustData {
  const type = new Uint8Array(mesh.sites.length); // 0 = Oceanic
  const age = new Uint8Array(mesh.sites.length);  // 0 = New

  // Mark cratons as ancient continental
  for (const cell of cratonCells) {
    type[cell] = 1;    // Continental
    age[cell] = 255;   // Ancient
  }

  // Grow outward using noise-perturbed distance field
  const targetContinentalArea = config.continentalRatio * mesh.sites.length;
  // ... flood fill with noise perturbation ...

  return { type, age };
}
```

### CrustData Output
```typescript
interface CrustData {
  /** 0=Oceanic (Basalt), 1=Continental (Granite) */
  type: Uint8Array;
  /** 0=New (Active), 255=Ancient (Craton) */
  age: Uint8Array;
}
```

### Configuration Schema
```typescript
interface CrustConfig {
  continentalRatio: number; // % of world that is continental crust (default: 0.35)
  cratonCount: number;      // Number of stable cores (default: 4-6)
  growthNoise: number;      // Noise amplitude for organic shapes (default: 0.3)
}
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
