# Civilization VII Modding Reference - Planning Document

## Task Overview
Create a comprehensive readme document that outlines all relevant Civilization VII game files and schemas needed for developing the Dacia civilization mod. This will serve as a reference for understanding the game's architecture and how to properly implement mod elements.

## Document Sections

1. **Base Game Assets and Schemas**
   - `01_GameplaySchema.sql`
   - `IconManager.sql`
   - Localization schemas
   - `schema-modding-10.sql`
   - `schema-worldbuilder-map.sql`
   - Frontend schemas

2. **Age-Specific Modules**
   - Antiquity Age
     - `config.xml`
     - `.modinfo` file
     - Data folder structure
     - Icon files
   - Exploration Age
     - `config.xml`
     - `.modinfo` file
     - Data folder structure
     - Icon files
   - Modern Age
     - `config.xml`
     - `.modinfo` file
     - Data folder structure
     - Icon files

3. **Base-Standard Module**
   - Core game mechanics
   - Definitions folder (crucial for DB schema)
     - `civilization.civdb` - Focus on civilization definition structure
     - `leader.civdb` - Leader attributes and mechanics
     - `unit.civdb` - Unit specification format
     - `constructible.civdb` - Buildings and improvements
     - Other key definition files
   - Implementation patterns
     - Civilization implementation examples
     - Leader implementation workflow
     - Unique abilities/units/infrastructure integration
     - Assigning civilization to appropriate Age
   - Icon sets and visual assets
   - Data structures for gameplay elements

4. **DLC Reference**
   - Official DLC structure
   - Leader implementations (practical examples)
   - Civilization implementations (practical examples)
   - How DLCs extend the base game
   - Notable patterns in official content to follow

## Methodology
1. For each section, first identify all relevant files and their locations
2. Provide brief descriptions of each file/folder's purpose
3. Include notes on how these elements relate to modding
4. Where possible, include code snippets or structural examples
5. Complete one section at a time and check in for approval before moving to the next

## Files to Reference
- Local mod files in `/resources`
- Game files in the Civilization VII installation directory
- Documentation from official Civilization VII website

## Progress Tracking
- [x] Base Game Assets and Schemas
- [x] Age-Specific Modules
- [ ] Base-Standard Module
- [ ] DLC Reference 