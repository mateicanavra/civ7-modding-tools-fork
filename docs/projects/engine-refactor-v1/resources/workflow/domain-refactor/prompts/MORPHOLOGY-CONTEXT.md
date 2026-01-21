## Morphology context packet (domain-only, non-prescriptive)

This document is a Morphology “heads up” packet distilled from cross-pipeline refactor learnings and observations.

This document is:
- Non-authoritative context to inform Phase 0.5–3 work.
- A place to capture useful nuance without turning the non-implementation prompt into an implementation spec.

This document is not:
- The Morphology Phase 0.5/1/2/3 deliverable.
- A prescriptive algorithm/design spec.

Authoritative workflow + locked decisions live in the domain-refactor workflow docs and the Morphology Phase 2 canon:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`

### 0) Locked Phase 2 posture (non-negotiable; do not reinterpret)

These are hard constraints. If you disagree, stop and escalate in the Phase 3 issue doc — do not “work around” them.

- Topology invariant is locked:
  - `wrapX = true` always, `wrapY = false` always.
  - No environment/config/knobs for wrap; wrap flags do not appear in input contracts.
- Truth vs map boundary is locked:
  - Physics domains publish truth-only artifacts (pure; engine-agnostic).
  - Gameplay/map owns `artifact:map.*` projection/annotation layers and adapter stamping.
  - No backfeeding: Physics MUST NOT consume `artifact:map.*` or `effect:map.*` (even “just for debugging”).
- Effects are locked:
  - `effect:map.<thing><Verb>` are boolean execution guarantees.
  - Convention: `<Verb> = Plotted` (short verbs only).
  - No receipts/hashes/versioning; effects are not audit logs.
- Hard ban is locked:
  - Do not introduce `artifact:map.realized.*`, and do not invent a runtime “map.realized” concept.
- TerrainBuilder no-drift is locked:
  - `TerrainBuilder.buildElevation()` produces engine-derived elevation/cliffs; there is no setter.
  - Anything that must match Civ7 elevation bands / cliff crossings belongs in Gameplay after `effect:map.elevationPlotted` and may read engine surfaces.
  - Physics may publish complementary signals (slope/roughness/relief/etc.) but MUST NOT claim “Civ7 cliffs” as Physics truth.
- Nuance (explicitly allowed):
  - Physics truth MAY be tile-indexed and MAY include `tileIndex`. The ban is on engine/game-facing ids and on consuming map-layer projections/effects.

### 1) What Morphology owns (responsibility framing)

Morphology owns canonical “shape truth” of the world:
- Land/ocean boundary and the shape of coastlines.
- Elevation/relief structure (and any Morphology-owned derived “form” descriptors).
- Mountain systems, large-scale ridges/ranges, shelves, islands, volcanics (as Morphology outputs).

Morphology does not own:
- Climate (winds/rainfall/temperature).
- Hydrology discharge/routing (river networks, runoff budgets).
- Biome/ecology classification.
- Resource/feature placement or gameplay siting logic.
- Narrative/story overlays (explicitly forbidden; actively in scope to remove from any Morphology-related processing).

### 2) Boundary posture (purity, contract discipline)

Contract direction:
- Morphology artifacts define “what the world looks like.”
- Engine-facing projections (terrain indices, adjacency masks, engine tags) are derived from Morphology outputs and must not feed back as Morphology inputs.

Contract hygiene:
- Avoid accidental contract sprawl: do not publish every intermediate “because it’s handy.”
- If a downstream domain needs a value repeatedly and it is stable, promote it intentionally as a public artifact/contract with documentation and guardrails.
- Otherwise keep it internal and explicitly mark it as internal-only.

Compat posture:
- No compat surfaces inside Morphology.
- If legacy projections exist, they must be migrated and deleted (pipeline-green, no shims/dual paths).

### 3) Inputs (categories, not commitments)

In Phase 0.5/2, treat these as input categories to evaluate, not commitments:
- Upstream geometry/topology: region mesh, neighbor graph, plates/tectonics, and any world scaffold representation.
- Determinism inputs: stable seed(s) and any authored randomization policy expressed as data.
- Global map constants: size, latitude mapping, projection/tiling parameters; conceptually, sea-level policy.
- Author config: typed, schema-defaulted advanced config baseline; knobs as deterministic transforms applied after.

### 4) Outputs (candidate “shape” of public contracts)

Think in two tiers:

Tier A — canonical public morphology artifacts (candidate cross-domain contracts):
- A land/ocean representation (mask or equivalent).
- An elevation-like field (absolute or normalized) sufficient for downstream reasoning.
- A small set of stable derived morphology descriptors that downstream domains plausibly need:
  - slope/roughness/relief proxies (ecology/placement)
  - coastal proximity / shelf indicators (ecology/placement/hydrology coupling)
  - barrier/orography descriptors as geometry inputs (not climate outputs)

Tier B — internal intermediates (Morphology-only buffers):
- Anything produced purely to compute Tier A, or likely to change slice-to-slice, stays internal unless explicitly promoted as a public contract.

### 5) Consumers (what downstream domains actually need)

Hydrology:
- Needs canonical shape truth (land/ocean, elevation/gradients, basins/coastal context), not engine adjacency.
- Any projections to engine surfaces happen at boundaries, not as Morphology/Hydrology truth.

Ecology:
- Needs morphology descriptors like altitude/relief/slope/coastal proximity.
- Must not depend on narrative overlays or engine classifications as “morphology truth” (and any such overlay dependencies are legacy to remove/replace).

Placement / Gameplay:
- Needs passability proxies and “settleable” geometry constraints (derived from Morphology).
- Should consume stable Morphology artifacts rather than re-deriving from engine data.

Engine interop:
- Consumes projections derived from Morphology outputs.
- Must not become a backdoor source of truth for Morphology.

### 6) Config & knobs semantics (portable refactor rules)

Key refactor carry-forward rules:
- Advanced config is the baseline: typed + schema-defaulted.
- Knobs are transforms: deterministic transforms applied after normalization (not a precedence system vs advanced config).
- After schema defaulting/normalization, run code must not “if undefined then fallback” into hidden behavior.
- No hidden tuning constants: any multiplier/threshold/scale used to interpret knobs or shape outputs must be either:
  - a named, documented internal constant (if truly non-author-facing), or
  - an explicit advanced config input (if authors plausibly tune it).

### 7) Determinism & purity expectations (portable architecture posture)

General expectations to carry into modeling and implementation planning:
- Prefer passing determinism across boundaries as data (seeds/inputs), not as runtime RNG objects/functions.
- Keep domain ops data-pure; steps own runtime binding and pipeline context.

### 8) Morphology gotchas (traps to proactively scan for)

Common failure modes to inventory in Phase 1 and design against in Phase 2:
- Engine truth inversion: using engine terrain indices/adjacency as a proxy for morphology truth.
- Accidental contract sprawl: publishing every intermediate “just in case,” then being unable to refactor without breaking consumers.
- Magic numbers in the core: coast smoothing constants, mountain thresholds, shelf widths, island parameters buried in run code.
- Cross-domain leakage: Morphology deciding “wetness,” “fertility,” “biome suitability,” etc. (belongs to Hydrology/Ecology/Placement).

### 9) Phase 0.5 context-gathering prompts (questions, not answers)

Use these as prompts for Phase 0.5 and as validation checks in Phase 1:
- What are the current Morphology outputs that downstream domains already consume (explicitly or accidentally)?
- Which downstream needs are best served by a small stable set of public morphology descriptors (Tier A), vs which should stay internal?
- Where does code treat an engine projection as Morphology authority today?
- What tuning constants are currently embedded in Morphology computation, and which are mathematically fixed vs author-facing?

### 10) Nearby repo touchpoints (starting points for evidence)

Primary code “bones” to inspect (evidence only; not authoritative):
- `mods/mod-swooper-maps/src/domain/morphology/`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/`

Canonical Morphology meaning (domain-only; may conflict with newer workflow locks — record conflicts in Phase 0.5):
- `docs/system/libs/mapgen/morphology.md`
