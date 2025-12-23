# Map Generation Domains

Map generation is organized into domain layers that progressively refine the world from physical substrate to gameplay concepts.

## Foundation

- Builds a region mesh, crust/material mask, tectonic plates, and derived force fields (uplift, rifting, volcanism).

## Morphology

- Converts tectonic forces and history into elevation and land/sea.
- Applies a geomorphic erosion cycle (incision, diffusion, deposition) to produce playable landforms.

## Hydrology & Climate

- Derives gameplay-oriented climate signals (rainfall/moisture and temperature bands).
- Produces river/lake signals that downstream systems can consume without depending on engine internals.

## Ecology

- Interprets geology + climate into soils, biomes, resources, and features.
- Separates pedology (soil) from biogeography (biomes).

## Narrative

- Cross-cutting layer that observes the physical world and annotates it with meaning (regions, motifs) and can inject bespoke features.
- Supports naming and higher-level thematic constraints.

## Placement

- Uses the produced world and narrative/ecology signals to place civilizations and other starting entities fairly and flavorfully.
