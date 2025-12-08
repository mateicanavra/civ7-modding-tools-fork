# M-TS: TypeScript Migration – Remediation Priorities

Status: Working plan for stabilizing the migrated MapGen pipeline and reducing future rework.

This document turns the canvas + remediation analysis into a concrete "what to do first" plan, focusing on:

- Structural seams that must be **refactored now** (so we stop reinforcing the wrong shape)
- Behavior that should be **ported faithfully** once plumbing is sane
- Larger refactors that can wait until we have TS parity and tests

---

## P0-A – Fix the plumbing (structural seams, minimal behavior change)

These are structural refactors, not later cleanups. They affect every stage, every test, and every future change. The goal is to fix the **shape** of the system while keeping behavior no worse than today.

> **Graphite Stacks:**
> - **Stack 1 (P0-A.1):** Adapter boundary + WorldModel context + lifecycle — pure shape fixes; pipeline remains "null script" by design.
> - **Stack 2 (P0-A.2):** Config→manifest + call-site fixes — enables behavior in a controlled way.

---

### P0-A.1 – Shape fixes (adapter, context, lifecycle)

These changes define how data flows through the system. They do not yet enable stages.

#### 1. Adapter boundary & orchestration wiring

- Replace `MapOrchestrator`'s dynamic `require("./core/adapters.js")` + globals fallback with an explicit adapter strategy:
  - Prefer **constructor injection**: `new MapOrchestrator({ createAdapter: (w, h) => new Civ7Adapter(w, h) })`.
  - At minimum, import `Civ7Adapter` from `@civ7/adapter/civ7` and use it as the default.
- Remove direct `/base-standard/...` imports from `mapgen-core` (especially `MapOrchestrator.ts`), moving them behind `@civ7/adapter`.
  - **Note:** `layers/placement.ts` has heavier `/base-standard/` usage requiring adapter extensions; defer to P0-B.
- Add an **adapter-boundary check**:
  - A small script (e.g. `pnpm lint:adapter-boundary`) that fails if `/base-standard/` appears in `packages/**` outside `packages/civ7-adapter/**` (excluding config/tests).
  - Initially allow-list known violations (placement, any remaining orchestrator imports) so each Graphite branch leaves the repo in a passing state.

#### 2. FoundationContext consumption & lifecycle sequence

> **Key insight:** `ctx.foundation` (immutable snapshot) and `ctx.worldModel` (mutable reference) are **already populated** by `MapOrchestrator.initializeFoundation()`. The problem is that layers import the `WorldModel` singleton directly instead of reading from context.
>
> Per the original engine refactor plan (Phase A): "legacy `worldModel` shims removed, `FoundationContext` emitted and asserted." The TS migration ported `WorldModel` but did not complete the migration to `ctx.foundation` consumption.

- **Prefer `ctx.foundation` over `ctx.worldModel`:**
  - `FoundationContext` is explicitly documented as "Immutable data product... Downstream stages rely on this instead of touching WorldModel directly."
  - Layers should read from `ctx.foundation.plates.*` (plateId, boundaryCloseness, upliftPotential, etc.) and `ctx.foundation.dynamics.*` (windU/V, currentU/V, pressure).
  - Do NOT add new reads from `ctx.worldModel` — that would perpetuate the mutable singleton pattern.
