# Railway Deployment Handoff

## For: Local Agent with CLI Access
## Goal: Deploy MapGen Studio as a static site on Railway

---

## Context

MapGen Studio is a browser-based visualization tool for the Civ7 map generation pipeline. The near-term goal is a **public, static deployment** (zero auth) to prove the Railway deployment pipeline before we build the real product: an **in-browser pipeline runner** (Web Worker) plus **rich visualization** (e.g., deck.gl) for debugging/iteration.

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

### Important: shared monorepo vs isolated root directory

This repo is a **shared pnpm workspace** (lockfile + `packageManager` live at the repo root). If you set Railway **Root Directory** to `apps/mapgen-studio`, you are effectively building an **isolated** subtree, which can cause Railpack to miss workspace-level package manager configuration and fall back to npm (or otherwise behave differently than local/CI).

**Recommendation:** keep Railway building from the repo root, and scope build/start commands + watch paths to `apps/mapgen-studio`.

### Option A: Via Railway Dashboard (Recommended)

1. Go to Railway dashboard → Select the service
2. Go to **Settings** → **Build & Deploy**
3. Configure these settings:

| Setting | Value |
|---------|-------|
| **Root Directory** | *(leave as repo root)* |
| **Build Command** | `corepack enable && corepack prepare pnpm@10.10.0 --activate && pnpm install --frozen-lockfile && pnpm -C apps/mapgen-studio build` |
| **Watch Paths** | `/apps/mapgen-studio/**` |

4. Railpack will build the repo; the command above builds **only** MapGen Studio.

If it doesn't auto-detect, set:
| Setting | Value |
|---------|-------|
| **Start Command** | `cd apps/mapgen-studio && caddy run --config Caddyfile --adapter caddyfile` |

### Option B: Via railway.json

Create `apps/mapgen-studio/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "corepack enable && corepack prepare pnpm@10.10.0 --activate && pnpm install --frozen-lockfile && pnpm -C apps/mapgen-studio build"
  },
  "deploy": {
    "startCommand": "cd apps/mapgen-studio && caddy run --config Caddyfile --adapter caddyfile",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Important:** Railway config-as-code file paths do **not** follow Root Directory; if you use `apps/mapgen-studio/railway.json`, you must point Railway at the **absolute path** (e.g. `/apps/mapgen-studio/railway.json`) in the service settings.

### Option C: Via Railway CLI

```bash
# Login to Railway (browserless pairing is usually easiest)
railway login --browserless

# Link to existing project (if not already linked)
railway link -p <PROJECT_ID> -e staging -s <SERVICE_NAME>

# Sanity check
railway whoami
railway status

# Trigger a deploy (will use the service's build settings)
railway up
```

---

## Step 3: Verification

1. **Local test first:**
   ```bash
   pnpm install
   pnpm -C apps/mapgen-studio dev
   # Open http://localhost:5173 - should see "MapGen Studio" page
   ```

2. **Build test:**
   ```bash
   pnpm -C apps/mapgen-studio build
   # Should create apps/mapgen-studio/dist/ with index.html and assets
   ```

3. **After Railway deploy:**
   - Get the public URL from Railway dashboard
   - Visit the URL - should see the same "MapGen Studio" page
   - Check browser console for any errors

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
The `typescript` is a devDependency. Make sure `pnpm install` runs before `pnpm -C apps/mapgen-studio build`.

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

1. Add to package.json: `pnpm add -D serve`
2. Set Start Command: `pnpm exec serve dist -s -l $PORT`

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
pnpm install

# 3. Test locally
pnpm -C apps/mapgen-studio dev

# 4. Test build
pnpm -C apps/mapgen-studio build

# 5. If using Railway CLI:
railway login --browserless
railway link -p <PROJECT_ID> -e staging -s <SERVICE_NAME>  # if needed
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
- [Railpack Static Sites](https://railpack.com/languages/staticfile/)
- [Vite React Template for Railway](https://github.com/brody192/vite-react-template)

---

*Document created: 2026-01-24*
*For: MapGen Studio v0.1.0 deployment*
