---
id: LOCAL-TBD-M11-U12
title: "[M11/U12] Make polar caps emergent plates (no latitude override; no thin polar belts)"
state: planned
priority: 1
estimate: 8
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [foundation, polar, realism, contracts]
parent: LOCAL-TBD-M11-U15
children: []
blocked_by: [LOCAL-TBD-M11-U11]
blocked: []
related_to: [M11-U00, M11-U06, LOCAL-TBD-M11-U10, LOCAL-TBD-M11-U11, LOCAL-TBD-M11-U14]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Make polar rims emerge from real polar cap plates + kinematics (tangential motion, optional microplates) and remove the current polar regime + projection hacks that create thin one-tile belts.

## Deliverables
- Shared slice invariants: see `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U15-foundation-realism-execution-spine.md` (`FND-INV-*`).
- Implement a polar plate policy in `foundation/compute-plate-graph` (post-U10 cutover) so polar boundary geometry/topology is explicit and testable:
  - North + south cap plates are always present and contiguous.
  - Cap kinematics are tangential by default (policy-driven, not latitude-driven regime injection).
  - Optional polar microplates are enabled only when the map is large enough (compile-time normalization / policy rules), with sliver prevention.
- Make polar participation legible in artifacts:
  - Add an explicit plate role marker (e.g. `FoundationPlate.role: "polarCap" | "polarMicroplate" | "tectonic"`) so tests and downstream consumers don’t infer “polar” from latitude heuristics.
- Coordination boundary (avoid parallel edits / conflicting ownership):
  - **U11 owns** removal of polar regime injection and projection hacks (`compute-tectonics`, `project-plates.ts`) as part of the tectonics/history cutover.
  - U12 must not introduce any new latitude/`y`-band regime forcing; it should be satisfiable purely via plate policy + kinematics.

## Acceptance Criteria
- Polar cap plates are first-class and policy-driven:
  - `foundation/compute-plate-graph` emits at least one cap plate per hemisphere (plus microplates when enabled) and assigns tangential motion per the policy described in this issue.
  - Cap plates are identifiable without inference (e.g. via `FoundationPlate.role`).
- Polar partition quality guardrails hold (validated in tests):
  - Cap plates are contiguous and exceed a minimum area threshold for the chosen map size.
  - Microplates (when enabled) do not create one-tile/two-tile slivers.
- System integration expectation (validated by U11 + U14):
  - There is no latitude override anywhere in the tectonics/projection lane, and polar rims are multi-tile belts (not a one-tile ring).

## Testing / Verification
- Automated:
  - `bun run test`
  - `bun run --cwd mods/mod-swooper-maps test`
- Targeted:
  - Add/update tests that validate polar plate policy + kinematics (cap contiguity, role marker, conditional microplates).
- Manual sanity (fast):
  - Run the standard recipe with a fixed seed and inspect the `foundation.plates.ascii.boundaryType` trace output for polar rim activity (belt width guardrails land via U11 + U14).

## Dependencies / Notes
- Related: `docs/projects/engine-refactor-v1/issues/M11-U00-physics-first-realism-upgrade-plan.md`
- Spike references:
  - `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-realism-gaps.md`
  - `docs/projects/engine-refactor-v1/resources/spike/foundation-realism/polar-caps-as-plates.md`
- Key current-state facts to preserve in implementation:
  - Polar regime injection exists today in `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts` and is deleted by U11’s cutover.
  - “One-tile belts” root cause exists today in `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts` (`isPolarEdgeTile` + `regimeMaxDistance = min(2, ...)`) and is removed by U11’s cutover.
  - U12’s scope is the **plate policy** (tangential polar motion + conditional microplates) and artifact legibility (`FoundationPlate.role`), not tectonics/projection hacks.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Posture (hard constraints for this slice)
- No shims / dual paths (U12-owned): polar caps are produced by a single plate policy (no fallback “infer polar by latitude” logic).
- No latitude override (U12-owned): plate identities and plate kinematics are not forced by `y`/latitude heuristics.
- Driver knobs only: new behavior is controlled via plate policy + kinematic parameters (not ad-hoc outcome clamps).

### Invariants (U12-owned; plate policy only)
These invariants are the acceptance spine for the **polar plate policy** portion of the work (tectonics/projection belt width is validated by U11 + U14).

