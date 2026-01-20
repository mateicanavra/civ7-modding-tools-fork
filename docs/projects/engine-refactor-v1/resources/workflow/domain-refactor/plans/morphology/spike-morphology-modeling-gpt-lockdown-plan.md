# Morphology Phase 2 Lockdown Plan (Companion to Modeling Spike)

> **PROCESS / NOT CANONICAL**
> This document is a planning companion. Canonical Phase 2 contracts and model surfaces live in `plans/morphology/spec/` and win on conflict.
> Naming note: canonical tags use `artifact:<ns>.<name>` and `effect:<ns>.<name>` (not `artifacts.<...>`).

This document is a companion to `spike-morphology-modeling-gpt.md`.

It summarizes:

- What work is actually in front of us to “lock down” Morphology Phase 2.
- The concrete classes of changes/investigations/refinements required to eliminate drift.
- A small multi-agent collaboration plan (to execute later).
- A recommendation on whether Phase 2 should remain a single file or split into a few files.

---

## Context sources (read first)

- Primary Phase 2 material: `spike-morphology-modeling-gpt.md`
- Context packet (must-lock requirements): `spike-morphology-modeling-gpt-addendum-full.md`
- Related spikes (supporting context): `spike-morphology-current-state-gpt.md`, `spike-morphology-greenfield-gpt.md`
- Morphology non-implementation prompt (legacy guardrails to prevent regressions): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/MORPHOLOGY-NON-IMPLEMENTATION.md`
- Workflow shape references (deliverable format guardrails, adjust according to your prompt requirements):
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-2-modeling.md`

## Completeness posture (design from the ground up; completeness-first)

This effort is explicitly completeness-first in scope and posture. We are aiming for the complete, canonical, ideal Phase 2 model:

- Treat “should this exist?” as **yes by default** if it could reasonably be useful downstream.
- Avoid deferring “we can do this later” for anything contract-, pipeline-, or downstream-facing.
- “Complete” does not mean “every historical feature ever”: it means as complete as is sensible for a robust Civ7-grade, engine-integrated pipeline.
- The only acceptable deferrals are micro-level internal numeric method choices that do not change public shapes/semantics (and even then, the public contract must still be fully locked).

## Regression guardrails (carryover; prevent reintroducing removed legacy)

These guardrails are intentionally carried over from `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/MORPHOLOGY-NON-IMPLEMENTATION.md` to prevent regressions while hardening Phase 2:

- **Hard ban: narrative/story overlays (and “overlay-shaped” inputs):** do not reintroduce overlays or renamed equivalents anywhere that can influence physics outputs.
- **Hard rule: engine/projection truth is derived-only:** no engine tags/terrain indices/adjacency masks are authoritative inputs to physics domains; never read projections back in as truth.
- **Hard rule: projections/indices are Gameplay-owned:** all game-facing indices (terrain IDs, feature IDs, resource IDs, player IDs, region IDs, tags, etc.) are derived artifacts owned by Gameplay. Physics artifacts must remain pure truth surfaces and must not include engine IDs or projection indices as fields. Any legacy physics artifacts that embed projections are migration work: move those fields into the Gameplay projection/stamping layer.
- **Hard ban: presence / compare-to-default gating:** config semantics must be explicit after defaulting/normalization; knobs compose last; no “if undefined then fallback” behavior.
- **Hard ban: hidden multipliers/constants/defaults:** no magic numbers or unnamed scalars in contract semantics; every value is config or explicitly named constant with stated intent.
- **Hard ban: placeholders / dead bags / TBD contracts:** no placeholder contract shapes; Phase 2 is contract-locking, not scaffolding.
- **Compat invariant:** compat is forbidden inside Morphology; if anything transitional exists, it must be downstream, explicitly deprecated, with a planned removal trigger.
- **Determinism posture:** prefer passing determinism inputs across boundaries as data (seeds/inputs), not runtime RNG objects/functions; keep domain ops data-pure.
- **Single canonical body posture:** avoid forking the Phase 2 model into parallel “alternate specs.” This lockdown plan is a companion; the canonical Phase 2 model must remain a single authoritative body.
- **Evidence standard:** when making claims that can be grounded (repo wiring, artifact keys, Civ7 engine behaviors), cite the relevant repo/resource paths and label assumptions vs verified evidence.
- **Stop-the-line drift protocol:** if a locked decision is threatened, pause and coordinate via the orchestrator before proceeding; do not “quietly” bend a lock to make progress.

## Truth vs projection vs stamping (global policy; generalized boundary)

This is a generalized posture we are locking for this Phase 2 lockdown (not just for Morphology):

- **Physics domains = truth + physics logic (pure-only):** Foundation/Morphology/Hydrology/Ecology own physical truth artifacts and the computations that determine them. They do not couple to the engine and do not publish game-facing indices as “truth”.
- **Gameplay = projection logic + projection artifacts (pure-only):** Gameplay owns the policies/algorithms for mapping physics truths into game-facing structures (terrain/feature/resource/player indices, region IDs, tags, placements, overlays, etc.).
- **Stamping = recipe/stage/step with engine adapter:** actual engine writes happen only in steps that can access the engine adapter. Those steps may:
  1) compute/read physics truth artifacts,
  2) invoke Gameplay’s pure projection logic to produce indices/tags/placements,
  3) stamp via the engine adapter, then run required postprocess/validation.
- **Execution guarantees (locked; boolean effects; no receipts/hashes):** if a downstream step must rely on “stamping occurred”, that guarantee is expressed via short effect tags provided by the stamping steps (e.g., `effect:map.mountainsPlotted`, `effect:map.volcanoesPlotted`). This is safe because the relevant `artifact:map.*` intent artifacts are publish-once and frozen for the pass before stamping begins.
- **Braiding at the stage/step level is allowed (ownership is not):** it is fine for a “Morphology” stage to include a Gameplay projection/stamping step for convenience, but that does not mean Gameplay logic lives inside Morphology (domain ownership stays intact).
- **Legacy posture:** if we find physics artifacts emitting projection-like fields (e.g., engine terrain IDs embedded in a Morphology artifact), treat it as legacy to migrate into Gameplay projection/stamping.

## What work is actually in front of us (to “lock down” Phase 2)

- **Close “Phase 2 is authoritative” violations:** remove/resolve the “open questions” posture and eliminate “provisional/optional/might” language for anything cross-domain/public (e.g., routing is explicitly “Public (provisional)” today).
- **Enforce settled ownership boundaries (no ambiguity):**
  - **Hydrology owns canonical routing**: Morphology may keep an *internal-only* routing primitive for erosion, but Phase 2 must explicitly say it is not the canonical contract and must not be the downstream truth.
  - **Gameplay owns overlays + placement + projections + stamping**: remove any residual “Narrative-owned” / “Placement-owned” surfaces and braid assumptions.
- **Contract-lock every cross-domain surface (schemas + semantics, not conceptual sketches):**
  - **Foundation → Morphology**: define exact fields (incl. `meltFlux`/plumes, boundary regimes, uplift/subsidence/extension/shear, crust type+age, polar-edge boundary signals), index space (mesh vs tile), units/normalization, lifecycle (“frozen when”), determinism/tie-breakers.
  - **Morphology → {Hydrology, Ecology, Gameplay}**: complete, canonical artifact set (no “may include”; include downstream-useful signals by default), plus schema/units/determinism for each. In particular, landmasses must include a **per-tile landmass ID mapping + stable ID rules**, not just a list.
- **Make stages/steps/rules first-class (pipeline is the product):** Phase 2 needs an explicit stage model with step ordering rules, freeze points, and “no backfeed” invariants.
- **Add the missing Civ7 terrain materialization (“stamping”) layer as an explicit contract-locked phase:** Phase 2 must model:
  - what “mountain/volcano/cliff/etc.” mean in Civ7 data terms,
  - how those are deterministically derived from physics outputs,
  - which engine APIs/phases run, in what order, and what must be recomputed/validated afterward.
- **Evidence-driven closures (no “answerable but open” items):** anything about wrap/topology, LandmassRegionId semantics, volcano/cliff representation, TerrainBuilder phases, etc. must be closed by inspecting Civ7 resources + current repo wiring (not left as questions).

---

## Proposed agent team (small, “smart” agents, clear ownership)

