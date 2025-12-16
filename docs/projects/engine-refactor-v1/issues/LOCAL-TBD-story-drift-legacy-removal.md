---
id: LOCAL-TBD
title: "[M4] Remove Legacy Orchestration & Story Toggle Surfaces"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: null
assignees: []
labels: [Improvement, Architecture, Technical Debt]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [CIV-43]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove the legacy orchestrator path and legacy `STORY_ENABLE_*` toggle surface from `@swooper/mapgen-core`, making TaskGraph the sole execution path and `stageManifest` the single source of truth for stage enablement.

## Deliverables

- [ ] **Group 1**: Migrate all in-repo consumers (mods, tests) to `useTaskGraph: true`
- [ ] **Group 2**: Remove legacy orchestration fork—`generateMap()` becomes TaskGraph-only
- [ ] **Group 3**: Remove `config.toggles.STORY_ENABLE_*` surface; migrate downstream to canonical signals
- [ ] **Group 4**: Remove legacy shims (`createLegacy*Step`, `LegacyPlacementStep`, legacy bootstrap shapes) and update docs
- [ ] **Group 5**: Move story state (tags, caches, overlays) to context-owned artifacts (requires design decision)

## Acceptance Criteria

- [ ] `generateMap()` has no branching logic—TaskGraph is the only path
- [ ] `OrchestratorConfig.useTaskGraph` option does not exist
- [ ] No `STORY_ENABLE_*` fields in config schema or presets
- [ ] All downstream toggle consumers use canonical signals (tags, config presence, stage flags)
- [ ] No `createLegacy*Step` exports or `LegacyPlacementStep.ts`
- [ ] No legacy bootstrap input shapes
- [ ] (Group 5) No module-level story singletons required for correctness
- [ ] `pnpm -C packages/mapgen-core check` passes
- [ ] `pnpm test:mapgen` passes
- [ ] Mods load without error

## Testing / Verification

- `pnpm -C packages/mapgen-core check` (type check)
- `pnpm test:mapgen` (unit tests)
- Load mods in-game and verify no regressions (smoke test)
- Spot-check story stage enable/disable combinations

## Dependencies / Notes

- **System area:** MapOrchestrator, bootstrap, config schema, pipeline steps, story system
- **Change:** Eliminate dual orchestration paths and legacy compatibility surfaces; consolidate on TaskGraph + stageManifest
- **Outcome:** Single execution path, single enablement surface, reduced drift risk
- **Rationale:** Modularization work (CIV-M4-ADHOC) reduced "two story implementations" drift, but keeping two orchestrators alive still creates structural drift risk. This removes the primary source.

**Architectural decisions (locked):**
- TaskGraph is the only supported orchestration path
- Stage enablement is driven only by `stageManifest` (resolved via `bootstrap()`)
- Paleo runs whenever `climate.story.paleo` config is present (no independent toggle)
- Story globals remain temporarily until Group 5 completes

**Open questions (affect Group 5):**
1. Context-owned representation for story tags/caches: artifact or `ctx.story.*` object?
2. Overlay registry semantics: check size > 0 or use stable "exists but empty" representation?

**Related docs:**
- Spike/PRD: `docs/projects/engine-refactor-v1/resources/SPIKE-story-drift-legacy-path-removal.md`
- Related issue: `CIV-M4-ADHOC-modularize.md`

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Sub-Issue Breakdown

This issue is structured as 5 sequential implementation groups. Each group is self-contained and can be completed in 1-2 sessions.

#### Group 1: Migrate Consumers to TaskGraph

**TL;DR:** Prepare all in-repo consumers before removing the legacy path.

**Files to migrate:**
- `mods/mod-swooper-maps/src/swooper-desert-mountains.ts` — add `useTaskGraph: true`
- `packages/mapgen-core/test/orchestrator/story-parity.smoke.test.ts` — update to TaskGraph
- Audit other orchestrator tests calling `generateMap()` without `useTaskGraph`

**Done when:**
- All mods explicitly use `useTaskGraph: true`
- All orchestrator tests use TaskGraph path
- `pnpm test:mapgen` passes
- Mods load without error

---

#### Group 2: Remove Legacy Orchestration Fork

**TL;DR:** Make TaskGraph the only execution path.

**Deletions:**
- `OrchestratorConfig.useTaskGraph` option
- `generateMap()` branch selecting between orchestrators
- Legacy inline stage runner blocks (including inline story stages)

**Migrations:**
- Remove now-unnecessary `useTaskGraph: true` from mods
- Regenerate built artifacts under `mods/mod-swooper-maps/mod/maps/*.js`

**Done when:**
- `generateMap()` always uses TaskGraph
- No inline stage runner code remains in `MapOrchestrator.ts`
- Tests and mods pass

---

