<non_implementation_prompt>
  You are preparing the Hydrology domain vertical refactor for implementation.
  This is strictly planning and modeling (Phases 0–3), not coding. Work one turn
  at a time until the handoff is unambiguous.

  Align with the canonical workflow + phase references first, then execute:
  - Phase 0: Setup
  - Phase 0.5: Greenfield pre-work spike (NEW; before current-state / modeling)
  - Phase 1: Current-state spike
  - Phase 2: Modeling spike
  - Phase 3: Implementation plan + slice plan

  Scope (non-implementation):
  - Doc-only edits: do not touch production code, tests, configs, or generated artifacts.
  - Planning/modeling only (Phases 0–3). Implementation is out of scope.
  - No phase bleed (hard rule):
    - Phase 0.5 is greenfield-only.
    - Phase 1 is current-state-only.
    - Phase 2 is modeling-only (no slice plan).
    - Phase 3 is slice planning-only (no model changes).

  Authority model (do not “re-spec” decisions in this prompt):
  - This prompt is directional and historical; treat it as a wrapper, not a spec.
  - Canonical workflow + locked decisions live in the domain-refactor workflow docs.
  - Hydrology-specific work lives under `plans/hydrology/`.
    - The canonical phase deliverables are the non-suffixed phase files (listed below).
    - Any other Hydrology files in that directory are supporting notes only and MUST NOT become a second canonical body for the same deliverable.

  Locked invariants to carry through Phases 0.5–3 (high-level; details live in the references):
  - **Single canonical modeling/spec body.** No duplicate canonical bodies per deliverable; use pointers/redirects instead.
  - **No narrative overlays / story artifacts.** Do not model, depend on, or introduce narrative overlays; plan removal + replacement with canonical domain-anchored constructs.
  - **Knobs + advanced config are one locked author contract.** Knobs apply last as deterministic transforms; ban presence/compare-to-default gating.
  - **Conceptual decomposition vs pipeline boundary count.** Prefer boundaries that reflect the causality spine, but only promote boundaries when they earn their keep (contracts/hooks/interoperability); internal clarity splits are fine until they cause sprawl or boundary-breaking imports.
  - **Public vs internal is intentional.** Only promote stable cross-domain contracts; keep unstable intermediates internal and document that posture.
  - **Stage ids are part of the author contract.** If braid/interleaving forces stages, document that constraint and use semantic stage ids (avoid “pre/core/post”).
  - **Hard ban: no hidden multipliers/constants/defaults.** Behavior-shaping numbers must be author config/knobs or named constants with explicit intent.
  - **Hard ban: no placeholders / dead bags.** Do not plan for placeholder directories/modules/bags; Phase 3 must explicitly plan removal of any shims/compat created during implementation.
  - **Execution posture.** Plan slices as end-to-end, pipeline-green units (migrations + deletions + docs/tests + guardrails), and stop-the-line if a locked decision is threatened.

  Phase 0.5 (greenfield pre-work) is required before Phase 1 and Phase 2:
  - Start from earth-physics first, not current code layout.
  - Make an explicit early call on “public vs internal” surfaces for downstream domains.
  - Treat narrative overlays as out-of-scope; model the canonical domain-anchored equivalents instead.
  - Stop and do Lookback 0.5 (append to the greenfield spike per the Phase 0.5 reference).

  Phase 1 (current-state) produces an evidence-based inventory and pipeline snapshot:
  - Produce the required inventory artifacts (contracts, surfaces, producer/consumer map).
  - Explicitly inventory narrative overlays/story artifacts as legacy dependencies to be removed/replaced.
  - Explicitly inventory hidden multipliers/constants/defaults and placeholders/dead bags as “must delete / must surface” risks.
  - Stop and do Lookback 1 (append to the Phase 1 spike per the Phase 1 reference).

  Phase 2 (modeling) is model-first:
  - Start from Phase 0.5 greenfield, then refine with Phase 1 evidence.
  - Lock the canonical model, causality spine, and public contract surfaces; keep intermediates internal unless deliberately promoted.
  - Make the “knobs-last” composition contract explicit (at the model/contract level), and identify the tests/guardrails that will lock it.
  - Name pipeline stages semantically (and document braid/interleaving constraints if they exist); do not use narrative overlays as a modeled input/output surface.
  - Stop and do Lookback 2 (append to the Phase 2 spike per the Phase 2 reference).

  Phase 3 (planning) produces an executable slice plan (no model content):
  - Produce an implementation-plan issue that is executable slice-by-slice and explicitly references the locked decisions/guardrails.
  - Each slice must be end-to-end (pipeline-green): migrations + deletions + docs/tests + guardrails + explicit cleanup/removals.
  - Include a consumer migration plan that is contract-driven (consume canonical Hydrology artifacts, not narrative overlays).
  - Stop at the pre-implementation checkpoint (the Phase 3 issue doc is the handoff).

  If a locked decision changes mid-flight: stop, re-baseline gates in the Phase 3 issue, and plan a
  guardrail in the same slice that introduces the decision.

  Canonical workflow / locked decisions (shared root: `docs/projects/engine-refactor-v1/`):
  - `resources/workflow/domain-refactor/WORKFLOW.md`
  - `resources/workflow/domain-refactor/IMPLEMENTATION.md`
  - `resources/workflow/domain-refactor/references/phase-0-greenfield-prework.md`
  - `resources/workflow/domain-refactor/references/phase-1-current-state.md`
  - `resources/workflow/domain-refactor/references/phase-2-modeling.md`
  - `resources/workflow/domain-refactor/references/phase-3-implementation-plan.md`
  - `resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md`
  - `resources/workflow/domain-refactor/references/earth-physics-and-domain-specs.md`
  - `resources/workflow/domain-refactor/references/op-and-config-design.md`
  - `resources/workflow/domain-refactor/references/verification-and-guardrails.md`
  - `resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`

  Hydrology work directory (canonical location for Hydrology-specific planning artifacts):
  - `resources/workflow/domain-refactor/plans/hydrology/`

  Canonical phase deliverables (single canonical location; do not duplicate elsewhere):
  - `resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-greenfield.md`
  - `resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-current-state.md`
  - `resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling.md`
  - `issues/LOCAL-TBD-<milestone>-hydrology-*.md`
  - `triage.md`
</non_implementation_prompt>
