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

Canonical Morphology Phase 2 model (authoritative; do not reinterpret; Phase 2 + Phase 3 anchor):
- resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md
- resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md
- resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md
- resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md (Phase 2 deliverable index; may contain drafts/notes — if it conflicts, the spec files win)

Legacy background context (may be outdated vs the current architecture; use only for historical meaning):
- docs/system/libs/mapgen/morphology.md

Morphology prior art / existing bones (IMPORTANT posture):
- Morphology has already been refactored once.
- That refactor is NOT to current standards; treat this pass as a greenfield re-think “from the ground up.”
- Use the existing code/structure as evidence and a starting point for investigation, not as a constraint on the model.
- These are templates/seeds only; they are NOT authoritative.
- If a prior-art file has the same name/path as a required deliverable, your output MUST overwrite/supersede it.
- Prior art locations:
  - resources/workflow/domain-refactor/plans/morphology/MORPHOLOGY.md
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
- resources/workflow/domain-refactor/prompts/MORPHOLOGY-CONTEXT.md

MILESTONE:
- The milestone identifier is TBD (confirm with the project owner before starting Phase 3).
- All Phase 3 issues must use `issues/LOCAL-TBD-<milestone>-morphology-*.md`.

Canonical artifacts you must produce (ALL live under the Morphology domain plan directory; no top-level spike dir):
- resources/workflow/domain-refactor/plans/morphology/spike-morphology-greenfield-gpt.md
- resources/workflow/domain-refactor/plans/morphology/spike-morphology-current-state-gpt.md
- resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md
- resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md
- resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md
- resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md
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
  - narrative/story overlays: explicitly forbidden and actively in scope to remove from any Morphology-related processing

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
- Narrative/story overlays must be removed from Morphology and from anything that can influence Morphology outputs (even indirectly).
- Do not model narrative/story overlays as Morphology inputs/outputs, and do not introduce new overlay-like concepts under different names.
- If any existing artifacts/steps are “load-bearing narrative/story/overlays,” they must be replaced by canonical domain-anchored Morphology constructs.
- Remove even “non-load-bearing” narrative overlays: they create confusion and accidental coupling.

Hard rule: engine/projection truth is derived-only (never an input).
- Engine-facing projections (terrain indices, adjacency masks, engine tags) must be derived from Morphology outputs.
- Morphology must not read engine-projected surfaces back in as “truth” (this inverts the contract and poisons downstream correctness).
- Projections/indices are Gameplay-owned derived artifacts:
  - Terrain IDs, feature IDs, resource IDs, player IDs, region IDs, plot tags, placements, and other game-facing indices belong to Gameplay (projection policy), not to Morphology (physics truth).
  - Physics domains must not embed engine IDs or adapter coupling inside physics truth artifacts as “the truth.” Tile indexing (`tileIndex`) is allowed in truth artifacts; the prohibition is on engine/game-facing ids and on consuming map-layer projections/materialization:
    - Physics steps MUST NOT `require`/consume `artifact:map.*`.
    - Physics steps MUST NOT `require`/consume `effect:map.*`.
- Canonical map projection surfaces and stamping guarantees:
  - Projection artifacts are `artifact:map.*` (Gameplay-owned).
  - Stamping completion is represented by boolean effects like `effect:map.<thing><Verb>` (e.g., `effect:map.mountainsPlotted`), emitted by the stamping step.
    - Convention: `<Verb> = Plotted` (short verbs only).
    - Hard ban: no receipts/hashes/versions; the effect is boolean only.
  - Hard ban: no `artifact:map.realized.*` namespace, and do not invent a runtime “map.realized” concept.
    - Observability/debug layers belong under explicit `artifact:map.*` names (Gameplay-owned), not a “realized snapshot” namespace.
  - TerrainBuilder no-drift (do not re-open):
    - `TerrainBuilder.buildElevation()` produces engine-derived elevation/cliffs; there is no setter.
    - Any decision that must match *actual Civ7* elevation bands / cliff crossings belongs in Gameplay/map logic after `effect:map.elevationBuilt` and may read engine surfaces.
    - Physics may publish complementary signals (slope/roughness/relief/etc.) but MUST NOT claim “Civ7 cliffs” as Physics truth.
- Engine writes (“stamping”) happen only in steps with an engine adapter:
  - Core domain logic is pure-only; recipe stages/steps invoke physics ops to compute truths, invoke Gameplay ops to project truths into indices, then stamp via the adapter.

Topology lock (non-negotiable invariant):
- Civ7 maps are a cylinder: `wrapX = true` always; `wrapY = false` always.
- There is no environment/config/knob that can change wrap behavior; wrap flags must not appear as input contract fields.

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
- No shims or compat layers are allowed as a refactor technique. If a consumer blocks deletion, the slice must include the migration and the deletion (pipeline-green, no dual paths).

Compat posture (non-negotiable invariant):
- Compat is forbidden as a design pattern (inside or outside the refactored domain). Do not introduce “temporary” shims that survive beyond the slice.

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
- Treat narrative/story overlays as explicitly banned; inventory and remove/replace any legacy overlay dependencies with canonical domain-anchored Morphology contracts instead.
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
- Include conceptual writeup + diagrams:
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
