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

## DEF-018: Civ7 Runner Extraction (Mod-Owned in M6; SDK-Owned Later)

**Deferred:** 2025-12-28  
**Trigger:** When we have multiple mod content packages that need Civ7 entrypoints, or when we introduce a dedicated “publishing SDK” for running/publishing maps.  
**Context:** M6’s goal is a purist split: engine runtime + authoring ergonomics + content packages. To maximize mod-author DX and avoid introducing new packages/indirection mid-cutover, M6 keeps the Civ7 runner as **mod-owned runtime glue** (maps call `recipe.run(...)` after resolving map init + settings). The “right” long-term home for generic Civ7 runner wiring is likely a shared SDK surface (most plausibly `packages/civ7-adapter` or a future publishing SDK), not duplicated in each mod.  
**Scope:**
- Extract Civ7 map-init resolution + adapter construction + run-settings assembly into a shared package surface (adapter- or publishing-SDK-owned).
- Keep the engine/authoring SDK Civ7-agnostic (no Civ7 imports).
- Provide a stable entrypoint for content packages so map files stay thin and consistent.
- Ensure any extracted runner surfaces remain “pure runtime glue” (no recipe/content privileged behavior).  
**Impact:**
- In M6, the content package owns `src/maps/_runtime/**` runner glue; additional mods would duplicate similar code until extraction.
- Runner policy (logging defaults, tracing wiring, adapter selection) stays mod-local until the shared runner surface exists.

---

## DEF-019: Per-Tag TypeBox Schemas (“Tag Schema Richness”)

**Deferred:** 2025-12-28  
**Trigger:** Only if we have a concrete need for tag-level shape validation/introspection that cannot be met by step-local schemas + runtime `satisfies` checks (e.g., strong runtime demos validation, auto-doc generation from tag schemas, or runtime-typed artifact store enforcement).  
**Context:** The target architecture draft includes an illustrative appendix that sketches a richer tag model (per-tag TypeBox schemas, richer tag metadata, and registry-entry bundling). The current runtime (`packages/mapgen-core/src/pipeline/tags.ts`) treats tag definitions as runtime metadata (id/kind, optional `satisfies`, optional demo validation). For M6 we intentionally keep the simple runtime model, and we do not currently see a compelling reason to add per-tag schemas at all.  
**Scope:**
- If revisited, decide the minimal incremental tag typing that justifies the churn (likely *not* the full Appendix model).
- Keep this as a dedicated milestone/ADR if it ever becomes necessary; do not “accidentally” creep it into unrelated packaging work.  
**Impact:**
- Tags remain prefix-validated identifiers; typed data contracts remain step-owned (via per-step config schema + artifact validators).
- Less tag-level introspection “for free,” but significantly lower authoring and refactor complexity.

---

## DEF-020: Discharge-Driven Hydrography Stamping (Engine Projection vs. Hydrology Truth)

**Deferred:** 2026-01-17  
**Trigger:** When the adapter/engine surface can accept explicit river/lake geometry (or when we add an `EngineAdapter` capability that can stamp hydrography derived from Hydrology artifacts).  
**Context:** M9 makes Hydrology the canonical owner of hydrography via discharge + routing-derived artifacts. Civ7 adapter surfaces currently support only engine-driven river/lake generation (`modelRivers(...)`, `generateLakes(...)`) and do not expose explicit “set river network / set lake mask” stamping. To keep the pipeline green without lying about ownership, engine hydrography is treated as projection-only while downstream consumes Hydrology’s typed hydrography artifacts as truth.  
**Scope:**
- Introduce an explicit `EngineAdapter` capability for stamping hydrography from Hydrology artifacts (rivers + lakes).
- Implement the capability in Civ adapter and `MockAdapter` (so determinism + monotonicity can be tested engine-free).
- Migrate Hydrology engine projection calls to the stamping capability and deprecate any reliance on `modelRivers(...)` / `generateLakes(...)` as truth-bearing mechanisms.  
**Impact:**
- Engine rivers/lakes may not exactly reflect discharge-derived hydrography; this is an acknowledged projection limitation.
- Downstream logic must treat Hydrology artifacts as canonical truth; engine surfaces remain compatibility/visualization.  

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

