---
id: CIV-27
title: "[M2] Define MapGenConfigSchema with TypeBox"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Improvement, Architecture]
parent: CIV-26
children: []
blocked_by: []
blocked: [CIV-28]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Define `MapGenConfigSchema` using TypeBox as the canonical, single source of truth for map generation configuration. Derive the `MapGenConfig` TypeScript type from the schema. This is the foundational type work for config hygiene.

## Deliverables

- [ ] Install `@sinclair/typebox` as a dependency in `mapgen-core`
- [ ] Create `packages/mapgen-core/src/config/schema.ts` with:
  - `MapGenConfigSchema`: TypeBox schema for the full config
  - `MapGenConfig`: TypeScript type derived via `Static<typeof MapGenConfigSchema>`
  - Sub-schemas for each config group (foundation, landmass, climate, etc.)
- [ ] Create `packages/mapgen-core/src/config/index.ts` re-exporting public API
- [ ] Document the schema structure in code comments

## Acceptance Criteria

- [ ] `@sinclair/typebox` is listed in `mapgen-core/package.json` dependencies
- [ ] `MapGenConfigSchema` covers all fields currently consumed by tunables and layers:
  - `presets?: string[]`
  - `stageConfig?: Record<string, boolean>`
  - `stageManifest?: StageManifest`
  - `toggles?: Toggles`
  - `landmass?: LandmassConfig`
  - `foundation?: FoundationConfig` (including nested plates, dynamics, etc.)
  - `climate?: ClimateConfig`
  - `mountains?: MountainsConfig`
  - `volcanoes?: VolcanoesConfig`
  - `coastlines?: CoastlinesConfig`
  - `islands?: IslandsConfig`
  - `biomes?: BiomeConfig`
  - `featuresDensity?: FeaturesDensityConfig`
  - `story?: StoryConfig`
  - `corridors?: CorridorsConfig`
  - `oceanSeparation?: OceanSeparationConfig`
- [ ] Schema preserves existing nesting patterns for backward compatibility
- [ ] TypeScript compiles without errors
- [ ] Types can be imported: `import { MapGenConfig, MapGenConfigSchema } from '@swooper/mapgen-core/config'`

## Testing / Verification

```bash
# Install dependency
pnpm -C packages/mapgen-core add @sinclair/typebox

# Type check
pnpm -C packages/mapgen-core check-types

# Build
pnpm -C packages/mapgen-core build

# Verify exports
node -e "import('@swooper/mapgen-core/config').then(m => console.log(Object.keys(m)))"
```

## Dependencies / Notes

- **Parent Issue**: CIV-26 (Config Hygiene & Fail-Fast Validation)
- **Blocks**: CIV-28 (needs schema for validation)
- **PRD Reference**: `resources/PRD-config-refactor.md` (Phase 1, Section 6.1)

### Why TypeBox?

TypeBox provides:
- Schema definition with TypeScript type inference
- JSON Schema export for tooling/docs
- High-performance validation via `TypeCompiler`
- Default value application via `Value.Default`
- Clean/convert utilities for normalization

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Schema Structure

```typescript
// config/schema.ts
import { Type, Static } from "@sinclair/typebox";

// Sub-schemas for each config group
const ToggleSchema = Type.Object({
  STORY_ENABLE_HOTSPOTS: Type.Optional(Type.Boolean()),
  STORY_ENABLE_RIFTS: Type.Optional(Type.Boolean()),
  // ... other toggles
}, { additionalProperties: true });

const FoundationPlatesSchema = Type.Object({
  count: Type.Optional(Type.Number({ default: 8, minimum: 2, maximum: 20 })),
  relaxationSteps: Type.Optional(Type.Number({ default: 5 })),
  convergenceMix: Type.Optional(Type.Number({ default: 0.5 })),
  // ... other fields
});

const FoundationSchema = Type.Object({
  seed: Type.Optional(FoundationSeedSchema),
  plates: Type.Optional(FoundationPlatesSchema),
  dynamics: Type.Optional(FoundationDynamicsSchema),
  mountains: Type.Optional(MountainsSchema),
  volcanoes: Type.Optional(VolcanoesSchema),
  // ... other nested configs
});

// Root schema
export const MapGenConfigSchema = Type.Object({
  presets: Type.Optional(Type.Array(Type.String())),
  stageConfig: Type.Optional(Type.Record(Type.String(), Type.Boolean())),
  stageManifest: Type.Optional(StageManifestSchema),
  toggles: Type.Optional(ToggleSchema),
  landmass: Type.Optional(LandmassSchema),
  foundation: Type.Optional(FoundationSchema),
  climate: Type.Optional(ClimateSchema),
  // Top-level layer configs (merged into foundation by tunables)
  mountains: Type.Optional(MountainsSchema),
  volcanoes: Type.Optional(VolcanoesSchema),
  coastlines: Type.Optional(CoastlinesSchema),
  islands: Type.Optional(IslandsSchema),
  biomes: Type.Optional(BiomeSchema),
  featuresDensity: Type.Optional(FeaturesDensitySchema),
  story: Type.Optional(StorySchema),
  corridors: Type.Optional(CorridorsSchema),
  oceanSeparation: Type.Optional(OceanSeparationSchema),
}, { additionalProperties: true }); // Allow unknown keys for forward compat

export type MapGenConfig = Static<typeof MapGenConfigSchema>;
```

### Key Design Decisions

1. **All fields optional**: Allows partial configs; defaults applied by loader
2. **`additionalProperties: true`**: Forward compatibility for unknown keys
3. **Preserve nesting**: Keep `foundation.plates` pattern for mod compatibility
4. **Top-level shortcuts**: Allow `mountains: {...}` at root (merged by tunables)
5. **Range constraints**: Add `minimum`/`maximum` where known (fail fast on out-of-range)

### Files to Create

```
packages/mapgen-core/src/config/
├── schema.ts     # TypeBox schemas
├── defaults.ts   # Default config values (optional, can inline in schema)
└── index.ts      # Re-exports
```

### Quick Navigation

- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
