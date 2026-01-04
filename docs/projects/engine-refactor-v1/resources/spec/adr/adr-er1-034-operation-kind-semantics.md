---
id: ADR-ER1-034
title: "Operation kind semantics (`plan` vs `compute` vs `score` vs `select`)"
status: accepted
date: 2025-12-30
project: engine-refactor-v1
risk: stable
system: mapgen
component: authoring-sdk
concern: domain-operation-modules
supersedes: []
superseded_by: null
sources:
  - "SPEC-step-domain-operation-modules"
---

# ADR-ER1-034: Operation kind semantics (`plan` vs `compute` vs `score` vs `select`)

This ADR is the canonical home for DD-001 from `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`.

## Context (verbatim from spike)

### DD-001: Operation kind semantics (`plan` vs `compute` vs `score` vs `select`)

**Impact / scale:** **Medium**

**System surface / blast radius (components):**
- **Domain operations (`DomainOpKind`)**: the labeled “kind” of an op (the public contract a step calls).
- **Steps**: the runtime orchestrator that validates config, calls ops, and applies/publishes results.
- **Docs/tooling**: any future scaffolding, contract rendering, or authoring UX that depends on “kind” meaning something consistent.

**Question:** Are `DomainOpKind` values strict semantics (a contract we teach and enforce) or just labels for documentation?

**Why it matters / what it affects:** “Kind” is the shared vocabulary that tells authors (and later tooling) how to treat the op’s output. If it is strict, it creates predictable step behavior (“plans are applied”, “compute results are published”) and keeps domain vs step responsibilities crisp. If it is soft, “kind” stops carrying reliable meaning and we drift back into ad-hoc orchestration and inconsistent contracts.

**Options:**
- **A) Strict semantics (preferred):** treat kinds as a contract.
  - `plan`: produces intents/edits/overrides that steps apply.
  - `compute`: produces derived artifacts/fields (no side effects).
  - `score`: produces scores/rankings over candidates.
  - `select`: produces selections/choices from candidates/scores.
- **B) Soft semantics:** kinds are descriptive only; overlap is allowed.
- **C) Fewer kinds:** collapse `score`/`select` (e.g., keep `plan` + `compute` + `score`).

**Recommendation:** Start with **A**, but keep the set small. If `select` doesn’t add real clarity, adopt **C** (collapse into `score`) while keeping the `plan` vs `compute` distinction crisp.

## Decision / Outcome (decided)

### 1) Decision (locked)

- Domain operations have a **required, strict** `kind` value:
  - `compute`, `plan`, `score`, `select`.
- Operations are **first-class contracts**:
  - they have explicit, schema-backed inputs/config/outputs,
  - they are the primary **unit of domain logic** and **unit testing**,
  - they are diagnosable/loggable and suitable for contract mapping.
- **Boundary rule (first part locked; full policy tracked separately):**
  - operation `run(input, config)` consumes **plain inputs** (POJOs + POJO-ish runtime values such as typed arrays),
  - operations must not rely on **hidden reads** from runtime/engine state (no adapter/callback “views” as part of the contract),
  - runtime binding (adapter reads, engine writes) belongs to steps and step-local helpers.
- **Export discipline is the control mechanism**:
  - the public domain surface exports only the ops intended as step-callable contracts,
  - internal phases are modeled as ops only when useful, but can remain un-exported without changing kind semantics.

### 2) Rationale

- **Shared semantics that remain trustworthy:** strict kinds provide a stable taxonomy that remains meaningful at scale (vs “everything is `compute`” drift).
- **Contract-first architecture:** operations provide durable, reviewable boundaries between:
  - step orchestration (runtime IO, scheduling, apply/publish), and
  - domain logic (deterministic computation/planning/scoring/selection).
- **Unit testing without runtime harnesses:** plain inputs/outputs let scoring/selection logic be tested directly with small fixtures, instead of requiring an adapter-backed integration harness for every domain rule.
- **Portability and composability:** explicit contracts make it feasible to reuse scoring or selection surfaces across steps/recipes/domains when appropriate, without accidental runtime coupling.
- **Observability and debugging leverage:** kind-aware contracts enable consistent diagnostics (score distributions, plan summaries, artifact stats) without bespoke per-op conventions.

### 3) Canonical shape (what “good” looks like)

An operation module exports exactly one operation:

```ts
export const myOp = createOp({
  kind: "compute" | "plan" | "score" | "select",
  id: "domain/path/opName",
  input: InputSchema,
  output: OutputSchema,
  strategies: {
    default: {
      config: ConfigSchema,
      run: (input, config) => ({ /* output */ }),
    },
  },
});
```

Kind intent (non-exhaustive):
- `compute`: derives stable fields/products from inputs (no runtime writes).
- `score`: derives scores/rankings/candidates from inputs (no selection side effects).
- `select`: chooses from candidates/scores and returns a selection (still no runtime writes).
- `plan`: returns an applyable plan (placements/edits/patches) that a step will apply.

Canonical file layout:

```txt
src/domain/<area>/<domain>/
  index.ts
  ops/
    <op>/
      index.ts                 # exports exactly one op via createOp
      schema.ts                # TypeBox schemas (types inferred at use sites)
      strategies/              # strategy implementations (may start empty)
      rules/                   # pure op-local rules (may start empty)
  rules/*.ts                   # optional: cross-op rules (pure)

src/recipes/<recipe>/stages/<stage>/steps/<step>/
  index.ts                     # step orchestration (build inputs → call ops → apply/publish)
  inputs.ts                    # runtime binding (adapter/artifacts → POJO inputs)
  apply.ts                     # runtime writes (engine/buffer mutation)
```

Illustrative composition pattern:

```txt
(step) build inputs → (domain) compute/score/select/plan → (step) apply + publish
```

### 4) Implications and consequences

- **Naming:** op modules should use verb-forward intent (e.g., `score*`, `select*`, `plan*`, `compute*`) so `kind` and `id` reinforce each other.
- **Testing:** prefer direct unit tests of `score`/`select` ops with small grids/candidates; reserve adapter-backed step tests for integration coverage.
- **Policy separation:** selection policies that may vary across use cases are encouraged to live in `select` (or strategy-backed `plan`) ops rather than being buried inside steps or implicit engine reads.
- **Compatibility note:** typed arrays remain allowed as “POJO-ish” runtime values; the remaining detailed policy for schemas/buffers/views is tracked in the operation inputs ADR and will be finalized separately.
