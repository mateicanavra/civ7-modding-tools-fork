---
id: ADR-ER1-003
title: "Pipeline boundary is `RunRequest = { recipe, settings }` compiled to `ExecutionPlan`"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: stable
supersedes: []
superseded_by: null
sources:
  - "SPEC-target-architecture-draft"
  - "SPIKE-target-architecture-draft"
  - "M4-target-architecture-cutover-legacy-cleanup (Scope Areas; Triage “Pipeline Cutover Gaps”)"
---

# ADR-ER1-003: Pipeline boundary is `RunRequest = { recipe, settings }` compiled to `ExecutionPlan`

## Context

Legacy orchestration centered on a monolithic `MapGenConfig` and stage-driven wiring; the target contract requires a smaller, explicit boundary and an internal compiled plan.

## Decision

- Boundary input is `RunRequest = { recipe, settings }` (not a monolithic `MapGenConfig`).
- `settings` are narrow, per-run instance values required to initialize context (at minimum: seed selection and dimensions).
- Step-local knobs live in per-occurrence config in the recipe and are carried into compiled plan nodes.
- Recipes compile into an internal `ExecutionPlan` (validated, defaults resolved, bundles expanded, deterministically ordered) and the executor runs the plan only.

## Consequences

- Any runtime path that still takes legacy stage/config inputs is legacy-only and must be deleted by end of M4.
- Per-step config plumbing (schema + validation + executor wiring) is required for the new boundary to be real (not “parsed but ignored”).
