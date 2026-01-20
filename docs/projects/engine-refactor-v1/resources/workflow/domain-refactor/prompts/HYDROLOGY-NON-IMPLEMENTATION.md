<non_implementation_prompt>
You are preparing the Hydrology domain vertical refactor for implementation in the Civ7 MapGen refactor project.

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

Hydrology prior art / drafts (IMPORTANT posture):
- These are templates/seeds only; they are NOT authoritative.
- If a prior-art file has the same name/path as a required deliverable, your output MUST overwrite/supersede it.
- Treat your research + the canonical workflow docs as dominant; prior art cannot constrain the model.
- Prior art locations:
  - resources/workflow/domain-refactor/plans/hydrology/HYDROLOGY.md
  - resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-current-state.md
  - resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling.md

MILESTONE:
- The milestone identifier is **m9**.
- All Phase 3 issues must use `issues/LOCAL-TBD-m9-hydrology-*.md`.

Canonical artifacts you must produce (ALL live under the Hydrology domain plan directory; no top-level spike dir):
- resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-greenfield.md
- resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-current-state.md
- resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling.md
- docs/projects/engine-refactor-v1/issues/LOCAL-TBD-m9-hydrology-*.md
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
- Hydrology-specific deliverables live in `resources/workflow/domain-refactor/plans/hydrology/`.
- SINGLE CANONICAL BODY PER DELIVERABLE (hard rule):
  - If you need supporting notes, they must point to the canonical deliverable and MUST NOT duplicate or fork it.

───────────────────────────────────────────────────────────────────────────────
B) Hydrology Scope Framing (Canonical + Domain-ownership posture)

Hydrology is a single umbrella domain, but contains explicit internal subdomains (do NOT flatten):
- Oceanography (currents, SST, sea ice)
- Climatology (atmosphere: circulation, winds, moisture transport, precipitation)
- Cryosphere (snow/ice + albedo feedback)
- Surface Hydrology (routing: rivers/lakes/wetness)

Multiple sequential stages are allowed (e.g., hydrology-pre/core/post) as long as they remain Hydrology-owned.
If you genuinely believe a subdomain should become top-level someday, mention it ONLY as a non-blocking note at the end of Phase 2. Do not restructure the work around it.

Boundary posture (hard-won lesson to lock):
- Public vs internal is intentional:
  - Only promote stable cross-domain contracts as outputs.
  - Keep unstable intermediates internal; document that they are internal and why.
- Conceptual decomposition ≠ pipeline boundary count:
  - Use internal clarity splits freely, but only promote boundaries when they “earn their keep” (contracts, interoperability, hooks).
- Stage ids are part of the author contract:
  - Prefer semantic stage ids where feasible; avoid meaningless “pre/core/post” naming in final docs unless unavoidable.
  - If braid/interleaving forces stages, document the constraint.

───────────────────────────────────────────────────────────────────────────────
C) Core Intent (Do not compromise)

This refactor must be physics-driven, deterministic, and derivative:
- All Hydrology outputs must be explainable as consequences of physical mechanisms.
- Remove all “thumb-on-scale” behavior inside Hydrology:
  - No story-painted rivers, no authored regional overrides, no hardcoded climate outcomes, no hidden globals.
- The ONLY acceptable author surface inside Hydrology is semantic knobs:
  - Knobs are a simplified public schema that normalizes deterministically into a richer internal config.
  - Knobs apply last as deterministic transforms. Ban “presence/compare-to-default gating.”
- Hard ban: narrative overlays / story artifacts as Hydrology inputs or outputs:
  - Hydrology must not model, depend on, or introduce narrative overlays.
  - If such overlays exist in current state, Phase 1 must inventory them as legacy dependencies.
  - Phase 2 must model canonical domain-anchored replacements (physics-based equivalents) and Phase 3 must plan removal.
- Reject lazy shortcuts:
  - Latitude is allowed as an input to insolation / baseline climate, but it cannot be the sole driver.
  - Climate modeling must incorporate: atmospheric circulation + jet streams, ocean currents + SST effects, orographic lift + rain shadows, cryosphere/albedo feedback, and spatial/seasonal variability (at least as equilibrium proxies).

