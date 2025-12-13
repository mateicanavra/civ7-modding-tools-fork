---
id: LOCAL-M3-CONFIG-EVOLUTION
title: "[M3] Config Evolution (Phase 2/3) + Presets/Recipes + Tunables Retirement"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Config, Architecture]
parent: null
children: []
blocked_by: [LOCAL-M3-TASK-GRAPH-MVP, LOCAL-M3-HYDROLOGY-PRODUCTS, LOCAL-M3-STORY-SYSTEM, LOCAL-M3-BIOMES-FEATURES-WRAPPER, LOCAL-M3-PLACEMENT-WRAPPER]
blocked: [LOCAL-M3-ADAPTER-COLLAPSE]
related_to: [CIV-26]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Complete the config story started in M2: steps read config via `context.config`, the schema is reshaped to match phases/steps, presets become real, and tunables are retired. This makes configuration intuitive for modders and consistent with the Task Graph model.

## Context & Motivation

M2 established config hygiene (validated schema, no globals), but config is still shaped around legacy groupings and read via tunables:

- Config shape reflects legacy `foundation.xxx` nesting and tunables facades
- Steps still read config via `FOUNDATION_CFG`/`CLIMATE_CFG` tunables snapshots
- `presets` field exists in schema but is currently unused
- Many config fields have ambiguous status (Legacy-only, Unused/planned, Partially wired)

Phase C of M3 completes the config story:

1. **Phase 2 (config-in-context):** Steps read config via `context.config`, not tunables
2. **Phase 3 (shape evolution):** Schema reshaped to match phases/steps
3. **Presets/recipes:** Named presets supply per-stage overrides
4. **Tunables retirement:** No hidden global config

## Capability Unlocks

- Config surface is intuitive for mod authors—mirrors the generation phases
- Steps can be configured independently via per-step config sections
- Presets work as documented (not just a schema placeholder)
- No hidden config reads via tunables or globals

## Deliverables

### Phase 2: Config-in-Context

- [ ] **`MapGenContext.config` populated at pipeline start**
  - Validated `MapGenConfig` available via `context.config`
  - All step wrappers read config via `context.config`, not tunables

- [ ] **Legacy tunables marked deprecated**
  - `FOUNDATION_CFG`/`CLIMATE_CFG` marked as deprecated compatibility layer
  - Deprecation warnings emitted when accessed directly

- [ ] **Audit remaining tunables usage**
  - Document which reads are compatibility-only
  - Ensure no new code uses tunables as primary config path

### Phase 3: Shape Evolution

- [ ] **`MapGenConfigSchema` restructured**
  - Top-level phase/step-aligned sections:
    - `plates`, `landmass`, `mountains`, `volcanoes`
    - `climate`, `rivers`, `humidity`
    - `story`, `corridors`, `overlays`
    - `placement`, `diagnostics`

- [ ] **In-repo callers migrated**
  - Map scripts updated to use new config shape
  - Presets updated to new shape

- [ ] **Tunables retired**
  - `bootstrap/tunables.ts` removed or reduced to minimal compatibility shim

- [ ] **Documentation updated**
  - JSON Schema export reflects new shape
  - Config docs updated

### Presets/Recipes

- [ ] **Canonical `BASE_CONFIG` defined**
  - Either in-repo constant or documented default derivation

- [ ] **Preset resolution implemented**
  - Bootstrap or pipeline pre-step applies named presets
  - Presets can supply per-step config overrides

- [ ] **Legacy presets decision documented**
  - Explicit decision on `classic`, `temperate`, etc.
  - Either preserved, simplified, or deprecated

### Config Parity Decisions

- [ ] **All `config-wiring-status.md` rows resolved**
  - For each: keep-and-wire, deprecate-with-warning, or remove
  - No ambiguous "Unused / planned" fields remain

- [ ] **Deprecated fields emit warnings**
  - Runtime warnings when deprecated config fields are used

## Acceptance Criteria

- [ ] All steps read config via `context.config` with the new phase-aligned schema
- [ ] No internal code uses tunables as a primary config path
- [ ] Preset resolution works and is tested
- [ ] `config-wiring-status.md` has no ambiguous "Unused / planned" rows
- [ ] In-repo map scripts work with the new config shape

## Out of Scope

- Per-step config schemas (global `MapGenConfig` schema only in M3)
- UI/editor representation of config (beyond JSON schema export)
- Config for features not yet implemented (post-M3)

## Open Questions & Considerations

- **Cutover plan:** What is the cutover plan for existing in-repo callers and presets/recipes so the new config shape is the supported path at M3 ship?
- **Preset semantics:** Do we want full parity with legacy preset semantics, or simplify/deprecate the field?
- **Resolution location:** Where should preset resolution live (bootstrap vs. pipeline pre-step)?
- **Remaining dead fields:** Decide on remaining dead/legacy fields beyond the M2 stable slice (e.g., `foundation.seed.*`, `oceanSeparation.respectSeaLanes`, other `Missing` rows in `config-wiring-status.md`)

## Dependencies & Relationships

**Depends on:**
- `LOCAL-M3-TASK-GRAPH-MVP` (Stack 1): Pipeline must exist for config-in-context
- `LOCAL-M3-HYDROLOGY-PRODUCTS` (Stack 2): Step must be wrapped to migrate config reads
- `LOCAL-M3-STORY-SYSTEM` (Stack 3): Step must be wrapped to migrate config reads
- `LOCAL-M3-BIOMES-FEATURES-WRAPPER` (Stack 4): Step must be wrapped to migrate config reads
- `LOCAL-M3-PLACEMENT-WRAPPER` (Stack 5): Step must be wrapped to migrate config reads

**Blocks:**
- `LOCAL-M3-ADAPTER-COLLAPSE` (Stack 7): Adapter cleanup happens after config is stable

**Historical context:**
- `CIV-26` (M2): Config hygiene parent—Phase 1 complete; this is the M3 successor

## Risk Controls

- **Branch safety:** Intermediate states may be non-backwards-compatible while the cutover is in flight, but the stack should remain runnable by updating in-tree callers and scripts as part of the same milestone branch
- **No generation changes:** Config evolution should not change map output
- **Incremental migration:** Migrate callers as config shape evolves, not all at once at the end

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

### Key Files (Expected)

- `packages/mapgen-core/src/config/schema.ts` (modify: reshape)
- `packages/mapgen-core/src/config/presets.ts` (new: preset resolution)
- `packages/mapgen-core/src/bootstrap/tunables.ts` (delete or minimize)
- `packages/mapgen-core/src/MapOrchestrator.ts` (modify: use context.config)
- All step files (modify: use context.config)

### Sources

- `../resources/PRD-config-refactor.md` (Phase 2 & 3)
- `../resources/config-wiring-status.md`
- `packages/mapgen-core/src/config/schema.ts` comments
