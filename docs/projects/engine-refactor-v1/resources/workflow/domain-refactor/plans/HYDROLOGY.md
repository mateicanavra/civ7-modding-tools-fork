---
name: plan-hydrology-vertical-domain-refactor
description: |
  Draft Hydrology domain implementation plan/spec.
  This plan instantiates the shared WORKFLOW for a Hydrology refactor and is intended to stay “live”:
  each phase ends with a lookback that updates downstream phases based on what we learned.
---

# PLAN: Hydrology (Vertical Domain Refactor)

This is the **Hydrology-specific implementation plan/spec** for refactoring the Hydrology domain end-to-end:
- **Domain modeling:** physically grounded, first-principles, authoritative (legacy behavior is not sacred).
- **SDK architecture:** contract-first ops + orchestration-only steps; stage-owned artifact contracts; `run(ctx, config, ops, deps)`.

This is a **draft plan** (not a milestone doc yet). The plan is expected to evolve via the built-in lookbacks.

**Backbone workflow:** `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

<!-- Path roots -->
 = mods/mod-swooper-maps
 = packages/mapgen-core

## Canonical posture (enforced): do not propagate legacy

Hydrology is currently a “mixed posture” domain: it has early domain module scaffolding, but most hydrology behavior still lives in steps with legacy dependency wiring.

**Hard principle:**
- **Legacy behavior and legacy authoring patterns should not be propagated.**
- **All new work must be expressed through the canonical architecture and authoring surfaces**, not by copying old patterns “because that’s how this file already does it”.

**Upstream compatibility rule (apply during this refactor):**
- If upstream provides compatibility shims or projection artifacts for migration, do not treat them as canonical inputs.
- This domain must decide and document its authoritative upstream inputs (buffers/artifacts/overlays) and remove compat reads during the refactor.
- If this domain publishes projections for downstream consumers, do so explicitly and mark them as deprecated/compat in contracts/docs.
**Compat cleanup tracking:**
- If any compat projections remain after this refactor, add a cleanup item in `docs/projects/engine-refactor-v1/triage.md`.
- If the immediate downstream domain can remove them safely with no other downstream consumers affected, that downstream owns the cleanup and must have a dedicated issue; link it from triage.

**Concrete example (what not to repeat):**
- In several existing Ecology steps, the step module imports a config type and then annotates the `run(...)` handler parameter as `config: <SomeConfigType>`, even though the step contract schema already defines and provides the config shape.
- This is a legacy smell because it:
  - adds unnecessary imports and coupling,
  - encourages redundant type plumbing,
  - worsens DX without improving correctness.

**Default rule for this refactor (unless Phase 1/2 prove otherwise):**
- Do not import config types purely to annotate the `run(ctx, config, ops, deps)` parameter list.
- Prefer inferred types from the step contract schema + canonical authoring helpers.

**DX posture checklist (apply before writing or “improving” code):**
- [ ] Am I about to add a new import? If yes, is it truly required by canonical layering (or is it a legacy habit)?
- [ ] Am I about to add explicit types that inference already provides? If yes, justify why.
- [ ] Am I about to introduce a second way to do something (compat paths, alt deps access, legacy helpers)? If yes, stop—prefer one canonical way.
- [ ] Did I inspect callsites/references (code-intel) before writing JSDoc/TypeBox `description` text?
- [ ] Is this the minimal, highest-DX expression that still respects boundaries and contracts?

## Living plan artifacts (required; keep updated)

This plan stays “live” by keeping a small set of structured artifacts continuously updated. These are used directly when cutting the Phase 3 implementation issue and when validating slice completeness.

- Appendix A: **Domain Surface Inventory (outside view)**
- Appendix B: **Contract Matrix (requires/provides; artifacts vs buffers vs overlays)**
- Appendix C: **Decisions + Defaults**
- Appendix D: **Risk Register**
- Appendix E: **Golden Path Example (canonical authoring)**

## Hydrology-specific framing (read once)

Hydrology/Climate sits immediately downstream of Morphology and publishes the **authoritative climate + surface-water signals** that Ecology / Narrative / Placement consume.

- It is **buffer-heavy** (shared, mutable, iterative layers like climate fields and routing indices).
- It also tends to be **cross-domain aware** (e.g., consuming upstream morphology layers, and optionally consuming narrative motifs to bias climate “story”).

This means:
- Phase 1/2 must be **cross-pipeline aware** (expect contract changes downstream).
- Slice planning must preserve “pipeline coherence” at every boundary (avoid a big-bang rewrite unless explicitly justified).

**North-star inputs (modeling):**
- Canonical domain modeling: `docs/system/libs/mapgen/hydrology.md`
- Pipeline posture + buffers/overlays: `docs/system/libs/mapgen/architecture.md`
- Upstream seed: `docs/system/libs/mapgen/morphology.md` (Hydrology consumes Morphology structure)
- Downstream consumers (for contract stability): `docs/system/libs/mapgen/ecology.md`, `docs/system/libs/mapgen/placement.md`, `docs/system/libs/mapgen/narrative.md`

**Known current-state reality (to validate in Phase 1; do not assume beyond this list):**
- Hydrology is currently split across multiple recipe stages:
  - `/src/recipes/standard/stages/hydrology-pre/`
  - `/src/recipes/standard/stages/hydrology-core/`
  - `/src/recipes/standard/stages/hydrology-post/`
- These stages appear to still use the legacy stage/step authoring posture (no stage-owned `artifacts.ts`, legacy tag-based `requires`/`provides`, direct imports of `.../artifacts.js`).
- `/src/domain/hydrology/ops/contracts.ts` is currently empty (Hydrology is not yet contract-first in practice).
- Current steps perform climate and water work directly:
  - `lakes`, `climate-baseline` (pre)
  - `rivers` (core)
  - `climate-refine` (post)
- Current hydrology code includes cross-domain coupling that must be made explicit in the contract matrix:
  - Climate refine consumes hydrology-owned wind/current products plus narrative motifs (`rifts`, `hotspots`) and river adjacency.

<workflow>

<step name="phase-0-setup">

**Objective:** Establish a stable starting point and a work environment for Hydrology refactor work.

**Inputs:**
- `<milestone>` (e.g. `M9` when formalized)

**Outputs:**
- Worktree + branch for Hydrology refactor work.
- A “baseline is green” note (or a recorded list of known failures + links).

**Gate (do not proceed until):**
- [ ] You are operating in a worktree.
- [ ] Baseline checks are green, or failures are recorded with rationale.

**References:**
- Shared workflow preflight: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

</step>

<step name="phase-1-current-state-spike">

**Objective:** Produce a Hydrology-specific current-state spike: inventory everything Hydrology touches, and everything that touches Hydrology.

**Outputs:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-hydrology-current-state.md`
- Update (at least a first draft) in this plan:
  - Appendix A (Domain Surface Inventory)
  - Appendix B (Contract Matrix; current-state mapping)

