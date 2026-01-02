---
id: ADR-ER1-021
title: "`effect:engine.landmassApplied` / `effect:engine.coastlinesApplied` are verified via cheap invariants + call evidence; adapter read-back APIs are deferred"
status: accepted
date: 2025-12-22
project: engine-refactor-v1
risk: at_risk
supersedes: []
superseded_by: null
sources:
  - "local-tbd-m4-effects-3-state-engine-removal-map (replacement map + coordination notes)"
  - "local-tbd-m4-engine-boundary-globals-inventory (engine boundary surfaces and adapter constraints)"
  - "SPIKE-target-architecture-draft"
  - "---"
---

# ADR-ER1-021: `effect:engine.landmassApplied` / `effect:engine.coastlinesApplied` are verified via cheap invariants + call evidence; adapter read-back APIs are deferred

## Context

Landmass/coastlines are engine mutations that historically used `state:engine.*` edges without runtime verification. The current adapter interface is largely write-oriented for landmass/plot tags/regions; adding read-back APIs requires more engine-surface design and increases coupling risk.

## Decision

- Replace `state:engine.landmassApplied` / `state:engine.coastlinesApplied` with verified `effect:*` tags.
- For M4, verification uses:
  - **cheap invariants** that can be checked with existing adapter reads (e.g., terrain-type deltas for coastlines), and/or
  - **call evidence** in the adapter/mock adapter (e.g., ensuring the expected engine mutation entrypoints were invoked).
- Do not add new adapter read-back APIs for landmass/plot tags/regions solely for verification in M4 (explicitly deferred).

## Consequences

- Verification is intentionally “wiring correctness” oriented, not a full semantic proof of engine state.
- If these verifiers are insufficient (miss real breakages or are flaky), revisit with explicit adapter read-back APIs and stronger invariants (tracked as DEF-017).
