# Agent scratch — Formatting/readability pass (tables → YAML)

## What I changed

- Added/strengthened “NOT CANONICAL” banners on historical/draft/process docs to make `spec/` obviously authoritative.
- Removed/avoided stale non-`-gpt` spike filename references; linked Phase 1 → Phase 0.5 directly.
- Converted two high-signal tables/lists to compact YAML blocks (phase index + Morphology output contract matrix) without changing meaning.
- Added an explicit note that canonical tags are `artifact:<ns>.<name>` / `effect:<...>`; treated `artifacts.map.*` as historical wording when quoted verbatim.
- Added `plans/morphology/debates/README.md` to state debates are not canonical and `spec/` wins.

## Status

- Done.

## Files edited in this pass

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/MORPHOLOGY.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-addendum-full.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-addendum-braided-map-projection-draft.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-lockdown-plan.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-greenfield-gpt.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-current-state-gpt.md`

## Scope
- Improve readability of the in-scope Phase 2 Morphology docs.
- Convert suitable Markdown tables to small YAML blocks (sparingly).
- Fix readability traps called out in `debates/phase2-final-verification/agent-structure.scratch.md`.

## Notes
