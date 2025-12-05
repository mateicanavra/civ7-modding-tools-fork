# TEMP PLAN — Config Resolution and Entry Simplification

Owner: Map Systems
Status: In Progress (Entry pattern decided; Phase 1 complete)
Scope: v1.2+ refactor; low-risk, incremental; no functional behavior change until flip

---

## 1) Goals

- Make each map entry file the single source of truth for configuration.
- Eliminate “implicit defaults” scattered across modules; move them into explicit defaults/presets.
- Provide one unified “resolved” config surface that all layers/orchestrator/dev tooling read from.
- Reduce entry boilerplate to a tiny, memorable pattern.

Non-goals:
- Changing gameplay balance or pass ordering.
- Introducing heavyweight runtime merging across large graphs (keep O(1) per read with one O(N) merge per run).

---

## 2) Pain Points Today

- Two config sources:
  - Per-entry runtime config (set via `runtime.setConfig`) used in orchestrator for a few keys.
  - Static `map_config.js` used by most layers/WorldModel/dev via `tunables.js`.
- Friction:
  - Per-entry overrides for world model, features, etc. do not flow into layers.
  - Static toggles in `tunables.js` can disagree with runtime toggles used in the orchestrator.
  - Defaults are embedded in multiple places instead of one explicit defaults file.

---

## 3) Proposed Architecture

### Components

- defaults/base.js
  - A single, explicit default config object (`BASE_CONFIG`), frozen.