**Phase 1 focus (Hydrology-specific):**
- Stage + recipe wiring:
  - Identify how the three hydrology stages are wired today (steps, ordering, and inter-stage coupling).
  - Identify where the Standard recipe expects Hydrology outputs (buffers/artifacts/overlays) and how those are referenced today (contracts vs deep imports).
- Domain touchpoints:
  - Catalog hydrology “domain logic” entrypoints consumed directly by steps (e.g., climate baseline/refine functions).
  - Identify any cross-domain deep imports that should become curated, stable contract surfaces.
- Buffer candidates:
  - List the shared mutable layers Hydrology initializes and/or mutates (climate fields, indices, river adjacency, any routing intermediates).
  - Explicitly separate “buffer identity” from “artifact publish-once handle” (temporary wiring).
  - Record any current “re-publish” patterns that violate the buffer policy (publish once, then mutate in place).
- Overlay candidates:
  - Catalog any “story” motifs Hydrology consumes (or produces) that should be represented as overlays (append-preferred; minimal mutation).
  - Identify current representation and whether it should be collapsed into `context.overlays.*` instead of ad-hoc artifacts.

**Lookback (required):**
- **Objective:** Update downstream phases based on what Phase 1 revealed.
- **Outputs:**
  - Update Appendix A/B with a more accurate “outside view”.
  - Add/adjust items in Appendix C (Decisions) and Appendix D (Risks).
  - Tighten Phase 2 modeling questions to match the real coupling edges you found.
- **Gate:** Do not proceed to Phase 2 until:
  - [ ] Appendix A has a first-pass outside view of Hydrology.
  - [ ] Appendix B lists current requires/provides for each hydrology step/stage (even if still tag-based).

</step>

<step name="phase-2-modeling-spike">

**Objective:** Produce a Hydrology modeling spike from first principles (earth-physics grounded), with an explicit target contract surface for the pipeline.

**Outputs:**
- `docs/projects/engine-refactor-v1/resources/spike/spike-hydrology-modeling.md`
- Update (at least a first draft) in this plan:
  - Appendix B (Contract Matrix; *target-state* mapping)
  - Appendix C (Decisions + Defaults)

**Phase 2 focus (Hydrology-specific):**
- Climate “product spine”:
  - Identify the minimal, authoritative climate field products consumers should read (temperature, moisture/rainfall, derived indices).
  - Identify which parts are buffers vs artifacts (publish-once handles) vs overlays (story motifs).
- Hydrology products:
  - Identify what “river/water” products should be authoritative read paths for consumers (representation is allowed to evolve, but the contract must be stable).
  - Identify which products are derived indices (and who owns them).
- Policy-style rules vs generic helpers:
  - Identify rule/policy decisions that should be imported into ops (e.g., a “rain shadow strength policy”) rather than scattered helper functions.
- Cross-domain contracts:
  - Decide how Hydrology should consume upstream layers and downstream story overlays without importing internals.
  - Identify any contract changes needed in Narrative (overlays) or Foundation (directionality) to keep the pipeline coherent.

