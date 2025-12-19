# Engine Refactor v1 — Deferrals

> Intentionally deferred work and temporary compatibility tradeoffs scoped to Engine Refactor v1.

---

## Format

Each deferral follows this structure:

```
## DEF-XXX: Title

**Deferred:** YYYY-MM-DD
**Trigger:** When should this be revisited?
**Context:** Why was this deferred?
**Scope:** What work is involved?
**Impact:** What are we living with?
```

---

## Active Deferrals

## DEF-002: StoryTags Compatibility Layer (Derived From StoryOverlays)

**Deferred:** 2025-12-14  
**Trigger:** After M3 story steps land and all in-repo consumers read `artifact:storyOverlays` (or an explicitly versioned overlay artifact) directly.  
**Context:** During Milestone 3 story modernization we publish canonical overlays, but some legacy consumers still expect `StoryTags`. To avoid forcing an all-at-once consumer migration, `StoryTags` remains as a derived compatibility layer populated from overlays.  
**Scope:**
- Keep `StoryTags` available as a derived view computed from overlays (not a parallel source of truth).
- Migrate remaining in-repo consumers to read overlays directly.
- Remove or demote `StoryTags` once no longer needed (ideally delete, otherwise dev-only).  
**Impact:**
- Temporary duplication of narrative representation (overlays + tags) with risk of semantic drift if not kept strictly derived.
- Continued support surface for legacy semantics during M3.

---

## DEF-003: Global StoryOverlays Registry Fallback

**Deferred:** 2025-12-14  
**Trigger:** After story overlays are published/consumed exclusively via pipeline context (no global reads), and story execution is fully step-owned.  
**Context:** `StoryOverlays` currently has a global registry fallback to support legacy reads and transitional wiring. This is intentionally kept through M3 to avoid brittle cutovers while the Task Graph and story steps are stabilized.  
**Scope:**
- Keep the global fallback through M3 for compatibility.
- Migrate callers to context-scoped overlays (`artifact:storyOverlays`).
- Remove the global registry fallback (or make it dev-only) once consumers are migrated.  
**Impact:**
- Global state makes tests less isolated and can hide ordering/coupling problems.
- Harder-to-reason-about execution if overlays can come from multiple sources.

---

## DEF-004: Pipeline Recipe Target vs. M3 StageManifest/STAGE_ORDER

**Deferred:** 2025-12-14  
**Trigger:** When we intentionally ship a mod-/UI-facing recipe surface that supports reordering/selection beyond enabling/disabling standard stages.  
**Context:** The target architecture describes a JSON “recipe” that defines step order and per-step overrides. In M3, we intentionally avoid exposing arbitrary recipe composition and instead derive execution order from the existing `STAGE_ORDER` plus `stageManifest` enable/disable flags to preserve behavior while proving the executor/registry model.  
**Scope:**
- Treat `STAGE_ORDER` + `stageManifest` as the M3 source of truth for pipeline sequencing.
- Keep any future JSON recipe surface as a deliberate follow-up (not an accidental parallel pipeline definition).  
**Impact:**
- Reduced pipeline composition flexibility in M3 (by design).
- Requires explicit follow-up work to reach full recipe-driven composition.

---

## DEF-005: River Graph Product Deferred (Adjacency Mask Only in M3)

**Deferred:** 2025-12-14  
**Trigger:** When gameplay or downstream systems require river-network topology (paths/segments/flow) and the adapter can supply it (or we add a TS-side river model).  
**Context:** In M3 we “productize” rivers only to the extent the current engine adapter supports: a derived adjacency mask (`artifact:riverAdjacency`) computed from `EngineAdapter.isAdjacentToRivers()`. We intentionally do not promise a full river graph in M3 to avoid a tuning-grade rewrite and adapter expansion.  
**Scope:**
- Keep `artifact:riverAdjacency` as the canonical river artifact in M3.
- If needed later, expand adapter APIs and/or introduce a TS river model to publish richer river products.  
**Impact:**
- Consumers can reason about “near rivers” but not about river topology.
- Some potential placements/features that require river paths are deferred.

---

## DEF-006: Placement Inputs Artifact Deferred (Placement Remains Engine-Effect Driven)

**Deferred:** 2025-12-14  
**Trigger:** When we need engine-less placement testing or want placement composition that depends on a stable, reusable “placement inputs” artifact.  
**Context:** Placement currently consumes a mix of map-init inputs and engine-surface state, not a single in-memory “inputs” artifact. In M3 we keep placement as an engine-effect step with `state:*` dependency tags, and we do not force immediate publication of a canonical `artifact:placementInputs`.  
**Scope:**
- Keep placement’s precomputed inputs assembled internally to the placement step in M3.
- Consider publishing a canonical `artifact:placementInputs` later if it materially improves testability/composability.  
**Impact:**
- Placement contracts are less data-centric and more “engine state” centric in M3.
- Harder to test placement purely in-memory without adapter/engine involvement.

---

## DEF-007: WorldModel Legacy Bridge (Sync From Context Artifacts)

**Deferred:** 2025-12-14  
**Trigger:** When all in-repo legacy stages/consumers have migrated to read from `MapGenContext` (`artifact:*` / `field:*`), and the orchestrator no longer needs to sync state into the `WorldModel` singleton.  
**Context:** The current engine still supports legacy layers that depend on the global `WorldModel`. During M3 we wrap legacy clusters and publish canonical artifacts, but we keep a bridge where the orchestrator copies selected artifacts/fields into `WorldModel` to preserve existing behavior while consumers migrate.  
**Scope:**
- Keep the bridge limited to the orchestrator boundary (no new `WorldModel` reads in modern code paths).
- Migrate remaining legacy consumers to read from context artifacts/fields.
- Remove the orchestrator sync and delete (or fully quarantine) `WorldModel` once no longer needed.  
**Impact:**
- Global state can hide ordering/coupling mistakes and makes tests less isolated.
- Creates a second representation of some signals (context artifacts vs `WorldModel`) that must be kept in sync.

