---
id: ADR-ER1-001
title: "Ordering source of truth is recipe-only (no `STAGE_ORDER` / `stageManifest`)"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: at_risk
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

# ADR-ER1-001: Ordering source of truth is recipe-only (no `STAGE_ORDER` / `stageManifest`)

## Context

M3 used `STAGE_ORDER` + `stageManifest` as transitional ordering sources (`DEF-004`), but the target architecture requires mod-authored composition with a single source of truth.

## Decision

- The recipe is the single source of truth for pipeline ordering.
- Any manifest-like representation is derived/internal (compiled), not a second truth and not mod-facing.
- “Vanilla” ordering ships as a default recipe in the standard mod package (not a hard-coded internal list).
- V1 authoring baseline is linear `steps[]`; DAG/partial-order authoring is a later refinement.

## Consequences

- Runtime ordering inputs `STAGE_ORDER` / `stageManifest` / `stageConfig` are deletion-only legacy and must not survive M4.
- The executor runs a compiled artifact (`ExecutionPlan`) derived from `{ recipe, settings } + registry`.
