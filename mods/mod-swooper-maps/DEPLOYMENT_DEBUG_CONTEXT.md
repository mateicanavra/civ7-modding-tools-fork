# Deployment Debug Context

**Status**: Mod deployed, game crashes on load/generation
**Log Path**: `~/Library/Application Support/Civilization VII/Logs/Scripting.log`

---

## Recent Changes (Session: Oct 17, 2024)

### Phase 1.5 & Phase 2 Implementation
- ✅ Refactored plate generation to use base game Voronoi (proper edge-based boundaries)
- ✅ Created `mod/maps/world/plates.js` - imports from `/base-standard/scripts/voronoi-utils.js`
- ✅ Created `mod/maps/layers/mountains.js` - physics-based mountain placement
- ✅ Enhanced climate-refinement.js with atmospheric pressure (Pass G)
- ✅ Enhanced coastlines.js with boundaryCloseness integration

### Bootstrap Reorganization
- 🔄 **RENAMED**: `mod/maps/config/` → `mod/maps/bootstrap/` (avoid collision with CIV metadata)
- ✅ Updated 22 import statements: `from "./config/` → `from "./bootstrap/`
- ✅ Created deployment files:
  - `mod/swooper-maps.modinfo`
  - `mod/config/config.xml`
  - `mod/text/en_us/MapText.xml`
  - `mod/text/en_us/ModuleText.xml`

---

## Import Dependencies - Critical Paths

### Base Game Imports (Potential Failure Points)
```javascript
// plates.js - NEW in Phase 1.5
import { VoronoiUtils, RegionCell, PlateBoundary, RegionCellPosGetter, PlateBoundaryPosGetter }
    from '/base-standard/scripts/voronoi-utils.js';
import { PlateRegion } from '/base-standard/scripts/voronoi-region.js';
import { kdTree } from '/base-standard/scripts/kd-tree.js';
```

**Risk**: These base game scripts may not exist, have different exports, or require specific CIV VII version.

### Bootstrap Chain (Potential Circular Import)
```
Entry file → bootstrap/entry.js → bootstrap/runtime.js
    ↓
map_orchestrator.js → bootstrap/tunables.js → bootstrap/resolved.js → bootstrap/runtime.js
```

**Risk**: Circular import if not careful, or globalThis pollution.

---

## Known Import Patterns

### Entry Files (3 variants)
- `epic-diverse-huge.js` → `import { bootstrap } from "./bootstrap/entry.js"`
- `epic-diverse-huge-temperate.js` → same
- `epic-diverse-huge-kahula.js` → same

### Orchestrator
- `map_orchestrator.js` → `import { rebind, ... } from "./bootstrap/tunables.js"`

### Layers (9 files)
All import from: `"../bootstrap/tunables.js"` or `"../bootstrap/dev.js"`

### World Model
- `world/model.js` → `import { ... } from "../bootstrap/tunables.js"`

---

## 🔴 ACTUAL ISSUES FOUND (From Scripting.log)

### Issue #1: Syntax Error - Optional Chaining ⚠️ CRITICAL
**Error**: `Uncaught SyntaxError: Unexpected token '.'`
**Location**: Happens during MapGeneration context creation (before any map code runs)

**Root Cause**: Optional chaining (`?.`) syntax not supported by CIV VII's V8 engine version

**Files likely using `?.`**:
- `mod/maps/bootstrap/tunables.js` - Uses `worldModel?.isEnabled?.()`
- `mod/maps/layers/climate-refinement.js` - Uses `worldModel?.isEnabled?.()`
- `mod/maps/world/model.js` - May use optional chaining
- **SEARCH NEEDED**: All files for `?.` pattern

**Fix**: Replace all `?.` with defensive null checks:
```javascript
// BROKEN (V8 doesn't support)
if (worldModel?.isEnabled?.()) { }

// WORKING (defensive check)
if (worldModel && worldModel.isEnabled && worldModel.isEnabled()) { }
```

---

