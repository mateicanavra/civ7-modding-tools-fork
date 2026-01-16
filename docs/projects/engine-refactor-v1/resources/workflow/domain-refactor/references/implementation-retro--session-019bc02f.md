# Implementation Retro (Session `019bc02f-caf0-7141-90f9-9050eaf907b3`)

Purpose: extract the reusable workflow pattern from a real refactor session and identify where implementation friction occurred, then translate that into concrete workflow hardening suggestions (prep + implementation).

Source: Codex session `019bc02f-caf0-7141-90f9-9050eaf907b3` (morphology vertical domain refactor + follow-on stack/PR fixes and map tuning).

---

## Session Analysis: Morphology vertical domain refactor (plus PR-comment follow-ups)

### Primary goal
- Deliver a vertical domain refactor for `morphology` using the contract-first ops + orchestration-only steps architecture, as a stack of slices, ending pipeline-green and guardrail-clean.
- Follow-on: address PR review threads, then proceed to map-level tuning tasks that depended on the refactor work.

### Workflow pattern (what actually happened)

1. Load authority + establish scope
   - Inputs: Phase 1/2 spikes, Phase 3 issue doc slice plan, workflow refs, and any “locked decisions” refs.
   - Invariant: treat legacy behavior as non-sacred unless a constraint demands it.
2. Clarify contract semantics for “semantic knobs”
   - For each ambiguous config field (lists/pairs/weights/defaults), write a one-line rule for: meaning, defaulting, empty/null behavior, and determinism expectations.
   - Quality gate: confirm the rule against at least two call sites/usages (and/or existing authored configs) before coding.
3. Implement slices end-to-end (repeat)
   - Extract ops → wire step modules → delete legacy → add tests → update docs → run guardrails → commit.
   - Invariant: no partial slices; each slice ends pipeline-green; no dual paths unless explicitly deferred with a trigger.
4. Place fixes for durability (not proximity)
   - Prefer fixing at stable interfaces that will survive the refactor (often a “config → normalized internal form” function or the domain boundary), not in code likely to move next slice.
   - Quality gate: ask “will this still apply after the next slice lands?” before committing a fix.
5. Handle review feedback (repeat)
   - Decision point: fix-now vs defer per PR thread.
   - Quality gate: thread-resolution loop is explicit (enumerate → classify → decide → implement → verify → reply → resolve).

---

## Extracted invariants (session-derived)

| Invariant | How discovered | Enforcement mechanism to add |
|---|---|---|
| **Do not touch the core adapter unless explicitly required** | User correction (“don’t fuck with the core adapter”) | Add as a Phase 3 locked decision + a slice guardrail (rg gate on adapter touchpoints) |
| **Rules are policy units; strategies must not become dumping grounds** | User correction (strategy vs rules) | Add an Implementation checklist item (“policy diff must live in rules/”) and require a “rules index” per op |
| **Schema/contract authoring must match the canonical pattern** (top-level options were repeatedly misapplied) | User correction after a drift incident | Add an explicit “schema authoring do/don’t” mini-reference and a guardrail scan (see “Hardening changes”) |
| **Semantic knobs require an explicit contract** (meaning + defaults + empty/null + determinism) | Repeated mid-implementation inference (call sites + existing maps) | Add a “config semantics table” deliverable in Phase 2/3; require a test per non-trivial knob |
| **Default vs explicit must be a policy, not an accident** | “Missing fields” vs “freeze behavior” ambiguity surfaced during explicitness work | Add a Phase 3 locked decision: “missing inherits evolving defaults” vs “explicit freezes”; document consequences |
| **Fix placement is chosen by stability, not proximity** | Fixes risked being neutralized by upstream refactors | Add a checklist item: “anchor fixes at stable interfaces”; require a survivability check before/after slice merges |

---

## Decision points that caused real friction

