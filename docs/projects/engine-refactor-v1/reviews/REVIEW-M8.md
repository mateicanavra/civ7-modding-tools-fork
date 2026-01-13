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
- `harden-local-tbd-m8-u21-artifacts-issue` (PR #508)

## Rolling summary (updated as branches are reviewed)

### Still relevant to fix
- **Milestone completeness:** planned M8 U21 artifacts DX (step-owned deps) is documented but not implemented in this stack.
- **(Resolved in follow-up stack)** Keep domain entrypoints contract-only (avoid `export * from "@mapgen/domain/..."`) + enforce via guardrails.
- **(Resolved in follow-up stack)** Remove legacy `DomainOpImplementationsFor` in favor of `DomainOpImplementationsForContracts`.
- **(Resolved in follow-up stack)** Make `mods/mod-swooper-maps` tests build `@swooper/mapgen-core` (and its workspace deps) automatically in a clean checkout.

### Fixed or superseded later in the stack
- **U18 “step contracts importing domain barrels may eagerly load runtime”**: true at the time of PR #456, but resolved by U19/U20 restructuring (contracts vs runtime entrypoints + lint guardrails + `defineDomain/createDomain`).
- **U19’s domain-specific lint restrictions** (hard-coded ecology/placement `paths`): superseded by U20’s generalized “import contracts from `@mapgen/domain/<domain>`” rule (no more `.../contracts` entrypoints).

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

### `m8-u19-domain-module-registry-issue` — PR #457 (`docs(engine-refactor): domain module registry issue draft`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U19-domain-module-registry-pattern.md`

**Quick take**
- Clear articulation of the “contracts vs ops” entrypoint boundary and why barrels are dangerous under ESM eager evaluation.

### `m8-u19-domain-module-registry-core` — PR #497 (`feat(authoring): add DomainOpImplementationsFor type and refactor contract definition`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U19-domain-module-registry-pattern.md`

**Quick take**
- Yes: adds the missing type-level enforcement (`DomainOpImplementationsFor<...>`) and makes op contracts more self-contained by baking in `config` + `defaultConfig`. (Later superseded by `DomainOpImplementationsForContracts`; `DomainOpImplementationsFor` is removed in a follow-up stack.)

**What’s strong**
- Moves op envelope schema + default selection into `defineOp(...)` so consumers don’t need to repeatedly rebuild envelope schema from `(id, strategies)` pairs.
- Keeps runtime behavior guarded: `createOp` now requires `contract.config` + `contract.defaultConfig` to exist (fail-fast if someone bypasses `defineOp`).

**High-leverage issues**
- This increases contract surface area (`config/defaultConfig`) and now relies on consumers using `defineOp` correctly; the fail-fast checks are the right mitigation.

### `m8-u19-domain-module-registry-domains` — PR #498 (`refactor(ecology): reorganize domain exports and add type safety`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U19-domain-module-registry-pattern.md`

**Quick take**
- Yes: introduces explicit per-domain `contracts` and `ops` entrypoints with key-shape enforcement and avoids re-exporting runtime ops from the domain barrel.

**What’s strong**
- `mods/mod-swooper-maps/src/domain/<domain>/contracts.ts` becomes a contract-only module (safe for step contracts).
- `mods/mod-swooper-maps/src/domain/<domain>/ops.ts` binds runtime implementations and enforces key coverage via typing (later standardized on `DomainOpImplementationsForContracts`).
- This resolves the U18 migration concern where step contracts imported `@mapgen/domain/<domain>` at a time when it could have eagerly imported runtime.

### `m8-u19-domain-module-registry-stepops` — PR #499 (`refactor(ops): simplify op config schema handling`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U19-domain-module-registry-pattern.md`

**Quick take**
- Good follow-through: aligns step schema auto-extension + compiler default-prefill to use `contract.config` + `contract.defaultConfig` rather than recomputing envelopes.

### `m8-u19-domain-module-registry-migrate` — PR #500 (`refactor(domain): reorganize imports to use contracts modules`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U19-domain-module-registry-pattern.md`

**Quick take**
- Yes: step contracts move to `@mapgen/domain/<domain>/contracts` and recipes can move to `@mapgen/domain/<domain>/ops`, matching the intended import graph.

### `m8-u19-domain-module-registry-lint` — PR #501 (`feat(eslint): enforce domain import restrictions for recipes and contracts`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U19-domain-module-registry-pattern.md`

**Quick take**
- Directionally correct guardrail (it encodes the desired import edges), but it’s very domain-specific and likely to need adjustment once U20’s “single-entrypoint” model lands.

**High-leverage notes**
- The rule forbids `@mapgen/domain/<domain>` imports in step contracts (hard-coded for ecology/placement). Later in the stack, `@mapgen/domain/<domain>` becomes a contract-only default export under U20; at that point this restriction becomes counterproductive unless updated.

### `m8-u19-domain-module-registry-opconfig` — PR #502 (`refactor(mapgen): improve OpContract type safety with OpContractCore`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U19-domain-module-registry-pattern.md`

**Quick take**
- A reasonable internal follow-up to tighten typing around op contracts/config; review focus should be whether it materially improves ergonomics without adding brittle generics (confirm in U20 sweep).

### `m8-u19-domain-module-registry-tests` — PR #503 (`refactor(ecology): import operation contracts directly instead of through contracts.js`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U19-domain-module-registry-pattern.md`

**Quick take**
- Necessary churn to align tests and call sites with the new “contracts entrypoint” surfaces; low standalone risk.

### `m8-u20-domain-authoring-dx-issue` — PR #504 (`docs(engine-refactor): draft U20 domain authoring DX`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U20-domain-authoring-defineDomain_createDomain.md`

**Quick take**
- Strong: clearly states the gap left by U19 (boundary solved but DX still noisy), defines a target mental model (`defineDomain/createDomain`), and explicitly logs the “default createStep context to ExtendedMapContext” decision.

### `m8-u21-recipe-compile-dx-playbook` — PR #506 (`docs(recipe-compile): add DX cleanup playbook`)

**Intent (inferred)**
- Capture practical cleanup guidance for recipe-compile DX work as the architecture converges.

**High-leverage notes**
- This is docs-only and fits the milestone context as “how to apply the new patterns consistently.”

### `dev-local-tbd-m8-u20-domain-authoring` — PR #505 (`feat(u20): implement defineDomain/createDomain pattern for all domains`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U20-domain-authoring-defineDomain_createDomain.md`

**Quick take**
- Mostly yes: it lands the `defineDomain/createDomain` authoring primitives and executes a broad sweep to converge domains + step contracts on the intended import model.

**What’s strong**
- Adds `packages/mapgen-core/src/authoring/domain.ts` with the expected `defineDomain/createDomain` APIs and a type-level `DomainOpImplementationsForContracts<...>` to enforce key coverage + op-id compatibility.
- Refactors domain layout to match the “two entrypoints” import graph:
  - contract entrypoint: `mods/mod-swooper-maps/src/domain/<domain>/index.ts` (default export is `defineDomain(...)`, imports only `ops/contracts.ts`)
  - runtime entrypoint: `mods/mod-swooper-maps/src/domain/<domain>/ops.ts` (default export is `createDomain(...)`, imports implementations)
  - manifests: `ops/contracts.ts` + `ops/index.ts` as the only per-op “wiring lists”.
- Updates step contracts back to the ergonomic target: `import domain from "@mapgen/domain/<domain>"; ops: { x: domain.ops.someOp }`.
- Updates lint guardrails to match the new “single-entrypoint” rule for step contracts (no `@mapgen/domain/*/contracts`, no `@mapgen/domain/*/ops*` from contracts).

**High-leverage issues / risks**
- Several contract entrypoints still `export *` additional domain helpers (e.g. foundation exports `plate-seed`, `plates`, etc.). This doesn’t pull op implementations, but it does expand what gets eagerly evaluated when a step contract imports the domain module. If any of those helpers ever start importing runtime-only modules, it will silently break the “contract-only” invariant.
  - Direction: keep contract entrypoints “boring” (default export + types/constants only) and treat non-contract helpers as separate explicit imports to preserve the boundary long-term.

### `dev-local-tbd-m8-u20-authoring-extended-step` — PR #507 (`refactor(authoring): default createStep to ExtendedMapContext`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U20-domain-authoring-defineDomain_createDomain.md` (Implementation Decision: “Default createStep context to ExtendedMapContext”)

**Quick take**
- Yes: simplifies authoring by removing a mod-local `createStep` binder shim and making `createStep` default to `ExtendedMapContext`.

**What’s strong**
- Removes the local `mods/mod-swooper-maps/src/authoring/steps.ts` indirection and updates call sites to import `createStep` from `@swooper/mapgen-core/authoring` directly.
- Keeps an escape hatch: non-`ExtendedMapContext` usage can still supply generics explicitly.

### `harden-local-tbd-m8-u21-artifacts-issue` — PR #508 (`docs(engine-refactor): harden artifacts issue`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U21-artifacts-step-owned-deps.md`

**Quick take**
- Docs-only tightening of the planned U21 artifacts work. It improves the clarity of the (still-unlanded) scope, but there is no implementation in this stack.

### `LOCAL-TBD-M8-ECOLOGY-ARCH-DX` — PRs #525–#528 (`[M8] Ecology architecture/DX refactor (canonical domain/stage/step exemplar)`)

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-ecology-architecture-dx-refactor.md`

**Quick take**
- Yes: it meaningfully raises the “canonical by default” bar for Ecology contracts/ops by eliminating deep imports, curating a safe contract entrypoint, and making the import boundaries enforceable in default workflows.

**What landed (as verified in-tree)**
- Step contracts import only `@mapgen/domain/<domain>` (no deep `@mapgen/domain/<domain>/*`, no `/ops`), and Ecology’s contract entrypoint is curated (no value `export *`).
- `eslint.config.js` enforces step-contract vs recipe-compile import boundaries and bans value `export *` on contract/public-surface files.
- `mods/mod-swooper-maps/package.json` adds `lint`, and `pnpm lint` includes `mod-swooper-maps:lint`.
- `scripts/lint/lint-domain-refactor-guardrails.sh` adds an Ecology step-contract deep-import check and doc-coverage checks; `docs/.../06-enforcement.md` documents the “tests canonical-by-default; exceptions allowed” posture.

**High-leverage issues**
- The doc-coverage guardrails are intentionally heuristic (e.g. schema check is string-based; JSDoc check only covers `export function`): good as a first mechanical bar, but it’s easy to satisfy without high-quality docs and it will miss common export patterns.
- The guardrails script hard-codes stage roots for multiple domains; if stage layout changes, checks can silently stop applying to new roots (worth tightening if this becomes a long-lived enforcement layer).

**Spot-check verification**
- `rg -n "@mapgen/domain/ecology/" mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/contract.ts` → no hits.
- `pnpm exec eslint mods/mod-swooper-maps/src/recipes/standard/recipe.ts`, `pnpm -C mods/mod-swooper-maps lint`, `pnpm lint:domain-refactor-guardrails`, `pnpm lint` → pass.
- Per the issue doc, a full `pnpm check/lint/test/build/deploy:mods` run was also recorded; I did not re-run the full suite as part of this review.

**Implementation decisions**
- Decisions logged: none under `## Implementation Decisions`. Visible choices: use ESLint for structural boundaries and a targeted bash guardrail for “docs-as-code” coverage, with Ecology as the stricter exemplar domain.

### `agent-CANDY-LOCAL-TBD-M8-U21-sequencing` — PR #532 (`docs(engine-refactor): add sequencing for artifacts step-owned deps`)

**Review effort estimate (complexity × parallelism)**
- Low × High (2/16): docs-only, largely independent.

**Issue doc**
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M8-U21-artifacts-step-owned-deps.md`

**Quick take**
- Yes: strong “how to execute without churn” sequencing + explicit phase boundary is the right foundation for a multi-PR U21 implementation.

**What’s strong**
- Names and isolates Phase 1 vs Phase 2 surfaces, with explicit “must not touch” constraints that match the intent to avoid Ecology-alignment conflicts.
- Captures the key DX invariants (contract-first, stage-owned contracts, step-owned runtime, single-path deps access) in a way that downstream PRs can be judged against.

**High-leverage issues / risks**
- The issue doc includes a lot of “prework executed” inventory and mechanical sweep output. That’s useful context, but it’s also high drift risk once implementation diverges; consider treating it as a dated record (or moving the verbose inventories under `docs/projects/engine-refactor-v1/resources/` and keeping the issue doc focused on durable decisions + acceptance).

**PR comments**
- No actionable review comments (Graphite stack boilerplate only); no inline review comments.

### `agent-CANDY-LOCAL-TBD-M8-U21-A-artifact-primitives` — PR #533 (`feat(artifacts): implement step-owned artifact dependency system`)

**Review effort estimate (complexity × parallelism)**
- Medium × High (4/16): core API surface + error semantics, but largely contained to `packages/mapgen-core`.

**Intent (from issue doc)**
- Land U21-A primitives: `defineArtifact` contracts + `implementArtifacts` runtime wrapper (read/tryRead/publish + `satisfies`) backed by `ctx.artifacts`.

**Quick take**
- Mostly yes: the API surface matches the issue doc and the runtime wrapper behavior is coherent (write-once, typed errors, `satisfies` integration, deep-readonly read typing).

**What’s strong**
- Clear separation of contract vs runtime (`contract.ts` vs `runtime.ts`), with `@swooper/mapgen-core/authoring` re-exporting the canonical entrypoints.
- Wrapper enforces the right invariants for author DX: missing reads are loud (`ArtifactMissingError`), write-once violations are explicit (`ArtifactDoublePublishError`), and validation failures are structured (`ArtifactValidationError` with `issues` + `cause`).
- JSDoc is explicit about the “readonly view / no snapshotting” immutability contract at the `read(...)` boundary.

**High-leverage issues / risks**
- `DeepReadonly<T>` is a useful IntelliSense nudge, but it won’t meaningfully protect typed arrays (or other complex mutables like `Map`/`Set`). This is consistent with the issue doc’s “convention + review” stance, but it’s worth explicitly acknowledging in docs/examples wherever artifacts are expected to be typed arrays (otherwise people will infer stronger guarantees than exist).
- `defineArtifact(...)` throws generic `Error`s for invariant violations. That’s fine for now, but if this becomes a user-facing authoring API, typed errors (or at least error codes) will improve downstream DX (tests, CLI diagnostics).

**PR comments**
- No actionable review comments (Graphite stack boilerplate only); no inline review comments.