- **Agent 1 — Contracts & Ownership Lock**
  - Owns: all upstream/downstream schemas, lifecycle, determinism rules, config semantics (“normalize once, knobs last”), and removing “optional/provisional” from public surfaces.
  - Produces: rewritten “Contracts” section(s) with fully specified artifacts + a “closure checklist” (every public field has type/units/indexing/tie-breakers).
- **Agent 2 — Civ7 Stamping / Engine Integration**
  - Owns: Civ7-grounded stamping/materialization spec + LandmassRegionId projection contract (inputs/rules/tie-breakers) + required engine postprocess steps.
  - Produces: a concrete stamping phase definition (Gameplay by default) with explicit inputs/outputs and citations to the relevant Civ7 scripts/data we inspect.
- **Agent 3 — Pipeline Stages/Steps + Codebase Alignment**
  - Owns: canonical pipeline stage model (no Narrative/Placement), step sequencing rules, freeze points, and reconciliation with current repo wiring/artifact keys (so Phase 2 is implementable without “legacy braid nostalgia”).
  - Produces: updated architecture/pipeline diagrams + a “delta list” of required changes in adjacent domains (Foundation/Hydrology/Ecology/Gameplay).

---

## Optional coordination mechanism (low-conflict)

If we want a lightweight shared “message board” per agent without creating merge conflicts, prefer a single scratch file per agent in this directory:

- `debates/phase2-lockdown/agent-a.scratch.md`
- `debates/phase2-lockdown/agent-b.scratch.md`
- `debates/phase2-lockdown/agent-c.scratch.md`

Each agent should only create/edit their own scratch file. Keep it to one “current state” message at a time (open questions, dependencies, blockers, decisions to confirm).

This is optional; if coordination stays simple, agents can instead message the orchestrator directly.

---

## Agent teams (structured definitions + launch prompts)

### Agent A — Contracts & Ownership Lock

- Agent type: `default`
- Role and responsibilities:
  - Drive Phase 2 from “conceptual contracts” to **schema-locked, deterministic contracts**.
  - Eliminate contract-level ambiguity and modal language (“provisional/optional/might/could”) from public surfaces.
  - Ensure ownership boundaries are expressed as **hard invariants** (no re-litigating settled decisions).
- Owns:
  - Foundation→Morphology input contract (fields, indexing, units/normalization, lifecycle/freeze points, determinism/tie-breakers).
  - Morphology→{Hydrology, Ecology, Gameplay} output contracts (complete canonical set; schemas + semantics).
  - Config semantics discipline: normalize-once, knobs-last, no presence-gating; explicit defaults; no hidden multipliers.
  - Determinism rules for published artifacts (stable IDs, tie-breakers, seed discipline, “frozen when”).
- Produces:
  - A proposed rewrite for the Phase 2 “Contracts / Contract Matrix / Public vs Internal surfaces / Determinism & Config semantics” sections.
  - A “closure checklist” mapping each cross-domain surface to: schema, units/normalization, lifecycle, determinism rules, and owner.
  - A short list of cross-scope dependencies that must be confirmed with the orchestrator (e.g., which surfaces must exist for stamping).

**Prompt to Agent A (full text):**

```text
You are Agent A (Contracts & Ownership Lock). Agent type: default.

Overall goal (shared across all agents):
We are hardening Morphology Phase 2 into a canonical, drift-resistant modeling document. Phase 2 must be an authoritative, contract-locking spec: no open contract-level questions, no “provisional/optional/might/could” language for any public surface, and explicit schemas/semantics across domain boundaries.

Recently locked decisions (do not re-litigate; build on them):
- Gameplay projection artifacts live under a unified `artifact:map.*` namespace (not `artifact:gameplay.projection.*`).
- `artifact:map.*` is publish-once/frozen **intent** per pass (no “rewrite later in the run”).
- Execution guarantees are short boolean effects provided by stamping steps:
  - Use existing convention: `effect:map.<thing>Plotted` (e.g., `effect:map.mountainsPlotted`, `effect:map.volcanoesPlotted`).
  - No version suffixes. No wordy names. No receipts/hashes/digests.
- Step names like `project-map` / `stamp-map` are template terms only; in practice expect granular `plot-*` steps (e.g., `plot-mountains`, `plot-volcanoes`, `plot-landmass-regions`).
- Do not introduce a new top-level Gameplay domain directory/package yet; keep Gameplay-owned logic self-contained inside the braided `morphology-map` stage(s)/steps.

You are working concurrently with two peer agents:
- Agent B (Civ7 stamping / engine integration): will lock the downstream stamping/materialization layer and LandmassRegionId projection semantics based on Civ7 resources and current repo wiring.
- Agent C (Pipeline stages/steps + codebase alignment): will lock the canonical stage/step/rule model and reconcile it with repo wiring/artifact keys; will also remove legacy braid assumptions (Narrative/Placement → Gameplay).

Scope and ownership (your lane):
- Own the cross-domain contract surfaces and the contract discipline in Phase 2.
- Explicitly: Foundation→Morphology input contract, and Morphology→{Hydrology, Ecology, Gameplay} output contracts.
- Own config semantics and determinism rules as they affect public surfaces.

Guardrails (non-negotiable, pulled from the context packet):
- Settled ownership boundaries are not open questions:
  - Foundation owns tectonics and macrostructure (including melt/plumes).
  - Hydrology owns canonical routing/hydrology surfaces (Morphology may have internal routing for erosion only).
  - Gameplay owns overlays, placement, projections, and stamping by default.
- No overlays/story masks/gameplay constraints as physics inputs (hard ban).
- Projections/indices (terrain IDs, feature IDs, resource IDs, player IDs, region IDs, tags) are Gameplay-owned derived artifacts; physics artifacts must not embed engine IDs/projection fields as truth.
- Phase 2 must lock contracts; only micro-level internal numeric methods may be deferred.
- Regression guardrails (do not regress Phase 2):
  - Do not reintroduce narrative/story overlays or overlay-shaped inputs/outputs under any name.
  - Do not treat engine/projection surfaces as authoritative physics inputs.
  - Do not introduce presence-based gating, hidden multipliers, or placeholder/TBD contract shapes.
  - Avoid creating “alternate specs”: keep Phase 2 as a single canonical model, and treat any side notes as pointers, not forks.
  - When stating anything that can be grounded (repo wiring, artifact keys, Civ7 constraints), cite paths and label assumptions vs verified evidence.
  - If you believe any lock must be bent, STOP and coordinate via the orchestrator before proposing it.
- Completeness posture (non-negotiable for this effort):
  - Do not propose stripped-down configs or outputs.
  - If an output/signal could reasonably be useful downstream, treat it as part of the canonical contract unless there is a clear reason not to.
  - Avoid “we could do this later” deferrals for contract/pipeline/downstream concerns; do the robust version now.

Preferred sources and tools:
- Primary sources to read/use:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-addendum-full.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/MORPHOLOGY-NON-IMPLEMENTATION.md` (regression guardrails to preserve)
- When doing deep dives across code/resources, prefer the Code Intelligence MCP server (semantic search, symbol discovery, call paths) over ad-hoc grep.
- Use `rg` only for fast/obvious bulk searches where semantic tooling adds little.
- Civ7 official resources should be consulted when contract fields need to support stamping/projection; however, do not “own” stamping details—that’s Agent B’s lane. If you discover a contract field requirement for stamping, surface it as a dependency to coordinate via the orchestrator.

Coordination / shared state (avoid conflicts):
- Avoid directly editing shared Phase 2 files unless the orchestrator explicitly asks.
- Scratchpad discipline (required):
  - Use your scratchpad for any large drafts, intermediate reasoning, or proposed replacement text blocks. Keep the chat response concise and point the orchestrator to your scratchpad for the full detail.
  - Reuse an existing scratchpad if present; otherwise create it. For Agent A, use `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/debates/phase2-lockdown/agent-a.scratch.md`.
  - Treat scratchpads as a shared communication surface between agents (read others; don’t edit others). If you need to coordinate, write your note in your own scratchpad and ping the orchestrator to route it.
  - During verification runs: begin by reading all existing scratchpads in this directory and migrating any still-open items relevant to your scope into your own “Open items” section (then revisit it before you finalize your report).
