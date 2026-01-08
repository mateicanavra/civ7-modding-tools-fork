• Here are the “hard fork” (binary / mutually exclusive) design decisions that Alt1 v6 vs Alt2
  v6 are actually making. Everything else (helpers, naming, ergonomics) mostly follows from
  these.

  - 1) Who owns config compilation? (Engine-centered vs Recipe/Step-centered)
      - Alt1: Engine/execution-plan compilation is the canonical compiler; steps may have
        resolveConfig, and the plan builder must honor/forward it.
      - Alt2: Recipe + step modules own compilation (recipe.compile(...),
        step.compileConfig(...)); engine executes already-resolved internal configs.
  - 2) Is step.resolveConfig a first-class runtime boundary, or eliminated?
      - Alt1: Keep step.resolveConfig as the composition point (and fix the bug where it’s
        currently dropped); “resolved config” happens at/through step.
      - Alt2: Remove step.resolveConfig as a concept; replace with compileConfig(public, knobs)
        -> internal (compile-time only).
  - 3) Do steps have two schemas (public vs internal), or one canonical schema?
      - Alt1: Step contract tends to expose a single “the step config” schema (derived/
        normalized via resolution).
      - Alt2: Step contract explicitly has two schemas:
          - publicSchema (what users author)
          - internalSchema (what runtime executes)
  - 4) Is “public authored schema” the map file schema, or does engine/plan define it?
      - Alt1: Map/plan compilation remains the center; “public schema” is effectively whatever
        the engine plan compiler accepts for steps/ops.
      - Alt2: Recipe exports the public map-file schema directly and compiles it to internal
        configs; this makes the recipe the source of truth for “what users can write”.
  - 5) Where does normalization/defaulting live (single compiler vs distributed compilers)?
      - Alt1: Normalization is centralized in engine plan compilation (plus per-step/per-op
        resolvers invoked from there).
      - Alt2: Normalization lives in step compilation (compileConfig) orchestrated by recipe
        compile; engine does not perform “meaning-level” normalization at runtime.
  - 6) How is composition represented (auto-derived “op wiring” vs explicit step compiler
    logic)?
      - Alt1: Composition-first steps can auto-derive config schema + resolve logic from an ops
        catalog (engine/compiler can generate forwarding).
      - Alt2: Composition is explicit in compileConfig: you mechanically compile each op
        envelope and then assemble internal config; no auto “step resolve generator” as the
        center.
  - 7) What is the engine’s contract surface (exec plan stores public vs internal)?
      - Alt1: Execution plan may store “resolved step config” but the compiler logic is still
        engine-side; step config is treated as canonical and already normalized.
      - Alt2: Execution plan stores internal (compiled) configs; “public configs” are not
        present at runtime beyond compile-time.
  - 8) How do we prevent “dual compilation” long-term?
      - Alt1: Prevent drift by making engine compile the only compilation path and ensuring all
        steps participate correctly.
      - Alt2: Prevent drift by making recipe/step compile the only compilation path and making
        engine execution dumb/strict (no hidden compile behavior).
  - 9) What is the primary “contract-first” unit: ops or steps?
      - Alt1: Ops are the primary contracts; steps are orchestration that binds ops, and can be
        derived/composed from op contracts.
      - Alt2: Steps are first-class contracts (public/internal schemas + compile/run), and ops
        are dependencies bound into step compilation/execution.

  If you pick Alt2’s answers on (1)/(2)/(3)/(4), you’re implicitly committing to the rest:
  recipe/step compilation becomes the single source of truth, and the engine is an executor over
  internal configs. If you pick Alt1’s answers, you’re committing to engine-centered compilation
  and keeping step resolution as a real contract surface that must be honored end-to-end.