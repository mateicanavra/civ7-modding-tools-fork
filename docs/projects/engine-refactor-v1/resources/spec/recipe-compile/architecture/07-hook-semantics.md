### 1.7 Hook semantics (compile vs normalize)

Terminology is intentionally strict:

- **`compile`** (shape-changing): maps a stage’s **public** view (non-knob portion) into an internal step-id keyed map (and may consult `knobs` and `env`).
  - Only required when `public !== internal` for that stage.
- **`normalize`** (shape-preserving): value-only canonicalization; must return the same shape it receives.
  - Used for step-level and op-level canonicalization inside the compiler pipeline.

Runtime handlers (`step.run`, `strategy.run`) must not default/clean/normalize; they execute with already-canonical configs.

---

