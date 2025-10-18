# Debug Prompt for Next Session

## Context
I've deployed a physics-based map generation mod for CIV VII. The mod loads but has **two critical issues** preventing successful gameplay.

## Background Documents (Read These First)
1. **DEPLOYMENT_DEBUG_CONTEXT.md** - Complete technical analysis of current issues
2. **REFACTORING_PROGRESS.md** - Recent Phase 1.5 & Phase 2 implementation details
3. **ARCHITECTURE.md** - Bootstrap system and dependency chain

## Issues to Fix

### 🔴 CRITICAL: Syntax Error - Optional Chaining
**Error**: `Uncaught SyntaxError: Unexpected token '.'`
**Log**: `/Users/mateicanavra/Library/Application Support/Civilization VII/Logs/Scripting.log`

**Problem**: CIV VII's V8 engine doesn't support optional chaining (`?.`) syntax used in our code.

**Tasks**:
1. Search all `.js` files in `mod/maps/` for `?.` pattern
2. Replace with explicit null checks: `obj?.method?.()` → `obj && obj.method && obj.method()`
3. Test that syntax error is resolved

**Priority**: Fix FIRST - blocks all map loading

---

### ⚠️ HIGH: Start Location Placement Failures
**Error**: `FAILED TO PICK LOCATION FOR: 0, 1, 2, 3, 4, 5...` (all civilizations)

**Problem**: Map generates successfully BUT base game can't find valid start locations for any civilization.

**Hypothesis**: Physics-based mountain placement (Phase 2) created too much impassable/undesirable terrain.

**Tasks**:
1. After fixing syntax error, generate a test map
2. Check if mountains/hills cover too much land (currently `mountainPercent: 8, hillPercent: 18`)
3. Verify fertility/resources are sufficient for starts
4. Potentially reduce mountain density or adjust uplift thresholds

**Priority**: Fix SECOND - allows gameplay after syntax fix

---

### 📝 LOW: StoryTags Reference Error
**Error**: `ReferenceError: StoryTags is not defined` in corridor ASCII overlay

**Impact**: Non-critical debug logging only

**Priority**: Optional cleanup

---

## Success Criteria

After fixes:
- [ ] No `SyntaxError` in Scripting.log
- [ ] Map generates to completion
- [ ] At least some civilizations get valid start positions
- [ ] Game launches successfully

## Key Files Likely Needing Changes

Based on DEPLOYMENT_DEBUG_CONTEXT.md analysis:

**Syntax fixes needed in**:
- `mod/maps/bootstrap/tunables.js`
- `mod/maps/layers/climate-refinement.js`
- `mod/maps/layers/mountains.js`
- `mod/maps/world/model.js`
- `mod/maps/bootstrap/dev.js`

**Start location tuning**:
- `mod/maps/layers/mountains.js` (line 230-237 in orchestrator)
- `mod/maps/world/model.js` (upliftPotential calculation)

## Debugging Strategy

1. **Phase 1**: Fix syntax errors
   - Search for all `?.` usage
   - Replace with safe null checks
   - Deploy and check for `SyntaxError` resolution

2. **Phase 2**: Fix start locations
   - Generate test map
   - Check log for start location failures
   - Adjust mountain percentages if needed (try 5% mountains, 12% hills)
   - Re-test until civs place successfully

3. **Phase 3**: Validate physics features
   - Once stable, verify mountains follow convergent boundaries
   - Check that climate/coastlines use WorldModel data

## Additional Context

- **Platform**: macOS (Darwin 24.6.0)
- **Mod location**: `~/Library/Application Support/Civilization VII/Mods/swooper-maps/`
- **Recent major changes**:
  - Phase 1.5: Refactored plates to use base game Voronoi
  - Phase 2: Physics-based mountains, climate pressure, coastal ruggedness
  - Bootstrap rename: `config/` → `bootstrap/`

## What NOT to Do

- Don't refactor architecture - it works fine
- Don't touch bootstrap system - imports are correct
- Don't worry about base game script imports - those aren't the issue
- Focus ONLY on syntax errors and start location placement

---

**Start by reading DEPLOYMENT_DEBUG_CONTEXT.md for complete technical details, then fix the syntax errors first.**
