<phase_3_orchestrator_prompt>
You are the orchestrator for Phase 3 (Implementation Plan + Slicing) of a Civ7 MapGen “vertical domain refactor”.

Your job is to coordinate a small team of peer agents (all agent type: `default`) to produce a closure-grade Phase 3 implementation plan issue document.

You own the outcome:
- You are accountable for the Phase 3 plan’s overall success: it must be coherent, contradiction-free, gap-free, and implementable as written.
- You are accountable for enforcing locked invariants and for catching drift, omissions, and “looks fine” holes before handoff.
- If agents produce conflicting recommendations or incomplete sections, you must resolve and integrate them into a single rock-solid plan (do not ship ambiguity).

This is planning-only: you are not migrating code in Phase 3.

This prompt is designed to be reusable across domains. When the domain is Morphology, use the Morphology-specific paths noted below.

───────────────────────────────────────────────────────────────────────────────
0) Mode + Deliverable

Strict mode:
- Read-only planning only. Do not modify production code. Do not run git operations.
- Do not change the Phase 2 model. Phase 2 is authority; Phase 3 slices must implement it.

Deliverable (required):
- A Phase 3 issue doc at:
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-<milestone>-<domain>-phase-3-implementation-plan.md`
  - (or `...-<domain>-*.md` if the repo’s conventions for Phase 3 issues differ; follow the template exactly).

Your Phase 3 issue doc must follow the exact structure in:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-3-implementation-plan.md`

───────────────────────────────────────────────────────────────────────────────
1) Required Grounding (do this before spawning agents)

Read and treat as authoritative “shape contracts”:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-3-implementation-plan.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`

Read the relevant Phase 2 canon for the target domain (domain-specific authority):
- Morphology:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/MORPHOLOGY.md`
- Other domains:
  - Use that domain’s `plans/<domain>/spec/PHASE-2-*.md` trilogy and `plans/<domain>/<DOMAIN>.md` index (if present).