- **POLAR-PLATES-I1 — Cap plates exist and are contiguous:** each hemisphere has a contiguous cap region with a stable plate ID (or set of IDs if microplates are enabled).
- **POLAR-PLATES-I2 — Tangential motion baseline:** polar cap plates have a tangential motion baseline (policy-driven); no latitude-based regime forcing exists in U12-owned code.
- **POLAR-PLATES-I3 — No sliver microplates:** when microplates are enabled, they satisfy a minimum area threshold and do not create one-/two-tile fragments.

### 3-layer pass

#### 1) High level — what “good polar tectonics” feels like
- Polar rims read as plate boundaries with believable breadth: no uniform one-tile rings; belts are multi-tile, segmented, and downstream-friendly (ridges/basins can emerge).
- All regimes are possible at polar boundaries: transform-dominant is fine, but convergence/divergence must be reachable without hacks.
- Polar boundaries “make sense” relative to motion: shear when motion is tangential; compression/extension where normal components exist; no latitude-based forcing.

#### 2) Mid level — modeling approach (policy + kinematics + strain + projection)
- **Polar plates policy (partition/topology):**
  - Always include at least one plate per pole (north/south) as a first-class plate identity in `foundation/compute-plate-graph`.
  - Optional polar microplates are enabled only when the map is large enough (derive from normalized plate count / map area), to avoid micro-slivers on small maps.
- **Kinematics policy (tangential recommendation):**
  - Assign polar plates a tangential motion baseline (dominant “around the pole”) so a transform-capable rim is a natural default.
  - Preserve “driver posture”: tangential speed and microplate count are authored/normalized parameters, not runtime clamps.
- **Segments/topology posture (forward-compatible with U11):**
  - Polar rims must be representable as standard plate-contact segments (cap ↔ subpolar, cap ↔ microplate) with no “polar-only” regime paths.
  - If segment-based tectonics lands in `M11-U11`, this slice should not force a rework: polar plates should appear in the same topology inputs as any other plate.
- **Tectonics/projection posture (U11-owned):**
  - Strain decomposition + belt-width/regime propagation are handled by `M11/U11` (segment-based tectonics + history cutover).

#### 3) Low level — concrete cutover plan (clean slice; no legacy left)
1) **Introduce a polar plate policy in plate graph generation**
   - Extend `foundation/compute-plate-graph` config with a `polarCaps` policy object (cap size, tangential motion baseline, conditional microplates).
   - Implement normalization rules to choose microplate count by map area / normalized plate count (conditional microplates).
   - Ensure polar plates are seeded/assigned so caps are contiguous and meet minimum area thresholds.
2) **Make polar plates explicit for tests/consumers**
   - Extend `FoundationPlateSchema` with `role: "polarCap" | "tectonic"` and populate it deterministically.
3) **Add plate-policy-focused tests**
   - Add/update tests that assert `POLAR-PLATES-I1..I3` without relying on tectonics/projection behavior (owned by U11).

### Contract surface (draft; keep driver-knob posture)
- `foundation/compute-plate-graph` config gains a `polarCaps` policy object (cap size, tangential speed baseline, microplate policy).
- `foundation/compute-plate-graph` output expands with `FoundationPlate.role` (`"polarCap"` | `"tectonic"`).
- Any changes to tectonics/projection contracts (removing polar injection, removing regime caps, adding strain components) are owned by U11.

### Files / artifacts (working set)
```yaml
files:
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/contract.ts
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/plateGraph.contract.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/plateGraph.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts
tests:
  - mods/mod-swooper-maps/test/foundation/m11-polar-plates-policy.test.ts
docs:
  - docs/projects/engine-refactor-v1/resources/spike/foundation-realism/polar-caps-as-plates.md
artifacts:
  - artifact:foundation.plateGraph
```

### Tests to update/add (map to invariants)
- U11 updates existing polar tectonics/projection tests as part of removing injection/hacks:
  - `mods/mod-swooper-maps/test/foundation/m11-polar-boundary-tectonics.test.ts`
  - `mods/mod-swooper-maps/test/foundation/m11-polar-boundary-projection.test.ts`
  - `mods/mod-swooper-maps/test/foundation/m11-projection-boundary-band.test.ts`
- U12 adds/updates plate-policy-focused tests (caps/microplates/role marker), independent of tectonics/projection:
  - `mods/mod-swooper-maps/test/foundation/m11-polar-plates-policy.test.ts`

### Trace
- Branch: `agent-RAMBO-M11-U12-foundation-polar-caps-as-plates`
- PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/710
