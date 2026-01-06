## Canonical Design Goals and Constraints (Merged)

These are the stable goals/guardrails that should shape decisions across the Civ 7 mapgen authoring + compilation architecture. They are not implementation plans.

---

### 1) Modder-first public experience

**G1 — Single friendly public entrypoint**
Modders author maps through one obvious API (e.g., a single “create map” entry) with a plain config object—no secondary registries, no hidden wiring, no engine concepts.

**G2 — Public config is declarative, hierarchical, and workflow-shaped**
The modder-facing config should read like the conceptual workflow (recipe → stage → step), as a nested, declarative structure.

**G3 — Public config must not require internal knowledge**
Modders should not need to understand internal mechanisms (ops, pipeline internals, internal IDs, dependency plumbing, strategy envelopes, etc.). Public config is a deliberate façade, not a mirror of implementation structure.

**G4 — Minimize competing public authoring shapes**
There should be one canonical public pattern. Convenience helpers are acceptable, but “two ways to do everything” is a design smell and must be justified.

---

### 2) Contract-first composition as the backbone

**G5 — Contracts are the primary artifacts**
Schemas/contracts define the configuration space and metadata in an implementation-free, import-safe way. Implementations attach later.

**G6 — Mechanical upward composition of contracts**
Configuration surfaces should be derivable by composing contracts upward (ops → steps → optional stages → recipes → final public contract) without hand-authored glue.

**G7 — Public config is a view over internal contracts**
Internal contracts define correctness and requirements; public contracts are a curated view designed for modders. This separation is intentional and maintained.

---

### 3) Static knowability, type inference, and composable schemas

**G8 — Public config must be statically knowable and type-composable**
The final public config type/schema should be mechanically derivable from composed contracts/views with strong typing and minimal manual annotation.

**G9 — Strong inference at the point of definition**
Authors (ops/strategies/steps/recipes) should get correct types without exporting schema-derived type aliases, threading explicit generics, or manually annotating callback signatures.

**G10 — Out-of-line modules remain ergonomic**
Defining/exporting strategies and steps out-of-line should not degrade inference or force “type porting” everywhere. The architecture must accommodate TypeScript’s contextual typing realities.

---

### 4) Defaults, normalization, and “resolution” discipline

**G11 — Defaults originate once and propagate mechanically**
Defaults should be defined at the lowest owning contract (typically strategy/op contracts) and flow upward by derivation—no restating defaults at step/stage/recipe layers.

**G12 — Deterministic compile-time normalization only**
Any normalization/derivation of authored config should be deterministic and occur during compilation (or pre-run), not per-tile runtime.

**G13 — Avoid distributed forwarding/plumbing as the baseline**
Step authors should not routinely write “forward settings into ops” or replicate config resolution logic. Normalization and propagation should be centralized or mechanically generated.

**G14 — Avoid overloaded “resolve” semantics; name translation explicitly**
Prefer explicit “view/transform/translate/normalize” language for public→internal mapping to avoid confusion with other “resolveConfig” semantics.

**G15 — Optional façade/translation mechanisms are allowed, but bounded**
Steps (or higher layers) may expose simplified façades and translate to internal shapes, but this must be explicit, opt-in, and not the default.

---

### 5) Separation of concerns: tuning knobs vs runtime parameters

**G16 — Separate compile-time tuning from runtime-only parameters**
Distinguish modder-authored tuning/knobs (compile-time) from game-provided runtime parameters (seed, map size, players/civs, etc.). They should not be conflated into a single ambient “settings blob.”

**G17 — Runtime operations depend on explicit inputs**
Runtime logic should rely on explicit inputs + explicit compiled config, with stable and predictable runtime signatures—avoid ambient channels.

**G18 — Domain logic must not depend on engine-owned runtime types**
Enforce dependency inversion: the engine transports runtime data; domains define their own knobs/contracts. Domain logic should remain engine-opaque.

**G19 — Recipes own composition of tuning/settings surfaces**
Recipe composition is the canonical place where global + domain + recipe tuning knobs are composed into the run/settings contract for that workflow.

---

### 6) Dependencies, resources, and graph composition

