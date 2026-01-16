• ### 1) What v7 + the decision ledgers change in the design space

  What’s new vs v5/v6:

  - v7 Alt2 is no longer “just” an ops/steps refactor direction; it becomes a full end‑to‑end
    steps/stages/recipes + public-map-authoring architecture (createMap, stage “views”, recipe-
    owned public schema, centralized compilation pipeline, and a proposed resource store model
    that can replace the old tag registry model).
  - v7 Alt1 mostly deepens one slice that was fuzzy before: dependency keys (naming, where they
    live, and why requires/provides belongs on step contracts) while largely keeping the current
    “tag registry” semantics (just renamed/standardized).
  - The Alt1/Alt2 decision ledgers make some things “explicitly committed” that used to be
    implicit (especially in Alt2: public vs internal planes, stage/recipe ownership of public
    schema, minimal step DX, and resource-centric scheduling).

  This means the old v6 binary list is still useful, but a couple axes either:

  - collapse into a bigger “public surface + compilation owner” mega-decision (v7 Alt2), or
  - become newly binary due to the resources-vs-tags fork.

  ———

  ## 2) Updated “binary design decisions” list (v5→v6→v7)

  Below are the hard forks that remain meaningfully binary after reading v7 + the decision
  ledgers. I’m listing fewer, bigger axes than the v6 list because v7 Alt2 bundles multiple
  older axes into one coherent stance.

  For each axis: Alt1-ish = v5/v6 Alt1 line + v7 Alt1 additions; Alt2-ish = v6 Alt2 line + v7
  Alt2 expansion.

  ———

  ### A) Who owns compilation of config into “plan truth”?

  Axis: Engine-centered plan compiler vs recipe/stage-owned compilation pipeline.

  - Alt1-ish: engine is the main compiler; steps may participate via something like
    step.resolveConfig(...) / per-step normalization wiring.
  - Alt2-ish (v7 Alt2): recipe builder is the compiler: normalize public → apply view transforms
    → normalize internal → mechanically apply op.resolveConfig → schedule.

  What changed in v7: Alt2 stops being “a tweak to step config” and becomes “recipe owns
  compilation as a first-class pipeline”.

  ———

  ### B) What is the primary public authoring contract?

  Axis: Public config is (mostly) internal config vs public config is a distinct view.

  - Alt1-ish: public authoring can remain close to internal (risk: envelopes/ids leak), unless
    additional policy layers are added.
  - Alt2-ish (v7 Alt2 + ledger): public is explicitly separate; modders author createMap(...)
    with Static<recipe.publicSchema>. Internal config/envelopes/ids do not appear in public
    config (unless an explicit “advanced” escape hatch).

  This is the core “two planes of config” commitment.

  ———

  ### C) Where do “public↔internal transforms” live?

  Axis: step-owned vs stage/recipe-owned.

  - Alt1-ish: step contracts can own most schema surfaces; transforms may live per-step (or
    step-driven).
  - Alt2-ish: steps do not own public schema; stage owns per-step public “views” (schema +
    toInternal). Recipe composes them.

  This is mutually exclusive in the strong form (“steps do not own public schema”).

  ———

  ### D) What is the dependency system’s primary contract primitive?

  Axis: string dependency keys + registry semantics vs typed resource refs + store semantics.

  - Alt1-ish (v7 Alt1): keep “dependency keys” (formerly tags) as string IDs with kinds
    (artifact|field|effect), validated by a registry; steps declare requires/provides in the
    contract, referencing catalog constants.
  - Alt2-ish (v7 Alt2 + ledger): collapse to a typed resource store (ResourceRef, ResourceStore,
    resources(...)), and schedule directly from those refs; no separate “tag registry” truth.

  This is a real fork because it changes:

  - the type surface (string[] vs ResourceRef[]),
  - the runtime model (registry satisfaction vs store presence),
  - and the migration strategy.

  ———

  ### E) Where do dependency IDs/refs “canonically live”?

  Axis: catalog modules vs step contract as canonical home.

  - Alt1-ish (v7 Alt1): canonically live in catalog(s) (core/domain/recipe). Step contracts
    import from catalogs and may re-export a step-local dependencies handle for implementation
    DX.
  - Alt2-ish (v7 Alt2): canonically live as resource catalogs and/or stage/recipe-local
    catalogs; step modules reference refs directly.

  This axis is binary in terms of “step contract is canonical home” (Alt1 explicitly argues
  against that).

  ———

  ### F) Settings / knobs packaging model

  Axis: RunSettings object (global/domains/recipe) with explicit slice selection vs collapsed
  knobs + stage-derived knobs schema.

  - Alt1-ish (v5): RunSettings is an explicit structured object; ops/steps receive slices
    (inversion away from engine-owned settings type).
  - Alt2-ish (v7 Alt2): “knobs” are flattened; stage knobs schema is auto-derived by scanning
    domains used by a stage’s ops; op.resolveConfig consumes the relevant knob slice
    mechanically during compile.

  These can be reconciled conceptually (both want “settings inversion”), but they’re
  structurally different enough to be a fork.

  ———

  ### G) Do we keep an explicit step.resolveConfig concept?

  Axis: yes, step is the normalization composition point vs no, compile pipeline does it
  mechanically.

  - Alt1-ish (v5/v6): yes (or at least “step has an explicit normalization hook as the
    boundary”).
  - Alt2-ish (v7 Alt2): no; compilation pipeline applies op normalization mechanically; step
    modules are minimal.

  In v7, this axis becomes mostly a consequence of (A)+(F).

  ———

  ### H) What is the canonical “contract unit” for scheduling?

  Axis: registry-validated “satisfied” state vs resource-store existence.

  - Alt1-ish: satisfied-when-provided semantics are explicit and validated postconditions
    (registry-based).
  - Alt2-ish: ResourceStore.has(ref) and producer mapping drive scheduling (still can validate,
    but it’s “store truth” not “registry truth”).

  This is coupled to (D), but it’s still a distinct “semantic model” decision.

  ———

  ## 3) Coupled vs independent decisions

  ### Strongly coupled (choose one → you’re pushed into others)

  - (A) Compile ownership ↔ (B) public-vs-internal ↔ (C) where transforms live
      - If recipe/stage owns public schema (Alt2), recipe/stage almost must own compilation
        (otherwise you risk dual compilers or leaky ownership).
  - (D) dependency primitive ↔ (H) scheduling semantics
      - If you go ResourceRef/ResourceStore, “registry satisfaction” becomes redundant or
        secondary.
  - (F) knobs packaging ↔ (G) step.resolveConfig
      - A stage-derived knob schema model naturally wants “mechanical compile application”, not
        per-step normalization wiring.

  ### More independent (can be decided with less fallout)

  - (E) “catalog canonical home” can work under either dependency primitive:
      - You can have a dependencyKeys catalog (strings) or a resources(...) catalog (typed
        refs).
  - Naming (“tag” vs “dependency key”) is mostly non-binary now:
      - v7 Alt1 explicitly wants “dependency key”; v7 Alt2 largely supersedes “tag” by moving to
        resources.

  ———

  ## 4) Decision clusters (“nodes”) to decide together

  ### Cluster 1 — Public surface + compilation pipeline (biggest node)

  Includes: A, B, C, G, F (partially)

  - Alt2-ish package: createMap only + recipe-owned public schema + stage views + recipe
    compilation pipeline + no step.resolveConfig.
  - Alt1-ish package: engine-centered compilation with step normalization hooks; public config
    likely closer to internal unless you add separate policy layers.

  This cluster is the main reason the proposals “feel far apart” in v7: Alt2 is now explicitly a
  full public authoring architecture, not just an ops refactor.

  ———

  ### Cluster 2 — Dependencies and scheduling (second biggest node)

  Includes: D, H, E

  - Alt1-ish package: dependency keys (string IDs) + registry validation; keys in catalogs; step
    contracts declare requires/provides.
  - Alt2-ish package: typed resources + store + producer/consumer graph; optionally keep
    semantic categories as naming only.

  This cluster can be migrated somewhat independently from Cluster 1 if you treat resource IDs
  as the same underlying strings initially.

  ———

  ### Cluster 3 — Knobs/settings model (feeds compile pipeline)

  Includes: F (+ impact to A/G)

  - Alt1-ish: explicit RunSettings composition + slices.
  - Alt2-ish: collapsed knobs + stage-derived knobs schema by scanning domains referenced by
    ops.

  This cluster largely decides how painful “settings plumbing” will be long-term, and how much
  becomes derivable/mechanical.

  ———

  ## 5) Convergence vs divergence (across v5/v6/v7 + decision docs)

  ### Where the proposals are converging (shared assumptions)

  - Contract-first is non-negotiable across all lines.
  - Strategies are the mechanism for algorithmic variation (same IO; config varies).
  - Compile-time normalization exists, and should be mechanical wherever possible (don’t hand-
    forward everywhere).
  - Steps should be thin and should not reintroduce “pipeline glue” boilerplate.
  - A canonical catalog (whether dependency keys or resources) is preferred over ad-hoc strings/
    import tangles.
  - Strong bias toward guardrails (lint/grep/build-time asserts) to prevent drift.

  ### Where we still truly diverge (must decide)

  1. Public authoring model: internal-as-public vs explicit public views + createMap contract.
  2. Compilation owner: engine/step-boundary vs recipe/stage compilation pipeline.
  3. Dependency primitive: registry+keys vs typed resources+store.
  4. Knobs/settings packaging: explicit RunSettings object vs stage-derived knob schema (and how
     strictly “collapsed” is enforced).