Determinism posture:
- Same seed + same config => same outputs.
- Any randomness must be explicit, seeded, and documented.
- Hard ban: hidden multipliers/constants/defaults.
  - Any behavior-shaping number must be:
    - An authored knob/config, OR
    - A named constant with explicit intent and justification, referenced in docs.
- Hard ban: placeholders / dead bags.
  - No shims or compat layers are allowed as a refactor technique. If a consumer blocks deletion, the slice must include the migration and the deletion (pipeline-green, no dual paths).
  - Do not introduce placeholder directories/modules/bags.

Compat posture (non-negotiable invariant):
- Compat/shims are forbidden as a refactor technique (inside or outside the domain). Do not introduce deprecated downstream shims; migrate consumers and delete in-slice.
- Projections never define internal representation.

Execution posture (hard-won lesson):
- Plan and model in a way that makes Phase 3 slices end-to-end and pipeline-green.
- Stop-the-line if a locked decision is threatened: re-baseline gates and add a guardrail in the same slice that introduces the decision change.

───────────────────────────────────────────────────────────────────────────────
D) Required Resources and Evidence Standard

You must use:
- Repo (read-only): search and cite actual code locations and contracts (paths + step IDs + artifact keys).
- In-repo architecture/workflow docs listed above.
- Web research: use when it improves earth-physics model or clarifies algorithm options; cite key sources.
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
- Design Hydrology from earth-physics first, not from current code layout.
- Define ownership boundaries (Hydrology vs Morphology vs Ecology vs Placement/Narrative).
- Define subdomains and their causality spine.
- Upstream diff:
  - What upstream provides today vs what ideal Hydrology needs;
  - List change-candidates for upstream domains later.
- Downstream diff:
  - What Hydrology should provide and how it unlocks downstream;
  - List downstream change-candidates.
- Make an explicit early call on public vs internal surfaces.
- Treat narrative overlays as out-of-scope; model canonical domain-anchored equivalents instead.
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
- Do not use narrative overlays as modeled inputs/outputs surfaces.
- Append Lookback 2.

Phase 3 — Implementation plan + slice plan (no model content):
- Produce an executable issue document (the handoff) under:
  - docs/projects/engine-refactor-v1/issues/LOCAL-TBD-m9-hydrology-*.md
- The issue must include:
  - locked decisions/bans with guardrails
  - config semantics references (Phase 2 table + default/empty/determinism policies)
  - stable fix anchors (prefer “config → normalized internal form” and explicit boundary locations)
  - step decomposition plan derived from causality spine
  - consumer migration matrix (break/fix per slice)
  - downstream changes required by the model and assigned to slices
- Each slice must be end-to-end and pipeline-green:
  - migrations + deletions + docs/tests + guardrails + explicit cleanup/removals
- Consumer migration must be contract-driven:
  - consume canonical Hydrology artifacts, not narrative overlays or hidden globals.
- Stop at the pre-implementation checkpoint (issue doc is the handoff).

Drift protocol:
- If a locked decision changes mid-flight: STOP, re-baseline gates in the Phase 3 issue, and plan a guardrail in the same slice that introduces the decision.

───────────────────────────────────────────────────────────────────────────────
F) Hydrology-Specific Non-Negotiable Outputs (Concrete)

Hydrology must ultimately provide deterministic, physics-based outputs that downstream can consume:
- Climate signals (temperature, precipitation/rainfall, winds, aridity/dryness, freeze/snow/ice indicators).
- Surface hydrology products (rivers, lakes, wetness/floodplain indicators).
- Explicit support for Civ7 gameplay constraints where relevant (e.g., minor vs navigable river distinction), but gameplay must not steer Hydrology’s internal model.

───────────────────────────────────────────────────────────────────────────────
G) Output behavior per turn

When asked to execute a phase:
- Return a single complete canonical markdown document body in-chat for the phase deliverable.
- Also write the same content to a .md file and provide a download link if possible.
- Include references + supersedes/complements notes (prior art templates are superseded/overwritten).
- Stop after the required Lookback section.

Do not start Phase 0.5 unless the user explicitly instructs you to begin.
</non_implementation_prompt>
