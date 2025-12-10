# Deferrals

> Intentionally deferred work and technical debt.

---

## Format

Each deferral follows this structure:

```
## DEF-XXX: Title

**Deferred:** YYYY-MM-DD
**Trigger:** When should this be revisited?
**Context:** Why was this deferred?
**Scope:** What work is involved?
**Impact:** What are we living with?
```

---

## Active Deferrals

## DEF-001: Engine Elevation vs. Physics Heightfield Alignment

**Deferred:** 2025-12-08
**Trigger:** Next major mapgen engine refactor or post–TS-migration remediation hardening
**Context:** The Civ7 engine derives elevation internally via `TerrainBuilder.buildElevation()` using its own fractal fields and terrain tags. Our plate/physics `WorldModel` maintains a richer heightfield that cannot be pushed 1:1 into the engine (no `setElevation` API). During TS migration remediation we adopted a conservative hybrid model: physics drives macro structure; Civ fractals + `buildElevation()` provide micro-variation.
**Scope:** 
- Explore a physics-first pipeline that maps our height buckets directly to terrain (land/ocean/mountain/hill) with minimal or no use of engine fractals, then calls `buildElevation()` once.
- Alternatively, more tightly couple fractal usage to our heightfield (e.g., derive fractal thresholds/grain from physics statistics) while keeping the adapter boundary clean.
- Compare aesthetics, performance, and complexity against the current hybrid approach; update contracts/docs if we standardize on a new pattern.
**Impact:** 
- Today, engine elevation and cliffs remain a lossy derivative of our terrain layout and engine-side fractals; our internal heightfield is used for physics/story only.
- There is conceptual divergence between “true” physics elevation and what the player sees in-game.
- Addressing this will likely require coordinated changes across `@swooper/mapgen-core`, the Civ7 adapter, and docs, so we are explicitly deferring it beyond the current remediation milestone.

---

## Resolved Deferrals

*Move resolved deferrals here with resolution notes.*
