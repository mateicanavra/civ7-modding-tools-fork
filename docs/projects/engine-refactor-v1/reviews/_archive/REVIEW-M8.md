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

### Fix loop updates (U21)
- **Fixed:** tighten artifact typing defaults so undeclared artifacts (or missing `requires/provides`) no longer yield permissive `deps.artifacts` surfaces.
- **Already tracked:** single-producer enforcement remains scoped to `artifacts.provides` for now; legacy `artifact:*` producers are covered by Phase 2 migration and the U21 implementation decision.
- **Needs discussion:** consider blocking `input.tagDefinitions` overrides for `artifact:*` ids to prevent accidental satisfier shadowing.
- **Disagree (by policy):** buffer artifacts (e.g. climate/heightfield) remain intentionally mutable after a single publish; this is an explicit U21 buffer-policy tradeoff.

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
- `mods/mod-swooper-maps/package.json` adds `lint`, and `bun run lint` includes `mod-swooper-maps:lint`.
- `scripts/lint/lint-domain-refactor-guardrails.sh` adds an Ecology step-contract deep-import check and doc-coverage checks; `docs/.../06-enforcement.md` documents the “tests canonical-by-default; exceptions allowed” posture.

**High-leverage issues**
- The doc-coverage guardrails are intentionally heuristic (e.g. schema check is string-based; JSDoc check only covers `export function`): good as a first mechanical bar, but it’s easy to satisfy without high-quality docs and it will miss common export patterns.
- The guardrails script hard-codes stage roots for multiple domains; if stage layout changes, checks can silently stop applying to new roots (worth tightening if this becomes a long-lived enforcement layer).

**Spot-check verification**
- `rg -n "@mapgen/domain/ecology/" mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/contract.ts` → no hits.
- `bunx eslint mods/mod-swooper-maps/src/recipes/standard/recipe.ts`, `bun run --cwd mods/mod-swooper-maps lint`, `bun run lint:domain-refactor-guardrails`, `bun run lint` → pass.
- Per the issue doc, a full `bun run check/lint/test/build/deploy:mods` run was also recorded; I did not re-run the full suite as part of this review.

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

### `agent-CANDY-LOCAL-TBD-M8-U21-F5-remove-legacy-artifacts` — PR #548 (`refactor(artifacts): use overlay snapshots instead of separate artifacts`)

**Review effort estimate (complexity × parallelism)**
- High × Low (8/16): “last mile” migration + deletions; correctness is end-to-end and hard to parallelize.

**Intent (from issue doc)**
- Complete U21-F: remove legacy artifact registries/wiring (`mods/.../standard/artifacts.ts`, manual artifact satisfiers), consolidate overlay handling into a single artifact-backed snapshot surface, and bring tests/harnesses along.

**Quick take**
- Yes: this is the right consolidation step. It removes the primary sources of drift (legacy artifact registries + manual satisfiers) and brings the standard recipe closer to the contract-first, single-path model.

