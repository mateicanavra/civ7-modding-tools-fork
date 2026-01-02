---
id: ADR-ER1-005
title: "Presets are removed; canonical entry is explicit recipe + settings selection"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: stable
system: mapgen
component: content-mod
concern: content-packaging
supersedes: []
superseded_by: null
sources:
  - "SPEC-target-architecture-draft"
  - "SPIKE-target-architecture-draft"
  - "M4-target-architecture-cutover-legacy-cleanup (Triage “Pipeline Cutover Gaps”)"
---

# ADR-ER1-005: Presets are removed; canonical entry is explicit recipe + settings selection

## Context

Preset resolution/composition was a legacy entry mode tied to `MapGenConfig` and created implicit configuration merges.

## Decision

- Presets are removed as a concept; there is no preset resolution/composition in the target runtime.
- Canonical entry is explicit selection of `{ recipe, settings }`.
- If a “preset-like” concept exists in tooling, it is treated as selecting a named recipe (and providing settings), not as a runtime composition mechanism.

## Consequences

- All preset resolution/composition paths are legacy and must not survive M4.
