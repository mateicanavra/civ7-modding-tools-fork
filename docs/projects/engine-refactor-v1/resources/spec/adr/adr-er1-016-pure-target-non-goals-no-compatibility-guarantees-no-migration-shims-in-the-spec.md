---
id: ADR-ER1-016
title: "Pure-target non-goals (no compatibility guarantees, no migration shims in the spec)"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: stable
supersedes: []
superseded_by: null
sources:
  - "SPEC-target-architecture-draft"
---

# ADR-ER1-016: Pure-target non-goals (no compatibility guarantees, no migration shims in the spec)

## Context

The target architecture doc must remain “greenfield” and not encode compatibility/migration requirements as design goals.

## Decision

- The pure-target architecture does not include migration strategies or compatibility shims.
- The pure-target architecture does not guarantee parity or output compatibility with legacy pipelines.

## Consequences

- Migration/deferral planning lives in `deferrals.md` and milestone planning docs, not as compatibility constraints in the target design.
