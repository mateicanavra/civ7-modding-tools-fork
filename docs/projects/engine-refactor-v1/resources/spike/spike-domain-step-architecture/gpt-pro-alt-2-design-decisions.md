Below is a concise decision ledger capturing what we have already decided (and what is still open), plus the problem/goals/constraints driving those decisions, and the relationships/tensions between them. This is extracted from our conversation only; it does not propose new solutions.

---

# Decision Ledger

## 1) Architectural decisions already made

### D1 — Contract-first remains the backbone end-to-end (ops → steps → stages → recipe)

**Status:** Committed
**Meaning in practice:**

* Ops and strategies are contract-first and assembled mechanically from contracts.
* Steps/stages/recipes are likewise composed from contracts/schemas and small, declarative definitions rather than ad hoc runtime wiring.

---

### D2 — Modders author maps via `createMap(...)` only

**Status:** Committed
**Meaning in practice:**

* Modders do not author “recipes” or “pipelines” directly.
* Modders write: `createMap({ id, metadata..., recipe, config })`.
* The config surface is public, declarative, hierarchical, and modder-safe.

---

### D3 — Public vs internal naming is mandatory; “author” is banned for schema/config terminology

**Status:** Committed
**Meaning in practice:**

* “Author” only refers to a human making a mod or editing final config; it is not used in type names or domain language.
* We use **public** for map-file-exposed surfaces and **internal** for pipeline/runtime-only, but we later tightened this further: **internal is the default and should not be labeled everywhere**; only public is explicitly called out.

---

### D4 — Internal config contracts are primary; public config is a view over internal

**Status:** Committed
**Meaning in practice:**

* Steps/stages own the internal truth (schemas, defaults, dependencies, correctness).
* Public config is composed at stage/recipe level and translated to internal config via explicit transforms (“views”).
* Public config does not “own” requirements/dependencies.

---

### D5 — Steps do not own public schema; public lives at stage/recipe view layer

**Status:** Committed
**Meaning in practice:**

* Step files define internal config + implementation + requires/provides only.
* Stage defines how (and whether) each step is publicly configurable via `public` views; recipe composes stage public into the final public map schema.

---

### D6 — No `pipeline`, no op exposure, no internal ids (including `:` tags) in modder config

**Status:** Committed
**Meaning in practice:**

* Modders should not see:

  * `pipeline`
  * `ops`
  * `{ strategy, config }` envelopes
  * step ids like `ecology:biomes`
* Config is “just stacked hierarchy”: `recipe → stage → step` via plain object nesting.

---

### D7 — Step authoring DX is minimal: `step.op(op)` / `step.ops({ ...ops })` only

**Status:** Committed
**Meaning in practice:**

* We explicitly deleted and rejected:

  * `uses`, `useOps`, `io`, `addr`, binding objects, and other wrapper-y APIs
* Steps declare:

  * `requires` / `provides` (dependencies)
  * internal `schema` + `defaultConfig` derived mechanically
  * `run(ctx, config)` implementation

---

### D8 — Dependencies declared where produced/consumed: `requires`/`provides` on steps, composed mechanically in recipe

**Status:** Committed (mechanism and type shape committed; migration sequencing was discussed as a choice, but the target model is committed)
**Meaning in practice:**

* Step contracts/modules declare what they need and what they produce.
* Recipe composes these declarations into a dependency graph (toposort), validates, and schedules execution.
* No separate “tag registry” as the authoritative place for dependencies.

---

### D9 — “Resources” is the canonical stored entity (artifacts/buffers/effects collapse conceptually)

**Status:** Committed (with semantic sub-kinds optional later)
**Meaning in practice:**

* Use a single typed resource store (`resources`) keyed by resource refs.
* “Artifact” can exist as terminology, but mechanically it is a resource; separate artifact/buffer/effect systems are not required.

---

### D10 — Knobs model was simplified and collapsed

**Status:** Committed
**Meaning in practice:**

* We dropped the earlier nested `global/domains/recipe` settings structure for the map-file-facing design.
* Public config includes:

  * root `knobs` (recipe/global knobs; collapsed)

  * stage objects which inline their own knobs (domain/stage knobs) alongside step public configs