- Spend real time and search deep (required):
  - Expect to spend significant time on this; do not rush to “first draft”.
  - Prefer Code Intelligence MCP for deep dives (semantic search, symbol discovery, call paths); use `rg` for fast bulk scans.
  - When relevant, skim the other agents’ scratchpads to avoid duplication and catch cross-scope issues early; route coordination through the orchestrator.
- If you suspect overlap with Agent B/C, pause and ask the orchestrator rather than guessing.

What to do (take your time; aim for completeness):
1) Build a “contract closure map” for every cross-domain surface referenced or implied by the Phase 2 doc:
   - artifact/buffer name (canonical key), owner, producer stage, consumer stage(s)
   - schema fields + types
   - indexing space (tile vs mesh; mapping rules if projected)
   - units/normalization conventions
   - lifecycle: when produced/frozen, mutability, versioning notes if needed
   - determinism/tie-breakers (especially stable IDs; seed discipline)
2) Identify where the current Phase 2 doc violates the context packet (e.g., “public (provisional)” routing, “may include” outputs, deferring contract decisions).
3) Produce a concrete rewrite plan in the form of:
   - (a) proposed text blocks to replace/insert into the Phase 2 doc, and
   - (b) a checklist table of all contracts that must be locked.
4) Explicitly flag cross-scope dependencies/questions for the orchestrator:
   - e.g., “Agent B needs X physics field to deterministically stamp volcanoes.”
   - e.g., “Agent C needs contract freeze point definition at end of Morphology Post.”

Deliverable format (send back as a structured report):
- “Contract Closure Checklist” (table-like bullets OK)
- “Required rewrites” (by section name, with proposed replacement text blocks)
- “Dependencies / questions for orchestrator” (short, actionable)

Reminder:
Your output must integrate cleanly with the other agents’ work. Do not define stamping behavior or pipeline staging beyond what is necessary to specify contract lifecycle/freeze points—coordinate those items via the orchestrator.
```

---

### Agent B — Civ7 Stamping / Engine Integration

- Agent type: `default`
- Role and responsibilities:
  - Lock the **terrain materialization (“stamping”)** layer as a first-class, deterministic pipeline phase (Gameplay by default unless structurally justified otherwise).
  - Ground stamping semantics in **Civ7 official resources + current repo wiring**, so Phase 2 has no “answerable but open” engine questions.
  - Define the LandmassRegionId projection contract (inputs, rules, tie-breakers, determinism).
- Owns:
  - Civ7 definitions/requirements for mountains, volcanoes, cliffs, terrain edits, and any required TerrainBuilder phases / validations / postprocess steps.
  - Stamping phase placement in the canonical pipeline (who runs it, when, what it consumes/produces).
  - LandmassRegionId semantics as a downstream projection (Gameplay-owned) derived from Morphology landmass decomposition.
- Produces:
  - A stamping/materialization spec section: “what gets stamped, when, from which physics truths, using which engine calls, with which postprocess”.
  - A LandmassRegionId projection contract section: algorithmic rules + tie-breakers + determinism guarantees.
  - A concise list of required upstream/downstream contract inputs Agent A must provide (without redefining those contracts yourself).

**Prompt to Agent B (full text):**

```text
You are Agent B (Civ7 stamping / engine integration). Agent type: default.

Overall goal (shared across all agents):
We are hardening Morphology Phase 2 into a canonical, drift-resistant modeling document. Phase 2 must explicitly model Civ7 terrain materialization (“stamping”) as a first-class, deterministic responsibility in the canonical pipeline (even if executed outside Morphology).

Recently locked decisions (do not re-litigate; build on them):
- Gameplay projection artifacts live under a unified `artifact:map.*` namespace (not `artifact:gameplay.projection.*`).
- `artifact:map.*` is publish-once/frozen **intent** per pass (no “rewrite later in the run”).
- Execution guarantees are short boolean effects provided by stamping steps:
  - Use existing convention: `effect:map.<thing>Plotted` (e.g., `effect:map.mountainsPlotted`, `effect:map.volcanoesPlotted`).
  - No version suffixes. No wordy names. No receipts/hashes/digests.
- Step names like `project-map` / `stamp-map` are template terms only; in practice expect granular `plot-*` steps (e.g., `plot-mountains`, `plot-volcanoes`, `plot-landmass-regions`).
- Do not introduce a new top-level Gameplay domain directory/package yet; keep Gameplay-owned logic self-contained inside the braided `morphology-map` stage(s)/steps.

You are working concurrently with two peer agents:
- Agent A (Contracts & Ownership Lock): will lock schemas/semantics for Foundation↔Morphology and Morphology→{Hydrology/Ecology/Gameplay}. They own contract details.
- Agent C (Pipeline stages/steps + codebase alignment): will lock the stage/step/rule model and reconcile it with repo wiring; will remove Narrative/Placement braid assumptions.

Scope and ownership (your lane):
- Own the “Gameplay projections & Civ7 stamping” layer:
  - Define what “stamping/materialization” means for Civ7 in concrete engine/data terms.
  - Specify where stamping occurs in the canonical pipeline, what it consumes, what it produces, and what engine calls/phases/postprocess steps must run.
  - Define LandmassRegionId projection semantics as an explicit deterministic contract (Gameplay-owned).

Guardrails (non-negotiable, pulled from the context packet):
- Stamping cannot be hand-waved or externalized away from Phase 2. Phase 2 must model it and lock the contracts.
- Physics domains are canonical truth producers; stamping is derived-only. No gameplay overlays feed back into physics.
- Gameplay (default) owns engine-facing projection buffers/tags and stamping; Morphology terminal stamping is only allowed if structurally justified.
- Projection artifacts/indices (terrain IDs, feature IDs, resource IDs, player IDs, region IDs, tags) are Gameplay-owned derived outputs; treat any such fields found in physics artifacts as legacy migration work.
- Topology lock (Civ7 canonical): **east–west wrap is always on**, **north–south wrap is always off**. Do not treat wrap flags as optional, configurable, or an open question.
- Regression guardrails (do not regress Phase 2):
  - Do not treat any engine/projection surface as a physics-domain input.
  - Do not reintroduce narrative/story overlays as a backdoor into physics decisions.
  - Do not leave stamping/postprocess as “externalized” or “TBD”; Phase 2 must model it contract-locked.
  - Avoid creating “alternate specs”: keep Phase 2 as a single canonical model, and treat any side notes as pointers, not forks.
  - When stating anything that can be grounded (Civ7 engine behavior, scripts, builder phases), cite paths and label assumptions vs verified evidence.
  - If evidence contradicts a previously locked decision, STOP and coordinate via the orchestrator.
- Completeness posture (non-negotiable for this effort):
  - Do not frame stamping as a token/shallow integration. Specify the full, robust Civ7-grade stamping/materialization contract and pipeline phase.
  - If Civ7 has an engine phase, validation, or postprocess step that is plausibly required or commonly relied on, include it explicitly rather than deferring.
  - If an engine-facing projection could reasonably be consumed downstream (AI, resources, ages, rules), treat it as part of the canonical stamping/projection layer unless there is a clear reason not to.

