# Domain Refactor Sequencing + Mini‑Milestone Plan (Post‑U10)

Context:
- U10 “config canonicalization” is complete (compile-time `resolveConfig`, no legacy overrides mapping).
- Ecology is actively being refactored (exclude from “what’s next” sequencing decisions here).
- Goal: pick a **single** domain refactor order and propose a mini‑milestone plan to finish the remaining domains.

Inputs used for sequencing (ground truth in repo):
- Standard recipe stage order: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`.
- Cross‑domain import edges inside mod domain libs: `mods/mod-swooper-maps/src/domain/**` (`@mapgen/domain/<domain>` imports).
- Config surface area: `mods/mod-swooper-maps/src/config/schema/*.ts` line counts.
- Test surface area: `mods/mod-swooper-maps/test/**` (domain‑adjacent coverage by folder presence + counts).

## Remaining Domains (excluding ecology)

Domain inventory (rough size signals):
- `foundation`: 5 files / ~1268 LOC
- `morphology`: 38 files / ~2363 LOC
- `narrative`: 34 files / ~2556 LOC
- `hydrology`: 23 files / ~1430 LOC
- `placement`: 13 files / ~478 LOC

Config schema surface (LOC):
- `foundation.ts`: 434
- `morphology.ts`: 559
- `narrative.ts`: 471
- `hydrology.ts`: 736
- `placement.ts`: 109

Test surface (domain‑adjacent, dedicated test folders):
- `foundation`: 3 test files (`mods/mod-swooper-maps/test/foundation/**`)
- `narrative`: 5 test files (`mods/mod-swooper-maps/test/story/**`)
- `hydrology`: 0 dedicated test files today
- `morphology`: 0 dedicated test files today
- `placement`: 1 dedicated test file today (`mods/mod-swooper-maps/test/placement/**`)

## Dependency + Ordering Constraints (Why “just pick one domain” doesn’t work)

The recipe is already **domain‑interleaved**:
`foundation → morphology-pre → narrative-pre → morphology-mid → narrative-mid → morphology-post → hydrology-pre → narrative-swatches → hydrology-core → narrative-post → hydrology-post → ecology → placement`

Cross‑domain import edges (counts of `@mapgen/domain/<other>` imports inside `mods/mod-swooper-maps/src/domain/<domain>`):
- `foundation`: imports none (base supplier).
- `morphology`: imports `foundation` (4) and `narrative` (4).
- `hydrology`: imports `narrative` (1) (motifs queries in refine pipeline).
- `narrative`: imports `hydrology` (2) (climate swatches + climate paleo hooks).
- `placement`: imports none (terminal/isolated orchestration).

Implication:
- `narrative` cannot be refactored as a clean, isolated “after” step; it is structurally a **braid** with both `morphology` and `hydrology`.

## Sequencing Decision (Recommended order)

This is the recommended end‑to‑end order for refactoring the remaining domains into the target op‑module architecture.

1) **Foundation**
- Lowest coupling and highest leverage: everything else depends on it conceptually, and it has the best dedicated tests.

2) **Morphology + Narrative (paired, interleaved by stage)**
- The stage braid means their new op modules and artifact boundaries must be established together.
- Practical sequencing within the pair (matches stage ordering):
  - Morphology‑pre → Narrative‑pre → Morphology‑mid → Narrative‑mid → Morphology‑post

3) **Hydrology + Narrative (paired, interleaved by stage)**
- There is a real mutual dependency today (narrative swatches call hydrology; hydrology refine reads narrative motifs).
- Practical sequencing within the pair (matches stage ordering):
  - Hydrology‑pre → Narrative‑swatches → Hydrology‑core → Narrative‑post → Hydrology‑post

4) **Placement (last)**
- Isolated domain (no cross-domain imports) and small config surface.
- Best refactored after upstream artifact contracts stabilize.

Notes:
- Ecology stays excluded here because it is in-flight; this plan assumes ecology lands before the “placement last” cutover.

## Proposed Mini‑Milestone (Work Breakdown)

Milestone objective:
- Convert each remaining domain to the op‑module structure described in `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`.
- Preserve “scorched earth” cleanup: delete legacy shims and indirection when superseded.
- Add minimal, meaningful tests per domain so future refactors have guardrails (especially `morphology` and `hydrology`, which currently lack dedicated tests).

### Slice 1 — Foundation (low risk, highest leverage)
Deliverables:
- Foundation op modules exist (or equivalent “foundation domain ops” boundary) and are invoked only via steps.
- Domain‑owned config schemas + `resolveConfig` live alongside foundation operations.
- Dedicated tests continue to pass; add a single compile‑time `resolveConfig` regression test if missing for a new foundation op.

Exit criteria:
- No remaining direct step‑level “meaning defaults” for foundation values.
- No runtime config massaging inside foundation ops.

### Slice 2 — Morphology + Narrative (pre/mid/post braid)
Deliverables:
- Morphology steps become orchestration wrappers over morphology ops.
- Narrative “motifs” and “overlays” contracts are explicit artifacts produced/consumed across the braid stages.
- Add at least:
  - one morphology‑local unit test for a deterministic subroutine (e.g., plate bias / ocean separation helper),
  - one narrative‑local unit test covering motif extraction/serialization or a query helper,
  - one integration-ish pipeline test proving artifact contracts across the braid (morphology ↔ narrative).

Exit criteria:
- No cross‑domain imports that bypass the artifact boundary for the refactored components (exceptions must be intentional and documented once, not repeated as patterns).

### Slice 3 — Hydrology + Narrative (swatches + refine braid)
Deliverables:
- Hydrology steps become orchestration wrappers over hydrology ops.
- Narrative swatches are expressed as ops (or op-owned helpers) with config resolved at compile time.
- Add at least:
  - one hydrology‑local unit test for a pure climate helper (distance/orographic utilities, swatch chooser determinism),
  - one pipeline test proving “narrative swatches → hydrology core → narrative post → hydrology post” artifact wiring.

Exit criteria:
- Hydrology has dedicated tests (no longer “0 dedicated files”).
- Mutual narrative/hydrology dependencies are either artifact-mediated or explicitly, narrowly justified (no broad circular import drift).

### Slice 4 — Placement (terminal domain)
Deliverables:
- Placement is represented as ops invoked from the placement stage step.
- Config resolution for placement is fully compile-time; no runtime defaults logic in placement domain.
- Expand placement tests beyond the single regression to cover at least one deterministic helper and one pipeline behavior.

Exit criteria:
- Placement becomes the terminal stage with no “post-placement” fixups required in map entrypoints.

## Risks + Mitigations

1) Narrative ↔ Hydrology cyclic dependency (structural braid, not incidental)
- Mitigation: design artifact contracts first (what narrative produces vs what hydrology consumes), then enforce via step requires/provides.

2) Morphology and hydrology have weak dedicated test coverage today
- Mitigation: make “add at least one domain‑local unit test” a non‑negotiable deliverable per slice.

3) Large config schemas (especially hydrology) make refactors brittle
- Mitigation: refactor by op boundary (one op module + schema + resolver + tests at a time), not by “domain big bang”.