- presets/*.js
  - Small, named preset objects (e.g., `temperate.js`, `classic.js`, `rifted.js`), each exporting a partial config.
  - Naming: concise and descriptive.

- runtime.js (existing)
  - Role: storage for “active per-entry” config set by a map script before generation.
  - Keep for now to avoid touching engine bootstrap timing; may be folded later.

- resolved.js (new)
  - Role: single source of resolved config for all consumers.
  - Responsibilities:
    - Build a config snapshot: defaults <- presets[] (left→right) <- runtime overrides.
    - Expose read APIs that return values from the current snapshot.
    - Provide `refresh()` to rebuild the snapshot at GenerateMap time.
    - Ensure immutability (freeze snapshot) for predictability.

- tunables.js (transition shim)
  - Short-term: Re-export from `resolved.js` or call `resolved.get*()` so we can migrate layers without large churn.
  - Long-term: Deprecate once all imports move to `resolved.js`.

- entry.js (optional bootstrap helper)
  - To minimize entry boilerplate: one function that sets per-entry config and ensures the orchestrator is loaded, with optional presets composition.

### Merge Semantics

- Precedence and order:
  1) `defaults/base.js` (lowest precedence)
  2) Zero or more presets, applied left-to-right
  3) Per-entry runtime overrides (highest precedence)
- Merge operation:
  - Safe deep-merge (object-only, arrays replace by default; keep simple/explicit).
  - Freeze the final snapshot to prevent accidental mutation.
- Determinism: One `refresh()` call per generation (start of `generateMap`).

---

## 4) Module Layout (Names are illustrative)

- `maps/config/defaults/base.js` → `export const BASE_CONFIG = Object.freeze({...});`
- `maps/config/presets/temperate.js` → `export const TEMPERATE_PRESET = Object.freeze({...});`
- `maps/config/presets/classic.js` → `export const CLASSIC_PRESET = Object.freeze({...});`
- `maps/config/presets/rifted.js` → `export const RIFTED_PRESET = Object.freeze({...});`
- `maps/config/runtime.js` → unchanged (storage API used by entries)
- `maps/config/resolved.js` → new resolver/provider (see API below)
- `maps/config/tunables.js` → transition shim: read from `resolved.js`
- `maps/config/entry.js` → optional helper to bootstrap entries with minimal boilerplate

---

## 5) Resolved API Sketch (Read-Oriented)

- Lifecycle
  - `initialize({ defaults, presets[] })` — called at module import with known defaults/presets (or lazy-register).
  - `refresh()` — rebuilds snapshot using current `runtime.getConfig()` and registered defaults/presets.
  - Internals: hold frozen `SNAPSHOT` object; getters read from it.

- Accessors (examples; names can align with existing usage)
  - `getSnapshot()` → full frozen object (debugging/dev)
  - `getToggles()` → `{ STORY_ENABLE_* ... }`
  - `getGroup(name)` → generic (e.g., `"landmass"`, `"worldModel"`, `"corridors"`, etc.)
  - Named helpers:
    - `LANDMASS_CFG()`, `COASTLINES_CFG()`, `CLIMATE_BASELINE_CFG()`, `CLIMATE_REFINE_CFG()`, `WORLDMODEL_CFG()`, `WORLDMODEL_DIRECTIONALITY()`, `CORRIDORS_CFG()`, `PLACEMENT_CFG()`, etc.
  - Dev config:
    - `DEV_LOG_CFG()` → dev logger flags read at runtime

- Guarantees
  - Consumers get current run’s resolved config (not import-time snapshots).
  - Frozen returns to avoid accidental mutation.

---

## 6) Entry Boilerplate: Minimal Patterns

### Pattern A — Bootstrap Helper (recommended)

- Entry file does only:
  - Choose presets by name
  - Provide overrides
  - Call a bootstrap function (sets runtime, imports orchestrator)

- Example (pseudocode):
  - `import { bootstrap } from "./config/entry.js";`
  - `bootstrap({ presets: ["classic", "temperate"], overrides: { toggles: {...}, worldModel: {...} } });`

- Behavior:
  - `bootstrap` composes an inline config object (presets + overrides), calls `runtime.setConfig`, then loads the orchestrator once.
  - No need to remember multiple imports in entries.

### Pattern B — Explicit Composition (supported)

- For advanced cases, entries can import preset objects and compose:
  - `import { setConfig } from "./config/runtime.js";`
  - `import { TEMPERATE_PRESET } from "./config/presets/temperate.js";`
  - `setConfig({ ...TEMPERATE_PRESET, ...{ overrides here } });`
  - `import "./map_orchestrator.js";`

- Decision: Adopt Pattern A (explicit bootstrap + explicit orchestrator import) as the standard entry pattern. Pattern B (“one import”) remains documented but deferred. Rationale: explicit import ordering is robust on the game VM today; moving to a single import safely would require making all config reads lazy and resolving at runtime (GenerateMap), which we may revisit later.

---

## 7) Orchestrator Hook-Up

- Start of `generateMap()`:
  - Call `resolved.refresh()` once.
  - Replace any direct `getConfig()` usages with reads from `resolved` (e.g., toggles, geometry).
- Layers and WorldModel:
  - Migrate imports from `config/tunables.js` to `config/resolved.js` (or to the shim initially).
  - Ensure they call functions/getters (not static consts) so they always see the refreshed snapshot.

---

## 8) Dev Logger Alignment

- `dev.js` should read dev flags from `resolved.DEV_LOG_CFG()` once at the beginning of a generation (or reactively allow live toggles in dev mode).
- Default dev flags live in `defaults/base.js` under `dev` group; presets/overrides can change them per entry.
- For release builds, we can set dev flags off in defaults and keep per-entry overrides minimal.

---

## 9) Migration Plan (Incremental)

Phase 0 — Prepare — COMPLETED
- Added `defaults/base.js` and initial `presets/*` (`classic`, `temperate`).
- Added `resolved.js` with deep-merge and deep-freeze; no compatibility shim.
- Rewired `tunables.js` to resolved getters; snapshot refresh occurs at import.

Phase 1 — Switch Orchestrator — COMPLETED
- Orchestrator now reads toggles and geometry via `config/tunables.js` (backed by `resolved.js`).
- Entries use presets via `runtime.setConfig({ presets: [...] })` (`classic`, `temperate`).
- Removed experimental/legacy modules; pruned unused imports; removed orphaned localization row.
- Fixed `deepFreeze` to be non-mutating and safe with frozen inputs.

Phase 2 — Align Dev Logger with Resolved Config (NEXT)
- Read dev flags from `resolved.DEV_LOG_CFG()` at generation start.
- Keep defaults quiet; allow per-entry/preset overrides.

Phase 3 — Defaults Consolidation (NEXT)
- Move literal defaults from `map_config.js` into `defaults/base.js`.
- Retire `map_config.js` or make it a thin passthrough to `BASE_CONFIG`.
- Update docs to reference `defaults/base.js` as the canonical source.

Phase 4 — Entry Bootstrap Helper (NEXT)
- Add `config/entry.js` with `bootstrap({ presets, overrides })` to further reduce entry boilerplate.
- Migrate entries to the helper; keep manual composition supported.

Phase 5 — Cleanup and Docs (NEXT)
- Verify all consumers rely on resolved config; remove any remaining scattered defaults.
- Update DESIGN.md with Layer Contracts and call out resolved config as the source of truth.

---

## 10) Risks and Mitigations

- Risk: Partial migration leads to mixed sources (resolved vs static).
  - Mitigation: Transition shim in `tunables.js` and an acceptance gate to confirm all consumers read from resolved.

- Risk: Entry config timing vs import timing (import-time snapshots).
  - Mitigation: Ensure every consumer uses functions/getters and orchestrator calls `refresh()` per run.

- Risk: Merge ambiguity (arrays/objects).
  - Mitigation: Keep merge rules simple; document array replacement semantics; test representative overrides.

---

## 11) Acceptance Criteria

- Each map entry can define/compose its configuration strictly from defaults/presets plus inline overrides.
- All toggles/tunables observed by orchestrator, layers, story, and WorldModel match the entry’s resolved config.
- No implicit or scattered defaults remain; they live in `defaults/base.js` (and documented presets).
- Dev logger flags honor per-entry resolved dev config.

---

## 12) Work Breakdown (Estimates: S/M/L)

- Create `defaults/base.js` and 2–3 presets (S)
- Add `resolved.js` with merge/refresh and read APIs (M)
- Update `tunables.js` to a shim (S)
- Orchestrator: call `refresh()`; switch reads to resolved (S)
- Layers/Story/WorldModel: import getters (M)
- Add `entry.js` bootstrap and migrate `temperate` entry (S)
- Remove legacy static bits in `tunables.js`; update docs (S)
- Validation: smoke test per-pass logs + quick histograms (S)
- Final cleanup and enable plan docs in DESIGN.md (S)

---

## 13) Open Questions

- Do we want arrays to merge (concat/dedup) or replace? Proposal: replace for predictability; add a helper for advanced merging later if needed.
- Should `resolved.js` also offer a minimal schema validation (dev only)? Optional; can add warnings in dev mode if keys are misspelled.
- Long-term: fold `runtime.setConfig` into a re-export in `resolved.js` to remove one import from entries (further reducing boilerplate).

---