---
milestone: M7
id: M7-review
status: draft
reviewer: AI agent
---

# REVIEW: M7 Recipe Compile Cutover

Milestone doc: `docs/projects/engine-refactor-v1/milestones/M7-recipe-compile-cutover.md`

## Remediation Plan — Runtime Validation Removal (Authoritative)

This is an architecture alignment pass (contract tightening), not a pipeline redesign. The intention is to collapse multiple drifting “validation/defaulting” paths into one canonical compile-time path, and to make runtime execution semantics binary and predictable.

**Two contracts we are tightening (the whole plan hangs off these):**
1) **Runtime execution semantics:** `recipe.run(...)` must be *binary* (success or throw). Silent partial execution (“break but don’t throw”) is an unacceptable third state.
2) **Defaults/schema authoring semantics:** property defaults + compiler normalization are canonical; object-level `default: {}` that masks deep defaults is forbidden and must be enforced by factories/helpers (so authors have one obvious way).

### Locked Decisions + Rationale (Canonical Contracts)

- **Compile-time is the single source of truth** for schema defaulting/cleaning/validation:
  - `normalizeStrict` (and the compiler pipeline that composes it) is the canonical behavior.
  - Rationale: eliminate dual-path validation and drift; preserve stable error surfaces for authors/tooling.
- **Runtime executes an already-compiled plan/config** and enforces runtime contracts only:
  - requires/provides, effect/tag bookkeeping, and artifact invariants.
  - **No TypeBox schema defaulting/cleaning/validation in production runtime execution.**
  - Rationale: runtime should be simple, predictable, and free of “hidden” normalization behaviors.
- **Ops must remain independently runnable/testable** via an explicit compiler-backed “validated runner” (dev/test/tooling):
  - Pipeline: `normalizeStrict(op.config, rawSelection)` → `op.normalize(...)` → `normalizeStrict(op.config, normalizedSelection)` → `op.run(...)`.
  - Rationale: preserve excellent DX for unit tests/tooling without reintroducing production runtime validation.
- **Runtime artifact invariants live in artifact handlers/factories**, not in TypeBox runtime checks:
  - Rationale: artifacts are runtime products; invariants often exceed schema expressiveness (shape coupling, dimensional/range checks), and runtime TypeBox would reintroduce a second validation system.
- **`recipe.run(...)` is fail-fast and binary by default**:
  - On failure, it throws a typed error that includes: failing step id, cause, and actionable context.
  - Any “collect partial results / non-throwing diagnostics” mode must be an explicit opt-in API (separate call path).
  - Rationale: best DX and testability; avoids “missing artifact” errors that hide the root cause.
- **Schema defaults are authored via property defaults, not object-level defaults**:
  - **Rule:** do not set `default: {}` (or any object default) on object schemas when properties already have defaults.
  - Rationale: object-level defaults mask deep defaults and create misleading `defaultConfig` values.
- **Factories/helpers enforce schema conventions** (one obvious way):
  - Inline schemas should not need to manually specify `additionalProperties: false` or root-object defaults.
  - Factories apply `additionalProperties: false` by convention and reject conflicting object-level defaults.
  - Rationale: reduce author burden, remove equivalent-but-different schema states, and prevent regressions.
- **Dedicated compiler error codes for normalization-time validation**:
  - Rationale: error surfaces must remain precise and stable once runtime schema validation is removed.

### Known Impacts / Prior Work That Must Be Aligned

- Tests that previously relied on runtime defaulting/validation must be migrated to the compiler-backed validated runner (dev/test/tooling).
- Any runtime code that “quietly stops” (breaks execution but returns without throwing) must be made fail-fast at the `recipe.run` boundary.
- Existing schemas that rely on object-level `default: {}` must be rewritten to use property defaults and/or adjusted factories so this pattern cannot re-enter.
- Upstream work that moved normalization/clamping into runtime `run` bodies is explicitly out of contract; it must be moved back to compile-time `normalize` + schema defaults.

### Remediation Issues (Reviewable Units)

Each issue is intended to be independently reviewable (one Graphite branch), with frequent commits inside the branch. Every issue below is scoped to avoid reintroducing runtime schema defaulting/cleaning/validation in production execution.

#### 1) Runtime execution semantics: fail-fast `recipe.run(...)` + typed error surface (REMAINING)

- **What changes**
  - Make `recipe.run(...)` binary by default: it throws on any step failure or unsatisfied provides/requires (no silent partial execution).
  - Ensure thrown errors are actionable: include failing step id and the underlying error/cause/context.
  - (Optional but recommended) expose an explicit diagnostic API that returns a report without changing `recipe.run(...)` semantics.
- **Why**
  - Prevents “missing artifact” cascades that hide the real root cause.
  - Restores a two-state model: success vs failure (best DX and testability).
- **Implementation notes**
  - Primary candidates:
    - `packages/mapgen-core/src/engine/PipelineExecutor.ts`
    - `packages/mapgen-core/src/authoring/recipe.ts`
    - `packages/mapgen-core/src/engine/errors.ts`
  - Preferred behavior:
    - Internally, the executor may still collect step results, but `recipe.run(...)` must throw if any step result is failure.
    - The thrown error should surface the *first* failing step as primary, with an option to include the full report for diagnostics.
  - If a non-throwing mode is needed, add an explicit API such as `recipe.runWithReport(...)` or `executor.executePlanReport(...)` (name TBD), returning `{ context, report }`.