Preferred sources and tools:
- Primary sources to read/use:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-addendum-full.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/MORPHOLOGY-NON-IMPLEMENTATION.md` (regression guardrails to preserve)
- Civ7 official resources:
  - Prefer local extracted resources under `civ7-official-resources/` (and especially `civ7-official-resources/Base/modules/...`) when present.
  - Use the Code Intelligence MCP server for semantic search/deep dives across those resources and our repo code (TerrainBuilder usage, map scripts, postprocess sequencing).
- Use `rg` only for quick broad scans; for deep dives, explicitly prefer Code Intelligence MCP.

Coordination / shared state (avoid conflicts):
- Avoid directly editing shared Phase 2 files unless the orchestrator explicitly asks.
- Scratchpad discipline (required):
  - Use your scratchpad for any large drafts, intermediate reasoning, evidence notes, or drop-in spec text. Keep the chat response concise and point the orchestrator to your scratchpad for the full detail.
  - Reuse an existing scratchpad if present; otherwise create it. For Agent B, use `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/debates/phase2-lockdown/agent-b.scratch.md`.
  - Treat scratchpads as a shared communication surface between agents (read others; don’t edit others). If you need to coordinate, write your note in your own scratchpad and ping the orchestrator to route it.
  - During verification runs: begin by reading all existing scratchpads in this directory and migrating any still-open items relevant to your scope into your own “Open items” section (then revisit it before you finalize your report).
- Spend real time and search deep (required):
  - Expect to spend significant time on this; do not rush to “first draft”.
  - Prefer Code Intelligence MCP for deep dives (semantic search, symbol discovery, call paths), especially across Civ7 resources + our adapter wiring; use `rg` for fast bulk scans.
  - When relevant, skim the other agents’ scratchpads to avoid duplication and catch cross-scope issues early; route coordination through the orchestrator.
- If you suspect overlap with Agent A/C (e.g., contract field definitions or pipeline freeze points), pause and ask the orchestrator rather than guessing.

What to do (take your time; prioritize evidence and determinism):
1) Determine Civ7’s concrete expectations for:
   - Mountains, volcanoes, cliffs (representation, constraints, required tags/terrain types/features if applicable).
   - Any TerrainBuilder phases / validations / “fix terrain” steps that must run after stamping.
   - Any known requirements for area/continent recalculation or region tagging after terrain edits.
2) From that evidence, define the canonical “Stamping/Materialization Phase” spec:
   - Placement in pipeline (Gameplay by default): when it runs relative to Morphology/Hydrology/Ecology outputs.
   - Inputs it consumes (physics truths + projections), and which of those are required vs optional.
   - Outputs it produces (engine-facing terrain reality + any derived projection buffers).
   - Determinism guarantees and tie-breakers (including “same inputs + seed → same stamp result”).
3) Define LandmassRegionId projection semantics:
   - Inputs (morphology landmasses + per-tile landmass IDs; gameplay config like DistantLands if relevant).
   - Rules for selecting primary/secondary (or more) landmass groupings.
   - Tie-breakers (equal area, adjacency, bounding-box overlap, etc.).
4) Identify required upstream contract fields and freeze points (handoff list for Agent A and Agent C):
   - You do not own the schema definition itself, but you must state what must exist for stamping to be deterministic.

Deliverable format (send back as a structured report):
- “Evidence findings” (what you inspected, in repo/resource terms)
- “Stamping/materialization spec” (ready-to-drop-in section text)
- “LandmassRegionId projection contract” (ready-to-drop-in section text)
- “Dependencies / questions for orchestrator” (short, actionable)

Reminder:
Your output must integrate with Agent A’s contract work and Agent C’s pipeline staging work. If a choice you’re about to make affects their scope (e.g., requiring a new artifact, changing a freeze point), coordinate via the orchestrator before committing to that direction.
```

---

### Agent C — Pipeline Stages/Steps + Codebase Alignment

- Agent type: `default`
- Role and responsibilities:
  - Re-lock Phase 2 around an explicit **stages/steps/rules** model where the pipeline is the product.
  - Remove legacy domain topology (Narrative/Placement) and any implied braids, aligning with “Gameplay absorbs Narrative + Placement”.
  - Reconcile the canonical model with current repo wiring/artifact keys so it’s implementable without preserving legacy braid as canonical.
- Owns:
  - Canonical pipeline stage/step definitions and sequencing rules (including freeze points and no-backfeed invariants).
  - Architecture/data-flow diagrams consistent with the target topology (Foundation → Morphology → Hydrology → Ecology → Gameplay).
  - An implementability alignment scan against current code and artifact wiring (identify deltas without reintroducing legacy assumptions).
- Produces:
  - A rewritten pipeline section: explicit stages/steps/rules, with a clean domain topology (no Narrative/Placement).
  - Updated diagrams (architecture + data flow) matching the refactored pipeline.
  - A delta list of required changes in adjacent domains (Foundation/Hydrology/Ecology/Gameplay) as explicitly modeled contracts, not “they’ll handle it later”.

**Prompt to Agent C (full text):**

```text
You are Agent C (Pipeline stages/steps + codebase alignment). Agent type: default.

Overall goal (shared across all agents):
We are hardening Morphology Phase 2 into a canonical, drift-resistant modeling document. Phase 2 must model the pipeline as the product: explicit stages, steps, and governing rules (not just operations), with a clean target topology aligned to the canonical architecture.

Recently locked decisions (do not re-litigate; build on them):
- Gameplay projection artifacts live under a unified `artifact:map.*` namespace (not `artifact:gameplay.projection.*`).
- `artifact:map.*` is publish-once/frozen **intent** per pass (no “rewrite later in the run”).
- Execution guarantees are short boolean effects provided by stamping steps:
  - Use existing convention: `effect:map.<thing>Plotted` (e.g., `effect:map.mountainsPlotted`, `effect:map.volcanoesPlotted`).
  - No version suffixes. No wordy names. No receipts/hashes/digests.
- Step names like `project-map` / `stamp-map` are template terms only; in practice expect granular `plot-*` steps (e.g., `plot-mountains`, `plot-volcanoes`, `plot-landmass-regions`).
- Do not introduce a new top-level Gameplay domain directory/package yet; keep Gameplay-owned logic self-contained inside the braided `morphology-map` stage(s)/steps.

You are working concurrently with two peer agents:
- Agent A (Contracts & Ownership Lock): will lock the schemas/semantics for cross-domain contracts and determinism/config discipline.
- Agent B (Civ7 stamping / engine integration): will lock Gameplay-side stamping/materialization + LandmassRegionId projection semantics based on Civ7 resources and repo wiring.

Scope and ownership (your lane):
- Own the pipeline shape and its rules:
  - Explicit stage model, step ordering, freeze points/lifecycles, and “no downstream backfeeding” enforcement.
  - Remove Narrative and Placement as canonical domains; ensure diagrams and text reflect “Gameplay absorbs Narrative + Placement.”
  - Reconcile the model with current repo wiring/artifact keys to keep Phase 2 implementable without preserving legacy braid as canonical.

Guardrails (non-negotiable, pulled from the context packet):
- Physics domains are canonical truth producers; no downstream backfeeding.
- Hard ban: overlays as physics inputs.
- Narrative/Placement are not first-class domains; Gameplay owns overlays/placement/projections/stamping (Phase A only; read-only w.r.t. physics).
- Physics domains are pure-only truth producers; projection artifacts/indices belong to Gameplay and are stamped only in engine-adapter steps (never embedded in physics truth artifacts).
- “Raise and burn”: remove braids/stages unless they carry real canonical load.
- Polar boundary tectonics must be integrated into the core spine (not an appendix).
- Regression guardrails (do not regress Phase 2):
  - Do not reintroduce Narrative/Placement as canonical domains (Gameplay absorbs them).
  - Do not reintroduce overlay-shaped inputs into physics, even indirectly via braid assumptions.
  - Do not rely on engine/projection truth as upstream input to physics stages.
  - Avoid placeholder/TBD stages or “we’ll figure it out later” pipeline hand-waves; Phase 2 must be explicit.
  - Avoid creating “alternate specs”: keep Phase 2 as a single canonical model, and treat any side notes as pointers, not forks.
  - When stating anything that can be grounded (repo wiring, stage IDs, artifact keys), cite paths and label assumptions vs verified evidence.
  - If you believe a braid/stage must exist for correctness, STOP and coordinate with the orchestrator before asserting it.
- Completeness posture (non-negotiable for this effort):
  - Do not propose shallow staging or incremental-only pipeline changes. Define the complete, robust stage/step/rule model as if greenfield.
  - If a stage/step/rule is plausibly required for determinism, engine integration, or downstream consumers, include it now rather than deferring.

Preferred sources and tools:
- Primary sources to read/use:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-addendum-full.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/MORPHOLOGY-NON-IMPLEMENTATION.md` (regression guardrails to preserve)
- For deep dives (repo wiring, artifact keys, step IDs, stage orchestration), explicitly prefer the Code Intelligence MCP server.
- Use `rg` only for quick broad scans (e.g., locating obvious “Narrative” references).

Coordination / shared state (avoid conflicts):
- Avoid directly editing shared Phase 2 files unless the orchestrator explicitly asks.
- Scratchpad discipline (required):
  - Use your scratchpad for any large drafts, intermediate reasoning, repo wiring notes, or drop-in spec text. Keep the chat response concise and point the orchestrator to your scratchpad for the full detail.
  - Reuse an existing scratchpad if present; otherwise create it. For Agent C, use `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/debates/phase2-lockdown/agent-c.scratch.md`.
  - Treat scratchpads as a shared communication surface between agents (read others; don’t edit others). If you need to coordinate, write your note in your own scratchpad and ping the orchestrator to route it.
  - During verification runs: begin by reading all existing scratchpads in this directory and migrating any still-open items relevant to your scope into your own “Open items” section (then revisit it before you finalize your report).