### Issue #2: Start Location Placement Failures ⚠️ HIGH PRIORITY
**Error**: `FAILED TO PICK LOCATION FOR: 0, 1, 2, 3, 4, 5...` (ALL civs!)

**Root Cause**: Map generation succeeds BUT no valid start locations found

**Possible reasons**:
1. **Too many mountains** - Physics-based placement created too much impassable terrain
2. **Not enough flat land** - Convergent boundaries created excessive hills/mountains
3. **Resource distribution** - Strategic resources missing or poorly distributed
4. **Fertility too low** - Base game start picker requires minimum fertility

**Files to check**:
- `mod/maps/layers/mountains.js` - Are `mountainPercent: 8, hillPercent: 18` too high?
- `mod/maps/world/model.js` - Is upliftPotential too aggressive?
- Base game's `assign-starting-plots.js` - What are the placement requirements?

---

### Issue #3: StoryTags Reference Error (Non-Critical)
**Error**: `ReferenceError: StoryTags is not defined`
**Location**: Corridor ASCII overlay logging

**Impact**: Low - Just debug logging, doesn't affect generation

**Cause**: Dev logging tries to access StoryTags before it's defined

**Fix**: Add null check in `bootstrap/dev.js` corridor overlay function

---

## Likely Crash Causes (Priority Order)

### 1. Optional Chaining Syntax ⚠️ CRITICAL - CONFIRMED
**Status**: **CONFIRMED FROM LOG**
**Symptom**: `Uncaught SyntaxError: Unexpected token '.'`

**All uses of `?.` must be replaced with explicit null checks**

**Search command**:
```bash
cd mod/maps
grep -r '\?\.' . --include="*.js"
```

Expected files with `?.`:
- bootstrap/tunables.js
- layers/climate-refinement.js
- layers/mountains.js
- world/model.js
- bootstrap/dev.js

---

### 2. Bootstrap Import Path Errors ⚠️ MEDIUM PRIORITY
**Symptom**: `Cannot find module './bootstrap/...'`

**Cause**: Missed import during rename, or typo in sed replacement

**Files to check**:
- Search for remaining `from "./config/` or `from "../config/` in mod/maps/
- Check all 22 files listed in ARCHITECTURE.md

**Quick validation**:
```bash
cd mod/maps
grep -r 'from.*"/config/' .
grep -r "from.*'/config/" .
```

Should return **zero results**. Any matches = broken import.

---

### 3. globalThis Pollution / Runtime Store ⚠️ MEDIUM PRIORITY
**Symptom**: `globalThis is not defined` or `Cannot read property '__EPIC_MAP_CONFIG__'`

**Cause**: CIV VII VM doesn't support globalThis, or key collision

**Code location**: `mod/maps/bootstrap/runtime.js:28-42`

**Fallback**: Uses `__localStore` if globalThis fails (should be safe)

---

### 4. Modinfo / Config.xml Syntax Errors ⚠️ LOW PRIORITY
**Symptom**: Mod doesn't appear in Additional Content, or fails to load

**Files to validate**:
- `mod/swooper-maps.modinfo` - Well-formed XML?
- `mod/config/config.xml` - Correct paths?

**Check paths match actual files**:
- `{swooper-maps}mod/maps/epic-diverse-huge.js` - exists?
- `{swooper-maps}mod/maps/epic-diverse-huge-temperate.js`
- `{swooper-maps}mod/maps/epic-diverse-huge-kahula.js`

---

### 5. Circular Import in Bootstrap ⚠️ LOW PRIORITY
**Symptom**: Stack overflow or "importing before initialization"

**Cause**: Bootstrap files importing each other

**Check**: `bootstrap/entry.js` → `runtime.js` → (should not import entry.js)

---

## Debugging Strategy

### Step 1: Check Scripting.log
Look for:
- `Error: Cannot find module` → Import path issue
- `ReferenceError: <name> is not defined` → Missing export
- `TypeError: ... is not a function` → Wrong export type
- Stack trace pointing to specific file:line

