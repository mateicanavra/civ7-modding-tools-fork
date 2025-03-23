# Civilization VII Modding Reference Guide

This document serves as a comprehensive reference for modding Civilization VII, specifically for creating custom civilization mods. It documents key game files, schemas, and structures essential for understanding the game's architecture and implementing custom content.

## Base Game Assets and Schemas

The foundational database schemas and asset management files that define how the game stores and organizes data.

### Core Gameplay Schema

**File Path:** `/Resources/Base/Assets/schema/gameplay/01_GameplaySchema.sql`

This file defines the core gameplay database structure, containing the primary tables that store game mechanics, entities, and relationships. This is the foundation for all gameplay elements and should be the first reference when understanding how data is organized in Civilization VII.

Key components include:
- Civilization definitions
- Leader properties
- Unit specifications
- Building and improvement data structures
- Gameplay mechanics relationships

### Modding Framework Schema

**File Path:** `/Resources/Base/Assets/schema/modding/schema-modding-10.sql`

This schema defines how mods are structured and loaded into the game. Understanding this schema is crucial for properly packaging and deploying mods.

Key components include:
```sql
-- Primary table of all discovered mods
CREATE TABLE Mods(
    'ModRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    'ScannedFileRowId' INTEGER NOT NULL, 
    'ModId' TEXT NOT NULL,
    'Version' INTEGER NOT NULL,
    'Disabled' BOOLEAN,
    FOREIGN KEY(ScannedFileRowId) REFERENCES ScannedFiles(ScannedFileRowId) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Name/Value pair representing properties of a mod.
CREATE TABLE ModProperties(
    'ModRowId' INTEGER NOT NULL, 
    'Name' TEXT NOT NULL, 
    'Value' TEXT, 
    PRIMARY KEY ('ModRowId', 'Name'), 
    FOREIGN KEY ('ModRowId') REFERENCES Mods('ModRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- Actions that mods can perform
CREATE TABLE Actions(
    'ActionRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    'ActionGroupRowId' INTEGER NOT NULL,
    'ActionType' TEXT NOT NULL,
    FOREIGN KEY('ActionGroupRowId') REFERENCES ActionGroups('ActionGroupRowId') ON DELETE CASCADE ON UPDATE CASCADE
);
```

This schema outlines how mods are discovered, loaded, and applied to the base game, including the tables for mod properties, relationships, actions, and localized text.

### Icon Management Schema

**File Path:** `/Resources/Base/Assets/schema/icons/IconManager.sql`

This schema defines how the game manages icons for various game elements. For modders, this is essential when adding custom icons for civilizations, units, buildings, or other visual elements.

Key components include:
```sql
CREATE TABLE 'Icons' (
    'ID' TEXT NOT NULL,
    'Context' TEXT DEFAULT 'DEFAULT',
    PRIMARY KEY('ID','Context'),
    FOREIGN KEY('Context') REFERENCES IconContexts('Context')
);

CREATE TABLE 'IconDefinitions' (
    'ID' TEXT NOT NULL,
    'Context' TEXT NOT NULL DEFAULT 'DEFAULT',
    'IconSize' INTEGER NOT NULL DEFAULT 0,
    'Path' Text NOT NULL,
    'NeedsTinting' INTEGER DEFAULT 0,
    'FitToContent' INTEGER DEFAULT 0,
    'InteractiveTop' INTEGER,
    'InteractiveRight' INTEGER,
    'InteractiveBottom' INTEGER,
    'InteractiveLeft' INTEGER,
    PRIMARY KEY('ID', 'Context', 'IconSize'),
    FOREIGN KEY('ID', 'Context') REFERENCES Icons ('ID', 'Context') ON DELETE CASCADE ON UPDATE CASCADE
);
```

The schema includes tables for icon contexts, definitions, aliases, and chat icon groups, providing a flexible system for defining and referencing visual elements.

### World Builder Map Schema

**File Path:** `/Resources/Base/Assets/schema/worldbuilder/schema-worldbuilder-map.sql`

This schema defines the structure for map generation, world building, and age transitions. Understanding this schema is important for mods that affect world generation or implement custom map features.

