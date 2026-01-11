 ## How each v6 proposal wires the system end-to-end

  ### Alt1 v6 (integrated “two planes”, engine-compile centered)

  - Ops
      - Explicit op contract (defineOp) contains id/kind/input/output + strategies:
        { <id>: { config: TSchema } }.
      - Op implementation (createOp(opContract, { strategies })) derives the envelope config
        union { strategy, config }, defaultConfig, resolveConfig dispatcher, run/runValidated.
  - Strategies
      - Implemented via createStrategy(opContract, "<id>", { resolveConfig?, run }) (or a pre-
        bound “strategy factory” for DX).
      - Strategy config type is inferred from the contract’s strategy config schema.
  - Steps
      - Introduces step contracts with two modes:
          - Composition-first baseline: defineStep({ ops: { key:
            domain.ops.someOp, ... } }) and the SDK auto-derives:
              - step.configSchema (composition of op.config envelope schemas with defaults from
                op.defaultConfig)
              - step.resolveConfig (auto-generated to call each op.resolveConfig)
          - Facade optional: step may provide its own normalizeConfig/override (explicitly
            “rare”).
      - Strong emphasis: step authors should not hand-write “forwarding boilerplate”.
  - Recipes / compilation
      - Keeps the existing conceptual model where engine plan compilation runs config
        normalization (schema defaults + op/step resolve), but calls out a current bug: step
        resolveConfig exists but is dropped when recipes are built, so it must be forwarded.
  - Public config vs resolved config
      - Public config is “whatever the step config schema is” (often op envelopes).
      - Resolved configs are produced by compile-time resolution and passed into step.run once.

  ### Alt2 v6 (contract-first steps/recipes, recipe-compile centered)

  - Ops / strategies
      - Assumes the same contract-first op/strategy world (op contracts own strategy config
        schemas; op exposes envelope { strategy, config }; op-level resolution exists).
      - Adds explicit helper utilities for step composition: opEnvelopeSchema(contract),
        defaultOpEnvelope(contract), opConfigField(contract).
  - Steps
      - Makes steps fully contract-first with explicit separation:
          - StepContract.publicSchema: what the map author writes
          - StepContract.internalSchema: what runtime run receives (defaults to public if no
            facade)
          - ops bindings list: which op contracts are embedded and where knobs come from
      - Step implementation module is createStep(contract, impl) and it produces:
          - compileConfig(public, knobs) -> internalConfig (defaults + optional facade expansion
            + mechanical per-op op.resolveConfig application)
          - run(ctx, internalConfig)
      - Crucial stance: step-level resolveConfig is not a thing authors write; the default
        compile-time transformation is compileConfig, with facade translation (expandConfig) as
        the only opt-in “resolve-like” step logic.
  - Recipes / compilation
      - Recipe exports a Map File Contract (schema + type) and performs compilation inside the
        recipe module:
          - normalize map file (defaults/cleaning)
          - for each step: call step.compileConfig(...)
          - produce internal step configs (plan-truth) + then runtime runs those
  - Public config vs resolved config
      - Explicitly models two layers of step config (public → internal), so “what users author”
        vs “what runtime executes” is first-class and consistent.

  ## Convergence vs divergence (v6)

  - Converging strongly on:
      - Contract-first ops/strategies (schemas in contracts, logic in impl modules).
      - Plan-truth op config is an envelope union { strategy, config } with "default" required.
      - Defaults should be derived once (schema defaults) and propagated mechanically; avoid
        restating defaults.
      - Reduce per-step forwarding boilerplate; enforce guardrails.
      - Hard separation between runtime-only parameters and authoring knobs.
  - Still diverging materially on: where compile-time normalization “lives” and what the step
    module’s compile-time API is
      - Alt1: keep engine-plan-compile as the center; fix the existing missing wiring
        (step.resolveConfig not forwarded) and auto-generate step resolve for composition-first
        steps.
      - Alt2: move compile-time normalization into step.compileConfig and recipe compilation;
        engine no longer needs to call step resolve at all.
      - This is not a small stylistic difference: it changes who owns compilation, what
        artifacts exist (step internal schemas/configs), and what needs to be updated in engine/
        recipe boundaries.

  ## What each solves well / what it adds / what it costs

  ### Alt1 v6

  - Solves well
      - Incremental path: fix a correctness bug + add contract-first conveniences without
        immediately reshaping recipe/engine ownership.
      - Strong TS/DX reasoning around contextual typing (why out-of-line needs factories).
  - Adds
      - More “routers/factories” concepts (domain contract vs impl router; pre-bound strategy
        factory; recipe-bound factories).
  - Costs / risks
      - Leaves “step resolve exists (and is engine-owned)” as the default mental model, which is
        exactly where current confusion has come from.
      - Public vs internal step config separation is less explicit; facade is discussed, but the
        model remains more implicit.

  ### Alt2 v6

  - Solves well
      - A clean, fully contract-first story all the way up through steps and recipes.
      - Makes “public authored config vs internal resolved config” explicit and enforceable
        (less room for half-migrated patterns).
      - Defaults + op-level normalization become mechanically applied, reducing agent error
        surface.
  - Adds
      - New step/recipe primitives and a sharper compile-time boundary (compileConfig, public/
        internal schemas).
  - Costs / risks
      - Migration scope is larger and more sequential (recipe compilation shape + step module
        API + engine expectations).
      - Requires careful alignment with the existing execution-plan compiler (to avoid ending up
        with two compilation centers).

  ## Recommendation (v6)

  Alt2 v6 is the stronger direction given your stated priorities (explicit type safety + DX +
  genuinely contract-first + simplicity), because it:

  - Makes the public-vs-internal config split explicit (less ambiguity, less “step plumbing”),
  - Turns op config resolution into mechanical compilation rather than “step-level thinking”,
  - Produces a more coherent end-to-end story from contracts → map file schema → compilation →
    execution.

  Where I’d be cautious with Alt2 v6

  - Don’t accidentally create a dual-compiler world (engine compile + recipe compile). If you
    adopt Alt2, pick one canonical compilation path and delete/avoid the other.
  - Keep the number of new primitives small and enforceable (otherwise it becomes a second
    “skills ecosystem” inside the SDK).

  If you want, I can also distill this into a “delta checklist” (what concrete changes Alt2
  requires vs Alt1) to estimate migration surface and where the sequential chokepoints are.