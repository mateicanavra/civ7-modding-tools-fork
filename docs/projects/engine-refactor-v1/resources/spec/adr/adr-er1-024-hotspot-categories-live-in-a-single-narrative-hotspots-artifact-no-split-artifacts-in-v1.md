---
id: ADR-ER1-024
title: "Hotspot categories live in a single narrative hotspots artifact (no split artifacts in v1)"
status: accepted
date: 2025-12-22
project: engine-refactor-v1
risk: stable
system: mapgen
component: domain-content
concern: narrative
supersedes: []
superseded_by: null
sources:
  - "CIV-65-M4-NARRATIVE-CLEANUP (hotspot categorization gap)"
  - "local-tbd-m4-narrative-1-artifact-inventory (producer/consumer map + hotspot drift note)"
  - "M4-target-architecture-cutover-legacy-cleanup (Phase F narrative producers/consumers sequencing)"
---

# ADR-ER1-024: Hotspot categories live in a single narrative hotspots artifact (no split artifacts in v1)

## Context

Consumers (notably features) expect “paradise” vs “volcanic” hotspot semantics, while current producers do not populate the categorized StoryTags surface consistently. The target narrative model makes story entry artifacts canonical and deletes StoryTags as a correctness dependency.

## Decision

- Publish hotspot outputs as a **single** canonical story entry artifact under the `hotspots` motif (`artifact:narrative.motifs.hotspots.stories.<storyId>@v1`).
- Encode hotspot categories **within** that story entry payload (e.g., separate categorized tile sets/keys for `paradise` and `volcanic`), rather than splitting into multiple story entries.
- Consumers migrate to read hotspot categories from the hotspots story entry (not StoryTags).

## Consequences

- Reduces scheduling/tag surface area (one artifact dependency instead of multiple).
- Requires aligning the hotspots producer and feature consumers to the artifact’s internal category representation during NARRATIVE-1/NARRATIVE-2.
