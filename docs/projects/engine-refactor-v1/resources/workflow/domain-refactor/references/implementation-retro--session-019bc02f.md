# Implementation Retro (Session `019bc02f-caf0-7141-90f9-9050eaf907b3`)

Purpose: extract the reusable workflow pattern from a real refactor session and identify where implementation friction occurred, then translate that into concrete workflow hardening suggestions (prep + implementation).

Source: Codex session `019bc02f-caf0-7141-90f9-9050eaf907b3` (morphology vertical domain refactor + follow-on stack/PR fixes and map tuning).

---

## Session Analysis: Morphology vertical domain refactor (plus PR-comment follow-ups)

### Primary goal
- Deliver a vertical domain refactor for `morphology` using the contract-first ops + orchestration-only steps architecture, as a Graphite stack of slices, ending pipeline-green and guardrail-clean.
- Follow-on: address PR review threads safely (via fix branches inserted into the stack), then proceed to map-level tuning tasks that depended on the refactor work.

### Workflow pattern (what actually happened)

1. Load authority + establish scope
   - Inputs: Phase 1/2 spikes, Phase 3 issue doc slice plan, workflow refs, and any “locked decisions” refs.
   - Invariant: treat legacy behavior as non-sacred unless a constraint demands it.
2. Setup worktree + baseline gates
   - Worktree created for the milestone, with path-guard applied before edits.
   - Quality gate: baseline `REFRACTOR_DOMAINS=... ./scripts/lint/lint-domain-refactor-guardrails.sh` and package checks runnable in the chosen environment.
3. Implement slices end-to-end (repeat)
   - Extract ops → wire step modules → delete legacy → add tests → update docs → run guardrails → commit.
   - Invariant: no partial slices; each slice ends pipeline-green; no dual paths unless explicitly deferred with a trigger.
4. Manage cross-worktree dependencies and indexing
   - Decision point: when to consult Civ7 resources / use Narsil (primary worktree only) vs operate entirely inside the milestone worktree.
5. Submit stack + handle review feedback
   - Decision point: fix-now vs defer per PR thread.
   - Invariant: do not mutate already-submitted branches when a fix branch is safer; insert a new branch into the stack.
6. Resume safely after interruptions
   - Quality gate: resume from a “last known good” checkpoint (branch + worktree + next action) rather than re-deriving state from memory.

---

## Extracted invariants (session-derived)

| Invariant | How discovered | Enforcement mechanism to add |
|---|---|---|
| **Graphite-first for mutating git actions** (branch/stack/submit); avoid raw `git` for stack mutation | User correction after stack/worktree loss and metadata risk | Add a Phase 0 “tooling posture” preflight + an Implementation “stop sign” callout; optionally a hook rule to flag `git commit`, `git rebase`, `git reset` in refactor sessions |
| **Do not touch the core adapter unless explicitly required** | User correction (“don’t fuck with the core adapter”) | Add as a Phase 3 locked decision + a slice guardrail (rg gate on adapter touchpoints) |
| **Rules are policy units; strategies must not become dumping grounds** | User correction (strategy vs rules) | Add an Implementation checklist item (“policy diff must live in rules/”) and require a “rules index” per op |
| **Schema/contract authoring must match the canonical pattern** (top-level options were repeatedly misapplied) | User correction after a drift incident | Add an explicit “schema authoring do/don’t” mini-reference and a guardrail scan (see “Hardening changes”) |
| **Per-slice resumability is required** (work can be lost / sessions interrupted) | Worktree/branch loss + “continue from where you left off” prompts | Add a per-slice checkpoint protocol (commit/push + short state block) and keep the milestone worktree alive until merge |

---

## Decision points that caused real friction

| Decision | Criteria | Options | Where it belongs |
|---|---|---|---|
| “Fix-now vs defer” for PR comments | Is the comment blocking correctness/architecture? | Fix now in a new fix branch; or defer with an explicit trigger | Implementation / Phase 5 |
| “Where does this concern live?” (e.g., placement vs morphology; adapter vs ops) | Domain boundary + target architecture | Push downstream (gameplay/placement); keep ops pure; keep adapter stable | Phase 2/3 (lock) |
| “What is the intended semantics of an authored knob?” (example: `bandPairs`) | Schema defaults + existing usage + intended model | Specify semantics + examples + invariants; add a test | Phase 2/3 (prep), not ad hoc in Phase 4 |
| “Can we commit/push from this environment?” | Sandbox/permissions/tooling | If blocked: adjust environment before coding; otherwise proceed normally | Phase 0 preflight |

---

## Implicit agreements that had to be restated

- “Proceed end-to-end; don’t stop for confirmation unless there’s risk.”
- “Use code-intel when semantics matter; don’t guess intent from surface strings.”
- “Keep refactor work scoped to domain architecture; don’t drift into ‘make it work’ hacks.”

These being repeated suggests they should be converted into explicit Phase 0/Phase 4 checklist items rather than relying on the initial prompt.

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

