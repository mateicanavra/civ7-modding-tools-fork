# Agent scratch — Structure/Composition/Clarity

## Scope
- Review Phase 2 canonical docs + nearby entrypoints for readability/clarity.
- Recommend cleanup/archival/moves/deletes to reduce Phase 3 confusion.

---

## 1) What a new Phase 3 implementer should read first (exact ordered list)
1. `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
2. `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
3. `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`
4. `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md` (entrypoint/overview; canonical truth is the `spec/` trio)
5. `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-current-state-gpt.md` (legacy evidence only; useful when mapping Phase 3 deltas to real code)
6. `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-greenfield-gpt.md` (optional background; do not treat as contracts)
7. `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-lockdown-plan.md` (process-only; optional)

## 2) Confusing / duplicate / legacy docs (each with a concrete action)

### Broken / misleading entrypoints and prompts
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/MORPHOLOGY.md`
  - Problem: “Phase artifacts” table links to non-existent `spike-morphology-{greenfield|current-state|modeling}.md` and claims “not started”.
  - Action: update to a minimal index that points to the Phase 2 `spec/` trio + the `*-gpt.md` spikes (or move to archive + add a “LEGACY / prior-art template” banner at top).

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/MORPHOLOGY-NON-IMPLEMENTATION.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/prompts/MORPHOLOGY-IMPLEMENTATION.md`
  - Problem: both prompt readers to use `plans/morphology/spike-morphology-*.md` deliverables that do not exist in this repo state.
  - Action: pick one:
    - Option A (prefer): create thin wrapper “redirect” docs at the expected canonical paths (`spike-morphology-greenfield.md`, `spike-morphology-current-state.md`, `spike-morphology-modeling.md`) that point to the real `*-gpt.md` docs + `spec/` trio.
    - Option B: update both prompts to point to `spike-morphology-*-gpt.md` and explicitly state the `spec/` trio is canonical for Phase 2.
  - Note: coordinate with orchestrator before choosing; this affects other agents’ expectations and any future automation.

### “Looks canonical but is not” (drift risk; needs banners or moves)
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md`
  - Problem: it is intended as an overview/entrypoint, but it is still a large monolith containing content that can conflict with the split `spec/` files.
  - Action: convert into a short “Phase 2 index/overview” doc that *only* (a) links to the three canonical spec files, and (b) provides navigation + legacy disposition pointers, with a strong “do not implement from this monolith” banner.
  - Note: this was explicitly planned in `spike-morphology-modeling-gpt-lockdown-plan.md` (monolith cleanup deferred to orchestrator).

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-addendum-full.md`
  - Problem: “context packet / what’s wrong” doc can be misread as spec (lots of “must” language).
  - Action: move under `debates/phase2-lockdown/` (or `_archive/v2/`) and add a top banner: “LEGACY CONTEXT PACKET; superseded by `spec/PHASE-2-*`.”

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-addendum-braided-map-projection-draft.md`
  - Problem: reads like an alternate spec (verbatim snapshot + placeholder file tree) and is easy to accidentally treat as canonical.
  - Action: move under `debates/map-intent-vs-realized/` (or `_archive/v2/`) and add a top banner: “DRAFT / VERBATIM SNAPSHOT; canonical is `spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`.”

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt-lockdown-plan.md`
  - Problem: process doc in the same directory as canonical specs; readers may treat it as Phase 2 requirements.
  - Action: move under `debates/phase2-lockdown/` *or* add an explicit top banner: “PROCESS/COORDINATION ONLY; not part of the Phase 2 canonical spec; do not implement from this.”

### Legacy spikes that should not be mistaken for target-state guidance
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-current-state-gpt.md`
  - Problem: contains legacy “Narrative braided between Morphology stages” description; also claims Phase 0.5 spike “not present”.
  - Action: add a top banner: “PHASE 1 EVIDENCE ONLY; legacy wiring described here is non-canonical under Phase 2”; fix the “not present” reference to point to `spike-morphology-greenfield-gpt.md`.

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-greenfield-gpt.md`
  - Problem: long doc, heavy “ideal world” framing; easy to misread as target contract shape.
  - Action: add a top banner: “PHASE 0.5 PRE-WORK ONLY; not contract-locking; do not use as Phase 2/3 contract source.”