- **Acceptance criteria**
  - `recipe.run(...)` cannot return successfully if any step failed or any required provides were unsatisfied.
  - The thrown error includes: failing step id and a meaningful cause (original thrown error or provides/requires error).
  - Tests no longer fail with “missing artifacts” without a preceding actionable pipeline error.
- **Verification checklist**
  - Add/adjust a focused unit test in `packages/mapgen-core/test/pipeline/**` that asserts fail-fast throw + error content.
  - Run `bun run --cwd packages/mapgen-core test`.
  - Run `bun run --cwd mods/mod-swooper-maps test` (standard recipe run must fail loudly if a step fails).

#### 2) Execution plan role: structure-only plan construction (REMAINING)

- **What changes**
  - `compileExecutionPlan` remains structural plan construction only (step graph, ordering, tags).
  - Remove any runtime schema validation/defaulting/cleaning from plan compilation.
  - Keep structural runtime invariants only (unknown step ids, missing step registry entries, optional duplicate-step-id guard).
- **Why**
  - Execution plan compilation is not a validation system; compile-time normalization is.
- **Implementation notes**
  - Reference: `packages/mapgen-core/src/engine/execution-plan.ts`.
  - Ensure runtime-layer modules do not depend on compiler-only helpers (`normalizeStrict`, `Value.Default`, etc.).
- **Acceptance criteria**
  - `execution-plan.ts` contains no TypeBox runtime validation/defaulting code paths.
  - Structural errors are still detected and surfaced as engine/plan errors (not compiler errors).
- **Verification checklist**
  - Run `bun run --cwd packages/mapgen-core test` (especially execution plan tests).
  - `rg -n \"TypeCompiler|Value\\.\" packages/mapgen-core/src/engine` returns empty (or only intended non-validation usages).

#### 3) Dedicated compiler error codes for config validation failures (REMAINING)

- **What changes**
  - Add a dedicated compile-time error code for config validation failures (e.g. `op.config.invalid`).
  - Map normalization-time validation failures to the new code (avoid using `op.normalize.failed` for schema validation).
- **Why**
  - Error surfaces are now the primary author feedback mechanism; codes and paths must be stable and precise.
- **Implementation notes**
  - References:
    - `packages/mapgen-core/src/compiler/normalize.ts`
    - `packages/mapgen-core/src/compiler/recipe-compile.ts`
  - Ensure custom invariants moved into `normalize` also emit `op.config.invalid` consistently.
- **Acceptance criteria**
  - Invalid configs reliably produce `op.config.invalid` with stable `path`/`message` conventions.
  - No compile-time schema validation errors are labeled as `op.normalize.failed`.
- **Verification checklist**
  - Add/adjust compiler unit tests in `packages/mapgen-core/test/compiler/**` validating code + path stability.
  - Run `bun run --cwd packages/mapgen-core test`.

#### 4) Remove runtime validation surfaces from authoring core (REMAINING)

- **What changes**
  - Delete runtime validation-surface modules and exports.
  - Remove `validate` / `runValidated` from the authoring `DomainOp` surface.
  - Ensure authoring factories no longer attach validation surfaces at runtime.
- **Why**
  - Prevents drift back into “dual validation paths” and avoids inventing runtime default/clean semantics.
- **Implementation notes**
  - References:
    - `packages/mapgen-core/src/authoring/validation.ts` (delete)
    - `packages/mapgen-core/src/authoring/op/validation-surface.ts` (delete)
    - `packages/mapgen-core/src/authoring/op/types.ts` (remove APIs/types)
    - `packages/mapgen-core/src/authoring/op/create.ts` (remove `customValidate` attachment)
    - `packages/mapgen-core/src/authoring/index.ts` (remove exports)
- **Acceptance criteria**
  - No runtime-path code can call `runValidated`/`validate`.
  - Authoring `DomainOp` remains fully type-safe and ergonomic without validation surface methods.
- **Verification checklist**
  - `rg -n \"runValidated\\(|\\.validate\\(\" packages` returns only allowed dev/test/tooling helpers (if any).
  - Run `bun run check-types` and `bun run --cwd packages/mapgen-core test`.

#### 5) Move custom validation into compile-time `normalize` (REMAINING)

- **What changes**
  - Replace `customValidate` usage with compile-time checks in strategy `normalize` (or schema-level constraints where expressible).
  - Throw validation errors from `normalize`; compiler maps them to `op.config.invalid`.
- **Why**
  - Keeps all config correctness in one place (compiler pipeline), not scattered runtime checks.
- **Implementation notes**
  - Reference: `mods/mod-swooper-maps/src/domain/placement/ops/plan-floodplains/index.ts`.
  - Prefer producing specific errors (path + code) rather than generic “invalid config” messages.
- **Acceptance criteria**
  - Invalid floodplains configs fail compile-time normalization with `op.config.invalid`.
  - No runtime code path depends on `customValidate`.
- **Verification checklist**
  - Add/adjust targeted unit test(s) covering invalid configs.
  - Run `bun run --cwd mods/mod-swooper-maps test`.

#### 6) Schema defaults + factory enforcement (deep-defaults contract) (REMAINING)