**Lookback (required):**
- **Objective:** Update Phase 3+ with the target model (including behavior changes that are authorized).
- **Outputs:**
  - Update Appendix C decisions (including defaults and “why”).
  - Update Appendix D risks (e.g., regressions, coupling changes).
  - Draft a first “golden path” sketch in Appendix E for one canonical hydrology step.
- **Gate:** Do not proceed to Phase 3 until:
  - [ ] The target contract matrix exists (even if still rough).
  - [ ] Any cross-domain contract changes are explicitly listed as decisions/risks.

</step>

<step name="phase-3-implementation-plan-and-slice-plan">

**Objective:** Turn the Phase 1+2 spikes into a concrete implementation plan and slice plan that preserves pipeline coherence.

**Outputs:**
- `docs/projects/engine-refactor-v1/resources/plan/plan-hydrology-implementation.md`
- A slice plan that can be converted into a milestone + local issues without “black ice”.

**Phase 3 focus (Hydrology-specific):**
- Decide stage boundaries:
  - Confirm whether Hydrology remains 3 stages or consolidates (must be justified by contracts and pipeline coherence).
- Define stage-owned artifact surfaces:
  - For each hydrology stage, define `artifacts.ts` as the stage-owned contract surface.
  - Identify which contracts are “publish once” artifacts vs buffer handles vs overlay containers.
- Define hydrology domain ops:
  - Create an initial contract-first op catalog (atomic ops; no orchestration).
  - Decide which current step behaviors become ops vs remain step-only composition.
- Tighten import boundaries:
  - Steps should orchestrate via `ops.*` and read via `deps.*` (not deep imports / not direct `.../artifacts.js` access).
  - Domain ops should remain importable as a domain surface (avoid accidental SDK-only coupling).

**Lookback (required):**
- **Objective:** Confirm the slice plan is viable and refine based on remaining unknowns.
- **Outputs:** Update Appendix D (risks) with “slice boundary risks” and define mitigations.
- **Gate:** Do not proceed to Phase 4 until:
  - [ ] There is an explicit slice plan with “green at every slice boundary”.
  - [ ] Verification commands and regression harnesses are identified.

</step>

<step name="phase-4-implementation-slices">

**Objective:** Implement Hydrology refactor work in reviewable slices that preserve pipeline coherence at every boundary.

**Outputs (per slice):**
- Working, green pipeline after each slice.
- Updated docs + JSDoc/TypeBox descriptions for any touched surfaces (context-aware, not boilerplate).
- Updated appendices (A–E) as reality changes.

**Slice loop (flattened; repeat per slice):**
1. **Select slice goal** (one sentence) and update Appendix D risk notes for that slice.
2. **Prework**:
   - Code-intel: callers/refs for every touched contract surface.
   - Confirm import boundary policy and artifact/buffer/overlay posture.
3. **Implement**:
   - Express changes through canonical authoring surfaces.
   - Avoid propagating legacy patterns; remove redundant typing/imports.
4. **Document as you go**:
   - Add/adjust JSDoc and schema `description` fields based on callsite understanding.
5. **Verify**:
   - Run the known regression harness; add targeted tests if needed.
6. **Lookback (required)**:
   - Update Appendix A/B/C/D/E for what the slice changed.
   - Adjust downstream slice order if reality diverged from assumptions.

**Gate:** Do not begin the next slice until:
- [ ] This slice ends in a green pipeline state.
- [ ] Any newly discovered unknowns are captured (Appendix C decisions or Appendix D risks).

</step>

<step name="phase-5-verification-cleanup-and-extras">

**Objective:** Complete end-to-end verification and cleanup so Hydrology becomes a canonical exemplar (modeled + architecturally aligned).

**Outputs:**
- A “Hydrology is canonical” checklist signed off (domain surfaces, stage contracts, buffers/artifacts/overlays posture, lint rules, tests).
- Updated references/docs if Hydrology introduced new canonical patterns.

**Verification expectations (Hydrology-specific):**
- Validate consumer domains (Ecology/Narrative/Placement) still have stable read paths for climate and water signals.
- Validate that buffer publish-once rules are respected (no re-publish patterns reintroduced).
- Validate overlay consumption is via `context.overlays.*` (or explicit transitional mapping), not ad-hoc artifacts.

</step>

</workflow>

---

## Appendix A: Domain Surface Inventory (outside view)

_Populate during Phase 1. Keep this as an “outside view” only: what a consumer can import/call, not internal file structure._

## Appendix B: Contract Matrix (artifacts vs buffers vs overlays)

_Populate during Phase 1 (current-state) and Phase 2 (target-state)._

## Appendix C: Decisions + Defaults

_Populate during Phase 2/3. Prefer explicit options, chosen defaults, and rationale._

## Appendix D: Risk Register

_Populate continuously. Prefer “what could go wrong” + mitigation and slice boundary notes._

## Appendix E: Golden Path Example (canonical authoring)

_Add one minimal step + op example that demonstrates canonical authoring under the U21 posture._
