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

Reshape `MapGenConfig` from legacy nested patterns to step/phase-aligned sections, introduce compatibility adapters for old config shapes, and document migration path for existing Swooper map scripts. This is Phase 3 of the config refactor PRD.

## Deliverables

- [ ] **Design new config shape** (document before implementation)
  - Flatten: `foundation.mountains` → `mountains`
  - Step/phase-aligned groups:
    - `plates`, `landmass`, `mountains`, `volcanoes`
    - `climate`, `rivers`, `humidity`
    - `story`, `corridors`, `overlays`
    - `placement`, `diagnostics`
  - Document rationale in schema comments
- [ ] **Implement config shape migration**
  - Old-shape adapter for backward compat
  - `parseConfig()` handles both old and new shapes
  - Console warnings for deprecated config paths
  - Version marker for config shape detection
- [ ] **Update all config consumers**
  - Steps/layers read new shape via `context.config`
  - Remove legacy nested path lookups
  - Update tests for new shape
- [ ] **Update map script entries**
  - Document new config format
  - Provide migration examples
  - Keep old format working with warnings
- [ ] **Documentation**
  - Update architecture.md Config section
  - Update JSON schema export
  - Migration guide for mod authors

## Acceptance Criteria

- [ ] New config shape documented and implemented
- [ ] Old config shapes still work with deprecation warnings
- [ ] All steps/layers use new shape internally
- [ ] Existing Swooper map scripts continue to work
- [ ] JSON schema reflects new shape
- [ ] Build passes, all tests pass

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
