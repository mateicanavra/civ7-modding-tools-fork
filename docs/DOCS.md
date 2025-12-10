# Documentation Architecture

> **Canonical specification** for how `docs/` is structured in this repo. This document defines where docs live, how they're named, and how to extend the structure. The pattern is reusable in other codebases.

---

## Quick Start

- **Product context?** → Start with `PRODUCT.md`
- **System architecture?** → Start with `SYSTEM.md`
- **How to work here?** → Start with `PROCESS.md`
- **Current direction?** → Start with `ROADMAP.md`
- **Adding a new doc?** → See [Section 4: Naming & Placement](#4-naming--placement-heuristics)

---

## 1. Goals

- Provide a stable, reusable pattern for `docs/` layout.
- Keep **evergreen canonical docs** distinct from **temporal project docs**.
- Make it easy to discover product, system, workflow, and project docs at a glance.
- Encode importance and scope via **ALL‑CAPS vs lowercase** naming.

This guide defines the target structure for `docs/` in this repo and can be reused as a template in other codebases.

---

## 2. Core Layout

Top-level structure of `docs/`:

```text
docs/
  PRODUCT.md      # Product entry: what this is and why it exists
  SYSTEM.md       # System entry: high-level system overview & map
  PROCESS.md      # Process entry: how we work here
  ROADMAP.md      # Directional entry: milestones and future path
  DOCS.md         # Docs architecture and navigation (this document)

  product/        # Product artifacts and decisions
  system/         # Architecture, testing, security, components
  process/        # Collaboration, process, and workflows
  projects/       # Time-bound work, tied to initiatives
  templates/      # Scaffolds for new docs
  _archive/       # Retired/old docs
```

### Root Gateway Docs

Each root file is a **gateway** into one major concern:

- `PRODUCT.md` — product narrative (what, who, why); links to `product/`.
- `SYSTEM.md` — high-level system overview; links to `system/ARCHITECTURE.md`, `TESTING.md`, `SECURITY.md`, and component docs.
- `PROCESS.md` — overview of collaboration, process, and workflows; links into `process/`.
- `ROADMAP.md` — high-level direction and milestones; links to relevant `projects/`.
- `DOCS.md` — docs architecture, naming rules, and a short “how to use these docs” section.

Listing `docs/` once gives humans and agents a complete view of the canonical entrypoints.

---

## 3. Directories and Their Roles

### 3.1 `product/` — Product Artifacts

Evergreen product-side documents:

```text
docs/product/
  BUGS.md        # Canonical list/summary of known UX/functional issues
  WISHLIST.md    # Canonical backlog of desired capabilities
  PDR.md         # Product Decision Record(s)
```

- These files are canonical at the **product scope**.
- Temporal product work tied to a specific project belongs under `docs/projects/`.

### 3.2 `system/` — System Architecture & Standards

System-wide technical references:

```text
docs/system/
  ARCHITECTURE.md   # Canonical architecture doc (layers, flows, monorepo)
  TESTING.md        # System-wide testing strategy
  SECURITY.md       # Security model/guidelines
  ADR.md            # Architecture Decision Records (decisions made)
  DEFERRALS.md      # Deferred work & tech debt (decisions postponed)

  backend/
    overview.md
    orchestration.md
    schemas.md

  frontend/
    overview.md
    old_architecture.md
```

- `ARCHITECTURE.md`, `TESTING.md`, `SECURITY.md` are canonical, evergreen for the system domain.
- `ADR.md` documents significant architectural decisions that have been made.
- `DEFERRALS.md` tracks intentionally deferred work with trigger conditions.
- Component-specific docs (backend/frontend/…) live under subdirectories, generally lowercase.

### 3.3 `process/` — Collaboration, Process & Workflows

```text
docs/process/
  GRAPHITE.md          # Canonical Graphite workflow & conventions
  LINEAR.md            # Canonical Linear conventions & patterns
  MAINTENANCE.md       # Canonical maintenance processes (docs, deps, cleanup)
  # Optional future canon:
  # RELEASES.md        # Canonical release process (if/when defined)

  playbooks/           # Single-flow guides (supporting docs)
    run-task.md        # Example: pick up a Linear issue and complete it with guardrails
```

- These files define “how we work with tools and collaboration practices” in a durable, repo-wide way.
- `PROCESS.md` at the root introduces this domain and links into these docs.

### 3.4 `projects/` — Time-Bound Work

```text
docs/projects/
  <project-slug>/
    README.md       # Project overview & status
    # milestones/, issues/, logs/, resources/ as needed
```

- Each project folder holds time-bound context:
  - Specs, logs, issue docs, resources tied to that initiative.
- Project docs are typically lowercased and can be archived when the project sunsets.

For non-trivial projects, use a three-layer structure:

- **Project directional doc** (e.g., `docs/projects/<project-slug>/PRD-<project-slug>.md`)
  - Defines goals, high-level milestones, and links to feature PRDs and milestone docs.
  - Acts as the *entrypoint* for people trying to understand the project.
- **Milestone docs** (e.g., `docs/projects/<project-slug>/milestones/M2-*.md`)
  - Own scope, sequencing, and cross-cutting dependencies for a time-bounded slice.
  - Stay relatively high-level; they should point to PRDs and issues for details, not duplicate them.
- **Feature PRDs** (e.g., `docs/projects/<project-slug>/resources/PRD-*.md`)
  - Own detailed requirements and technical phases for a specific subsystem.
  - May reference milestones for scheduling context, but do not define timelines directly.

When deciding what to create for a project:

- Reach for a **PROJECT-<slug>.md** directional doc when:
  - The work spans multiple capabilities or subsystems.
  - You expect multiple milestones or a prolonged timeline.
  - You need a single place to explain “what we’re doing and why” at project scope.
- Reach for a **feature PRD** (`PRD-*.md`) when:
  - You are changing an external contract, data shape, or observable behavior (e.g., config schema, pipeline contracts, API surfaces).
  - Multiple milestones or issues will depend on a stable definition of “what correct looks like.”
  - You need room to describe phases, edge cases, and invariants for one capability.
- Rely on **milestone docs** and **issues only** when:
  - The work is short-lived, localized, or purely internal (e.g., internal refactors that do not change public behavior).
  - A clear issue description, possibly with a short design note, is enough to express intent and acceptance criteria.

### 3.5 `templates/` — Scaffolds

```text
docs/templates/
  project.md
  service.md
  issue.md
  milestone.md
```

- Reusable scaffolds for new docs.
- Copy these into `projects/`, `system/`, or `product/` as appropriate; do not edit them in place for project-specific work.

### 3.6 `_archive/` — Retired Docs

- Store retired or superseded docs here.
- Preserve original filenames; update links and note moves in relevant logs/milestones where it matters.

---

## 4. Naming & Placement Heuristics

This section defines how to decide **where** a new doc goes and **how** to name it.

### 4.1 Temporal vs Evergreen

1. **Temporal (time-bound, project-specific)**
   - Tied to a specific project, milestone, release, or date.
   - Examples: issue specs, daily logs, project-only decisions.
   - **Location:** `docs/projects/<project>/...`
   - **Naming:** lowercase (`spec.md`, `log-2025-11-30.md`, `notes.md`).

2. **Evergreen**
   - Intended to remain valid across projects over time.
   - **Location:** `docs/` (root gateways), `docs/product/`, `docs/system/`, `docs/process/`.

### 4.2 Canonical vs Supporting

For **evergreen** docs, decide if they are canonical or supporting:

1. **Canonical**
   - Single source of truth for a recurring concept at this path’s scope.
   - You should be able to answer “Where do I learn how we do X here?” with exactly one file.
   - Applies broadly across the repo or across a clear domain (product, system, workflows).
   - **Naming:** ALL‑CAPS (see below).

2. **Supporting**
   - Scoped, narrower, or implementation-detail docs.
   - Examples: backend-only logging details, frontend-specific rendering quirks, project notes.
   - **Naming:** lowercase.

### 4.3 ALL‑CAPS vs lowercase

- **ALL‑CAPS filenames** (e.g., `PRODUCT.md`, `ARCHITECTURE.md`) **anywhere in `docs/`**
  - Means "canonical, evergreen doc for this concept within this directory's scope."
  - Examples:
    - Root: `PRODUCT.md`, `SYSTEM.md`, `PROCESS.md`, `ROADMAP.md`, `DOCS.md`.
    - Product: `BUGS.md`, `WISHLIST.md`, `PDR.md`.
    - System: `ARCHITECTURE.md`, `TESTING.md`, `SECURITY.md`, `ADR.md`.
    - Workflows: `GRAPHITE.md`, `LINEAR.md`, `MAINTENANCE.md`, `RELEASES.md` (if added).
  - Aim for a small, focused set of ALL‑CAPS files per directory so they remain easy to scan.

- **lowercase**
  - Scoped or detailed docs, usually within a subdomain or project.
  - Examples:
    - `system/backend/overview.md`, `schemas.md`, `orchestration.md`.
    - `system/frontend/overview.md`, `old_architecture.md`.
    - `projects/slides-v0/issues/per-38-local-sync.md`.

### 4.4 Practical Examples

- **System-wide API versioning strategy**
  - Evergreen, single source of truth, repo-wide impact.
  - `docs/system/API_VERSIONING.md`.

- **Backend logging specifics**
  - Evergreen but scoped to backend.
  - `docs/system/backend/logging.md` (lowercase).

- **Stable release process**
  - Evergreen, applies every time a release is cut.
  - `docs/process/RELEASES.md`.

- **One-off notes for a specific release**
  - Time-bound, project-specific.
  - `docs/projects/slides-v0/logs/2025-12-01-release-notes.md`.

---

## 5. Navigation Patterns

### 5.1 Agents

- Use `AGENTS.md` as the primary entrypoint; it should link to:
  - `docs/PRODUCT.md` for product grounding.
  - `docs/SYSTEM.md` for system grounding.
  - `docs/PROCESS.md` + specific process docs (`process/GRAPHITE.md`, `LINEAR.md`, `MAINTENANCE.md`) for collaboration and workflows.
  - `docs/ROADMAP.md` and relevant `docs/projects/<project>/README.md` for current/future work.
- When in doubt, scan for ALL‑CAPS filenames at or under a path to find canonical docs for that scope.

### 5.2 Humans

- `ls docs` to see all gateway docs at a glance:
  - Start with `PRODUCT.md` or `SYSTEM.md` depending on whether you need product or technical context.
  - Use `PROCESS.md` when you need to know “how do we work here?”
  - Use `ROADMAP.md` for directional context and future work.
  - Use `DOCS.md` to understand and evolve the documentation structure itself.

---

## 6. Quick Reference Table

| Content Type                | Location                          | Naming                      |
|-----------------------------|-----------------------------------|-----------------------------|
| Product overview & why      | `docs/PRODUCT.md`                 | ALL‑CAPS filename           |
| System overview             | `docs/SYSTEM.md`                  | ALL‑CAPS filename           |
| Process overview            | `docs/PROCESS.md`                 | ALL‑CAPS filename           |
| Roadmap & direction         | `docs/ROADMAP.md`                 | ALL‑CAPS filename           |
| Docs architecture/meta      | `docs/DOCS.md`                    | ALL‑CAPS filename           |
| Product artifacts           | `docs/product/`                   | ALL‑CAPS filename (canonical)|
| System-wide standards       | `docs/system/`                    | ALL‑CAPS filename (canonical)|
| Architecture decisions      | `docs/system/ADR.md`              | ALL‑CAPS filename           |
| Deferred work/tech debt     | `docs/system/DEFERRALS.md`        | ALL‑CAPS filename           |
| Process & workflow policies | `docs/process/`                   | ALL‑CAPS filename (canonical)|
| Component/system details    | `docs/system/<area>/`             | lowercase (see note below)  |
| Project work                | `docs/projects/<project>/`        | lowercase                   |
| Templates                   | `docs/templates/`                 | lowercase                   |
| Archived docs               | `docs/_archive/`                  | preserve original           |

---

## 7. Component Overview Guidelines

Each component directory (e.g., `system/backend/`, `system/frontend/`) should have an `overview.md` as its entry point. This file serves as orientation for developers working in that component.

### What belongs in `overview.md`

- What the component is (1-2 sentences)
- Directory structure / key files
- Core patterns and conventions
- Links to detailed docs for deep dives

### When to split

Include this HTML comment at the bottom of each component `overview.md` to guide future maintenance:

```html
<!-- NOTE FOR AGENTS:
If this overview exceeds ~300 lines or you find yourself adding a major subsystem
(e.g., [component-specific examples]), consider:
1. Splitting that subsystem into its own doc (e.g., `subsystem.md`)
2. Creating a dedicated `architecture.md` if structural decisions need deep explanation
3. Adding an ADR entry in `docs/system/ADR.md` if trade-offs were evaluated

Keep this overview focused on orientation ("how to work here") rather than deep dives.
-->
```

**Triggers for splitting:**
- Overview exceeds ~300 lines
- A subsystem is complex enough to need dedicated onboarding
- You're documenting trade-offs between alternatives (ADR territory)
- New contributors consistently need more context than the overview provides

**Keep overviews unified when:**
- The component is architecturally simple
- All content is essential for basic orientation
- Splitting would create maintenance burden without clear benefit