-------

Matei's response (partial):

Okay, phenomenal work. So I’m just going to go through some of these, and then I want you to tell me how this materially changes our direction. Then, if you can, pull it together into a short decision/direction document that I can take to another AI agent, who will help me actually compose a canonical architecture based on the disambiguation I’m doing right now.

That other agent will have access to all the same information you do, plus whatever you write here. What you write should help me work with them to converge back down to a single architecture and then move forward from there.

Here’s my current thinking, organized along your A–H axes, plus knobs/settings:

---

### A) Who owns compilation of config into “plan truth”?

I want the **recipe** to be the compiler and the source of truth.

- The recipe composes internal configuration from ops → steps → recipe and compiles that into “plan truth.”
- On top of that, I want an **optional public facade** that is itself composed, but:
  - That public view is *derived* from the internal configuration.
  - It should be an optional feature: a view transform applied over the already-composed internal config.
  - Adding a public view **should not structurally change** how we do compilation; it’s a view on top, not a different compilation model.

So: “recipe builder is the compiler” is the core commitment. Public view is an optional overlay on top of that.

One thing I don’t like in v7 Alt2 as implemented: requiring steps to register operations directly feels too forceful. I don’t want to bake operation semantics tightly into the step unless that actually makes things easier. That part of Alt2’s implementation seems off, even if the general “recipe owns compilation” direction is right.