- **What changes**
  - Remove object-level `default: {}` (and any object defaults) from config object schemas where property defaults exist.
  - Make property defaults the canonical way defaults are expressed.
  - Update factories/helpers so inline schemas:
    - implicitly apply `additionalProperties: false`, and
    - reject/forbid object-level defaults that would mask property defaults.
- **Why**
  - Prevents incomplete `defaultConfig` values and eliminates the “deep defaults” ambiguity.
  - Gives authors one obvious way to express defaults and avoids repeated boilerplate.
- **Implementation notes**
  - Likely touchpoints:
    - Schema default derivation: `packages/mapgen-core/src/authoring/schema.ts` (`buildSchemaDefaults`)
    - Schema/factory entrypoints (exact factory names may vary; target: op/step/stage contract helpers)
    - Mod schemas (examples of drift): `mods/mod-swooper-maps/src/domain/**/contract.ts`
  - Enforcement strategy:
    - Prefer failing fast at author-time (factory) when an object schema declares an object default.
    - Add lint guardrails (see issue 13) to prevent reintroduction.
  - Contract target:
    - `op.defaultConfig` should be structurally safe and should match the compiler’s “empty selection normalization” semantics (`normalizeStrict(op.config, {})`) wherever applicable.
- **Acceptance criteria**
  - No config object schemas use object-level `default: {}` where properties already have defaults.
  - Inline schemas no longer need to specify `additionalProperties: false` manually when using factories.
  - `op.defaultConfig` yields a structurally complete config (no missing nested objects that should default).
- **Verification checklist**
  - Add/adjust unit tests in `packages/mapgen-core/test/authoring/**` asserting:
    - factory rejects object-level object defaults, and
    - `additionalProperties: false` is applied by convention.
  - Run `bun run --cwd packages/mapgen-core test`.
  - Run `bun run --cwd mods/mod-swooper-maps test` (defaultConfig-related failures must be eliminated by schema cleanup, not by runtime defaulting).

#### 7) Artifact handler/factory pattern (runtime invariants) (REMAINING)

- **What changes**
  - Keep TypeBox artifact schemas as canonical typing/contracts (no runtime schema validation).
  - Introduce artifact handlers that centralize runtime invariants:
    - `validate(value, dims)` → invariant errors
    - `assert(value, dims)` → throw on error
    - `get(context)` → read + assert + return typed
    - `set(context, value)` → assert + store
  - Producers call `set`, consumers call `get`, tag `satisfies` uses `validate`.
- **Why**
  - Centralizes runtime invariants and prevents “every consumer re-validates ad hoc” drift.
- **Implementation notes**
  - References:
    - `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/tags.ts`
  - Invariants include: presence, typed-array shape, dimension coupling (`length === width * height`), and range bounds (when truly invariant).
- **Acceptance criteria**
  - Artifact invariants are enforced consistently through handlers, not scattered runtime checks.
  - No TypeBox runtime validators are required for artifact invariants.
- **Verification checklist**
  - Add/adjust artifact-focused tests in `mods/mod-swooper-maps/test/pipeline/**`.
  - Run `bun run --cwd mods/mod-swooper-maps test`.

#### 8) Remove runtime TypeBox validators for placement inputs/outputs (REMAINING)

- **What changes**
  - Remove `TypeCompiler`/TypeBox runtime validation from:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/placement-inputs.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/placement-outputs.ts`
  - Use artifact handlers for runtime invariants and typed reads/writes.
- **Why**
  - Placement stage should operate on already-validated configs and enforce artifact invariants via handlers, not schema validation.
- **Implementation notes**
  - References:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/placement-inputs.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/placement-outputs.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts`
  - Constraint: no runtime TypeBox validation/defaulting in placement runtime; enforce invariants via artifact handlers only.
- **Acceptance criteria**
  - No `TypeCompiler` usage remains in placement runtime paths.
  - Placement stages use artifact handlers for reads/writes.
- **Verification checklist**
  - `rg -n \"TypeCompiler\" mods/mod-swooper-maps/src/recipes/standard/stages/placement` returns empty.
  - Run `bun run --cwd mods/mod-swooper-maps test`.

#### 9) Remove runtime `runValidated` usage in steps (REMAINING)

