<non_implementation_prompt>
You are preparing the Ecology domain vertical refactor for implementation in the Civ7 MapGen refactor project.

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

Canonical domain context (domain-only meaning; not workflow shape):
- docs/system/libs/mapgen/ecology.md
- docs/system/libs/mapgen/architecture.md

Gameplay look-ahead (required for Ecology planning; not an implementation dependency):
- resources/workflow/domain-refactor/plans/gameplay/GAMEPLAY.md
- resources/workflow/domain-refactor/plans/gameplay/OWNERSHIP-MAP.md
- resources/workflow/domain-refactor/plans/gameplay/DOMAIN-ABSORPTION-INVENTORY.md
- resources/workflow/domain-refactor/plans/gameplay/STAGE-STEP-INVENTORY.md
- resources/workflow/domain-refactor/plans/gameplay/IMPLEMENTATION-PLAN.md

Ecology prior art / existing work (IMPORTANT posture):
- Ecology was refactored before, but not to current standards. Treat this pass as a greenfield re-think of the model and decomposition.
- Use existing code/structure as evidence and a starting point for investigation, not as a constraint on the model.
- Prior art locations (templates/seeds only; not authoritative):
  - resources/workflow/domain-refactor/plans/ecology/ECOLOGY.md
  - resources/workflow/domain-refactor/plans/ecology/spike-ecology-current-state.md
  - resources/workflow/domain-refactor/plans/ecology/spike-ecology-modeling.md
  - issues/LOCAL-TBD-ecology-vertical-domain-refactor.md
- Primary code locations to inspect (evidence only; not authoritative):
  - mods/mod-swooper-maps/src/domain/ecology/
  - mods/mod-swooper-maps/src/recipes/standard/stages/ecology/

MILESTONE:
- The milestone identifier is TBD (confirm with the project owner before starting Phase 3).
- If a milestone-scoped issue naming convention is required, use `issues/LOCAL-TBD-<milestone>-ecology-*.md`.
- Otherwise, use/extend `issues/LOCAL-TBD-ecology-vertical-domain-refactor.md` as the Phase 3 handoff.

Canonical artifacts you must produce (ALL live under the Ecology domain plan directory; no top-level spike dir):
- resources/workflow/domain-refactor/plans/ecology/spike-ecology-greenfield.md
- resources/workflow/domain-refactor/plans/ecology/spike-ecology-current-state.md
- resources/workflow/domain-refactor/plans/ecology/spike-ecology-modeling.md
- docs/projects/engine-refactor-v1/issues/LOCAL-TBD-ecology-vertical-domain-refactor.md (or milestone-scoped variant; see above)
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
- Ecology-specific deliverables live in `resources/workflow/domain-refactor/plans/ecology/`.
- SINGLE CANONICAL BODY PER DELIVERABLE (hard rule):
  - If you need supporting notes, they must point to the canonical deliverable and MUST NOT duplicate or fork it.

───────────────────────────────────────────────────────────────────────────────
B) Ecology Scope Framing (Central, interdependent, physics → gameplay bridge)

Ecology is a high-interdependence domain:
- It consumes the largest number of independent upstream providers (foundation/morphology/hydrology + any climate proxies + map constants).
- It sits at the nexus of physics-driven world signals and gameplay-driven board setup.

Domain relationship change (explicit planning requirement):
- There is a new domain: Gameplay.
- Gameplay absorbs Placement (Placement dissolves into Gameplay ownership).
- Ecology and Gameplay must be co-designed at the boundary:
  - Ecology may pull from Gameplay surfaces (explicit contracted inputs) at appropriate points.
  - Ecology may still execute some “placement-like” operations, but only with clean boundaries and explicit ownership.
  - Phase 0.5 and Phase 2 must make explicit calls on what belongs in Ecology vs Gameplay and why.

Prime directive (Ecology depth and realism):
- Ecology must be modeled feature-by-feature, resource-by-resource, algorithm-by-algorithm.
- Avoid hand-wavy averaging rules and “single scalar drives everything” shortcuts.
- Prefer chains of effects and compound dynamics (effects building on effects), with clear causality.

Decomposition posture (hard lesson from current Ecology):
- Ecology likely needs the most operations and steps of any domain.
- Fine-grained operational breakdown is expected: small, single-responsibility ops with clear contracts.
- Use steps/stages to orchestrate those ops and to express semantic boundaries between “pure ecology physics” and “gameplay interaction points.”

Narrative/story overlays posture (hard ban for this refactor phase):
- Do not model narrative/story overlays as inputs, outputs, or decision drivers for Ecology.
- Remove both load-bearing and “non-load-bearing” narrative/story overlays from the intended contract surfaces.
- If a signal is needed, replace it with a canonical, domain-anchored artifact (upstream physics) or a Gameplay-owned rule/contract — not a story overlay.

───────────────────────────────────────────────────────────────────────────────
C) Locked invariants to carry into Ecology planning (non-negotiable)

You must follow the locked decisions in `references/implementation-traps-and-locked-decisions.md`. In particular:

- Config semantics contract (locked):
  - Advanced config (schema-defaulted) is the baseline.
  - Knobs apply last as deterministic transforms.
  - Hard ban: “presence detection” or “compare-to-default gating.”
  - Hard ban: post-normalization “if undefined then fallback” defaulting in runtime logic.

- Boundaries and decomposition:
  - Conceptual decomposition ≠ pipeline boundary count.
  - Internal clarity splits are allowed and encouraged until they cause sprawl or boundary-breaking imports/exports.
  - Promote pipeline boundaries only when they earn their keep (interoperability, hooks, stable cross-domain contracts).

