Below is the decision ledger as of this conversation, organized exactly along your three requested dimensions. Where something is still open, I mark it as **Open / tentative** rather than treating it as settled.

---

## 1) Architectural decisions already made

### A. Operation and strategy authoring

1. **Contract-first operations**

* **Decision:** Every operation has a contract that is defined independently of implementation logic.
* **In practice:** The contract is the stable artifact imported across modules; implementations are attached later.

2. **Operation contract declares the full strategy surface (IDs + config schemas)**

* **Decision:** The operation contract includes all strategy IDs and their config schemas (including `default`), but **no strategy implementations**.
* **In practice:** The contract is the single source of truth for: input schema, output schema, and the set of possible `{ strategy, config }` configurations.

3. **Plan-truth op config is always an envelope**

* **Decision:** The only plan-truth configuration shape at step boundaries is the envelope `{ strategy, config }`.
* **In practice:** Steps, recipes, and map file config never use a “flattened” or “implicit default strategy” shorthand. The op config schema is a union over strategy envelopes.

4. **Default strategy is mandatory and identified by the literal `"default"`**

* **Decision:** Every operation must define a `default` strategy.
* **In practice:** The contract requires `default` to exist; `defaultConfig` is always derived using it.

5. **Input/output are shared across strategies**

* **Decision:** Strategy differences are algorithmic only; IO does not vary per strategy.
* **In practice:** If IO differs, that is a different op, not a different strategy.

6. **`defaultConfig` is derived from the default strategy’s config schema defaults**

* **Decision:** `defaultConfig` is not authored manually; it is derived from the default strategy config schema.
* **In practice:** This prevents duplicated defaults across layers and ensures defaults remain schema-driven.

7. **Per-strategy `resolveConfig` operates on inner config**

* **Decision:** `resolveConfig` (when present) is strategy-scoped and takes/returns the inner config, not the envelope.
* **In practice:** The op’s `resolveConfig` is a dispatcher: unwrap envelope → resolve inner → rewrap.

8. **Out-of-line strategy modules regain inference via contract binding**

* **Decision:** Strategies defined out-of-line must be authored using a helper that binds them to the op contract at definition time (to satisfy TypeScript contextual typing constraints).
* **In practice:** Authors do not export `Static<>` aliases or thread explicit generics for config/input/output; the contract binding provides the contextual types for `run` and `resolveConfig`.

9. **Inline POJO strategies remain the “best path”**

* **Decision:** Inline strategies inside `createOp({ strategies: { … } })` must remain fully inferred with zero boilerplate.
* **In practice:** No callsite rewrites are required for the inline authoring shape; improvements target out-of-line strategies and shared helpers.

---

### B. Settings model (dependency inversion)

10. **Domains own their tuning settings; the engine does not**

* **Decision:** Domain logic must not depend on an engine-owned `RunSettings` type.
* **In practice:** Domains declare their own tuning schema(s); recipes compose them; engine transports settings as opaque/generic payload.

11. **Recipes compose settings from global + domains + recipe scope**

* **Decision:** A recipe defines the canonical run settings schema by composing:

  * global tuning knobs (authoring SDK-owned),
  * per-domain tuning knobs (domain-owned),
  * optional recipe-local knobs.
* **In practice:** The recipe contract becomes the canonical, typed source of the run settings shape.

12. **Operations/strategies only see declared settings slices**

* **Decision:** Ops declare the subset of settings they may depend on (slice selection); strategies only receive that slice.
* **In practice:** This prevents accidental coupling to unrelated settings fields and reduces “settings plumbing” ambiguity.

13. **Separation between tuning knobs and runtime-only parameters**

* **Decision:** There is an explicit conceptual split:

  * tuning knobs (author-visible, compile-time),
  * runtime parameters (player/game runtime).
* **Status:** **Open / partially specified.**

  * We agreed on the separation, but the canonical representation and plumbing (where runtime parameters live and how they are typed/validated) is not fully locked down yet.

---

### C. Steps, contracts, and config normalization

14. **Steps are contract-first**

* **Decision:** Steps have dedicated contracts (schema + metadata), and implementations attach logic later.
* **In practice:** Contract modules are import-safe and composable; implementation modules import the contract and only implement `run` (and optional transforms).

15. **Step config is compositional by default**

