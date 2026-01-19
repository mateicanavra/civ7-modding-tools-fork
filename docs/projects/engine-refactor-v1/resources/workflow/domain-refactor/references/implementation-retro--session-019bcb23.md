# Implementation Retro (Session `019bcb23-188a-7260-8443-50247300e9bc`)

Purpose: extract transferable learnings from the Hydrology vertical domain refactor (including post-implementation corrections), and lock them into reusable guidance for upcoming domain refactors (especially Phases 0.5–3).

Source: Codex session `019bcb23-188a-7260-8443-50247300e9bc` (Hydrology domain refactor implementation + post-implementation workflow hardening).

---

## Summary: what changed our workflow thinking

- The refactor must be **model-first**: schemas + contracts + artifact definitions are canonical; implementations are replaceable.
- The workflow must keep **conceptual decomposition** (causality spine) distinct from **pipeline boundary count** (steps/stages), and explain how they relate.
- Configuration semantics must be locked as contracts, especially **knobs + advanced config composition** and any “semantic fields” with non-trivial meaning.
- “Convenience data” is a refactor hazard: consumer migration must be **contract-driven** (consume the right artifact), not convenience-driven.
- Execution success is posture, not heroics: slices ship end-to-end, pipeline-green, with deletions + docs/tests + guardrails as part of “done”.

---

## Locked resolutions (tensions we resolved explicitly)

### 1) Conceptual decomposition vs pipeline boundary count

Distinguish:
- **Conceptual decomposition:** the full causality spine (how the domain “works”).
- **Pipeline boundaries (steps/stages):** concrete interoperability boundaries in the pipeline (hooks, cross-domain contracts, braid/interleaving points).

Default posture:
- Pipeline boundaries should track real causality **when the boundary earns its keep** (contracts/hooks/interoperability/stability).
- Internal clarity splits are allowed and encouraged when they improve readability/authorability/testability/debuggability.

Guardrail:
- If internal clarity splits cause config/artifact sprawl, shared-config proliferation, or boundary-breaking imports/exports, the split is not worth it; collapse or regroup.

Public vs internal:
- Splitting does not imply “make it public.” Promote intermediates only when they “pay rent” (stable + needed by downstream); otherwise keep them internal-only and document that posture explicitly.

### 2) Single canonical body vs acceptable locality

Hard rule:
- **No duplicate canonical modeling/spec bodies** per deliverable. Secondary locations must be pointers/redirects.

Schema/JSDoc “duplication” rule:
- Do not maintain two sync-burden copies of the same description.
- Multiple descriptions are acceptable only when context-adapted (different context → different constraints/meaning → different text/shape). If you hit a limitation that seems to force copy/paste duplication, treat it as a modeling smell and revisit the model.

---

## Locked invariants / hard rules (broad, reusable)

- **Knobs + advanced config are one locked author contract:** advanced config is the typed/defaulted baseline; knobs apply last as deterministic transforms. Ban presence/compare-to-default gating.
- **No narrative overlays / story artifacts:** do not model, depend on, or introduce narrative overlays during this refactor phase. Any load-bearing overlay must be replaced with a canonical domain-anchored construct.
- **Stage ids are part of the author contract:** braid/interleaving constraints must be documented; stage ids must be semantic (avoid “pre/core/post”).
- **Defaults belong in schemas:** after schema validation/normalization, runtime “if undefined then fallback” is a smell; semantics must be centralized and test-locked.
- **No hidden multipliers/constants/defaults:** no unnamed behavior-shaping numbers embedded in compile/normalize/run paths; use author-facing config/knobs or named constants with explicit intent.
- **No placeholders / dead bags:** no empty directories/modules/bags or “future scaffolding”. Anything introduced temporarily during implementation must be explicitly removed by the end of Phase 3 slices (or be tracked as an explicit cleanup item when it is truly out-of-scope).
- **Execution posture:** each slice is end-to-end (migrations + deletions + docs/tests + guardrails), ends pipeline-green, and stops-the-line if a locked decision is threatened.

---

## What this retro should harden in Phases 0.5–3

### Phase 0.5 (greenfield)
- Name the causality spine and the intended “public vs internal” split early, before current-state pulls the model toward legacy convenience.
- Treat narrative overlays as out-of-scope; model canonical domain-anchored equivalents instead.

### Phase 1 (current-state)
- Inventory legacy surfaces and explicitly flag (a) overlay/story dependencies, (b) hidden multipliers/constants/defaults, and (c) placeholders/dead bags as “must remove” risks.

### Phase 2 (modeling)
- Make the contract surfaces explicit (public vs internal), including the knobs-last composition contract and any semantic-field default/empty/determinism rules.
- Provide a mapping from causality spine → ops grouping → step boundaries → published artifacts, explicitly marking what stays internal.

### Phase 3 (implementation plan)
- Plan slices as end-to-end, pipeline-green units; consumers migrate to canonical artifacts; deletions/cleanup are part of the slice definition of done.
- Document braid/interleaving constraints and semantic stage ids as part of the author-facing contract.

---

## Where the canonical, current guidance lives

This retro is a session artifact. The canonical rules and templates live here:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-0-greenfield-prework.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-1-current-state.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-2-modeling.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-3-implementation-plan.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`
