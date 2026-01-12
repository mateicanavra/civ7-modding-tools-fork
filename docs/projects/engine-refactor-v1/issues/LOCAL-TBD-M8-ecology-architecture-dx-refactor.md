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

### Step 3 — Decide test posture (strict exemplar vs mixed)
**Purpose:** choose whether tests should be held to the same import boundary rules as step contracts.

Open Questions:
- Should we enforce the same `@mapgen/domain/*/*` restriction for:
  - `mods/mod-swooper-maps/test/**/*.ts`?
Options:
- (A) Strict exemplar: apply restrictions to tests; tests import from public entrypoints only.
- (B) Mixed: allow deep relative imports for op unit tests; add guidance and restrict only exemplar tests.

Prework Prompt (Agent Brief)
**Purpose:** inventory current deep imports in `mods/mod-swooper-maps/test/**` and categorize them.
**Expected Output:** list of files grouped by “public surface OK” vs “internal op unit test”.
**Sources to Check:**
- `rg -n "@mapgen/domain/" mods/mod-swooper-maps/test -S`
- `rg -n "\\.\\./\\.\\./src/domain/" mods/mod-swooper-maps/test -S`

### Step 3.1 — Enforce “no export *” posture (if desired)
Open Question:
- Should we enforce “no `export *`” in domain contract entrypoints via lint for `mods/**/src/domain/**/index.ts`?
Options:
- (A) Yes: enforce via ESLint `no-restricted-syntax` / `no-restricted-exports`-style checks (fast feedback, more rigidity).
- (B) No: keep as guidance + code review expectation (more flexibility, weaker guardrail).

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
