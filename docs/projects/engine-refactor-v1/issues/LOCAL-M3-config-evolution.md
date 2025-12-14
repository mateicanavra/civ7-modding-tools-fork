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

Complete Phase 2/3 of the config refactor: config is step-aligned, presets/recipes are real, and tunables are retired so all M3 steps read validated `MapGenConfig` via context.

## Deliverables

### Phase 2: Config-in-Context

- [ ] Ensure the pipeline context carries validated `MapGenConfig` and step wrappers read config via `context.config`.
- [ ] Identify and migrate remaining `getTunables()` reads in wrapped stages; prevent new primary config reads via tunables.

### Phase 3: Shape Evolution

- [ ] Reshape `MapGenConfigSchema` to match phases/steps (per `resources/PRD-config-refactor.md`) and migrate in-repo callers/presets to the new shape.
- [ ] Retire tunables as an engine surface for config (remove or reduce to an explicit, temporary compatibility shim only if intentionally kept).

### Presets/Recipes

- [ ] Implement preset resolution so `presets: [...]` is meaningful (bootstrap or pipeline pre-step), with a canonical baseline.
- [ ] Document/decide how legacy preset names map forward (keep/simplify/deprecate).

### Config Parity Decisions

- [ ] Resolve remaining ambiguous config fields tracked in `resources/config-wiring-status.md` (keep-and-wire vs deprecate vs remove) and reflect decisions in schema + docs.

## Acceptance Criteria

- [ ] All steps read config via `context.config` with the new phase-aligned schema
- [ ] No internal code uses tunables as a primary config path
- [ ] Preset resolution works and is tested
- [ ] `config-wiring-status.md` has no ambiguous "Unused / planned" rows
- [ ] In-repo map scripts work with the new config shape

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`
- Validate schema export (if applicable in this repo’s workflow) and sanity-check a few representative configs/presets used by Swooper maps.

## Dependencies / Notes

- **System area:** Config schema + bootstrap/config wiring + de-tunabling in `@swooper/mapgen-core`.
- **Change:** Make validated `MapGenConfig` the only supported config surface for steps; implement presets; reshape schema; retire tunables.
- **Outcome:** Config matches the Task Graph mental model; no hidden global config reads remain in M3.
- **Scope guardrail:** No behavior retuning; config changes should not materially change map output (beyond required deprecations/removals).
- **Depends on:** `LOCAL-M3-TASK-GRAPH-MVP`, `LOCAL-M3-HYDROLOGY-PRODUCTS`, `LOCAL-M3-STORY-SYSTEM`, `LOCAL-M3-BIOMES-FEATURES-WRAPPER`, `LOCAL-M3-PLACEMENT-WRAPPER`.
- **Blocks:** `LOCAL-M3-ADAPTER-COLLAPSE`.
- **Historical:** `CIV-26` is M2 Phase 1; this issue is the M3 successor.
- **Open questions (track here):**
  - Cutover plan: update in-repo callers/presets so the new shape is the supported path at M3 ship.
  - Preset semantics: parity vs simplification; where resolution lives (bootstrap vs pipeline pre-step).
  - Phase 2 minimum: what is the minimal “config-in-context” mapping needed to unlock Phase 3 reshaping and tunables retirement without leaving hidden reads?
  - Remaining dead fields: resolve `foundation.seed.*`, `oceanSeparation.respectSeaLanes`, and other `Missing` rows in `resources/config-wiring-status.md`.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

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
