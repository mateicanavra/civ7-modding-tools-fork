<non_implementation_prompt>
You are preparing the Morphology domain vertical refactor for implementation in the Civ7 MapGen refactor project.

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
- docs/system/libs/mapgen/morphology.md

Morphology prior art / existing bones (IMPORTANT posture):
- Morphology has already been refactored once.
- That refactor is NOT to current standards; treat this pass as a greenfield re-think “from the ground up.”
- Use the existing code/structure as evidence and a starting point for investigation, not as a constraint on the model.
- Prior art locations (archived v1 planning artifacts; for reference only):
  - resources/workflow/domain-refactor/plans/morphology/_archive/v1/MORPHOLOGY.md
  - resources/workflow/domain-refactor/plans/morphology/_archive/v1/spike-morphology-current-state.md
  - resources/workflow/domain-refactor/plans/morphology/_archive/v1/spike-morphology-modeling.md
  - docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-morphology-vertical-domain-refactor.md
- Primary code “bones” to inspect (evidence only; not authoritative):
  - mods/mod-swooper-maps/src/domain/morphology/
  - mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/
  - mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/
  - mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/

Additional context (non-authoritative; read after the workflow docs):
- resources/workflow/domain-refactor/plans/morphology/context-morphology-hydrology-handoff.md

MILESTONE:
- The milestone identifier is TBD (confirm with the project owner before starting Phase 3).
- All Phase 3 issues must use `issues/LOCAL-TBD-<milestone>-morphology-*.md`.

Canonical artifacts you must produce (ALL live under the Morphology domain plan directory; no top-level spike dir):
- resources/workflow/domain-refactor/plans/morphology/spike-morphology-greenfield.md
- resources/workflow/domain-refactor/plans/morphology/spike-morphology-current-state.md
- resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling.md
- docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-morphology-*.md
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
- No phase bleed:
  - Phase 0.5 is greenfield-only.
  - Phase 1 is current-state-only (evidence; no redesign).
  - Phase 2 is modeling-only (authoritative model; NO slice plan).
  - Phase 3 is planning-only (slice plan; NO model changes).

Authority model:
- This prompt is a wrapper + execution posture, not the spec itself.
- Canonical workflow + locked decisions live in the workflow docs above.
- Morphology-specific deliverables live in `resources/workflow/domain-refactor/plans/morphology/`.
- SINGLE CANONICAL BODY PER DELIVERABLE (hard rule):
  - If you need supporting notes, they must point to the canonical deliverable and MUST NOT duplicate or fork it.

───────────────────────────────────────────────────────────────────────────────
B) Morphology Scope Framing (Greenfield posture with existing bones)

This is a greenfield re-design pass:
- Do NOT treat the existing Morphology stage layout, ops, config, or contracts as “the target.”
- It is acceptable (and expected, if needed) to change upstream producers and downstream consumers to achieve the ideal Morphology design.
- Convergence with the current implementation is allowed, but NOT required.

Morphology responsibility posture (domain-only; no algorithm prescriptions):
- Morphology owns canonical “shape truth” of the world:
  - land/ocean boundary, elevation/relief structure, coastal geometry
  - mountain systems, islands, volcanics, and other large-scale form signals as Morphology-owned outputs
- Morphology does NOT own:
  - climate (winds/rainfall/temperature), hydrology discharge/routing, biome/ecology classification
  - resource/feature placement, gameplay siting/assignment logic
  - narrative/story thumb-on-scale overlays

Focus areas (must be treated as full-lifecycle responsibilities, not one-off steps):
- Mountains
- Volcanoes
- Islands
- Coastlines

Do not prescribe algorithms in this prompt; the pre-work and modeling must explore options before committing.

Boundary posture (hard-won lessons to lock):
- Public vs internal is intentional:
  - Only promote stable cross-domain contracts as outputs.
  - Keep unstable intermediates internal; document that they are internal and why.
