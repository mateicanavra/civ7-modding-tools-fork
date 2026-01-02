---
id: ADR-ER1-002
title: "Enablement is recipe-authored and compiled (no `shouldRun`, no silent skips)"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: stable
system: mapgen
component: engine-runtime
concern: execution-plan
supersedes: []
superseded_by: null
sources:
  - "SPEC-target-architecture-draft"
  - "SPIKE-target-architecture-draft"
  - "M4-target-architecture-cutover-legacy-cleanup (Scope Areas; Triage “Pipeline Cutover Gaps”)"
---

# ADR-ER1-002: Enablement is recipe-authored and compiled (no `shouldRun`, no silent skips)

## Context

Historically, enablement was split across `stageConfig`/`stageManifest` and `stageFlags`/`shouldRun`, which made validation incomplete and execution hard to reason about.

## Decision

- Enablement is authored in the recipe and compiled into `ExecutionPlan`.
- Steps have no `shouldRun` contract and the executor does not self-filter.
- Optional behavior is expressed via recipe composition and/or explicit config; any “can’t run” condition is a fail-fast error (validation/precondition), not a silent skip.

## Consequences

- `stageFlags` / `shouldRun` are legacy surfaces and must not survive M4.
- Contract validation can treat `requires/provides` as complete given the plan.