### Archives that still leak into search / link trails
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/_archive/spike-morphology-{greenfield|current-state|modeling}.md`
  - Problem: these are placeholder “TBD” stubs, but `MORPHOLOGY.md` and the workflow prompts still reference their *non-archive* paths, so readers go hunting and may land here by mistake.
  - Action: keep in `_archive/` but add a top banner: “TEMPLATE STUB (TBD) / not used”; fix the entrypoints/prompts so no one expects these to exist at the root path.

- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/_archive/v2/spike-morphology-modeling-gpt.md` (and other `_archive/v2/*morphology*`)
  - Problem: older versions of “gpt” spikes; easy to accidentally cite/implement from when searching.
  - Action: ensure each archived doc has a loud “ARCHIVED / SUPERSEDED BY …” banner at top (or rename with a `LEGACY-` prefix).

- `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-morphology-vertical-domain-refactor.md`
  - Problem: references older “resources/spike/spike-morphology-*.md” paths that do not exist; can confuse Phase 3 implementers if found via search.
  - Action: add an “ARCHIVED / outdated paths” banner at top (or add a short “Do not use; see plans/morphology/…” pointer).

## 3) Proposed navigation tweaks (index links, headings)
- Add one stable “front door” doc for Phase 2 Morphology:
  - Prefer: make `spike-morphology-modeling-gpt.md` the front door *as an index/overview* (per lockdown plan), with an explicit “Read order” section linking to the `spec/PHASE-2-*` trio.
  - Alternative: repurpose `MORPHOLOGY.md` into that front door and keep `spike-morphology-modeling-gpt.md` as archival context (discouraged: more link churn).

- In each `spec/PHASE-2-*` file: add “Read next” links at top and bottom (core → contracts → stamping), so readers can follow a single path without bouncing through debates/addenda.

- Add a small `debates/README.md` (or a one-paragraph banner at top of each debates folder) explaining:
  - debates are scratchpads / decision records,
  - not canonical spec,
  - “if something conflicts with `spec/`, `spec/` wins”.
  - (Escalate to orchestrator before adding files; other agents may be editing debates directories.)

## 4) Risk of drift items (where duplication exists)
- Monolith vs split specs: `spike-morphology-modeling-gpt.md` still contains full contract-like material alongside the canonical `spec/` trio.
- Addenda vs split specs: both addenda contain “must” language and alternate framing; without banners/moves, they can be mistaken for canonical.
- Workflow prompts vs reality: `MORPHOLOGY-{NON-IMPLEMENTATION|IMPLEMENTATION}.md` still point to missing `spike-morphology-*.md` paths, so future agents may reintroduce wrong docs at those paths (or assume work is missing).
- System doc vs Phase 2 contracts: `docs/system/libs/mapgen/morphology.md` describes “routing” as a core responsibility/output; Phase 2 Contracts currently model routing as internal-only (explicitly disallowed as a cross-domain contract). Without an alignment note, implementers may try to re-export routing.

## 5) Open questions to escalate to orchestrator before changing structure
- Do we want to align filenames with workflow prompts by creating/renaming to `spike-morphology-*.md`, or update prompts to the existing `*-gpt.md` names?
- Should `spike-morphology-modeling-gpt-lockdown-plan.md` and the two addenda live under `debates/` (process/history) rather than beside canonical specs?
- Is `MORPHOLOGY.md` intended to be a “live index” or should it be archived now that Phase 2 specs exist?
- Should we update `docs/system/libs/mapgen/morphology.md` with a Phase 2 alignment note (routing as internal-only) to avoid Phase 3 confusion, or does cohesion agent intend to handle that separately?

---

## Quick addendum (high-impact readability traps)

- **`artifact:` vs `artifacts.` namespace drift**
  - Problem: some older/draft docs (notably the braided addendum) use `artifacts.map.*` / `artifacts.morphology.*` wording, while Phase 2 specs consistently use `artifact:map.*` / `artifact:morphology.*` tags. This is an easy footgun for Phase 3 implementers and search.
  - Action: add a one-line banner/note in any legacy/draft doc that uses `artifacts.*` to state “canonical tags are `artifact:<ns>.<name>`; this doc’s wording is legacy”.

- **`docs/system/libs/mapgen/morphology.md` “routing outputs” vs Phase 2 Contracts**
  - Problem: the system doc currently reads as canonical domain outputs include routing buffers, while `spec/PHASE-2-CONTRACTS.md` explicitly disallows routing as a cross-domain contract (internal-only).
  - Action: add a short Phase 2 alignment note in `docs/system/libs/mapgen/morphology.md` (or a top banner) so Phase 3 implementers don’t re-expose routing as a stable artifact “because the canonical system doc said so”.

- **Debates directory misread as authoritative**
  - Problem: `debates/**` contains “agent scratchpads” with strong language and proposed steps; easy to misread as requirements during implementation.
  - Action: add a single `debates/README.md` or a top banner in each debates subfolder (“scratchpads; not canonical; if conflict, `spec/` wins”). Coordinate first; other agents may also touch debates.
