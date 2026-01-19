## Ecology context packet (domain-only, non-prescriptive)

This document is supporting context and prior art. It is **not** canonical and must not override:

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/ECOLOGY-NON-IMPLEMENTATION.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/*`

Use this packet to:
- quickly orient in Ecology’s likely boundaries, inputs, and outputs
- identify common traps (especially “projection-as-truth” and “smuggled bias”)
- seed Phase 0.5 questions without converging early on designs

### 0) Project-owner direction (canonical posture)

This packet is subordinate to the project-owner direction already encoded in the Ecology prompt and workflow docs. In particular:

- Treat Ecology as **greenfield**: run the full Phase 0.5 → 3 workflow; no shortcuts or phase compression.
- Keep Ecology **physics-first and algorithm-deep**: model feature-by-feature with explicit inputs → reasoning → outputs.
- Treat Ecology as a **physics → gameplay bridge**:
  - plan the Ecology ↔ Gameplay boundary explicitly
  - allow “Gameplay look-ahead” during planning without turning it into an implementation dependency
- Treat narrative/story overlays as **explicitly banned** for this refactor phase; do not model or depend on them.
- Treat contracts as first-class:
  - prefer upstream, domain-owned artifacts over projections/adapters
  - decide “public vs internal” outputs intentionally and document them
- Treat research against official Civ7 resources as a **prime directive** during Phase 0.5 / Phase 2 (when available).

### 1) What Ecology is (scope)

Ecology turns upstream “physics/world state” signals (climate + hydrology + morphology + soil/fertility proxies) into ecological classifications and intents that later become authored/gameplay-facing world dressing (biomes, vegetation structure/density, feature intent/plans).

Ecology should be the first place where the map transitions from “fields” to “meaningful ecological categories,” but it must remain deterministic and contract-driven.

### 2) What Ecology is not (explicit boundaries)

- Not a narrative/story system (no motifs/corridors/rifts as required inputs to core ecological truth).
- Not engine projection logic (no dependency on engine adjacency scans / engine tile queries as “ecology truth”; those are projection-only).
- Not a catch-all tuning bag for downstream art/gameplay convenience. If a system wants to bias outcomes, that bias should be expressed as an explicit contract (Gameplay-owned where appropriate), not smuggled into Ecology as hidden multipliers.

### 3) Upstream inputs (categories, not prescriptions)

Ecology should expect to consume upstream signals in categories like:

- Climate signals: temperature-like fields, moisture/precipitation-like fields, seasonality-like signals (if present), and/or diagnostics that summarize them.
- Hydrology signals: river/lake presence/strength classes, discharge-like measures, wetness indices, or other hydrology-published signals intended for downstream use.
- Morphology signals: elevation, slope/roughness, coastal proximity, orographic indicators, latitude.
- Pedology/soil proxies (if present): fertility-like fields, drainage/soil moisture capacity proxies, substrate/rockiness.

Key framing: Ecology should consume published, physics-derived artifacts from upstream domains, not re-derive them from adapters or narrative overlays.

### 4) Primary outputs (contract “shape”)

Ecology outputs typically fall into two buckets:

- Classification outputs (semantic maps):
  - biome-like categorical field(s)
  - vegetation structure/density classes
  - other ecological regime classes (as needed)
- Intent outputs (downstream-driving plans):
  - feature/vegetation placement intents (not necessarily final placements)
  - density/priority fields that inform later placement/projection

These should be defined as explicit artifacts with schemas: what they mean, what downstream can rely on, and what is explicitly non-contract/internal.

### 5) Downstream consumers (what can break if Ecology drifts)

Before refactoring, treat these as likely consumers to inventory, not assumptions:

- Placement / resource systems: may use biome/ecology classes to gate resources, spawns, wonders, yields, etc.
- Feature/vegetation projection: translates intents/classes into engine features/decoration.
- Gameplay-facing balance layers: may read biome distributions, fertility proxies, or “habitable” masks.
- Debug/diagnostics tooling: expects ecology artifacts to be interpretable and stable enough to explain.

Core requirement: for each output artifact, decide whether it is public contract (supported consumption) vs internal buffer. Consumers should only depend on the former.

### 6) Contract discipline: knobs vs advanced config (Ecology framing)

Ecology will likely expose both:

- Advanced config: typed/defaulted baseline configuration for ecology steps/ops.
- Knobs: higher-level transforms that adjust multiple related configuration values together.

Contract framing (non-negotiable semantics carried forward from prior refactors):

- Advanced config is the baseline; knobs apply after as deterministic transforms.
- Avoid “presence-based precedence” or “compare-to-default gating” semantics.
- Do not hide defaults/multipliers in runtime code; either name+document constants or expose as explicit config.

### 7) Determinism + purity expectations (domain-level, not implementation)

- Ecology outputs should be deterministic for a given seed + upstream artifacts + config.
- If randomness is needed, it should be seeded data-in, not runtime handles crossing boundaries.
- Ecology should not require mutable global state or adapter queries that can vary by environment.

### 8) Projection vs truth (Ecology-specific warning)

Ecology is especially vulnerable to “easy signals”:

- Engine adjacency (“near rivers”) and narrative overlays are tempting shortcuts for moisture/biome tweaks.
- Treat those as projection or downstream thumb-on-scale unless explicitly promoted into physics-derived upstream artifacts.

If a “near river” effect is desired, the input should come from hydrology-published signals (e.g., river class/strength) rather than engine adjacency or narrative corridor tags.

### 9) Tuning constants inventory (what to explicitly look for early)

Expect Ecology to contain:

- thresholds (categorical boundaries)
- biases (shifts in classification)
- bonuses (local adjustments, e.g., riparian/coastal/orographic)
- weights (blends across signals)

Early refactor requirement: inventory these and decide per item:

- internal named constant + documented rationale, or
- explicit advanced config field (if it’s a legitimate author/gameplay knob)

What to avoid: magic numbers embedded in normalize/run with unclear scope and undocumented downstream impact.

### 10) Open questions Phase 0.5 should answer (without locking designs)

- What are the ecology public artifacts and their meanings?
- Which upstream artifacts are required vs optional?
- Which downstream consumers exist today, and which should be supported contracts?
- Which adjustments are “physics-derived ecology truth” vs “gameplay thumb-on-scale” (and therefore belong downstream)?