* If nesting isn’t needed, we don’t nest.

---

### D11 — Stage knobs schema is auto-derived from referenced domains (Cleanup #1)

**Status:** Committed
**Meaning in practice:**

* Stage authors do not manually wire knob schemas.
* Domain exports ops annotated with `domainId` + `domainKnobsSchema`.
* Recipe builder scans which domains are used in a stage (via ops referenced by steps) and derives the stage knob fields automatically.

---

### D12 — Op-level config normalization (`op.resolveConfig`) is applied mechanically during recipe compilation

**Status:** Committed
**Meaning in practice:**

* Steps do not forward knobs/settings into ops.
* Recipe compilation:

  * normalizes public config
  * applies public→internal transforms (views)
  * normalizes internal step configs
  * applies `op.resolveConfig` automatically using derived stage knobs (and op’s settings slice schema)

---

### D13 — Schema strictness defaults are centralized; avoid repeating TypeBox boilerplate

**Status:** Committed
**Meaning in practice:**

* Use a strict schema builder (e.g., `S.obj`) that defaults:

  * `additionalProperties: false`
  * `default: {}`
* Goal: eliminate repetitive schema noise in every module.

---

### D14 — Public views are explicit and manual for now; auto-generation is deferred (#2)

**Status:** Deferred / Open (explicitly postponed)
**Meaning in practice:**

* For modder-facing recipes:

  * stages must define public views for steps (or be marked `advanced`)
* We intentionally have not implemented “auto public view generation” yet.

---

### D15 — “Advanced mode” for exposing internal configs publicly exists as an escape hatch

**Status:** Tentative / Policy not fully locked
**Meaning in practice:**

* We discussed allowing `advanced: true` on a stage to expose internal configs when public views are missing.
* Whether this should exist at all (vs hard-requiring public views everywhere) is not fully locked.

---

### D16 — Stable identity derived from composition keys (`stageKey.stepKey`)

**Status:** Committed in principle; stable-id overrides are open
**Meaning in practice:**

* Internal node ids come from object keys rather than authored string ids.
* We noted that optional id overrides may be desirable later (not decided/implemented).

---

## 2) Problems, design goals, and constraints

### 2.1 Key problems we are solving

**P1.** Modder config currently leaks internal concepts (ops, pipeline structures, step ids, tags).
**P2.** Step authoring DX was too verbose and non-inferable (keys repeated; types imported everywhere; wrapper overload).
**P3.** Multi-layer “resolve” patterns were confusing and felt like duplicated logic/defaults across layers.
**P4.** Compile-time config vs runtime game parameters were conflated (“global knobs” vs runtime params like players/map size).
**P5.** Dependencies were indirect/awkward (separate tag registries, indirection away from where things are produced/consumed).
**P6.** Schema boilerplate noise (repeating strictness/defaults everywhere) hurt maintainability and consistency.

---

### 2.2 Design goals and priorities (repeated emphases)

**G1. Contract-first composition all the way up.**
**G2. Modder-facing config must be simple, declarative, and hierarchical.**
**G3. DX-first inference: minimize repeated keys, explicit generics, and imported mega-types.**
**G4. Compile-time configuration should be statically knowable and composable.**
**G5. Clear boundary between compile-time knobs and runtime-only game parameters.**
**G6. Defaults should be derived mechanically from contracts, not restated at multiple layers.**
**G7. Dependencies should be declared at the step (where produced/consumed) and composed mechanically.**
**G8. Stages must “earn their keep”: serve as a real composition/public UX boundary, not extra ceremony.**
**G9. Avoid heavy semantics/overload from “resolve”; prefer explicit “transform/view” for public→internal.**

---

### 2.3 Explicit constraints and do/don’t rules

**C1.** Do not use “author” language for schema/config types.
**C2.** Public surfaces must not contain: `pipeline`, op envelopes, step ids with `:`, or internal tag strings.
**C3.** Steps must not require wrapper APIs (`uses`, `addr`, etc.); step files must be minimal.
**C4.** Do not force step-level resolve plumbing as baseline. Op normalization must be centralized.
**C5.** Default schema strictness must be automatic in helper factories.
**C6.** Keep knobs flattened unless there is a concrete reason to nest.
**C7.** Resources/dependencies should not be aggregated manually at recipe level as a separate “truth”; recipe composes from steps.

---

## 3) Relationship between decisions and problems/goals/constraints (and tensions)

### D2/D6 (createMap-only modder surface; no pipeline/ops/ids) → addresses

* **P1, P4** (leaky internals; conflation)
* **G2, G5** (simple public config; clear separation)
* **C2** (hard prohibition on internals in public config)
  **Tension:** Without envelopes, modders can’t directly set low-level strategy knobs; resolved via **public views** (D4/D5/D14) and potential **advanced mode** (D15).

---

### D7 (step.op/step.ops minimal DX) → addresses

* **P2, P3, P6** (verbosity; confusion; boilerplate)
* **G3, G6** (inference; no default restating)
* **C3** (ban wrapper DX)
  **Tension:** Step authoring becomes very lean, but compiler must take more responsibility (D12).

---

### D4/D5 (internal primary; public is stage/recipe view) → addresses

* **P1, P3** (public leakage; multi-layer confusion)
* **G2, G4, G8, G9** (modder UX; composability; stages earn keep; no “resolve”)
* **C1, C2, C4**
  **Tension:** Views are additional work and can drift as internal evolves; mitigated by reusable view patterns and (later) auto generation (#2 deferred).

---

### D10/D11 (collapsed knobs; stage knobs derived from domains) → addresses

* **P2, P4, P6** (less wiring; separation; less boilerplate)
* **G2, G3, G5** (simple config; inference; separation)
* **C6** (don’t nest without need)
  **Tension:** Flattening risks name collisions across domains/stage knobs. We explicitly accept collision errors and require namespacing only when justified.

---

### D8/D9 (resources and requires/provides on steps; recipe composes) → addresses

* **P5** (dependency indirection)
* **G7** (declare where produced/consumed; compose upward)
* **C7** (recipe should not be the source of truth for dependencies)
  **Tension:** Migration scope can be large; earlier we discussed phasing vs all-at-once, but the target architecture is fixed.

---

### D12 (central compile applies op.resolveConfig mechanically) → addresses

* **P3, P2** (remove multi-layer step resolve boilerplate; simplify DX)
* **G4, G6** (static compile-time normalization; derived defaults)
* **C4** (no resolve-heavy steps)
  **Tension:** Central compilation becomes more complex and must enforce purity/determinism of compile-time transforms.

---

### D13 (strict schema helper) → addresses

* **P6** (boilerplate)
* **G6** (consistency in defaults/strictness)
* **C5** (do not repeat strictness options everywhere)
  **Tension:** Requires discipline/enforcement so devs don’t bypass helpers and reintroduce inconsistent schemas.

---

### D14/D15 (manual public views now; advanced escape hatch) → addresses / tensions

* **Addresses:** **P1, G2** (ensure modder config remains clean while still enabling customization)
* **Tensions:**

  * Manual public views increase authoring effort (mitigation: later automation; #2 deferred).
  * “Advanced mode” risks leaking internal shapes to modders if misused (policy not fully locked).

---

### D16 (identity from composition keys) → addresses

* **P2** (removes extra ids/wiring)
* **G3** (DX; fewer strings)
  **Tension:** Renames become breaking; optional stable-id overrides were mentioned as a possible future extension (open).

---

## Open / partially unresolved items (explicit)

1. **Auto public view generation (#2):** deferred.
2. **Whether “advanced mode” should exist:** policy not fully locked.
3. **Stable node ids beyond composition keys:** optional override mechanism not decided.
4. **Resource semantics (artifact/buffer/effect kinds):** collapsed now; optional semantics later.
5. **Illustrative E2E examples:** requested; not yet produced in the final consolidated doc (not a design decision, but a deliverable still pending).

---

If you want, I can format this ledger into a repo-check-in-ready markdown section (with short IDs and consistent naming) so you can use it as the comparative baseline against another agent’s plan.
