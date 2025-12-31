---
id: ADR-ER1-004
title: "The standard pipeline is packaged as a mod-style package (not hard-wired)"
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

# ADR-ER1-004: The standard pipeline is packaged as a mod-style package (not hard-wired)

## Context

Prior implementations assumed a privileged “standard library” pipeline wired into core; the target architecture requires core to be content-agnostic and mod-driven.

## Decision

- Pipeline content ships as **mods** that provide their own registry + recipes.
- The standard pipeline is “just one mod” and must not be hard-coded in `pipeline/standard-library.ts`-style wiring.

## Consequences

- Core engine must not embed a privileged pipeline; it loads mod-provided registry + recipes.
- Any direct imports/entrypoints that treat “standard” as intrinsic must be removed or re-homed behind mod packaging.