- Spend real time and search deep (required):
  - Expect to spend significant time on this; do not rush to “first draft”.
  - Prefer Code Intelligence MCP for deep dives (semantic search, symbol discovery, call paths); use `rg` for fast bulk scans.
  - When relevant, skim the other agents’ scratchpads to avoid duplication and catch cross-scope issues early; route coordination through the orchestrator.
- If you suspect overlap with Agent A/B (contracts or stamping placement), pause and ask the orchestrator rather than guessing.

What to do (take your time; aim for coherence and implementability):
1) Define the canonical pipeline topology and ownership:
   - Domain order: Foundation → Morphology → Hydrology → Ecology → Gameplay.
   - Identify the canonical “freeze points” (when physics truth becomes readable/immutable for downstream).
   - Make stages and steps first-class: name them, define sequencing rules, and state invariants.
2) Remove legacy braid assumptions:
   - If the current Phase 2 doc implies Narrative Pre/Mid or Placement as stages, propose the canonical replacement.
   - If a braid is truly required for causality correctness, justify it explicitly; default stance is removal.
3) Align with repo reality:
   - Inspect current stage wiring and artifact keys/step IDs in code.
   - Produce a delta list: what must change (and where) to realize the canonical pipeline, without smuggling legacy ordering back into the spec.
4) Identify cross-scope dependencies:
   - If your stage model implies specific contract lifecycles, coordinate with Agent A via the orchestrator.
   - If your stage model affects where stamping occurs, coordinate with Agent B via the orchestrator.

Deliverable format (send back as a structured report):
- “Canonical pipeline model” (stage/step/rule definitions; ready-to-drop-in section text)
- “Diagram updates” (describe intended mermaid changes; ready-to-drop-in snippets)
- “Repo alignment scan” (what you found; delta list)
- “Dependencies / questions for orchestrator” (short, actionable)

Reminder:
Your output must integrate with Agent A’s contract locks and Agent B’s stamping spec. If your pipeline decisions would force a new contract artifact or change what gets stamped, coordinate via the orchestrator before committing to that direction.
```

---

## Integration plan (how agent outputs become one canonical Phase 2)

- Start by writing a **single canonical skeleton** (headings + glossary + invariants + stage diagram) that everyone agrees is “the spine”.
- Agents work against that spine with strict boundaries:
  - Agent 3 locks the stage/step graph and ownership statements first (so contracts/stamping attach to a stable lifecycle).
  - Agent 1 locks schemas/semantics next (so stamping has deterministic inputs).
  - Agent 2 locks stamping last (but with feedback only in the form of *required upstream fields*, not re-litigating ownership).
- Final integration pass is a **closure audit**:
  - Remove modal language (“might/could/provisional/optional/open question”) from public/cross-domain surfaces.
  - Verify every cross-domain interaction has a named artifact + schema + lifecycle + determinism rules.
  - Verify stamping is modeled as a first-class pipeline phase (even if executed outside Morphology).

---

## Single file vs split (recommendation)

- Split into **3 files** to match collaboration boundaries and reduce merge/conflict risk while keeping sensible boundaries:
  - **Core model & pipeline**: causality spine, stages/steps/rules, ownership, polar edges.
  - **Contracts**: Foundation→Morphology, Morphology→{Hydrology/Ecology/Gameplay}, config semantics, determinism/tie-breakers.
  - **Gameplay projections & Civ7 stamping**: LandmassRegionId + terrain materialization + engine phases/postprocess.
- If Phase 2 must remain a single file, keep it as one file but enforce the same three “owned” sections and treat them as separately reviewed units.

---

## Doc split execution steps (if splitting into 3 files)

This plan *recommends* splitting, but it does not become real until we actually execute it. The target directory already exists and is currently empty: `plans/morphology/spec/`.

1. **Decide the canonical entrypoint**
   - Preferred: keep `spike-morphology-modeling-gpt.md` as the canonical entrypoint path (to avoid link churn), and convert it into a short “index” that links to the 3 canonical spec files under `plans/morphology/spec/`.
   - Alternative: keep `spike-morphology-modeling-gpt.md` as the full monolith and treat the split docs as derived. (Discouraged: invites drift and duplication.)
2. **Create the 3 spec files under `plans/morphology/spec/`**
   - One file per ownership boundary: `core-model-and-pipeline`, `contracts`, `map-projections-and-stamping` (exact filenames are flexible; boundaries are not).
3. **Move (don’t duplicate) content from the monolith into those 3 files**
   - Keep *one* canonical copy of each concept. If a section needs to be referenced from another file, link to it; do not fork parallel descriptions.
4. **Update addenda and links**
   - Ensure `spike-morphology-modeling-gpt-addendum-full.md` and `spike-morphology-modeling-gpt-addendum-braided-map-projection-draft.md` link to the new canonical targets (or to the entrypoint index if we keep that as the single public “front door”).
5. **Run a closure audit after the split**
   - Verify there are no “dangling” references to headings that used to exist in the monolith.
   - Verify the locked decisions still read as coherent and non-contradictory when the spec is read in its new split form.

---

## Agent run: execute the Phase 2 doc split (3 files + short index)

This is a dedicated agent run focused on **executing** the recommended split into 3 canonical files (plus converting the monolith into a short index).

### Working rules (conflict-avoidance + drift prevention)

- **Do not edit** `spike-morphology-modeling-gpt.md` (the monolith) during the agent run. The orchestrator will convert it into the short index after the three spec files are in place.
- Each agent edits **exactly two files**:
  1) their owned spec file under `plans/morphology/spec/`,
  2) their owned scratchpad under `plans/morphology/debates/phase2-doc-split/`.
- **No duplication:** move canonical content into your owned file; if another file must reference it, link to it rather than duplicating text.
- **No “minimal” framing:** default to completeness; include what is reasonably useful downstream now.
- **No compat shims / timeboxed hacks:** if a concept must exist in the canonical model, it must be modeled directly and cleanly.

### Shared references (read/anchor; don’t regurgitate)

- Phase 2 monolith (source to split): `spike-morphology-modeling-gpt.md`
- Context packet addendum: `spike-morphology-modeling-gpt-addendum-full.md`
- Braided map projection addendum (draft posture + patterns): `spike-morphology-modeling-gpt-addendum-braided-map-projection-draft.md`
- Domain modeling guidelines (ops/strategies/rules/steps terminology): `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md` (ignore any outdated architecture claims; keep the modeling vocabulary and boundaries)

### Coordination mechanism (required for this run)

Agents coordinate via scratchpads (single “current state” message; keep it short and actionable):

- Create directory: `plans/morphology/debates/phase2-doc-split/`
- Use these scratchpads:
  - `plans/morphology/debates/phase2-doc-split/agent-split-core.scratch.md`
  - `plans/morphology/debates/phase2-doc-split/agent-split-contracts.scratch.md`
  - `plans/morphology/debates/phase2-doc-split/agent-split-stamping.scratch.md`

Scratchpad usage rules:
- Use your scratchpad for intermediate reasoning, evidence pointers, and questions for the orchestrator.
- Before writing anything substantive, skim the other agents’ scratchpads to avoid overlap.
- If you suspect overlap or dependency, pause and ask the orchestrator rather than guessing.

---

### Agent Split 1 — Core model & pipeline

- Agent type: `default`
- Role and responsibilities:
  - Own the **core canonical model** narrative: invariants, glossary, causality spine, stages/steps/rules, freeze points, determinism posture (at the stage boundary level), and topology.
  - Ensure the document reads as a single coherent “spine” that other spec files attach to.
- Owns:
  - Core pipeline topology and stage/step/rule model (no Narrative/Placement; Gameplay as projection/stamping owner).
  - Topology invariants (wrapX always on, wrapY always off; no wrap knobs).
  - Global “truth vs projection vs stamping” policy statement and its consequences.
- Produces:
  - `plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
  - A short “integration hooks” section explicitly listing what other spec files must define (contracts surfaces, stamping effects, etc.).

**Launch prompt (Agent Split 1 — Core model & pipeline)**

