<non_implementation_prompt>
You are preparing the Gameplay domain vertical refactor for implementation in the Civ7 MapGen refactor project.

You are strictly in read-only mode:
- DO NOT create branches, edit production code, modify tests/configs, or run git operations.
- Do not generate or modify generated artifacts.
- Your job is analysis, modeling, and planning only.

CRITICAL: Before starting ANY phase work, open and follow the canonical workflow + templates in-repo.
Treat the workflow docs as the “shape contract” for each phase deliverable. Do not invent new phase formats.

Required repo docs to read + follow (shared root: docs/projects/engine-refactor-v1/):
- resources/workflow/domain-refactor/WORKFLOW.md
- resources/workflow/domain-refactor/IMPLEMENTATION.md
- resources/workflow/domain-refactor/references/phase-0-greenfield-prework.md
- resources/workflow/domain-refactor/references/phase-1-current-state.md
- resources/workflow/domain-refactor/references/phase-2-modeling.md
- resources/workflow/domain-refactor/references/phase-3-implementation-plan.md
- resources/workflow/domain-refactor/references/domain-inventory-and-boundaries.md
- resources/workflow/domain-refactor/references/earth-physics-and-domain-specs.md
- resources/workflow/domain-refactor/references/op-and-config-design.md
- resources/workflow/domain-refactor/references/verification-and-guardrails.md
- resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md

Canonical domain context / evidence (domain-only meaning; not workflow shape):
- docs/system/libs/mapgen/research/SPIKE-gameplay-mapgen-touchpoints.md
- docs/system/libs/mapgen/architecture.md
- docs/system/libs/mapgen/ecology.md

Gameplay prior art / drafts (IMPORTANT posture):
- These are templates/seeds only; they are NOT authoritative.
- Treat the canonical workflow docs + your Phase 0.5→2 reasoning as dominant; prior art cannot constrain the model.
- If a prior-art file has the same name/path as a required deliverable, your output MUST overwrite/supersede it.
- Prior art locations:
  - resources/workflow/domain-refactor/plans/gameplay/README.md
  - resources/workflow/domain-refactor/plans/gameplay/GAMEPLAY.md
  - resources/workflow/domain-refactor/plans/gameplay/OWNERSHIP-MAP.md
  - resources/workflow/domain-refactor/plans/gameplay/STAGE-STEP-INVENTORY.md
  - resources/workflow/domain-refactor/plans/gameplay/DOMAIN-ABSORPTION-INVENTORY.md
  - resources/workflow/domain-refactor/plans/gameplay/CIV7-MAPGEN-LEVER-INVENTORY.md
  - resources/workflow/domain-refactor/plans/gameplay/ADAPTER-GAP-TRIAGE.md
  - resources/workflow/domain-refactor/plans/gameplay/IMPLEMENTATION-PLAN.md
  - resources/workflow/domain-refactor/plans/gameplay/spike-gameplay-domain-refactor-plan-notes.md

Additional context (non-authoritative; read after the workflow docs):
- resources/workflow/domain-refactor/prompts/GAMEPLAY-CONTEXT.md

MILESTONE:
- The milestone identifier is TBD (confirm with the project owner before starting Phase 3).
- All Phase 3 issues must use `issues/LOCAL-TBD-<milestone>-gameplay-*.md`.

Canonical artifacts you must produce (ALL live under the Gameplay domain plan directory; no top-level spike dir):
- resources/workflow/domain-refactor/plans/gameplay/spike-gameplay-greenfield.md
- resources/workflow/domain-refactor/plans/gameplay/spike-gameplay-current-state.md
- resources/workflow/domain-refactor/plans/gameplay/spike-gameplay-modeling.md
- docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-gameplay-*.md
- docs/projects/engine-refactor-v1/triage.md

WORK ONE PHASE PER TURN. No phase bleed. No partial “preview” of later phases.
After completing a phase document, STOP and append the required Lookback section for that phase.

───────────────────────────────────────────────────────────────────────────────
A) Workflow Shape (Canonical)

Align with the canonical workflow + templates first, then execute:
- Phase 0: Setup
- Phase 0.5: Greenfield pre-work spike (NEW; before current-state / modeling)
- Phase 1: Current-state spike
- Phase 2: Modeling spike
- Phase 3: Implementation plan + slice plan

Hard rules (no exceptions):
- Doc-only work. No production code, tests, configs, or generated artifacts.
- No phase compression/shortcuts:
  - Complete Phase 0.5 → 3 fully, in order, producing each phase’s canonical deliverable.
  - “Existing work looks aligned” never justifies merging, skipping, or shortcutting phases.
- No phase bleed:
  - Phase 0.5 is greenfield-only.
  - Phase 1 is current-state-only (evidence; no redesign).
  - Phase 2 is modeling-only (authoritative model; NO slice plan).
  - Phase 3 is planning-only (slice plan; NO model changes).

Authority model:
- This prompt is a wrapper + execution posture, not the spec itself.
- Canonical workflow + locked decisions live in the workflow docs above.
- Gameplay-specific deliverables live in `resources/workflow/domain-refactor/plans/gameplay/`.
- SINGLE CANONICAL BODY PER DELIVERABLE (hard rule):
  - If you need supporting notes, they must point to the canonical deliverable and MUST NOT duplicate or fork it.

───────────────────────────────────────────────────────────────────────────────
B) Gameplay Scope Framing (First-pass; locked posture; no algorithm prescriptions)

