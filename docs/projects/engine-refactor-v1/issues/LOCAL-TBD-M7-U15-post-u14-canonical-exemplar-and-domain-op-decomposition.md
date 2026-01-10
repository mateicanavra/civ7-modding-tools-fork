---
id: LOCAL-TBD-M7-U15
title: "[M7] Canonical ecology domain refactor to target op/step architecture"
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
  - SPEC-step-domain-operation-modules
  - SPEC-DOMAIN-MODELING-GUIDELINES
  - docs/projects/engine-refactor-v1/resources/repomix/gpt-config-architecture-converged.md
  - ADR-ER1-030
  - ADR-ER1-034
  - ADR-ER1-035
---

## TL;DR
Make the **entire ecology domain** the canonical exemplar for the locked-in architecture:
- contract-first ops with strategy envelopes and a single `types.ts` type bag,
- op-local `rules/` + `strategies/` barrels and strict import direction rules,
- contract-first steps that orchestrate ops as action boundaries (no step-level planning),
- tests and guardrails proving correctness and preventing regressions.

This is a **full, comprehensive refactor** of ecology to match the target architecture and modeling guidelines.

---

## Dependency
- Requires the converged architecture implementation landed (contract-first ops, step contract/implementation split, bound step factory, and lint rules).

---

## Scope

### In scope
- Ecology domain modules:
  - `mods/mod-swooper-maps/src/domain/ecology/**`
  - `mods/mod-swooper-maps/src/domain/ecology/ops/**`