#### Group 3: Remove Legacy Toggle Surface

**TL;DR:** Single source of truth for stage enablement.

**Deletions:**
- `config.toggles.STORY_ENABLE_*` fields from `TogglesSchema`
- `config.toggles.STORY_ENABLE_*` assignments from presets
- Toggle-derivation bridge in `MapOrchestrator.buildContextConfig()`
- `StageDescriptorSchema.legacyToggles` dead metadata

**Migrations (per-consumer):**

| File | Current Toggle | Migration Strategy |
|------|----------------|-------------------|
| `domain/ecology/features/index.ts` | `STORY_ENABLE_HOTSPOTS` | Check story tag sets |
| `domain/ecology/biomes/index.ts` | `STORY_ENABLE_RIFTS` | Check story tag sets |
| `domain/hydrology/climate/refine/orogeny-belts.ts` | `STORY_ENABLE_OROGENY` | Check story tag sets or stage flag |
| `pipeline/hydrology/index.ts` | Paleo toggle | Check `climate.story.paleo` config presence |

**Done when:**
- No `STORY_ENABLE_*` fields anywhere
- All consumers use canonical signals
- Type check and tests pass

---

#### Group 4: Remove Legacy Shims & Cleanup

**TL;DR:** Remove compatibility surfaces for historical callers.

**Deletions:**
- `packages/mapgen-core/src/steps/*` legacy step aliases
- `packages/mapgen-core/src/pipeline/placement/LegacyPlacementStep.ts`
- `BootstrapConfig.stages` legacy interface

**Migrations:**
- `test/orchestrator/placement-config-wiring.test.ts` — use `createPlacementStep`
- `docs/system/mods/swooper-maps/architecture.md` — remove legacy references

**Done when:**
- No legacy exports or files
- Docs updated
- Tests pass

---

#### Group 5: Story State to Context-Owned

**TL;DR:** Explicit data flow with no hidden global state.

**Prerequisite:** Resolve open questions (artifact vs ctx.story.* representation; overlay registry semantics)

**Deletions:**
- Global overlay registry fallback
- Module-level StoryTags singleton
- Module-level story caches

**Migrations:**
- Story steps publish tags/state as context artifact
- All story tag consumers read from context
- All overlay consumers read from context

**Done when:**
- No module-level story singletons required for correctness
- All cross-stage story data carried via context
- Disabling story stages cannot cause stale global state leakage
- Smoke tests pass with story stages enabled and disabled

---

### Key File References

**Orchestrator:**
- `packages/mapgen-core/src/MapOrchestrator.ts` — main orchestrator with legacy fork

**Config/Schema:**
- `packages/mapgen-core/src/config/schema.ts` — `TogglesSchema`, `StageDescriptorSchema.legacyToggles`
- `packages/mapgen-core/src/config/presets.ts` — story toggle assignments

**Bootstrap:**
- `packages/mapgen-core/src/bootstrap/entry.ts` — legacy `BootstrapConfig.stages` interface
- `packages/mapgen-core/src/bootstrap/resolved.ts` — `STAGE_ORDER`

**Pipeline:**
- `packages/mapgen-core/src/pipeline/StepRegistry.ts`
- `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`
- `packages/mapgen-core/src/pipeline/placement/LegacyPlacementStep.ts`

**Steps:**
- `packages/mapgen-core/src/steps/index.ts` — legacy step exports

**Domain (toggle consumers):**
- `packages/mapgen-core/src/domain/ecology/features/index.ts`
- `packages/mapgen-core/src/domain/ecology/biomes/index.ts`
- `packages/mapgen-core/src/domain/hydrology/climate/refine/orogeny-belts.ts`
- `packages/mapgen-core/src/pipeline/hydrology/index.ts`

**Mods:**
- `mods/mod-swooper-maps/src/swooper-earthlike.ts`
- `mods/mod-swooper-maps/src/swooper-desert-mountains.ts`

**Tests:**
- `packages/mapgen-core/test/orchestrator/story-parity.smoke.test.ts`
- `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts`

### Scope Boundaries

**In scope:**
- Remove legacy orchestration path
- Remove legacy story toggle surface
- Remove legacy shims
- Migrate downstream gating to canonical signals
- Move story state to context-owned

**Non-goals (explicit deferrals):**
- Algorithm mode selectors like `"legacy" | "area"` (behavior modes, not compatibility surfaces)
- Deprecated diagnostics toggles (not directly tied to story drift)

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Internal breakage | Migrate all in-repo consumers in lockstep (Group 1) |
| Config semantic ambiguity | Clean up presets and toggle derivation in same pass (Group 3) |
| Global story state drift | Address in Group 5 after orchestration fork is gone |
| Hidden external consumers | Low risk if repo not yet published; internal-only concern |
