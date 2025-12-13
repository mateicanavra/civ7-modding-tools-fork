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

Update all M3-affected documentation to reflect implemented changes: architecture.md, foundation.md, config-wiring-status.md, and parity matrix. Close or defer remaining open items. Ensure docs match implementation.

## Deliverables

- [ ] **Update architecture.md**
  - Config section reflects new shape
  - Pipeline section documents MapGenStep, Registry, Executor
  - Data products section documents all canonical products
  - Step registration patterns documented
- [ ] **Update foundation.md**
  - FoundationContext contract matches implementation
  - Artifact types documented
  - Step integration documented
- [ ] **Update config-wiring-status.md**
  - All fields marked as wired/unused/deprecated
  - New config shape reflected
  - Product usage documented
- [ ] **Update parity matrix**
  - Story/corridor rows updated to Parity
  - Remaining Missing rows addressed or deferred
  - Intentional divergences documented
  - Link issues for any remaining gaps
- [ ] **Update CHANGELOG.md**
  - M3 release notes
  - Breaking changes documented
  - Migration guide for config shape
- [ ] **Archive superseded docs**
  - Move outdated docs to `_archive/`
  - Update links in remaining docs

## Acceptance Criteria

- [ ] architecture.md matches M3 implementation
- [ ] foundation.md matches M3 implementation
- [ ] config-wiring-status.md fully updated
- [ ] No unexplained `Missing` rows in parity matrix for M3 scope
- [ ] CHANGELOG has M3 section with breaking changes
- [ ] All doc links valid (no broken references)

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
