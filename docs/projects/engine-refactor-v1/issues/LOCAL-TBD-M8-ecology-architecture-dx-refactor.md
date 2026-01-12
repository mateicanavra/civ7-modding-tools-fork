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

## TL;DR
- Mechanically align Ecology’s **domain module**, **stage**, and **steps** to be the repo’s canonical exemplar for the current SDK DX architecture:
  - `defineDomain/createDomain` (U20)
  - step-declared ops + runtime injection (`run(ctx, config, ops)`) (U18)
  - import boundaries + enforceable guardrails (U19 + follow-ups; U21 docs-only)
- Tighten and (crucially) *execute* lint/guardrails so Ecology’s boundary rules are enforceable and copy/paste-safe.
- Explicitly **do not** fix Ecology domain modeling in this issue; modeling refactors are deferred and tracked as out-of-scope follow-ups.

## Context & goal

### What changed in the SDK / DX stack (relevant summary)
This issue is scoped to M8’s DX architecture changes (reconstructed in the spike):
- **U18 — Step-declared ops**: step contracts declare ops (`contract.ops`), compilation derives schema/envelopes/defaults, runtime injects a typed `ops` surface into `run(ctx, config, ops)`.
- **U19 — Domain module boundary + guardrails**: reinforces “contracts vs runtime” entrypoint separation and begins encoding allowed import edges via lint/guardrails.
- **U20 — Domain authoring primitives**: `defineDomain(...)` (contract-only entrypoint) + `createDomain(...)` (runtime entrypoint) to make domains match `defineStep/createStep` ergonomics.
- **U21 — Artifacts DX**: docs-only in this stack; Ecology can’t be the artifacts exemplar without landing U21 implementation work.

