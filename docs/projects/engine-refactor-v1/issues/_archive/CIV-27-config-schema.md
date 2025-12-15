---
id: CIV-27
title: "[M2] Define MapGenConfigSchema with TypeBox"
state: done
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

- [x] Install `@sinclair/typebox` as a dependency in `mapgen-core`
- [x] Create `packages/mapgen-core/src/config/schema.ts` with:
  - `MapGenConfigSchema`: TypeBox schema for the full config
  - `MapGenConfig`: TypeScript type derived via `Static<typeof MapGenConfigSchema>`
  - Sub-schemas for each config group (foundation, landmass, climate, etc.)
- [x] Create `packages/mapgen-core/src/config/index.ts` re-exporting public API
- [x] Document the schema structure in code comments
- [x] Add schema-level metadata for internal-only fields (`xInternal`) and a public-schema guard helper (`getPublicJsonSchema`) as groundwork for future public/internal surface cleanup.

## Acceptance Criteria

- [x] `@sinclair/typebox` is listed in `mapgen-core/package.json` dependencies
- [x] `MapGenConfigSchema` covers all fields currently consumed by tunables and layers:
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
- [x] Schema preserves existing nesting patterns for backward compatibility
- [x] TypeScript compiles without errors
- [x] Types can be imported: `import { MapGenConfig, MapGenConfigSchema } from '@swooper/mapgen-core/config'`
- [x] Internal-only config plumbing is tagged at the schema level via `xInternal`, and a `getPublicJsonSchema` helper exists to filter those fields for future public-schema consumers (no current callers; integration is explicitly deferred).

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

### M2 Outcome: Public vs. Internal Schema

- For M2 we **do not** introduce a separate public config type or reshape the config surface.  
- The `xInternal` tagging and `getPublicJsonSchema` helper are implemented as **non-breaking groundwork** so that future issues can curate a public schema for tooling/docs without revisiting the core schema/loader again.  
- All existing consumers continue to use the full schema / `getJsonSchema()` for now; deciding where to consume the public schema is deferred to a later milestone.

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