### Step 2: Isolate the Failure
Comment out sections in map_orchestrator.js to find which phase crashes:
```javascript
// generateMap() {
    rebind();  // Does this crash?

    // WorldModel.init();  // Or this?

    // layerCreateDiverseLandmasses();  // Or this?
// }
```

### Step 3: Fallback to Safe Configuration
If Phase 1.5/2 features crash, revert to Phase 1:
- Comment out `import { computePlatesVoronoi } from "./world/plates.js"`
- Use old `computePlates()` logic (simple distance-based Voronoi)
- Disable WorldModel: `STORY_ENABLE_WORLDMODEL: false`

---

## Quick Rollback Commands

### Revert bootstrap rename (if needed):
```bash
cd mod/maps
mv bootstrap config
find . -name "*.js" -exec sed -i '' 's|from "./bootstrap/|from "./config/|g' {} \;
find . -name "*.js" -exec sed -i '' 's|from "../bootstrap/|from "../config/|g' {} \;
```

### Disable Phase 1.5 features:
Edit `mod/maps/epic-diverse-huge.js`:
```javascript
bootstrap({
    presets: ["classic"],
    overrides: {
        toggles: {
            STORY_ENABLE_WORLDMODEL: false,  // Disable WorldModel
        }
    }
});
```

---

## File Locations Reference

### Entry Points (CIV loads these):
- `mod/maps/epic-diverse-huge.js`
- `mod/maps/epic-diverse-huge-temperate.js`
- `mod/maps/epic-diverse-huge-kahula.js`

### Core Generator:
- `mod/maps/map_orchestrator.js` (shared by all 3 variants)

### New Phase 1.5/2 Files (Most Likely Crash Sources):
- `mod/maps/world/plates.js` - **NEW** (imports base game scripts)
- `mod/maps/layers/mountains.js` - **NEW** (uses WorldModel)
- `mod/maps/layers/climate-refinement.js:391-420` - **NEW Pass G** (pressure bias)
- `mod/maps/layers/coastlines.js:85-144` - **ENHANCED** (boundaryCloseness)

### Bootstrap System:
- `mod/maps/bootstrap/entry.js`
- `mod/maps/bootstrap/runtime.js`
- `mod/maps/bootstrap/resolved.js`
- `mod/maps/bootstrap/tunables.js`
- `mod/maps/bootstrap/dev.js`

---

## Expected Log Patterns

### Success (no crash):
```
[WorldModel] Initialized and attached to context
[Mountains] Starting physics-based placement
[Climate] Atmospheric pressure bias applied
=== EPIC DIVERSE HUGE GENERATOR COMPLETED ===
```

### Failure (import error):
```
Error: Cannot find module '/base-standard/scripts/voronoi-utils.js'
    at mod/maps/world/plates.js:22
```

### Failure (undefined):
```
TypeError: VoronoiUtils.computeVoronoi is not a function
    at computePlatesVoronoi (mod/maps/world/plates.js:87)
```

---

## System Info

- **CIV VII Version**: Unknown (check compatibility)
- **Platform**: macOS (Darwin 24.6.0)
- **Mod Location**: `~/Library/Application Support/Civilization VII/Mods/swooper-maps/`
- **Log Location**: `~/Library/Application Support/Civilization VII/Logs/Scripting.log`

---

## Next Session TODO

1. Read Scripting.log for exact error
2. Identify crash location (file:line)
3. Check if base game scripts exist and have correct exports
4. Validate all import paths post-rename
5. Test with STORY_ENABLE_WORLDMODEL: false if needed
6. Progressively re-enable features to isolate issue

---

## Success Criteria

- [ ] Mod loads without crash
- [ ] At least one map variant generates successfully
- [ ] Console shows completion message
- [ ] Map displays in game

Once stable, test physics features:
- [ ] Mountains appear along convergent boundaries
- [ ] Coastlines show ruggedness variation
- [ ] Climate reflects pressure patterns
