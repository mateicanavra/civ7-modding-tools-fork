---
id: ADR-ER1-019
title: "Cross-cutting directionality policy is RunRequest settings (not per-step config duplication)"
status: accepted
date: 2025-12-22
project: engine-refactor-v1
risk: stable
supersedes: []
superseded_by: null
sources:
  - "M4-target-architecture-cutover-legacy-cleanup (Phase B.1 “Per-step config plumbing”; “settings are narrow per-run values”)"
  - "local-tbd-m4-pipeline-2-step-config-matrix (cross-cutting directionality ownership note)"
  - "SPIKE-target-architecture-draft"
---

# ADR-ER1-019: Cross-cutting directionality policy is RunRequest settings (not per-step config duplication)

## Context

Several non-foundation steps consult `foundation.dynamics.directionality.*` for biasing/selection, but per-step config is scoped to the recipe occurrence. Keeping directionality inside only the foundation step’s config either forces duplication into multiple steps or creates an implicit “read someone else’s config” dependency.

## Decision

- Treat the cross-cutting directionality policy as part of the RunRequest’s `settings` (typed, shared, explicit) rather than duplicating it across step configs.
- Steps that need directionality consume it from `settings` (not from `ctx.config.foundation.*` and not from other steps’ config).

## Consequences

- PIPELINE-2 must plumb a typed `settings` surface for directionality and migrate all consumers away from `ctx.config.foundation.dynamics.directionality.*`.
- If we later want directionality to be derived from foundation outputs, that should be a deliberate follow-up decision (it would create a new cross-step artifact dependency surface).