## DEF-010: Rainfall Generation Ownership (Engine vs. TS)

**Deferred:** 2025-12-18  
**Trigger:** When the climate pipeline artifacts are stable and we need engine-less rainfall testing or broader engine decoupling.  
**Context:** Climate is moving toward TS-owned canonical products. `syncClimateField()` has been removed and climate steps already publish `artifact:climateField`; however, some climate inputs still rely on engine adapter reads (e.g., `getLatitude`, `isWater`, `getElevation`) and thus full engine-less climate runs remain deferred.  
**Scope:**
- Keep `artifact:climateField` as the canonical TS product and treat adapter writes as publish-only effects (not a source of truth).
- Define and adopt explicit TS-owned prerequisites where feasible (e.g., `buffer:heightfield`, `buffer:latitude`, TS water/landmask) so climate generation no longer depends on engine-only reads.
- When engine reads are unavoidable, ensure any cross-step dependency is reified into `buffer:*`/`artifact:*` with explicit `requires/provides` (no implicit “read engine later” edges).  
**Impact:**
- Until this lands, climate remains partially engine-coupled via adapter reads, limiting offline testing and keeping hidden coupling to engine-derived signals.
- Canonical ownership is still TS-first; this deferral tracks completing the reification of climate prerequisites and eliminating accidental engine-dependency surfaces.

---

## DEF-011: Delete `crustMode` and the legacy behavior branch ("legacy" vs. "area")

**Deferred:** 2025-12-18  
**Trigger:** M5: implement `M5-U01` (remove the knob; delete the `"legacy"` branch).  
**Context:** We originally paused this because the selector looked like “two intentional algorithms” rather than a pure compatibility shim. Post‑M4 we’re explicitly choosing a single canonical behavior: the `"area"` semantics, and treating `"legacy"` as legacy-only.  
**Decision status (locked):**
- `crustMode` is removed from the config surface (no schema support, no compat parsing).
- The `"legacy"` behavior branch is deleted.
- `"area"` becomes the single canonical behavior path (no runtime selector).

**Scope:**
- Remove `crustMode` from all schema/typing/parsing surfaces (and make configs that still supply it fail validation with a clear error).
- Delete the `"legacy"` branch in landmask/crust/ocean separation implementations and any associated legacy-only config fallbacks.
- Update in-repo configs/tests/docs that still refer to `crustMode` or `"legacy"`.

**Impact:**
- Breaking change for any out-of-repo config/consumer that still sets `crustMode` or expects `"legacy"` semantics; handled via coordinated migration + release notes, not via shims.
- Removes an ongoing source of algorithm drift and maintenance burden.

---

## DEF-014: Foundation Graph Artifacts (Split `artifact:foundation.*` sub-artifacts)

**Deferred:** 2025-12-18  
**Trigger:** After M4 lands the foundation **surface cutover** (monolithic `artifact:foundation` at `ctx.artifacts.foundation`, no `ctx.foundation`), when Phase B / foundation PRD work begins and consumers are ready to migrate to the discrete foundation artifact inventory.  
**Context:** M4 intentionally keeps the foundation payload monolithic (as `artifact:foundation`) to align external surfaces with the target architecture without taking on the heavier “split into many artifacts” work. The accepted end-state is still discrete, named foundation artifacts; this deferral tracks the post-M4 split and the follow-on consumer migration.  
**Decision status (locked):**
- **M4 contract:** foundation is a monolithic artifact (`artifact:foundation`) stored at `ctx.artifacts.foundation`; `ctx.foundation` is removed (owned by `CIV-62`).
- **Post-M4 end-state:** foundation is represented as **discrete** `artifact:foundation.*` products, and the monolithic `artifact:foundation` blob is removed once no longer needed.
**Scope:**
- Define the canonical discrete foundation artifact set (mesh, crust, plateGraph, tectonics, and any required raster artifacts).
- Publish those discrete artifacts under `artifact:foundation.*` with explicit contracts.
- Migrate consumers from the monolithic `artifact:foundation` / `ctx.artifacts.foundation` surface to the discrete artifacts/fields with named contracts.
- Remove the monolithic `artifact:foundation` dependency once the discrete inventory is complete.
- Revisit plate/physics algorithm replacement to the mesh/crust/plateGraph/tectonics design.
- Decide whether `dynamics` remains a concept and how its data is represented post-migration.  
**Impact:**
- Foundation dependencies remain coarse-grained in M4 (one blob artifact), which blocks fine-grained scheduling/verification until the split lands.
- Target graph artifacts and algorithm replacements are deferred, limiting foundation-level refactors until Phase B.

