# Proposal: Composition-first recipe compiler — review synthesis & remediation list

This document deduplicates and synthesizes two independent reviews (“Agent A” and “Agent B”) of:
- `docs/projects/engine-refactor-v1/resources/spike/spike-domain-step-architecture/proposal-recipe-compile-architecture.md`

It is intentionally **not** a redesign. It is a curated list of distinct issues/concerns that must be resolved by either:
- clarifying the canonical doc (wording/precision), and/or
- pinning down missing wiring/type surfaces, and/or
- acknowledging a reviewer misunderstanding/stale snapshot.

Legend for categories:
- **Unresolved (real)**: requires an explicit decision/specification to avoid “two ways to do it”.
- **Doc ambiguity**: the architecture may be correct, but the document is misleading/underspecified.
- **Implementation gap**: required work to satisfy locked invariants, not (necessarily) a design change.
- **Already decided, not fully encoded**: consistent with intent, but missing canonical wording or has drift.
- **Missed context / stale snapshot**: reviewer claim contradicts the current repo state as of today.

---

## Issues (deduplicated)

### R1 — Ops-derived schema vs “author can omit envelopes” (input vs compiled surfaces)

**Category:** Unresolved (real) + Doc ambiguity  
**Sources:** Agent A, Agent B  

**What reviewers saw**
- The doc says ops-derived schemas produce a strict object where **each op key is required**, but examples also state **authors may omit** an op envelope and the compiler will prefill it.

**Why it matters**
- Without an explicit “author-input typing vs compiled/runtime typing” story at the step boundary, TypeScript and the examples will disagree, and implementers may accidentally create a second, parallel validation path (“loose input schema” vs “strict runtime schema”) without meaning to.

**Messy / likely confusion source**
- The doc mixes “strict canonical schema” with “author can omit keys” without clearly stating:
  - which surface is allowed to be partial (author input), and
  - exactly when op default prefilling occurs relative to strict schema validation.

**Remedy direction (non-architectural)**
- Make the step-level split explicit (types and/or contract-level helpers) so:
  - author input may omit op-envelope keys, and
  - compiled/runtime config is total and validated as strict.

---

### R2 — Canonical ops injection mechanism (avoid “two step shapes”)

**Category:** Unresolved (real) + Doc ambiguity  
**Sources:** Agent A, Agent B  

**What reviewers saw**
- Example C can be read as introducing a new engine/runtime signature (e.g. `run(context, config, { ops })`) or as supporting multiple patterns (closure injection vs third arg injection).

**Why it matters**
- If the runtime accepts multiple step signatures, the system will drift into “two ways to do it”, which is exactly the regression this architecture is trying to avoid.

**Messy / likely confusion source**
- The doc’s examples show injected ops inside `run`, but the baseline engine step surface is `run(context, config)` and the doc does not explicitly commit to *how* ops are provided without changing the engine interface.

**Remedy direction (non-architectural)**
- Choose one canonical wiring and state it unambiguously (e.g., closure-bound ops at step construction time so engine remains `run(context, config)`).

---

### R3 — Runtime defaulting/cleaning still exists in engine executor path(s)

**Category:** Implementation gap  
**Sources:** Agent B (and partially Agent A’s engine checklist)  

**What reviewers saw**
- The doc focuses on removing defaulting/cleaning from `packages/mapgen-core/src/engine/execution-plan.ts`, but there is also a runtime path that defaults/cleans step config during execution (e.g. `packages/mapgen-core/src/engine/PipelineExecutor.ts`).

**Why it matters**
- This violates the locked invariant “no runtime schema defaulting/cleaning/resolution”, and it also risks “accidental success” where missing compiler work goes unnoticed because runtime keeps papering over it.

**Remedy direction (non-architectural)**
- Identify and remove/redirect any runtime execution path that synthesizes config via schema at runtime; require compiled configs.

---

### R4 — Prevent runtime access to compile-time normalization hooks (ops/steps)

**Category:** Implementation gap + Already decided, not fully encoded  
**Sources:** Agent B (and aligns with the architecture’s “no runtime defaulting”)  

**What reviewers saw**
- Even if the engine never calls step/op normalization at runtime, injected op objects may still carry a normalization hook (baseline: `resolveConfig`; planned rename: `normalize`), which step authors could call inside `step.run`.

**Why it matters**
- This reintroduces the banned behavior (“apply defaults/normalization mid-run”) as a footgun and undermines enforcement of the “compiler-only” boundary.

**Remedy direction (non-architectural)**
- Split op surfaces into a compiler-facing surface (may include normalize) vs runtime-facing surface (must not), and ensure binding/injection returns runtime-only ops.

---

### R5 — Stage/recipe typing must support `knobs` and optional stage `public` view

**Category:** Unresolved (real) + Doc ambiguity  
**Sources:** Agent A, Agent B  

**What reviewers saw**
- The doc proposes `stageConfig.knobs` as part of the single stage surface, plus per-stage optional public schemas/compile hooks.
- Baseline type surfaces (as currently described) derive recipe config largely from step-id maps; without new type parameters or new “stage surface” types, `knobs` and stage public fields cannot be represented without casts.

**Why it matters**
- If stage/recipe config typing can’t represent the model, DX collapses (everything becomes `Record<string, unknown>`), and “invariants” become conventions rather than enforced surfaces.

