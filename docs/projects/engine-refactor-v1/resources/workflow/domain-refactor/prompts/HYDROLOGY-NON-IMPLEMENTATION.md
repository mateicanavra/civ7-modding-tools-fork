<non_implementation_prompt>
  You are preparing the Hydrology domain vertical refactor for implementation.
  This is strictly planning and modeling (Phases 0–3), not coding. Work one turn
  at a time until the handoff is unambiguous.

  Align with the canonical workflow + templates first, then execute:
  - Phase 0: Setup
  - Phase 0.5: Greenfield pre-work spike (NEW; before current-state / modeling)
  - Phase 1: Current-state spike
  - Phase 2: Modeling spike
  - Phase 3: Implementation plan + slice plan

  Hard rules:
  - Doc-only edits: do not touch production code, tests, or configs.
  - No phase bleed: Phase 0.5 is greenfield sketch only; Phase 1 is current-state only;
    Phase 2 has no slice plan; Phase 3 has no model changes.
  - Phase 2 is “up for grabs”: design the ideal Hydrology domain from earth-physics first;
    legacy structure is not sacred and must not become the model by default.

  Phase 0.5 (greenfield pre-work) is required before Phase 1 and Phase 2:
  - Spend real time on deep research (web, literature, prior domain models, prior code).
  - Imagine the ideal Hydrology domain from an earth-physics standpoint first:
    - what Hydrology owns vs Morphology vs Ecology (and other neighbor domains),
    - subdomains and their relationships (causality spine),
    - what the pipeline should be capable of if Hydrology were designed greenfield.
  - Spell out the upstream/downstream greenfield diff exercise:
    - Upstream: list what’s available today vs what you would need in an ideal world;
      the gap is change-candidates for upstream domains later.
    - Downstream: define what Hydrology should ideally provide downstream and how that
      unlocks downstream capabilities; list implied downstream change-candidates.
  - Stop and do Lookback 0.5 (append to the greenfield spike).

  Phase 1 (current-state) produces an evidence-based inventory and pipeline snapshot:
  - Domain inventory, contract matrix (current), legacy surface inventory, upstream intake,
    downstream consumer inventory, and current producer/consumer map.
  - Include a “greenfield delta notes” section: what current evidence contradicts or constrains
    from the Phase 0.5 sketch.
  - Stop and do Lookback 1 (append to the Phase 1 spike).

  Phase 2 (modeling) is model-first:
  - Start from the Phase 0.5 greenfield sketch, then refine using Phase 1 evidence.
  - Lock the authoritative model, causality spine, and canonical contract surfaces.
  - Run required research passes, then iterate the modeling loop at least twice until stable.
  - Include conceptual narrative + diagrams (architecture view, data flow, producer/consumer map
    with current vs target pipeline adjustments).
  - Add a Config Semantics Table for “semantic knobs” (lists/pairs/weights/modes):
    - meaning, missing vs explicit default policy, empty/null behavior, determinism expectations,
      and tests that will lock non-trivial semantics during implementation.
  - Stop and do Lookback 2 (append to the Phase 2 spike).

  Phase 3 (planning) produces an executable slice plan (no model content):
  - The issue must include:
    - locked decisions/bans with guardrails,
    - config semantics references (Phase 2 table + default/empty/determinism policies),
    - stable fix anchors (prefer “config → normalized internal form” / boundary locations),
    - step decomposition plan derived from the causality spine,
    - consumer migration matrix (break/fix per slice),
    - downstream changes required by the model and assigned to slices.
  - Stop at the pre-implementation checkpoint (the issue doc is the handoff).

  Non-negotiable invariants:
  - The authoritative model is canonical even if artifact contracts/projections change.
  - Projections never define internal representation.
  - Compat is forbidden in the refactored domain; it may only exist downstream as explicitly
    deprecated shims with removal triggers.
  - Every config property, rule/policy, and function must be classified keep/kill/migrate.
  - Upstream authoritative intake and downstream impact scans are mandatory unless the domain is
    root/leaf (and you must state the exception explicitly).
  - PRDs are supporting references only and must be labeled as such in an explicit authority stack.

  If a locked decision changes mid-flight: stop, re-baseline gates in the Phase 3 issue, and plan a
  guardrail in the same slice that introduces the decision.

  Paths (shared root: docs/projects/engine-refactor-v1/)

  - resources/workflow/domain-refactor/WORKFLOW.md
  - resources/workflow/domain-refactor/references/phase-0-greenfield-prework.md
  - resources/workflow/domain-refactor/references/phase-1-current-state.md
  - resources/workflow/domain-refactor/references/phase-2-modeling.md
  - resources/workflow/domain-refactor/references/phase-3-implementation-plan.md
  - resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md
  - resources/workflow/domain-refactor/references/earth-physics-and-domain-specs.md
  - resources/workflow/domain-refactor/references/op-and-config-design.md
  - resources/workflow/domain-refactor/references/verification-and-guardrails.md
  - resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md

  Hydrology prior art / drafts:
  - resources/workflow/domain-refactor/plans/hydrology/HYDROLOGY.md
  - resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-current-state.md
  - resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling.md

  Canonical required artifacts to produce:
  - resources/spike/spike-hydrology-greenfield.md
  - resources/spike/spike-hydrology-current-state.md
  - resources/spike/spike-hydrology-modeling.md
  - issues/LOCAL-TBD-<milestone>-hydrology-*.md
  - triage.md
</non_implementation_prompt>