---

## DEF-015: RNG Parity Contract (Call Ordering / Labels)

**Deferred:** 2025-12-18  
**Trigger:** If exact output parity becomes a hard requirement for the foundation refactor or WorldModel cut.  
**Context:** The MapOrchestrator bloat assessment explicitly defers parity alignment; Phase A allows deltas while standardizing RNG boundaries.  
**Scope:**
- Decide whether parity is required and define success criteria.
- Align RNG call ordering/labels across the pipeline if parity is mandated.
- Add parity-focused tests/goldens only after criteria are set.  
**Impact:**
- Small output deltas are acceptable in Phase A; parity is not guaranteed.
- Without a parity plan, comparisons may be noisy or subjective.

---

## DEF-016: Colocate Config Schemas by Domain (Schema File Split)

**Deferred:** 2025-12-19
**Trigger:** When config churn stabilizes post-M4 and we want to improve schema discoverability/ownership.
**Context:** During ice patch analysis, we identified that `schema.ts` is a 2800+ line monolith containing 60+ schemas spanning all domains. While step files are colocated by phase (e.g., `pipeline/morphology/MountainsStep.ts`), their config schemas remain centralized. Splitting schemas to match the step pattern would improve domain ownership but requires touching 60+ definitions and updating imports across the codebase.
**Scope:**
- Split schema ownership by domain (`src/domain/<domain>/config.ts`) instead of a single monolith.
- Create a thin barrel (`src/domain/config.ts`) to re-export shared schema fragments.
- Update all import paths and ensure `parseConfig()` still composes the root schema correctly.
- Align with existing `steps.ts` barrel pattern for consistency.
**Impact:**
- Schema changes remain high-friction (one massive file to navigate).
- Domain ownership is unclear (who owns `MountainsConfigSchema`?).
- Acceptable in M3/M4 while config is still evolving; revisit when stable.

**Update (2025-12):** Completed via domain config relocation (`src/domain/<domain>/config.ts`) and the `@mapgen/domain/config` barrel. Deferral closed.

---

## DEF-017: Adapter read-back surfaces for stronger `effect:*` verification (landmass/coastlines/rivers/placement)

**Deferred:** 2025-12-22
**Trigger:** If “cheap invariants + call evidence” verifiers miss real wiring failures, are flaky in CI, or if we need stronger guarantees that match actual engine state (especially for `effect:engine.landmassApplied` / `effect:engine.coastlinesApplied` / `effect:engine.riversModeled`).
**Context:** M4’s goal is “no asserted-but-unverified scheduling edges,” but expanding `EngineAdapter` with new read-back APIs (plot tags, landmass region IDs, coastline status, river readbacks, placement readbacks) increases engine-surface coupling and coordination risk. For M4, we prefer minimal verifiers using existing adapter reads and TS-owned artifacts (e.g., `artifact:placementOutputs`).
**Scope:**
- Design and add explicit adapter read-back APIs needed for robust verification (and implement them in both Civ adapter + MockAdapter).
- Update `effect:*` verifiers to rely on read-back surfaces rather than call evidence where appropriate.
- Strengthen tests to validate the read-back semantics (engine-free where possible; smoke tests for Civ adapter where needed).
**Impact:**
- Until revisited, some engine-effect verifiers are “wiring correctness” checks rather than strong semantic validation of engine state.
- A follow-up milestone may be required if these effects become higher-risk dependency surfaces or if verification needs to be strengthened for mod extensibility.

---

## Resolved Deferrals

## DEF-002: StoryTags Compatibility Layer (Derived From Narrative Story Entries)

