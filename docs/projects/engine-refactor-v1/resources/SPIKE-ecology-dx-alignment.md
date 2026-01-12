# SPIKE: Ecology DX alignment (canonical domain/stage/step exemplar)

## 1) Objective

Use **Ecology** as the canonical, first-class architectural exemplar for the current MapGen SDK authoring model:

- Domain module wiring (`defineDomain/createDomain`, contracts vs runtime entrypoints)
- Stage wiring (`createStage` surface schema + optional `public` + `compile`)
- Step wiring (`defineStep/createStep`, step-declared ops, runtime ops injection)
- Strict import discipline and enforceable module boundaries

This spike is about **mechanical/architectural alignment and DX**. It explicitly does **not** attempt to “fix Ecology modeling”.

## 2) Assumptions and unknowns

**Assumptions**
- “Local Linear issues” are represented in-repo as `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-*.md` and are the canonical mapping for this stack.
- The “recent SDK DX changes” are the current Graphite stack captured in `docs/projects/engine-refactor-v1/reviews/REVIEW-M8.md`.

**Unknowns (may matter for how strict we get)**
- How aggressively we want to prevent *any* deep imports under `@mapgen/domain/<domain>/*` outside domain modules (vs allowing some stable subpaths like `types`, `config`, etc.).
- Whether tests should be held to the same import constraints as production mod code (currently they are not linted the same way).

## 3) What changed in the SDK (reconstructed from the current stack)

Primary stack review and branch inventory:
- `docs/projects/engine-refactor-v1/reviews/REVIEW-M8.md`

### M8 U18 — Step-declared ops (contract-first ops binding)

**Branches**
- `m8-u18-step-op-binding-plan`
- `m8-u18-step-op-binding-impl`
- `m8-u18-step-op-binding-ecology-migration`

**Local issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U18-step-ops-binding-dx.md`

**What landed (relevant to Ecology as exemplar)**
- Step contracts can declare ops (`contract.ops`) and `defineStep(...)` derives the step schema to include op envelope configs under top-level keys matching the declared op keys.
- Step runtime gets a typed `ops` parameter injected by the authoring layer (no step-local binding; no step-local normalization helpers).
- Compiler/authoring surfaces enforce “compile-first” normalization and defaulting for op envelopes discovered via `contract.ops`.

Key SDK code:
- `packages/mapgen-core/src/authoring/step/contract.ts`
- `packages/mapgen-core/src/authoring/step/create.ts`
- `packages/mapgen-core/src/authoring/recipe.ts`

### M8 U19 — Domain module registry pattern (import boundary + guardrails)

**Branches**
- `m8-u19-domain-module-registry-issue`
- `m8-u19-domain-module-registry-core`
- `m8-u19-domain-module-registry-domains`
- `m8-u19-domain-module-registry-stepops`
- `m8-u19-domain-module-registry-migrate`
- `m8-u19-domain-module-registry-lint`
- `m8-u19-domain-module-registry-opconfig`
- `m8-u19-domain-module-registry-tests`

**Local issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U19-domain-module-registry-pattern.md`

**What landed (relevant to Ecology as exemplar)**
- A strict import boundary is treated as first-class: step contracts must not eagerly pull runtime op implementations.
- ESLint guardrails encode “allowed import edges” for recipes vs step contracts vs runtime layers.
- Op contract typing/config ergonomics are tightened (`defineOp` now derives the op envelope schema + default config from strategy schemas).

Key SDK code:
- `packages/mapgen-core/src/authoring/op/contract.ts`
- `eslint.config.js`

### M8 U20 — Domain authoring DX (defineDomain/createDomain + single-entrypoint ergonomics)

**Branches**
- `m8-u20-domain-authoring-dx-issue`
- `dev-local-tbd-m8-u20-domain-authoring`
- `dev-local-tbd-m8-u20-authoring-extended-step`

**Local issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U20-domain-authoring-defineDomain_createDomain.md`

**What landed (relevant to Ecology as exemplar)**
- Domains follow a consistent contract/runtime authoring pattern aligned with `defineStep/createStep`:
  - Contract entrypoint is `defineDomain({ id, ops })` (safe for step contract imports).
  - Runtime entrypoint is `createDomain(contract, implementations)` (used for recipe compile/runtime ops).
- `createStep` defaults its context type to `ExtendedMapContext`, removing the need for a mod-local `createStep` binder shim.

Key SDK code:
- `packages/mapgen-core/src/authoring/domain.ts`
- `packages/mapgen-core/src/authoring/step/create.ts`

### M8 U21 — Artifacts DX (documented; not implemented in this stack)

**Branches**
- `m8-u21-recipe-compile-dx-playbook`
- `harden-local-tbd-m8-u21-artifacts-issue`

**Local issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U21-artifacts-step-owned-deps.md`