### Where Ecology sits today (evidence)
Ecology is already *mostly aligned* with U18/U20 patterns, and is the obvious candidate to be the canonical exemplar:
- **Domain contract entrypoint**: `mods/mod-swooper-maps/src/domain/ecology/index.ts` (`defineDomain(...)`)
- **Domain runtime entrypoint**: `mods/mod-swooper-maps/src/domain/ecology/ops.ts` (`createDomain(...)`)
- **Stage**: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/index.ts` (uses `createStage({ public, compile, steps })`)
- **Steps**: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/{contract.ts,index.ts}` (uses `defineStep` + `createStep`, step-declared ops)
- **Recipe compile wiring**: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` imports runtime entrypoint `@mapgen/domain/ecology/ops` and uses `collectCompileOps(...)`.

### Goal
Make Ecology the strict, first-class reference implementation for the current SDK architecture and DX:
- domains: entrypoints + export posture + import discipline
- stages/steps: contract vs runtime structure + step-declared ops usage
- guardrails: lint + scripts that prevent boundary drift

## Goals / non-goals

### Goals
- Ecology step contracts import domain schemas/types via **`@mapgen/domain/ecology` only** (no deep imports).
- Recipe compilation imports Ecology runtime ops via **`@mapgen/domain/ecology/ops` only** (never via the contract entrypoint).
- Ecology’s contract entrypoint posture is explicit and enforceable (no accidental runtime pulls through re-exports).
- Guardrails are strong *and actually run* in the standard verification loop (`pnpm check`, CI).

### Non-goals (hard boundaries)
- No domain-modeling refactor (config ownership/composition, step boundary naming, cross-domain config reuse).
- No behavior changes to mapgen output; changes are mechanical (imports/layout/guardrails/DX ergonomics).
- No new domain/stage concepts or architecture redesign; align with what U18/U19/U20 landed.

## Target architecture posture (Ecology as exemplar)

### Import discipline (author-facing rules)
**Step contract files** (`mods/**/src/recipes/**/stages/**/steps/**/contract.ts`):
- Allowed:
  - `@swooper/mapgen-core/authoring` (`defineStep`, `Type`, etc.)
  - `@mapgen/domain/ecology` (contract entrypoint only)
  - Other contract-safe deps (TypeBox, etc.) as already used by the authoring model
- Forbidden:
  - Any deep import under `@mapgen/domain/ecology/**` (e.g. `@mapgen/domain/ecology/types.js`, `.../biome-bindings.js`)
  - Any runtime entrypoint (`@mapgen/domain/ecology/ops` or deeper)

**Step runtime files** (`mods/**/src/recipes/**/stages/**/steps/**/index.ts`):
- Must not import domain runtime ops; runtime ops arrive via the injected `ops` param.

**Recipe compilation surfaces** (recipe/stage compile wiring):
- Allowed:
  - `@mapgen/domain/ecology/ops` (runtime entrypoint)
- Forbidden:
  - `@mapgen/domain/ecology` (contract entrypoint) in recipe compilation roots (prevents contract/runtime cycles and keeps import intent obvious).

**Tests** (decision: architecture-exemplar posture)
- Target posture: tests should preferentially exercise Ecology via public surfaces (`@mapgen/domain/ecology`, `@mapgen/domain/ecology/ops`, and stage/step entrypoints) unless a test is explicitly marked “internal op unit test”.
- This issue should decide whether to:
  - **Option A (strict exemplar)**: apply the same import restrictions to `mods/**/test/**/*.ts` (recommended for the exemplar tests), or
  - **Option B (mixed)**: allow deep relative imports for op-level unit tests but add guardrails for any tests that are meant to demonstrate the public authoring surface.

### Contract entrypoint export posture (pick and codify)
Ecology should adopt a **curated contract-safe export posture**:
- Keep the entrypoint “boring” and predictable:
  - `default export` = `defineDomain({ id, ops })`
  - explicitly-exported contract-safe schemas/types/constants that step contracts need
- Avoid `export *` from arbitrary modules (it’s too easy to accidentally pull runtime-only code later).

This is consistent with the review direction in `docs/projects/engine-refactor-v1/reviews/REVIEW-M8.md` (“protect the contract-only invariant long-term”) while still preserving step-authoring DX (single import path).

## In-scope architecture/DX changes (implementation plan)

### 1) Fix Ecology step-contract deep import (single-entrypoint usage)
- Update `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts`:
  - Replace `@mapgen/domain/ecology/biome-bindings.js` import with `@mapgen/domain/ecology`.
- Audit for any other `@mapgen/domain/ecology/**` deep imports from step contract layers and migrate to the entrypoint export surface.

### 2) Tighten ESLint restrictions for domain deep imports (step contracts + recipe compilation)
Update `eslint.config.js` to encode the import discipline above:
- **Step contracts**:
  - Forbid `@mapgen/domain/*/*` deep imports (message should point to `@mapgen/domain/<domain>`).
  - Keep (or simplify) the existing bans for `@mapgen/domain/*/ops*` (runtime ops) in contracts.
  - Ensure Ecology becomes the canonical example for the new rule (add a quick “why” message).
- **Recipe compilation roots** (`mods/**/src/recipes/**/recipe.ts` and any other compile entrypoints, if applicable):
  - Replace the ecology/placement hard-coded `paths` restriction with a generalized rule:
    - forbid `@mapgen/domain/*` contract entrypoints in recipe compilation roots
    - allow only `@mapgen/domain/*/ops` for domain imports there
- **Stale/out-of-date lint cleanup**:
  - Reconcile any rule messages or patterns that still assume U19’s `.../contracts` entrypoints as canonical (U20 superseded that mental model).

### 3) Ensure lint actually runs on the mod codepaths we care about
Right now, most `turbo run lint` tasks run `eslint .` inside packages; that may not lint `mods/**` at all.

Make lint enforcement real by choosing one (or both) mechanisms:
- **Option A (preferred)**: add a mod-level lint task:
  - add `mods/mod-swooper-maps/package.json` script `lint: "eslint ."`
  - add it to the Turbo pipeline so `pnpm lint` runs it
- **Option B (guardrail fallback)**: extend `scripts/lint/lint-domain-refactor-guardrails.sh` with a stricter check for Ecology step-contract deep imports:
  - detect `@mapgen/domain/ecology/*` deep imports in `mods/**/src/recipes/**/stages/ecology/**/contract.ts`
  - (optionally) detect `@mapgen/domain/*/*` deep imports for any refactored domain’s stage roots

### 4) Enforce contract-entrypoint export posture for Ecology
Mechanical refactor (no behavior change) to make Ecology the exemplar:
- Change `mods/mod-swooper-maps/src/domain/ecology/index.ts` to avoid `export *` re-exports and instead export only named, contract-safe items required by step contracts (schemas/types/constants).
- Add lint guardrails for domain entrypoint files (scoped to `mods/**/src/domain/**/index.ts`) to prevent:
  - importing runtime-only modules
  - `export *` (if we decide that posture should be enforced mechanically)

### 5) Optional: mechanical DX polish in Ecology stage/steps (behavior-preserving)
Non-modeling-only cleanups that improve the exemplar quality without changing semantics:
- Remove redundant explicit types where inference already provides the intended types (post-U18/U20 typing improvements).
- Standardize import ordering and local file surface patterns (contract-only files stay contract-only; runtime files stay runtime-only).

## Sequencing / pre-work (recommended order)
1) Baseline verification (before any tightening): ensure `pnpm check`, `pnpm test`, `pnpm build`, `pnpm deploy:mods` are green.
2) Add guardrails first (lint/grep), ideally in warn mode or as “new checks with known violations” to reduce surprise.
3) Fix Ecology contract imports and entrypoint exports to satisfy the guardrails.
4) Decide and apply the test posture (strict exemplar vs mixed) and update tests accordingly.
5) Tighten guardrails to error mode and ensure they run in the default verification loop.

## Verification & guardrails

### Lint / guardrails
Minimum:
- `pnpm check` (includes `pnpm lint:domain-refactor-guardrails`)
- `pnpm lint` (after ensuring mods are included via Option A above, or equivalent)

Targeted guardrail spot-checks:
- `rg -n \"@mapgen/domain/ecology/\" mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/contract.ts` (expect zero hits after alignment)
- `rg -n \"\\.\\./\\.\\./src/domain/ecology\" mods/mod-swooper-maps/test` (track and reduce deep relative imports if we adopt strict test posture)

