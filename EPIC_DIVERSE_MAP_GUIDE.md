# Epic Diverse Huge Map Generator for Civilization VII

## 🎯 What This Is

A custom map generator that creates **massive diverse continents** with:
- **Extensive cliff systems** for dramatic terrain
- **Abundant inland lakes** of various sizes
- **Mountain ranges** with enhanced generation
- **All biome types**: tropical rainforests, tundra, deserts, grasslands, etc.
- **Enhanced features**: dense jungles, forests, taiga, oases
- **Multiple landmasses** for varied gameplay
- **Communication bridge** for external monitoring

## 📦 Installation

### ✅ Already Installed!
The mod is already set up in your Civilization VII mods directory:
```
~/Library/Application Support/Civilization VII/Mods/epic-diverse-huge-map/
```

### 🔧 Files Created:
- `maps/epic-diverse-huge.js` - The main map generator
- `config/config.xml` - Registers the map in the database  
- `text/en_us/MapText.xml` - Localizations for map name and description
- `epic-diverse-huge-map.modinfo` - Mod configuration file
- `external_map_monitor.py` - Python script for monitoring map generation
- `EPIC_DIVERSE_MAP_GUIDE.md` - This guide (you're reading it!)

## 🎮 How to Use

### 1. **Enable the Mod**
   - Launch Civilization VII
   - Go to **Main Menu → Additional Content → Mods**
   - Find "**Epic Diverse Huge Map**" in the list
   - **Enable** the mod
   - **Restart** the game

### 2. **Create a New Game**
   - Select **Create Game**
   - In the map selection dropdown, you should see:
     - **"Epic Diverse Huge"** - *Produces massive diverse continents with cliffs, extensive inland lakes, coastal regions, mountain ranges, dense jungles, tundra expanses, and maximum terrain variety.*
   - Select this map type
   - Choose **Huge** map size for best results
   - Configure other game settings as desired
   - **Start Game**

### 3. **What to Expect**
The map generator will create:
- **4 major landmasses** instead of the standard 2
- **2x more natural wonders** than normal
- **3x more lakes** than standard generators
- **Enhanced mountain chains** that connect naturally
- **Cliff systems** creating dramatic elevation changes
- **Coastal regions** with high rainfall (more jungles)
- **River valleys** that become grasslands
- **Elevation-based biomes** (mountains = tundra regardless of latitude)

## 📊 External Communication Features

### Map Generation Monitor
A Python script is included to monitor map generation in real-time:

```bash
# From anywhere on your system:
cd ~/Library/Application\ Support/Civilization\ VII/Mods/epic-diverse-huge-map/

# Live monitoring (watch map generation happen)
python3 external_map_monitor.py

# Analyze existing logs
python3 external_map_monitor.py --analyze
```

### What the Monitor Shows:
- **Map generation start/completion** with timestamps
- **Map dimensions** and settings
- **Generation phases** (cliffs, mountains, lakes, biomes, etc.)
- **Final statistics** (natural wonders, lake density, biome variety)

### Communication Protocol
The map generator outputs structured JSON messages to the game's Scripting.log:
- `EPIC_MAP_GEN_START|{json_data}` - Generation begins
- `EPIC_MAP_GEN_COMPLETE|{json_data}` - Generation finishes
- Phase-specific console messages for tracking progress

## 🗺️ Map Features Breakdown

### **Terrain Variety**
- **Cliffs**: Created using fractal noise at high elevation points
- **Mountains**: Enhanced generation with chaining algorithms
- **Lakes**: 3x normal density, clustered in low-elevation areas
- **Coasts**: Enhanced with more varied shorelines

### **Biome Distribution**
- **Tropical**: Coastal high-rainfall areas, enhanced with jungles
- **Desert**: Interior low-rainfall regions
- **Grassland**: River valleys and moderate climate zones  
- **Tundra**: High elevation and polar regions
- **All biomes**: Represented with realistic transitions

### **Enhanced Features**
- **Rainforests**: 40% chance in tropical high-rainfall areas
- **Forests**: 30% chance in temperate grassland regions
- **Taiga**: 35% chance in cold tundra areas below 300m elevation
- **More floodplains**: 6-15 tiles instead of 4-10
- **More navigable rivers**: Enhanced river generation

## 🔧 Customization

### Modify Generation Parameters
Edit `maps/epic-diverse-huge.js` (within this mod directory) to adjust:
- **Lake density**: Change `iTilesPerLakeBase / 2` to different values
- **Mountain density**: Modify `iMountainThreshold - 100`
- **Cliff frequency**: Adjust `cliffScore > 800` threshold
- **Feature density**: Change percentages in `addDiverseFeatures()`

### Add More Communication
Add custom console.log messages with structured data:
```javascript
console.log("CUSTOM_EVENT|" + JSON.stringify({
    eventType: "your_event",
    data: your_data,
    timestamp: Date.now()
}));
```

## 🚀 Advanced Usage

### External Game Analysis
The communication system enables:
- **Real-time map analysis** during generation
- **Statistical tracking** of generation parameters  
- **External tools** that react to game events
- **Data logging** for map generation research

### Integration Possibilities
- **AI training data** collection from map statistics
- **Procedural content analysis** tools
- **Game balance research** through automated testing
- **Community map sharing** with generation metadata

## 🐛 Troubleshooting

### Mod Not Appearing
1. Check the mod is in the correct directory
2. Verify all files are present (especially `.modinfo`)
3. Restart Civilization VII completely
4. Check the game's mod loading logs

### Map Generation Issues  
1. Try with **Huge** map size first
2. Check Scripting.log for error messages
3. Ensure no conflicting map mods are enabled
4. Verify the JavaScript syntax is correct

### Communication Not Working
1. Check if Scripting.log file exists and is being written to
2. Ensure the log file path is correct in the monitor script
3. Generate a map first, then analyze logs
4. Look for console.log messages manually in the log file

## 📝 Credits

- **Map Generator**: Created using Civilization VII's modding framework
- **Communication System**: Console-based bridge for external monitoring  
- **Terrain Algorithms**: Enhanced versions of base game generators
- **External Monitor**: Python script for real-time analysis

---

🎮 **Enjoy your Epic Diverse Huge maps!** These should provide incredible variety and strategic depth for your Civilization VII games.
