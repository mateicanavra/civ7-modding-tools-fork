---
id: ADR-ER1-034
title: "Operation kind semantics (`plan` vs `compute` vs `score` vs `select`)"
status: proposed
date: 2025-12-30
project: engine-refactor-v1
risk: at_risk
system: mapgen
component: authoring-sdk
concern: domain-operation-modules
supersedes: []
superseded_by: null
sources:
  - "SPEC-pending-step-domain-operation-modules"
---

# ADR-ER1-034: Operation kind semantics (`plan` vs `compute` vs `score` vs `select`)

This ADR is the canonical home for DD-001 from `docs/projects/engine-refactor-v1/resources/spec/SPEC-pending-step-domain-operation-modules.md`.

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