**Deferred:** 2025-12-14  
**Trigger:** After narrative/playability state is published/consumed as explicit narrative **story entry artifacts** (`artifact:narrative.motifs.*.stories.*@vN`) and no in-repo consumers require `StoryTags` for correctness.  
**Context:** During Milestone 3 story modernization we introduced “overlays” + `StoryTags` to bridge legacy consumers. Target architecture decision 3.4 locks the end-state: **typed narrative story entries are canonical and `StoryTags` is not a target contract surface**. This deferral exists only to sequence the cleanup safely.  
**Scope:**
- Keep `StoryTags` available only as a temporary compatibility surface.
- Migrate consumers to narrative story entry artifacts (`artifact:narrative.motifs.*.stories.*@vN`) (or derived, context-scoped query helpers).
- Remove `StoryTags` entirely once consumers are migrated.  
**Impact:**
- Temporary duplication of narrative representation (overlays + tags) with risk of semantic drift if not kept strictly derived.
- Continued support surface for legacy semantics during M3.
- **Status (2025-12-20):** StoryTags are already context-owned and (in tagging helpers) hydrated from overlays, but many domain layers still consume StoryTags directly; trigger not yet met.
- **Status (2025-12-26):** Resolved in CIV-74 by removing StoryTags and migrating consumers to explicit narrative artifacts (see `packages/mapgen-core/src/domain/narrative/artifacts.ts` and `packages/mapgen-core/src/domain/narrative/queries.ts`).

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
- **Status (2025-12-20):** Target architecture decisions now assume recipe-driven ordering/config, but current implementation is still `STAGE_ORDER` + `stageManifest` (see `packages/mapgen-core/src/bootstrap/resolved.ts` and `packages/mapgen-core/src/pipeline/StepRegistry.ts`). This deferral is therefore primarily an *implementation cutover* rather than an open design question.
- **Status (2025-12-22):** Resolved in PIPELINE‑5 (CIV‑59): `STAGE_ORDER`/`stageManifest`/`stageConfig` removed; recipe is the sole ordering + enablement source.

---

## DEF-006: Placement Inputs Artifact Implementation Deferred (M3 Placement Remains Engine-Effect Driven)

**Deferred:** 2025-12-14  
**Trigger:** When we need engine-less placement testing, want placement composition that depends on a stable “placement inputs” artifact, or are ready to cut over M3 placement wiring to the accepted target contract.  
**Context:** Placement currently consumes a mix of map-init inputs and engine-surface state, not a single TS-owned “inputs” artifact. In M3 we keep placement as an engine-effect step and avoid blocking on a full placement-input contract design. Target decision 3.7 is now accepted: placement consumes an explicit `artifact:placementInputs` and does not rely on implicit engine reads as a cross-step dependency surface. This deferral remains only to sequence the implementation safely.  
**Scope:**
- Add `artifact:placementInputs` to the tag registry with a safe demo payload.
- Introduce a `derivePlacementInputs` step (or small cluster) that produces `artifact:placementInputs` from explicit prerequisites and reifies any engine-only reads that become cross-step dependencies.
- Update placement to `requires: ["artifact:placementInputs"]` and publish a verified `effect:engine.placementApplied` when it mutates the engine.
- Remove `state:*` placement scheduling once `effect:*` + artifact prerequisites are in place (align with DEF-008).  
**Impact:**
- Placement contracts are less data-centric and more “engine state” centric in M3.
- Harder to test placement purely in-memory without adapter/engine involvement.
- **Status (2025-12-21):** The target contract (3.7) is accepted; remaining work is implementation cutover from the current engine-effect wiring to the explicit `artifact:placementInputs` + verified `effect:*` model.
- **Status (2025-12-24):** Resolved in CIV-72 by cutting placement to `artifact:placementInputs` + `artifact:placementOutputs` and verifying `effect:engine.placementApplied` via the outputs artifact (ADR-ER1-020).

---

## DEF-012: Story State to Context-Owned Artifacts (Remove Globals)

