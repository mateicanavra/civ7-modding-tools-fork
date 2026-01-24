# Railway Deployment Handoff

## For: Local Agent with CLI Access
## Goal: Deploy MapGen Studio as a static site on Railway

---

## Context

MapGen Studio is a browser-based visualization tool for the Civ7 map generation pipeline. We need to deploy it as a static site to prove out the deployment pipeline before building features.

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

**Create `apps/mapgen-studio/Caddyfile`:**
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

### Option A: Via Railway Dashboard (Recommended)

1. Go to Railway dashboard → Select the service
2. Go to **Settings** → **Build & Deploy**
3. Configure these settings:

| Setting | Value |
|---------|-------|
| **Root Directory** | `apps/mapgen-studio` |
| **Build Command** | `npm install && npm run build` |
| **Watch Paths** | `apps/mapgen-studio/**` |

4. Railpack should auto-detect:
   - Vite project → runs build
   - Caddyfile → uses Caddy to serve `dist/`

If it doesn't auto-detect, set:
| Setting | Value |
|---------|-------|
| **Start Command** | `caddy run --config Caddyfile --adapter caddyfile` |

### Option B: Via railway.json

Create `apps/mapgen-studio/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "caddy run --config Caddyfile --adapter caddyfile",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Note:** The railway.json path is relative to the root directory you set.

### Option C: Via Railway CLI

```bash
# Login to Railway (will open browser for OAuth)
railway login

# Link to existing project (if not already linked)
railway link

# Set the root directory for builds
railway service update --root-directory apps/mapgen-studio

# Trigger a deploy
railway up
```

---

## Step 3: Verification

1. **Local test first:**
   ```bash
   cd apps/mapgen-studio
   npm install
   npm run dev
   # Open http://localhost:5173 - should see "MapGen Studio" page
   ```

2. **Build test:**
   ```bash
   npm run build
   # Should create dist/ folder with index.html and assets
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
The `typescript` is a devDependency. Make sure `npm install` runs before `npm run build`.

### 502 Bad Gateway
Railpack might not be detecting the Caddyfile. Try:
1. Ensure Caddyfile is in the root of `apps/mapgen-studio/`
2. Explicitly set Start Command to `caddy run --config Caddyfile --adapter caddyfile`

### 404 on page load or refresh
The Caddyfile's `try_files` directive should handle this. If not:
1. Check Caddyfile syntax
2. Ensure `dist` folder exists after build

### Wrong directory being built
Check that **Root Directory** is set to `apps/mapgen-studio` (not the repo root).

### Old version showing after deploy
Railway caches aggressively. Try:
1. Clear build cache in Railway dashboard
2. Or make a small change and redeploy

### Fallback: Use `serve` instead of Caddy
If Caddy doesn't work, you can use the `serve` package:

1. Add to package.json: `npm install --save-dev serve`
2. Set Start Command: `npx serve dist -s -l $PORT`

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
cd apps/mapgen-studio
npm install

# 3. Test locally
npm run dev

# 4. Test build
npm run build

# 5. If using Railway CLI:
railway login
railway link  # if needed
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