- Conceptual decomposition ≠ pipeline boundary count:
  - Use internal clarity splits freely, but only promote boundaries when they “earn their keep” (contracts, interoperability, hooks).
- Stage ids are part of the author contract:
  - Prefer semantic stage ids where feasible; avoid meaningless “pre/core/post” naming in final docs unless unavoidable.
  - If braid/interleaving forces stages, document the constraint.

───────────────────────────────────────────────────────────────────────────────
C) Non-Negotiable Constraints (Locked)

Treat the workflow reference docs as the authoritative list of locked decisions and traps.
In this prompt, you must apply the high-level constraints below exactly as “hard rules.”

Hard ban: narrative/story overlays (legacy concept).
- Do not model narrative/story overlays in Morphology in this refactor phase.
- If any existing artifacts/steps are “load-bearing narrative/story/overlays,” they must be replaced by canonical domain-anchored Morphology constructs.
- Remove even “non-load-bearing” narrative overlays: they create confusion and accidental coupling.

Hard rule: engine/projection truth is derived-only (never an input).
- Engine-facing projections (terrain indices, adjacency masks, engine tags) must be derived from Morphology outputs.
- Morphology must not read engine-projected surfaces back in as “truth” (this inverts the contract and poisons downstream correctness).

Hard ban: presence / compare-to-default gating for knobs/config.
- Knobs + advanced config must compose as a single locked contract (knobs apply last as transforms).
- Do not infer author intent via presence detection after schema defaulting.
- Do not smuggle semantics via post-normalization fallback:
  - after schema validation/defaulting + normalization, run code must not “if undefined then fallback” into hidden behavior.

Hard ban: hidden multipliers/constants/defaults.
- No magic numbers, no silent fallbacks, no unnamed scaling factors in compile/normalize/run paths.
- Every such value is either author-facing config, or an explicitly named constant with explicit intent.

Hard ban: placeholders / dead bags.
- No placeholder directories/modules/bags.
- Phase 3 must explicitly plan removal of all temporary shims/compat introduced during implementation.

Compat posture (non-negotiable invariant):
- Compat is forbidden inside the refactored Morphology domain.
- Compat may exist ONLY downstream as explicitly deprecated shims with removal triggers and a planned deletion slice.

Determinism & purity posture (contract expectation; keep details in workflow refs):
- Prefer passing determinism inputs across boundaries as data (seeds/inputs), not as runtime RNG objects/functions.
- Keep domain ops data-pure; steps own runtime binding and pipeline context.

Execution posture (hard-won lesson):
- Plan and model in a way that makes Phase 3 slices end-to-end and pipeline-green.
- Stop-the-line if a locked decision is threatened: re-baseline gates and add a guardrail in the same slice that introduces the decision change.

───────────────────────────────────────────────────────────────────────────────
D) Required Resources and Evidence Standard

You must use:
- Repo (read-only): search and cite actual code locations and contracts (paths + step IDs + artifact keys).
- In-repo architecture/workflow docs listed above.
- Web research: use when it improves earth-physics modeling or clarifies algorithm options; cite key sources.
- Any attached docs provided in the project context.

Evidence standard:
- Phase 1 claims MUST be evidence-based (code citations + doc references). No speculation presented as fact.
- Phase 2 modeling claims can be theory-driven, but must clearly label assumptions and point to motivating evidence/research.
- Every deliverable must include:
  - References used (repo paths, doc paths, external URLs/papers).
  - Supersedes vs complements notes for internal prior docs (prior art templates are superseded).

───────────────────────────────────────────────────────────────────────────────
E) Phase Deliverables (Do exactly what the phase reference requires)

Phase 0.5 — Greenfield pre-work spike (required before Phase 1 and Phase 2):
- Deep research pass (repo + docs + web) BEFORE writing.
- Design Morphology from earth-physics first, not from current code layout.
- Deep dive what Morphology actually owns vs neighbors:
  - Mountains / volcanoes / islands / coastlines (full lifecycle)
  - Identify what belongs upstream (e.g., Foundation tectonics) vs downstream (e.g., Ecology consumption, Gameplay projections).
