---
id: ADR-ER1-033
title: "Step schema composition (manual wiring vs declarative op usage)"
status: proposed
date: 2025-12-30
project: engine-refactor-v1
risk: at_risk
system: mapgen
component: authoring-sdk
concern: step-contracts
supersedes: []
superseded_by: null
sources:
  - "SPEC-architecture-overview"
  - "SPEC-packaging-and-file-structure"
  - "SPEC-step-domain-operation-modules"
---

# ADR-ER1-033: Step schema composition (manual wiring vs declarative op usage)

## Context

Step contract model modules need to define:
- step config schema,
- dependency key usage (requires/provides),
- any step-local validators/helpers.

The step/domain-operation module design introduces reusable domain operations with their own schemas. We need a decision on whether step contracts are manually authored or are mechanically derived from operation usage.

## Decision

- Steps use an explicit, step-owned contract model module (e.g., `<stepId>.model.ts`) as the authoritative contract surface.
- Step schemas may **compose** operation schemas via explicit imports/helpers, but there is no “implicit inference” from which operations a step happens to call.
- The compiled plan is the final, explicit contract surface for a run; any generation must result in explicit schemas/config in the plan.

## Options considered

1. **Manual step contract wiring**
   - Pros: explicit; easy to audit; stable diffs; fewer magic edges
   - Cons: requires some boilerplate
2. **Declarative op usage (auto-derived step schema)**
   - Pros: less boilerplate; tighter coupling between implementation and contract
   - Cons: implicit behavior; hard to audit; encourages accidental contract changes
3. **Hybrid**
   - Pros: flexibility
   - Cons: complex rules; risk of silent drift

## Consequences

- Step contract modules remain the unit of review for contract changes.
- Operation/module reuse remains possible without turning the step contract into an opaque generated artifact.