- **Update layers to read from `ctx.foundation`:**
  - `landmass-plate.ts`, `coastlines.ts`, `mountains.ts`, `volcanoes.ts`, `landmass-utils.ts`, and climate code currently import `WorldModel` directly.
  - Change these to receive `ctx` and read from `ctx.foundation.plates.*` and `ctx.foundation.dynamics.*`.
  - Export `BOUNDARY_TYPE` constant from a shared location (it's currently re-exported from `WorldModel`).
- **Keep `WorldModel` singleton only for orchestrator:**
  - `WorldModel.init()` and `WorldModel.reset()` are called by the orchestrator to populate the singleton.
  - Layers never call these methods — they just read from the immutable `ctx.foundation` snapshot.
- **Add `WorldModel.reset()` if missing** and call it in the orchestrator's entry sequence.
- **Document the authoritative "generation session" sequence:**
  1. `resetConfig()` / `resetTunables()` / `WorldModel.reset()`
  2. `bootstrap(...)` (presets, overrides, stageConfig)
  3. `rebind()` / `getTunables()`
  4. `WorldModel.init(...)`
  5. `new MapOrchestrator(...).generateMap()` → creates `ctx.foundation` from `WorldModel`
- Make sure tests and the mod entry use the same ordering, to avoid hard-to-reproduce state leakage between runs.

**P0-A.1 Exit Criteria:**
- [ ] Adapter boundary lint exists and passes (violations explicitly allowlisted)
- [ ] Layers read from `ctx.foundation.plates.*` / `ctx.foundation.dynamics.*`, not `WorldModel` singleton import
- [ ] `BOUNDARY_TYPE` exported from shared location (not requiring `WorldModel` import)
- [ ] `WorldModel.reset()` exists and is called in orchestrator entry
- [ ] Build passes, existing tests still pass
- [ ] Pipeline still "null script" (expected — stages not yet enabled)

---

### P0-A.2 – Enable behavior (config→manifest, call-site fixes)

These changes turn the pipeline back on in a controlled way.

#### 3. Config → manifest → stage enabling

- Implement a minimal resolver so that:
  - `bootstrap()` input (presets, overrides, `stageConfig`) yields a normalized snapshot.
  - `stageConfig` is mapped into `StageManifest.stages` using the canonical order from `bootstrap/defaults/base.js`.
  - `tunables.STAGE_MANIFEST` is non-empty and `stageEnabled()` returns the intended flags.
- Decide where this resolver lives:
  - Either as a new `bootstrap/resolved.ts` (TS version of the JS resolver), or
  - By introducing a typed `MapConfiguration` that the mod entry builds up explicitly, including the manifest.
- Reintroduce minimal `[StageManifest]` warnings when overrides target missing/disabled stages.

#### 4. Trivial call-site fixes

These are low-risk, high-leverage fixes that unblock existing design once stages are enabled.

- **Biomes (1-line fix):**
  - Change `designateEnhancedBiomes(iWidth, iHeight)` → `designateEnhancedBiomes(iWidth, iHeight, ctx)` in `MapOrchestrator.ts:594`.
- **Climate (~20 lines):**
  - Fix `climate-engine.ts`'s `resolveAdapter()` so that `isCoastalLand` / `isAdjacentToShallowWater` are **not** stubbed to always `false` when they aren't on `EngineAdapter`.
  - Instead, leave them undefined so the local neighborhood fallback runs.

**P0-A.2 Exit Criteria:**
- [ ] `stageEnabled("foundation")` returns `true` when `stageConfig.foundation = true`
- [ ] Resolver test confirms stageConfig→manifest mapping works
- [ ] Biomes stage receives `ctx` and can access adapter
- [ ] Climate coastal/shallow fallbacks execute (not blocked by stubs)
- [ ] A minimal `MockAdapter` smoke test shows stages actually execute (to be superseded by the fuller orchestrator integration test in P0-C)
- [ ] Build passes, tests pass

---

## P0-B – Wire existing TS layers to the real engine

Once the structural seams above are addressed (or at least staged), we should hook existing TS code to real Civ7 behavior instead of stubs.

> **Graphite Stack 3:** Biomes/features adapter + placement adapter + story tagging + map-size awareness.

### 5. Biomes & features adapter integration

- Extend the adapter surface (either `EngineAdapter` or a small extension interface) to provide:
  - Biomes:
    - `designateBiomes(width, height)`
    - Biome globals (e.g. `getBiomeGlobal("tropical")`)
    - `setBiomeType(x, y, biomeId)`
  - Features:
    - `addFeatures(width, height)`
    - Feature type indices (e.g. `getFeatureTypeIndex("FEATURE_REEF")`)
    - "No feature" sentinel
- Update `Civ7Adapter` in `@civ7/adapter` to wrap Civ7's base-standard modules and `GameInfo`/`FeatureTypes` appropriately.
- Replace local stubs in:
  - `layers/biomes.ts` (`BiomeAdapter`)
  - `layers/features.ts` (`FeaturesAdapter`)
  so they call the adapter instead of returning synthetic IDs and no-ops.

### 6. Placement adapter integration

- Move `/base-standard/...` imports from `layers/placement.ts` behind the adapter surface.
- Extend `EngineAdapter` or create a `PlacementAdapter` extension with methods for:
  - `generateLakes()`, `expandCoasts()`, `chooseStartSectors()`, etc.
- Update the adapter-boundary lint allowlist to remove placement violations once complete.

### 7. Minimal story tagging reactivation

- Port a **minimal** subset of `story/tagging` / `story/corridors` sufficient to:
  - Imprint continental margins ("active/passive" edges).
  - Seed basic hotspot and rift tags needed by climate/biomes/features.
- Wire this into the `storySeed` / `story*` stages so `StoryTags` is non-empty when climate, biomes, and features run.

### 8. Presets & map-size awareness (first pass)

- Restore the basic flow:
  - `GameplayMap.getMapSize()` → `GameInfo.Maps.lookup()` → map size / defaults.
- Stop hard-coding `84×54` and ±80° latitudes in `MapOrchestrator.requestMapData()`.
- It's fine in this pass to **not** resurrect every named preset; we just need dimensions and key defaults coming from the same place as the JS baseline.

**P0-B Exit Criteria:**
- [ ] Biomes/features stages call real Civ7 generators via adapter
- [ ] Placement layer has no direct `/base-standard/` imports
- [ ] Adapter-boundary lint passes with no allowlisted violations in mapgen-core
- [ ] StoryTags contain margin/hotspot/rift data after story stages
- [ ] Map dimensions come from GameInfo, not hardcoded constants
- [ ] Civ7-backed run shows visible terrain features

---

## P0-C – Testing & CIV‑8 validation

> **Graphite Stack 4:** Lock in guardrails once behavior is reasonably correct.

### 9. Integration & lifecycle tests

- Add a **long-lived MapOrchestrator + MockAdapter integration test** in `mapgen-core` that:
  - Calls `bootstrap({ stageConfig: { foundation: true, landmassPlates: true, ... } })`.
  - Creates a `MapOrchestrator` using `MockAdapter` from `@civ7/adapter/mock`.
  - Runs `generateMap()` and asserts:
    - The expected stages are enabled.
    - A minimal set of stages actually execute (e.g., landmassPlates, coastlines, mountains, placement).
- Add **WorldModel lifecycle tests**:
  - `init()` with explicit width/height and RNG: arrays allocated/populated as expected.
  - `reset()` clears state so back-to-back `init()` is deterministic.
  - `setConfigProvider` / `getConfig()` integration sanity checks.

### 10. Targeted behavior tests (small but meaningful)

- Climate:
  - Use `ExtendedMapContext` + `MockAdapter` to assert that latitude bands, orographic bonuses, and **coastal/shallow** modifiers actually behave (smoke-level grids).
- Biomes:
  - With a fake adapter that exposes biome reads/writes, assert that:
    - Tundra restraint, tropical coasts, river-valley grassland rules fire.
    - Corridor/rift-shoulder nudge works when `StoryTags` are present.
- Features:
  - With a fake adapter that returns real feature indices/biome globals, assert that:
    - Reefs, volcanic forests/taiga, and density tweaks actually place features under expected conditions.

### 11. CIV‑8 in-game validation

- After P0 plumbing and wiring changes:
  - Build the mod and load it in Civ7.
  - Generate Swooper maps and verify:
    - Stages log as running (`Starting: landmassPlates`, etc.).
    - Landmasses, coasts, mountains, rainfall belts, biomes, and key features appear.
  - Capture logs/screenshots and update `CIV‑8-validate-end-to-end.md` with a first "TS parity achieved" checkpoint.

**P0-C Exit Criteria:**
- [ ] Orchestrator integration test exists and passes
- [ ] WorldModel lifecycle tests exist and pass
- [ ] Climate/biomes/features have at least smoke-level behavior tests
- [ ] CIV-8 in-game validation documented with evidence (logs/screenshots)
- [ ] "TS parity achieved" checkpoint recorded

---

## P1 – Domain logic porting & later refactors

These are important but can follow once the P0 plumbing is stable and CIV‑8 can be run meaningfully.

### 12. Full story algorithms

- Port remaining story algorithms (full hotspots, rifts, corridors, paleo) more or less as-is from JS, leaning on the now-correct tagging overlays and adapter wiring.
- Once tests and E2E behavior are good, consider refactoring for clarity/performance.

### 13. Voronoi strategy (world vs Civ7 fidelity)

- Decide between:
  - **Independent TS Voronoi**: treat `DefaultVoronoiUtils` as canonical, document divergence from Civ7 voronoi/kd-tree, and tune locally.
  - **Adapter-backed Voronoi**: define `VoronoiUtilsInterface` and provide:
    - A Civ7-backed production implementation via `/base-standard/voronoi-utils.js` (through the adapter).
    - A TS implementation for tests and offline runs.
- Update docs and tests to reflect the decision.

### 14. Config ownership & world mapping

- Introduce explicit mapping helpers:
  - `foundationPlatesToPlateConfig`, `foundationDynamicsToWorldConfig`, etc.
- Clarify where configuration ownership ultimately lives:
  - Bootstrap (runtime config + presets) vs. world module (physics config) vs. foundation context.
  - With access already routed through context (P0), this P1 work focuses on mapping and ownership semantics rather than basic wiring.

### 15. Session abstraction & acceptance criteria

- If needed, wrap the generation lifecycle in a small "session" helper that:
  - Owns resets, bootstrap, WorldModel init, and orchestrator execution.
- Tighten future acceptance criteria (for any new Gate) to require:
  - Both compile-time checks and at least minimal behavioral validation (tests + an updated CIV‑8-style checklist).

---

## Open questions – WorldModel & FoundationContext (P1+ exploration)

These are intentional follow-ups, not blockers for P0. Capture them so we can make conscious decisions once the TS pipeline is stable.

- **Do any layers truly need procedural WorldModel methods?**
  - Today, most consumers only need the plate/dynamics tensors, which are already available via `ctx.foundation.plates` / `ctx.foundation.dynamics`.
  - If a layer genuinely needs procedural helpers (beyond the tensors), treat that as an explicit exception:
    - Document it clearly.
    - Consider routing it through a thin façade on top of `FoundationContext` rather than reaching into `WorldModel` directly.

- **Should FoundationContext become the only exposed physics surface long-term?**
  - P0 standardizes on `ctx.foundation` as the primary read surface while keeping `WorldModel` as the internal engine that produces it.
  - In P1, we should decide whether:
    - `WorldModel` remains an internal implementation detail, or
    - We refactor world computation into a more obviously pure/functional pipeline that only ever exposes `FoundationContext`.
  - Whichever direction we choose, align the "Config ownership & world mapping" work (P1/Item 14) and future docs so there is one clear, canonical physics contract for downstream stages.

---

## Summary: Graphite Stack Structure

| Stack | Phase | Goal | Key Deliverables |
|-------|-------|------|------------------|
| **1** | P0-A.1 | Fix shape | Adapter injection, FoundationContext consumption, lifecycle sequence |
| **2** | P0-A.2 | Enable behavior | Config→manifest resolver, biomes ctx fix, climate stub fix |
| **3** | P0-B | Wire to engine | Biomes/features/placement adapters, story tagging, map-size |
| **4** | P0-C | Validate | Integration tests, behavior tests, CIV-8 in-game |

Each stack leaves the codebase in a stable, non-broken state. Stack 1 keeps the "null script" behavior intentionally. Stack 2 turns stages on. Stack 3 connects to real Civ7. Stack 4 proves it works.

---

## Rule of Thumb: Refactor-Now vs Port-Now

Use this when deciding how to treat a specific item:

- If it is a **boundary** everything will depend on (adapter wiring, config/manifest shape, lifecycle entry),
  → **Refactor now**, before more code grows around it.

- If it is **internal math/behavior** that can be treated as a black box once correct (story algorithms, climate nuances),
  → **Port as-is**, test it, then refactor for clarity later if there is a clear benefit.

- If it is a **trivial call-site bug or obvious misuse** of the new architecture (missing `ctx`, stub adapter blocking behavior),
  → **Fix immediately**; it's cheap and prevents subtle debugging later.