* **Decision:** The baseline step config surface is the mechanical composition of the op config envelopes it uses.
* **In practice:** Step contracts can be generated from an “ops map” to avoid restating schema structure and defaults.

16. **Step-level config normalization is optional, not baseline authoring**

* **Decision:** Step-level config normalization exists only when a step intentionally exposes a facade or needs cross-op invariants/derivations.
* **In practice:** Most steps should not author custom normalization; the common case should be generated/automatic.

17. **Operation config normalization should not require per-step boilerplate forwarding**

* **Decision:** When steps compose ops directly, the “call op.resolveConfig for each op config field” behavior should be auto-generated by step composition helpers, not manually written.
* **In practice:** This removes the repeated “resolve plumbing” and repeated defaults that currently appear in step modules.

18. **`createStep` must become schema-driven for type inference**

* **Decision:** Step config types should be derived from the step config schema (analogous to op typing).
* **In practice:** Authors should not need to export config aliases or manually annotate `run`/normalization parameters to get correct types.

19. **Step normalization wiring must be fixed**

* **Decision:** Step normalization hooks must actually be wired through recipe/stage compilation into the plan compile process.
* **In practice:** Any existing wiring that drops step normalization must be corrected as part of the refactor.

---

### D. Dependency keys and step dependencies

20. **Rename the concept from “tag” to “dependency key / dependency ID”**

* **Decision:** “Tag” is reserved for official game concepts; pipeline identifiers are dependency keys.
* **In practice:** Rename registry/types accordingly (e.g., `DependencyRegistry`), and treat dependency keys as first-class contract identifiers.

21. **Keep the three dependency categories**

* **Decision:** Maintain three dependency kinds as separate namespaces:

  * `artifacts`
  * `fields`
  * `effects`
* **Decision detail:** Prefer `artifacts` (not “products”). Prefer `fields` over `buffers` because “buffers” already denotes a separate internal concept in the current runtime model.
* **In practice:** Dependency keys remain prefixed by kind (`artifact:*`, `field:*`, `effect:*`) but are referred to as dependency keys (not tags).

22. **Canonical key sources are catalogs, not ad-hoc strings**

* **Decision:** Dependency keys should be declared in canonical catalog modules (core/domain/recipe), not as ad-hoc strings in step implementations.
* **In practice:** Step contracts reference keys from catalogs, and step implementations import keys via their step contract (so the implementation has a single import while the keys remain canonical and shareable).

23. **Step contracts own `requires` / `provides` declarations**

* **Decision:** Step contracts declare what they require and what they guarantee.
* **In practice:** This information composes upward into stage/recipe contracts for tooling/validation/introspection.

---

### E. Standardized structure and guardrails

24. **Stable, repeatable directory/file conventions**

* **Decision:** Canonical structure should be stable across “simple” and “hefty” implementations:

  * contracts separated from implementations,
  * routers for contracts and implementations at domain/recipe scope.
* **In practice:** This is explicitly intended to make authoring repeatable for both humans and agents.

25. **Guardrails are a first-class part of the refactor**

* **Decision:** Enforce boundaries and prevent regressions via lint/grep/test guardrails.
* **In practice:** At minimum:

  * forbid engine settings types leaking into domain/authoring layers,
  * forbid ad-hoc dependency key strings,
  * enforce canonical file structure patterns,
  * preserve “no runtime config merges” style constraints where applicable.

---

## 2) Problems, design goals, and constraints

### Key problems to solve

* **Type inference/DX failures across module boundaries**

  * Out-of-line strategies and steps lose inference and require exported type aliases, explicit generics, or manual annotations.

* **Boundary leakage**

  * Domain/authoring layers depend on engine runtime settings types.
  * Settings responsibilities are unclear and overly coupled.

* **Boilerplate and repetition**

  * Step schemas restate op defaults.
  * Step normalization forwards into ops manually.
  * Dependency keys are scattered and imported inconsistently.

* **Conceptual confusion**

  * Multiple layers of config normalization feel redundant.
  * Unclear separation of:

    * tuning knobs vs runtime parameters,
    * op config vs step config vs recipe config.

* **Import tangles**

  * Authors are forced to port types/imports everywhere to get autocomplete and correctness.

### Design goals and priorities (as stated repeatedly)