---

## DEF-008: `state:engine.*` Dependency Tags Are Trusted (Not Runtime-Verified)

**Deferred:** 2025-12-14  
**Trigger:** When the engine adapter can reliably expose/verifiably report the relevant engine-side invariants (or when we stop depending on engine-surface state tags for gating).  
**Context:** In M3, `PipelineExecutor` enforces `artifact:*` and `field:*` dependencies at runtime, but `state:engine.*` tags represent engine-surface guarantees that are not currently introspectable from the TS runtime. We intentionally treat these tags as trusted declarations to enable wrap-first steps without blocking on new adapter APIs.  
**Scope:**
- Define a verification strategy for `state:engine.*` dependencies (adapter queries, explicit step-owned checks, or replacing `state:*` tags with canonical artifacts where feasible).
- Add a small set of runtime checks for the highest-risk `state:engine.*` tags once a strategy exists.
- Document which `state:engine.*` tags are considered stable contracts vs transitional wiring.  
**Impact:**
- A misdeclared or stale `state:engine.*` dependency can bypass executor gating and fail later (or silently degrade output).
- Contract correctness relies on discipline + review rather than runtime enforcement for this namespace in M3.

---

## DEF-009: Legacy Orchestrator Execution Path (Non-TaskGraph)

**Deferred:** 2025-12-14  
**Trigger:** When the TaskGraph executor path is the default for in-repo map generation (including `mods/mod-swooper-maps`) and the legacy `STAGE_ORDER`-driven execution can be removed without losing parity.  
**Context:** In M3 we intentionally keep both execution modes wired in `MapOrchestrator.generateMap()` (`useTaskGraph` flag) to support incremental migration and stack-by-stack landing. Some in-repo consumers still run with `useTaskGraph: false`, so removing the legacy path now would block parallel work and destabilize integration.  
**Scope:**
- Migrate remaining in-repo callers to run via the TaskGraph executor path.
- Delete the legacy non-TaskGraph branch in `MapOrchestrator.generateMap()` (while keeping the external `GenerateMap` entry surface stable).
- Ensure artifact publication remains 1:1 across entry modes during the cutover (no hidden fallbacks).  
**Impact:**
- Two execution modes increase drift risk (behavior/config/contract mismatches) until cutover is complete.
- Longer-lived legacy wiring can hide missing `requires/provides` declarations if callers never exercise the executor path.

---

## DEF-010: Rainfall Generation Ownership (Engine vs. TS)

**Deferred:** 2025-12-18  
**Trigger:** When the climate pipeline artifacts are stable and we need engine-less rainfall testing or broader engine decoupling.  
**Context:** Phase A fixes the adapter boundary for rainfall writes, but rainfall generation still relies on engine-side state. We want to reclaim rainfall generation into TS-owned artifacts once the foundation/climate contracts are settled.  
**Scope:**
- Define a canonical rainfall artifact (or field) in the pipeline and publish it from climate steps.
- Route engine writes through a dedicated adapter publish step instead of direct reads/writes during generation.
- Remove reliance on `GameplayMap` / `TerrainBuilder` as the source of truth for rainfall values.  
**Impact:**
- Until this lands, rainfall is effectively engine-owned, limiting offline testing and keeping a hidden coupling to engine state.
- Boundary correctness improves now, but full decoupling is intentionally deferred.

---

## DEF-011: Behavior-Mode Selectors ("legacy" vs. "area")

**Deferred:** 2025-12-18  
**Trigger:** When parity matrices stabilize and we no longer need to compare "legacy" vs. "area" behavior, or when we decide a single canonical mode and delete the other.  
**Context:** The orchestration cleanup spike explicitly defers removing behavior-mode selectors because they represent distinct algorithm semantics, not just compatibility surfaces.  
**Scope:**
- Audit all `"legacy" | "area"` selectors in config schema and domain modules (e.g., landmask/crust).
- Decide the canonical mode (or rename if both must remain).
- Update presets, docs, and tests to reflect the chosen contract.  
**Impact:**
- Extra modes increase maintenance and allow drift between algorithms.
- Consumers must keep mental context about which mode is active.

---

## DEF-012: Story State to Context-Owned Artifacts (Remove Globals)

**Deferred:** 2025-12-18  
**Trigger:** After legacy orchestration + toggle removal is complete and the open questions on story-state representation and overlay registry semantics are resolved.  
**Context:** The spike accepts keeping StoryTags and related story caches/global registries temporarily while removing the legacy orchestration fork and toggle surface; the intended end-state is context-owned story data.  
**Scope:**
- Choose a canonical context-owned representation (`artifact:storyState`/`artifact:storyTags` or `ctx.story.*`).
- Publish story tags/state from story steps and migrate all consumers to read from context.
- Remove module-level StoryTags singletons and story caches.
- Eliminate global overlay registry fallback once context-owned artifacts are authoritative.  
**Impact:**
- Global story state remains a drift and coupling risk until removed.
- Tests and execution order can still be influenced by hidden global state.

---

## Resolved Deferrals

*Move resolved deferrals here with resolution notes.*