Key components include:
```sql
CREATE TABLE "Map" (
    "ID" TEXT NOT NULL,
    "Width" INTEGER,
    "Height" INTEGER,
    "TopLatitude" INTEGER,
    "BottomLatitude" INTEGER,
    "WrapX" BOOLEAN,
    "WrapY" BOOLEAN,
    "MapSizeType" TEXT,
    PRIMARY KEY(ID));

CREATE TABLE "Plots" (
    "ID" INTEGER NOT NULL,
    "TerrainType" TEXT NOT NULL,
    "BiomeType" TEXT,
    "ContinentType" TEXT,
    "Elevation" INTEGER,
    "IsImpassable" BOOLEAN,
    "Tag" INTEGER,
    PRIMARY KEY(ID));
```

The schema covers map attributes, plots, resources, features, improvements, routes, civilizations, units, cities, and other map-related entities.

### Localization Schema

**File Path:** `/Resources/Base/Assets/schema/localization/schema-loc-10.sql` and `/Resources/Base/Assets/schema/localization/schema-loc-20-languages.sql`

These files define how text is stored and displayed in different languages, essential for ensuring your mod supports multiple languages properly.

Key aspects include:
- Language definitions
- Text string storage
- Tag-based text referencing 
- Localization contexts

### Frontend Schema

**File Path:** `/Resources/Base/Assets/schema/frontend/`

This directory contains multiple SQL files defining the game's frontend and UI functionality:

- `schema-frontend-10-setup-parameters.sql`: Game setup and configuration parameters
- `schema-frontend-20-keybindings.sql`: Keyboard control mappings
- `schema-frontend-30-hof.sql`: Hall of Fame and achievement tracking
- `schema-frontend-40-misc.sql`: Miscellaneous frontend features
- `schema-frontend-50-setup-data.sql`: Game setup data structures
- `schema-frontend-60-xr.sql`: Extended reality support
- `schema-frontend-70-metagaming.sql`: Metagame features and progression

These schemas are important when creating mods that interact with the UI or add new interface elements.

## Age-Specific Modules

Civilization VII introduces a significant innovation with its Age system. The game is divided into three distinct Ages (Antiquity, Exploration, and Modern), each with its own set of civilizations, units, buildings, and mechanics. Each Age is implemented as a separate module in the game files.

### Common Age Module Structure

All three Age modules share a similar structure with the following elements:

#### Configuration File
**File Path:** `/Resources/Base/modules/age-[name]/config/config.xml`

This XML file defines the core properties of each Age, including available civilizations, unique abilities, units, and buildings, as well as leader-civilization compatibility.

#### Module Definition File
**File Path:** `/Resources/Base/modules/age-[name]/age-[name].modinfo`

This file defines the Age as a module within the game system, specifying actions, file paths, and dependencies.

