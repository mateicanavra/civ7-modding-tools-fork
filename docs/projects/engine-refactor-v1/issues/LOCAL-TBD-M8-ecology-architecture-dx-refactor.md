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
- Documentation-as-code (enforced for touched code):
  - Any touched step/op schema (especially config/behavioral properties) gets high-quality, context-aware `description` fields (object + properties) that explain behavioral outcomes and relationships (not just types).
  - Any touched rule/strategy/helper function gets JSDoc that explains what/why/edge behaviors and how it fits into mapgen flow (where non-obvious).
  - Enforcement must be mechanical and scoped (see Implementation Details): lint/guardrails should make it hard to “forget” docs when touching contracts/schemas/rules.
- Make tests “canonical by default” (but not over-restricted):
  - Update Ecology-focused tests (at minimum `mods/mod-swooper-maps/test/ecology/**`) to prefer public import surfaces (`@mapgen/domain/<domain>`, `@mapgen/domain/<domain>/ops`) where feasible.
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
- [ ] Documentation-as-code is enforced for touched sites:
  - [ ] Any touched step contract schema and any touched op contract/config schema has meaningful `description` fields (object + properties) that explain behavioral impact and interactions.
  - [ ] Any touched exported function in Ecology step runtime/helpers and Ecology ops rules/strategies has JSDoc (what/why/edge behaviors).
  - [ ] Lint/guardrails are updated so missing docs in the “contract-like” surfaces are caught by default workflows (or the doc adds a documented, intentional exception).
- [ ] Deferred modeling refactors are not touched (see Deferred section in Implementation Details).
- [ ] Tests follow the “canonical by default” posture:
  - [ ] Any remaining deep/internal imports in Ecology-focused tests (`mods/mod-swooper-maps/test/ecology/**`, plus any touched shared test helpers) have a short rationale comment in the file (example format in Implementation Details).
  - [ ] A short guideline note exists documenting this posture in `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md`.

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
- Documentation (enforcement):
  - `pnpm lint` (must fail when required doc surfaces are missing docs, once rules land)
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

## Sequencing (in-memory sub-issues)

