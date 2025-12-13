---
id: LOCAL-M3-DOCS-CLEANUP
title: "[M3] Documentation & Parity Matrix Cleanup"
state: planned
priority: 3
estimate: 2
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Documentation, Cleanup]
parent: null
children: []
blocked_by: [LOCAL-M3-VALIDATION, LOCAL-M3-TUNABLES-RETIREMENT]
blocked: []
related_to: [CIV-33, CIV-40]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Update docs to match M3 implementation; close parity matrix gaps.

## Context

**System area:** `docs/system/libs/mapgen/` and project tracking docs

**Change:** Synchronizes architecture.md, foundation.md, and config-wiring-status.md with M3 implementation. Updates parity matrix to reflect story system completion. Adds CHANGELOG entry for breaking changes.

**Outcome:** Documentation accurately describes the system for future contributors. Parity matrix becomes a reliable status source. Breaking changes are discoverable before upgrading.

## Deliverables

- [ ] **Architecture docs updated** — Pipeline, config, data products sections current
- [ ] **Parity matrix cleanup** — Story/corridor rows marked Parity, remaining gaps deferred
- [ ] **CHANGELOG entry** — M3 release notes with breaking changes

## Acceptance Criteria

- [ ] Docs match implementation
- [ ] No unexplained Missing rows for M3 scope
- [ ] All doc links valid

## Testing / Verification

```bash
# Check for broken links
find docs -name "*.md" -exec grep -l "\](.*\.md)" {} \; | xargs -I{} sh -c 'grep -oE "\]\([^)]+\.md\)" {} | sort -u'

# Verify docs compile (if using doc tooling)
pnpm run docs:build  # if exists
```

- Manual review of updated docs
- Verify code examples in docs are accurate
- Cross-reference with implementation

## Dependencies / Notes

- **Blocked by:** [LOCAL-M3-VALIDATION](LOCAL-M3-validation.md), [LOCAL-M3-TUNABLES-RETIREMENT](LOCAL-M3-tunables-retirement.md)
- **Related to:** [CIV-33](CIV-33-docs-alignment.md), [CIV-40](CIV-40-system-docs-target-vs-current.md)
- **Reference:** [DOCS.md](../../../DOCS.md) for doc standards
- **Timing:** Final task before M3 sign-off

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Documentation Update Checklist

**architecture.md updates:**
- [ ] §Config: New flat shape, step-aligned groups
- [ ] §Pipeline: MapGenStep interface, StepRegistry, PipelineExecutor
- [ ] §Data Products: Heightfield, ClimateField, StoryOverlays, RiverFlow
- [ ] §Context: MapGenContext.artifacts evolution
- [ ] §Phases: foundation, morphology, hydrology, ecology, placement

**foundation.md updates:**
- [ ] FoundationContext fields match implementation
- [ ] Artifact types (RegionMesh, CrustData, PlateGraph, TectonicData)
- [ ] FoundationStep integration
- [ ] Config consumption pattern

**config-wiring-status.md updates:**
- [ ] All M3 config fields documented
- [ ] Product consumption documented
- [ ] Deprecated fields marked
- [ ] New flat shape reflected

**Parity matrix cleanup:**

| Row | Status → | Action |
|-----|----------|--------|
| story/tagging | Missing → Parity | Update with M2/M3 work |
| story/corridors | Missing → Parity | Update with M3 work |
| story/swatches | Missing → Parity | Update with M3 work |
| story/paleo | Missing → Parity | Update with M3 work |
| presets | Detraction → Deferred | Document as M4 work |
| adapter boundary | Detraction → Deferred | Document as optional |

### CHANGELOG Section

```markdown
## [M3] Core Engine Refactor & Config Evolution

### Breaking Changes
- Config shape evolved to flat, step-aligned structure
- Old nested config still works with deprecation warnings
- FOUNDATION_CFG/CLIMATE_CFG facades removed (use context.config)

### Added
- MapGenStep, StepRegistry, PipelineExecutor
- Full story system (corridors, swatches, paleo)
- Canonical data products (Heightfield, ClimateField, StoryOverlays)
- Pipeline dependency validation

### Changed
- All major stages now run as pipeline steps
- Config consumed via context.config instead of tunables

### Migration Guide
See docs/system/libs/mapgen/migration-m3.md
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
