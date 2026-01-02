---
id: ADR-ER1-018
title: "Decision promotion plan (post-M4)"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: overridden
supersedes: []
superseded_by: null
archived: true
sources:
  - "SPEC-target-architecture-draft"
---

# ADR-ER1-018: Decision promotion plan (post-M4)

## Context

Target architecture decisions live in the project docs today; longer-term, they should be promoted to evergreen system docs.

## Decision

- Promote stable, evergreen parts of the MapGen architecture to `docs/system/libs/mapgen/architecture.md` and related domain docs as the implementation stabilizes.
- Record decisions in `docs/system/ADR.md` as they are finalized.

## Consequences

- Project-scoped ADRs may later be superseded by system-level ADRs once MapGen architecture is no longer project-specific.
