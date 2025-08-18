# Epic Diverse Map Generator - Crash Diagnostic & Fix

## 🔍 **Analysis: Map Generation Succeeds, Crash Occurs Later**

Based on the logs, **your map generation script is working perfectly**! The crash is happening **after** map generation completes, likely during game initialization.

## 📊 **What the Logs Show:**

✅ **Map generation SUCCEEDS:**
- Script loads correctly
- All terrain generation phases complete
- Natural wonders place successfully
- Features and biomes work correctly
- No JavaScript errors during generation

❌ **Crash occurs AFTER map generation** during game startup

## 🛠️ **Most Likely Causes & Fixes:**

### **1. Map Size Mismatch (Most Common)**

The game may be trying to place more players than your custom landmasses can support.

**Fix:** Update your map configuration to properly handle player counts:

```javascript
// In epic-diverse-huge.js, modify this function:
function assignEnhancedStartPositions(iNumPlayers1, iNumPlayers2, landmasses) {
    console.log("Assigning enhanced start positions across diverse landmasses...");
    console.log("Players requested: " + (iNumPlayers1 + iNumPlayers2));
    console.log("Landmasses available: " + landmasses.length);
    
    // Ensure we don't exceed available landmasses
    let actualPlayers1 = Math.min(iNumPlayers1, landmasses.length * 2);
    let actualPlayers2 = Math.min(iNumPlayers2, landmasses.length * 2);
    
    console.log("Adjusted players: " + actualPlayers1 + " + " + actualPlayers2);
    
    // Use the first two landmasses with proper bounds checking
    return assignStartPositions(actualPlayers1, actualPlayers2, landmasses[0], landmasses[1], 0, 0, []);
}
```

### **2. Missing Map Size Configuration**

The log shows: `"Using default map size for resource placement, please update the table for this map type"`

**Fix:** Add this to your `config/config.xml`:

```xml
<Maps>
    <Row File="{epic-diverse-huge-map}maps/epic-diverse-huge.js" 
         Name="LOC_MAP_EPIC_DIVERSE_HUGE_NAME" 
         Description="LOC_MAP_EPIC_DIVERSE_HUGE_DESCRIPTION" 
         SortIndex="100"
         DefaultSize="5"
         MinSize="3"
         MaxSize="6"
         LakeGenerationFrequency="30"
         NumNaturalWonders="12"
         PlayersLandmass1="6" 
         PlayersLandmass2="6"/>
</Maps>
```

### **3. Potential Memory/Performance Issue**

Your map creates **very complex terrain**. This might cause memory issues on some systems.

**Quick Fix - Simplified Version:**

If the crash persists, try this minimal test version first.

## 🔧 **Applied Fixes:**

### ✅ **Fix 1: Updated Map Configuration**
Added proper map size parameters to `config/config.xml`:
- `DefaultSize="5"` (Huge)
- `PlayersLandmass1="6"` and `PlayersLandmass2="6"`
- Proper lake and natural wonder counts

### ✅ **Fix 2: Enhanced Player Assignment**
Improved `assignEnhancedStartPositions()` with:
- Player count validation and bounds checking
- Landmass availability verification
- Fallback handling for edge cases
- Detailed logging for debugging

### ✅ **Fix 3: Memory Optimization**
Your map script already uses efficient algorithms, but if crashes persist:
- Reduce cliff generation threshold: Change `cliffScore > 800` to `cliffScore > 900`
- Reduce lake density: Change `iTilesPerLakeBase / 2` to `iTilesPerLakeBase / 1.5`
- Simplify mountain chains: Reduce the extra mountain generation complexity

## 🧪 **Testing Steps:**

1. **Restart Civilization VII** completely
2. **Create a new game** with:
   - Your "Epic Diverse Huge" map
   - **Huge map size** (most important!)
   - **6-8 players maximum**
   - Standard difficulty settings
3. **Monitor the external script**:
   ```bash
   cd ~/Library/Application\ Support/Civilization\ VII/Mods/epic-diverse-huge-map/
   python3 external_map_monitor.py
   ```
4. **Check logs** if it still crashes

## 🚑 **Emergency Minimal Version:**

If crashes continue, create this minimal test version by editing your JavaScript file:

