---
id: ADR-ER1-026
title: "Landmass/ocean separation do not rely on `foundation.surface/policy` aliases (recipe config is authoritative)"
status: accepted
date: 2025-12-22
project: engine-refactor-v1
risk: stable
system: mapgen
component: authoring-sdk
concern: recipe-config
supersedes: []
superseded_by: null
sources:
  - "CIV-56-M4-pipeline-cutover-2-step-config-schemas (per-step config plumbing constraints)"
  - "local-tbd-m4-pipeline-2-step-config-matrix (landmassPlates alias inventory + recommendation)"
  - "M4-target-architecture-cutover-legacy-cleanup (Phase B/D pipeline sequencing + “no legacy left” gate)"
---

# ADR-ER1-026: Landmass/ocean separation do not rely on `foundation.surface/policy` aliases (recipe config is authoritative)

## Context

`landmassPlates` and ocean separation consult legacy `foundation.surface` / `foundation.policy` aliases in addition to dedicated config. With per-occurrence config and explicit settings, these aliases create hidden coupling and undermine “recipe is the source of truth.”

## Decision

- Landmass/ocean separation behavior is configured via explicit step config (`config.landmass`, `config.oceanSeparation`) and/or explicit RunRequest settings when cross-cutting.
- `foundation.surface` / `foundation.policy` alias lookups are treated as legacy-only and should be removed from the default path during M4 cleanup (no continued aliasing in v1).

## Consequences

- PIPELINE-2 schema/plumbing work can treat landmass+ocean separation as normal per-step config owners.
- PIPELINE-5 cleanup should delete residual alias reads so downstream behavior is “what recipe says,” not “what legacy aliases imply.”
