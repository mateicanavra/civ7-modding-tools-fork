---
id: ADR-ER1-014
title: "Core principles (TaskGraph pipeline, context-owned state, offline determinism)"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: stable
supersedes: []
superseded_by: null
sources:
  - "SPEC-target-architecture-draft"
  - "SPIKE-target-architecture-draft"
  - "M4-target-architecture-cutover-legacy-cleanup (Scope Areas; end-state outcomes)"
---

# ADR-ER1-014: Core principles (TaskGraph pipeline, context-owned state, offline determinism)

## Context

The target architecture must support engine-free execution, strict validation, and mod-authored composition without hidden state.

## Decision

- The pipeline is a TaskGraph of explicit step contracts (`requires/provides`), not implicit sequencing.
- There are no globals: all run state is context-owned (`MapGenContext`) and flows through explicit products/tags.
- Offline determinism is required; the Civ engine is optional and treated as an I/O surface (adapter-only).
- Pipeline content is not privileged engine code; it ships as mod packages (registry + recipes).

## Consequences

- Any module-level caches/registries/globals that act as dependency surfaces are legacy and must be removed or made context-owned.
- Tests and tooling must be able to compile/execute via a stub adapter with deterministic results.