```
You are Agent Split 1 (agent_type: default). You are a peer collaborator in a 3-agent run to execute a doc split for Morphology Phase 2.

Overall goal (shared across agents)
- Produce a canonical, detailed, complete Phase 2 Morphology modeling spec (contract-locked, pipeline-explicit: stages/steps/rules, Civ7 stamping modeled).
- This is a documentation completion pass (Phase 2 lockdown), not a Phase 3 code migration.

Your scope (you own this; do not overlap)
- You own the “core model & pipeline” file: invariants, glossary, causality spine, stage/step/rule model, freeze points, topology, and domain ownership statements.
- You do NOT own detailed contract schemas/field lists (Agent Split 2) or stamping/projection specifics (Agent Split 3).

Locked decisions (do not re-open)
- Topology: Civ7 map always wraps east–west (wrapX=true) and never wraps north–south (wrapY=false). No wrap env/config/knobs.
- Physics domains publish truth-only artifacts (pure); Gameplay owns projection artifacts under `artifact:map.*` and stamping/materialization via adapter writes.
- No backfeeding: physics must not consume `artifact:map.*` or engine tags as truth inputs.
- Stamping execution guarantees are represented by short boolean effects: `effect:map.<thing>Plotted` (e.g., `effect:map.mountainsPlotted`, `effect:map.volcanoesPlotted`).
- “project-map” / “stamp-map” are template terms; real steps are granular `plot-*` steps and should produce the `effect:map.*Plotted` tags.
- Completeness-first: avoid “minimal” framing and “we can do it later” for anything public, cross-domain, or pipeline-defining.

Coordination (required)
- Before you start, create and use your scratchpad: `plans/morphology/debates/phase2-doc-split/agent-split-core.scratch.md`
- Skim the other scratchpads before big decisions to avoid overlap:
  - `plans/morphology/debates/phase2-doc-split/agent-split-contracts.scratch.md`
  - `plans/morphology/debates/phase2-doc-split/agent-split-stamping.scratch.md`
- If you detect overlap or a dependency on another agent’s area, pause and ask the orchestrator rather than guessing.

Work instructions
1) Read and anchor on:
   - `spike-morphology-modeling-gpt.md` (source monolith)
   - `spike-morphology-modeling-gpt-addendum-full.md` (must-lock requirements)
   - `spike-morphology-modeling-gpt-addendum-braided-map-projection-draft.md` (map.* posture)
   - `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md` (ops/strategies/rules/steps vocabulary; ignore any outdated architecture)
2) Create `plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`.
   - Move (do not duplicate) the monolith’s core “spine” content into this file.
   - Make sure the spine is explicit: stage names are placeholders unless already locked; the sequencing rules and freeze points must be unambiguous.
   - Provide explicit integration hooks: “Contracts file must define X” and “Stamping file must define Y”.
3) Evidence posture:
   - Prefer Code Intelligence MCP for deep repo/Civ7 resource inspection; use `rg` for fast bulk scans.
   - Where you claim “this is how the pipeline is wired today” or “Civ7 expects X”, provide file path pointers (no need to paste large excerpts).

Hard boundaries (avoid file conflicts)
- Do not edit `spike-morphology-modeling-gpt.md` during this run.
- Only edit:
  - `plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
  - `plans/morphology/debates/phase2-doc-split/agent-split-core.scratch.md`

Deliverable
- The finished `PHASE-2-CORE-MODEL-AND-PIPELINE.md` file (closure-grade, internally consistent, no modal language on pipeline/ownership).
- Scratchpad: one short “current state” note listing any open questions for the orchestrator and any dependencies you need from Agents Split 2/3.
```

---

### Agent Split 2 — Contracts

- Agent type: `default`
- Role and responsibilities:
  - Own the **cross-domain contracts**: upstream/downstream artifact schemas, semantics, indexing spaces, units/normalization, lifecycle/freeze points, determinism/tie-breakers, and compile-time config normalization semantics.
  - Eliminate “optional/provisional” language for public surfaces; include downstream-useful signals by default.
- Owns:
  - Foundation→Morphology input contracts.
  - Morphology→Hydrology/Ecology contracts.
  - Morphology→Gameplay truth outputs needed for projection/stamping (but not the projection artifacts themselves).
- Produces:
  - `plans/morphology/spec/PHASE-2-CONTRACTS.md`
  - A compact “contract closure checklist” (per artifact: required fields/types/units/indexing/lifecycle/tie-breakers).

**Launch prompt (Agent Split 2 — Contracts)**

```
You are Agent Split 2 (agent_type: default). You are a peer collaborator in a 3-agent run to execute a doc split for Morphology Phase 2.

Overall goal (shared across agents)
- Produce a canonical, detailed, complete Phase 2 Morphology modeling spec (contract-locked, pipeline-explicit, Civ7 stamping modeled).
- This is a documentation completion pass (Phase 2 lockdown), not a Phase 3 code migration.

Your scope (you own this; do not overlap)
- You own the contracts file: all cross-domain artifact schemas and semantics (Foundation→Morphology, Morphology→Hydrology/Ecology, and Morphology→Gameplay truth outputs).
- You do NOT own the overall pipeline narrative (Agent Split 1) or the projection/stamping artifacts/effects (Agent Split 3).

Locked decisions (do not re-open)
- Topology: Civ7 map always wraps east–west (wrapX=true) and never wraps north–south (wrapY=false). No wrap env/config/knobs.
- Physics domains publish truth-only artifacts (pure); Gameplay owns projection artifacts under `artifact:map.*` and stamping/materialization via adapter writes.
- No backfeeding: physics must not consume `artifact:map.*` or engine tags as truth inputs.
- Stamping execution guarantees are represented by short boolean effects: `effect:map.<thing>Plotted` (e.g., `effect:map.mountainsPlotted`).
- Completeness-first: include downstream-useful signals by default; no “minimal” posture and no “we’ll do it later” on public/cross-domain contract surfaces.
- Normalize-once/knobs-last: no presence-based runtime gating semantics.

Coordination (required)
- Before you start, create and use your scratchpad: `plans/morphology/debates/phase2-doc-split/agent-split-contracts.scratch.md`
- Skim the other scratchpads before big decisions to avoid overlap:
  - `plans/morphology/debates/phase2-doc-split/agent-split-core.scratch.md`
  - `plans/morphology/debates/phase2-doc-split/agent-split-stamping.scratch.md`
- If you detect overlap or a dependency (e.g., stamping needs a field you are defining), pause and ask the orchestrator rather than guessing.

Work instructions
1) Read and anchor on:
   - `spike-morphology-modeling-gpt.md` (source monolith)
   - `spike-morphology-modeling-gpt-addendum-full.md` (must-lock requirements)
   - `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md` (ops/strategies/rules/steps vocabulary)
2) Create `plans/morphology/spec/PHASE-2-CONTRACTS.md`.
   - Move (do not duplicate) contract material from the monolith into this file.
   - For each cross-domain artifact, lock:
     - required fields + types
     - indexing space (tile vs mesh vs region)
     - units/normalization
     - lifecycle/freeze point (when it becomes stable for downstream)
     - determinism rules (stable IDs, tie-breakers, ordering)
   - Keep Gameplay boundary clean: you can define truth outputs that Gameplay consumes, but do not define `artifact:map.*` projection artifacts here.
3) Evidence posture:
   - Prefer Code Intelligence MCP for deep dives into repo wiring and Civ7 resources; use `rg` for fast scans.
   - Where you make claims about current artifact keys or step ids, include path pointers.

Hard boundaries (avoid file conflicts)
- Do not edit `spike-morphology-modeling-gpt.md` during this run.
- Only edit:
  - `plans/morphology/spec/PHASE-2-CONTRACTS.md`
  - `plans/morphology/debates/phase2-doc-split/agent-split-contracts.scratch.md`