**Deferred:** 2025-12-18  
**Trigger:** After narrative/playability state is fully represented as explicit narrative story entry artifacts (`artifact:narrative.motifs.*.stories.*@vN`) and any remaining story caches are context-owned artifacts.  
**Context:** Target architecture decision 3.4 locks the end-state: narrative/playability state is explicit artifacts and there are no module-level story globals/caches. This deferral tracks the remaining implementation cleanup (migrating consumers and removing caches) safely.  
**Scope:**
- Publish/consume narrative/playability state as narrative story entry artifacts (`artifact:narrative.motifs.*.stories.*@vN`) (typed, versioned).
- Remove StoryTags as a compatibility surface once no longer needed (see `DEF-002`).
- Remove module-level story caches (or make them explicitly keyed/scoped and safely reset by context) so story execution is purely context-driven.  
**Impact:**
- Story behavior can still be influenced by hidden module-level state and caches.
- Harder to reason about determinism and test isolation until story is fully context-driven.
**Status (2025-12-20):**
- Narrative state is context-owned (`ctx.artifacts`) as explicit narrative story entry artifacts. M6 also writes derived debug overlay snapshots into `ctx.overlays`, but `ctx.overlays` must not be required for correctness. Story caches remain (e.g., `resetOrogenyCache`, `resetCorridorStyleCache`) and many callers still treat older story compatibility surfaces as primary.
- **Status (2025-12-26):** Resolved in CIV-74: StoryTags removed, narrative consumers read `artifact:narrative.*`, and remaining caches are context-scoped + reset per run.

---

## DEF-008: `state:engine.*` Dependency Tags Are Trusted (Not Runtime-Verified)

**Deferred:** 2025-12-14  
**Trigger:** When we migrate off `state:engine.*` to `effect:*` tags with runtime verification (or when the adapter exposes the necessary invariant queries to verify the current namespace).  
**Context:** In M3, `PipelineExecutor` enforces `artifact:*` and `buffer:*` dependencies at runtime, but `state:engine.*` tags represent engine-surface guarantees that are not currently introspectable from the TS runtime. We intentionally treat these tags as trusted declarations to enable wrap-first steps without blocking on new adapter APIs. The accepted target policy is: `state:engine.*` is transitional-only; engine-surface guarantees should be modeled as `effect:*` tags that participate in scheduling and are runtime-verifiable, and cross-step data dependencies should prefer reified `buffer:*` / `artifact:*` products.  
**Scope:**
- Replace `state:engine.*` dependency tags with `effect:*` tags that are first-class schedulable tags.
- Add runtime verification for provided `effect:*` tags (postcondition checks, typically via `EngineAdapter`).
- Reify engine-derived data into `buffer:*` / `artifact:*` where downstream steps depend on it (avoid opaque engine-state coupling).
- Delete/ban the `state:engine.*` namespace in the target contract; keep it only as a temporary compatibility surface during migration.  
**Impact:**
- A misdeclared or stale `state:engine.*` dependency can bypass executor gating and fail later (or silently degrade output).
- Contract correctness relies on discipline + review rather than runtime enforcement for this namespace in M3.
**Resolution (2025-12-26):** Standard pipeline steps now use `effect:*` tags, the tag registry no longer exposes the `state:engine.*` namespace, and DEF-008’s transitional surface is removed from the target contract.

---

## DEF-003: Global Legacy Overlay Registry Fallback

**Deferred:** 2025-12-14  
**Trigger:** After derived overlay snapshots are read exclusively via pipeline context (no global reads), and story execution is fully step-owned.  
**Context:** `StoryOverlays` (legacy overlays registry / `ctx.overlays`) currently has a global registry fallback to support legacy reads and transitional wiring. This is intentionally kept through M3 to avoid brittle cutovers while the Task Graph and story steps are stabilized.  
**Scope:**
- Keep the global fallback through M3 for compatibility.
- Migrate callers to context-scoped narrative state (target: narrative story entry artifacts; legacy/debug: derived snapshots in `ctx.overlays` during transition).
- Remove the global registry fallback (or make it dev-only) once consumers are migrated.  
**Impact:**
- Global state makes tests less isolated and can hide ordering/coupling problems.
- Harder-to-reason-about execution if overlays can come from multiple sources.
**Resolution (2025-12-20):**
- In current code, overlay snapshots are context-scoped only (`ctx.overlays`) with no module-level fallback; see `mods/mod-swooper-maps/src/domain/narrative/overlays/registry.ts`.

