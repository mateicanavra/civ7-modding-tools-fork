---
id: LOCAL-M3-CONFIG-EVOLUTION
title: "[M3] Config Shape Evolution Phase 3"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Config, Breaking]
parent: null
children: [LOCAL-M3-TUNABLES-RETIREMENT]
blocked_by: [LOCAL-M3-CONFIG-INTEGRATION, LOCAL-M3-TUNABLES-REDUCTION]
blocked: []
related_to: [CIV-26]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Flatten config to step/phase-aligned shape with backward-compat adapter (Config PRD Phase 3).

## Context

**System area:** `mapgen-core` configuration schema (`config/schema.ts`, `config/loader.ts`)

**Change:** Restructures `MapGenConfig` from legacy nested form (`foundation.mountains`) to flat, phase-aligned groups (`mountains`, `climate.baseline`). Adds adapter layer that detects old shape and migrates with deprecation warnings.

**Outcome:** Config structure mirrors pipeline phases, making it obvious which knobs affect which steps. Mod authors get clear deprecation path. Schema becomes self-documenting for the pipeline architecture.

## Deliverables

- [ ] **New config shape** — Flat, step-aligned groups (`plates`, `landmass`, `climate`, etc.)
- [ ] **Backward-compat adapter** — Old nested shape works with deprecation warnings
- [ ] **Migration guide** — Documentation for mod authors

## Acceptance Criteria

- [ ] New shape implemented, old shape still works
- [ ] Existing map scripts unaffected
- [ ] Build and tests pass

## Testing / Verification

```bash
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core run check-types
```

- Test with old config shape (should work with warnings)
- Test with new config shape (should work cleanly)
- Verify JSON schema generation
- Manual test with existing map entries

## Dependencies / Notes

- **Blocked by:** [LOCAL-M3-CONFIG-INTEGRATION](LOCAL-M3-config-integration.md), [LOCAL-M3-TUNABLES-REDUCTION](LOCAL-M3-tunables-reduction.md)
- **Reference:** [PRD-config-refactor.md](../resources/PRD-config-refactor.md) Phase 3
- **Breaking change:** Config shape will change (with compat adapter)
- **Decision needed:** Deprecation timeline for old shape

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Config Shape Evolution

```typescript
// Before (nested, legacy)
{
  foundation: {
    plates: { count: 12 },
    mountains: { tectonicIntensity: 1.2 },
    dynamics: { mantle: { bumps: 5 } }
  }
}

// After (flat, step-aligned)
{
  plates: { count: 12, relaxationSteps: 3 },
  landmass: { baseWaterPercent: 0.6, crustMode: 'area' },
  mountains: { tectonicIntensity: 1.2, mountainThreshold: 0.7 },
  volcanoes: { enabled: true, baseDensity: 0.01 },
  climate: {
    baseline: { bands: { deg0to10: 80 } },
    refine: { orographic: { steps: 3 } }
  },
  story: { hotspot: { paradiseBias: 0.6 } },
  corridors: { sea: { protection: 'soft' } },
  placement: { wondersPlusOne: true },
  diagnostics: { logTiming: true }
}
```

### Adapter Implementation

```typescript
function migrateConfig(input: unknown): MapGenConfig {
  const config = input as Record<string, unknown>;

  // Detect old shape
  if (config.foundation?.mountains) {
    console.warn('[Config] Deprecated: foundation.mountains → use top-level mountains');
    config.mountains = config.mountains ?? config.foundation.mountains;
  }

  // Continue with remaining migrations...

  return parseNewConfig(config);
}
```

### Phase-Aligned Groups

| Phase | Config Groups |
|-------|--------------|
| foundation | `plates`, `dynamics`, `seed` |
| morphology | `landmass`, `mountains`, `volcanoes`, `coastlines`, `islands` |
| hydrology | `lakes`, `rivers` (future) |
| climate | `climate.baseline`, `climate.refine` |
| story | `story`, `corridors`, `overlays` |
| ecology | `biomes`, `featuresDensity` |
| placement | `placement` |
| meta | `diagnostics`, `stageConfig` |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