**G20 — Dependencies are declared where produced/consumed**
Steps declare what they require and provide. Higher layers mechanically compose these declarations into a global dependency graph.

**G21 — Typed “resources/dependencies” are the canonical unit**
Use a typed resource/dependency model as the primary abstraction (unifying what would otherwise be artifacts/buffers/effects). Sub-kinds can exist as semantics, but the core mechanism is a typed reference.

**G22 — Scheduling and validation are mechanical and enforceable**
Dependency ordering and validation should be computed and centrally enforced (missing inputs, multiple producers, cycles), not maintained via ad-hoc strings or manual registries.

**G23 — Canonical dependency identifiers and naming discipline**
Dependency identifiers should be canonical, validated, and centrally declared (not scattered ad-hoc strings). Naming is part of architecture and must avoid overloaded vocabulary.

---

### 7) Stages and abstraction justification

**G24 — Every abstraction must pay for itself**
Stages (and any other layer) exist only if they materially improve composition, public UX boundaries, knob aggregation/exposure, or workflow clarity. No ceremony-only layers.

---

### 8) Schema discipline and boilerplate control

**G25 — Schema strictness by default, enforced by helpers**
Strict schemas and consistent defaulting behavior should be the default posture, enforced through shared helpers to prevent drift and boilerplate repetition.

**G26 — Reduce repetition by construction**
If something can be derived (defaults, strictness policy, knob exposure, composed surfaces), it should be derived. Human-authored repetition is a design smell.

---

### 9) Discoverability, structure, and import ergonomics

**G27 — Standardized structure that scales from small to large**
Use a stable, repeatable module/file organization for domains/ops/steps/recipes so patterns are predictable for both small and large implementations.

**G28 — Canonical “single import” surfaces**
Provide discoverable routers/catalogs so authors can import a small number of stable entrypoints (domain contract surfaces, domain implementations, recipe-level composed surfaces), reducing import churn and improving navigation/autocomplete.

---

### 10) Guardrails, non-regression, and refactor leverage

**G29 — Guardrails are first-class architecture**
Prevent regressions with enforceable guardrails (lint rules, type constraints, targeted tests) around boundary discipline, public/internal separation, derived defaults, and avoidance of distributed forwarding.

**G30 — Prefer central changes that enable mechanical refactors**
Optimize for designs where changes are made in a few central primitives/helpers and migrations are largely mechanical at callsites, not bespoke edits scattered everywhere.

---

### 11) Controlled escape hatches and evolution policy

**G31 — Advanced/internal-only configuration must be explicit**
If internal configuration is exposed at all, it must be clearly opt-in and not the modder default.

**G32 — Defer automation until the manual model is correct**
Automated generation of public views/surfaces can come later, but only after the underlying contract/view model is stable and enforceable.

---

## Conflicts / Tensions to Resolve (Not resolved here)

1. **Is the `{ strategy, config }` envelope part of the public authoring surface or strictly internal?**

* Tension between:

  * Alt 1: “Plan-truth config is an explicit envelope `{ strategy, config }` and remains the canonical boundary shape” (Goal/Constraint 7)
  * Alt 2: “Public config must not require knowledge of `{ strategy, config }` envelopes” (G3)
    This is compatible if “canonical boundary shape” is internal-only, but conflicts if interpreted as modder-facing.

1. **How prescriptive should “plan-truth” be relative to modder-facing configuration?**

* Tension between:

  * Alt 1: Preserve the plan-truth configuration model as a visible/explicit envelope boundary (Goal/Constraint 7, plus “preserve runtime semantics” Goal 23)
  * Alt 2: Public config is a deliberate façade, not a reflection of implementation structure (G3/G7)
    This needs an explicit statement about whether public config ever mirrors plan-truth, and under what conditions (e.g., explicit advanced mode).

1. **Scope of standardization vs minimizing abstraction overhead**

* Potential tension between:

  * Alt 1: “Standardized file and directory structure” (Goal 18) and “routers/catalogs” (Goal 24)
  * Alt 2: “Every abstraction must pay for itself; stages only if they materially help” (G20)
    Not a direct contradiction, but there is a real priority tradeoff: stronger structural standardization can introduce perceived ceremony unless carefully constrained.