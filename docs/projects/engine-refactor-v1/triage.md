# Engine Refactor v1 — Triage & Backlog

This doc captures unsequenced work and open questions discovered during the project.  
Milestone and issue docs remain canonical for scheduled/active scope; entries here are reminders to revisit or place later.

**Entry format**
- **Title**
  - **Context:** milestone + issue(s) or discussion timestamp/source.
  - **Type:** `triage` (needs research/decision) or `backlog` (definite work, unsequenced).
  - **Notes:** short rationale / constraints / links.
  - **Next check:** when/how to re‑evaluate.

**Revisit index (best‑effort scan)**
- [Early M3] Port story orogeny belts to TS
- [During M3 story migration] Add minimal story parity regression harness

## Triage (needs decision / research)

## Backlog (definite, unsequenced)

- **Port story orogeny belts to TS** [Review by: early M3]
  - **Context:** M2 / `CIV-36` minimal story parity; decision to defer recorded 2025‑12‑12 discussion.
  - **Type:** backlog
  - **Notes:** Legacy `storyTagOrogenyBelts` relies on convergent‑boundary physics (`upliftPotential`, `tectonicStress`, `boundaryType`, `boundaryCloseness`) and prevailing winds. To make it meaningful in TS we need:
    - A TS port producing belt + windward/lee sets.
    - A `storyOrogeny` orchestrator stage.
    - Passing an `OrogenyCache` into `refineClimateEarthlike` (and `applyClimateSwatches` once that stage is wired), so rainfall/biomes regain the windward‑lee motifs.
  - **Next check:** revisit in early M3 when story swatches/corridors plumbing is scheduled and we can validate parity without destabilizing M2 defaults.

- **Add minimal story parity regression harness** [Review by: during M3 story migration]
  - **Context:** M2 review `REVIEW-M2-stable-engine-slice.md` CIV‑36 section; noted 2025‑12‑12.
  - **Type:** backlog
  - **Notes:** Current smoke test only asserts non‑empty margins/hotspots/rifts. Add a light harness (metrics or golden snapshots on a few canonical seeds/sizes) to validate distributions and overlays don’t drift as M3 refactors land.
  - **Next check:** schedule alongside `LOCAL-M3-story-system` step migration or when story consumers report parity gaps.