- Hard bans (no exceptions):
  - Hidden multipliers / constants / defaults.
  - Placeholders / dead bags (empty directories, empty config bags, placeholder modules).
  - Compat inside the refactored domain (compat, if needed, is downstream-only and explicitly deprecated with removal plan).

- Stage ids are part of the author contract:
  - Prefer semantic stage ids; document braid/interleaving constraints when they exist.

───────────────────────────────────────────────────────────────────────────────
D) Research Prime Directive (Official Civ7 resources + engine contract evidence)

For Ecology, research against official Civ7 resources is a prime directive:
- Do not rely on assumptions about how the engine expects ecology-like outputs.
- Use official JS map scripts and XML data to identify:
  - engine-required inputs/outputs and timing expectations
  - canonical constants/parameters
  - start-bias and placement heuristics that must be accounted for somewhere (Ecology vs Gameplay)

If official resources are not present in this checkout, DO NOT generate or fetch them in this non-implementation run.
Instead, record the missing evidence in Phase 0.5 and ask the project owner to populate the official resources directory.

Evidence standard:
- Phase 1 claims MUST be evidence-based (code citations + doc references). No speculation presented as fact.
- Phase 2 modeling claims can be theory-driven, but must label assumptions and cite motivating evidence/research.
- Every deliverable must include a References section (repo paths, doc paths, and external sources).

───────────────────────────────────────────────────────────────────────────────
E) Phase Deliverables (Do exactly what the phase reference requires)

Phase 0.5 — Greenfield pre-work spike (required before Phase 1 and Phase 2):
- Deep research pass (repo + docs + official resources (if available) + web) BEFORE writing.
- Design Ecology from first principles: physics-derived signals → living-world model → gameplay-facing products.
- Explicitly define ownership boundaries:
  - Ecology vs Morphology vs Hydrology vs Foundation
  - Ecology vs Gameplay (including Placement absorption)
- Inventory and define the minimal stable “public” Ecology artifacts that downstream consumers need:
  - What Gameplay should consume as stable contracts (and what stays internal).
- Explicitly call out where Ecology should pull from Gameplay (contracted inputs) vs where Ecology remains physics-only.
- Treat narrative/story overlays as explicitly banned; inventory and remove/replace any legacy overlay dependencies with canonical, domain-anchored contracts instead.
- Append Lookback 0.5.

Phase 1 — Current-state spike (evidence only; no redesign):
- Produce required inventory artifacts:
  - Domain inventory (steps/ops/artifacts/configs)
  - Current contract matrix
  - Legacy surface inventory
  - Upstream intake scan (what Ecology consumes today)
  - Downstream consumer inventory (who consumes Ecology today; how)
  - Producer/consumer map
- Explicitly inventory current “monolithic op/step” hotspots and where decomposition is insufficient.
- Explicitly inventory narrative/story artifacts or overlays that influence Ecology behavior today as legacy dependencies to be removed/replaced.
- Explicitly inventory hidden multipliers/constants/defaults and placeholders/dead bags as “must delete / must surface” risks.
- Inventory current Placement coupling points and classify them:
  - belongs in Gameplay
  - remains in Ecology
  - requires a new boundary contract between them
- Append Lookback 1.

Phase 2 — Modeling spike (model-first; must iterate twice; no slice plan):
- Start from Phase 0.5, refine using Phase 1 evidence.
- Lock authoritative model, causality spine, and canonical contract surfaces.
- Iterate the modeling loop at least twice until stable.
- Explicitly model Ecology as:
  - an operation catalog (single responsibility ops),
  - orchestrated into steps/stages that express semantic boundaries (including gameplay interaction points).
- Make algorithmic depth explicit:
  - For each major feature/resource family, define the inputs consumed, the reasoning signal derived, and the artifact(s) produced.
  - Ground the model in official Civ7 data/scripts (interop constraints) and earth-physics/ecology references (algorithm options).
- Make the “knobs-last” composition contract explicit (and identify guardrails/tests).
- Name pipeline stages semantically; document braid/interleaving constraints if they exist.
- Do not use narrative/story overlays as modeled inputs/outputs surfaces.
- Append Lookback 2.

Phase 3 — Implementation plan + slice plan (no model content):
- Produce an executable issue document (the handoff) under:
  - docs/projects/engine-refactor-v1/issues/LOCAL-TBD-ecology-vertical-domain-refactor.md (or milestone-scoped variant)
- The issue must include:
  - locked decisions/bans with guardrails
  - config semantics references (Phase 2 table + default/empty/determinism policies)
  - step/operation decomposition plan derived from the causality spine
  - clear staging plan for physics-only ecology vs gameplay interaction points
  - consumer migration matrix (break/fix per slice), including Gameplay boundary creation/migration
  - explicit deletion/cleanup plan (no compat inside Ecology; no dead bags; no placeholders)
- Each slice must be end-to-end and pipeline-green:
  - migrations + deletions + docs/tests + guardrails + explicit cleanup/removals
- Consumer migration must be contract-driven:
  - consume canonical artifacts, not narrative/story overlays or hidden globals.
- Stop at the pre-implementation checkpoint (issue doc is the handoff).

Drift protocol:
- If a locked decision changes mid-flight: STOP, re-baseline gates in the Phase 3 issue, and plan a guardrail in the same slice that introduces the decision.
</non_implementation_prompt>