- Explore algorithm/dynamics options without committing prematurely:
  - Treat this as “catalog options + define evaluation criteria,” not as selecting a final implementation.
- Upstream diff:
  - What upstream provides today vs what ideal Morphology needs;
  - List change-candidates for upstream domains later.
- Downstream diff:
  - What Morphology should provide and how it unlocks downstream;
  - List downstream change-candidates.
- Make an explicit early call on public vs internal surfaces.
- Treat narrative/story overlays as out-of-scope; model canonical domain-anchored equivalents instead.
- Append Lookback 0.5.

Phase 1 — Current-state spike (evidence only; no redesign):
- Produce required inventory artifacts:
  - Domain inventory (steps/ops/artifacts/configs)
  - Current contract matrix
  - Legacy surface inventory
  - Upstream intake scan
  - Downstream consumer inventory
  - Producer/consumer map
- Explicitly inventory narrative overlays/story artifacts as legacy dependencies to be removed/replaced.
- Explicitly inventory hidden multipliers/constants/defaults and placeholders/dead bags as “must delete / must surface” risks.
- Include “greenfield delta notes” describing what constrains or contradicts Phase 0.5.
- Append Lookback 1.

Phase 2 — Modeling spike (model-first; must iterate twice; no slice plan):
- Start from Phase 0.5, refine using Phase 1 evidence.
- Lock authoritative model, causality spine, and canonical contract surfaces.
- Iterate the modeling loop at least twice until stable.
- Include conceptual narrative + diagrams:
  - Architecture view
  - Data flow diagram
  - Producer/consumer map: current vs target
- Add Config Semantics Table for semantic knobs (lists/pairs/weights/modes):
  - meaning
  - missing vs explicit default policy
  - empty/null behavior
  - determinism expectations
  - tests that will lock non-trivial semantics during implementation
- Make the “knobs-last” composition contract explicit (and identify guardrails/tests).
- Name pipeline stages semantically; document braid/interleaving constraints if they exist.
- Do not use narrative/story overlays as modeled inputs/outputs surfaces.
- Append Lookback 2.

Phase 3 — Implementation plan + slice plan (no model content):
- Produce an executable issue document (the handoff) under:
  - docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-morphology-*.md
- The issue must include:
  - locked decisions/bans with guardrails
  - config semantics references (Phase 2 table + default/empty/determinism policies)
  - stable fix anchors (prefer “config → normalized internal form” and explicit boundary locations)
  - step decomposition plan derived from causality spine
  - consumer migration matrix (break/fix per slice)
  - upstream and downstream changes required by the model and assigned to slices
- Each slice must be end-to-end and pipeline-green:
  - migrations + deletions + docs/tests + guardrails + explicit cleanup/removals
- Consumer migration must be contract-driven:
  - consume canonical Morphology artifacts, not narrative/story overlays or hidden globals.
- Stop at the pre-implementation checkpoint (issue doc is the handoff).

Drift protocol:
- If a locked decision changes mid-flight: STOP, re-baseline gates in the Phase 3 issue, and plan a guardrail in the same slice that introduces the decision.

───────────────────────────────────────────────────────────────────────────────
F) Morphology-Specific Framing (What to emphasize in outputs)

Your Phase 0.5 and Phase 2 deliverables must make it explicit that:
- Morphology is being re-modeled greenfield, even if it reuses some existing implementation “bones.”
- The goal is the ideal canonical Morphology layer for downstream consumers:
  - deep, flexible, robust, and easy to author on top of.
- It is acceptable to recommend upstream/downstream changes if they unlock the canonical Morphology design.

Your Phase 1 and Phase 3 deliverables must treat “legacy/brittle” Morphology behaviors as deletion candidates:
- Prioritize explicit identification and removal planning for:
  - narrative/story overlay coupling
  - hidden constants/defaults
  - placeholder/dead contract bags
</non_implementation_prompt>