### 3) Tooling/stack integrity issues (Graphite vs raw git, worktree loss)
- Symptom: worktree/branch state was lost and had to be recreated; later the user explicitly insisted on Graphite + `git-worktrees` and warned against resets.
- Root cause: missing/implicit preflight about “what git actions are allowed” + weak resumability checkpoints.
- **Prep:** Phase 0 should explicitly verify: Graphite is installed/usable, the intended stack branch exists, and the worktree lifecycle posture is “persistent until merge.”
- **Implementation:** add a “no destructive git” stop sign (no `git reset`, no rewriting submitted branches); mandate “fix branches inserted into stack” for review-thread fixes.

### 4) Resumability gaps (interruptions required the user to reconstruct state)
- Symptom: multiple “continue from where you left off” prompts; recovery relied on user-provided breadcrumbs.
- Root cause: missing a standard checkpoint block written by the agent after each commit / slice.
- **Implementation:** require a checkpoint after each slice commit (branch, worktree path, next action, gates run) and keep it inside the Phase 3 issue doc (Lookback 4/5).

### 5) Ambiguous semantics discovered late (example: `bandPairs`)
- Symptom: the agent had to reason publicly about intended semantics and edge cases mid-fix, risking a wrong interpretation.
- Root cause: semantics were not locked in Phase 2/3 as an explicit decision with examples/tests.
- **Prep:** Phase 2/3 must include a “knob semantics table” for any non-trivial authored config fields, with at least one “golden” example per knob.
- **Implementation:** when you discover a semantic ambiguity, stop and push it back into the issue doc as a locked decision + add a minimal deterministic unit test before continuing.

---

## Hardening changes to apply to the workflow (actionable edits to existing docs)

This is a “patch list” (what to add), grouped by where it belongs.

### Prep phase additions (Phase 0–3)

1. Phase 0 (Setup): add an explicit “tooling posture preflight”
   - Confirm whether the environment can: (a) commit/push, (b) run `gt` commands, (c) access Civ7 resources + Narsil indexing constraints.
   - If any are blocked, fix the environment before starting implementation.
   - Target docs to update:
     - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
     - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md` (as a short preface to the slice loop)
2. Phase 2/3: add a “knob semantics table”
   - For each authored config field with non-obvious meaning (like boundary pairs), record: semantics, defaults, edge cases, and the test that locks it.
3. Phase 3: elevate “adapter stability” and “domain boundary placements” into explicit locked decisions
   - Write them as bans + guardrails (rg/test) so they cannot drift during Phase 4.
   - Target doc to update:
     - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-3-implementation-plan.md` (template section)

### Implementation phase additions (Phase 4/5)

1. Per-slice checkpoint protocol (mandatory)
   - After each slice commit: record `branch`, `worktree path`, `next action`, and gates run.
   - Target docs to update:
     - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md`
2. “Rules vs strategy” gate
   - Before committing: ensure any policy/decision logic is in `rules/**` units and the strategy reads as orchestration.
3. “No destructive git” stop sign + review-thread fix posture
   - Never rewrite submitted branches; use a fix branch inserted into the stack for PR comment fixes.
   - Target doc to update:
     - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`
4. Add fast local guardrails for common drift
   - Extend slice checklist to run a tiny set of `rg` checks in addition to the existing guardrail script (to catch the “known traps” earlier).
   - Target doc to update:
     - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`

---

## Copy/paste checklists (draft)

### Phase 0: Tooling posture preflight (draft)

Before starting Phase 4 implementation, confirm:
- Graphite is the mutating interface (`gt` usable); avoid raw `git` for stack mutation.
- Worktree posture is “persistent until merge”.
- You know how Narsil + Civ7 resources are accessed (primary worktree constraints).
- You can run at least the domain guardrail script in your current environment.

Suggested commands (non-mutating):
```bash
git status
gt ls
git worktree list
command -v gt gh pnpm rg
```

If any of the above are unavailable or the environment cannot commit/push, fix that *before* you start Phase 4 work (do not “code anyway and hand off manual commits” unless explicitly choosing that posture in the issue doc).

### Phase 4: Per-slice checkpoint block (draft)

After each slice commit + push, record a checkpoint in the Phase 3 issue doc:

```txt
Slice <S?> checkpoint
- Branch: <branch>
- Worktree: <abs path>
- Next: <one sentence>
- Gates: REFRACTOR_DOMAINS="<...>" ./scripts/lint/lint-domain-refactor-guardrails.sh; <package checks run>
- Notes: <any drift/decisions; link to guardrails/tests added>
```

---

## Recommended artifact type

- [x] Documentation (implementation hardening retro + copy/paste checklists)
- [ ] Slash command
- [ ] Skill
- [ ] Hook rule

Generalization note: the hardening points above generalize beyond morphology; the examples came from this session, but the workflow changes should be applied to *all* domain refactor implementations.
