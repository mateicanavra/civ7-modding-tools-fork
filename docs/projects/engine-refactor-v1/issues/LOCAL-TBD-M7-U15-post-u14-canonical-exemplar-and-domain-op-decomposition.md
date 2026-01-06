---
id: LOCAL-TBD-M7-U15
title: "[M7] Post-U14: canonical exemplar (ecology plan feature placements) + op/rules decomposition + SPEC/workflow catch-up"
state: planned
priority: 1
estimate: 16
project: engine-refactor-v1
milestone: M7
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to:
  - LOCAL-TBD-M7-U14
  - SPEC-step-domain-operation-modules
  - ADR-ER1-030
  - ADR-ER1-034
  - ADR-ER1-035
---

## TL;DR
After the U14 “hard path” migration (strategy-centric ops + uniform envelope config) lands, make one real, thick pipeline “perfect” and use it as the canonical exemplar:
- ecology `plan-feature-placements` op (thick, rules-heavy),
- its step wiring in the standard recipe,
- tests + guardrails + SPEC/workflow alignment pointing at this real code.

This issue intentionally lives **after** U14 so the exemplar is perfected in the final, strict model (no rework).

---

## Dependency
- Requires `LOCAL-TBD-M7-U14` completed and green.

---

## Canonical exemplar: ecology “plan feature placements” (thick op + step wiring)

### Exemplar scope
- Operation: `mods/mod-swooper-maps/src/domain/ecology/ops/plan-feature-placements/**`
- Step wiring: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/**`

### “Perfect” acceptance criteria (must all be true)

**Hard path compliance**
- Step config uses uniform envelope config shape for every op config:
  - `{ strategy: "<id>", config: <innerConfig> }`
- Step never treats op config as inner config without unwrapping.
- Strategy resolution is strategy-level and schema-preserving:
  - `strategy.resolveConfig(innerConfig, settings) -> innerConfig`

**Operation thickness + rules decomposition**
- `plan.ts` (or equivalent) is orchestration only: calls verb-forward rules modules and composes results.
- Feature-specific logic lives under `rules/**` (verb-forward names); no “feature switchboard” blobs in `plan.ts`.
- Rules are internal helpers; only the op contract is exported for steps.

**Boundary discipline**
- Op does not import recipe wiring, steps, adapters, engine IDs, or artifact publishers.
- Step owns apply-time conversion from semantic plan keys to engine IDs (if applicable).

**Determinism + validation**
- Op is deterministic for a fixed input/config (no ambient randomness).
- Op contract uses `runValidated(...)` as the only entrypoint from steps/tests.

---

## Required tests (add both)
1) **Op contract test**
   - Validate input/config/output using `runValidated(..., { validateOutput: true })`.
   - Assert minimal stable facts (shape + a few key properties), not brittle snapshots.

2) **Thin integration edge test**
   - Execute the ecology “features” step boundary at least once using existing pipeline harness patterns.
   - Goal: catch wiring mistakes between recipe -> step -> op -> apply boundary.

Use existing test conventions in `mods/mod-swooper-maps/test/**`; do not introduce a new test framework.

---

## Guardrails + docs catch-up
- Update `scripts/lint/lint-domain-refactor-guardrails.sh` only if necessary to:
  - enforce the hard path (uniform envelope config),
  - enforce domain boundary (no domain imports from recipes),
  - prevent reintroduction of legacy config merging or unknown bags.

- Update SPEC/workflow docs to point at the exemplar pipeline by file path.
  - Prefer real code references over aspirational examples.
  - Avoid duplicating raw `rg` checklists in docs; keep the guardrail script as the single must-run gate.

---

## Verification (must be green)
- `./scripts/lint/lint-domain-refactor-guardrails.sh`
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm -C mods/mod-swooper-maps build`
- `pnpm -C packages/mapgen-core build`
- `pnpm -C packages/civ7-adapter build`
- `pnpm deploy:mods`