Gameplay is a brand-new domain surface in this refactor, but it absorbs legacy concerns:
- Placement dissolves into Gameplay ownership.
- Gameplay is the mapgen-time “board setup + player-facing content placement” ownership boundary.

Gameplay is interdependent and sits at a boundary:
- It consumes upstream physics-derived artifacts (Foundation/Morphology/Hydrology/Ecology).
- It produces gameplay-facing plans and applies them at engine boundaries.
- It must be co-designed with Ecology at the boundary (ownership and coupling decisions are explicit Phase 0.5 + Phase 2 work).

Narrative/story overlays posture (hard ban for this refactor phase):
- Do not model narrative/story overlays as inputs, outputs, or decision drivers for Gameplay.
- Treat existing “story/narrative/overlay” steps and artifacts as legacy surfaces to be removed and replaced.
- If a signal is needed, replace it with a canonical, domain-anchored artifact (upstream physics) or a Gameplay-owned rule/contract — not a story overlay.

Stage braid posture:
- Pipeline stage ids are part of the author contract.
- If interleaving/braid constraints force boundaries, document the constraint explicitly.
- Avoid ambiguous naming like “pre/core/post” when you can provide semantic stage ids.

Conceptual decomposition vs pipeline boundary count:
- Steps should track real causality where feasible.
- Internal clarity splits are allowed and encouraged until they cause sprawl or boundary-breaking imports/exports.
- Promote pipeline boundaries only when they earn their keep (interoperability, hooks, stable cross-domain contracts).

───────────────────────────────────────────────────────────────────────────────
C) Locked invariants to carry into Gameplay planning (non-negotiable)

You must follow the locked decisions in `references/implementation-traps-and-locked-decisions.md`. In particular:

- Config semantics contract (locked):
  - Advanced config (schema-defaulted) is the baseline.
  - Knobs apply last as deterministic transforms.
  - Hard ban: “presence detection” or “compare-to-default gating.”
  - Hard ban: post-normalization “if undefined then fallback” defaulting in runtime logic.

- Hard bans (no exceptions):
  - Hidden multipliers / constants / defaults (no unnamed behavior-shaping numbers in compile/normalize/run paths).
  - Placeholders / dead bags (no empty directories, empty config bags, or future scaffolding).

- Contract posture:
  - Public vs internal is intentional: promote stable cross-domain contracts only; keep unstable intermediates internal.
  - Types follow schemas: do not hand-duplicate TS shapes when a schema exists; derive types from schemas.

───────────────────────────────────────────────────────────────────────────────
D) Phase Deliverables (Do exactly what the phase reference requires)

Phase 0.5 — Greenfield pre-work spike (required before Phase 1 and Phase 2):
- Start from first principles and Civ7 evidence; do not fit the model to current repo wiring.
- Define Gameplay’s owned responsibilities at mapgen-time (categories, not algorithms):
  - board setup (starts, regions/partitions, player/civ constraints)
  - gameplay-facing content placement (resources, wonders, discoveries, etc.)
  - engine-facing projections and apply-boundary interactions
- Define explicit boundaries and “handshake contracts” with Ecology:
  - what Gameplay consumes from Ecology as public contracts,
  - what Ecology (if anything) consumes from Gameplay as explicit contracted inputs,
  - what decisions are “gameplay rules” vs “ecology physics truth”.
- Make an explicit early call on public vs internal surfaces:
  - what is stable cross-domain contract (public artifacts/contracts),
  - what is internal working state that must not leak to consumers.
- Treat narrative/story overlays as legacy to remove; model canonical equivalents (or explicit gameplay rules/contracts).
- Append Lookback 0.5.

Phase 1 — Current-state spike (evidence only; no redesign):
- Inventory the current mapgen-time gameplay surfaces across the repo:
  - placement domain (ops/contracts/config)
  - any narrative/story surfaces currently influencing gameplay outcomes
  - engine apply boundaries and adapter touchpoints
  - consumers and backdoors (deep imports, global engine reads)
- Explicitly inventory:
  - where story/narrative/overlay artifacts are load-bearing today (must be removed/replaced),
  - hidden multipliers/constants/defaults (must surface),
  - placeholders/dead bags (must delete).
- Append Lookback 1.

Phase 2 — Modeling spike (model-first; must iterate twice; no slice plan):
- Lock the authoritative Gameplay model:
  - causality spine and step decomposition (board setup → intents → apply),
  - contract surfaces and schemas for public artifacts,
  - stable boundaries with Ecology and other domains.
- Make “stage ids are contract” explicit:
  - propose semantic stage ids (or explicitly document braid constraints that prevent them).
- Include Config Semantics Table for any semantic knobs (meaning/default/empty/null/determinism + tests to lock).
- Make the knobs-last composition contract explicit (and identify guardrails/tests).
- Append Lookback 2.

Phase 3 — Implementation plan + slice plan (no model content):
- Produce an executable issue document (the handoff) under:
  - docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-gameplay-*.md
- The issue must include:
  - locked decisions/bans with guardrails,
  - stable fix anchors,
  - consumer migration matrix (break/fix per slice),
  - plan for removing story/narrative/overlay load-bearing surfaces (replace with canonical contracts),
  - plan for absorbing Placement into Gameplay while keeping the pipeline green.
- Each slice must be end-to-end and pipeline-green:
  - migrations + deletions + docs/tests + guardrails + explicit cleanup/removals.
- Stop at the pre-implementation checkpoint (issue doc is the handoff).

Do not start Phase 0.5 unless the user explicitly instructs you to begin.
</non_implementation_prompt>

