# Agent B Scratchpad (Phase 2 locked posture)

## Interim decisions (log as we go)

- Interpret “Physics truth may be tile-indexed” literally: `tileIndex` is allowed in truth artifacts and op inputs/outputs; the ban is on **engine ids / adapter coupling** and on **consuming** `artifact:map.*` / `effect:map.*` inside Physics.
- Treat the “truth vs map projection/materialization” boundary as a *contract rule*, not a style preference:
  - Physics: publish truth artifacts; never `requires`/consumes `artifact:map.*` or `effect:map.*`.
  - Gameplay/map: owns `artifact:map.*` and must provide `effect:map.<thing>Plotted` after adapter writes.
- Guardrail implementation posture: make the map/effect boundary lint runnable pre-commit by **scoping** the guardrail checks so they don’t fail due to unrelated existing checks.
  - Concrete implementation: introduce `DOMAIN_REFACTOR_GUARDRAILS_PROFILE` in `scripts/lint/lint-domain-refactor-guardrails.sh`.
    - Default `boundary` profile is what `pnpm check` runs and must pass today.
    - Optional `full` profile keeps stricter checks for Phase 3 / reviewer-driven enforcement.

## Current blockers / sharp edges

- `DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full` still fails for `ecology` on strict checks (`Runtime config merges in ops`, exported JSDoc enforcement). This is intentional for now; do not fix Ecology code as part of the boundary posture work.
- Need a reliable way to identify “Physics steps” in code for linting:
  - If steps have an explicit `phase`/tag, use it.
  - If not, we need an agreed classification/registry (or a deterministic heuristic) to avoid false positives/negatives.

## Next actions

- Update shared workflow docs + prompts to make the boundary posture loud (tileIndex allowed; map/effect consumption banned in Physics; adapter coupling banned).
- Rescope `scripts/lint/lint-domain-refactor-guardrails.sh` so a “boundary-only” run is available and passes on mainline, while preserving stricter checks behind an explicit flag.
  - Done: boundary profile passes with no env var; full profile remains strict/possibly failing until underlying code is cleaned.

## What changed (summary)

- Updated boundary language in shared workflow docs:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md` clarifies `tileIndex` is allowed in truth; bans are engine/adapter coupling and consuming `artifact:map.*` / `effect:map.*` in Physics.
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md` removes any implication that “downstream compat shims” are an acceptable technique; migration+deletion is in-slice.
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-3-implementation-plan.md` repeats the `tileIndex` allowance explicitly in the global cutover posture.
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md` documents the new guardrail script profile.
- Made the guardrail lint runnable pre-commit by scoping:
  - `scripts/lint/lint-domain-refactor-guardrails.sh` now defaults to `DOMAIN_REFACTOR_GUARDRAILS_PROFILE=boundary` (passes today; runs in `pnpm check`).
  - `DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full` keeps the stricter checks for later/Phase 3.

## How to run the guardrail locally (before commit)

- Fast/pre-commit (what `pnpm check` runs): `pnpm lint:domain-refactor-guardrails`
- Domain-scoped pre-commit: `REFRACTOR_DOMAINS="morphology" pnpm lint:domain-refactor-guardrails`
- Stricter mode (expected to fail today for some domains): `REFRACTOR_DOMAINS="ecology" DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full pnpm lint:domain-refactor-guardrails`

## Remaining sharp edges / needs owner decision

- “Physics step” mechanical detection is not wired yet. Full enforcement of “Physics steps must not consume `artifact:map.*` / `effect:map.*`” will need either:
  - an explicit phase classification that cleanly separates Physics vs Gameplay, or
  - a step registry/metadata source the lint script can consume without heuristics.
