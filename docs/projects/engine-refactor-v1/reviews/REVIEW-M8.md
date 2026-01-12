---
milestone: M8
id: M8-review
status: draft
reviewer: AI agent
---

# Engine Refactor v1 — Milestone M8 Review

## Stack scope

Branches (downstack → upstack):
- `m7-ecology-behavior-fixes` (PR #452)
- `m8-u18-domain-modeling-spec-alignment` (PR #453)
- `m8-u18-step-op-binding-plan` (PR #454)
- `m8-u18-step-op-binding-impl` (PR #455)
- `m8-u18-step-op-binding-ecology-migration` (PR #456)
- `m8-u19-domain-module-registry-issue` (PR #457)
- `m8-u19-domain-module-registry-core` (PR #497)
- `m8-u19-domain-module-registry-domains` (PR #498)
- `m8-u19-domain-module-registry-stepops` (PR #499)
- `m8-u19-domain-module-registry-migrate` (PR #500)
- `m8-u19-domain-module-registry-lint` (PR #501)
- `m8-u19-domain-module-registry-opconfig` (PR #502)
- `m8-u19-domain-module-registry-tests` (PR #503)
- `m8-u20-domain-authoring-dx-issue` (PR #504)
- `m8-u21-recipe-compile-dx-playbook` (PR #506)
- `dev-local-tbd-m8-u20-domain-authoring` (PR #505)
- `dev-local-tbd-m8-u20-authoring-extended-step` (PR #507)

## Rolling summary (updated as branches are reviewed)

### Still relevant to fix
- TBD

### Fixed or superseded later in the stack
- TBD

## Branch-by-branch review

### `m7-ecology-behavior-fixes` — PR #452 (`fix(ecology): normalize moisture values and fix ocean temperature calculations`)

**Intent (inferred)**
- Patch ecology/placement behavior drift with targeted fixes plus regression tests.

**What landed**
- Fixes ocean plot temperature/freeze handling in biome classification and tightens moisture normalization.
- Adds a concrete regression test (`mods/mod-swooper-maps/test/ecology/extremes-regression.test.ts`) that should catch future drift.
- Adds a guardrail for floodplains config bounds (normalizes `minLength/maxLength`, ensures `maxLength >= minLength`).

**High-leverage notes**
- This is “milestone 8-adjacent”: it looks like prerequisite stabilization work rather than part of the M8 authoring/registry effort, but it meaningfully reduces noise for subsequent refactors.
- PR comments are effectively boilerplate (Graphite + automated Codex summary); no actionable concerns were raised.

### `m8-u18-domain-modeling-spec-alignment` — PR #453 (`docs(engine-refactor): align domain modeling + recipe-compile spec`)

**Intent (inferred)**
- Bring recipe-compile + domain modeling docs back into alignment before implementing U18/U19/U20 patterns.

**What landed**
- A large docs rewrite (adds an M7 architecture drift audit doc and significantly edits recipe-compile architecture docs).

**High-leverage notes**
- This is high-churn documentation change; it’s directionally useful, but it increases risk of “spec drift by edit”. Treat this as a new baseline and ensure later implementation PRs reference it consistently (they generally do).
- PR comments are boilerplate only.

### `m8-u18-step-op-binding-plan` — PR #454 (`docs(engine-refactor): draft step ops binding issue`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U18-step-ops-binding-dx.md`

**Quick take**
- Clear target outcome and acceptance criteria; good handoff artifact for the subsequent implementation PRs.

### `m8-u18-step-op-binding-impl` — PR #455 (`feat(authoring): add operation binding to step contracts`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U18-step-ops-binding-dx.md`

**Quick take**
- Mostly yes: `contract.ops` becomes the single source of truth for schema shape + compilation defaults/normalization + typed runtime ops injection.

**What’s strong**
- `defineStep(...)` auto-extends the step schema with op envelopes under stable keys, and rejects key collisions between author schema and `contract.ops`.
- Compiler path already does what U18 asked for: prefills op envelopes and normalizes them centrally (via `prefillOpDefaults` + `normalizeOpsTopLevel`).
- Runtime binding is centralized at recipe creation and failures are loud (throws `OpBindingError`), with a test proving the missing-runtime case.

**High-leverage issues**
- The runtime ops surface is “objects with `.run(...)`” rather than directly-callable functions (`ops.<key>(...)`). This is a small DX mismatch vs the issue’s narrative, but not a correctness problem.
- U18 acceptance calls out guardrails to prevent regression (lint/grep/checklist). This stack later adds lint guardrails under U19; no dedicated U18-specific guardrail exists.

**PR comments**
- The only non-Graphite signal is an automated Codex “review” stub with no actionable content.

### `m8-u18-step-op-binding-ecology-migration` — PR #456 (`refactor(ecology): migrate to step-declared ops pattern`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U18-step-ops-binding-dx.md`

**Quick take**
- Yes: ecology steps stop binding ops locally and instead declare ops in contracts + consume typed `ops` at runtime.

**What’s strong**
- Mod step implementations (ecology) switch to `run(context, config, ops)` and stop importing runtime op implementations.
- Adds/extends authoring tests to ensure `createRecipe` rejects missing runtime op implementations for step-declared ops.

**High-leverage issues (noted here; resolved later in stack)**
- Step contracts import `@mapgen/domain/ecology` (barrel). At this point in the stack, the “contracts vs runtime” module boundary isn’t yet enforced, so this can still accidentally pull runtime implementations. Later U19/U20 branches restructure the domain entrypoints and add lint guardrails; revisit after those land before taking action.
