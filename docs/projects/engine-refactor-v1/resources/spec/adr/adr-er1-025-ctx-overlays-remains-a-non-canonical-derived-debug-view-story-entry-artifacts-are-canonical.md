---
id: ADR-ER1-025
title: "`ctx.overlays` remains a non-canonical derived debug view (story entry artifacts are canonical)"
status: accepted
date: 2025-12-22
project: engine-refactor-v1
risk: at_risk
supersedes: []
superseded_by: null
sources:
  - "CIV-65-M4-NARRATIVE-CLEANUP (overlays/StoryTags cleanup target)"
  - "local-tbd-m4-narrative-2-storytags-consumer-and-cache-map (consumer/cache map)"
  - "deferrals (DEF-002 StoryTags compatibility; DEF-012 caches)"
---

# ADR-ER1-025: `ctx.overlays` remains a non-canonical derived debug view (story entry artifacts are canonical)

## Context

M3 uses `ctx.overlays` and derived StoryTags as a transitional representation. The target model treats narrative story entries as typed artifacts that participate in scheduling and validation like any other product.

## Decision

- Narrative story entry artifacts (`artifact:narrative.motifs.<motifId>.stories.<storyId>@vN`) are the **canonical** dependency surfaces for narrative/playability.
- `ctx.overlays` may remain as a **derived debug/compat view** (useful for diagnostics and transitional helpers), but it must not be required for correctness:
  - consumers must depend on artifacts (or derived helpers operating on artifacts),
  - overlays are not a scheduling surface and should not introduce hidden dependencies.

## Consequences

- Enables incremental migration away from overlays/StoryTags without deleting a useful debugging representation.
- Any remaining overlay usage must be treated as debug/compat-only and should not gate pipeline correctness.