---

### B) What is the primary public authoring contract?

I don’t see Alt1 vs Alt2 here as truly different in *intent*; they should converge.

- We **do explicitly want mod authors to author `createMap(...)` against a public schema.**
- That public schema will:
  - Be **equal to the internal schema** if **no view transform** is applied.
  - Optionally diverge when a public-view transform is applied on top of the internal config.

So the model I want is:

- Recipe builder is the canonical compiler and plan truth.
- There is always a “public schema” that mod authors author against:
  - By default, it’s the same as the internal schema.
  - Optionally, a transform is applied that changes the public schema.
- Drop the notion of an “advanced escape hatch.” That just complicates things.
  - There’s a public view and an internal config.
  - A transform mediates between them.
  - No extra special-case escape layer.

Exactly *where* the transform lives (step vs stage vs recipe) is still somewhat open:

- It probably won’t be “only once” at the recipe level.
- I’m leaning toward composition at the stage level (across many steps), but that’s not fully locked.
- Core direction that **is** locked:
  - Recipe owns compilation and internal config composition.
  - Public authoring is always against a public schema that either equals internal or is derived by transforms.
  - No “advanced escape hatch.”

---

### C) Where do public↔internal transforms live?

Here I’m leaning Alt2-ish, but with some nuance.

- My instinct: **steps are too small a unit** for public schema composition.
- We probably want **stage-level** ownership of public schema/views because:
  - We can drastically simplify what authors see across an entire stage.
  - That’s more relevant than per-step surfaces, which would still need composition above them.

