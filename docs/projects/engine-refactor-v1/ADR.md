# Engine Refactor v1 — Architecture Decision Record (Target Architecture Decisions)

> This file is a **compiled decision register** for Engine Refactor v1.
>
> It summarizes **already-accepted** decisions that are canonically described in:
> - `resources/SPEC-target-architecture-draft.md` (canonical decisions)
> - `resources/_archive/SPIKE-target-architecture-draft.md` (decision packet rationale / history)
> - `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (milestone constraints + resolved calls)
>
> It does **not** introduce new decisions.

---

## Format

Each entry follows the project’s ADR format (mirrors `docs/system/ADR.md`):

```
## ADR-ER1-XXX: Title

**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD
**Context:** What prompted this decision?
**Decision:** What was decided?
**Consequences:** What are the implications?
**Sources:** Where this is canonically defined?
```

---

## Decisions

## ADR-ER1-001: Ordering source of truth is recipe-only (no `STAGE_ORDER` / `stageManifest`)

**Status:** Accepted
**Date:** 2025-12-21
**Context:** M3 used `STAGE_ORDER` + `stageManifest` as transitional ordering sources (`DEF-004`), but the target architecture requires mod-authored composition with a single source of truth.
**Decision:**
- The recipe is the single source of truth for pipeline ordering.
- Any manifest-like representation is derived/internal (compiled), not a second truth and not mod-facing.
- “Vanilla” ordering ships as a default recipe in the standard mod package (not a hard-coded internal list).
- V1 authoring baseline is linear `steps[]`; DAG/partial-order authoring is a later refinement.
**Consequences:**
- Runtime ordering inputs `STAGE_ORDER` / `stageManifest` / `stageConfig` are deletion-only legacy and must not survive M4.
- The executor runs a compiled artifact (`ExecutionPlan`) derived from `{ recipe, settings } + registry`.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Scope Areas; Triage “Pipeline Cutover Gaps”)

## ADR-ER1-002: Enablement is recipe-authored and compiled (no `shouldRun`, no silent skips)

**Status:** Accepted
**Date:** 2025-12-21
**Context:** Historically, enablement was split across `stageConfig`/`stageManifest` and `stageFlags`/`shouldRun`, which made validation incomplete and execution hard to reason about.
**Decision:**
- Enablement is authored in the recipe and compiled into `ExecutionPlan`.
- Steps have no `shouldRun` contract and the executor does not self-filter.
- Optional behavior is expressed via recipe composition and/or explicit config; any “can’t run” condition is a fail-fast error (validation/precondition), not a silent skip.
**Consequences:**
- `stageFlags` / `shouldRun` are legacy surfaces and must not survive M4.
- Contract validation can treat `requires/provides` as complete given the plan.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Scope Areas; Triage “Pipeline Cutover Gaps”)

## ADR-ER1-003: Pipeline boundary is `RunRequest = { recipe, settings }` compiled to `ExecutionPlan`

**Status:** Accepted
**Date:** 2025-12-21
**Context:** Legacy orchestration centered on a monolithic `MapGenConfig` and stage-driven wiring; the target contract requires a smaller, explicit boundary and an internal compiled plan.
**Decision:**
- Boundary input is `RunRequest = { recipe, settings }` (not a monolithic `MapGenConfig`).
- `settings` are narrow, per-run instance values required to initialize context (at minimum: seed selection and dimensions).
- Step-local knobs live in per-occurrence config in the recipe and are carried into compiled plan nodes.
- Recipes compile into an internal `ExecutionPlan` (validated, defaults resolved, bundles expanded, deterministically ordered) and the executor runs the plan only.
**Consequences:**
- Any runtime path that still takes legacy stage/config inputs is legacy-only and must be deleted by end of M4.
- Per-step config plumbing (schema + validation + executor wiring) is required for the new boundary to be real (not “parsed but ignored”).
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Scope Areas; Triage “Pipeline Cutover Gaps”)

## ADR-ER1-004: The standard pipeline is packaged as a mod-style package (not hard-wired)

**Status:** Accepted
**Date:** 2025-12-21
**Context:** Prior implementations assumed a privileged “standard library” pipeline wired into core; the target architecture requires core to be content-agnostic and mod-driven.
**Decision:**
- Pipeline content ships as **mods** that provide their own registry + recipes.
- The standard pipeline is “just one mod” and must not be hard-coded in `pipeline/standard-library.ts`-style wiring.
**Consequences:**
- Core engine must not embed a privileged pipeline; it loads mod-provided registry + recipes.
- Any direct imports/entrypoints that treat “standard” as intrinsic must be removed or re-homed behind mod packaging.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Scope Areas; Triage “Pipeline Cutover Gaps”)

## ADR-ER1-005: Presets are removed; canonical entry is explicit recipe + settings selection

**Status:** Accepted
**Date:** 2025-12-21
**Context:** Preset resolution/composition was a legacy entry mode tied to `MapGenConfig` and created implicit configuration merges.
**Decision:**
- Presets are removed as a concept; there is no preset resolution/composition in the target runtime.
- Canonical entry is explicit selection of `{ recipe, settings }`.
- If a “preset-like” concept exists in tooling, it is treated as selecting a named recipe (and providing settings), not as a runtime composition mechanism.
**Consequences:**
- All preset resolution/composition paths are legacy and must not survive M4.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Triage “Pipeline Cutover Gaps”)

## ADR-ER1-006: Tag registry is canonical (registered tags only; fail-fast collisions; `effect:*` first-class)

**Status:** Accepted
**Date:** 2025-12-21
**Context:** M3 relied on a fixed allowlist/regex validation (`pipeline/tags.ts`) and executor hard-coded verification lists; this is not safe or extensible for mods.
**Decision:**
- Each mod instantiates a registry that is the canonical catalog for:
  - tags (`artifact:*`, `buffer:*`, `effect:*`)
  - steps (and their config schemas)
- Tags/steps are only valid if registered; unknown tag references are hard errors.
- Duplicate tag IDs and duplicate step IDs are hard errors at registry build time.
- Demo payloads are optional; if present, they must be schema-valid and safe defaults.
- `effect:*` is a first-class namespace in the registry and may be used in `requires/provides`.
**Consequences:**
- Replace allowlist/regex tag validation and any executor hard-coded “verified provides” lists with registry-driven validation/verification.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Triage “Registry + Tag Language Gaps”)

## ADR-ER1-007: Foundation surface is artifact-based; M4 uses monolithic `artifact:foundation` (split deferred per DEF-014)

**Status:** Accepted
**Date:** 2025-12-21
**Update (2025-12-23):** M4 keeps the foundation payload monolithic but moves it onto the artifacts surface (`artifact:foundation` at `ctx.artifacts.foundation`) and removes `ctx.foundation`. The split into `artifact:foundation.*` sub-artifacts remains deferred (DEF-014).
**Context:** M2 established a stable slice contract centered on `ctx.foundation`/`FoundationContext`, while the target architecture requires artifact-based contracts. M4 must align external surfaces without taking on the heavier “split foundation into many artifacts” refactor.
**Decision:**
- **M4 contract:** foundation is a monolithic artifact:
  - dependency tag: `artifact:foundation`
  - canonical storage: `context.artifacts.foundation`
  - `ctx.foundation` is removed as a top-level surface.
- **Post-M4 end-state (DEF-014):** foundation is represented as discrete `artifact:foundation.*` products and the monolithic `artifact:foundation` dependency is removed once consumers migrate.
- Storage layout is still decided: the foundation namespace lives under `context.artifacts.foundation` (M4 monolith examples: `.plates`, `.dynamics`; post-M4 split examples: `.mesh` and peers). M4 keeps the payload monolithic; the split into separately-tagged sub-artifacts is explicitly deferred.
**Consequences:**
- New work must not add dependencies on `ctx.foundation.*` (disallowed surface).
- In M4, new work that depends on foundation must depend on `artifact:foundation` (monolithic) via `ctx.artifacts`.
- DEF-014 tracks the post-M4 split into discrete `artifact:foundation.*` artifacts and the follow-on consumer migration.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Scope + parent issues)
- `issues/CIV-62-M4-FOUNDATION-SURFACE-CUTOVER.md` (implementation ownership)

## ADR-ER1-008: Narrative/playability contract is story entry artifacts by motif; views derived; no `StoryTags`; no narrative globals

**Status:** Accepted
**Date:** 2025-12-21
**Context:** “StoryOverlays/StoryTags” created dual representations and repeated derivations; narrative must be optional and mod-friendly without becoming a privileged core phase.
**Decision:**
- Narrative/playability is expressed as normal steps that publish typed, versioned **story entry artifacts** (`artifact:narrative.motifs.<motifId>.stories.<storyId>@vN`).
- Narrative views (including overlay snapshots) are derived on demand from story entries and are not published dependency surfaces.
- There is no canonical `StoryTags` surface in the target.
- Narrative is optional via recipe composition (a recipe may omit it; if it includes consumers it must include publishers).
- No narrative globals/caches outside a run context; caching is context-owned artifacts keyed to the run.
**Consequences:**
- StoryTags and module-level narrative caches/globals are legacy surfaces and must not survive M4.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Triage “Narrative/Playability Cleanup”; end-state outcomes)

## ADR-ER1-009: Engine boundary is adapter-only + reification-first; `state:engine.*` is transitional-only; verified `effect:*` is schedulable

**Status:** Accepted
**Date:** 2025-12-21
**Context:** Legacy paths relied on engine globals and trusted engine-state tags (`state:engine.*`) as schedulable edges without verification.
**Decision:**
- Civ engine is an I/O surface behind `EngineAdapter`; steps must not read engine globals directly.
- Cross-step dependencies flow through reified TS-owned `buffer:*`/`artifact:*` products.
- `effect:*` is a first-class schedulable namespace; schedulable effects must be runtime-verifiable (adapter-backed postconditions).
- `state:engine.*` is transitional-only wiring and must not be enshrined as a permanent namespace.
**Consequences:**
- Remove `state:engine.*` from the standard pipeline dependency surface by end of M4 (`DEF-008` closeout).
- Eliminate direct engine-global reads as dependency surfaces; fence any remaining engine reads behind adapter/runtime surfaces and reify if cross-step.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Scope Areas; Triage “Effects + state:engine.* Cleanup” and “Engine Boundary Gaps”)

## ADR-ER1-010: Climate ownership is TS-canonical `artifact:climateField` (engine reads fenced; DEF-010 is post-M4 reification)

**Status:** Accepted
**Date:** 2025-12-21
**Context:** Some climate prerequisites still rely on adapter reads (e.g., latitude/water/elevation), which complicates offline determinism and testability.
**Decision:**
- `buffer:climateField` (and any derived views) is TS-owned and canonical.
- Engine writes are publish effects via adapter, not the source of truth.
- Engine reads are allowed only through the adapter and must not become implicit cross-step dependency surfaces; reify if downstream depends.
**Consequences:**
- M4 may keep some adapter reads for climate inputs, but climate ownership is still TS-canonical; deeper reification is explicitly post-M4 (`DEF-010`).
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Out of Scope list)

## ADR-ER1-011: Placement consumes explicit `artifact:placementInputs@v1` (implementation deferred per DEF-006)

**Status:** Accepted
**Date:** 2025-12-21
**Context:** Placement prerequisites were partly implicit engine reads, which makes composition, validation, and testing difficult.
**Decision:**
- Placement consumes an explicit, TS-canonical `artifact:placementInputs@v1` produced upstream and referenced via `requires/provides`.
- Placement may delegate writes/side-effects to the engine via the adapter, but must not rely on implicit “read engine later” state as a dependency surface.
**Consequences:**
- Implementation timing is deferred via `DEF-006`, but the contract direction is locked.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Scope Areas; Triage “Placement inputs” notes)

## ADR-ER1-012: Observability baseline is required (runId + plan fingerprint + structured errors); rich tracing is optional and toggleable

**Status:** Accepted
**Date:** 2025-12-21
**Context:** Removing legacy indirection (manifest/config/flags) increases risk unless the target system preserves stable, explainable “what ran, why, and with what inputs” outputs.
**Decision:**
- Required baseline outputs (stable contract):
  - deterministic `runId` and stable “plan fingerprint” derived from `settings + recipe + step IDs + config`
  - structured compile-time errors and structured runtime failures
  - `ExecutionPlan` carries normalized data to explain scheduling and resolved config
- Optional diagnostics are implemented as pluggable sinks fed by a shared event model.
- Tracing/diagnostics must be toggleable globally and per step occurrence, without changing execution semantics.
**Consequences:**
- M4 must define and test a stable plan-fingerprint strategy to avoid CI flake and support trace correlation.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Triage “Testing / Runner / Observability Alignment”; end-state outcomes)

## ADR-ER1-013: M4 execution decisions (test runner + explicit exclusions)

**Status:** Accepted
**Date:** 2025-12-21
**Context:** M4 is the cutover milestone for “no legacy left” architecture/infrastructure, but not a full “reify every internal step behavior” content milestone.
**Decision:**
- Tests for `mapgen-core` use Bun’s test runner (invoked via pnpm) for M4; any Vitest migration is explicitly post-M4.
- Explicit M4 exclusions (post-M4 work):
  - rainfall ownership transfer / climate prerequisite reification (`DEF-010`)
  - foundation artifact split into discrete `artifact:foundation.*` products (`DEF-014`)
  - recipe UI / mod patch tooling beyond “pick a recipe and run it”
  - algorithm modernization work (morphology/hydrology/ecology)
- Doc-only JS archives under `docs/**/_archive/*` are acceptable to keep; no M4 cleanup required.
**Consequences:**
- M4 completion criteria (“no legacy left”) refers to runtime architecture/infrastructure (single plan path; no stage/preset/dual orchestration/StoryTags surfaces), not full internal content reification for every step.
**Sources:**
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Out of Scope list; Triage resolved decisions)

## ADR-ER1-014: Core principles (TaskGraph pipeline, context-owned state, offline determinism)

**Status:** Accepted
**Date:** 2025-12-21
**Context:** The target architecture must support engine-free execution, strict validation, and mod-authored composition without hidden state.
**Decision:**
- The pipeline is a TaskGraph of explicit step contracts (`requires/provides`), not implicit sequencing.
- There are no globals: all run state is context-owned (`MapGenContext`) and flows through explicit products/tags.
- Offline determinism is required; the Civ engine is optional and treated as an I/O surface (adapter-only).
- Pipeline content is not privileged engine code; it ships as mod packages (registry + recipes).
**Consequences:**
- Any module-level caches/registries/globals that act as dependency surfaces are legacy and must be removed or made context-owned.
- Tests and tooling must be able to compile/execute via a stub adapter with deterministic results.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Scope Areas; end-state outcomes)

## ADR-ER1-015: Hydrology river product is `artifact:riverAdjacency` for now (DEF-005 defers `artifact:riverGraph`)

**Status:** Accepted
**Date:** 2025-12-21
**Context:** Some artifact inventories are still evolving; the target architecture locks the dependency-language approach while deferring specific domain products as needed.
**Decision:**
- `artifact:riverGraph` is explicitly deferred via `DEF-005`.
- Until that later milestone, the canonical river product remains `artifact:riverAdjacency`.
**Consequences:**
- Recipes/steps/tests should not assume `artifact:riverGraph` exists in V1/M4 scope.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`

## ADR-ER1-016: Pure-target non-goals (no compatibility guarantees, no migration shims in the spec)

**Status:** Accepted
**Date:** 2025-12-21
**Context:** The target architecture doc must remain “greenfield” and not encode compatibility/migration requirements as design goals.
**Decision:**
- The pure-target architecture does not include migration strategies or compatibility shims.
- The pure-target architecture does not guarantee parity or output compatibility with legacy pipelines.
**Consequences:**
- Migration/deferral planning lives in `deferrals.md` and milestone planning docs, not as compatibility constraints in the target design.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`

## ADR-ER1-017: V1 explicit deferrals (schema must allow future expansion without breaking changes)

**Status:** Accepted
**Date:** 2025-12-21
**Context:** We want to ship a stable V1 slice that is a true subset of the end-state, while deferring major authoring/tooling expansions.
**Decision:**
- V1 explicitly defers:
  - ergonomic patch tooling for recipes (insert/replace/remove operations)
  - indirect mod placement scripts
  - DAG authoring semantics + deterministic topo-sort tie-break rules (as shipping tooling)
  - optional metadata like `affects` / `affectedBy` (no scheduling semantics by default)
  - full artifact lineage tracing (beyond optional hooks/sinks)
- V1 schemas keep reserved extension containers so future additions are non-breaking (`future.*`, `extensions`).
**Consequences:**
- V1 work should avoid “locking in” ad-hoc extension shapes outside the reserved containers.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`
- `resources/_archive/SPIKE-target-architecture-draft.md`

## ADR-ER1-018: Decision promotion plan (post-M4)

**Status:** Accepted
**Date:** 2025-12-21
**Context:** Target architecture decisions live in the project docs today; longer-term, they should be promoted to evergreen system docs.
**Decision:**
- Promote stable, evergreen parts of the MapGen architecture to `docs/system/libs/mapgen/architecture.md` and related domain docs as the implementation stabilizes.
- Record decisions in `docs/system/ADR.md` as they are finalized.
**Consequences:**
- Project-scoped ADRs may later be superseded by system-level ADRs once MapGen architecture is no longer project-specific.
**Sources:**
- `resources/SPEC-target-architecture-draft.md`

## ADR-ER1-019: Cross-cutting directionality policy is RunRequest settings (not per-step config duplication)

**Status:** Accepted
**Date:** 2025-12-22
**Context:** Several non-foundation steps consult `foundation.dynamics.directionality.*` for biasing/selection, but per-step config is scoped to the recipe occurrence. Keeping directionality inside only the foundation step’s config either forces duplication into multiple steps or creates an implicit “read someone else’s config” dependency.
**Decision:**
- Treat the cross-cutting directionality policy as part of the RunRequest’s `settings` (typed, shared, explicit) rather than duplicating it across step configs.
- Steps that need directionality consume it from `settings` (not from `ctx.config.foundation.*` and not from other steps’ config).
**Consequences:**
- PIPELINE-2 must plumb a typed `settings` surface for directionality and migrate all consumers away from `ctx.config.foundation.dynamics.directionality.*`.
- If we later want directionality to be derived from foundation outputs, that should be a deliberate follow-up decision (it would create a new cross-step artifact dependency surface).
**Sources:**
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Phase B.1 “Per-step config plumbing”; “settings are narrow per-run values”)
- `resources/m4-prework/local-tbd-m4-pipeline-2-step-config-matrix.md` (cross-cutting directionality ownership note)
- `resources/_archive/SPIKE-target-architecture-draft.md`

## ADR-ER1-020: `effect:engine.placementApplied` is verified via a minimal TS-owned `artifact:placementOutputs@v1`

**Status:** Accepted
**Date:** 2025-12-22
**Context:** Placement is an engine-effect-heavy step: the adapter exposes many placement writes but few reads suitable for verification. M4 requires “no asserted-but-unverified scheduling edges” for `effect:*`, but expanding the adapter with placement read-back APIs is higher coordination/engine-surface risk.
**Decision:**
- Placement publishes a minimal, versioned TS-owned output artifact `artifact:placementOutputs@v1`.
- `effect:engine.placementApplied` verification is satisfied by validating that `artifact:placementOutputs@v1` exists and is schema-valid (plus lightweight invariants like expected `startPositions` shape/count when starts are provided).
**Consequences:**
- Introduces a new artifact contract to version/maintain; it should remain intentionally small and “verification-oriented.”
- Output counts are best-effort placeholders; they should not be treated as authoritative engine read-backs.
- Avoids new adapter read surfaces for placement verification in M4; if stronger verification is needed later, prefer adding it explicitly as a follow-up (see DEF-017 for the general “read-back surfaces for effect verification” deferral).
**Sources:**
- `resources/m4-prework/local-tbd-m4-effects-1-effect-tags-postconditions.md` (placement verification options; recommended option 1)
- `resources/m4-prework/local-tbd-m4-placement-2-cutover-checklist.md` (placement cutover verification plan)
- `resources/_archive/SPIKE-target-architecture-draft.md`

## ADR-ER1-021: `effect:engine.landmassApplied` / `effect:engine.coastlinesApplied` are verified via cheap invariants + call evidence; adapter read-back APIs are deferred

**Status:** Accepted
**Date:** 2025-12-22
**Context:** Landmass/coastlines are engine mutations that historically used `state:engine.*` edges without runtime verification. The current adapter interface is largely write-oriented for landmass/plot tags/regions; adding read-back APIs requires more engine-surface design and increases coupling risk.
**Decision:**
- Replace `state:engine.landmassApplied` / `state:engine.coastlinesApplied` with verified `effect:*` tags.
- For M4, verification uses:
  - **cheap invariants** that can be checked with existing adapter reads (e.g., terrain-type deltas for coastlines), and/or
  - **call evidence** in the adapter/mock adapter (e.g., ensuring the expected engine mutation entrypoints were invoked).
- Do not add new adapter read-back APIs for landmass/plot tags/regions solely for verification in M4 (explicitly deferred).
**Consequences:**
- Verification is intentionally “wiring correctness” oriented, not a full semantic proof of engine state.
- If these verifiers are insufficient (miss real breakages or are flaky), revisit with explicit adapter read-back APIs and stronger invariants (tracked as DEF-017).
**Sources:**
- `resources/m4-prework/local-tbd-m4-effects-3-state-engine-removal-map.md` (replacement map + coordination notes)
- `resources/m4-prework/local-tbd-m4-engine-boundary-globals-inventory.md` (engine boundary surfaces and adapter constraints)
- `resources/_archive/SPIKE-target-architecture-draft.md`

---

## ADR-ER1-022: Plan fingerprint excludes observability toggles (semantic fingerprint only)

**Status:** Accepted
**Date:** 2025-12-22
**Context:** M4 adds step-level tracing and CI smoke tests. We need a deterministic `planFingerprint` to correlate runs and keep CI stable, but observability toggles (verbosity / sinks) must not change execution semantics or cause spurious “different plan” IDs.
**Decision:**
- The `planFingerprint` is a **semantic** fingerprint of:
  - normalized recipe (ordered step occurrences),
  - resolved per-occurrence config (after defaults),
  - settings that affect semantics (seed + other cross-cutting policies like directionality).
- Pure observability knobs (trace enablement/verbosity/sink selection) are **excluded** from `planFingerprint`.
- If we need to correlate “same plan under different trace config,” use a separate optional `traceConfigFingerprint` (do not overload the semantic fingerprint).
**Consequences:**
- SAFETY-1/SAFETY-2 can rely on a stable `planFingerprint` in CI regardless of trace verbosity changes.
- RunRequest `settings` should clearly separate “semantics” vs “observability” so fingerprinting stays unambiguous.
**Sources:**
- `issues/CIV-66-M4-SAFETY-NET.md` (plan fingerprint determinism + CI)
- `resources/m4-prework/local-tbd-m4-safety-1-tracing-model-and-fingerprint.md` (explicit exclusions + algorithm sketch)
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Phase A/C sequencing: observability early; CI gate post-cutover)

## ADR-ER1-023: Placement demo payloads omit `starts` by default (engine-free “won’t crash” demos)

**Status:** Accepted
**Date:** 2025-12-22
**Context:** M4 introduces typed tag registry demo payload validation and a TS-canonical `artifact:placementInputs@v1`. Placement “starts” involve engine-dependent adapter calls and can make minimal demos/tests brittle or non-engine-free.
**Decision:**
- Demo payloads and minimal engine-free tests that use `artifact:placementInputs@v1` should **omit `starts` by default**.
- Placement must treat missing `starts` as “skip start placement” (preserve current behavior); this keeps demos “won’t crash” without requiring engine-backed start placement surfaces.
- Engine-backed/integration tests may include `starts` when explicitly testing the start-placement path.
**Consequences:**
- Demo payload validation can stay strict without forcing engine-dependent start placement in all demos.
- CI smoke tests remain engine-free; deeper placement-start correctness should be covered by targeted integration tests when needed.
**Sources:**
- `issues/CIV-64-M4-PLACEMENT-INPUTS.md` (demo payload safety note)
- `resources/m4-prework/local-tbd-m4-placement-1-placementinputs-v1-contract.md` (safe demo payload guidance; `starts` optional)
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Phase E placement contract work)

## ADR-ER1-024: Hotspot categories live in a single narrative hotspots artifact (no split artifacts in v1)

**Status:** Accepted
**Date:** 2025-12-22
**Context:** Consumers (notably features) expect “paradise” vs “volcanic” hotspot semantics, while current producers do not populate the categorized StoryTags surface consistently. The target narrative model makes story entry artifacts canonical and deletes StoryTags as a correctness dependency.
**Decision:**
- Publish hotspot outputs as a **single** canonical story entry artifact under the `hotspots` motif (`artifact:narrative.motifs.hotspots.stories.<storyId>@v1`).
- Encode hotspot categories **within** that story entry payload (e.g., separate categorized tile sets/keys for `paradise` and `volcanic`), rather than splitting into multiple story entries.
- Consumers migrate to read hotspot categories from the hotspots story entry (not StoryTags).
**Consequences:**
- Reduces scheduling/tag surface area (one artifact dependency instead of multiple).
- Requires aligning the hotspots producer and feature consumers to the artifact’s internal category representation during NARRATIVE-1/NARRATIVE-2.
**Sources:**
- `issues/CIV-65-M4-NARRATIVE-CLEANUP.md` (hotspot categorization gap)
- `resources/m4-prework/local-tbd-m4-narrative-1-artifact-inventory.md` (producer/consumer map + hotspot drift note)
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Phase F narrative producers/consumers sequencing)

## ADR-ER1-025: `ctx.overlays` remains a non-canonical derived debug view (story entry artifacts are canonical)

**Status:** Accepted
**Date:** 2025-12-22
**Context:** M3 uses `ctx.overlays` and derived StoryTags as a transitional representation. The target model treats narrative story entries as typed artifacts that participate in scheduling and validation like any other product.
**Decision:**
- Narrative story entry artifacts (`artifact:narrative.motifs.<motifId>.stories.<storyId>@vN`) are the **canonical** dependency surfaces for narrative/playability.
- `ctx.overlays` may remain as a **derived debug/compat view** (useful for diagnostics and transitional helpers), but it must not be required for correctness:
  - consumers must depend on artifacts (or derived helpers operating on artifacts),
  - overlays are not a scheduling surface and should not introduce hidden dependencies.
**Consequences:**
- Enables incremental migration away from overlays/StoryTags without deleting a useful debugging representation.
- Any remaining overlay usage must be treated as debug/compat-only and should not gate pipeline correctness.
**Sources:**
- `issues/CIV-65-M4-NARRATIVE-CLEANUP.md` (overlays/StoryTags cleanup target)
- `resources/m4-prework/local-tbd-m4-narrative-2-storytags-consumer-and-cache-map.md` (consumer/cache map)
- `deferrals.md` (DEF-002 StoryTags compatibility; DEF-012 caches)

## ADR-ER1-026: Landmass/ocean separation do not rely on `foundation.surface/policy` aliases (recipe config is authoritative)

**Status:** Accepted
**Date:** 2025-12-22
**Context:** `landmassPlates` and ocean separation consult legacy `foundation.surface` / `foundation.policy` aliases in addition to dedicated config. With per-occurrence config and explicit settings, these aliases create hidden coupling and undermine “recipe is the source of truth.”
**Decision:**
- Landmass/ocean separation behavior is configured via explicit step config (`config.landmass`, `config.oceanSeparation`) and/or explicit RunRequest settings when cross-cutting.
- `foundation.surface` / `foundation.policy` alias lookups are treated as legacy-only and should be removed from the default path during M4 cleanup (no continued aliasing in v1).
**Consequences:**
- PIPELINE-2 schema/plumbing work can treat landmass+ocean separation as normal per-step config owners.
- PIPELINE-5 cleanup should delete residual alias reads so downstream behavior is “what recipe says,” not “what legacy aliases imply.”
**Sources:**
- `issues/CIV-56-M4-pipeline-cutover-2-step-config-schemas.md` (per-step config plumbing constraints)
- `resources/m4-prework/local-tbd-m4-pipeline-2-step-config-matrix.md` (landmassPlates alias inventory + recommendation)
- `milestones/M4-target-architecture-cutover-legacy-cleanup.md` (Phase B/D pipeline sequencing + “no legacy left” gate)

## Notes / Tentative Directions (not yet binding decisions)

These are captured in the SPIKE as “direction” or “proposed” guidance but are not
locked as accepted target decisions in the SPEC:

- DAG/partial-order authoring: deterministic scheduling tie-break proposal (stable topo sort; recipe layout order; lexical `instanceId` fallback).
- Mutation modeling direction: `buffer:*` mutable canvases vs `artifact:*` immutable/versioned products; richer read/write modeling would require an explicit follow-up decision.
- Mod placement model direction: dataflow correctness + named hook points; “script-based insertion” as tooling over the model.
- `affects` / `affectedBy` as descriptive metadata only unless explicitly promoted via a schema major bump.