| Decision | Criteria | Options | Where it belongs |
|---|---|---|---|
| “Fix-now vs defer” for PR comments | Is the comment blocking correctness/architecture? | Fix now in a new fix branch; or defer with an explicit trigger | Implementation / Phase 5 |
| “Where does this concern live?” (e.g., placement vs morphology; adapter vs ops) | Domain boundary + target architecture | Push downstream (gameplay/placement); keep ops pure; keep adapter stable | Phase 2/3 (lock) |
| “What is the intended semantics of an authored knob?” (example: `bandPairs`) | Schema defaults + existing usage + intended model | Specify semantics + examples + invariants; add a test | Phase 2/3 (prep), not ad hoc in Phase 4 |
| “What does missing/empty mean?” | A field is absent, `[]`, or `null` | Treat as “use defaults”, “disable”, or “explicitly do nothing” | Phase 2/3 (lock) |
| “Are weights deterministic?” | Any field that implies randomness | Define RNG source/seed semantics and the layer randomness is allowed to live in | Phase 2/3 (lock) |
| “Where should this fix land to survive?” | Will a file/module be replaced next slice? | Anchor at stable boundary/normalization; avoid ephemeral implementation details | Implementation, with Phase 3 guidance |

---

## Implicit agreements that had to be restated

- “Proceed end-to-end; don’t stop for confirmation unless there’s risk.”
- “Use code-intel when semantics matter; don’t guess intent from surface strings.”
- “Keep refactor work scoped to domain architecture; don’t drift into ‘make it work’ hacks.”

These being repeated suggests they should be converted into explicit prep/implementation checklist items rather than relying on the initial prompt.

---

## What went wrong (and what to change)

Each item below is labeled as either:
- **Prep (Phase 0–3):** should be resolved before implementation starts, or
- **Implementation (Phase 4/5):** should be an explicit step/gate during coding.

### 1) Contract/schema authoring drift (top-level schema options)
- Symptom: contract/step schemas were authored with top-level options that were later called out as violating canonical architecture; this required retroactive fixes across already-touched files.
- Likely root cause: the “canonical example” surfaces were easy to misapply (and, in at least one place, read as conflicting guidance under time pressure).
  - The session included an explicit user correction: do not put `additionalProperties` (and do not put a top-level `{ default: ... }`) on top-level contract/schema objects.
  - Some reference docs/examples include `Type.Object(..., { additionalProperties: false })`, which is easy to treat as a sanctioned pattern unless the “top-level options” rule is surfaced right next to it.
- **Prep:** add a single “schema authoring cheat sheet” (do/don’t) and link it from Phase 3 issues as a mandatory reference.
- **Implementation:** add a guardrail scan run per slice (simple `rg` gates) that fails fast when forbidden schema options appear on top-level contract objects.

### 2) Strategies accumulating policy (rules vs strategy boundary)
- Symptom: decision/policy logic moved into a strategy `run` handler rather than being factored into `rules/**` units.
- Root cause: refactor pressure encourages “make the op work” inside one file; without a checklist, this boundary is easy to violate.
- **Prep:** in Phase 3, list “policy-heavy” areas and pre-plan the rule units you expect to create (even if rough).
- **Implementation:** add an explicit checklist item: “for every policy change, point to a rule file + its exported symbol; run handlers should read like orchestration.”

### 3) Ambiguous semantics discovered late (example: `bandPairs`)
- Symptom: the agent had to reason publicly about intended semantics and edge cases mid-fix, risking a wrong interpretation.
- Root cause: semantics were not locked in Phase 2/3 as an explicit decision with examples/tests.
- **Prep:** Phase 2/3 must include a “config semantics table” for any non-trivial authored config fields, with at least one “golden” example per knob.
- **Implementation:** when you discover a semantic ambiguity, stop and push it back into the issue doc as a locked decision + add a minimal deterministic unit test before continuing.

### 4) Default vs explicit ambiguity (missing fields vs frozen behavior)
- Symptom: making configs explicit surfaced a recurring question: are “missing fields” meant to inherit evolving defaults, or should explicitness freeze old behavior?
- Root cause: without an explicit policy, “explicitness passes” force implicit product decisions mid-implementation.
- **Prep:** Phase 3 should lock a policy for the domain (per field if needed): missing inherits vs explicit freezes; include examples and migration notes.
- **Implementation:** when a PR comment asks to “make X explicit”, require stating the policy (and its compatibility intent) before coding.

