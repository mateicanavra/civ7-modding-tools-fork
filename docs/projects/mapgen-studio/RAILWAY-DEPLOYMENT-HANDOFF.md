# Railway Deployment Handoff

## For: Local Agent with CLI Access
## Goal: Deploy MapGen Studio as a static site on Railway

---

## Context

MapGen Studio is a browser-based visualization tool for the Civ7 map generation pipeline. The near-term goal is a **public, static deployment** (zero auth) to prove the Railway deployment pipeline before we build the real product: an **in-browser pipeline runner** (Web Worker) plus **rich visualization** (e.g., deck.gl) for debugging/iteration.

Roadmap for the visualization product (including V0 “dump + deck.gl viewer”): `docs/projects/mapgen-studio/ROADMAP.md`.

This document is intentionally **deployment-only** (Railway + static hosting). Product/architecture details live in the roadmap and V0 plan.

**Current state:**
- Railway service exists, connected to the monorepo
- But it's configured for the whole repo, not the `apps/mapgen-studio` subdirectory
- The `mapgen-studio` app now exists with a minimal React + Vite scaffold

**What we need:**
- Configure Railway to build/deploy ONLY `apps/mapgen-studio`
- Verify the app is accessible at a public URL
- No authentication or security needed (it's a dev tool)

**Important notes from Railway docs:**
- Nixpacks is deprecated; **Railpack** is the new default builder
- Railpack has **first-class Vite/SPA support** and uses Caddy to serve static files
- For monorepos, this is an "isolated monorepo" → set root directory to subdirectory

---

## App Location

```
apps/mapgen-studio/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── Caddyfile          ← Add this for SPA routing
├── .gitignore
└── src/
    ├── main.tsx
    └── App.tsx
```

---

## Step 1: Add Caddyfile for Static Site Serving

Railpack uses Caddy to serve static files. Create this file for proper SPA routing:

**Verify `apps/mapgen-studio/Caddyfile` exists:**
```caddyfile
:{$PORT:3000} {
    root * dist
    encode gzip
    file_server
    try_files {path} /index.html
}
```

This tells Caddy to:
- Serve files from the `dist` folder (Vite's build output)
- Enable gzip compression
- Route all paths to `index.html` for client-side routing

---

## Step 2: Railway Configuration

### Central point: fix GitHub deploys (no manual uploads)

We want **GitHub-connected** deploys (auto on merge/push), not local file uploads via `railway up`. The service is already connected to `mateicanavra/civ7-modding-tools`; the missing piece is **telling Railpack how to build + start MapGen Studio from a monorepo repo root**.

This repo’s workspace manager is **Bun** (via the root `packageManager` contract). Avoid deployment instructions that assume a different package manager or Corepack.

### Branch previews (recommended): PR preview environments (Graphite-friendly)

Avoid flipping a shared Railway environment’s branch to “whatever I’m working on” (it’s global state and breaks as soon as two PRs are active).

Instead, use **PR preview environments**:
- Keep `production` pinned to `main` (always-current deploy)
- Keep a non-prod seed environment `preview-base` pinned to `main` (copy source for previews)
- Create an ephemeral environment per selected PR, copying from `preview-base` and pointing to that PR’s branch

This repo includes a GitHub Actions workflow that does this automatically:
- `.github/workflows/railway-preview.yml`
- Default policy for Graphite stacks: **only the top-of-stack PR gets a preview**
  - Opt-in for any PR: add label `railway-preview`
  - Opt-out: add label `no-railway-preview`

**One-time setup required:**
1. Add GitHub repo secret `RAILWAY_API_TOKEN` (an account/team Railway API token with access to the project; **project tokens don’t work** for `railway link`).
2. Create GitHub labels:
   - `railway-preview`
   - `no-railway-preview`
3. Ensure a Railway environment named `preview-base` exists (the workflow copies it to create `pr-<number>` envs).
4. (Recommended) Ensure Railway built-in PR environments are disabled to avoid duplicate previews.

### Recommended: `railway.json` at repo root (config-as-code)

Create `railway.json` at the **repo root** (auto-detected by Railway):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "watchPatterns": [
      "apps/mapgen-studio/**",
      "railway.json"
    ],
    "buildCommand": "bun install --frozen-lockfile && bun run --cwd apps/mapgen-studio build"
  },
  "deploy": {
    "startCommand": "cd apps/mapgen-studio && caddy run --config Caddyfile --adapter caddyfile",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

This keeps the service’s **Root Directory** at the repo root (so it can see the workspace lockfile), but builds/serves only `apps/mapgen-studio`.

### Optional alternative (dashboard-only)

If you set Railway **Root Directory** to `apps/mapgen-studio`, Railpack should be able to auto-detect Vite and serve via its built-in SPA support (and you may be able to remove `railway.json`). Config-as-code cannot set Root Directory; it must be set in the service settings.

---

## Step 3: Verification

1. **Local test first:**
   ```bash
   bun install
   bun run --cwd apps/mapgen-studio dev
   # Open http://localhost:5173 - should see "MapGen Studio" page
   ```

2. **Build test:**
   ```bash
   bun run --cwd apps/mapgen-studio build
   # Should create apps/mapgen-studio/dist/ with index.html and assets
   ```

3. **After Railway deploy:**
   - Deploy should trigger automatically on merge/push (GitHub-connected service)
   - Confirm latest status: `railway deployment list -s mapgen-studio -e production --limit 5`
   - Check logs if needed: `railway logs -s mapgen-studio -e production --latest`
   - Visit the production URL and confirm the page renders and shows “Deployment successful.”

---

## Expected Result

A page showing:
- "MapGen Studio" header
- "Civ7 Map Generation Pipeline Visualizer" subtitle
- Green text: "Deployment successful."
- Gray text: "Next: Web Worker + deck.gl integration"

---

## Troubleshooting

### Build fails with "tsc not found"
The `typescript` is a devDependency. Make sure `bun install` runs before `bun run --cwd apps/mapgen-studio build`.

### 502 Bad Gateway
Railpack might not be detecting the Caddyfile. Try:
1. Ensure Caddyfile is in the root of `apps/mapgen-studio/`
2. Explicitly set Start Command to `caddy run --config Caddyfile --adapter caddyfile`

### 404 on page load or refresh
The Caddyfile's `try_files` directive should handle this. If not:
1. Check Caddyfile syntax
2. Ensure `dist` folder exists after build

### Wrong directory being built
If you follow the recommended shared-monorepo setup, **Root Directory stays at repo root**. Instead verify:
1. **Build Command** scopes to `apps/mapgen-studio`
2. **Watch Paths** is `/apps/mapgen-studio/**`
3. **Start Command** runs Caddy from `apps/mapgen-studio`

### Old version showing after deploy
Railway caches aggressively. Try:
1. Clear build cache in Railway dashboard
2. Or make a small change and redeploy

### Fallback: Use `serve` instead of Caddy
If Caddy doesn't work, you can use the `serve` package:

1. Add to package.json: `bun add -d serve`
2. Set Start Command: `bunx serve dist -s -l $PORT`

---

## Commands Summary

```bash
# 1. Add Caddyfile
cat > apps/mapgen-studio/Caddyfile << 'EOF'
:{$PORT:3000} {
    root * dist
    encode gzip
    file_server
    try_files {path} /index.html
}
EOF

# 2. Install dependencies locally
bun install

# 3. Test locally
bun run --cwd apps/mapgen-studio dev

# 4. Test build
bun run --cwd apps/mapgen-studio build

# 5. If using Railway CLI:
railway login --browserless
railway link -p <PROJECT_ID> -e production -s <SERVICE_NAME>  # if needed
railway up
```

---

## After Successful Deployment

Report back with:
1. The public Railway URL
2. Screenshot or confirmation it's working
3. Any configuration changes you had to make

Then we can proceed with adding the actual pipeline integration (Web Worker + deck.gl).

---

## References

- [Railway Monorepo Guide](https://docs.railway.com/guides/monorepo)
- [Railway Build Configuration](https://docs.railway.com/guides/build-configuration)
- [Railway Environments](https://docs.railway.com/guides/environments)
- [Railway GitHub Autodeploys](https://docs.railway.com/guides/github-autodeploys)
- [Railpack Static Sites](https://railpack.com/languages/staticfile/)
- [Vite React Template for Railway](https://github.com/brody192/vite-react-template)

---

*Document created: 2026-01-24*
*For: MapGen Studio v0.1.0 deployment*