**Status note**
- U21 is still docs-only; Ecology can’t be made the canonical artifacts exemplar without landing U21 implementation work.

## 4) Ecology today: how it’s wired (evidence-based)

### Domain module (contract vs runtime entrypoints)

**Contract entrypoint**
- `mods/mod-swooper-maps/src/domain/ecology/index.ts`
  - `default export`: `defineDomain({ id: "ecology", ops })`
  - re-exports: `./biome-bindings.ts`, `./types.ts` (see “import strictness” notes below)

**Runtime entrypoint**
- `mods/mod-swooper-maps/src/domain/ecology/ops.ts`
  - `default export`: `createDomain(domain, implementations)`

**Manifests**
- `mods/mod-swooper-maps/src/domain/ecology/ops/contracts.ts` (op contracts registry)
- `mods/mod-swooper-maps/src/domain/ecology/ops/index.ts` (op implementations registry)

This broadly matches the U20 target mental model.

### Stage module (public schema + compile mapping)

**Stage exemplar**
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/index.ts`

Notable properties:
- Uses `createStage({ id, knobsSchema, public, compile, steps })` and exercises the “Stage Option A” path (public schema + compile mapping).
- Public keys are camelCase mirrors of step ids, mapped to the internal kebab-case step ids in `compile` (per `LOCAL-TBD-M7-E3`).

### Steps (contract/impl separation + step-declared ops)

Ecology steps follow the intended pairing:
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/*/contract.ts` uses `defineStep({ ..., ops: { ...domain.ops.<op> }, schema })`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/*/index.ts` uses `createStep(contract, { run(context, config, ops) })`

Evidence example:
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`

### Recipe wiring (ops collection + createRecipe)

**Recipe**
- `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`

Notable properties:
- Collects compile ops via `collectCompileOps(ecologyDomain, placementDomain)` where `ecologyDomain` is imported from `@mapgen/domain/ecology/ops` (runtime entrypoint), aligning with the import boundary.

## 5) Gaps vs “Ecology as canonical exemplar”

This section splits findings into:
- **Architecture/DX alignment (actionable now)**
- **Ecology domain modeling refactor required (defer)**

### 5.1 Architecture/DX alignment gaps (actionable now)

1) **Step-contract deep import that violates the “single-entrypoint” intent**
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts` imports `BiomeEngineBindingsSchema` from `@mapgen/domain/ecology/biome-bindings.js`.
- The Ecology domain entrypoint already re-exports this schema, so this can become a single import from `@mapgen/domain/ecology`.

2) **Lint does not currently enforce “no deep imports under @mapgen/domain/ecology/*” for step contracts**
- `eslint.config.js` correctly bans `@mapgen/domain/*/ops*` in step contracts, but allows other deep imports (types/config/biome-bindings/etc).
- If Ecology is the canonical exemplar, we likely want to enforce that step contracts import domain schemas/types via `@mapgen/domain/<domain>` (not subpaths).

3) **“Contract-only entrypoint” invariant is fragile if we allow arbitrary re-exports**
- Ecology’s contract entrypoint currently re-exports `biome-bindings` and `types`, which is *fine today* (they are contract-safe), but the pattern is fragile if a future export pulls runtime-only modules.
- This is called out more broadly in the M8 review as a long-term risk: `docs/projects/engine-refactor-v1/reviews/REVIEW-M8.md`.

4) **Tests don’t follow the same import-boundary discipline (and aren’t linted the same way)**
- Example: `mods/mod-swooper-maps/test/ecology/op-contracts.test.ts` imports domain runtime/types via relative paths under `mods/mod-swooper-maps/src/domain/ecology/**`.
- This makes it easier for tests to drift from “public surface” usage and weakens Ecology’s role as the canonical copy/paste exemplar.

### 5.2 Ecology domain modeling refactor required (defer; do not fix here)

These are explicitly out of scope for the “architecture exemplar” alignment work, but they affect how cleanly we can enforce boundaries.

1) **Step naming smell**
- The Ecology stage includes a step named `features-plan`:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/*`
- Per `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`, `plan-*` step names are a modeling smell. This should be handled as a modeling refactor, not as wiring cleanup.

2) **Cross-domain config coupling (Narrative depends on Ecology config shape)**
- `mods/mod-swooper-maps/src/domain/narrative/config.ts` imports `EcologyConfigSchema.properties.features`.
- This is a modeling/ownership smell that makes strict domain boundaries awkward (and can create dependency cycles if expanded).

3) **Nested config structure suggests “domain modeling refactor required”**
- `mods/mod-swooper-maps/src/domain/ecology/config.ts` composes nested config blocks (e.g. `featuresPlacement` made from multiple op contract configs).
- Whether this is “correct” depends on the domain modeling guidelines and how stage public config is supposed to represent knobs; it should be handled as part of a dedicated Ecology modeling refactor.

## 6) Proposed implementation plan (to make Ecology the canonical exemplar)

This is intentionally split into:
- **A) Architecture/DX alignment work (do now)**
- **B) Modeling refactor work (separate follow-up)**

### A) Architecture/DX alignment (immediately actionable)

1) **Enforce single-entrypoint imports for Ecology step contracts**
- Update `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts` to import `BiomeEngineBindingsSchema` from `@mapgen/domain/ecology` (not a deep path).
- Add/adjust ESLint restrictions in `eslint.config.js` for step contract files to forbid `@mapgen/domain/*/*` deep imports (with an explicit message pointing at `@mapgen/domain/<domain>`).

2) **Tighten lint guardrails to make Ecology’s boundaries enforceable**
- Extend `eslint.config.js` so that, for mod source (and optionally tests), imports from `@mapgen/domain/ecology/**` are restricted to:
  - `@mapgen/domain/ecology` (contract entrypoint)
  - `@mapgen/domain/ecology/ops` (runtime entrypoint; allowed only in recipe compilation surfaces)
- Consider adding a separate lint block for `mods/**/test/**/*.ts` to mirror the production import rules (so tests reinforce the exemplar instead of bypassing it).

3) **Define a “contract entrypoint allowed exports” posture for Ecology**
Pick one and codify it (docs + lint + review checklist):
- **Option A (DX-forward, current style):** Allow Ecology contract entrypoint to re-export a small, curated set of contract-safe helpers (schemas/types/constants) and enforce that they remain contract-only.
- **Option B (boundary-forward):** Keep contract entrypoint to `default export` + minimal types only, and require stable explicit subpaths for everything else (more imports; less fragility).

Ecology should be the explicit reference choice for the repo (even if other domains lag behind temporarily).

4) **Optional DX polishing inside Ecology steps (keep mechanical)**
- Reduce redundant explicit typing/import noise where inference already provides the intended types (especially after `createStep` defaulting to `ExtendedMapContext`).
- Keep contract files strictly contract-only (no runtime helper imports, no compiler helper imports).

### B) Ecology domain modeling refactor required (explicitly deferred)

Track these separately as “Ecology domain modeling refactor required” items:
- Rename `features-plan` step to an action boundary name (and revisit whether it should be multiple steps).
- Remove cross-domain config coupling (`narrative/config.ts` reusing `EcologyConfigSchema.properties.features`) by extracting a shared schema or relocating ownership.
- Re-evaluate nested domain config composition in `mods/mod-swooper-maps/src/domain/ecology/config.ts` against the modeling guidelines and the stage public schema model.

## 7) Risks and open questions

- **Over-tightening imports can degrade DX** if domain entrypoints don’t re-export common schemas/types; decide deliberately and make Ecology the reference.
- **Contract-only invariant drift** is the long-term footgun: re-export convenience can accidentally pull runtime code later; Ecology should be the place we enforce “no runtime imports leak into contract entrypoints.”
- **Tests as “exemplar police”**: without test lint constraints, the most convenient import path (relative deep imports) will keep bypassing the desired architecture and will reintroduce drift.
- **Some boundaries are blocked by modeling** (especially cross-domain config reuse); architecture-only work should stop short of “fixing” those shapes.

## 8) Next steps

- If we want to proceed with implementation: cut a follow-up implementation stack branch that performs **only** section 6A (architecture/DX alignment) and leaves 6B as explicitly deferred.
- If we want to go deeper on the deferred items: run a separate spike focused on “Ecology modeling refactor” and explicitly scope it against `SPEC-DOMAIN-MODELING-GUIDELINES.md`.

