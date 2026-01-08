### 1.1 Goals (what this architecture is for)

- **Composition-first**: recipe/stage composition produces a fully canonical internal execution shape.
- **No engine-time config resolution**: engine plan compilation validates; it does not default/clean/mutate configs and does not call any config “resolver”.
- **No runtime schema defaulting/cleaning**: runtime handlers (`step.run`, `strategy.run`) treat configs as already canonical.
- **One canonical internal config shape** at runtime:
  - stage boundary uses **step-id keyed internal step config maps**
  - op envelopes are **top-level properties** in step configs (keyed by `step.contract.ops`)
- **Incremental adoption is per-stage**, without recipe-wide “modes” and without runtime branching/mode detection.

Non-goals for this landing:
- A recipe-level global “public facade” schema (deferred).
- A step-level “public input schema pass” (e.g. `inputSchema`, or “canonical schema but everything Optional”) (deferred).
- Nested op-envelope discovery (“op AST”, nested paths, arrays) (explicitly out of model).

---

