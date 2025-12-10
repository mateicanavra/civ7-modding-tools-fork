---
id: M2-stable-engine-slice-review
milestone: M2-stable-engine-slice
title: "M2: Stable Engine Slice – Aggregate Review"
status: draft
reviewer: AI agent (Codex CLI)
---

# M2: Stable Engine Slice – Aggregate Review (Running Log)

This running log captures task-level reviews for milestone M2. Entries focus on
correctness, completeness, and forward-looking risks for the engine refactor.

---

## CIV-27 – MapGenConfig TypeBox Schema

**Quick Take**  
Mostly satisfied: schema + loader + defaults are in place and type-safe, but public/internal surface separation and a few metadata/validation edges need a follow-up sweep.

**Intent & Assumptions**  
- Establish `MapGenConfigSchema` as the canonical TypeBox schema with inferred `MapGenConfig`.  
- Apply defaults/normalization via loader helpers; keep legacy nesting/back-compat.  
- Mark internal-only controls for later hiding/removal without blocking this milestone.

**What’s Strong**  
- Broad coverage of landmass, foundation, climate, story, corridors, ocean separation, etc., with sensible defaults and ranges.  
- Loader (`parseConfig`/`safeParseConfig`) clones→defaults→converts→cleans and surfaces structured errors; `getDefaultConfig`/`getJsonSchema` exported.  
- Public exports wired in `config/index.ts`; type checks green across the repo.  
- Tests cover defaults, type/range failures, and safe parse paths.

**High-Leverage Issues**  
- Public vs. internal knobs remain co-mingled. `[tag]` markers flag fields that likely belong behind an internal-only contract (stageConfig/manifest, foundation internals, ocean separation alias), but nothing enforces the boundary yet.  
- Optional-wrapper metadata was stripped to satisfy TypeBox v1 signatures; reattach descriptions/defaults at the property schema level to avoid losing docs/JSON Schema detail.  
- `UnknownRecord` escape hatches keep validation loose (notably climate knobs); narrowing these is important to maintain config hygiene.

**Fit Within the Milestone**  
Delivers the schema/loader backbone needed for M2’s config hygiene goals; defers public/internal split and tightening of escape hatches to later tasks.

**Recommended Next Moves**  
1. Reattach descriptions/defaults where `Type.Optional` options were dropped in the v1 migration.  
2. Enforce/partition public vs. internal fields identified by `[tag]` (e.g., internal-only manifest/toggle plumbing).  
3. Gradually replace `UnknownRecord` sections with typed shapes (start with climate bands/blend/orographic blocks).  
4. Add a small guard to keep public JSON Schema aligned with the intended surface (exclude or flag internal fields).

**Follow-ups / Checklist**  
- [x] TypeBox v1 compatibility and typechecks fixed (dependency bumped; loader/schema updated).  
- [ ] Public/internal boundary enforced or documented beyond `[tag]` markers.  
- [ ] Reattach property-level descriptions/defaults removed from `Type.Optional` wrappers.  
- [ ] Narrow `UnknownRecord` escape hatches to typed schemas where semantics are known.  
- [ ] Add public-schema guard (exclude/internal-flag) to prevent leaking internal knobs.

---
