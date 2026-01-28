# Mods Workspace

This directory hosts colocated Civilization VII mod projects that consume the SDK from `packages/sdk`. Each mod is a separate workspace under `mods/<mod-name>` and builds into a local `./mod/` folder that mirrors the in-game Mods layout.

- Workspaces: `mods/*` are included in the monorepo workspaces.
- Caching: Turbo caches `mods/*/mod/**`.
- Git hygiene: `mods/*/mod/` is ignored by `.gitignore`.

Conventions
- Each mod is a private workspace (not published to a registry).
- A mod’s build outputs to `./mod/`, which is ignored by Git and included in the build cache.
- Mods depend on the SDK via workspaces: `"@mateicanavra/civ7-sdk": "workspace:*"`.

Example scaffold
A temporary example workspace exists at `mods/example-mod/` and will be deleted later. It demonstrates:
- Resolving the SDK via workspaces
- Writing build output to `./mod/`
- A minimal build script interface with a safe fallback

You don’t need to use or modify it to import a real mod.

---

## Strategy: Bring an existing mod repo here and mirror back out

Goal
- Make this monorepo the source of truth for the mod.
- Keep the old standalone repo as a read-only mirror that receives updates from this monorepo.

Recommended mechanism: git subtree
- Cleanly nest the mod at `mods/<mod-name>` while preserving (or squashing) its history.
- Keep day-to-day development simple (no submodule management).
- Push/pull only the subtree that corresponds to the mod.

Why subtree (vs submodule or heavy history surgery)
- Submodule: higher contributor overhead; separate working tree; poor DX in a monorepo.
- filter-repo: powerful but overkill for ongoing bidirectional sync; subtree is purpose-built to split/merge a nested directory with a remote.

---

## One-time import (preserve history)

1) Choose naming and identify the upstream
- Directory: `mods/<mod-slug>` (e.g., `mods/my-civ-mod`)
- Remote repo URL: e.g., `git@github.com:your-username/your-mod-repo.git`
- Branch to track: e.g., `main`

2) Add the remote and fetch full history
```/dev/null/subtree-commands.sh#L1-6
# from monorepo root
git remote add mod-my-civ-mod git@github.com:your-username/your-mod-repo.git
git fetch mod-my-civ-mod --tags
```

3) Import via subtree (preserve history)
```/dev/null/subtree-commands.sh#L8-12
git subtree add \
  --prefix=mods/my-civ-mod \
  mod-my-civ-mod main
```

Optional: squash history into one commit (lighter monorepo history)
```/dev/null/subtree-commands.sh#L14-18
git subtree add \
  --prefix=mods/my-civ-mod \
  mod-my-civ-mod main \
  --squash
```

4) Normalize the imported workspace
- Ensure `mods/my-civ-mod/package.json` has:
  - `"private": true`
  - `dependencies: { "@mateicanavra/civ7-sdk": "workspace:*" }`
  - A build that writes to `./mod/` (aligns with `.gitignore` and Turbo caching)

If the imported mod builds elsewhere, adjust its output path to `./mod/`.

---

## Day-to-day development

- Work in `mods/<mod-slug>` like any other workspace.
- Build locally:
```/dev/null/subtree-commands.sh#L20-22
bun run --cwd mods/<mod-slug> build
# Outputs to mods/<mod-slug>/mod/
```

- Commit changes to the monorepo.

---

## Mirroring back to the old repo (read-only)

Push the subtree back out whenever you want to update the mirror:

```/dev/null/subtree-commands.sh#L24-28
git subtree push \
  --prefix=mods/my-civ-mod \
  mod-my-civ-mod main
```

This splits the history for `mods/my-civ-mod` and pushes it to the remote `mod-my-civ-mod` on branch `main`.

If the old repo receives a hotfix you need here, pull it in:

```/dev/null/subtree-commands.sh#L30-35
git fetch mod-my-civ-mod --tags
git subtree pull \
  --prefix=mods/my-civ-mod \
  mod-my-civ-mod main
```

Notes
- Use consistent remote naming, e.g., `mod-<slug>`, if you have multiple mods.
- Ensure your local clone has full history (not shallow) for subtree operations.

---

## Optional: Automate mirroring with GitHub Actions

You can automatically push the subtree when `mods/my-civ-mod/**` changes on your main branch. This workflow requires credentials with push access to the old repo (SSH deploy key or PAT). A token in repository secrets (not the default `GITHUB_TOKEN` if pushing cross-repo) is recommended.

```/dev/null/.github/workflows/sync-my-civ-mod.yml#L1-60
name: Sync my-civ-mod subtree
on:
  push:
    branches: [ main ]
    paths:
      - "mods/my-civ-mod/**"

jobs:
  push-subtree:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout (full history)
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Add remote
        env:
          MOD_REMOTE_URL: ${{ secrets.MY_CIV_MOD_REMOTE_SSH }} # e.g., git@github.com:your-username/your-mod-repo.git
        run: |
          git remote add mod-my-civ-mod "$MOD_REMOTE_URL"
          git fetch mod-my-civ-mod --tags

      - name: Push subtree
        run: |
          git subtree push --prefix=mods/my-civ-mod mod-my-civ-mod main
```

Security and permissions
- Preferred: an SSH deploy key with write access on the mirror repo, stored in repo secrets or as a GitHub Actions deploy key.
- Alternative: a PAT with repo:write scope stored in secrets. If using HTTPS + PAT, adjust the remote URL accordingly.

---

## Multiple mods

Repeat the pattern per mod:
- Directory: `mods/<slug>`
- Remote name (internal): automatically derived as `mod-<slug>`
- Branch: typically `main`
- Commands use the corresponding `--prefix=mods/<slug>` and remote.

Example commands for a second mod:
```/dev/null/subtree-commands.sh#L62-75
# Configure remote
git remote add mod-another-mod git@github.com:your-username/another-mod.git
git fetch mod-another-mod --tags

# Import (preserve history)
git subtree add --prefix=mods/another-mod mod-another-mod main

# Push updates back to the mirror
git subtree push --prefix=mods/another-mod mod-another-mod main

# Pull back hotfixes (if needed)
git subtree pull --prefix=mods/another-mod mod-another-mod main
```

---

## Checklist when importing a mod

- [ ] Decide on `mods/<mod-slug>` and ensure the slug matches your package name if applicable.
- [ ] `git remote add mod-<slug> <ssh-or-https-url>` and fetch all tags.
- [ ] `git subtree add --prefix=mods/<slug> mod-<slug> <branch> [--squash]`
- [ ] Normalize `package.json` to:
  - `private: true`
  - `@mateicanavra/civ7-sdk: workspace:*`
  - Build to `./mod/`
- [ ] Validate build: `bun run --cwd mods/<mod-slug> build`
- [ ] Push the subtree to mirror: `git subtree push --prefix=mods/<slug> mod-<slug> <branch>`
- [ ] (Optional) Add a GH Action to automate mirroring

---

## Tips

- If the imported repo has its own lockfile or tooling config that conflicts with the monorepo, prefer the monorepo’s versions and remove redundant config from the mod as needed.
- Keep the mod’s README local to `mods/<slug>`, so its documentation travels with the subtree.
- If the mod uses a different output directory, change it to `./mod/` once imported. This aligns with our ignores and cache config.
- For large imports, consider `--squash` to reduce monorepo history size. You can keep the old repo as the place to browse long-form historical commits if needed.

---

Questions or changes
- Want to convert an existing mod to this structure? Open a PR or issue with:
  - Repo URL
  - Branch
  - Desired slug under `mods/`
  - Whether you want full history or squash
- We’ll wire it up with `git subtree`, normalize scripts, and optionally add CI for mirroring.