1. **Enforcement rails (lint + guardrails + doc rules)**
   - Add/adjust eslint restrictions for step contracts + recipe compile roots, plus scoped `export *` enforcement and docs-as-code requirements.
   - Update `scripts/lint/lint-domain-refactor-guardrails.sh` for Ecology deep-import detection.
   - References: [Documentation-as-code (enforced requirement)](#documentation-as-code-enforced-requirement), [Step 1 — Make enforcement real](#step-1--make-enforcement-real-lint--guardrails), [Step 3.1 — Enforce “no export *”】【#step-3-1--enforce-no-export--where-it-is-dangerous-scoped-lint).

2. **Ecology contract surface alignment**
   - Replace the known deep import in the biomes step contract and curate Ecology’s contract entrypoint exports.
   - References: [Step 2 — Fix deep import + entrypoint](#step-2--fix-the-known-deep-import--align-entrypoint-exports), [Ecology contract entrypoint — required curated exports](#ecology-contract-entrypoint--required-curated-exports-consumer-driven).

3. **Tests + docs posture normalization**
   - Update Ecology-focused tests to use public domain entrypoints where feasible; add rationale comments for any deep imports that remain.
   - Add the “tests posture” guideline note to the enforcement spec doc.
   - References: [Step 3 — Normalize tests](#step-3--normalize-tests-canonical-by-default-exceptions-allowed), [Tests import posture — deep import inventory + replacements](#tests-import-posture--deep-import-inventory--replacements), `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md`.

4. **Optional DX polish (only if safe)**
   - Apply low-risk, behavior-preserving import/type cleanups in Ecology step/stage files if they support the exemplar goal.
   - References: [Step 4 — Optional mechanical DX polish](#step-4--optional-mechanical-dx-polish-only-if-safe).

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

### Architecture diagram (wiring + import boundaries)
This diagram is scoped to the mechanical architecture/DX alignment only (not domain modeling).

```mermaid
flowchart TB
  %% Consumers
  subgraph Recipe["Recipe compilation (compile map)"]
    R["/mods/mod-swooper-maps/src/recipes/standard/recipe.ts\n(and any compile roots)"]
  end

  subgraph Stage["Ecology stage (createStage)"]
    S["/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/index.ts"]
    Steps["/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**"]
    SC["step contract.ts (defineStep)"]
    SR["step runtime index.ts (createStep)"]
  end

  subgraph Domain["Ecology domain module"]
    DC["@mapgen/domain/ecology\n(contract entrypoint; defineDomain)\n/mods/mod-swooper-maps/src/domain/ecology/index.ts"]
    DO["@mapgen/domain/ecology/ops\n(runtime entrypoint; createDomain)\n/mods/mod-swooper-maps/src/domain/ecology/ops.ts"]
    Impl["op implementations\n/mods/mod-swooper-maps/src/domain/ecology/ops/**"]
  end

  %% Allowed edges (enforced)
  SC -->|imports contract surface only| DC
  R -->|imports runtime surface only| DO
  DO --> Impl

  %% Runtime binding (U18)
  SR -->|run(ctx, config, ops)\nops injected from compiled ops map| DO
  S --> Steps
  Steps --> SC
  Steps --> SR
```

### Expected file structure (external-facing exemplar)
This is the *intended* visible structure for Ecology-as-exemplar (domain + equivalent stage). It intentionally does not describe internals of each file beyond its “surface role”.

**Public import surfaces (the “outside”):**
- `@mapgen/domain/ecology` → `mods/mod-swooper-maps/src/domain/ecology/index.ts`
- `@mapgen/domain/ecology/ops` → `mods/mod-swooper-maps/src/domain/ecology/ops.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/index.ts` is the stage’s public entrypoint.

```text
mods/mod-swooper-maps/src/
  domain/
    ecology/
      index.ts          # contract entrypoint (defineDomain + curated contract-safe exports; no value `export *`)
      ops.ts            # runtime entrypoint (createDomain)
      types.ts
      biome-bindings.ts
      config.ts         # config schemas (exported via index.ts only if step contracts need them)
      shared/           # internal helpers/types shared across ops
        ...
      ops/              # per-op modules (contracts + implementations)
        index.ts
        contracts.ts
        <op-name>/
          contract.ts
          index.ts
          rules/
            ...
          strategies/
            ...

  recipes/
    standard/
      stages/
        ecology/
          index.ts       # stage entrypoint (createStage { public, compile, steps })
          steps/
            index.ts     # step registry (exports `steps.<name>`)
            <step-name>/
              contract.ts  # contract surface (defineStep) — contract-only imports
              index.ts     # runtime surface (createStep) — ops injected; no domain runtime imports
              apply.ts?    # optional runtime helper
              inputs.ts?   # optional runtime helper
              diagnostics.ts? # optional runtime helper
              helpers/?    # optional runtime helper folder
                ...
```

### Contract entrypoint export posture (decision)
#### Curated contract-safe exports (Ecology)
- **Context:** Step contracts must import only from `@mapgen/domain/ecology`, but they still need access to schema/types/constants like `BiomeEngineBindingsSchema`.
- **Options:**
  - (A) `export *` re-exports for convenience (max DX, weakest boundary discipline).
  - (B) Curated named exports only (good DX, enforceable contract-only invariant).
- **Choice:** (B) Curated named exports only; no `export *` in `mods/mod-swooper-maps/src/domain/ecology/index.ts`.
- **Rationale:** Aligns with `docs/projects/engine-refactor-v1/reviews/REVIEW-M8.md` “protect the contract-only invariant long-term” while keeping step-authoring imports single-entrypoint.
- **Risk:** Requires occasional entrypoint updates when step contracts need a new schema/type; mitigated by keeping the entrypoint small and explicit.

### Documentation-as-code (enforced requirement)
This issue treats documentation as part of “done” whenever we touch:
- TypeBox schemas (step schemas, op config schemas, strategy schemas)
- Contract-like surfaces (step contracts, op contracts, contract entrypoints)
- Rules/strategies/helpers that materially affect mapgen behavior

#### Context-first docs workflow (required)
Before writing/updating JSDoc or schema descriptions:
- Use code intel (symbols/references/call graph) to understand how the thing is used and what behavior it drives.
- Inspect adjacent code and the data products (fields/artifacts/effects) it reads/writes.
- Then write docs that explain behavior and interactions, not just types.

#### Enforcing “docs when touched” without global doc spam
We can’t automatically detect “touched in this PR” perfectly, but we can enforce the highest-value doc surfaces:
- Require JSDoc (or explicit, documented exceptions) on exported functions in Ecology ops rules/strategies and step helpers when they are part of the stable authoring surface.
- Require meaningful `description` fields on TypeBox schema objects/properties in contract-like files.

Implementation detail in this issue: add scoped ESLint/guardrails rules that apply only to the contract-like surfaces for Ecology (and ideally generalized to migrated domains), rather than a blanket repo-wide JSDoc mandate.

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

**Documentation requirement (lightweight; no new test surface yet):**
- Add a short guideline note documenting this posture (“canonical by default; deep imports allowed only when necessary and documented”) in:
  - `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md`

### Step 3.1 — Enforce “no export *” where it is dangerous (scoped lint)
**Decision:** enforce “no value `export *`” only in file types where it is high-risk for contract/public surfaces; do not ban it globally.

Scope targets (examples; confirm with prework scan):
- Step contract files:
  - `mods/**/src/recipes/**/stages/**/steps/**/contract.ts`
- Domain op contract-ish files:
  - `mods/**/src/domain/**/ops/**/contract.ts`
  - `mods/**/src/domain/**/ops/**/types.ts`
  - `mods/**/src/domain/**/ops/**/index.ts` (note: allow `export type *`; ban value `export *`)
  - `mods/**/src/domain/**/ops/**/rules/**`
  - `mods/**/src/domain/**/ops/**/strategies/**`

Non-targets for now:
- Domain contract entrypoints (`mods/**/src/domain/**/index.ts`): keep Ecology curated (no `export *`) as the exemplar, but do not enforce via lint until we see broader patterns/false positives.

### Step 4 — Optional mechanical DX polish (only if safe)
**Goal:** make Ecology maximally copy/paste-able as the exemplar without changing behavior.

Allowed edits (examples only; do not add behavior):
- Remove redundant explicit types where inference is already correct post-U18/U20.
- Normalize import ordering and keep contract files contract-only.

### Prework Results (Resolved)
#### Tests import posture — deep import inventory + replacements
Non-canonical imports (bypass intended `@mapgen/domain/...` surfaces) that can switch to public import entrypoints now:
- `mods/mod-swooper-maps/test/ecology/classify-biomes.test.ts`
  - replace `../../src/domain/ecology/ops/classify-biomes/index.js` → `import ecology from "@mapgen/domain/ecology/ops"` and use `ecology.ops.classifyBiomes`
  - replace `../../src/domain/ecology/types.js` → `import { biomeSymbolFromIndex } from "@mapgen/domain/ecology"`
- `mods/mod-swooper-maps/test/ecology/extremes-regression.test.ts`
  - replace `../../src/domain/ecology/ops/*/index.js` → `import ecology from "@mapgen/domain/ecology/ops"` and use `ecology.ops.{classifyBiomes,planVegetation,planWetlands}`
- `mods/mod-swooper-maps/test/ecology/plot-effects-owned-snow.test.ts`
  - replace `../../src/domain/ecology/ops/plan-plot-effects/index.js` → `import ecology from "@mapgen/domain/ecology/ops"` and use `ecology.ops.planPlotEffects`
  - replace `../../src/domain/ecology/types.js` → `import { BIOME_SYMBOL_TO_INDEX } from "@mapgen/domain/ecology"`
- `mods/mod-swooper-maps/test/ecology/op-contracts.test.ts`
  - replace `../../src/domain/ecology/ops.js` → `import ecology from "@mapgen/domain/ecology/ops"`
  - replace `../../src/domain/ecology/types.js` → `import { BIOME_SYMBOL_TO_INDEX } from "@mapgen/domain/ecology"`

Already canonical (keep as-is):
- `mods/mod-swooper-maps/test/ecology/*features-*.test.ts`, `mods/mod-swooper-maps/test/ecology/biomes-step.test.ts` already import `@mapgen/domain/ecology/ops`.
- `@mapgen/domain/config` imports (e.g., `FoundationDirectionalityConfigSchema`) already use the intended surface.

Deep imports that appear required today (not exported via a contract entrypoint; OK, but should be treated as “exception, not norm” and documented inline if we touch the file):
- Foundation runtime helpers used by tests:
  - `@mapgen/domain/foundation/plates.js`, `@mapgen/domain/foundation/constants.js`, `@mapgen/domain/foundation/plate-seed.js`
  - Rationale: `@mapgen/domain/foundation` (contract entrypoint) currently exports only `./types.js`, not these runtime helpers.
- Narrative/story helper entrypoints used by tests:
  - `@mapgen/domain/narrative/*/index.js` (e.g. overlays/orogeny/paleo/corridors)
  - Rationale: `mods/mod-swooper-maps/src/domain/narrative/index.ts` currently exports no public surfaces beyond the domain contract default export.
- Hydrology adapter types used by tests:
  - `@mapgen/domain/hydrology/climate/index.js` (type-only)
  - Rationale: `mods/mod-swooper-maps/src/domain/hydrology/index.ts` currently exports no public surfaces beyond the domain contract default export.

Optional low-churn improvement if we touch the files anyway:
- In foundation tests, replace type-only deep import `@mapgen/domain/foundation/types.js` → `@mapgen/domain/foundation` (foundation contract entrypoint already re-exports `./types.js`).

Documentation target (pick now; implement later in this issue as a small doc-only patch):
- Choose Option A: `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md`
  - Add a short “Tests” note under `## Import boundaries` clarifying:
    - tests should prefer the same public import surfaces as app code
    - deep imports are allowed when necessary, but should be explicit/intentional (comment or eslint disable) so it can’t become a silent backdoor
    - lint/guardrails should not treat tests as a hard architectural boundary in the same way as runtime step contracts

#### “No value export *” lint scope scan (avoid churn)
Prework scan results (value exports only; `export type *` is intentionally excluded):
- No `export * from ...` occurrences exist today in the intended enforcement scopes:
  - `mods/**/src/recipes/**/stages/**/steps/**/contract.ts`
  - `mods/**/src/domain/**/ops/**/{contract,types,index}.ts`
  - `mods/**/src/domain/**/ops/**/{rules,strategies}/**`
- `export type * from ...` is already used extensively in op `index.ts` files (e.g. `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes/index.ts`) and is safe/desirable because it cannot leak runtime values.

Lint implementation implication (must be explicit in this issue’s implementation):
- Use an AST selector that bans only value export-star, not type export-star:
  - selector: `ExportAllDeclaration[exportKind='value']`
  - message: “Do not use value `export *` in contract/public-surface files; use named exports. (`export type *` is OK.)”

Churn avoidance note:
- `export *` does exist in non-target barrels (e.g. `mods/mod-swooper-maps/src/domain/config.ts`, `mods/mod-swooper-maps/src/domain/ecology/index.ts`), and in other mods (e.g. `mods/mod-swooper-civ-dacia/src/*/index.ts`), so the lint rule must stay tightly scoped to the file globs above.

#### Ecology contract entrypoint — required curated exports (consumer-driven)
When converting `mods/mod-swooper-maps/src/domain/ecology/index.ts` away from `export *`, keep the surface sufficient for all current cross-module consumers:
- Step contracts and step helpers under `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**` currently depend on:
  - default export: `ecology` domain contract (`defineDomain({ id: "ecology", ops })`)
  - `BiomeEngineBindingsSchema` (currently deep-imported; must be imported from `@mapgen/domain/ecology` after this issue)
  - Types/constants/helpers from `mods/mod-swooper-maps/src/domain/ecology/types.ts`:
    - `BiomeSymbol`, `BIOME_SYMBOL_ORDER`, `BIOME_SYMBOL_TO_INDEX`, `biomeSymbolFromIndex`
    - `FeatureKey`, `FEATURE_PLACEMENT_KEYS` (and optionally `FEATURE_KEY_INDEX` if we want to make usage consistent)
    - `PlotEffectKey`
  - Types from `mods/mod-swooper-maps/src/domain/ecology/biome-bindings.ts`:
    - `BiomeEngineBindings`

Guardrail for the implementer:
- After curating exports, run `pnpm -C mods/mod-swooper-maps check` to ensure there are no type-only consumer regressions in step contracts/helpers.

#### Lint/guardrail “blast radius” scan (generalized rules)
This issue proposes generalized enforcement (not hard-coded to Ecology), so we pre-scanned for unexpected churn:
- Step contract deep imports (`@mapgen/domain/<domain>/...`) across `mods/mod-swooper-maps/src/recipes/**/stages/**/steps/**/contract.ts`:
  - current hits: **1** (the known Ecology violation in `.../stages/ecology/steps/biomes/contract.ts`)
- Recipe compilation imports in `mods/mod-swooper-maps/src/recipes/**/recipe.ts`:
  - current imports are already runtime-only (`@mapgen/domain/ecology/ops`, `@mapgen/domain/placement/ops`)

## Deferred modeling work (explicitly out of scope)
Do not perform these here; create separate follow-up issues if needed:
- Step naming boundary smell: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/**`
- Cross-domain config coupling: `mods/mod-swooper-maps/src/domain/narrative/config.ts` importing Ecology config shapes
- Nested config composition in `mods/mod-swooper-maps/src/domain/ecology/config.ts`

Reference: `docs/projects/engine-refactor-v1/resources/SPIKE-ecology-dx-alignment.md`

## Implementation Decisions

### Enforce Ecology docs-as-code via guardrail script
- **Context:** The issue requires mechanical doc enforcement for contracts/helpers, but repo-wide ESLint/JSDoc enforcement would cause large churn outside Ecology.
- **Options:** (A) Add eslint-plugin-jsdoc and enforce across broader globs, (B) add Ecology-only guardrail checks for exported functions and contract schemas, (C) defer enforcement and rely on manual review.
- **Choice:** (B) Add Ecology-only guardrail checks in `scripts/lint/lint-domain-refactor-guardrails.sh` for exported function JSDoc and contract schema descriptions.
- **Rationale:** Keeps enforcement scoped to the exemplar domain while making doc regressions visible in default workflows.
- **Risk:** Guardrail checks are heuristic (file-level description presence) and may need tightening when expanding enforcement to other domains.
