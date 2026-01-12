---
id: LOCAL-TBD-M8-ECOLOGY-ARCH-DX
title: "[M8] Ecology architecture/DX refactor (canonical domain/stage/step exemplar)"
state: planned
priority: 1
estimate: 3
project: engine-refactor-v1
milestone: M8
assignees: []
labels: [architecture, dx, ecology]
parent: null
children: []
blocked_by: []
blocked: []
related_to:
  - LOCAL-TBD-M8-U18
  - LOCAL-TBD-M8-U19
  - LOCAL-TBD-M8-U20
  - LOCAL-TBD-M8-U21
  - LOCAL-TBD-M7-E
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Make Ecology the canonical domain/stage/step exemplar by enforcing strict import boundaries and using the U18/U20 authoring surfaces end-to-end.
- Make boundary discipline enforceable (ESLint + guardrails) so step contracts stay contract-only and recipe compilation stays runtime-only.
- Do **not** change Ecology domain modeling in this issue (explicitly deferred).

## Deliverables
- Fix the known Ecology step-contract deep import:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts` stops importing `@mapgen/domain/ecology/biome-bindings.js` and uses `@mapgen/domain/ecology` instead.
- Make the Ecology contract entrypoint safe + stable:
  - `mods/mod-swooper-maps/src/domain/ecology/index.ts` exports a curated, contract-safe surface sufficient for all Ecology step contracts (no `export *`).
- Make enforcement real in the default workflow:
  - `eslint.config.js`: step-contract deep-import restrictions + recipe compilation restrictions (generalized, not hard-coded to Ecology).
  - `mods/mod-swooper-maps/package.json`: add a `lint` script so `pnpm lint` actually lints mod sources.
  - `scripts/lint/lint-domain-refactor-guardrails.sh`: add a targeted Ecology step-contract deep-import check so `pnpm check` catches regressions even if a lint task is skipped.
- Make tests “canonical by default” (but not over-restricted):
  - Update existing tests to prefer public import surfaces (`@mapgen/domain/<domain>`, `@mapgen/domain/<domain>/ops`) where feasible.
  - Allow deep/internal imports only when necessary, and require they are intentional (annotated + documented; see Implementation Details).
- Optional (behavior-preserving) DX polish in Ecology stage/steps (imports/layout/types only; no modeling changes).

## Acceptance Criteria
- [ ] Step contract imports are single-entrypoint only:
  - [ ] `rg -n "@mapgen/domain/ecology/" mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/contract.ts` returns **no hits**.
  - [ ] `pnpm lint` passes with the updated ESLint restrictions in place.
- [ ] Recipe compilation uses runtime entrypoints only:
  - [ ] `eslint.config.js` restricts recipe compilation roots to `@mapgen/domain/*/ops` (and forbids `@mapgen/domain/*`).
  - [ ] `pnpm exec eslint mods/mod-swooper-maps/src/recipes/standard/recipe.ts` passes with the expected runtime imports.
- [ ] Mod lint runs in the repo’s default lint loop:
  - [ ] `pnpm -C mods/mod-swooper-maps lint` runs successfully.
  - [ ] `pnpm lint` includes `mod-swooper-maps#lint` in its Turbo task output.
- [ ] Guardrails enforce Ecology’s step-contract import boundary:
  - [ ] `pnpm lint:domain-refactor-guardrails` passes.
  - [ ] `scripts/lint/lint-domain-refactor-guardrails.sh` includes a check that fails if any Ecology step `contract.ts` imports `@mapgen/domain/ecology/*` (deep path).
- [ ] No behavior changes:
  - [ ] `pnpm test` remains green.
  - [ ] `pnpm build` and `pnpm deploy:mods` remain green.
- [ ] Deferred modeling refactors are not touched (see Deferred section in Implementation Details).
- [ ] Tests follow the “canonical by default” posture:
  - [ ] Any remaining deep/internal imports in `mods/mod-swooper-maps/test/**` have a short rationale comment in the file (example format in Implementation Details).
  - [ ] A short guideline note exists documenting this posture (path TBD in Implementation Details).

## Testing / Verification
- Baseline:
  - `pnpm check`
  - `pnpm lint`
  - `pnpm test`
- Targeted:
  - `pnpm exec eslint mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts`
  - `pnpm exec eslint mods/mod-swooper-maps/src/recipes/standard/recipe.ts`
  - `rg -n "@mapgen/domain/ecology/" mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/contract.ts`
  - `pnpm lint:domain-refactor-guardrails`
- Build/deploy smoke:
  - `pnpm build`
  - `pnpm build:mapgen`
  - `pnpm deploy:mods`
  - `pnpm -C mods/mod-swooper-maps deploy`

## Dependencies / Notes
- Source spike: `docs/projects/engine-refactor-v1/resources/SPIKE-ecology-dx-alignment.md`
- Related M8 issues:
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U18-step-ops-binding-dx.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U19-domain-module-registry-pattern.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U20-domain-authoring-defineDomain_createDomain.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U21-artifacts-step-owned-deps.md`
- Review anchor: `docs/projects/engine-refactor-v1/reviews/REVIEW-M8.md`
- Target architecture/spec:
  - `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md`
  - `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md`
- Modeling spec (for deferred items only): `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- Guardrail script: `scripts/lint/lint-domain-refactor-guardrails.sh`

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

Complexity × parallelism: medium complexity × low parallelism.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

<!-- Path roots -->
<!--
ENGINE_REFACTOR_V1 = docs/projects/engine-refactor-v1
SWOOPER_MOD = mods/mod-swooper-maps
-->

## Context & goal (tightened)

### Relevant SDK/DX changes this issue aligns to (M8)
- **U18 — Step-declared ops**: step contracts declare ops; runtime injects `ops` into `run(ctx, config, ops)`.
- **U19 — Boundary & guardrails**: contracts vs runtime entrypoints; enforce import edges.
- **U20 — Domain authoring**: `defineDomain` (contract entrypoint) + `createDomain` (runtime entrypoint).
- **U21 — Artifacts DX**: docs-only in this stack; do not treat Ecology as the artifacts exemplar until U21 implementation lands.

### Ecology’s current wiring touchpoints (evidence)
```yaml
files:
  - path: mods/mod-swooper-maps/src/domain/ecology/index.ts
    notes: Contract entrypoint (`defineDomain(...)`); currently uses `export *` for schema re-exports.
  - path: mods/mod-swooper-maps/src/domain/ecology/ops.ts
    notes: Runtime entrypoint (`createDomain(...)`).
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/ecology/index.ts
    notes: Stage entrypoint (`createStage({ public, compile, steps })`).
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts
    notes: Known deep-import violation (`@mapgen/domain/ecology/biome-bindings.js`).
  - path: mods/mod-swooper-maps/src/recipes/standard/recipe.ts
    notes: Recipe compilation imports runtime entrypoint `@mapgen/domain/ecology/ops`.
```

## Target posture (Ecology as the exemplar)

### Import discipline (layer rules)
**Step contract files** (`mods/**/src/recipes/**/stages/**/steps/**/contract.ts`):
- Allowed: `@mapgen/domain/<domain>` contract entrypoints only (e.g. `@mapgen/domain/ecology`).
- Forbidden: any deep import `@mapgen/domain/<domain>/*` (including `.../index.js`, `.../*.js`) and any runtime entrypoint `@mapgen/domain/<domain>/ops`.

**Recipe compilation roots** (entrypoints that call `collectCompileOps(...)` or build compile maps):
- Allowed: `@mapgen/domain/<domain>/ops` only.
- Forbidden: `@mapgen/domain/<domain>` contract entrypoints.

**Step runtime files**:
- Must not import domain runtime ops; runtime ops arrive via injected `ops` param (U18 invariant).

### Contract entrypoint export posture (decision)
#### Curated contract-safe exports (Ecology)
- **Context:** Step contracts must import only from `@mapgen/domain/ecology`, but they still need access to schema/types/constants like `BiomeEngineBindingsSchema`.
- **Options:**
  - (A) `export *` re-exports for convenience (max DX, weakest boundary discipline).
  - (B) Curated named exports only (good DX, enforceable contract-only invariant).
- **Choice:** (B) Curated named exports only; no `export *` in `mods/mod-swooper-maps/src/domain/ecology/index.ts`.
- **Rationale:** Aligns with `docs/projects/engine-refactor-v1/reviews/REVIEW-M8.md` “protect the contract-only invariant long-term” while keeping step-authoring imports single-entrypoint.
- **Risk:** Requires occasional entrypoint updates when step contracts need a new schema/type; mitigated by keeping the entrypoint small and explicit.

## Implementation plan (de-ambiguated, executable)

### Step 0 — Baseline and inventory (no changes)
Run and capture baseline output before tightening guardrails:
- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm deploy:mods`

Inventory and confirm the shape of the violations:
- `rg -n "@mapgen/domain/ecology/" mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps -S`
- `rg -n "collectCompileOps\\(" mods/mod-swooper-maps/src/recipes -S`
- `rg -n "from \"@mapgen/domain/" mods/mod-swooper-maps/src/recipes -S`

### Step 1 — Make enforcement real (lint + guardrails)
**Goal:** make regressions impossible to miss in the default repo workflows.

```yaml
files:
  - path: mods/mod-swooper-maps/package.json
    notes: Add `"lint": "eslint ."` so `pnpm lint` includes the mod.
  - path: eslint.config.js
    notes: Add/adjust `no-restricted-imports` for step contracts and recipe compilation roots.
  - path: scripts/lint/lint-domain-refactor-guardrails.sh
    notes: Add Ecology step-contract deep-import check (so `pnpm check` catches it).
```

**ESLint config requirements (precise):**
- Step contracts: extend the existing `files: [ .../contract.ts ]` block to forbid all deep imports:
  - forbid: `@mapgen/domain/*/*`
  - keep: forbidding `@mapgen/domain/*/ops*` (redundant with the above but clearer message is OK)
- Recipe compilation roots:
  - replace the hard-coded `paths` restrictions for Ecology/Placement with a generalized restriction:
    - forbid: `@mapgen/domain/*`
    - allow: `@mapgen/domain/*/ops`
- Stale/out-of-date lint cleanup:
  - remove any `@mapgen/domain/*/contracts` messages/patterns that no longer reflect the U20 entrypoint mental model (or update the message to be U20-accurate if we keep the restriction).

**Guardrail script requirements (precise):**
- In `scripts/lint/lint-domain-refactor-guardrails.sh`, inside the `if [ "$domain" = "ecology" ]; then ... fi` block:
  - add a check that fails if any file matching:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/contract.ts`
  - contains an import path matching:
    - `@mapgen/domain/ecology/` (domain + slash)
  - but does **not** fail for `@mapgen/domain/ecology` (no slash).

### Step 2 — Fix the known deep import + align entrypoint exports
**Goal:** make the code comply with the new rules without changing runtime behavior.

```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts
    notes: Replace deep import (`@mapgen/domain/ecology/biome-bindings.js`) with `@mapgen/domain/ecology`.
  - path: mods/mod-swooper-maps/src/domain/ecology/index.ts
    notes: Replace `export *` with named curated exports (contract-safe only).
```

Edge cases to watch:
- Avoid “fixing” deep imports by switching to `@mapgen/domain/ecology/index.js` (still a deep import).
- Ensure the Ecology contract entrypoint does not accidentally import/runtime-link to `ops.ts` or any op runtime implementation modules.

### Step 3 — Normalize tests (canonical by default; exceptions allowed)
**Decision:** tests should prefer the same import surfaces as “real” code, but may deep-import when actually necessary (and that exception must be intentional/documented).

**Rules (tests posture):**
- Default: tests import via public surfaces:
  - `@mapgen/domain/<domain>` for contract shapes/schemas
  - `@mapgen/domain/<domain>/ops` for runtime ops modules
- Allowed exception: deep/internal imports for tests that truly need internal access (e.g., tight unit tests around internal helpers or fixtures).
- Requirement when using a deep import: add a short rationale comment near the import (so it can’t become a silent backdoor), e.g.:
  - `// Deep import (test-only): needed for <reason>; no stable public surface exists yet.`

**Prework Prompt (Agent Brief)**
**Purpose:** inventory current deep imports in `mods/mod-swooper-maps/test/**` and identify which can be replaced with public-surface imports.
**Expected Output:** a categorized list:
- “Can switch to public imports now” (with suggested replacement import)
- “Keep deep import (required)” (with reason to record in-file)
**Sources to Check:**
- `rg -n "@mapgen/domain/" mods/mod-swooper-maps/test -S`
- `rg -n "\\.\\./\\.\\./src/domain/" mods/mod-swooper-maps/test -S`

**Documentation requirement (lightweight; no new test surface yet):**
- Add a short guideline note documenting this posture (“canonical by default; deep imports allowed only when necessary and documented”).
- Location (pick one; prefer the most local):
  - Option A: `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md`
  - Option B: `docs/system/libs/mapgen/` (only if we want it evergreen across projects)

### Step 3.1 — Enforce “no export *” where it is dangerous (scoped lint)
**Decision:** enforce “no `export *`” only in file types where it is high-risk for contract/public surfaces; do not ban it globally.

Scope targets (examples; confirm with prework scan):
- Step contract files:
  - `mods/**/src/recipes/**/stages/**/steps/**/contract.ts`
- Domain op contract-ish files:
  - `mods/**/src/domain/**/ops/**/contract.ts`
  - `mods/**/src/domain/**/ops/**/types.ts`
  - `mods/**/src/domain/**/ops/**/rules/**`
  - `mods/**/src/domain/**/ops/**/strategies/**`

Non-targets for now:
- Domain contract entrypoints (`mods/**/src/domain/**/index.ts`): keep Ecology curated (no `export *`) as the exemplar, but do not enforce via lint until we see broader patterns/false positives.

Prework Prompt (Agent Brief)
**Purpose:** find where `export *` exists today in the above scopes and confirm we won’t create high-churn lint violations.
**Expected Output:** list of existing `export *` occurrences + recommended scope globs for ESLint.
**Sources to Check:**
- `rg -n "^export \\* from" mods/mod-swooper-maps/src -S`

### Step 4 — Optional mechanical DX polish (only if safe)
**Goal:** make Ecology maximally copy/paste-able as the exemplar without changing behavior.

Allowed edits (examples only; do not add behavior):
- Remove redundant explicit types where inference is already correct post-U18/U20.
- Normalize import ordering and keep contract files contract-only.

## Deferred modeling work (explicitly out of scope)
Do not perform these here; create separate follow-up issues if needed:
- Step naming boundary smell: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/**`
- Cross-domain config coupling: `mods/mod-swooper-maps/src/domain/narrative/config.ts` importing Ecology config shapes
- Nested config composition in `mods/mod-swooper-maps/src/domain/ecology/config.ts`

Reference: `docs/projects/engine-refactor-v1/resources/SPIKE-ecology-dx-alignment.md`
