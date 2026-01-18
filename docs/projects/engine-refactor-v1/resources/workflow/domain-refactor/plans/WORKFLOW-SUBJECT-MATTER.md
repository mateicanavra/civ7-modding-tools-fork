# WORKFLOW: Domain Refactor Subject‑Matter + Multi‑Agent Synthesis Protocol

This document extracts the **subject‑matter workflow** we used to take a domain from “idea” → **Phase 0.5–2 spikes** → **Phase 3 slice plan**, including the added practice of **triangulating 3 alternate drafts per phase** and converging on a single synthesis.

It intentionally omits dev lifecycle mechanics (worktrees/Graphite/etc). It focuses on **how we reason about the domain** and **how we converge documents into a refactor package**.

## Primary goal

Produce an **unambiguous handoff package** for a vertical domain refactor where:
- Phase 2’s **authoritative model** is physics‑first and not “inherited from legacy,”
- Phase 3 is an **executable slice plan** derived from the model (no model drift),
- public configuration is “semantic knobs → normalized internal params,”
- authored “thumbs on the scale” mechanisms are either explicitly out of scope (banned) or moved downstream as separately owned shims.

## Package centralization (new rule)

For ease of access and canonicalization, the **domain refactor package lives under**:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/<domain>/`

The package directory should contain:
- Phase 0.5 drafts + synthesis
- Phase 1 drafts + synthesis
- Phase 2 drafts + synthesis
- Phase 3 plan drafts (if any) + synthesis notes (if any)
- An `INDEX.md` that points to the “final” synthesis docs and the Phase 3 issue doc(s)

If the workflow also requires “canonical deliverables” elsewhere (e.g., `resources/spike/`, `issues/`), treat those as **entrypoints** that link back to the package directory. The package directory remains the place you go to understand and review the domain refactor end‑to‑end.

### Naming and suffix conventions

Per phase, keep a 3‑draft set plus a synthesis:
- Base draft: `spike-<domain>-<phase>.md` (no suffix)
- Alternate drafts: `...-gpt-web.md`, `...-gemini.md` (or other consistent agent suffixes)
- Synthesis: `...-synthesis.md`

For Phase 3 planning drafts:
- `plan-<domain>-domain-refactor-<agent>.md`
- Prefer a single Phase 3 “issue doc” (plus child slice docs) as the executable handoff.

## Workflow pattern (phases 0.5–3)

This is the reusable subject‑matter sequence. Each step includes invariants and gates.

1. Phase 0: Setup (subject‑matter)
   - Establish the **authority stack**: what is canonical vs supporting.
   - Lock “posture” constraints up front (determinism, compat ownership, intervention bans).
   - Define explicit neighbor‑domain boundaries so later arguments have a stable frame.

2. Phase 0.5: Greenfield pre‑work spike (physics‑first sketch)
   - Model the domain as an earth system **from first principles**.
   - Identify internal subdomains only for organization (domain remains single‑owned).
   - Define the **causality spine** (directional, explainable; bounded feedback only).
   - Run the required **upstream + downstream “diff exercise”**:
     - Upstream: what exists today vs what the ideal model would want.
     - Downstream: what the domain should provide and what that unlocks.
   - Append Lookback 0.5: what you learned; what Phase 1 must verify.

3. Phase 1: Current‑state spike (evidence inventory)
   - Inventory the domain’s surfaces and wiring: steps, contracts, artifacts/buffers/overlays usage, config surfaces, callsites.
   - Produce a current contract matrix and a producer/consumer map grounded in file paths.
   - Add “greenfield delta notes” only as **constraints/contradictions**, not design proposals.
   - Append Lookback 1: what evidence invalidated assumptions; what Phase 2 must reconcile.

4. Phase 2: Modeling spike (authoritative target model)
   - Start from the Phase 0.5 sketch, refine using Phase 1 evidence.
   - Iterate the modeling loop at least twice until stable.
   - Lock the authoritative model, causality spine, and canonical contract surfaces.
   - Create the Config Semantics Table for all semantic knobs (meaning, missing/empty/null, determinism, tests).
   - Append Lookback 2: what stabilized; what Phase 3 must not change.

5. Phase 3: Implementation plan (slice plan derived from the spine)
   - Convert Phase 2’s deltas into slices; no “later buckets.”
   - Assign downstream consumer migrations slice‑by‑slice.
   - Convert locked decisions into guardrails and put them in the same slice that introduces them.
   - Stop at the pre‑implementation checkpoint: the issue doc is the handoff artifact.

## Extracted invariants (must be treated as laws)

| Invariant | Why it exists | How to enforce in docs |
| --- | --- | --- |
| No phase bleed | prevents “model drift” and mushy scope | each doc begins with scope guardrails + gate checklist |
| Phase 2 model is authoritative | projections and legacy should not define truth | Phase 3 must only reference Phase 2; no new model content |
| Projections never define internals | avoids compat shaping the system | explicit “representation policy” section in Phase 2 |
| Compat is forbidden inside the refactored domain | prevents permanent legacy coupling | any transitional shims are downstream‑owned + deprecated |
| Determinism is non‑negotiable | reproducible maps and debuggability | define determinism boundaries; test/scan for violations |
| No authored intervention inside physics domains (when locked) | keeps the value proposition of physics | classify any such mechanisms as legacy to delete or downstream‑own |
| Semantic knobs compile to normalized params | keeps authoring simple without breaking physics | Phase 3 must name the “knobs → normalize” boundary anchors |

## Decision points (where teams tend to drift)

| Decision | Criteria | Options |
| --- | --- | --- |
| Domain boundaries (who owns what) | causality + coupling + testability | move responsibility upstream/downstream vs keep in domain |
| What counts as a “semantic knob” vs “intervention” | is it intent or a forced outcome? | allow knob (intent) vs forbid (direct outcome override) |
| Which outputs are internal buffers vs external artifacts | mutability + ownership + consumers | buffer (mutable) vs artifact (stage contract snapshot) |
| What gets deferred | performance, data availability, implementation risk | defer with explicit triggers + downstream impact notes |

## Quality gates (what “done” means per phase)

The fastest way to avoid drift is to treat each phase as a checklist gate, not a narrative.

- Phase 0.5 gate: greenfield narrative + boundary sketch + upstream/downstream diff + open questions.
- Phase 1 gate: inventories + contract matrix + producer/consumer map + legacy surface inventory + greenfield delta notes.
- Phase 2 gate: authoritative model + diagrams + target contract matrix + semantics table + ledger (keep/kill/migrate).
- Phase 3 gate: slices are pipeline‑green + consumer migration matrix + guardrails mapped to enforcement.

## Multi‑agent synthesis protocol (3 drafts → one synthesis)

This is the repeatable convergence loop we used for each phase.

1. Collect drafts
   - Ensure you have three comparable drafts per phase (base + `-gpt-web` + `-gemini` or equivalent).
   - If a “draft” is actually empty or out of phase, treat it as an input constraint and record that in the synthesis.

2. Normalize and triage
   - Verify each draft respects the phase scope guardrails.
   - Identify “hard conflicts” with locked invariants (e.g., model drift, compat inside domain, authored overrides).
   - Rename files to suffix convention so reviewers can reason about provenance quickly.

3. Extract strengths/pitfalls (explicitly)
   - Make a short matrix of:
     - strongest sections to keep verbatim (if compatible),
     - missing but required content per the phase template,
     - incompatible assumptions to reject.

4. Write the synthesis (the only doc that matters downstream)
   - Start with: purpose + scope guardrails + authority stack.
   - Integrate only non‑conflicting strengths.
   - Add an explicit “rejected/anti‑patterns” section when a draft proposes drift‑inducing ideas.
   - End with the required lookback for the phase.

5. “Second pass” convergence (required)
   - Re‑read the synthesis against the phase template gate checklist.
   - Re‑check for any accidental phase bleed (most common failure mode).

6. Downstream handling of useful but incompatible ideas
   - If a draft contains a good engineering guardrail but has incompatible modeling assumptions:
     - integrate the guardrail in Phase 3 as an enforcement rule,
     - explicitly refute the incompatible modeling assumptions (do not quietly merge them).

## Implicit agreements worth making explicit (because they recur)

- “Realism-first” does not mean CFD; it means modeling the *right causal levers* (circulation, ocean coupling, orography, cryosphere, diagnostics) with bounded passes.
- “No authored thumbs on the scale” is compatible with “semantic knobs”: intent‑level knobs are allowed only if they compile into physics parameters without region-specific forced outcomes.
- If a new locked decision appears mid‑flight, stop and re‑baseline Phase 3 gates in the same slice.

## Recommended artifact type

This workflow should live as:
- Documentation (this file), plus
- a small per-domain `INDEX.md` inside each package directory that identifies the “final” synthesis artifacts.

