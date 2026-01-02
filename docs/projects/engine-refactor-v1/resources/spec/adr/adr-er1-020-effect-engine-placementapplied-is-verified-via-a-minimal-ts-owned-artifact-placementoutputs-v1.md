---
id: ADR-ER1-020
title: "`effect:engine.placementApplied` is verified via a minimal TS-owned `artifact:placementOutputs@v1`"
status: accepted
date: 2025-12-22
project: engine-refactor-v1
risk: at_risk
supersedes: []
superseded_by: null
sources:
  - "local-tbd-m4-effects-1-effect-tags-postconditions (placement verification options; recommended option 1)"
  - "local-tbd-m4-placement-2-cutover-checklist (placement cutover verification plan)"
  - "SPIKE-target-architecture-draft"
---

# ADR-ER1-020: `effect:engine.placementApplied` is verified via a minimal TS-owned `artifact:placementOutputs@v1`

## Context

Placement is an engine-effect-heavy step: the adapter exposes many placement writes but few reads suitable for verification. M4 requires “no asserted-but-unverified scheduling edges” for `effect:*`, but expanding the adapter with placement read-back APIs is higher coordination/engine-surface risk.

## Decision

- Placement publishes a minimal, versioned TS-owned output artifact `artifact:placementOutputs@v1`.
- `effect:engine.placementApplied` verification is satisfied by validating that `artifact:placementOutputs@v1` exists and is schema-valid (plus lightweight invariants like expected `startPositions` shape/count when starts are provided).

## Consequences

- Introduces a new artifact contract to version/maintain; it should remain intentionally small and “verification-oriented.”
- Output counts are best-effort placeholders; they should not be treated as authoritative engine read-backs.
- Avoids new adapter read surfaces for placement verification in M4; if stronger verification is needed later, prefer adding it explicitly as a follow-up (see DEF-017 for the general “read-back surfaces for effect verification” deferral).