**Remedy direction (non-architectural)**
- Define explicit type surfaces for stage author input vs compiled output, and thread stage ids/step ids as literal types so mapped types remain precise.

---

### R6 — Literal id preservation for stages/steps (DX & typing feasibility)

**Category:** Unresolved (real)  
**Sources:** Agent B (and indirectly Agent A’s concerns about typed binding)  

**What reviewers saw**
- If `Stage.id` / `Step.id` are typed as `string` (not generic literal ids), recipe config typing and autocompletion degrade.

**Why it matters**
- This architecture depends heavily on “stage-id keyed” and “step-id keyed” config maps being type-safe and IDE-friendly.

**Remedy direction (non-architectural)**
- Preserve literal ids in step/stage types (generic `Id extends string`) and ensure factories return those literal ids in their types.

---

### R7 — Reserved key enforcement (`"knobs"`) needs a hard enforcement point

**Category:** Doc ambiguity / Implementation gap  
**Sources:** Agent A, Agent B  

**What reviewers saw**
- The doc includes a reserved key rule (“no step id may be `knobs`”), but it is not pinned to a single authoritative enforcement point (authoring factory vs compiler vs lint-only).

**Why it matters**
- If enforcement is “lint-only”, collisions can slip through and become runtime/debugging failures.

**Remedy direction (non-architectural)**
- Choose one earliest-safe enforcement location (likely stage construction / stage compile surface construction) and make it a hard runtime check (lint can be additive).

---

### R8 — Stage `public` / `surfaceSchema` should be constrained to an object schema shape

**Category:** Doc ambiguity  
**Sources:** Agent B  

**What reviewers saw**
- The doc types stage schemas as generic `TSchema`, but the mechanics assume object field semantics (destructuring `{ knobs, ...configPart }`, strict object validation, reserved key checks).

**Why it matters**
- If `public` is any `TSchema`, implementers can interpret the system in incompatible ways (non-object public schemas), and reserved-key enforcement becomes underspecified.

**Remedy direction (non-architectural)**
- Constrain stage public schemas to object schemas (or a factory shorthand that produces a strict object schema).

---

### R9 — Canonical compile pipeline ordering has a numbering/step gap

**Category:** Doc ambiguity (mechanical)  
**Sources:** Agent A  

**What reviewers saw**
- The Phase B list starts at `4.` (missing `3.`), which increases the chance that implementers end up with mismatched “checklists” during build-out.

**Why it matters**
- Paper cuts like this cause real drift when multiple agents implement slices in parallel.

**Remedy direction**
- Fix the numbering and ensure the pipeline description is internally consistent.

---

### R10 — “O2 is closed” is true in intent, but overstated in “baseline realized” claims

**Category:** Already decided, not fully encoded (doc-to-code drift risk)  
**Sources:** Agent A  

**What reviewers saw**
- The doc asserts the author-input vs compiled-output split as “closed” and “repo-verified”.
- In baseline, `CompiledRecipeConfigOf<T>` may still be an alias of `RecipeConfigOf<T>` (i.e., the name exists but doesn’t yet express the new compiler-driven distinctions).

**Why it matters**
- When the doc labels something “already realized”, implementers may skip necessary work or assume behaviors exist that do not.

**Remedy direction**
- Keep the decision “closed”, but tighten the language to distinguish:
  - “type surfaces exist” vs
  - “compiler-driven semantics fully implemented”.

---

### R11 — Repo-grounding mismatches in reviews (potentially stale snapshot)

**Category:** Missed context / stale snapshot  
**Sources:** Agent B  

**What reviewers saw**
- Agent B reported missing baseline files/types (e.g. `packages/mapgen-core/src/authoring/op/ref.ts`, `.../op/envelope.ts`, `RecipeConfigInputOf`/`CompiledRecipeConfigOf`).

**Repo reality (as of current working tree / tracked files)**
- These artifacts exist as tracked files/types:
  - `packages/mapgen-core/src/authoring/op/ref.ts`
  - `packages/mapgen-core/src/authoring/op/envelope.ts`
  - `RecipeConfigInputOf` / `CompiledRecipeConfigOf` in `packages/mapgen-core/src/authoring/types.ts`

**Why it matters**
- This does not invalidate the underlying conceptual concerns, but it does mean parts of the review should be interpreted as “reviewed an older snapshot” rather than a real gap.

**Remedy direction**
- When reconciling, treat the “missing file” claims as informationally stale; keep the *real* concerns (typing precision, single canonical wiring, runtime defaulting elimination).

---

### R12 — “Who calls compileRecipeConfig” should be pinned to one explicit call chain

**Category:** Doc ambiguity  
**Sources:** Agent B  

**What reviewers saw**
- The doc implies recipe-owned compilation, but does not pin the exact call chain (e.g., whether `createRecipe.compile/run/runRequest` invokes compilation, or whether callers do it manually).

**Why it matters**
- If not pinned, it’s easy to accidentally end up with two supported entry paths:
  - one that compiles configs, and
  - one legacy path that relies on engine/runtime defaulting.

**Remedy direction (non-architectural)**
- Specify one canonical entry path and either remove or explicitly deprecate the legacy path(s).

---

## Notes

This list is intended as a working remediation index. It is expected that several items will resolve as “doc clarification only”, while a subset are true pre-implementation blockers (notably: R2/R3/R4/R5/R6).