### 5) Determinism vs randomness (weights and probabilistic knobs)
- Symptom: “weights” imply probabilistic behavior, but without seed/RNG semantics defined, implementation forces assumptions about reproducibility and where randomness lives.
- Root cause: determinism expectations were not part of the knob’s contract.
- **Prep:** add determinism expectations to the config semantics table (seed source, stability requirements, allowed randomness layers).
- **Implementation:** add/extend at least one deterministic unit test that would fail if randomness semantics drift.

### 6) Fix placement durability (stable interface vs ephemeral detail)
- Symptom: fixes that were correct “today” risked being neutralized by later slices when they landed in code that was being replaced.
- Root cause: “fix near the bug” is tempting during stacked refactors; without a durability check, it creates rework/conflict tax.
- **Prep:** Phase 3 should identify stable anchor points (domain boundary, normalization functions) where fixes should preferentially land.
- **Implementation:** add a “survivability validation” step after each fix: confirm it’s not confined to a soon-to-be-moved/replaced layer.

---

## Hardening changes to apply to the workflow (actionable edits to existing docs)

This is a “patch list” (what to add), grouped by where it belongs.

### Prep phase additions (Phase 0–3)

1. Phase 2/3: add a “config semantics table”
   - For each authored config field with non-obvious meaning, record: semantics, defaulting rule, empty/null behavior, determinism expectations, and the test that locks it.
2. Phase 3: lock a “default vs explicit” policy (per knob, or per category of knobs)
   - Decide what “missing” means vs “explicit empty” means and document compatibility intent.
3. Phase 3: elevate “adapter stability” and “domain boundary placements” into explicit locked decisions
   - Write them as bans + guardrails (rg/test) so they cannot drift during Phase 4.
   - Target doc to update:
     - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-3-implementation-plan.md` (template section)
4. Phase 3: identify stable fix anchors
   - List the preferred “fix anchor points” (boundary/normalization functions) so review-driven fixes don’t land in ephemeral code.

### Implementation phase additions (Phase 4/5)

1. “Contract clarification” micro-step (mandatory when ambiguity exists)
   - Before coding a reviewer-flagged ambiguity, write the rule(s) and confirm against at least two usages.
2. “Rules vs strategy” gate
   - Before committing: ensure any policy/decision logic is in `rules/**` units and the strategy reads as orchestration.
3. Add “survivability validation” explicitly
   - After each fix, sanity-check it against the latest in-stack architecture (or at least ensure it isn’t confined to code being replaced next slice).
4. Make “PR comment resolution” a first-class loop
   - Enumerate threads → classify relevance → decide fix vs defer with trigger → implement → verify → reply → resolve.
5. Add fast local guardrails for common drift
   - Extend slice checklist to run a tiny set of `rg` checks in addition to the existing guardrail script (to catch the “known traps” earlier).
   - Target doc to update:
     - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`

---

## Copy/paste checklists (draft)

### Contract clarification micro-step (draft)

When you hit ambiguity (esp. from review), write this before coding:
```txt
Knob: <field name>
- Meaning: <1 line>
- Defaulting: missing => <...>
- Empty/null: []/null => <...>
- Determinism: <seed/RNG rule; where randomness allowed>
- Evidence: <two call sites/usages or examples>
- Lock: <test name/path>
```

### Config semantics table template (draft)

| Field | Meaning | Missing default | Empty/null | Determinism | Examples | Test that locks it |
|---|---|---|---|---|---|---|
| `<field>` | `<...>` | `<...>` | `<...>` | `<...>` | `<...>` | `<...>` |

### Survivability validation (draft)

Before calling a fix “done”, confirm:
- The fix is anchored at a stable interface (boundary/normalization), not an implementation detail being replaced next slice.
- The behavior is locked by at least one deterministic unit test when semantics are non-trivial.
- The “default vs explicit” policy is stated (and compatibility intent is clear) for any authorable config changes.

---

## Recommended artifact type

- [x] Documentation (implementation hardening retro + copy/paste checklists)
- [ ] Slash command
- [ ] Skill
- [ ] Hook rule

Generalization note: the hardening points above generalize beyond morphology; the examples came from this session, but the workflow changes should be applied to *all* domain refactor implementations.
