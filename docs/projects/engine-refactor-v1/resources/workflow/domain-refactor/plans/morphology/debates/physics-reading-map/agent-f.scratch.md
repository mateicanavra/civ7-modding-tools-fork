# Scratchpad — Agent F (debate: may Physics read `artifact:map.*` / `effect:map.*`?)

Goal: stress-test the “Physics never reads map/effects” posture, with emphasis on author DX, drift resistance, and implementable domain models (no hidden coupling).

This is intentionally contrarian: it argues for a *simpler, more robust* rule than “ban Physics from `effect:map.*` entirely”, while still keeping `artifact:map.*` clean.

---

## 0) Grounding: what reality already tells us

The codebase already contains “physics-ish stages” that:
- **read** adapter state (`isWater`, `getTerrainType`) and/or
- **perform engine-side materializations** (`buildElevation`, `stampContinents`, `modelRivers`, `validateAndFixTerrain`, etc.).

Concrete evidence (current recipe, not just docs):
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts` calls:
  - `recalculateAreas()` → `buildElevation()` → `recalculateAreas()` → `stampContinents()`,
  - then `syncHeightfield(context)` and proceeds using engine-derived fields.
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`:
  - reads `context.adapter.isWater/getTerrainType` (currently for stats),
  - then calls `modelRivers(...)`, `validateAndFixTerrain()`, `syncHeightfield(context)`, `defineNamedRivers()`.
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`:
  - applies base terrain, then calls `validateAndFixTerrain()` → `recalculateAreas()` → `stampContinents()`.

So the “pure physics never depends on engine state” posture is *not* yet true in practice; banning Physics from *declaring* any dependency on map/materialization effects risks making this coupling **implicit** and therefore harder to track or refactor.

---

## 1) The author DX pain point is real: “we don’t want rabbit holes”

Authors want an easy rule like:
- “If you need tile projections, go to map.”

They also need:
- a way to **guarantee engine materializations** (e.g. elevation/areas/continents) before downstream steps run,
- without smuggling adapter ordering constraints as “tribal knowledge”.

If we keep “Physics never reads `effect:map.*`”, we still have to answer:
- How do we *name* and *enforce* those ordering requirements when a step touches adapter state anyway?

If the answer is “don’t; just keep calling adapter helpers wherever”, that’s the drift path.

---

## 2) Contrarian hypothesis: `effect:map.*` is the *least-bad* way to make implicit coupling explicit

### Claim
Allowing Physics to **require** `effect:map.*Plotted` (as ordering gates) can be benign *if and only if* we lock a small, stable effect taxonomy and treat these effects as “engine materialization boundaries”, not as semantic inputs.

This can be strictly *less* coupled than the current state, because it replaces:
- hidden reliance on “some earlier step probably called `buildElevation()`”
with:
- explicit prerequisites like `requires: [effect:map.elevationPlotted]`.

### The catch (important)
This is not *purely* ordering-only in the philosophical sense:
- A `Plotted` effect name still carries semantics (“what was stamped”, and therefore what engine state exists).
- Requiring it means the requiring step implicitly assumes that the corresponding *engine surface* exists and is stable enough to read.

So allowing Physics to require `effect:map.*` is only “benign” if we **treat the semantics of the effect as part of the stable contract**, and we keep those semantics narrowly defined as “engine materialization happened” (not “a particular projection algorithm ran”).

---

## 3) Why `artifact:map.*` is still a hard “no” for Physics

Even if we relax on effects, Physics reading `artifact:map.*` is qualitatively worse:
- `artifact:map.*` is *Gameplay-owned projection intent*; it is the layer most likely to evolve for gameplay needs (naming, slots, debug surfaces, consumer convenience).
- If Physics consumes those projections, we create **semantic backfeeding**: Physics truth now depends on Gameplay’s chosen projection interface.
- This makes cycles easy to create accidentally: Physics → Gameplay projection → Physics “reads projection” → Gameplay stamping.

This breaks the “easy rule” authors want: if Physics can read map projections, authors will do it, and the boundary will rot quickly.

So: keep “if you need tile projections (map-facing), go to map” as a clean, enforceable rule.

---

## 4) Recommendation: mixed rule set (explicit, minimal, anti-rot)

### 4.1 The rule set

1) **Physics MUST NOT read `artifact:map.*`** (no exceptions).

2) **Physics MAY require `effect:map.*Plotted` only as a gating dependency**, and only when the step is (already) engine-coupled in practice:
   - it reads adapter state (`context.adapter.*` read APIs), and/or
   - it depends on engine-side derived materializations that cannot be expressed as physics truth yet (e.g. current hybrid reliance on `buildElevation()`).

3) **No ad-hoc effect names**: Physics may only require effects that are enumerated in the canonical Phase 2 effect taxonomy (i.e. the set defined in `PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`).
   - If you need a new “materialization happened” gate, it gets added *there* first, with evidence and meaning.

4) **One-way door guardrail (prevents cycles / semantic backfeeding):**
   - Any step that `requires` *any* `effect:map.*` is considered “post-materialization lane”.
   - Outputs from the post-materialization lane MUST NOT be prerequisites for any step that *provides* `effect:map.*` (or any earlier physics truth needed to compute `artifact:map.*` intent).
   - Translation: once you depend on map materialization, you’re downstream forever.

This is a small rule set that authors can memorize and apply without rabbit holes.

### 4.2 Why this won’t rot (explicitly)

- It keeps the **data boundary** clean (`artifact:map.*` remains purely Gameplay projection intent; Physics never consumes it).
- It confines effect usage to a **small, audited list**, preventing “effect sprawl” as a new coupling vector.
- The “one-way door” rule blocks the failure mode where Physics starts treating effects as semantic inputs that then shape upstream truth.

---

## 5) How this addresses the user’s pain points

- “This is getting too complicated; we don’t want rabbit holes.”
  - Mixed rule is simpler than trying to fully purify current pipelines immediately.
  - It gives a crisp dependency declaration mechanism *without forcing* a big migration of all engine-coupled steps today.

- “Want an easy rule like ‘if you need tile projections, go to map.’”
  - Preserved as a hard rule: `artifact:map.*` is never a Physics input.

- “Need to guarantee certain engine materializations for downstream steps.”
  - `effect:map.*Plotted` becomes the canonical contract for those guarantees — and Physics is allowed to depend on that contract when it is already implicitly doing so via adapter reads/calls.

---

## 6) Explicit answer: is `effect:map.*` “ordering-only” or “semantic coupling”?

It’s both:
- **Ordering-only in mechanism** (boolean tag gating execution),
- **Semantic coupling in meaning** (the tag encodes what engine state is assumed to exist).

The recommendation above makes that coupling **intentional, documented, and bounded**, instead of the current state where the coupling exists but is implicit and untracked.

If we keep the strict “Physics never reads effects” rule *while the pipeline remains engine-coupled*, we don’t eliminate coupling — we just hide it, which is exactly how drift happens.

