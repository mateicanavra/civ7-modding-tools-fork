### Civ7 Docs Architecture and Resources Plan

This document captures the decision and near-term plan for how we serve documentation, how we will consume upstream Civ7 resources, and how we intend to evolve the architecture as contributors and versioning needs grow.

---

### Goals

- Keep authoring friction low (single place to edit Markdown; trivial local preview)
- Serve a single static root in dev and prod (identical behavior, easy hosting)
- Keep Bun-first dev, avoid unnecessary bundlers
- Allow future growth to versioned content and versioned Civ7 resources without re-architecting the site

---

### Decision (now)

- Treat “docs as one thing.” Serve a single root folder that already contains:
  - The landing page and navigation
  - Both doc collections: `community/` and `civ7-official/`
  - The local plugin `code-slicer`
- The single source of truth for content remains the repository `docs/` directory.
- A dedicated docs app exists only as the entrypoint (scripts) and serves the `docs/` directory directly for dev.

Pointers:
- Content: `docs/**`
- Landing page: `docs/index.html`
- Local plugin: `docs/civ7-official/modding/plugins/code-slicer.js`
- Docs app entry (scripts only): `apps/docs/package.json`
- Root script: `package.json` → `docs:dev` runs the docs task via Turborepo

Why this choice now:
- Contributors can edit Markdown in `docs/` via GitHub UI + PRs (lowest friction)
- Docsify serves a single directory; our content already lives together under `docs/`
- No copy/symlink/mount is required when serving `docs/` directly

---

### Current state (temporary)

During exploration, we briefly introduced symlink/copy steps to allow `apps/docs/site/` to serve content outside that folder. This added complexity and is not needed for the decision above. We will remove these extra steps and serve `../../docs` directly from the docs app after review.

---

### Triggers to evolve (Option 2)

We will migrate to a fully separated model when any of these are true:
- We publish a versioned Civ7 resources package with curated public outputs (e.g., `@civ7/resources`)
- We want the docs content itself to be versioned or reused (e.g., `@civ7/docs-content`)
- We need reproducible artifacts or multi-site reuse of content/resources

Explicit intention: migrate to Option 2 when the resources package is ready and/or we introduce versioned docs content. The goal remains serving a single static root in dev/prod.

---

### Option 2 (future): Separated packages + pre-compose

Architecture:
- `packages/docs-content/` (future): exposes a ready-to-serve folder (e.g., `site/`) that includes the landing page, markdown, and the local plugin under `site/plugins`.
- `packages/resources/` (future): `@civ7/resources` exposes a curated static-safe `public/` folder (zipped/unzipped snapshots, extracted/enriched artifacts). The CLI can generate and update these assets.
- `apps/docs/` (docs server): pre-compose build step copies both into one output folder, then serves that single folder via Docsify CLI (or any static server).

Pre-compose build (docs server):
- Copy `node_modules/@civ7/docs-content/site/**` → `apps/docs/dist/`
- Copy `node_modules/@civ7/resources/public/**` → `apps/docs/dist/resources/`
- Serve `apps/docs/dist/` as the single root

Versioning:
- `@civ7/resources` is versioned independently and pinned by Civ game updates
- `@civ7/docs-content` may also be versioned (optional)
- Docs server bumps dependency versions and runs pre-compose, producing a reproducible static folder

Deployment:
- Dev and prod both serve a single static directory (e.g., `apps/docs/dist/`)
- CI can build that directory and publish PR previews (Netlify/Vercel) for non-dev contributors

Why this approach later:
- Clear ownership and lifecycles (resources and content can ship independently)
- Reuse and versioning without changing the serving model (still one static root)
- Plays well with pnpm workspaces and Turborepo (cacheable `dist/**` outputs)

---

### Alternative (no-copy) dev/prod server

Instead of pre-compose copy, a tiny static server (Bun/Express) can mount multiple directories:
- `/` → docs-content (site)
- `/resources` → `@civ7/resources/public`

Pros: zero copy, explicit mounts; Cons: maintain ~50 lines of server code. Outcome is still a single site from the browser perspective. We prefer pre-compose for pure static deploys.

---

### Contributor experience

Now:
- Edit Markdown under `docs/` and preview locally with a single command

Later (Option 2):
- Non-dev contributors still open PRs against `packages/docs-content/`
- CI builds and deploys PR previews (with resources) so authors see fully working links

---

### Summary

- Now: serve the repository `docs/` directory directly (single root; simplest contributor story)
- Later: introduce `@civ7/resources` (curated `public/`) and, if needed, `@civ7/docs-content` (ready-to-serve `site/`), then pre-compose into a single static output folder for deployment
- We keep Bun-first, avoid unnecessary bundlers, and retain a single-root serving model across environments