---

## DEF-007: WorldModel Legacy Bridge (Sync From Context Artifacts)

**Deferred:** 2025-12-14  
**Trigger:** When all in-repo legacy stages/consumers have migrated to read from `MapGenContext` (`artifact:*` / `buffer:*`), and the orchestrator no longer needs to sync state into the `WorldModel` singleton.  
**Context:** The current engine still supports legacy systems that depend on the global `WorldModel`. During M3 we wrap legacy clusters and publish canonical artifacts, but we keep a bridge where the orchestrator copies selected artifacts/buffers into `WorldModel` to preserve existing behavior while consumers migrate.  
**Scope:**
- Keep the bridge limited to the orchestrator boundary (no new `WorldModel` reads in modern code paths).
- Migrate remaining legacy consumers to read from context artifacts/buffers.
- Remove the orchestrator sync and delete (or fully quarantine) `WorldModel` once no longer needed.  
**Impact:**
- Global state can hide ordering/coupling mistakes and makes tests less isolated.
- Creates a second representation of some signals (context artifacts vs `WorldModel`) that must be kept in sync.
**Resolution (2025-12-20):**
- No `WorldModel` references remain in TS sources (`rg -l WorldModel packages/mapgen-core/src` returns none). Generated artifacts may still include historical strings until rebuilt.

---

## DEF-009: Legacy Orchestrator Execution Path (Non-TaskGraph)

**Deferred:** 2025-12-14  
**Trigger:** When the TaskGraph executor path is the default for in-repo map generation (including `mods/mod-swooper-maps`) and the legacy `STAGE_ORDER`-driven execution can be removed without losing parity.  
**Context:** In M3 we intentionally kept a legacy non-TaskGraph branch in `MapOrchestrator.generateMap()` behind the `useTaskGraph` flag to support incremental migration and stack-by-stack landing. Some in-repo consumers still ran with `useTaskGraph: false`, so removing the legacy path immediately would have blocked parallel work and destabilized integration.  
**Scope:**
- Migrate remaining in-repo callers to run via the TaskGraph executor path.
- Delete the legacy non-TaskGraph branch in `MapOrchestrator.generateMap()` (while keeping the external `GenerateMap` entry surface stable).
- Ensure artifact publication remains 1:1 across entry modes during the cutover (no hidden fallbacks).  
**Impact:**
- Two execution modes increase drift risk (behavior/config/contract mismatches) until cutover is complete.
- Longer-lived legacy wiring can hide missing `requires/provides` declarations if callers never exercise the executor path.
- Note: Likely already satisfied post-M2; `MapOrchestrator.generateMap()` now directly calls `generateMapTaskGraph()` and `OrchestratorConfig` has no `useTaskGraph`. `rg` finds no `useTaskGraph` in code/mods; re-verify before treating this as active work.
**Resolution (2025-12-20):**
- Verified: `MapOrchestrator.generateMap()` calls `generateMapTaskGraph()` unconditionally and `useTaskGraph` no longer exists in config/options (`rg -n useTaskGraph` returns no hits).

---

## DEF-013: MapOrchestrator Hygiene + Enablement Consolidation

**Deferred:** 2025-12-18  
**Trigger:** After Phase A foundation cut/RNG standardization, when we can safely refactor orchestrator structure without destabilizing pipeline execution.  
**Context:** The MapOrchestrator bloat assessment explicitly deferred cleanup work and enablement/recipe restructuring to keep Phase A deterministic and focused on the WorldModel cut.  
**Scope:**
- Remove dead imports/helpers and local cleanup in `MapOrchestrator`.
- Consolidate enablement gating to a single source of truth (avoid redundant stage gating split between recipe/manifest and `shouldRun()` paths).  
**Impact:**
- Orchestrator remains cluttered, and duplicated enablement logic can mask incorrect stage wiring or drift.
**Resolution (2025-12-20):**
- `stageFlags`/`shouldRun` gating removed; recipe list is the sole enablement source, and story enablement derives from the recipe list.

---