**What’s strong**
- Deletes `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts`, which is the biggest “escape hatch” for the old model and a frequent drift source.
- Removes the brittle `storyOverlays` satisfier that depended on the old overlays registry shape (resolving the P1 issue raised in PR #546).
- Adds/updates multiple mod tests (pipeline artifacts + standard run + ecology/placement behaviors), which is the right way to regain confidence after a wide migration.
- Introduces `mods/mod-swooper-maps/src/recipes/standard/overlays.ts` as a focused adapter from the overlay snapshot artifact to narrative domain models; this is a cleaner dependency boundary than proliferating individual overlay artifacts.

**High-leverage issues / risks**
- The stack still publishes some artifacts from shared mutable buffers (e.g. `artifact:climateField` from `context.buffers.climate`). If those buffers are refined/mutated later, it undermines the artifact immutability contract; confirm that “publish happens at the final write” or snapshot before publishing.
- Overlay snapshots are explicitly treated as mutable/append-preferred (and currently routed through artifacts for wiring). That’s a reasonable stopgap, but it’s a distinct semantic from the “immutable data product” story for other artifacts—keeping that distinction crisp in docs and tests will matter as more consumers are added.

**PR comments**
- No actionable review comments (Graphite boilerplate only); no inline review comments.

### `agent-CANDY-LOCAL-TBD-M8-U21-F3-ecology-overlays` — PR #546 (`refactor(overlays): migrate ecology steps to artifact system`)

**Review effort estimate (complexity × parallelism)**
- High × Low (8/16): broad mod-surface migration + subtle runtime invariants; limited parallelism with remaining migration branches.

**Intent (from issue doc)**
- Continue U21-F migration: move Ecology steps off ad-hoc artifact helpers and onto stage-owned contracts + `deps.artifacts.*`, while also cutting overlays over to the “artifacts-only for wiring” posture.

**Quick take**
- Mostly yes, but this PR introduces an intermediate-state footgun around overlays satisfaction that must be fixed by downstream work (and appears to be).

**What’s strong**
- Ecology step contracts consistently switch to `artifacts.requires/provides` using the stage-owned contracts, which is the core DX win of U21-F.
- The `StoryOverlayRegistry` shape is clarified as “debug/compat only” and explicitly documented as mutable/append-preferred (important to avoid over-promising immutability guarantees).

**High-leverage issues / risks**
- **PR comment is real (but resolved later):** the inline review points out that `context.overlays` changed from a `Map` to a plain object with arrays, but `mods/mod-swooper-maps/src/recipes/standard/tags.ts` still used `context.overlays?.size` for the `storyOverlays` satisfaction check. In this PR’s state, that would effectively make the tag unsatisfiable. Downstream branch `agent-CANDY-LOCAL-TBD-M8-U21-F5-remove-legacy-artifacts` removes `storyOverlays` wiring from `tags.ts`, which resolves the immediate break; keep an eye on other lingering “Map-like” assumptions.
- This PR touches `packages/mapgen-core/src/core/types.ts` (context shape) as part of a mod migration. That coupling is sometimes necessary, but it increases the blast radius; ensure any downstream consumers of `StoryOverlayRegistry` are covered by at least one targeted regression test (the stack does update overlay tests).

**PR comments**
- 1 inline review comment (Codex bot) about `context.overlays?.size` being incompatible with the new overlays registry shape; addressed later in the stack by removing the legacy `storyOverlays` satisfier from `mods/mod-swooper-maps/src/recipes/standard/tags.ts`.

### `agent-CANDY-LOCAL-TBD-M8-U21-F4-narrative-placement` — PR #547 (`refactor(standard): migrate narrative/placement/morphology steps to artifact system`)

**Review effort estimate (complexity × parallelism)**
- High × Low (8/16): high churn across multiple domains; correctness relies on end-to-end recipe execution.

**Intent (from issue doc)**
- Continue U21-F migration: migrate remaining narrative, placement, and morphology steps to stage-owned artifact contracts + `deps.artifacts.*` access, and remove step-level imports of legacy artifact helpers.

**Quick take**
- Mostly yes: the migration pushes artifact ownership into contracts and standardizes runtime access through `deps`, but the PR’s breadth increases risk of subtle behavioral drift.

**What’s strong**
- The migration appears systematic: contract updates (`artifacts.requires/provides`) land alongside runtime changes (`run(..., deps)` + publish/read) and the stack keeps moving step-by-step (F1 → F5) rather than attempting a single giant rewrite.
- The PR updates story/morphology tests (e.g. `mods/mod-swooper-maps/test/story/orogeny.test.ts`), which is a good signal that narrative correctness wasn’t treated as “best effort”.

**High-leverage issues / risks**
- This branch touches many independent behaviors (foundation, hydrology, morphology, narrative, placement) in one PR. Even if this is “mechanical migration”, it becomes hard to reason about regression cause. If follow-ups are needed, strongly prefer small fix branches per domain/stage rather than stacking more mixed changes here.

**PR comments**
- No actionable review comments (Graphite stack boilerplate only); no inline review comments.

### `agent-CANDY-LOCAL-TBD-M8-U21-F2-foundation-climate` — PR #545 (`refactor(mapgen): migrate foundation and hydrology steps to artifact system`)

**Review effort estimate (complexity × parallelism)**
- High × Low (8/16): touches multiple critical steps; correctness depends on downstream stages and runtime invariants.

**Intent (from issue doc)**
- Continue U21-F migration: migrate Foundation + climate/hydrology-adjacent steps to `artifacts.requires/provides` + `deps.artifacts.*` access, and bind artifact runtime validation/publish behavior in the producing step.

**Quick take**
- Mostly yes: producing steps adopt `implementArtifacts(...)` + `deps.artifacts.<name>.publish(...)`, and consumer steps move toward `deps.artifacts.<name>.read(...)` instead of ad-hoc artifact helpers.

**What’s strong**
- Foundation step becomes a clean exemplar: stage-owned contracts (`stages/foundation/artifacts.ts`) + contract `artifacts.provides` + step-owned runtime validation + write-once publish through `deps`.
- Hydrology steps publish derived artifacts (e.g. `riverAdjacency`) from freshly computed values, which aligns with the immutability contract better than publishing shared mutable references.

**High-leverage issues / risks**
- Watch for accidental immutability violations when publishing references that may be mutated later. Example: `climateBaseline` publishes `context.buffers.climate` directly as `artifact:climateField`. If downstream steps mutate that same buffer object in-place, consumers will observe “moving” artifact values and the deep-readonly typing becomes misleading. Either ensure “publish happens at the final write” (no further mutation) or publish a caller-owned snapshot.
- This PR touches many steps but has no dedicated mod-level regression coverage in this branch; confidence largely comes from the earlier mapgen-core wiring tests plus end-to-end recipe execution checks in later branches.

**PR comments**
- No actionable review comments (Graphite stack boilerplate only); no inline review comments.

### `agent-CANDY-LOCAL-TBD-M8-U21-F1-stage-artifacts` — PR #544 (`docs(engine-refactor): add buffer/overlay policy and implement standard recipe artifacts`)

**Review effort estimate (complexity × parallelism)**
- Medium × Medium (6/16): Phase 2 migration surface area (mod contracts) with downstream wiring dependencies.

**Intent (from issue doc)**
- Begin U21-F migration: introduce stage-owned artifact contract modules (`stages/<stage>/artifacts.ts`) as the single canonical definition site.

**Quick take**
- Mostly yes: the stage-level `artifacts.ts` modules are a clean, legible “contract boundary” and set up the subsequent step migrations to reference stable contracts instead of importing ad-hoc helpers.

**What’s strong**
- Contracts are centralized per stage and use `defineArtifact(...)` (so naming/`artifact:` id invariants are consistently enforced).
- Ecology contracts capture a meaningful shape (objects/arrays + typed-array placeholders) without introducing runtime TypeBox validation (consistent with repo policy).

**High-leverage issues / risks**
- A few contract `name` choices diverge from the `id` segment (e.g. `pedology` vs `artifact:ecology.soils`). That can be a good domain-level abstraction, but it also increases cognitive load for authors who will type `deps.artifacts.pedology.*` while debugging `ctx.artifacts.get("artifact:ecology.soils")`. Consider being deliberate/consistent about “name == id tail” vs “name == domain term”.
- Foundation contracts use `Type.Any()` schemas + import constants from `@swooper/mapgen-core`. That’s fine as metadata, but it’s worth sanity-checking that these constants remain the single source of truth (to avoid accidentally reintroducing parallel id registries).

**PR comments**
- No actionable review comments (Graphite stack boilerplate only); no inline review comments.

### `agent-CANDY-LOCAL-TBD-M8-U21-E-step-artifact-runtimes` — PR #535 (`refactor(step): add type-safe artifacts to step contracts`)

**Review effort estimate (complexity × parallelism)**
- Medium × High (4/16): type threading across `StepContract`/`StepModule` + runtime carrier surface.

**Intent (from issue doc)**
- Land U21-E: allow producer steps to export artifact runtimes via `createStep(contract, { artifacts, run })` so recipe compilation can discover `satisfies` later.

**Quick take**
- Mostly yes: step modules can now carry typed `artifacts` runtimes, and `StepArtifactsDecl` is upgraded to a generic that preserves `requires/provides` lists for downstream typing.

**What’s strong**
- The move from a non-generic `StepArtifactsDecl` to `StepArtifactsDecl<Requires, Provides>` is the right foundational type choice; it keeps artifact typing from collapsing to `ArtifactContract[]` too early.
- `createStep(...)` surfaces `artifacts?: ...` in a way that feels consistent with the existing `normalize/run` pattern (producer-owned runtime responsibility).

**High-leverage issues / risks**
- **PR feedback still relevant:** there’s an inline review comment (Codex bot) noting that when a step omits `artifacts`, the current defaulting (`TArtifacts = StepArtifactsDecl | undefined`) causes `deps.artifacts` typing to degrade into a permissive “any artifact name” map. I spot-checked `packages/mapgen-core/src/authoring/types.ts` in later branches (C/D/G): this defaulting remains, so the concern is still live at stack tip. A small type tweak (default `TArtifacts` to `undefined` or default `Provides`/`Requires` to `readonly []`) would restore the intended “no declared artifacts → `{}` surface” behavior.

**PR comments**
- 1 inline review comment (Codex bot) about `deps.artifacts` type defaulting becoming overly permissive; not addressed by downstream branches in this stack.

### `agent-CANDY-LOCAL-TBD-M8-U21-C-step-deps` — PR #536 (`feat(artifacts): add step-owned dependencies and fail fast for missing runtimes`)

**Review effort estimate (complexity × parallelism)**
- Medium × Medium (6/16): signature threading across authoring surface + recipe runtime wiring; low parallelism with later recipe-compile work.

**Intent (from issue doc)**
- Land U21-C: thread `deps` into step runtime (`run(ctx, config, ops, deps)`) and make artifacts available via `deps.artifacts.<name>.*` (no alternate `ctx.deps` path).

**Quick take**
- Mostly yes: `deps` is threaded through `createStep` typing and `createRecipe` runtime invocation, and artifact reads/writes are now reachable via a first-class `deps` parameter.

**What’s strong**
- Back-compat is preserved: existing `run(ctx, config, ops)` functions can ignore the 4th param without code changes (Phase 1 additive constraint met).
- `createRecipe` fails fast if a step declares `artifacts.provides` but doesn’t supply a runtime wrapper for that contract, which prevents silent gating drift.

**High-leverage issues / risks**
- `deps.fields` / `deps.effects` are currently `unknown` placeholders. That’s consistent with the “future enhancement” stance, but it’s easy for authors to misread this as “fields/effects are already on deps”; consider a more explicit placeholder type (or a doc note) to reduce confusion until the follow-up lands.
- **PR feedback still relevant:** there’s an inline comment (Codex bot) pointing out that `ArtifactListOrEmpty` falling back to `readonly ArtifactContract[]` makes undeclared artifacts appear type-safe (e.g. declaring only `provides` still allows `deps.artifacts.someRequired.read(...)` to typecheck). I spot-checked the later branches (D/G): this behavior remains, so the concern is still live at stack tip.

**PR comments**
- 1 inline review comment (Codex bot) about `StepArtifactsSurface` defaulting to a permissive map when lists are omitted; not addressed by downstream branches in this stack.

### `agent-CANDY-LOCAL-TBD-M8-U21-D-recipe-artifact-wiring` — PR #537 (`feat(mapgen-core): auto-wire artifact tag defs`)

**Review effort estimate (complexity × parallelism)**
- Medium × Medium (6/16): recipe-level invariants + execution model coupling; serial with migration and tests.

**Intent (from issue doc)**
- Land U21-D: have `createRecipe(...)` auto-register artifact dependency tag definitions with `satisfies` derived from producer artifact runtimes, and enforce “exactly one provider per artifact id”.

**Quick take**
- Mostly yes: the tag registry gets artifact tag defs (with `satisfies`) without requiring manual recipe wiring, and multi-provider artifacts declared via `artifacts.provides` fail fast at recipe creation.

**What’s strong**
- The `satisfies` plumbing aligns correctly with the engine’s post-step `UnsatisfiedProvidesError` check (`PipelineExecutor` + `isDependencyTagSatisfied`): a producer can “provide” the tag but still fail if it didn’t actually publish to `ctx.artifacts`.
- The duplicate-provider error message includes the recipe id + both full step ids, which is the right “actionable” shape for debugging.

**High-leverage issues / risks**
- `collectTagDefinitions(...)` currently allows explicit `input.tagDefinitions` to override auto-wired artifact tag defs. That’s probably fine as an escape hatch, but it also makes it possible to accidentally shadow an artifact’s `satisfies` and regress gating. If artifacts are meant to be strictly contract-owned, consider preventing explicit overrides for `artifact:*` ids (or at least warning).
- **PR feedback partially unresolved:** there’s an inline comment noting the duplicate-producer enforcement only considers `contract.artifacts?.provides`, not legacy `provides` entries that start with `artifact:`. If the stack fully migrates all artifact producers to `artifacts.provides` (and bans legacy `artifact:*` provides), this becomes moot; otherwise, mixed-mode recipes can still produce ambiguous artifact ownership without failing fast.

**PR comments**
- 1 inline review comment (Codex bot) about duplicate-producer enforcement not accounting for legacy `provides: ["artifact:..."]`; verify this is eliminated by the downstream migration (or tighten the enforcement).

### `agent-CANDY-LOCAL-TBD-M8-U21-G-tests` — PR #538 (`feat(artifacts): implement step-owned artifact dependencies`)

**Review effort estimate (complexity × parallelism)**
- Medium × Medium (6/16): correctness hardening + tests; serial with Phase 2 migration.

**Intent (from issue doc)**
- Land U21-G: add a verification harness/tests for the new artifacts wiring (Phase 1 scoped to `packages/mapgen-core`).

**Quick take**
- Mostly yes: the added tests cover the core invariants (contract merge rules, artifact runtime errors, and “provider must publish” enforcement via `UnsatisfiedProvidesError`).

**What’s strong**
- `packages/mapgen-core/test/pipeline/tag-registry.test.ts` has a direct regression test for the most important behavior: a step can declare `artifacts.provides`, “provide” the tag, and still fail postconditions if it didn’t publish to `ctx.artifacts`.
- `packages/mapgen-core/test/authoring/authoring.test.ts` exercises the artifact runtime wrapper error shapes (`ArtifactMissingError`, `ArtifactValidationError`, `ArtifactDoublePublishError`) and validates the `defineStep` merge guardrails.
- The type-level test (`packages/mapgen-core/src/authoring/__type_tests__/artifact-readonly.ts`) gives a cheap “compile-time guardrail” that the deep-readonly intent doesn’t silently regress.

**High-leverage issues / risks**
- This PR mixes in some meta-maintenance (issue checkbox updates, triage note, and milestone review doc edits). The triage note is useful, but editing `docs/projects/engine-refactor-v1/reviews/REVIEW-M8.md` from an implementation PR blurs “implementation vs review artifacts”; consider keeping milestone review entries on dedicated review branches only.
- The triage note correctly calls out that single-producer enforcement is currently scoped to `artifacts.provides` (not legacy `provides: ["artifact:..."]`). That’s acceptable for Phase 1 if Phase 2 migration eliminates legacy artifact provides entirely; otherwise, it’s a correctness footgun that will need enforcement tightening.

**PR comments**
- No actionable review comments (Graphite boilerplate only); no inline review comments.

### `agent-CANDY-LOCAL-TBD-M8-U21-phase2-sequencing` — PR #543 (`docs(engine-refactor): add phase 2 sequencing for artifacts step-owned deps`)

**Review effort estimate (complexity × parallelism)**
- Low × High (2/16): docs-only, low-risk.

**Intent (from issue doc)**
- Make Phase 2 migration sequencing explicit (mod migration split into F1–F5) after Phase 1 core API lands.

**Quick take**
- Yes: the Phase 2 breakdown matches the actual migration PR decomposition (F1–F5) and keeps the “no shims” posture legible.

**High-leverage notes**
- The “stop and check in before Phase 2” constraint is the right coordination tool for a multi-agent milestone; it’s good that it’s recorded in the issue doc rather than living only in chat/PR context.

**PR comments**
- No actionable review comments (Graphite stack boilerplate only); no inline review comments.

### `agent-CANDY-LOCAL-TBD-M8-U21-B-step-artifacts` — PR #534 (`feat(step): add artifacts declaration to step contract`)

**Review effort estimate (complexity × parallelism)**
- Low × High (2/16): localized contract typing + invariants.

**Intent (from issue doc)**
- Land U21-B: optional `contract.artifacts.requires/provides` (stage-owned contracts referenced in step contracts) and flatten those into `contract.requires/provides`.

**Quick take**
- Yes: `defineStep` merges `artifacts.*.id` into the step’s `requires/provides` and enforces the “single authoring surface” rule (no mixing direct `artifact:*` tags with `artifacts.*`).

**What’s strong**
- The guardrail against mixing `artifact:*` in `requires/provides` when `artifacts.*` is present is exactly the kind of “make the right thing easy” enforcement U21 needs.
- Duplicate declarations are rejected with error messages that point directly at the offending step id + artifact id.

**High-leverage issues / risks**
- This enforces uniqueness within the per-step `artifacts` declaration, but doesn’t attempt to police duplicates already present in plain `requires/provides`. That’s fine for Phase 1 additivity, but it increases the importance of U21-F migration (otherwise authoring will remain split across two patterns).

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