#### Common Data Directories
Each Age module includes these standard directories:
- **civilizations/**: Civilization-specific properties and abilities
- **leaders/**: Leader attributes and compatibilities 
- **units/**: Unit definitions for the Age
- **buildings/**: Building specifications
- **progressions/**: Tech and civic trees
- **icons/**: Visual assets for UI elements

The icon files follow a similar pattern across Ages, with specific content for each time period:
- `civilization-icons.xml`: Civilization symbols
- `unit-icons.xml`: Unit representations
- `building-icons.xml`: Building symbols
- `resource-icons.xml`: Resource imagery

### Antiquity Age (3000 BCE - 500 CE)

**File Path:** `/Resources/Base/modules/age-antiquity/`

The Antiquity Age represents ancient civilizations and early empire development.

#### Unique Features
- **Civilizations**: Egypt, Rome, Greece, Persia, Han, Aksum, Khmer, Maurya, Maya, Mississippian
- **Unique Content**:
  - **wonders/**: Ancient wonders like the Pyramids and Colosseum
  - **religion/**: Early religious systems (plays a minor role in this Age)
  - **independent-powers/**: Early tribal and city-state entities

Example from config.xml:
```xml
<Ages>
    <Row AgeType="AGE_ANTIQUITY" Name="LOC_AGE_ANTIQUITY_NAME" Description="LOC_AGE_ANTIQUITY_DESCRIPTION" PlayerCivilizationDomain="AntiquityAgeCivilizations" DefeatDomain="AntiquityDefeats" VictoryDomain="AntiquityVictories" MapSizeDomain="DistantLandsMapSizes" Banner="age-sel_antiquity_full" SortIndex="10"/>
</Ages>
```

### Exploration Age (500 CE - 1700 CE)

**File Path:** `/Resources/Base/modules/age-exploration/`

The Exploration Age represents the era of global navigation, colonization, and cultural exchange.

#### Unique Features
- **Civilizations**: Spain, Norman, Ming, Abbasid, Chola, Hawaii, Inca, Majapahit, Mongolia, Songhai
- **Unique Content**:
  - **religion/**: Enhanced religious mechanics that become a major gameplay driver
  - **naval/**: Advanced naval exploration and combat units
  - **trade/**: Expanded trade routes and mechanics
  - **legacies/**: Age transition legacy bonuses from Antiquity
  - **distant-lands/**: Expanded map areas accessible through naval exploration

Example from config.xml:
```xml
<Ages>
    <Row AgeType="AGE_EXPLORATION" Name="LOC_AGE_EXPLORATION_NAME" Description="LOC_AGE_EXPLORATION_DESCRIPTION" PlayerCivilizationDomain="ExplorationAgeCivilizations" DefeatDomain="ExplorationDefeats" VictoryDomain="ExplorationVictories" MapSizeDomain="DistantLandsMapSizes" Banner="age-sel_exploration_full" SortIndex="20"/>
</Ages>
```

### Modern Age (1700 CE - Present)

**File Path:** `/Resources/Base/modules/age-modern/`

The Modern Age represents industrialization, global conflicts, and technological advancement.

#### Unique Features
- **Civilizations**: America, Russia, Prussia, French Empire, Mexico, Mughal, Meiji, Qing, Buganda, Siam
- **Unique Content**:
  - **victories/**: Victory condition definitions and requirements
  - **global-systems/**: World Congress, Climate Change, etc.
  - **advanced-units/**: Aircraft, tanks, and modern military units
  - **projects/**: Space race and other advanced projects
  - **diplomacy/**: Enhanced diplomatic options and alliances

Example from config.xml:
```xml
<Ages>
    <Row AgeType="AGE_MODERN" Name="LOC_AGE_MODERN_NAME" Description="LOC_AGE_MODERN_DESCRIPTION" PlayerCivilizationDomain="ModernAgeCivilizations" DefeatDomain="ModernDefeats" VictoryDomain="ModernVictories" MapSizeDomain="StandardMapSizes" Banner="age-sel_modern_full" SortIndex="30"/>
</Ages>
```

### Age Transitions

The game's Age system is designed to address issues with traditional Civilization gameplay such as snowballing, micromanagement, and civilization balance. Each Age transition provides:

1. **Civilization Selection**: Choose a new civilization suited to the new Age
2. **Legacy Bonuses**: Benefits carried forward from completing Legacy Paths
3. **Persistent Elements**: 
   - Leaders remain the same across Ages
   - Wonders and unique Quarters persist as "Ageless" structures
   - Commander units maintain attributes and experience
   - Traditions unlocked from Civic trees remain available

For modding purposes, understanding these transitions is crucial when designing civilizations that work within the Age framework.

## Base-Standard Module

The base-standard module is the foundational module for Civilization VII, containing age-agnostic mechanics and definitions that apply throughout the entire game. This module serves as the backbone for all gameplay, regardless of which Age the player is in.

**File Path:** `/Resources/Base/modules/base-standard/`

### Core Structure

The base-standard module has a similar structure to the age-specific modules but contains more fundamental elements:

- **Module Definition File**: `/Resources/Base/modules/base-standard/base-standard.modinfo`
- **Package Definition**: `/Resources/Base/modules/base-standard/package.json`

The modinfo file defines the module's structure, dependencies, and contains references to all its content. The package.json file defines basic metadata about the module.

### Definitions Folder

**File Path:** `/Resources/Base/modules/base-standard/definitions/`

This is one of the most important directories for modders, containing the database schemas that define core game objects. These files are essential reference points when creating new civilizations, leaders, units, or other game elements.

#### Key Definition Files for Civilization Modding:

##### civilization.civdb

**File Path:** `/Resources/Base/modules/base-standard/definitions/civilization.civdb`

This file defines the structure of civilizations in the game. Key components include:

- **Civilization Types**: Basic civilization identifiers and properties
- **Civilization Tags**: Categorization (Military, Economic, etc.)
- **Unique Abilities**: Special bonuses and traits
- **Unique Units**: Civilization-specific military and civilian units
- **Unique Infrastructure**: Special buildings, quarters, and improvements

Example structure:
```json
{
  "Tables": [
    {
      "Name": "Civilizations",
      "Columns": [
        {"Name": "CivilizationType", "Type": "TEXT", "NotNull": true},
        {"Name": "Name", "Type": "TEXT", "NotNull": true},
        {"Name": "Adjective", "Type": "TEXT", "NotNull": true},
        {"Name": "Description", "Type": "TEXT", "NotNull": false},
        {"Name": "Icon", "Type": "TEXT", "NotNull": false},
        {"Name": "SortIndex", "Type": "INTEGER", "NotNull": false}
      ],
      "PrimaryKey": {"Name": "PK_Civilizations", "Columns": ["CivilizationType"]}
    },
    {
      "Name": "CivilizationTraits",
      "Columns": [
        {"Name": "CivilizationType", "Type": "TEXT", "NotNull": true},
        {"Name": "TraitType", "Type": "TEXT", "NotNull": true}
      ],
      "PrimaryKey": {"Name": "PK_CivilizationTraits", "Columns": ["CivilizationType", "TraitType"]}
    }
  ]
}
```

When modding a new civilization, you will need to define entries in these tables to establish the civilization's identity and abilities.

##### leader.civdb

**File Path:** `/Resources/Base/modules/base-standard/definitions/leader.civdb`

This file defines leader properties and mechanics. Leaders in Civilization VII are distinct from civilizations and can be paired with different civilizations across Ages.

Key components include:
- **Leader Types**: Basic leader identifiers
- **Leader Traits**: Special abilities and bonuses
- **Leader Agendas**: AI behavior patterns
- **Leader Attributes**: Personality traits and stats that can level up

Example structure:
```json
{
  "Tables": [
    {
      "Name": "Leaders",
      "Columns": [
        {"Name": "LeaderType", "Type": "TEXT", "NotNull": true},
        {"Name": "Name", "Type": "TEXT", "NotNull": true},
        {"Name": "IsPlayable", "Type": "BOOLEAN", "NotNull": true, "Default": true},
        {"Name": "Icon", "Type": "TEXT", "NotNull": false},
        {"Name": "SortIndex", "Type": "INTEGER", "NotNull": false}
      ],
      "PrimaryKey": {"Name": "PK_Leaders", "Columns": ["LeaderType"]}
    },
    {
      "Name": "LeaderTraits",
      "Columns": [
        {"Name": "LeaderType", "Type": "TEXT", "NotNull": true},
        {"Name": "TraitType", "Type": "TEXT", "NotNull": true}
      ],
      "PrimaryKey": {"Name": "PK_LeaderTraits", "Columns": ["LeaderType", "TraitType"]}
    }
  ]
}
```

##### unit.civdb

**File Path:** `/Resources/Base/modules/base-standard/definitions/unit.civdb`

This file defines unit mechanics and properties. When creating unique units for your civilization, you'll reference this structure.

Key components include:
- **Unit Types**: Basic unit identifiers and properties
- **Unit Classes**: Categories and roles
- **Combat Stats**: Attack, defense, movement, etc.
- **Promotion Trees**: Unit advancement paths

##### constructible.civdb

**File Path:** `/Resources/Base/modules/base-standard/definitions/constructible.civdb`

This file defines buildings, improvements, and other constructible elements. When creating unique infrastructure for your civilization, you'll reference this structure.

Key components include:
- **Building Types**: Basic building identifiers and properties
- **Building Effects**: Yield bonuses, special abilities
- **Improvement Types**: Terrain improvements
- **Quarter Types**: District-like areas in cities

#### Other Important Definition Files:

- **modifier-system.civdb**: Defines how buffs, debuffs, and other modifiers work
- **victory.civdb**: Victory condition definitions
- **diplomacy.civdb**: Diplomatic relationships and options
- **age.civdb**: Age mechanics and transitions
- **culture.civdb**: Cultural mechanics and systems
- **religion.civdb**: Religious systems and mechanics

### Implementation Patterns

When implementing a new civilization, you'll need to follow certain patterns established in the base game:

#### Civilization Implementation Flow

1. **Define the Civilization Type**: Create a unique identifier and basic properties
2. **Assign Age Category**: Determine which Age the civilization belongs to (Antiquity, Exploration, or Modern)
3. **Define Unique Ability**: Create a special trait that reflects the civilization's historical strengths
4. **Create Unique Units**: Design military and civilian units specific to the civilization
5. **Design Unique Infrastructure**: Create special buildings, quarters, or improvements
6. **Establish Leader Compatibility**: Define which leaders work well with the civilization
7. **Create Visual Assets**: Design civilization symbols, unit graphics, and building models
8. **Write Localization Text**: Create text entries for names, descriptions, and historical information

#### Leader-Civilization Compatibility

In Civilization VII, leaders and civilizations are designed to be mixed and matched, but with historical preferences. When implementing a custom leader, consider:

1. **Historical Accuracy**: Assign higher compatibility to leaders with historical connections
2. **Gameplay Synergy**: Consider how leader abilities complement civilization bonuses
3. **Geographic Proximity**: Leaders from nearby regions often have higher compatibility

Example pattern from existing game files:
```xml
<LeaderCivilizationBias>
    <Row CivilizationDomain="AntiquityAgeCivilizations" CivilizationType="CIVILIZATION_ROME" LeaderDomain="StandardLeaders" LeaderType="LEADER_AUGUSTUS" Bias="4" ReasonType="LOC_UNLOCK_PLAY_AS_AUGUSTUS_ROME_TOOLTIP" ChoiceType="LOC_CREATE_GAME_HISTORICAL_CHOICE" />
</LeaderCivilizationBias>
```

### Data Structure for Gameplay Elements

**File Path:** `/Resources/Base/modules/base-standard/data/`

This directory contains the implementation of game mechanics defined in the definitions folder. Key subdirectories include:

- **civilizations/**: XML files defining each base civilization
- **leaders/**: XML files defining each leader
- **traits/**: XML files defining traits for both civilizations and leaders
- **units/**: XML files defining unit types and properties
- **buildings/**: XML files defining building types and properties
- **techs/**: XML files defining technology trees
- **civics/**: XML files defining civic trees

When creating a custom civilization mod, you'll need to create similar XML files that define your custom content following these patterns.

Example civilization implementation pattern:
```xml
<Civilizations>
    <Row CivilizationType="CIVILIZATION_CUSTOM" Name="LOC_CIVILIZATION_CUSTOM_NAME" Adjective="LOC_CIVILIZATION_CUSTOM_ADJECTIVE" StartingTechType="TECH_POTTERY" StartingCivicType="CIVIC_CODE_OF_LAWS" FavoredReligion="RELIGION_PAGANISM"/>
</Civilizations>
<CivilizationAbilities>
    <Row CivilizationType="CIVILIZATION_CUSTOM" TraitType="TRAIT_CUSTOM_ABILITY"/>
</CivilizationAbilities>
<CivilizationUniqueUnits>
    <Row CivilizationType="CIVILIZATION_CUSTOM" UnitType="UNIT_CUSTOM_WARRIOR"/>
</CivilizationUniqueUnits>
```

### Icon Sets and Visual Assets

**File Path:** `/Resources/Base/modules/base-standard/data/icons/`

This directory contains XML files defining icons for various game elements. When creating a civilization mod, you'll need to reference or extend these files:

- **civilization-icons.xml**: Civilization symbols and banners
- **leader-icons.xml**: Leader portraits
- **unit-icons.xml**: Unit representations
- **building-icons.xml**: Building symbols

Example civilization icon definition:
```xml
<Row ID="ICON_CIVILIZATION_CUSTOM" Context="Civilizations">
    <Path>path/to/custom_symbol.png</Path>
</Row>
```

When creating icons for your mod, you can either:
1. Reference existing game icons using the blp: path prefix
2. Include custom images in your mod package and reference them with relative paths

### Practical Implementation Considerations

When creating a custom civilization mod:

1. **Study Similar Civilizations**: Look at existing civilizations from the appropriate Age for patterns
2. **Balance Unique Abilities**: Ensure abilities fit the Age and aren't overpowered
3. **Age Compatibility**: Define how your civilization transitions to later Ages (what civilizations it can unlock)
4. **Historical Accuracy**: Research the civilization's history to inform ability and unit design
5. **Visual Consistency**: Follow the game's artistic style for icons and assets

By understanding the base-standard module structure, you can create a civilization mod that integrates seamlessly with the game's mechanics and feels like an authentic addition to Civilization VII.

## DLC Reference

Official DLC (Downloadable Content) for Civilization VII serves as excellent examples for modders, demonstrating how to properly implement new civilizations, leaders, and other content in a way that integrates seamlessly with the base game.

**File Path:** `/Resources/DLC/`

### DLC Structure

Each official DLC follows a structure similar to mods but with tighter integration with the base game:

- **[DLC_Name]/**: Main directory for the DLC content
  - **[DLC_Name].modinfo**: Definition file for the DLC
  - **data/**: Main data files implementing the DLC content
  - **ui/**: UI assets specific to the DLC
  - **text/**: Localization files
  - **icons/**: Visual assets and icons

DLCs in Civilization VII typically come in pairs:
- **Content DLC**: Contains the actual gameplay content (e.g., `great-britain/`)
- **Shell DLC**: Contains metadata for platforms and storefronts (e.g., `great-britain-shell/`)

### Leader Implementation Examples

DLCs like those for Ada Lovelace, Napoleon, and Tecumseh provide excellent references for implementing new leaders:

**File Path:** `/Resources/DLC/ada-lovelace/data/leaders/`

Leaders are defined through a set of interrelated files:
1. **leader_[name].xml**: Basic leader definition
2. **leader_[name]_traits.xml**: Leader's unique abilities
3. **leader_[name]_agenda.xml**: AI behavior patterns
4. **leader_[name]_agendas.xml**: Leader's preferences and dislikes

Example of a leader definition from DLC:
```xml
<Leaders>
  <Row LeaderType="LEADER_ADA_LOVELACE" Name="LOC_LEADER_ADA_LOVELACE_NAME" InheritFrom="LEADER_DEFAULT" SceneLighting="LEADER_ADA_LOVELACE_LIGHTING"/>
</Leaders>
<LeaderTraits>
  <Row LeaderType="LEADER_ADA_LOVELACE" TraitType="TRAIT_LEADER_ADA_LOVELACE_ABILITY"/>
</LeaderTraits>
<LeaderQuotes>
  <Row LeaderType="LEADER_ADA_LOVELACE" Quote="LOC_LEADER_ADA_LOVELACE_QUOTE"/>
</LeaderQuotes>
```

### Civilization Implementation Examples

DLCs such as Great Britain, Carthage, and Bulgaria demonstrate how to implement new civilizations:

**File Path:** `/Resources/DLC/great-britain/data/civilizations/`

Civilizations are defined through:
1. **civilization_[name].xml**: Basic civilization definition
2. **civilization_[name]_traits.xml**: Civilization's unique abilities
3. **civilization_[name]_units.xml**: Unique units
4. **civilization_[name]_buildings.xml**: Unique buildings/infrastructure

Example of a civilization definition from DLC:
```xml
<Civilizations>
  <Row CivilizationType="CIVILIZATION_GREAT_BRITAIN" Name="LOC_CIVILIZATION_GREAT_BRITAIN_NAME" Adjective="LOC_CIVILIZATION_GREAT_BRITAIN_ADJECTIVE" StartingTechType="TECH_POTTERY" StartingCivicType="CIVIC_CODE_OF_LAWS" FavoredReligion="RELIGION_PROTESTANTISM"/>
</Civilizations>
<CivilizationAbilities>
  <Row CivilizationType="CIVILIZATION_GREAT_BRITAIN" TraitType="TRAIT_CIVILIZATION_GREAT_BRITAIN_ABILITY"/>
</CivilizationAbilities>
```

### Integration with Age System

DLC content in Civilization VII demonstrates how to properly integrate with the Age system:

1. **Age Assignment**: DLC civilizations are assigned to specific Ages
   ```xml
   <CivilizationDomains>
     <Row CivilizationType="CIVILIZATION_BULGARIA" Domain="ModernAgeCivilizations"/>
   </CivilizationDomains>
   ```

2. **Age Transitions**: DLC civilizations define how they unlock civilizations in later Ages
   ```xml
   <CivilizationUnlocks>
     <Row CivilizationType="CIVILIZATION_CARTHAGE" AgeDomain="StandardAges" AgeType="AGE_EXPLORATION" Type="CIVILIZATION_MAJAPAHIT" Kind="KIND_CIVILIZATION" Name="LOC_CIVILIZATION_MAJAPAHIT_NAME" Description="LOC_CIVILIZATION_MAJAPAHIT_DESCRIPTION" Icon="CIVILIZATION_MAJAPAHIT"/>
   </CivilizationUnlocks>
   ```

### Localization Implementation

DLCs show how to properly implement translations for in-game text:

**File Path:** `/Resources/DLC/[name]/text/`

Localization files are organized by language with XML files containing string entries:
```xml
<GameData>
  <LocalizedText>
    <Row Tag="LOC_CIVILIZATION_GREAT_BRITAIN_NAME" Language="en_US" Text="Great Britain"/>
    <Row Tag="LOC_CIVILIZATION_GREAT_BRITAIN_DESCRIPTION" Language="en_US" Text="Great Britain Empire"/>
    <Row Tag="LOC_CIVILIZATION_GREAT_BRITAIN_ADJECTIVE" Language="en_US" Text="British"/>
  </LocalizedText>
</GameData>
```

### Visual Asset Implementation

DLCs provide examples of how to package and reference visual assets:

**File Path:** `/Resources/DLC/[name]/icons/`

Icon definitions follow this pattern:
```xml
<GameData>
  <IconDefinitions>
    <Row ID="ICON_CIVILIZATION_GREAT_BRITAIN" Size="32" Path="civ_sym_great_britain_32.dds"/>
    <Row ID="ICON_CIVILIZATION_GREAT_BRITAIN" Size="45" Path="civ_sym_great_britain_45.dds"/>
    <Row ID="ICON_CIVILIZATION_GREAT_BRITAIN" Size="50" Path="civ_sym_great_britain_50.dds"/>
    <Row ID="ICON_CIVILIZATION_GREAT_BRITAIN" Size="64" Path="civ_sym_great_britain_64.dds"/>
    <Row ID="ICON_CIVILIZATION_GREAT_BRITAIN" Size="80" Path="civ_sym_great_britain_80.dds"/>
  </IconDefinitions>
</GameData>
```

This shows how icons are defined in multiple sizes for different UI contexts.

### Best Practices from DLC

When creating your own civilization mods, these DLCs demonstrate several best practices:

1. **Complete Implementation**: DLCs provide full sets of files for each feature (leaders, civilizations, units)
2. **Cross-references**: Content is well-integrated with appropriate references between files
3. **Proper Scoping**: Content is properly scoped to specific Ages
4. **Age Continuity**: Civilization transitions are logically defined
5. **Historical Authenticity**: Abilities and units are designed to reflect historical attributes
6. **Visual Consistency**: Visual assets follow the game's art style
7. **Thorough Localization**: Text is properly tagged and organized for all supported languages

### Natural Wonder DLCs

Some DLCs, like "mountain-natural-wonders", focus on adding new map features rather than civilizations. These demonstrate how to implement:

1. **Natural features and wonders**
2. **Special terrain types**
3. **New game effects tied to map elements**

Studying these DLCs can provide insights for mods that aim to enhance the game world rather than adding civilizations.

By examining official DLC implementations, modders can follow established patterns to ensure that their custom content integrates properly with the base game and maintains a similar quality and style. 