* **Maximize authoring DX**

  * Authoring should be declarative, low-boilerplate, and heavily inferred.
  * Reduce import churn; prefer “import one contract/factory value” rather than importing multiple types.

* **Contract-first everywhere**

  * Contracts should be import-safe, composable, and implementation-free.
  * Implementations attach later (router/handler style).

* **Composition and declaration over glue code**

  * Schema composition should build the final modder-facing config structure mechanically.
  * Normalization/translation should be optional and explicit.

* **Clear boundaries**

  * Domain logic is pure and engine-agnostic.
  * Engine transports settings, does not define domain settings.

* **Standardized structure**

  * Stable directory conventions for ops/steps/domains/recipes so patterns are repeatable.

### Explicit constraints / do-don’t rules

* **Do not redesign the envelope model**

  * Keep `{ strategy, config }` as plan truth everywhere.

* **Default strategy must exist**

  * `"default"` is mandatory.

* **IO shared across strategies**

  * Different IO implies different ops.

* **Inline strategy authoring remains zero-boilerplate**

  * No regression in the best path.

* **Avoid multiple competing authoring shapes**

  * If convenience helpers exist, there must still be one canonical pattern.

* **Naming constraints**

  * Avoid using “tag” for pipeline dependency identifiers.
  * Keep category names aligned with runtime reality (artifacts/fields/effects).

* **No ad-hoc string sources for dependency keys**

  * Dependency keys come from catalogs/contracts and are validated.

---

## 3) Relationship between decisions and the problem space

Below, each decision is mapped to the problems/goals it addresses, plus any tensions.

### Operation/strategy contract-first decisions (1–9)

* **Addresses:**

  * inference/DX failures (especially out-of-line strategies),
  * boilerplate around exported `Static<>` aliases,
  * contract-first + composition goals.
* **Tradeoffs / tensions:**

  * Out-of-line inference requires importing a contract handle at definition time (TypeScript constraint). This is accepted as the minimal necessary import overhead.

### Settings inversion decisions (10–13)

* **Addresses:**

  * boundary leakage (domain depending on engine settings types),
  * conceptual separation (domain knobs vs engine runtime),
  * declarative composition (recipes own settings composition).
* **Tradeoffs / tensions:**

  * **Open item:** the exact representation of runtime-only parameters vs tuning knobs is not fully finalized. There is a risk of conflation unless the canonical model explicitly separates them in types and modules.

### Step contract + optional normalization decisions (14–19)

* **Addresses:**

  * boilerplate in step modules (defaults + forwarding),
  * conceptual confusion (why normalization exists),
  * DX (steps should be declarative by default),
  * correctness (normalization must be wired, not dropped).
* **Tradeoffs / tensions:**

  * Auto-generation of normalization and defaults increases framework machinery, but it replaces repetitive author code with predictable convention.
  * Facade/translation steps remain possible, but are explicitly the exception case.

### Dependency key decisions (20–23)

* **Addresses:**

  * naming overload and conceptual clarity,
  * ad-hoc string sprawl,
  * import tangles and lack of autocomplete,
  * contract-first composability of step dependencies.
* **Tradeoffs / tensions:**

  * Keeping canonical key catalogs separate from step contracts can increase the number of modules in the contract layer, but the “step contract re-exports step-local dependencies” pattern was accepted to keep implementation imports minimal while preserving canonical sources.

### Structure + guardrails decisions (24–25)

* **Addresses:**

  * repeatability for humans/agents,
  * regression risk during refactor,
  * boundary enforcement.
* **Tradeoffs / tensions:**

  * Strong guardrails can initially increase friction when introducing new modules, but they reduce long-term drift and make the architecture teachable.

---

### Snapshot: what’s still open

* **Runtime-only parameters vs tuning knobs (formalization)**

  * We agreed on the separation; the exact canonical representation and propagation path remains partially open.

* **Exact placement of dependency key catalogs**

  * The principle is set (catalogs are canonical), but the final split across core vs domain vs recipe catalogs is still somewhat flexible based on how much reuse you want across recipes.

* **Stage semantics**

  * Stages are treated primarily as composition/grouping. Whether stages gain stronger “contract router” status vs remaining lightweight is not fully locked.

---

If you want, the next step after this ledger would be to turn each “Open / tentative” item into an explicit decision with crisp acceptance criteria, but per your instruction I have not proposed anything new here—only extracted and structured what we already established.