- Ecology steps and stage wiring:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/index.ts`
- Ecology tests and step integration coverage:
  - `mods/mod-swooper-maps/test/ecology/**`
  - `mods/mod-swooper-maps/test/layers/**` (or existing step harness paths)
- Guardrails:
  - `scripts/lint/lint-domain-refactor-guardrails.sh` (update required for new rules)

### Out of scope
- Recipe v2 compilation changes or new step execution engines.
- Stage-view/public-plane compilers or step/op binding DSLs.
- Cross-domain refactors (only ecology).

### Current ecology inventory (starting point)
Ops to migrate (current):
- `classify-biomes`
- `plan-vegetated-feature-placements`
- `plan-wet-feature-placements`
- `plan-aquatic-feature-placements`
- `plan-ice-feature-placements`
- `plan-plot-effects`
- `plan-reef-embellishments`
- `plan-vegetation-embellishments`
- `createLabelRng` (cross-op helper; promote to core SDK and delete local copy)

Steps to migrate (current):
- `steps/biomes/**`
- `steps/features/**`
- `steps/plot-effects/**`

---

## Target architecture (must match)

Follow the canonical architecture and modeling guides:
- `docs/projects/engine-refactor-v1/resources/repomix/gpt-config-architecture-converged.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`

Key non-negotiables:
- Ops use contract-first layout with `contract.ts`, `types.ts`, `rules/`, `strategies/`, `index.ts`.
- Rules never import op contracts and never export types.
- `types.ts` exports exactly **one** `OpTypeBag` type; callers index into it.
- Steps are action boundaries and use contract-first step API (`defineStep` + `createStepFor<TContext>()`).
- Steps call ops via `op.resolveConfig` + `op.runValidated` and do not bind or expose op internals.
- Shared utilities come from the core SDK packages (no new local copies of clamp/noise/etc.).

---

## Implementation plan

### 1) Ecology domain inventory + op catalog (modeling pass)
**Goal:** Map existing ecology logic into the target {step | op | strategy | rule} model.

Acceptance criteria:
- A concrete op catalog exists for ecology with ids, kinds, and responsibilities.
- Any mega-ops are split into focused ops with stable input shapes.
- Strategy usage is only for algorithmic variants with identical IO.
- Rule inventory exists per op (small, discrete units).

Notes:
- Use `SPEC-DOMAIN-MODELING-GUIDELINES.md` as the decision framework.
- Steps must be action boundaries (e.g., `plot-*`, `apply-*`, `publish-*`), not planning units.
  - Audit step IDs/filenames; rename any planning-named step to an action boundary and update all references.

#### Ecology op catalog (current + target mapping)

| Op id | Kind | Responsibilities | Step boundary |
|---|---:|---|---|
| `classify-biomes` | `compute` | Compute biome index + climate-derived ecology fields (temperature/moisture/aridity/freeze, vegetation density). Deterministic; no engine bindings. | `biomes` (applies/publishes) |
| `plan-vegetated-feature-placements` | `plan` | Plan baseline vegetated features (forest/rainforest/taiga/savanna/sagebrush). Deterministic; returns placements only. | `features` (applies) |
| `plan-wet-feature-placements` | `plan` | Plan baseline wet features (marsh/bog/mangrove/oasis/watering hole). Deterministic; returns placements only. | `features` (applies) |
| `plan-aquatic-feature-placements` | `plan` | Plan baseline aquatic features (reef/cold reef/atoll/lotus). Deterministic; returns placements only. | `features` (applies) |
| `plan-ice-feature-placements` | `plan` | Plan baseline ice features (sea ice). Deterministic; returns placements only. | `features` (applies) |
| `plan-reef-embellishments` | `plan` | Plan story-driven reef embellishments (paradise shelves) on top of baseline feature field. | `features` (applies) |
| `plan-vegetation-embellishments` | `plan` | Plan story-driven vegetation embellishments (volcanic halos + density tweaks) on top of baseline feature field. | `features` (applies) |
| `plan-plot-effects` | `plan` | Plan plot effects (snow/sand/burned) as a pure placement set. | `plotEffects` (applies) |

#### Ecology rule inventory (target)
- `classify-biomes`: temperature zoning, moisture zoning, aridity shifts, biome lookup, density/fields derivation.
- baseline feature placement ops: each op is single-concern with its own `rules/**`; avoid multi-concern “switchboard” planning in one module.
- `plan-reef-embellishments`: keep `rules/` for paradise/shelf planners and keep the strategy entry orchestration-only.
- `plan-vegetation-embellishments`: keep `rules/` for volcanic + density planners and keep the strategy entry orchestration-only.
- `plan-plot-effects`: keep `contract.ts` schema-only; do config resolution + selector normalization in the strategy entry.

## Implementation Decisions

### Split baseline feature placement into multiple ops (remove mega `plan-feature-placements`)
- **Context:** Baseline feature placement currently mixes multiple concerns (vegetated/wet/aquatic/ice) and grows a large orchestration surface.
- **Options:** (A) Keep a single baseline planning op and refactor into many rules; (B) Split into multiple focused ops with stable inputs/configs and let the `features` step orchestrate.
- **Choice:** (B) Split into focused ops: `plan-vegetated-feature-placements`, `plan-wet-feature-placements`, `plan-aquatic-feature-placements`, `plan-ice-feature-placements`.
- **Rationale:** Aligns with domain modeling guidance (multiple focused ops over mega-ops) and avoids a multi-concern switchboard plan module.
- **Risk:** Step becomes an orchestration point for multiple baseline ops; ordering between ops must be explicit and tested.

### Enforce “single type bag” per op `types.ts` by moving helper types out of op exports
- **Context:** Current ecology ops export extra types (e.g., `Resolved*Config`, `TempZone`, `MoistureZone`) from `types.ts` and domain `index.ts`, which conflicts with the locked-in “types.ts exports exactly one OpTypeBag” rule.
- **Options:** (A) Keep extra type exports for convenience; (B) Remove extra exports and re-derive needed types locally (via `OpTypeBag` indexing) or keep them local to steps/strategies.
- **Choice:** (B) Remove extra exports; update rules/steps to use `OpTypeBag` indexing or local types.
- **Rationale:** Makes ecology the canonical exemplar for the strict import/type-surface rules and reduces accidental type leakage.
- **Risk:** Requires touching multiple files and could surface implicit dependencies on removed exports.

### 2) Refactor ecology ops to canonical module layout
**Goal:** Every ecology op conforms to the canonical op module structure and import rules.

Required structure per op:
```
mods/mod-swooper-maps/src/domain/ecology/ops/<op-slug>/
  contract.ts
  types.ts
  rules/
    index.ts
    <rule>.ts
  strategies/
    index.ts
    <strategy>.ts
  index.ts
```

Acceptance criteria:
- `contract.ts` defines schemas only and imports from no rules/strategies.
- `types.ts` exports a **single** `OpTypeBag` type derived from the contract.
- `rules/**` only import types from `../types.js` (type-only) + core SDK helpers; no contract imports.
- `rules/index.ts` is the runtime barrel for rules (no type exports).
- `strategies/**` import the contract + rules barrel (and optionally `types.ts` for annotations).
- `strategies/index.ts` is the runtime barrel for strategies.
- `index.ts` calls `createOp` and re-exports `*` from `./contract.js` and `type *` from `./types.js`.
- All shared math/noise/RNG helpers come from `@swooper/mapgen-core` (or another core SDK package).
  - Promote `createLabelRng` to core SDK (mapgen-core) and update all ecology imports; remove `ops/rng.ts`.

### 3) Step refactor to contract-first action boundaries
**Goal:** Ecology steps use the new contract-first step model and remain action boundaries.

Acceptance criteria:
- Every ecology step has `contract.ts` and `index.ts` (implementation) plus `lib/**` if needed.
- `contract.ts` contains metadata only (`id`, `phase`, `requires`, `provides`, `schema`).
- `index.ts` uses `createStepFor<TContext>()` to attach `resolveConfig?` and `run`.
- Steps call ops via `op.resolveConfig` + `op.runValidated`; no direct rule/strategy imports.
- Step config uses `op.config` and/or op strategy envelopes directly (no custom plan envelopes).
- Step ids/labels reflect action boundaries; rename planning-labeled steps to `plot-*`/`apply-*`/`publish-*` and update all references.

### 4) Ecology domain index + exports
**Goal:** Ensure domain-level exports are coherent and minimal.

Acceptance criteria:
- `mods/mod-swooper-maps/src/domain/ecology/index.ts` exports only the public ops and domain config/types.
- No direct exports of rules or strategies.

### 5) Tests and guardrails
**Goal:** Lock correctness and prevent regression of the new architecture rules.

Acceptance criteria:
- Each ecology op has a contract test using `runValidated(..., { validateOutput: true })`.
- At least one integration test exercises the ecology step boundary through the recipe harness in `mods/mod-swooper-maps/test/layers/**`.
- Guardrail lint script enforces:
  - no `rules/** -> contract.ts` imports,
  - no type exports from helper modules,
  - op module layout adherence.

### 6) Spec/workflow alignment (ecology as exemplar)
**Goal:** Make ecology the canonical example across spec and workflow docs.

Acceptance criteria:
- Spec and workflow references point to the real ecology code paths.
- Any previous aspirational examples are replaced with ecology references where relevant.

---

## Hard boundaries (no legacy shims)
- Do not leave legacy op surfaces, alternate entrypoints, or step-specific bindings behind.
- Do not add compatibility branches to preserve old call patterns.
- Any old layout or ad-hoc exports must be removed once migrated.

---

## Verification (must be green)
- `./scripts/lint/lint-domain-refactor-guardrails.sh`
- `pnpm -C mods/mod-swooper-maps check`
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm -C mods/mod-swooper-maps build`
- `pnpm -C packages/mapgen-core build`
- `pnpm -C packages/civ7-adapter build`
- `pnpm deploy:mods`

### Exemplar scope
- Operations:
  - `mods/mod-swooper-maps/src/domain/ecology/ops/plan-vegetated-feature-placements/**`
  - `mods/mod-swooper-maps/src/domain/ecology/ops/plan-wet-feature-placements/**`
  - `mods/mod-swooper-maps/src/domain/ecology/ops/plan-aquatic-feature-placements/**`
  - `mods/mod-swooper-maps/src/domain/ecology/ops/plan-ice-feature-placements/**`
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

## Completion
- [x] 1) Ecology domain inventory + op catalog (modeling pass)
- [x] 2) Refactor ecology ops to canonical module layout
- [x] 3) Step refactor to contract-first action boundaries
- [x] 4) Ecology domain index + exports
- [x] 5) Tests and guardrails (op contract tests + lint guardrails)
- [x] 6) Spec/workflow alignment (ecology as exemplar)
- [x] Verification (must be green)
  - [x] `./scripts/lint/lint-domain-refactor-guardrails.sh`
  - [x] `pnpm -C mods/mod-swooper-maps check`
  - [x] `pnpm -C mods/mod-swooper-maps test`
  - [x] `pnpm -C mods/mod-swooper-maps build`
  - [x] `pnpm -C packages/mapgen-core build`
  - [x] `pnpm -C packages/civ7-adapter build`
  - [x] `pnpm deploy:mods`

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
- Update `scripts/lint/lint-domain-refactor-guardrails.sh` to:
  - enforce the hard path (uniform envelope config),
  - enforce domain boundary (no domain imports from recipes),
  - prevent reintroduction of legacy config merging or unknown bags.

- Update SPEC/workflow docs to point at the exemplar pipeline by file path.
  - Prefer real code references over aspirational examples.
  - Avoid duplicating raw `rg` checklists in docs; keep the guardrail script as the single must-run gate.

---