Deliverable
- The finished `PHASE-2-CONTRACTS.md` file (closure-grade; no “provisional/optional/might” on public contract surfaces).
- Scratchpad: one short “current state” note listing any open questions for the orchestrator and any required dependencies you need from Agents Split 1/3.
```

---

### Agent Split 3 — Map projections & Civ7 stamping

- Agent type: `default`
- Role and responsibilities:
  - Own the Gameplay projection + stamping/materialization layer as modeled in Phase 2:
    - `artifact:map.*` projection artifacts (intent),
    - `effect:map.*Plotted` execution guarantees (what “has been done”),
    - Civ7 engine adapter calls and required postprocess/validation constraints (as evidence-backed as possible).
  - Keep the boundary clean: projection/stamping lives in steps; physics remains truth-only.
- Owns:
  - `artifact:map.*` projection surfaces (shape/semantics; which are required downstream).
  - `effect:map.<thing>Plotted` effect taxonomy (short, boolean, convention-aligned).
  - Civ7 stamping sequencing constraints + LandmassRegionId projection/stamping semantics.
- Produces:
  - `plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`
  - An explicit mapping table: “truth inputs consumed” → “map artifacts produced” → “effects asserted (plotted)”.

**Launch prompt (Agent Split 3 — Map projections & Civ7 stamping)**

```
You are Agent Split 3 (agent_type: default). You are a peer collaborator in a 3-agent run to execute a doc split for Morphology Phase 2.

Overall goal (shared across agents)
- Produce a canonical, detailed, complete Phase 2 Morphology modeling spec (contract-locked, pipeline-explicit, Civ7 stamping modeled).
- This is a documentation completion pass (Phase 2 lockdown), not a Phase 3 code migration.

Your scope (you own this; do not overlap)
- You own the “map projections & stamping” file:
  - `artifact:map.*` projection artifacts (intent)
  - `effect:map.*Plotted` effects (execution guarantees)
  - Civ7 stamping/materialization modeling, including LandmassRegionId semantics and postprocess constraints
- You do NOT own the full pipeline topology narrative (Agent Split 1) or upstream/downstream truth contracts (Agent Split 2).

Locked decisions (do not re-open)
- Topology: Civ7 map always wraps east–west (wrapX=true) and never wraps north–south (wrapY=false). No wrap env/config/knobs.
- Physics domains publish truth-only artifacts (pure); Gameplay owns `artifact:map.*` projection artifacts and stamping/materialization via adapter writes.
- No backfeeding: physics must not consume `artifact:map.*` or engine tags as truth inputs.
- “Stamping happened” is modeled via short boolean effects with existing convention: `effect:map.<thing>Plotted` (no versions/hashes/receipts; no wordy names).
- Granular step posture: “project-map”/“stamp-map” are template terms only; real step boundaries should be `plot-*` and assert the corresponding `effect:map.*Plotted`.
- Completeness-first: include what is reasonably useful downstream now; no “minimal” posture.

Coordination (required)
- Before you start, create and use your scratchpad: `plans/morphology/debates/phase2-doc-split/agent-split-stamping.scratch.md`
- Skim the other scratchpads before big decisions to avoid overlap:
  - `plans/morphology/debates/phase2-doc-split/agent-split-core.scratch.md`
  - `plans/morphology/debates/phase2-doc-split/agent-split-contracts.scratch.md`
- If you detect overlap or a dependency (e.g., you need a truth field that contracts must define), pause and ask the orchestrator rather than guessing.

Work instructions
1) Read and anchor on:
   - `spike-morphology-modeling-gpt.md` (source monolith)
   - `spike-morphology-modeling-gpt-addendum-full.md` (must-lock requirements)
   - `spike-morphology-modeling-gpt-addendum-braided-map-projection-draft.md` (map.* posture)
   - `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md` (steps as effect boundaries; ops pure)
2) Create `plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`.
   - Move (do not duplicate) projection/stamping material from the monolith into this file.
   - Define:
     - required `artifact:map.*` projection artifacts (intent shapes/semantics)
     - required `effect:map.*Plotted` effects (short boolean tags)
     - stamping/materialization constraints, sequencing, and evidence pointers (file paths)
   - Keep the boundary clean: effects live at step boundaries; no “logic outside steps” patterns.
3) Evidence posture:
   - Prefer Code Intelligence MCP for Civ7 and repo deep dives; use `rg` for bulk search.
   - Where you claim specific Civ7 behavior (LandmassRegionId semantics, expandCoasts ordering, cliffs derived, etc.), provide the best path pointers available and clearly label what is verified vs inferred.

Hard boundaries (avoid file conflicts)
- Do not edit `spike-morphology-modeling-gpt.md` during this run.
- Only edit:
  - `plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`
  - `plans/morphology/debates/phase2-doc-split/agent-split-stamping.scratch.md`

Deliverable
- The finished `PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` file (closure-grade; coherent with the other spec files).
- Scratchpad: one short “current state” note listing any open questions for the orchestrator and any required truth inputs you need Agent Split 2 to define.
```

---

## Verification findings (salvage checklist — in progress)

This section is an actionable checklist based on a verification/review pass (new agents + orchestrator). It is intended to keep the remediation effort honest: confirm what exists, call out what didn’t happen, and drive concrete closure work to produce a canonical, drift-resistant Phase 2 deliverable.

### Findings (what is true right now)

- The Phase 2 model has been partially “split” into canonical spec files under `plans/morphology/spec/`:
  - `spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
  - `spec/PHASE-2-CONTRACTS.md`
  - `spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`
- `spike-morphology-modeling-gpt.md` still exists as a large monolith and contains residual “optional/conditional” language and legacy-ledger uncertainty that can be misread as contract ambiguity unless it is clearly repositioned as an overview/index that points to the canonical spec files.
- `boundaryBias` was previously left ambiguous (“repurpose or drop” + `_Needs verification_`) in the monolith; this must not exist in a closure-grade Phase 2. The monolith must explicitly **kill** `boundaryBias` (legacy), and Phase 2 must instead lock a Foundation-owned polar boundary interaction intensity surface.
- Polar-edge tectonics are modeled as first-class, but we still need a closure-grade **Foundation-owned config/contract surface** for *how intense* north/south boundary (“polar plate”) interactions are, to replace legacy “boundary bias” behavior without reintroducing overlays.
- The truth/projection/stamping split is locked and coherent, but a few remaining word choices can accidentally sound like “sometimes we do it this way” unless we restate the posture as a single canonical path (no conditional dual paths; no shims).
- Some engine/stamping claims rely on evidence pointers that exist in scratchpads; those pointers must be cited where the canonical spec makes the claim, and we must clearly label what is **verified vs inferred** to avoid false certainty.

### Open items surfaced from existing scratchpads (must be drained)

These came from the existing scratchpads in this directory and must be either (a) resolved into the canonical docs or (b) explicitly recorded as still-open (with a trigger) rather than silently ignored:

- Mixed truth + projection artifacts to unwind (legacy migration targets): `artifact:morphology.topography.terrain`, `artifact:morphology.coastlinesExpanded`, `artifact:heightfield.terrain` (see `debates/phase2-lockdown/agent-a.scratch.md`).
- Overlay-shaped dependencies still present in current wiring (hard-ban violations): `morphology-post/volcanoes`, `morphology-mid/rugged-coasts`, `morphology-post/islands` (see `debates/phase2-lockdown/agent-a.scratch.md`).
- Stamping sequencing and “cliffs are derived” constraints: evidence pointers exist under `.civ7/outputs/...`, but we must be explicit about what is verified vs inferred, especially when `civ7-official-resources/` is not present (see `debates/phase2-lockdown/agent-b.scratch.md`).
- Wrap posture is fixed: wrapX is always on; wrapY is always off; any “wrap optionality” surfaces are legacy migration work (see `debates/phase2-lockdown/agent-c.scratch.md`).

### Acceptance criteria (Phase 2 lockdown is “done” when…)

- Phase 2 is readable as a *canonical spec* (not a brainstorm): no contract-level unknowns, no modal language on public/cross-domain surfaces, and no internal contradictions.
- Contracts are explicit and closure-grade: each cross-domain artifact has a locked schema (required fields + types), indexing space, units/normalization, lifecycle/freeze point, and determinism/tie-break rules.
- Topology is treated as an invariant everywhere: map always wraps east–west and never wraps north–south; no wrap flags/knobs appear as inputs.
- Stamping/materialization is modeled as a first-class downstream responsibility with evidence-backed constraints and clearly stated “verified vs assumed” claims.
- Scratchpads are “drained”: open questions and migration targets identified during remediation are either integrated into canonical docs or explicitly listed as remaining work (no silent dangling state).
- `spike-morphology-modeling-gpt.md` clearly indicates (and links) that canonical Phase 2 truth is the `spec/` set; the monolith does not retain unresolved contract decisions.
- Legacy `boundaryBias` is closed (killed) and replaced by an explicit Foundation-owned polar boundary interaction intensity control surface (or a finer-grained equivalent) that is contract-locked in `spec/PHASE-2-CONTRACTS.md`.

