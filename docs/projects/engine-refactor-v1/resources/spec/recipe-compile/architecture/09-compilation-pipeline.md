### 1.9 Canonical compilation pipeline (definitive ordering)

This is the definitive ordering for the landing.

#### Phase A — Stage-level “public → internal” (optional)

For each stage:

1. Normalize stage config input via schema:
   - Always validate/default/clean against the stage’s computed `surfaceSchema` (the single author-facing schema: `knobs` + fields).
   - For internal-as-public stages, step fields are `unknown` at this phase; strict step validation happens later.
2. Convert to internal plumbing shape deterministically via `stage.toInternal({ env, stageConfig })`:
   - Extract `knobs` from the stage config object.
   - Produce `rawSteps`:
     - If stage has `public`: `rawSteps = stage.compile({ env, knobs, config: configPart })`
     - Else: `rawSteps = omit(stageConfig, "knobs")` (identity on the step-map portion; `knobs` is not part of the step map)

At the end of Phase A for each stage:

```ts
rawInternalStage: Partial<Record<stepId, unknown>>
knobs: unknown
```

#### Phase B — Step canonicalization (always)

For each step, in deterministic order:

1. `rawStep = rawInternalStage[stepId] ?? undefined`
2. Prefill op defaults (top-level keys only; keys are discovered from `step.contract.ops`)
3. Normalize step config via strict schema normalization (default + clean + unknown-key errors)
4. Apply `step.normalize` (value-only) if present; re-normalize via schema
5. Apply mechanical op normalization pass (top-level only); re-normalize via schema

Output:
- a total, canonical internal per-step config map for the stage

This pipeline is recipe-owned; the engine receives only the compiled internal configs.

---