Possible shapes:

1. **Stage as the primary place**:
   - Stages define the public view/schema for the whole stage.
   - They compose from step-level primitives as needed.

2. A more “fractal”/parallel-track model where **steps, stages, and recipes all have public views**:
   - Each unit (step, stage, recipe) has:
     - An internal config schema.
     - A public schema that defaults to “same as internal.”
     - Optional transforms that derive public from internal.
   - Stages compose step public schemas into a stage-level public schema (with freedom to modify).
   - Recipes compose stage public schemas into a recipe-level public schema (with another chance to modify).

I’m not sure yet whether this fractal model is better or if it just creates parallel complexity. It might be worth it if it makes patterns more regular and easier to remember.

However, **first choice / default starting point**:
- Stage-level ownership of public transforms and public-schema composition.
- Step and recipe participation is “maybe later” or “if it falls out cleanly.”

Key directional points:
- Public schema is a separate track that must ultimately compose down into internal schema.
- If we do **no** public-schema work at all, then internal config should be exposed directly as the public surface—but with nice author DX:
  - Collapsing/merging shapes where possible.
  - Making the recipe → stage → step composition hierarchy feel natural and not noisy.

---

### D/H/E (dependency primitive, scheduling, canonical home)

I’m explicitly **not resolving these yet** in this pass. I want to come back to them after clarifying the knobs/settings model and see how everything interacts.

Just note: I haven’t answered the dependency primitive (registry+keys vs typed resources+store), scheduling semantics, or where dependency IDs canonically live. Keep them in mind as still-open.

---

### F/G) Knobs / settings packaging model and step.resolveConfig

Something went sideways in how the settings model evolved; I want to re-clarify:

- We have **parameters** and **settings/knobs**, and they’re different:
  - **Parameters**:
    - Civilization 7 “core” or runtime-specific.
    - Not user-choosable.
    - Still meaningfully affect how everything works.
    - Should probably be passed in as input, not baked into the operation model itself.
  - **Settings / knobs**:
    - These are the global or semi-global tuning knobs.
    - They exist at various levels (global, domain, maybe recipe, etc.).
    - They are not the same as per-operation config.

So the rough direction:

- Operations:
  - Still have **config** of their own.
  - **Run settings** per se should *not* be baked directly into the op type; that’s separate.
- We should keep a concept of **global knobs**:
  - Think: knobs schemas that might be:
    - Defined and surfaced by domains/ops.
    - Composed into higher-level knobs models.
  - These knobs are not the same as run parameters (which are more engine/runtime-level inputs).

I’m **not totally sure** how different these knobs are in practice from op config, but my instinct:

- Ops have **operation config**.
- We also have a **knobs schema** concept (Alt2-ish), and I’m leaning toward that:
  - Knobs are global-ish, domain-derived tuning controls.
  - They are discovered/declared by domains and operations.
  - They get composed into a knobs schema for the pipeline/stage/recipe.

So, outcome I want you to derive:

- We want to **go with a knobs schema / knobs model**.
- Knobs live at multiple levels, mostly **pulled in/defined by ops and domains**.
- Run parameters stay separate: canonical, runtime-only inputs that ops see but which keep them pure (passed in, not embedded).