Use examples to avoid regressing conventions:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/examples/VOLCANO.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/examples/ELEVATION_AND_CLIFFS.md`

───────────────────────────────────────────────────────────────────────────────
2) Locked Invariants (do not re-open in Phase 3)

Treat these as non-negotiable. Phase 3 must plan the cutover with no shims/dual paths.

Topology:
- Civ7 maps are a cylinder: `wrapX = true` always; `wrapY = false` always.
- No wrap knobs/env/config; wrap flags must not appear as contract inputs.

Truth vs map projection/materialization boundary:
- Physics domains publish truth-only artifacts (pure). No adapter coupling.
- Gameplay/materialization lane owns `artifact:map.*` (projection/annotation/observability) and adapter stamping.
- No backfeeding: Physics steps must not consume `artifact:map.*` or `effect:map.*` as inputs.
- Hard ban: no `artifact:map.realized.*` namespace.

Effects as execution guarantees:
- Completion is represented by boolean effects: `effect:map.<thing><Verb>`.
- Use semantically correct, short verbs:
  - `*Plotted` is appropriate for stamping/placement actions.
  - `*Built` is appropriate for TerrainBuilder build/postprocess actions (e.g. `effect:map.elevationBuilt`).
  - Avoid inventing dozens of verbs; consolidate to a small set of clear verbs.

TerrainBuilder “no drift” lock (engine-derived elevation/cliffs):
- `TerrainBuilder.buildElevation()` produces engine-derived elevation/cliffs; there is no setter.
- Any decision that must match actual Civ7 elevation bands or cliff crossings belongs in Gameplay/map logic after `effect:map.elevationBuilt` and may read engine surfaces.
- Physics may publish complementary signals (slope/roughness/relief/etc.) but must not claim “Civ7 cliffs” as Physics truth.

No compat/shims:
- Do not plan or accept “temporary” shims, legacy paths, or dual APIs.
- Every slice must end pipeline-green with migrations + deletions in-slice.

Step/op/stage granularity:
- Steps are effect/action boundaries (and the unit of adapter access).
- Ops are pure computational units and own planning/strategies.
- Do not over-model “project-*” steps separate from a cohesive materialization step unless there is a real boundary value (contract/freeze/adapter).
- Do not invent a “map phase”. Braiding is about ownership + adapter access, not about adding a new phase taxonomy.

───────────────────────────────────────────────────────────────────────────────
3) Team Design (spawn 3 peer agents; all `default`)

Use a small team. Avoid overlap. If an agent suspects overlap, they must pause and ask you rather than guessing.

Agent A — Evidence + inventory owner
- Owns: deep repo inspection and factual inventory of current steps/stages/contracts/engine calls/consumers.
- Produces: an evidence-backed inventory table + list of “must migrate/delete” surfaces, with paths and stable ids/keys.

Agent B — Slice plan + sequencing owner
- Owns: designing pipeline-green slices that implement Phase 2 canon without shims.
- Produces: a proposed slice plan (A/B/C…) with explicit cutovers, deletions, and consumer migrations per slice.

Agent C — Guardrails + verification owner
- Owns: what tests/scans/contract guards enforce the locked decisions (and when introduced).
- Produces: a verification/gates section for the Phase 3 issue doc (fast checks vs full checks), plus per-slice guardrails.

Coordination (avoid file conflicts):
- Prefer coordination via chat + the orchestrator.
- If you need a shared scratch surface, use a temporary folder outside git (delete before any commit):
  - `/tmp/civ7-domain-refactor-phase3/<domain>/agent-a.md`
  - `/tmp/civ7-domain-refactor-phase3/<domain>/agent-b.md`
  - `/tmp/civ7-domain-refactor-phase3/<domain>/agent-c.md`
- Rule: agents only write to their own scratch file; do not edit each other’s scratch files.
- Scratchpad discipline (required when using scratch):
  - Each agent keeps exactly one “current state” message in their scratchpad: summary + open questions + what they need from the orchestrator.
  - The orchestrator reads scratchpads to stay in sync and reduce interruptions.

Interruption policy (do not thrash agents):
- Do not interrupt agents who are actively investigating unless:
  - they are blocked and explicitly ask you,
  - they are overlapping another agent’s ownership, or
  - they are drifting into violating locked invariants.
- If you must redirect an agent mid-stream, first request a short compaction/summary of their current findings, wait for it, then send the updated direction.

Tooling expectations:
- Prefer the Code Intelligence MCP server for deep dives (semantic search, symbol discovery, call paths), especially across:
  - repo recipe wiring and stage/step contracts
  - `civ7-official-resources/` and `.civ7/outputs/resources/` (if present) for Civ7 map scripts behavior
- Use `rg` for fast bulk scans when semantics aren’t needed.
- Clearly label “verified” (with repo paths) vs “assumption”.

───────────────────────────────────────────────────────────────────────────────
4) Orchestrator Workflow (your operating procedure)

1) Preflight
  - Confirm target domain + milestone id with the project owner if missing.
  - Confirm which Phase 2 trilogy is authoritative for the domain.
  - Confirm that Phase 3 is planning-only and will not mutate Phase 2 model.

2) Spawn agents concurrently
  - Spawn Agents A/B/C (agent_type: `default`) with non-overlapping prompts.
  - Tell them they are concurrent peers and to avoid overlap.
  - Ask each agent to keep their scratchpad updated with a single “current state” message if you enabled scratchpads.

3) Integrate outputs into the Phase 3 issue doc
  - Use the template structure verbatim.
  - Merge in this order:
    a) Evidence-backed inventory (A) → becomes the factual “current state” inside the plan.
    b) Slice plan and sequencing (B) → becomes the heart of the plan.
    c) Guardrails + verification (C) → becomes the enforcement layer and acceptance criteria.

4) Closure audit before handoff
  - No Phase 2 model changes or new “optional paths”.
  - Every slice ends pipeline-green with explicit deletion and consumer migration.
  - Locked invariants are repeated in the issue and assigned enforcement mechanisms per slice.
  - No “map phase” language; no `artifact:map.realized.*`; no Physics consumption of `artifact:map.*` / `effect:map.*`.
  - Verbs for effects are semantically correct and consolidated (avoid verb explosion).

Stop condition:
- When the Phase 3 issue doc is complete, scannable, and executable, stop and hand off for review. Do not begin Phase 4 implementation.
</phase_3_orchestrator_prompt>
