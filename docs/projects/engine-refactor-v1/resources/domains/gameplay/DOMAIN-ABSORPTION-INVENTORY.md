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
```

### Narrative (Likely Partially Absorb)

```yaml
from:
  - path: mods/mod-swooper-maps/src/domain/narrative
notes:
  - "Overlay machinery (keys/registry), tagging utilities, and story motif producers live here today."
  - "Needs sorting: what is truly gameplay vs what is physics-domain policy expressed as overlays."
```

## Decision Points (Draft)

- Which narrative “rules/policies” should remain physics-domain-local (imported as policies into ops/steps) versus becoming Gameplay-owned ops?
- What becomes the canonical Gameplay public surface (ops, schemas, overlay types), and what stays as internal utilities?