### Checklist (keep this short; check off as we close)

- [ ] Canonicalize entrypoints: make `spike-morphology-modeling-gpt.md` an unambiguous Phase 2 index/overview that links to `spec/PHASE-2-*` as the canonical spec surfaces.
- [ ] Close `boundaryBias`: explicitly kill it (legacy) and lock a Foundation-owned polar boundary interaction intensity control surface in `spec/PHASE-2-CONTRACTS.md` (and reference it from the core model).
- [ ] Lock polar-edge ownership wording: remove any “or” / ambiguous ownership language; Foundation is the truth producer for polar-edge regime signals.
- [ ] Drain scratchpads into canonical docs: integrate each open item or explicitly record it as Phase 3 migration work with a trigger (no silent dangling state).
- [ ] Evidence posture pass: where the spec asserts engine ordering/constraints, add the best available path pointers and label **verified vs inferred**.
- [ ] Consistency sweep: `rg` for “open question/TBD/provisional/needs verification/optional” in canonical Phase 2 docs and eliminate any contract-level ambiguity.

---

## Final remediation plan (Phase 2 closure — do this, then we are done)

This is the final closure plan to finish Phase 2 documentation hardening. The intent is that after completing this plan, Phase 2 is *fully locked* and Phase 3 can proceed with migration work without “reinterpretation.”

### Target canonical docs (must end up self-consistent)

- Phase 2 spine (invariants, ownership, pipeline, freeze points): `spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
- Phase 2 contracts (schemas/semantics/lifecycle/determinism): `spec/PHASE-2-CONTRACTS.md`
- Phase 2 map projection + stamping (Gameplay-owned `artifact:map.*` + `effect:map.*Plotted`): `spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`
- Phase 2 index/overview (human-friendly entrypoint; MUST NOT reintroduce ambiguity): `spike-morphology-modeling-gpt.md`

### Plan steps (in order)

1) Canonicalize the entrypoints (remove “two sources of truth” drift)
   - Update `spike-morphology-modeling-gpt.md` to:
     - link to the three `spec/PHASE-2-*` files as the canonical Phase 2 spec,
     - explicitly state that contracts/ownership/stamping constraints live in `spec/`,
     - remove or clearly label any remaining “illustrative” schema fragments so they cannot be misread as canonical contracts.
   - Goal: a new reader never accidentally treats old modal language in the monolith as “open design.”

2) Close `boundaryBias` decisively (kill, don’t repurpose)
   - Update `spike-morphology-modeling-gpt.md` so `boundaryBias` is explicitly **killed** as a legacy requirement.
   - Rationale (locked): legacy “boundary bias” intent is now handled by the **plate boundary strategy** (Foundation tectonics), including polar boundary plate interactions. Morphology does not keep a separate knob for it.

3) Lock the polar boundary interaction intensity control surface (Foundation-owned)
   - Add (or reference, if already present) a Foundation config/contract surface that controls *how intense* north/south boundary (“polar plate”) interactions are.
   - This MUST be contract-locked in `spec/PHASE-2-CONTRACTS.md` under Foundation→Morphology inputs/config semantics, and referenced from `spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`.
   - Closure posture (locked):
     - This is not a Morphology knob.
     - This is not an overlay.
     - This is not optional at runtime (defaults are explicit; normalization is once).
   - Canonical contract surface shape (complete but not over-fancy):
     - `polarBoundary: { north: { regime, intensity }, south: { regime, intensity } }`
     - Where `regime ∈ { convergent, divergent, transform }` and `intensity` is a normalized scalar that scales the regime’s effect fields at the boundary (exact mapping is an internal numeric method; the config surface and semantics are locked).

4) Remove remaining “open question” residue from in-scope addenda
   - Update `spike-morphology-modeling-gpt-addendum-braided-map-projection-draft.md` so it no longer contains unresolved “intent vs happened” questions:
     - The lock is: `artifact:map.*` is projection intent; stamping completion is expressed via `effect:map.<thing>Plotted` boolean effects.
   - Ensure the addendum points to `spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` as canonical for `artifact:map.*` + effects.

5) Closure sweep: eliminate contract-level modal language and ambiguity
   - Run an explicit pass over the canonical `spec/` files and remove any remaining contract-level:
     - “open question”, “TBD”, “needs verification”, “provisional”, “may include”, “optional” (unless clearly labeled as debug-only derived artifacts).
   - Where evidence is incomplete for engine ordering details:
     - keep the requirement as a Phase 2 contract constraint only if it is truly required for determinism/correctness,
     - otherwise move it to the Phase 3 backlog with an explicit trigger and keep Phase 2 wording honest (“verified vs inferred”).

6) Drain scratchpads and harden “remaining work” boundaries
   - Re-read the main scratchpads and ensure every item is either:
     - integrated into the canonical spec files, or
     - explicitly captured as Phase 3 migration work (with a trigger), not left dangling.
   - Ensure debate/scratchpad organization is consistent under `plans/morphology/debates/` and that all in-scope debate outputs are tracked where appropriate.

### Acceptance criteria (Phase 2 is “complete” after this plan)

- A reader can start at `spike-morphology-modeling-gpt.md` and immediately find the canonical Phase 2 spec surfaces (the three `spec/PHASE-2-*` files) with no contradictory “maybe” language.
- `boundaryBias` is closed and cannot be reintroduced via “repurpose” ambiguity.
- Polar boundary plate interaction intensity is a locked Foundation control surface (with explicit defaults), and Morphology does not carry a parallel knob.
- Canonical docs contain no contract-level “open question/TBD/provisional/needs verification” language.
- Phase 3 backlog remains actionable and honest (migration items are clearly separated from Phase 2 contracts).

---

## Phase 3 migration backlog (capture now; execute later)

Phase 2 lockdown must not silently assume code is already migrated. These are Phase 3 items we must remember and plan in detail once Phase 2 is closed.

### Hard deletions (must happen; no “keep it around”)

- Delete legacy overlay-shaped inputs into physics steps (hard ban):
  - Volcanoes overlay dependency: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`
  - Rugged coasts sea-lane/margin overlays: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts`
  - Any other `artifact:storyOverlays` consumers in physics stages.

### Canonicalization work (`artifact:foundation.plates` is Phase 2-canonical; align code to the spec)

- Treat `artifact:foundation.plates` as the **single canonical** tile-space derived view of Foundation tectonic truths (Foundation-owned; derived-only; deterministic).
  - Contract reference: `plans/morphology/spec/PHASE-2-CONTRACTS.md` (`artifact:foundation.plates`)
- Delete any alternative plate-tensor publishing surfaces besides `artifact:foundation.plates` (avoid multiple competing tile views).
- Ensure consumers (Morphology + any Gameplay annotation logic) read `artifact:foundation.plates` rather than re-deriving tile views ad hoc.
- Lock the Foundation projection config semantics used to derive `artifact:foundation.plates` (defaults, normalization, determinism) in docs and keep it single-sourced (no duplicate per-consumer knobs).

### Stamping/projection migrations (bring code in line with Phase 2)

- Remove engine/projection fields embedded in physics truth artifacts (migrate to `artifact:map.*` + `effect:map.*Plotted`):
  - Example legacy: `artifact:morphology.topography.terrain` “engine terrain id per tile” (remove from physics truth; derive/stamp in map steps).
- Ensure all stamping receipts are expressed as short boolean `effect:map.<thing>Plotted` asserted by granular `plot-*` steps (no versioning/receipts/hashes).

### Topology migrations (remove dead optionality)

- Ensure wrap is treated as invariant everywhere:
  - wrapX always on; wrapY always off; no env/config knobs.
  - Delete any optional/wrap-flagged code paths and configuration surfaces that try to support non-wrapping maps.

### Acceptance criteria (Phase 3 slice is “done” when…)

- `artifact:foundation.plates` is produced once in Foundation and consumed consistently (no duplicate tile projection implementations across Morphology steps).
- No Morphology physics step requires overlays or `artifact:map.*` / `effect:map.*` as inputs.
- All engine writes happen only in steps that own the corresponding `effect:map.*Plotted` guarantees.