### Tests (must stay green)
- `pnpm test`
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`

Targeted tests to pay attention to:
- Ecology step tests (e.g. `mods/mod-swooper-maps/test/ecology/biomes-step.test.ts`)
- Ecology op contract tests (e.g. `mods/mod-swooper-maps/test/ecology/op-contracts.test.ts`)

Optional targeted additions (architecture-only):
- Add a small lint/guardrail-style test (or script-level check) that asserts step-contract files cannot import `@mapgen/domain/*/*` deep paths.
  - Prefer lint/guardrail scripts over runtime tests for import discipline.

### Build & deploy
- `pnpm build`
- `pnpm build:mapgen`
- `pnpm -C mods/mod-swooper-maps build`
- `pnpm deploy:mods` (Turbo deploy for mods)
- `pnpm -C mods/mod-swooper-maps deploy` (mod-local deploy command)

Manual high-level verification after deploy:
- Mod deploy completes successfully and the mod loads.
- Standard recipe compile/runtime does not throw (smoke-run any map generation entrypoint that exercises the Ecology stage).

## Out of scope: deferred modeling work (do not do here)
These are modeling/ownership concerns; track as separate follow-ups. Source of truth is the spike:
- Step naming boundary smell: `features-plan` (see `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/**`)
- Cross-domain config coupling: Narrative importing Ecology config shapes (see `mods/mod-swooper-maps/src/domain/narrative/config.ts`)
- Nested config composition in `mods/mod-swooper-maps/src/domain/ecology/config.ts`

Reference: `docs/projects/engine-refactor-v1/resources/SPIKE-ecology-dx-alignment.md`

## Links & references
- Source spike: `docs/projects/engine-refactor-v1/resources/SPIKE-ecology-dx-alignment.md`
- Stack review: `docs/projects/engine-refactor-v1/reviews/REVIEW-M8.md`
- Target architecture/spec (SDK authoring + recipe compile):
  - `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md`
  - `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md`
- M8 issue docs:
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U18-step-ops-binding-dx.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U19-domain-module-registry-pattern.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U20-domain-authoring-defineDomain_createDomain.md`
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U21-artifacts-step-owned-deps.md`
- Modeling spec (for the deferred items only): `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- Relevant guardrail script: `scripts/lint/lint-domain-refactor-guardrails.sh`
