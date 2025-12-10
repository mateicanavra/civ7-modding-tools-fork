---
id: CIV-12
title: "[M-TS-07c] Migrate Climate & Biomes Layers"
state: done
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M1-TS-typescript-migration
assignees: []
labels: [feature]
parent: CIV-7
children: []
blocked_by: [CIV-10]
blocked: [CIV-13]
related_to: [CIV-11]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Migrate climate simulation, biome designation, and feature placement layers from JavaScript to TypeScript.

## Deliverables

- [x] Migrate climate layers to `src/layers/`:
  - [x] `climate-engine.js` → `climate-engine.ts` (rainfall & humidity modeling)
- [x] Migrate biome/feature layers:
  - [x] `biomes.js` → `biomes.ts` (enhanced biome designation)
  - [x] `features.js` → `features.ts` (feature placement with climate awareness)
- [x] Type ClimateField interfaces
- [x] Ensure layers consume adapter interface for base-standard calls

## Acceptance Criteria

- [x] All climate/biome/feature layer files compile without TypeScript errors
- [x] ClimateField types properly defined and exported
- [x] Layers delegate `/base-standard/...` calls through adapter
- [x] No remaining `.js` files for these layers

## Testing / Verification

```bash
# Type check
pnpm -C packages/mapgen-core check

# Build
pnpm -C packages/mapgen-core build

# Verify exports
node -e "import('@swooper/mapgen-core/layers').then(m => console.log('applyClimate' in m))"
```

## Dependencies / Notes

- **Parent**: M-TS-07
- **Blocked by**: M-TS-07a (Core types)
- **Blocks**: M-TS-07d (Orchestrator)
- **Related to**: M-TS-07b (Terrain layers)
- **Note**: These layers call base-standard `designateBiomes()` and `addFeatures()` — ensure adapter wraps these

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Files to Migrate

| Source | Target | Lines |
|--------|--------|-------|
| `layers/climate-engine.js` | `src/layers/climate-engine.ts` | ~400 |
| `layers/biomes.js` | `src/layers/biomes.ts` | ~200 |
| `layers/features.js` | `src/layers/features.ts` | ~200 |

### ClimateField Interface

```typescript
// src/core/types.ts (addition)
export interface ClimateField {
  rainfall: Float32Array;
  humidity: Float32Array;
  temperature: Float32Array;
}

export interface ClimateConfig {
  baseline: BaselineConfig;
  refine: RefineConfig;
  swatches: SwatchConfig;
}
```

### Base-Standard Wrapper Pattern

```typescript
// These layers call base-standard functions — wrap via adapter
export function applyBiomes(
  ctx: MapContext,
  adapter: EngineAdapter
): void {
  // Prepare climate data...

  // Call base-standard through adapter
  adapter.designateBiomes();

  // Apply narrative overlays...
}
```

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