I’m not fully confident on the exact shape yet, but those are the constraints and instincts. Use that to reassess your F/G conclusions:
- How does this affect whether we keep `step.resolveConfig` vs purely mechanical compile?
- How does it shape whether we want an explicit `RunSettings` object vs a more Alt2-ish auto-derived knobs schema?


--------

 ### How your clarifications materially change/refine the v7 Alt1/Alt2 direction

  1) Cluster 1 (Compilation + public/internal planes + transforms + step.resolveConfig)
  collapses into a new “recipe-compiler” baseline

  - This is a decisive shift away from the older engine-centered mental model (Alt1-ish) and
    also trims Alt2: the recipe (builder) is the compiler and plan-truth authority, full stop.
  - Alt2 v7’s end-to-end “builder owns compile” direction stays, but with two key corrections
    from you:
      - Public view is optional overlay on top of internal composition (not a different compile
        model).
      - Avoid “steps must register ops directly” as a hard requirement; step-level “op
        semantics” shouldn’t be forced unless it truly reduces complexity.

  2) The “primary public authoring contract” becomes a single story (convergence target), not an
  Alt1 vs Alt2 fork

  - Mod authors always use createMap(...) against a public schema.
  - By default, public schema == internal schema (zero transforms).
  - If transforms exist, public schema is derived from internal and mapped back into internal
    for compilation.
  - No “advanced escape hatch” layer; that’s an explicit simplification and removes a whole
    divergence axis.

  3) Transform placement becomes a scoped design choice (stage-first), not a step-vs-recipe
  binary

  - You’re leaning to stage-level public schema/view ownership as the default because steps are
    too granular.
  - You’re explicitly leaving open whether we later adopt a “fractal” model (step/stage/recipe
    all may have public views), but the default starting point is stage-level.

  4) Knobs/settings reframe invalidates parts of the earlier “RunSettings vs step.resolveConfig”
  axis

  - You clarified a three-way split:
      - Operation config (per-op, plan-truth).
      - Knobs/settings (global-ish tuning surfaces, composed; not the same as op config).
      - Parameters (runtime/engine inputs; not user-authored knobs; should be passed in, not
        baked into op typing).
  - This pulls you toward an Alt2-ish knobs schema model (declared/derived by ops/domains and
    composed upward), while also rejecting “bake RunSettings into op types” as the center of
    gravity.
  - Net: step.resolveConfig should not be the main composition mechanism for settings-derived
    behavior; compile should be mechanical, with only narrowly-scoped step composition where
    unavoidable.

  5) Dependencies/scheduling (D/H/E) are deliberately deferred

  - Your direction explicitly postpones the registry+keys vs ResourceRef+store fork until after
    knobs/settings and compilation shape settle.
  - That means the “dependencies & scheduling” cluster remains open, but it should now be
    evaluated against the new recipe-compiler baseline (not older assumptions).

  ———

  ## Decision / Direction Document (hand-off ready)

  Title: Engine Refactor Direction (post-v7): Recipe-Compiled Plan Truth with Optional Public
  Views + Composed Knobs

  ### 0) Goal

  Converge the architecture to a single, contract-first story end-to-end: public map authoring →
  compile → plan-truth → execute, with strong type safety and low authoring friction, while
  avoiding “boil the ocean” redesign loops.

  ### 1) Locked decisions (committed direction)

  D1 — Recipe owns compilation and plan truth

  - The recipe builder composes internal configuration across ops → steps → recipe and compiles
    it into plan-truth.
  - Compilation is not engine-owned; the engine executes a compiled plan, it does not define the
    source-of-truth composition model.

  D2 — Public authoring is always via createMap(...) against a public schema

  - There is always a public schema that mod authors write.
  - Default case: public schema == internal schema.
  - When a public view is desired, it is an optional overlay: a transform applied over internal
    composition, not a different compilation paradigm.
  - Explicitly reject/avoid “advanced escape hatch” authoring models.

  D3 — Public↔internal transforms are stage-level by default

  - Default starting point: stage-level public schema/view ownership.
  - Steps are typically too granular for coherent public authoring surfaces.
  - Recipe-level composition still exists (recipe composes stages), but stage is the first-class
    unit for shaping public DX.

  D4 — Knobs/settings model exists and is distinct from op config and runtime parameters

  - Operation config remains per-op plan-truth (resolved/validated).
  - Knobs/settings are global-ish tuning controls:
      - declared/derived from domains/ops (and composed upward into stage/recipe knobs models),
      - not the same as per-op config.
  - Parameters are runtime/engine inputs:
      - not user-authored knobs,
      - passed in at runtime (input/params), not baked into op contracts as “settings”.

  D5 — Avoid forcing step-level op registration as the primary composition mechanism

  - Step internals should not be required to “register ops directly” if it adds coupling and
    cognitive load.
  - Prefer compilation-time discovery via recipe/stage/step definitions that declare what they
    use/need, without embedding op semantics tightly into steps.

  ### 2) Derived implications (what the canonical architecture should look like)

  I1 — Compilation pipeline shape

  - Recipe builder pipeline (conceptual):
      1. Compose internal config (ops/steps/stages/recipe).
      2. Optionally apply public-view transforms (stage-level default).
      3. Normalize/default/validate internal config into plan truth.
      4. Apply mechanical op-level resolution where needed (but avoid per-step bespoke logic as
         the norm).
      5. Emit execution plan nodes with resolved per-op configs.

  I2 — step.resolveConfig is not the center of the world

  - If step.resolveConfig exists, it should be:
      - rare,
      - purely compositional where a step truly composes multiple ops/config fragments,
      - not the primary vehicle for settings/knobs derivation.
  - Default should be: compile pipeline is mechanical; ops/domains declare what’s needed; stage/
    recipe composes.

  I3 — Public schema composition should reduce author noise

  - When no public view exists, public == internal but must still be presented with good DX
    (sensible shape, minimal noise).
  - When a public view exists, it should allow stage-level consolidation/simplification
    (collapse multiple step/op knobs into coherent authoring controls).

  ### 3) Explicitly still open (intentionally deferred)

  O1 — Dependency primitive + scheduling semantics

  - Not decided yet:
      - string dependency keys + registry semantics vs typed ResourceRef/ResourceStore.
  - Scheduling/execution dependency checks will couple to that choice.
  - Decision should be made after the knobs + compilation model is nailed so we don’t solve the
    wrong problem twice.

  O2 — Transform “fractal model” vs stage-only

  - Default now: stage-level transforms.
  - Open whether we adopt a consistent “each unit can define a public view that defaults to
    identity” pattern (step/stage/recipe all have optional views), vs keeping public views only
    at stage/recipe.

  O3 — Knobs schema mechanics

  - Direction is set (“knobs exist, are composed, derived from ops/domains”), but mechanics are
    open:
      - how knobs are declared/discovered (explicit registry vs static exports vs scan of
        referenced ops),
      - how knobs relate to internal config composition (mirrors, projections, or independent
        tree).

  ### 4) Guidance for the next AI agent (what to produce next)

  Deliverable: a converged canonical architecture draft (spec-level), consistent with D1–D5.

  - Define the recipe compilation pipeline responsibilities and boundaries precisely.
  - Define the stage-level public view contract (inputs/outputs of transforms; how schema
    changes).
  - Define knobs/settings model at a spec level:
      - how knobs are authored/declared by domains/ops,
      - how stage/recipe composes them,
      - how runtime parameters enter execution without contaminating op contracts.
  - Identify the minimum interfaces/types needed so we can implement incrementally without
    “boiling the ocean.”
  - For O1 (dependency primitive), do not choose yet—document the extension point and what must
    remain true regardless of which primitive we select later.

  ### 5) Quick note on v7 Alt2 correction

  Alt2’s “recipe builder owns compile” is aligned with the locked direction, but must be
  adjusted so:

  - public view is optional overlay (public defaults to internal),
  - steps are not forced into direct op registration unless it demonstrably reduces complexity.