# Gameplay Domain — Domain Code Absorption Inventory (Draft)

## Goal

Enumerate what would be absorbed into a new Gameplay domain surface from existing repo “domains”, and what should remain physics-domain policy/rules.

## Primary Sources

- `docs/projects/engine-refactor-v1/resources/spike/spike-gameplay-domain-refactor-plan-notes.md`

## Absorption Candidates (Draft)

### Placement (Likely Absorb)

```yaml
from:
  - path: mods/mod-swooper-maps/src/domain/placement
notes:
  - "Ops are already domain-shaped planning units used by the placement stage."
  - "This is the closest thing we have today to a Gameplay-owned 'planning surface' (plans-in, outputs-out)."
```

**Inventory (current files):**

```yaml
files:
  - path: mods/mod-swooper-maps/src/domain/placement/index.ts
    notes: Domain entrypoint (defineDomain)
  - path: mods/mod-swooper-maps/src/domain/placement/config.ts
    notes: Domain config surface
  - path: mods/mod-swooper-maps/src/domain/placement/ops/contracts.ts
    notes: Op contracts (public contract surface)
  - path: mods/mod-swooper-maps/src/domain/placement/ops/index.ts
    notes: Op implementations
  - path: mods/mod-swooper-maps/src/domain/placement/ops/plan-starts/index.ts
  - path: mods/mod-swooper-maps/src/domain/placement/ops/plan-wonders/index.ts
  - path: mods/mod-swooper-maps/src/domain/placement/ops/plan-floodplains/index.ts
```

### Narrative (Likely Partially Absorb)

```yaml
from:
  - path: mods/mod-swooper-maps/src/domain/narrative
notes:
  - "Overlay machinery (keys/registry), tagging utilities, and story motif producers live here today."
  - "Needs sorting: what is truly gameplay vs what is physics-domain policy expressed as overlays."
  - "The narrative domain has a defineDomain entrypoint but currently has no modeled ops; stage steps call into these modules directly."
```

**Inventory (current sub-areas):**

```yaml
areas:
  - area: overlays
    paths:
      - mods/mod-swooper-maps/src/domain/narrative/overlays/keys.ts
      - mods/mod-swooper-maps/src/domain/narrative/overlays/normalize.ts
      - mods/mod-swooper-maps/src/domain/narrative/overlays/registry.ts
    notes: "The overlay contract surface: keys + normalization + publication helpers."
  - area: tagging (motif producers)
    paths:
      - mods/mod-swooper-maps/src/domain/narrative/tagging/hotspots.ts
      - mods/mod-swooper-maps/src/domain/narrative/tagging/margins.ts
      - mods/mod-swooper-maps/src/domain/narrative/tagging/rifts.ts
    notes: "Motif extraction utilities used by story steps."
  - area: corridors
    paths:
      - mods/mod-swooper-maps/src/domain/narrative/corridors/*
    notes: "Corridor construction and post-processing used by story corridor steps."
  - area: orogeny
    paths:
      - mods/mod-swooper-maps/src/domain/narrative/orogeny/*
    notes: "Orogeny motif/overlay computation; consumes Foundation dynamics/plates."
  - area: paleo (ambiguous ownership)
    paths:
      - mods/mod-swooper-maps/src/domain/narrative/paleo/rainfall-artifacts.ts
    notes: "Story 'paleo hydrology' currently mutates climate buffers; likely needs re-homing during proper modeling."
  - area: utils
    paths:
      - mods/mod-swooper-maps/src/domain/narrative/utils/*
    notes: "Low-level helpers (rng, adjacency, water); should likely be internal utilities rather than a public domain surface."
  - area: placeholder ops surface
    paths:
      - mods/mod-swooper-maps/src/domain/narrative/ops/contracts.ts
      - mods/mod-swooper-maps/src/domain/narrative/ops/index.ts
    notes: "Currently empty; indicates narrative has not been refactored into atomic ops yet."
```

## Decision Points (Draft)

- Which narrative “rules/policies” should remain physics-domain-local (imported as policies into ops/steps) versus becoming Gameplay-owned ops?
- What becomes the canonical Gameplay public surface (ops, schemas, overlay types), and what stays as internal utilities?
- What is the intended fate of story modules that directly mutate physics buffers (e.g., paleo rainfall artifacts)?
  - Option: keep as a gameplay-owned step with explicit buffer write contract.
  - Option: re-home into physics (Hydrology/Climate) and have gameplay only publish overlays.
