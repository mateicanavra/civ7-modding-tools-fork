---
id: ADR-ER1-023
title: "Placement demo payloads omit `starts` by default (engine-free “won’t crash” demos)"
status: accepted
date: 2025-12-22
project: engine-refactor-v1
risk: overridden
system: mapgen
component: engine-runtime
concern: dependency-registry
supersedes: []
superseded_by: null
archived: true
sources:
  - "CIV-64-M4-PLACEMENT-INPUTS (demo payload safety note)"
  - "local-tbd-m4-placement-1-placementinputs-v1-contract (safe demo payload guidance; starts optional)"
  - "M4-target-architecture-cutover-legacy-cleanup (Phase E placement contract work)"
---

# ADR-ER1-023: Placement demo payloads omit `starts` by default (engine-free “won’t crash” demos)

## Context

M4 introduces typed tag registry demo payload validation and a TS-canonical `artifact:placementInputs@v1`. Placement “starts” involve engine-dependent adapter calls and can make minimal demos/tests brittle or non-engine-free.

## Decision

- Demo payloads and minimal engine-free tests that use `artifact:placementInputs@v1` should **omit `starts` by default**.
- Placement must treat missing `starts` as “skip start placement” (preserve current behavior); this keeps demos “won’t crash” without requiring engine-backed start placement surfaces.
- Engine-backed/integration tests may include `starts` when explicitly testing the start-placement path.

## Consequences

- Demo payload validation can stay strict without forcing engine-dependent start placement in all demos.
- CI smoke tests remain engine-free; deeper placement-start correctness should be covered by targeted integration tests when needed.
