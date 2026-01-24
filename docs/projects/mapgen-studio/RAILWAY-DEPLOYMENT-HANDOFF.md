# Railway Deployment Handoff

## For: Local Agent with CLI Access
## Goal: Deploy MapGen Studio as a static site on Railway

---

## Context

MapGen Studio is a browser-based visualization tool for the Civ7 map generation pipeline. We need to deploy it as a static site to prove out the deployment pipeline before building features.

**Current state:**
- Railway service exists, connected to the monorepo
- But it's configured for the whole repo, not the `packages/mapgen-studio` subdirectory
- The `mapgen-studio` package now exists with a minimal React + Vite scaffold

**What we need:**
- Configure Railway to build/deploy ONLY `packages/mapgen-studio`
- Verify the app is accessible at a public URL
- No authentication or security needed (it's a dev tool)

---

## Package Location

```
packages/mapgen-studio/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── .gitignore
└── src/
    ├── main.tsx
    └── App.tsx
```

---

## Railway Configuration Required

### Option A: Via Railway Dashboard (Recommended)

1. Go to Railway dashboard → Select the service
2. Go to **Settings** → **Build & Deploy**
3. Configure these settings:

| Setting | Value |
|---------|-------|
| **Root Directory** | `packages/mapgen-studio` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | Leave empty (static site) |
| **Watch Paths** | `packages/mapgen-studio/**` |

4. For static site serving, you need to configure the **Static File Serving**:
   - Go to **Settings** → **Networking**
   - Enable static file serving OR use a simple static server

### Option B: Via railway.json (Alternative)

Create `/packages/mapgen-studio/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npx serve dist -s -l 3000",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

This uses `serve` to host the static files. You'd also need to add `serve` as a dev dependency:

```bash
cd packages/mapgen-studio
npm install --save-dev serve
```

### Option C: Via Railway CLI

```bash
# Login to Railway (will open browser for OAuth)
railway login

# Link to existing project (if not already linked)
railway link

# Set the root directory for builds
railway service update --root-directory packages/mapgen-studio

# Trigger a deploy
railway up
```

---

## Verification Steps

1. **Local test first:**
   ```bash
   cd packages/mapgen-studio
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

### 404 on page load
Railway might not be serving static files correctly. Options:
1. Use `npx serve dist -s` as the start command
2. Or configure Railway's static file serving feature

### Wrong directory being built
Check that **Root Directory** is set to `packages/mapgen-studio` (not the repo root).

### Old version showing after deploy
Railway caches aggressively. Try:
1. Clear build cache in Railway dashboard
2. Or make a small change and redeploy

---

## Commands Summary

```bash
# 1. Install dependencies locally
cd packages/mapgen-studio
npm install

# 2. Test locally
npm run dev

# 3. Test build
npm run build
npx serve dist -s

# 4. If using Railway CLI:
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

*Document created: 2026-01-24*
*For: MapGen Studio v0.1.0 deployment*