- **What changes**
  - Replace all `runValidated` calls with `run` in runtime step execution paths:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/**`
- **Why**
  - Step runtime should not perform schema validation/defaulting; it should assume compiler-normalized config and enforce only runtime invariants.
- **Implementation notes**
  - Primary call sites:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/**`
  - Ensure steps consume normalized selections produced by the compiler (or via the validated runner in tests), not ad-hoc schema defaults.
- **Acceptance criteria**
  - No runtime step code uses `runValidated`.
  - Step runtime uses normalized selections produced by the compiler.
- **Verification checklist**
  - `rg -n \"runValidated\" mods/mod-swooper-maps/src/recipes/standard/stages` returns empty.
  - Run `bun run --cwd mods/mod-swooper-maps test`.

#### 10) Remove runtime defaulting/normalization in op strategies (REMAINING)

- **What changes**
  - Remove runtime normalization/clamping/coercion in `run` bodies (e.g. selector normalization, `Math.floor` coercions, runtime chance clamping when the intent is schema validation/defaulting).
  - Move all config shaping into compile-time normalization (`normalizeStrict` + `op.normalize`) and/or schema defaults.
  - Reverse upstream divergence where ecology strategies normalize in `run`.
- **Why**
  - Prevents a creeping “shadow compiler” inside runtime execution.
- **Implementation notes**
  - Reference: `mods/mod-swooper-maps/src/domain/ecology/ops/**/strategies/*.ts`.
  - Distinguish:
    - **Config shaping** (compile-time only) vs
    - **Artifact invariants** (runtime, via handlers).
- **Acceptance criteria**
  - `run` bodies no longer contain config defaulting/coercion that belongs in compile-time normalization.
  - Config behavior matches compiler normalization behavior for all ops.
- **Verification checklist**
  - Add/adjust tests to assert normalization happens via compiler-backed runner (issue 11).
  - Run `bun run --cwd mods/mod-swooper-maps test`.

#### 11) Tests + docs: compiler-backed validated runner + alignment pass (REMAINING)

- **What changes**
  - Update tests that depended on runtime validation/defaulting to use a compiler-backed validated runner (dev/test/tooling).
  - Ensure test “validated execution” semantics reuse the compiler pipeline exactly:
    - `normalizeStrict(op.config, rawSelection, path)`
    - `op.normalize(selection, ctx)`
    - `normalizeStrict(op.config, normalizedSelection, path)` again
    - `op.run(input, normalizedSelection)`
  - Update docs/triage to explicitly describe the compile-time vs runtime contract and the validated-runner rule for tests/tooling.
- **Why**
  - Ensures tests and tooling remain ergonomic and accurate without reintroducing production runtime validation.
- **Implementation notes**
  - References:
    - `packages/mapgen-core/test/**`
    - `docs/projects/engine-refactor-v1/triage.md`
    - Mod test support helpers under `mods/mod-swooper-maps/test/support/**`
- **Acceptance criteria**
  - No tests depend on ad-hoc schema-default extraction that can drift from compiler semantics.
  - Ops remain easily runnable in isolation with validated runner semantics.
  - Docs clearly state the boundaries and the “one obvious way” for validation/defaulting.
- **Verification checklist**
  - Run `bun run test:mapgen`.
  - Run `bun run --cwd mods/mod-swooper-maps test`.
  - Run `bun run check` (ensures lint guardrails don’t regress).

#### 12) Centralize shared utilities in `mapgen-core` (REMAINING)

- **What changes**
  - Consolidate common helpers duplicated across ops/steps into core utilities, then remove local copies.
  - Target helpers (minimum set):
    - `clamp01` and general `clamp` (numeric bounds)
    - `normalizeRange` (range normalization with zero-span guard)
    - `clampChance` / `rollPercent` (chance normalization + RNG roll helpers)
- **Why**
  - Reduces drift and makes behavior consistent across domains; authors get one obvious import path.
- **Implementation notes**
  - Add a small utility module (e.g. `packages/mapgen-core/src/math/**` or `packages/mapgen-core/src/utils/**`) and export from `packages/mapgen-core/src/index.ts`.
  - Update callsites (especially ecology ops) to import from `@swooper/mapgen-core`, not local inline helpers.
- **Acceptance criteria**
  - Shared helpers live in `mapgen-core` and are reused (no duplicate local clones across ops).
  - Imports are consistent and type-safe.
- **Verification checklist**
  - Run `bun run --cwd packages/mapgen-core test` and `bun run --cwd mods/mod-swooper-maps test`.
  - `bun run lint` (imports should satisfy guardrails once issue 13 lands).

#### 13) Lint guardrails for the architecture (FIRST-CLASS) (REMAINING)

- **What changes**
  - Update `eslint.config.js` (and any workspace-specific configs) with explicit `no-restricted-imports` rules enforcing boundaries:
    - Disallow `runValidated`, `validate`, `OpValidationError`, and TypeBox runtime validators in runtime layers (`mods/**/stages/**`, `mods/**/domain/**/strategies/**`).
    - Disallow compiler-only helpers in runtime layers (`TypeCompiler`, `Value.Default`, `Value.Clean`, `applySchemaDefaults`, etc.).
    - Require shared utilities to come from `mapgen-core` (disallow local one-off copies where a core helper exists).
  - Add guardrails for schema conventions:
    - Disallow object-level `default: {}` on config object schemas (or flag for review), aligned with issue 6.
  - Add guardrails for inline vs. out-of-line decisions:
    - Disallow deprecated helpers like `resolveConfig` or `customValidate` in op strategies.
    - Disallow new runtime defaulting/normalization inside `run` when the contract calls for compile-time normalization.
- **Why**
  - The architecture must be enforced mechanically so it doesn’t regress under iteration (human or agent).
- **Acceptance criteria**
  - Violations are caught by lint with actionable error messages pointing to the intended canonical path.
  - Running `bun run check` serves as a structural safeguard for the target architecture.
- **Verification checklist**
  - Run `bun run lint` and `bun run check`.
  - Add at least one regression fixture (a small intentionally-bad import in a test-only fixture or documented example) if the repo’s lint patterns support it; otherwise rely on targeted `no-restricted-imports` coverage.

## REVIEW m7-t01-compiler-module-skeleton-strict-normalization

### Quick Take

Good foundation cut: strict normalization + op-envelope prefill are contract-driven, deterministic, and covered by targeted unit tests.

### High-Leverage Issues

- `normalizeStrict` returns `null` as the value on null input; if callers ever assume object-ish configs even when errors exist, this can cascade. Ensure compile callers short-circuit on any `errors.length > 0`.
- The strict pipeline uses `Value.Default` + `Value.Clean` but not `Value.Convert`; if the compiler contract expects coercion (e.g. `"1"` → `1`), make that explicit in the spec/entrypoint rather than relying on future callsites.

### Fix Now (Recommended)

- Add a focused unit test for `normalizeOpsTopLevel` covering `op.missing` and `op.normalize.failed` (these are the first “real” compiler-only runtime errors, so path/message stability matters).

### Defer / Follow-up

- Consider aligning `formatErrors` path selection on one field (`instancePath` vs `path`) and documenting it as part of compiler error surface stability.

### Needs Discussion

- Should “unknown keys” be computed on the raw input or on the defaulted/converted value? Today it’s on the raw input; if defaults add nested objects, unknown-key scanning behavior can be surprising.

### Cross-cutting Risks

- Compiler error surface stability is now a public-ish contract for downstream tests and future tooling; keep any changes to error codes/paths behind explicit review.

## REVIEW m7-t02-compile-recipe-config-wiring

### Quick Take

Solid end-to-end compiler entrypoint: stage surface normalization → stage `toInternal` → per-step strict normalization → step.normalize → op.normalize → re-validate.

### High-Leverage Issues

- `compileRecipeConfig` treats `null` config as `{}`; ensure callsites never rely on distinguishing “absent” vs “explicitly null” configs once cutover proceeds.
- Error aggregation is per-stage/per-step but compilation continues after errors; that’s good for UX, but it assumes later stages don’t depend on earlier compilation outputs (document this in the recipe contract if it’s a real invariant).

### Fix Now (Recommended)

- Add one unit test for `op.missing` and one for `step.normalize` shape-not-preserving; these are the two most likely failure modes during cutover.

### Defer / Follow-up

- Consider exporting a small “error formatting stability” note (codes + path conventions) as a doc adjacent to the compiler module once this becomes the author-facing canonical path.

### Needs Discussion

- Should stage compilation be allowed to “return” step ids not declared in `stage.steps` for experimental flows, or is the strict rejection (today) the intended hard guardrail?

### Cross-cutting Risks

- The compiler is now the choke point for canonicalization; any ambiguity in schema defaulting/cleaning order will show up here first—keep the ordering pinned by tests.

## REVIEW m7-t03-step-id-kebab-case

### Quick Take

Good guardrail: kebab-case enforcement is pushed into both `defineStep` (authoring SDK) and `createStage` (runtime composition), and the repo’s step ids were updated accordingly with tests.

### High-Leverage Issues

- There are now two independent regex implementations for step-id validation; keep them in sync (or factor to one shared helper) to avoid drift.
- This is a behavior change for any downstream content authors: ensure error messages are stable and actionable (they are today) and that the “migration surface” is clearly documented in the relevant authoring docs once cutover lands.

### Fix Now (Recommended)

- Add one test that asserts the exact error message shape for a bad id in both entrypoints (`defineStep` vs `createStage`) so tooling can rely on it.

### Defer / Follow-up

- Consider enforcing stage ids and other public ids with the same convention to avoid mixed-case surfaces creeping back in.

### Needs Discussion

- Should `createStage` validate the *derived* step id (e.g. `core.base.foundation.alpha`) as well, or is validating the local contract id sufficient?

### Cross-cutting Risks

- Id convention enforcement will cascade into config keys and compiler paths; changing it later will be expensive, so treat it as locked once used in authored configs.

## REVIEW m7-t04-stage-option-a

### Quick Take

Nice step toward the target architecture: stages can now expose a `public` authoring surface and a `compile` function, while still supporting “internal-as-public” fallback stages during migration.

### High-Leverage Issues

- `createStage` now synthesizes `surfaceSchema` and `toInternal`; this is a new public contract. Keep the reserved key rules (`knobs`) and compile-output restrictions enforced by tests, because many downstream failures will otherwise show up late in runtime.
- The “internal-as-public” surface uses `Type.Unknown()` for step config slots; that’s fine as a migration bridge, but it’s also a footgun if it becomes long-lived (unknown keys won’t be caught until step-level strict normalization).

### Fix Now (Recommended)

- Add a test that a stage with `public` but missing `compile` throws, and that a `compile` returning `knobs` throws (reserved key enforcement).

### Defer / Follow-up

- Consider sharing the kebab-case validation helper between stage and step contract code to avoid diverging error messages.

### Needs Discussion

- Should `compile` be allowed to omit step ids entirely (treated as empty) vs. required to return at least `{}` for every declared step? Today it’s permissive; confirm that’s the intended authoring DX.

### Cross-cutting Risks

- `surfaceSchema` becomes the de facto “public API surface” for authored config; any mismatch between stage compile semantics and schema defaults will cause subtle config drift.

## REVIEW m7-t05-domain-ops-registries

### Quick Take

This lands the right “ownership boundary”: domains export `compileOpsById`/`runtimeOpsById`, and authoring gets canonical binding helpers (`bindCompileOps`/`bindRuntimeOps`).

### High-Leverage Issues

- `compileOpsById` merging at the recipe boundary is a plain object spread; add a guardrail for duplicate `op.id` collisions so two domains can’t silently overwrite each other.
- `runtimeOp` is a nice narrow surface, but it relies on compile-time op shape; if compile-only fields grow, consider making runtime projection explicit and tested.

### Fix Now (Recommended)

- Add a tiny assertion helper like `mergeOpsById(...registries)` that throws on collisions; use it in recipes when assembling `compileOpsById`.

### Defer / Follow-up

- Consider migrating domains to export only registries (and discourage exporting a free-form `ops` bag) once enforcement rules are in place.

### Needs Discussion

- Do we want “domain entrypoint only” imports enforced at build/lint time now, or is it deferred to F2 enforcement tightening?

### Cross-cutting Risks

- Op id collision handling becomes an ecosystem safety concern as more domains adopt registries; silent overwrites are extremely hard to debug.

## REVIEW m7-t06-op-normalize-semantics

### Quick Take

This is the right semantic tightening: `resolveConfig` is fully removed and replaced with compile-time-only `normalize`, dispatched by `envelope.strategy`.

### High-Leverage Issues

- The transitional use of `NormalizeContext` in engine planning (until D2 removes planner normalization) is easy to forget; keep that “bridge” extremely explicit so runtime doesn’t accidentally depend on it long-term.
- Strategy-level `normalize` hooks now sit adjacent to runtime `run`; make sure no one treats `normalize` as safe to call at runtime (tests/enforcement should keep pressure on this).

### Fix Now (Recommended)

- Add a small regression test that `PipelineExecutor` / runtime execution paths never invoke `normalize` (even indirectly), since this is a key invariant for the cutover.

### Defer / Follow-up

- Consider separating compile-only strategy helpers from runtime strategy impls once the compiler is fully wired (reduces accidental imports).

### Needs Discussion

- Should `normalize` be allowed to change `strategy` as well as `config`, or is it intentionally constrained to be strategy-preserving?

### Cross-cutting Risks

- “Normalize semantics” are now a core authoring contract; accidental re-introduction of runtime normalization would invalidate the “validate-only engine” target.

## REVIEW m7-t07-recipe-boundary-compilation

### Quick Take

This is the real cutover lever: `createRecipe` now compiles author config via `compileRecipeConfig` before producing the engine execution plan, so the engine consumes canonical per-step configs.

### High-Leverage Issues

- `compileOpsById` is now a required part of `RecipeDefinition`; that’s great for explicitness, but it will be easy for recipe authors to forget (or to accidentally omit needed ops). Consider a helper that assembles registries from declared domains to reduce “manual wiring” errors.
- Using `RunSettings` as compiler `env` is a pragmatic bridge; keep the type contract tight so future “true env” additions don’t implicitly depend on context-only data.

### Fix Now (Recommended)

- Add a small assertion in `createRecipe` that `compileOpsById` is non-null and object-ish, and a targeted test that missing `compileOpsById` fails fast with an actionable error.

### Defer / Follow-up

- Consider moving `compileOpsById` assembly into a reusable recipe helper once more than one recipe exists (avoids copy/paste merge logic).

### Needs Discussion

- Does the long-term target keep `compileConfig(settings, config)` as a public surface for tooling, or is it strictly internal to recipe execution?

### Cross-cutting Risks

- Recipe boundary is now the canonical compilation choke point; any drift between stage `surfaceSchema` and `compile` semantics will be concentrated here.

## REVIEW m7-t08-stage-step-config-shape

### Quick Take

Pragmatic migration move: align stage inputs to the new “single object per stage” shape, and drop legacy preset blocks that would fail strict compiler validation rather than introducing shims.

### High-Leverage Issues

- Removing `ecology.features` from presets is a real behavior loss (tuning knobs go away); it’s correctly captured in `triage.md`, but it will surprise anyone comparing old preset output. Make sure E2/E3 explicitly restores an authored surface for those knobs.
- This change is mostly “content wiring” churn; keep tests that exercise standard runs as the primary safety net (they’re doing the real work here).

### Fix Now (Recommended)

- Add a short doc note (or issue breadcrumb) in E2/E3 pointing back to this decision so “restore preset feature tuning” doesn’t get forgotten during ecology migration.

### Defer / Follow-up

- Consider extracting a small “preset migration” helper so map presets can be updated mechanically as stage ids / step ids evolve.

### Needs Discussion

- For presets, do we want a stable author-facing schema with backwards-compat mapping (later), or is “no shims ever” strictness intended even for end-user mod configs?

### Cross-cutting Risks

- Content-level config removals can mask compiler issues by “making inputs empty”; keep at least one preset intentionally non-trivial per stage so compilation is exercised.

## REVIEW m7-t09-remove-runtime-fallbacks

### Quick Take

Strong cut: `instantiate`/`runRequest` now require compiled, total step-id keyed configs, so author-facing configs cannot bypass the recipe-boundary compiler.

### High-Leverage Issues

- `assertCompiledConfig` is a runtime guardrail; it’s great for safety, but it can produce surprising failures if someone uses `instantiate` for tooling with partial configs. The error message points to `compileConfig`, which is good—keep it stable.
- The compiler remains the only place that can produce a total config; ensure “missing step config” is always treated as a compile-time error (not patched at runtime).

### Fix Now (Recommended)

- Add one test that calling `runRequest` with a partial compiled config fails fast with the exact actionable error text (to keep downstream tooling expectations stable).

### Defer / Follow-up

- Consider whether `instantiate` should be marked as “advanced/tooling only” in docs once external consumers exist.

### Needs Discussion

- Do we want a lighter-weight “unsafe instantiate” for internal testing, or is the hard guardrail intentional everywhere?

### Cross-cutting Risks

- This is the point-of-no-return for config shape compatibility; any remaining legacy entrypoints will now fail loudly.

## REVIEW m7-t10-executor-plan-only

### Quick Take

Clean, high-signal cut: executor no longer synthesizes configs; runtime consumes execution plans only, which aligns with “compiler owns normalization/defaulting.”

### High-Leverage Issues

- This is a breaking API change (`execute`/`executeAsync` removed); it’s good for architecture purity, but ensure all external entrypoints route through `recipe.compile` + `executor.executePlan*`.
- `executePlan` casts `node.config as TConfig`; if any legacy callsite still builds plans with “almost compiled” configs, type safety won’t catch it—compiler gating must be the real protection.

### Fix Now (Recommended)

- Add one top-level test (or smoke check) that external mod runtime entrypoints no longer call the removed executor APIs, to avoid regressions via copy/paste older snippets.

### Defer / Follow-up

- Consider a small “plan executor” facade for tooling that used `execute(...)` convenience, but keep it in tooling-land, not engine core.

### Needs Discussion

- Do we want to hard-error if `node.config` is `undefined` at runtime (instead of letting steps crash), or is that already guaranteed by compilation invariants?

### Cross-cutting Risks

- Any remaining “config synthesis” utilities elsewhere (planner, shims) will now be architecturally inconsistent; D2/F1 must fully eliminate them.

## REVIEW m7-t11-planner-validate-only

### Quick Take

This completes the engine-side cut: `compileExecutionPlan` becomes validate-only (no defaulting/cleaning, no step hooks), which is exactly what the compiler-first architecture needs.

### High-Leverage Issues

- There is now a second implementation of unknown-key + error-path formatting logic (planner + compiler). That’s okay short-term, but treat it as a “must not drift” pair—small differences will produce confusing UX.
- The decision to treat missing step config as invalid is strong and consistent with “compiled output is total”; ensure all recipe instantiation paths always populate configs (C3’s `assertCompiledConfig` is doing the right job here).

### Fix Now (Recommended)

- Add one integration-ish test that runs `recipe.compile(settings, config)` and asserts that any schema-invalid compiled step config fails in the compiler stage rather than at plan validation (keeps error surfaces “owned” by the compiler).

### Defer / Follow-up

- Consider factoring shared “strict validation + unknown key detection” into a single utility once the compiler API stabilizes.

### Needs Discussion

- Do we want planner errors to reference `/config/...` (compiler paths) instead of `/recipe/steps/.../config`, or is keeping them distinct important for debugging?

### Cross-cutting Risks

- Once both compiler and planner validate strictly, any mismatch in schema defaults (e.g. missing `default: {}`) will become a sharp edge for content authors.

## REVIEW m7-t12-ecology-domain-entrypoint

### Quick Take

Good exemplar move: ecology now has a contract-only surface (`@mapgen/domain/ecology/contracts`) plus a canonical entrypoint exporting `compileOpsById`/`runtimeOpsById`, reducing deep-import sprawl.

### High-Leverage Issues

- Ensure “contract-only” stays true over time: it’s easy for a contract file to start importing runtime helpers; enforcement should catch that early.
- Domain entrypoint still has a large `ops` bag; that’s fine internally, but once import-boundary enforcement tightens, prefer consumers depend on registries/contracts rather than reaching into implementation exports.

### Fix Now (Recommended)

- Add an automated check (lint/rg gate) that blocks imports from `@mapgen/domain/ecology/ops/**` outside the domain module itself, so this doesn’t regress quietly.

### Defer / Follow-up

- Consider mirroring this pattern in other domains once ecology migration is stable (so recipe compilation assembly doesn’t become ecology-special).

### Needs Discussion

- Do we want contracts as named exports only (no `contracts` bag), or is the `contracts` bag intentionally the ergonomic primary surface?

### Cross-cutting Risks

- Import-boundary enforcement will affect dev ergonomics; when it tightens (F2), expect some churn across tests/steps.

## REVIEW m7-t13-ecology-steps-migration

### Quick Take

This is the right migration pattern: steps bind ops by id, do compile-time normalization via `normalize`, and runtime calls go through `runtimeOpsById` (no deep imports, no runtime config shaping).

### High-Leverage Issues

- Binding ops at module load time will throw early if registries drift; that’s good, but it means “importing a step” can now fail hard. Keep error messages crisp (OpBindingError is good).
- Ensure step-level `normalize` remains shape-preserving and schema-validating; otherwise, failures will surface later with less context. Prefer tests for the most complex steps (`features` / `features-plan`).

### Fix Now (Recommended)

- Add one focused test that asserts an ecology step no longer imports from `@mapgen/domain/ecology/ops/**` (an rg-based test or lint rule), since this was the main “no regression” goal.

### Defer / Follow-up

- Consider factoring the repeated `bindCompileOps`/`bindRuntimeOps` pattern into a tiny helper per domain/step family to reduce boilerplate without reintroducing implicit globals.

### Needs Discussion

- Should step `normalize` call `op.normalize` directly (as done here) or should we rely solely on the compiler’s `normalizeOpsTopLevel` pass to avoid duplication?

### Cross-cutting Risks

- As more steps adopt this pattern, the distinction between compile-time ops vs runtime ops becomes critical; accidental mixing will be subtle and hard to debug without enforcement.
## REVIEW m7-t14-ecology-stage-public-compile

### Quick Take

Strong exemplar: ecology now demonstrates Stage Option A end-to-end (explicit `public` schema + `compile` mapping) with compile-error tests that lock in the intended UX.

### High-Leverage Issues

- The public surface is intentionally broad (camelCase mirrors of every ecology step). That’s fine for an exemplar, but it may be wider than desired for “real authoring DX”; future stages might want a curated subset.
- `compile` currently ignores `env` and `knobs`; that’s okay, but once knobs become meaningful, ensure they’re either mapped explicitly or intentionally unused (and tested).

### Fix Now (Recommended)

- Add one test asserting that an omitted public field compiles to an omitted step config only if the step schema allows it; otherwise, missing step configs should fail deterministically (keep the “total compiled output” invariant).

### Defer / Follow-up

- Consider a small helper for camelCase ↔ kebab-case mapping so future stages don’t hand-roll the same mapping table.

### Needs Discussion

- Should the stage public schema be allowed to reuse step schemas directly (as done here), or should public schemas be decoupled/curated to avoid leaking internal envelope details?

### Cross-cutting Risks

- Public-stage mapping is an author-facing contract; changing field names later will be a breaking change for configs/presets.

## REVIEW m7-t15-verify-no-shims

### Quick Take

High-value cleanup: removes lingering non-compiler `Value.*` defaulting by introducing schema-default extraction in authoring, and keeps the “no dual path” posture intact.

### High-Leverage Issues

- `applySchemaDefaults`/`buildSchemaDefaults` intentionally implement only a subset of TypeBox defaulting semantics (object + explicit defaults). That’s fine if schemas are written accordingly, but it’s easy to drift into schemas that relied on `Value.Default` behavior for unions/arrays.
- This defaulting logic sits in authoring core; any mismatch will be very hard to debug once configs flow through compiler → planner validate-only → executor.

### Fix Now (Recommended)

- Add targeted tests for `applySchemaDefaults` covering nested objects, `null`/`undefined`, and “no defaults present” cases, and document the supported subset (object-only) as the contract.

### Defer / Follow-up

- Consider pushing all defaulting into compiler-only paths eventually and making authoring defaults purely “schema metadata,” but this requires a careful layering plan to avoid cycles.

### Needs Discussion

- Is it acceptable that schema defaults for arrays/unions are effectively ignored by authoring default extraction, or should those schemas be disallowed/rewritten?

### Cross-cutting Risks

- Defaulting semantics are now split between compiler and authoring; keep them aligned intentionally or you’ll get “it works in tests but not in compilation” class bugs.

## REVIEW m7-t16-final-hygiene

### Quick Take

This is a strong “make it real” pass: `settings` → `env` is fully cut over, runtime validation no longer imports `typebox/value`, and domain-refactor guardrails are tightened.

### High-Leverage Issues

- Switching runtime validation from `Value.Errors` to `TypeCompiler.Errors` may subtly change error messages/paths; keep tests pinned to the contract you want (or loosen them to “contains path fragment”) so refactors don’t churn error UX.
- The `env` rename touches *every* boundary; any external entrypoint still producing `settings` will now fail hard. Ensure mod entrypoints and any CLI/tooling examples are updated in lockstep.

### Fix Now (Recommended)

- Add one explicit “RunRequest schema rejects settings key” test (or guardrails check) so no legacy callsite can reintroduce `settings` quietly.

### Defer / Follow-up

- Consider consolidating “strict unknown-key detection” logic (compiler/planner/authoring) once the error surface is stable, to reduce drift risk.

### Needs Discussion

- Should `EnvSchema` remain tightly aligned with `RunSettings` historical shape, or do we want to slim it to only what the compiler/runtime truly needs (and move the rest to `metadata`)?

### Cross-cutting Risks

- Enforcement tightening is great, but it increases the cost of incremental refactors; ensure guardrails scripts are fast and clearly actionable when they fail.

## Remediation Status (Post-Implementation)

Remediation plan items 1-13 are complete via the stacked remediation branches:

- `m7-remediate-runtime-validation` (fail-fast execution, compiler-backed op runner for dev/test, runtime validation removal, artifact handler invariants).
- `m7-remediate-op-runtime-defaulting` (moved strategy normalization into compile-time `normalize` hooks).
- `m7-remediate-docs-validation-contract` (docs/triage updates for the validated runner contract).
- `m7-remediate-core-utils` (centralized clamp/roll/range helpers in `mapgen-core` + updated imports).
- `m7-remediate-lint-guardrails` (lint rules for runtime validation surfaces, schema default authoring, and shared utility imports).
- `m7-remediate-milestone-tracking` (milestone tracking updates with remediation references).

Notes:
- Runtime schema validation/defaulting is removed from production execution paths; compiler-backed validation is the sole dev/test/tooling runner.
- Defaults come from property defaults; object-level defaults that mask deep defaults are blocked via lint guardrails.
