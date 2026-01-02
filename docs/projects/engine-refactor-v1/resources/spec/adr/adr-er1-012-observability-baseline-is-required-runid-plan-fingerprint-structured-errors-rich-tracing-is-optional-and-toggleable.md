---
id: ADR-ER1-012
title: "Observability baseline is required (runId + plan fingerprint + structured errors); rich tracing is optional and toggleable"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: stable
system: mapgen
component: engine-runtime
concern: observability
supersedes: []
superseded_by: null
sources:
  - "SPEC-target-architecture-draft"
  - "SPIKE-target-architecture-draft"
  - "M4-target-architecture-cutover-legacy-cleanup (Triage “Testing / Runner / Observability Alignment”; end-state outcomes)"
---

# ADR-ER1-012: Observability baseline is required (runId + plan fingerprint + structured errors); rich tracing is optional and toggleable

## Context

Removing legacy indirection (manifest/config/flags) increases risk unless the target system preserves stable, explainable “what ran, why, and with what inputs” outputs.

## Decision

- Required baseline outputs (stable contract):
  - deterministic `runId` and stable “plan fingerprint” derived from `settings + recipe + step IDs + config`
  - structured compile-time errors and structured runtime failures
  - `ExecutionPlan` carries normalized data to explain scheduling and resolved config
- Optional diagnostics are implemented as pluggable sinks fed by a shared event model.
- Tracing/diagnostics must be toggleable globally and per step occurrence, without changing execution semantics.

## Consequences

- M4 must define and test a stable plan-fingerprint strategy to avoid CI flake and support trace correlation.
