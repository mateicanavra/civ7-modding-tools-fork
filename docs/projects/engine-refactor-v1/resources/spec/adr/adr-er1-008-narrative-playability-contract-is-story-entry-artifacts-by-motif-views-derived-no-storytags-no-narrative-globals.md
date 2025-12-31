---
id: ADR-ER1-008
title: "Narrative/playability contract is story entry artifacts by motif; views derived; no `StoryTags`; no narrative globals"
status: accepted
date: 2025-12-21
project: engine-refactor-v1
risk: stable
supersedes: []
superseded_by: null
sources:
  - "SPEC-target-architecture-draft"
  - "SPIKE-target-architecture-draft"
  - "M4-target-architecture-cutover-legacy-cleanup (Triage “Narrative/Playability Cleanup”; end-state outcomes)"
---

# ADR-ER1-008: Narrative/playability contract is story entry artifacts by motif; views derived; no `StoryTags`; no narrative globals

## Context

“StoryOverlays/StoryTags” created dual representations and repeated derivations; narrative must be optional and mod-friendly without becoming a privileged core phase.

## Decision

- Narrative/playability is expressed as normal steps that publish typed, versioned **story entry artifacts** (`artifact:narrative.motifs.<motifId>.stories.<storyId>@vN`).
- Narrative views (including overlay snapshots) are derived on demand from story entries and are not published dependency surfaces.
- There is no canonical `StoryTags` surface in the target.
- Narrative is optional via recipe composition (a recipe may omit it; if it includes consumers it must include publishers).
- No narrative globals/caches outside a run context; caching is context-owned artifacts keyed to the run.

## Consequences

- StoryTags and module-level narrative caches/globals are legacy surfaces and must not survive M4.
