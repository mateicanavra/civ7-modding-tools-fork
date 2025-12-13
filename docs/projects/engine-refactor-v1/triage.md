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
- [Early M3+] Design/implement modern story orogeny layer
- [During M3 story migration] Add minimal story parity regression harness

## Triage (needs decision / research)

- **Revisit `FoundationContext` contract doc structure & enforcement** [Review by: end of M3]
  - **Context:** M2 stable-slice contract at `resources/CONTRACT-foundation-context.md` (CIV-34 follow-up).
  - **Type:** triage
  - **Notes:** Re-evaluate whether to split into (1) a crisp, binding contract doc and (2) a separate aspirations/planning doc; tighten semantics as more M3 consumers land; implement enforcement ideas outlined in the contract doc (tests/CI/mutation guards) when the interface stabilizes.
  - **Next check:** after the first real M3 consumer steps ship (e.g., climate baseline) or at the end of M3.

## Backlog (definite, unsequenced)

- **Full MapGen architecture documentation sweep (post Task Graph / canonical products)** [Review by: late M3 / early M4]
  - **Context:** System docs at `docs/system/libs/mapgen/*.md` vs implementation once `PipelineExecutor` / `MapGenStep` / `StepRegistry` and canonical products stabilize.
  - **Type:** backlog
  - **Notes:** Larger pass to fully reconcile “current vs target” details across canonical system docs (e.g., `architecture.md`, `foundation.md`, `climate.md`, plus adjacent system pages as needed), removing remaining mismatches once the M3 architecture lands. This is explicitly **not** part of `LOCAL-M3-SYSTEM-DOCS-TARGET-VS-CURRENT` (which only adds framing + minimal current-state pointers).
  - **Next check:** after Task Graph + step execution is implemented and key products (`FoundationContext`, `ClimateField`, `StoryOverlays`) are stabilized.

- **Modern story orogeny layer (windward/lee amplification)** [Review by: early M3+]
  - **Context:** M2 / `CIV-36` minimal story parity deferred orogeny; `CIV-39` orogeny tunables promotion explicitly deferred in 2025‑12‑12 discussion.
  - **Type:** backlog
  - **Notes:** Legacy JS used `storyTagOrogenyBelts` + an `OrogenyCache` to amplify rainfall on windward/lee flanks along long convergent belts. We will **not** port that cache‑based flow in M2. In the task‑graph architecture (`docs/system/libs/mapgen/architecture.md`), reintroduce orogeny as a dedicated step/layer that:
    - Derives belts/flanks from `MapGenContext.artifacts.tectonics` (uplift/convergence) and prevailing winds.
    - Publishes modern story tags/overlays and/or applies rainfall/biome modifiers via context fields/buffers.
    - Owns a modern config surface (may replace legacy `foundation.story.orogeny.*` knobs).
  - **Next check:** schedule once Pipeline/Story steps land in M3 and we can validate parity without re‑adding legacy shims.

- **Add minimal story parity regression harness** [Review by: during M3 story migration]
  - **Context:** M2 review `REVIEW-M2-stable-engine-slice.md` CIV‑36 section; noted 2025‑12‑12.
  - **Type:** backlog
  - **Notes:** Current smoke test only asserts non‑empty margins/hotspots/rifts. Add a light harness (metrics or golden snapshots on a few canonical seeds/sizes) to validate distributions and overlays don’t drift as M3 refactors land.
  - **Next check:** schedule alongside `LOCAL-M3-story-system` step migration or when story consumers report parity gaps.
