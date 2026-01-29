---
id: LOCAL-TBD-morphology-comments-and-author-knobs
title: "Morphology — Documentation pass + deeper author knobs"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: null
assignees: [codex]
labels: [morphology, config, knobs, docs]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [M11-U02, M11-U05, M11-U06, M11-U09]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Add missing documentation/JSdoc throughout the Morphology domain, and expand the “knobs-first” author surface so authors can tune the *terrain fabric* (relief, coast structure, erosion posture, and mountain character) without spelunking step-level config trees.

## Deliverables
- Morphology code documentation pass:
  - Add/standardize JSdoc for Morphology config schemas, ops, and key rule modules.
  - Ensure schema `description` strings are mirrored in JSdoc where the schema is defined.
- Deeper author knobs (target outcomes rather than internal parameters):
  - Identify a small, high-leverage set of Morphology knobs that map to visible outcomes (terrain roughness, valley incision, coastline complexity, mountain prevalence/shape, island frequency).
  - Document each knob with semantics, default posture, and interactions.
  - Wire knobs through deterministic transforms (knobs-last over advanced baseline).
- Preset alignment:
  - Update realism presets and default map configs to use the expanded knobs as primary controls, keeping `advanced` as the escape hatch.

## Acceptance Criteria
- Morphology domain modules are documented enough that a new contributor can trace:
  - “which physics signals drive which morphology outputs”
  - “which knobs affect which visible outcomes”
- New knobs are bounded, deterministic, and test-locked (knobs-only vs advanced+knobs).
- Presets remain stable and type-safe; no silent fallbacks/compat shims are introduced.

