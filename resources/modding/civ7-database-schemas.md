# Civilization VII Database Schemas

## Overview

Civilization VII organizes game data in a relational database structure defined by schema files. These schemas outline the tables, columns, relationships, and constraints that govern all game elements. Understanding these schemas is essential for creating effective mods, as they define how data must be structured to be recognized and processed by the game.

This document provides a comprehensive reference to the key database schemas that power Civilization VII. These schemas are defined in various `.civdb` and `.sql` files within the game's installation, primarily in the base-standard module.

## Schema File Locations

The primary schema definitions can be found in:

1. **Base Game Definition Schemas**: `/Base/modules/base-standard/definitions/*.civdb` files
2. **Database System Schemas**: `/Base/Assets/schema/` directory (subdirectories for specific systems)

## Core Gameplay Schema

The core gameplay schema defines the fundamental game mechanics, entities, and relationships in Civilization VII.

**File Location**: `/Base/Assets/schema/gameplay/01_GameplaySchema.sql`

This schema serves as the foundation for all gameplay elements, establishing the data structures for civilizations, leaders, units, buildings, and core mechanics.

### Key Table Structures

The core gameplay database includes hundreds of interrelated tables. Here are some of the most important ones for modders:

#### Civilizations

```sql
CREATE TABLE "Civilizations" (
  "CivilizationType" TEXT NOT NULL,
  "Name" TEXT NOT NULL,
  "Adjective" TEXT NOT NULL,
  "Description" TEXT,
  "Icon" TEXT,
  "SortIndex" INTEGER,
  PRIMARY KEY("CivilizationType")
);

CREATE TABLE "CivilizationTraits" (
  "CivilizationType" TEXT NOT NULL,
  "TraitType" TEXT NOT NULL,
  PRIMARY KEY("CivilizationType", "TraitType"),
  FOREIGN KEY("CivilizationType") REFERENCES Civilizations("CivilizationType"),
  FOREIGN KEY("TraitType") REFERENCES Traits("TraitType")
);
```

These tables define civilizations and associate them with traits (abilities). When adding a new civilization, you'll need to insert rows into both of these tables.

#### Leaders

```sql
CREATE TABLE "Leaders" (
  "LeaderType" TEXT NOT NULL,
  "Name" TEXT NOT NULL,
  "IsPlayable" BOOLEAN NOT NULL DEFAULT true,
  "Icon" TEXT,
  "SortIndex" INTEGER,
  PRIMARY KEY("LeaderType")
);

CREATE TABLE "LeaderTraits" (
  "LeaderType" TEXT NOT NULL,
  "TraitType" TEXT NOT NULL,
  PRIMARY KEY("LeaderType", "TraitType"),
  FOREIGN KEY("LeaderType") REFERENCES Leaders("LeaderType"),
  FOREIGN KEY("TraitType") REFERENCES Traits("TraitType")
);

CREATE TABLE "CivilizationLeaders" (
  "CivilizationType" TEXT NOT NULL,
  "LeaderType" TEXT NOT NULL,
  "Legacy" BOOLEAN DEFAULT false,
  PRIMARY KEY("CivilizationType", "LeaderType"),
  FOREIGN KEY("CivilizationType") REFERENCES Civilizations("CivilizationType"),
  FOREIGN KEY("LeaderType") REFERENCES Leaders("LeaderType")
);
```

These tables define leaders, their traits, and which civilizations they can lead. The CivilizationLeaders table is crucial for connecting leaders to civilizations.

#### Units

```sql
CREATE TABLE "Units" (
  "UnitType" TEXT NOT NULL,
  "Name" TEXT NOT NULL,
  "Description" TEXT,
  "Domain" TEXT NOT NULL,
  "FormationClass" TEXT,
  "Cost" INTEGER,
  "Maintenance" INTEGER,
  "BaseMoves" INTEGER,
  "Combat" INTEGER,
  "RangedCombat" INTEGER,
  "Range" INTEGER,
  "PrereqTech" TEXT,
  "PrereqCivic" TEXT,
  "PrereqResource" TEXT,
  "PrereqDistrict" TEXT,
  "Upgrades" TEXT,
  "ReplacesUnitType" TEXT,
  "PromotionClass" TEXT,
  PRIMARY KEY("UnitType")
);
```

This table defines the base attributes of units. Additional tables like UnitAbilities, UnitBuilds, and UnitUpgrades would extend this with more specific functionality.

#### Buildings and Quarters (Districts)

```sql
CREATE TABLE "Buildings" (
  "BuildingType" TEXT NOT NULL,
  "Name" TEXT NOT NULL,
  "Description" TEXT,
  "Cost" INTEGER,
  "Maintenance" INTEGER,
  "PrereqTech" TEXT,
  "PrereqCivic" TEXT,
  "PrereqDistrict" TEXT,
  "ReplacementBuildingType" TEXT,
  "IsWonder" BOOLEAN DEFAULT false,
  PRIMARY KEY("BuildingType")
);

CREATE TABLE "Districts" (
  "DistrictType" TEXT NOT NULL,
  "Name" TEXT NOT NULL,
  "Description" TEXT,
  "Cost" INTEGER,
  "Maintenance" INTEGER,
  "PrereqTech" TEXT,
  "IsSpecialized" BOOLEAN DEFAULT false,
  PRIMARY KEY("DistrictType")
);
```

These tables define buildings and districts (called Quarters in Civilization VII). Additional tables for adjacency bonuses, yields, and placement restrictions would extend these definitions.

## Modding Framework Schema

The modding framework schema defines how mods are structured, discovered, loaded, and applied to the base game.

**File Location**: `/Base/Assets/schema/modding/schema-modding-10.sql`

This schema is crucial for understanding how to properly package and deploy mods in Civilization VII.

### Key Table Structures

```sql
CREATE TABLE Mods(
    'ModRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    'ScannedFileRowId' INTEGER NOT NULL, 
    'ModId' TEXT NOT NULL,
    'Version' INTEGER NOT NULL,
    'Disabled' BOOLEAN,
    FOREIGN KEY(ScannedFileRowId) REFERENCES ScannedFiles(ScannedFileRowId) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE ModProperties(
    'ModRowId' INTEGER NOT NULL, 
    'Name' TEXT NOT NULL, 
    'Value' TEXT, 
    PRIMARY KEY ('ModRowId', 'Name'), 
    FOREIGN KEY ('ModRowId') REFERENCES Mods('ModRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE ActionGroups(
    'ActionGroupRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    'ModRowId' INTEGER NOT NULL,
    'Id' TEXT NOT NULL,
    'Scope' TEXT NOT NULL,
    'CriteriaId' TEXT,
    FOREIGN KEY('ModRowId') REFERENCES Mods('ModRowId') ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE('ModRowId', 'Id')
);

CREATE TABLE Actions(
    'ActionRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    'ActionGroupRowId' INTEGER NOT NULL,
    'ActionType' TEXT NOT NULL,
    FOREIGN KEY('ActionGroupRowId') REFERENCES ActionGroups('ActionGroupRowId') ON DELETE CASCADE ON UPDATE CASCADE
);
```

These tables define how mods are tracked by the game, what properties they have, and what actions they perform. When you create a .modinfo file, you're essentially providing information that will populate these tables.

### Action Types

The modding system supports different action types that can be triggered by mods:

- **UpdateDatabase**: Adds or modifies data in the game database 
- **UpdateText**: Updates or adds localized text
- **ReplaceUIScript**: Replaces a UI JavaScript file
- **AddUserInterfaces**: Adds custom UI components
- **ImportFiles**: Imports external files into the game

Each action type corresponds to a specialized table that stores the parameters for that action.

## Icon Management Schema

The icon management schema defines how icons for various game elements are organized and displayed.

**File Location**: `/Base/Assets/schema/icons/IconManager.sql`

Icons are a crucial visual component of the game, representing civilizations, units, buildings, and other elements.

### Key Table Structures

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

The Icons table defines unique identifiers for icons, while IconDefinitions specifies the visual representation at different sizes. When adding custom icons for a mod, you'll need to reference these schemas to properly register your icons.

## World Builder Map Schema

This schema defines the structure for map generation, terrain features, and the World Builder tool.

**File Location**: `/Base/Assets/schema/worldbuilder/schema-worldbuilder-map.sql`

It is particularly important for mods that create custom maps or scenarios.

### Key Table Structures

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

CREATE TABLE "Resources" (
    "PlotID" INTEGER NOT NULL,
    "ResourceType" TEXT NOT NULL,
    "Amount" INTEGER,
    PRIMARY KEY(PlotID, ResourceType),
    FOREIGN KEY(PlotID) REFERENCES Plots(ID));

CREATE TABLE "Features" (
    "PlotID" INTEGER NOT NULL,
    "FeatureType" TEXT NOT NULL,
    PRIMARY KEY(PlotID, FeatureType),
    FOREIGN KEY(PlotID) REFERENCES Plots(ID));
```

These tables define the structure of maps, including the base geography (Plots), resources, and features. When creating custom maps or modifying map generation scripts, you'll need to work with these structures.

## Localization Schema

The localization schema defines how text is stored and displayed in different languages.

**File Location**: `/Base/Assets/schema/localization/schema-loc-10.sql` and `/Base/Assets/schema/localization/schema-loc-20-languages.sql`

Proper localization is essential for mods to display text correctly to users in different languages.

### Key Table Structures

```sql
CREATE TABLE "Languages" (
    "Language" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "DisplayOrder" INTEGER NOT NULL,
    PRIMARY KEY("Language")
);

CREATE TABLE "LocalizedText" (
    "Tag" TEXT NOT NULL,
    "Language" TEXT NOT NULL,
    "Text" TEXT NOT NULL,
    PRIMARY KEY("Tag", "Language"),
    FOREIGN KEY("Language") REFERENCES Languages("Language")
);
```

The Languages table defines supported languages, while LocalizedText stores the actual translated strings. When adding text for a mod, you'll need to insert rows into the LocalizedText table.

## Frontend Schema

The frontend schema defines game setup, user interface, and metagame features.

**File Location**: `/Base/Assets/schema/frontend/` (multiple files)

Key files include:
- `schema-frontend-10-setup-parameters.sql`: Game setup parameters
- `schema-frontend-20-keybindings.sql`: Keyboard controls
- `schema-frontend-30-hof.sql`: Hall of Fame tracking
- `schema-frontend-50-setup-data.sql`: Game setup data structures

These schemas are particularly important for mods that modify the game's interface or setup options.

## Age-Specific Schema Elements

Each Age module extends the base schemas with age-specific definitions. These are defined through the .civdb files in the base-standard module but implemented differently in each Age module.

Age-specific schema elements include:
- Units available in each Age
- Buildings and Wonders specific to historical periods
- Technologies and Civics for each era
- Civilizations belonging to specific Ages

## Practical Schema Usage Examples

### Adding a New Civilization

To add a new civilization, you need to work with multiple schema tables:

```xml
<!-- Adding a new civilization -->
<Civilizations>
    <Row CivilizationType="CIVILIZATION_DACIA" 
         Name="LOC_CIVILIZATION_DACIA_NAME" 
         Adjective="LOC_CIVILIZATION_DACIA_ADJECTIVE" 
         Description="LOC_CIVILIZATION_DACIA_DESCRIPTION"
         Icon="ICON_CIVILIZATION_DACIA" />
</Civilizations>

<!-- Assigning civilization traits -->
<CivilizationTraits>
    <Row CivilizationType="CIVILIZATION_DACIA" TraitType="TRAIT_CIVILIZATION_DACIA_ABILITY" />
</CivilizationTraits>

<!-- Adding civilization to an Age domain -->
<CivilizationDomains>
    <Row CivilizationType="CIVILIZATION_DACIA" Domain="AntiquityAgeCivilizations" />
</CivilizationDomains>
```

### Creating a Leader and Connecting to Civilization

```xml
<!-- Adding a new leader -->
<Leaders>
    <Row LeaderType="LEADER_DECEBALUS" 
         Name="LOC_LEADER_DECEBALUS_NAME" 
         Icon="ICON_LEADER_DECEBALUS" />
</Leaders>

<!-- Adding leader traits -->
<LeaderTraits>
    <Row LeaderType="LEADER_DECEBALUS" TraitType="TRAIT_LEADER_DECEBALUS_ABILITY" />
</LeaderTraits>

<!-- Connecting leader to civilization -->
<CivilizationLeaders>
    <Row CivilizationType="CIVILIZATION_DACIA" LeaderType="LEADER_DECEBALUS" />
</CivilizationLeaders>

<!-- Setting civilization-leader compatibility bias -->
<LeaderCivilizationBias>
    <Row CivilizationDomain="AntiquityAgeCivilizations" 
         CivilizationType="CIVILIZATION_DACIA" 
         LeaderDomain="StandardLeaders" 
         LeaderType="LEADER_DECEBALUS" 
         Bias="4" 
         ReasonType="LOC_UNLOCK_PLAY_AS_DECEBALUS_DACIA_TOOLTIP" 
         ChoiceType="LOC_CREATE_GAME_HISTORICAL_CHOICE" />
</LeaderCivilizationBias>
```

### Defining a Unique Unit

```xml
<!-- Adding a unique unit -->
<Units>
    <Row UnitType="UNIT_DACIA_FALX_WARRIOR" 
         Name="LOC_UNIT_DACIA_FALX_WARRIOR_NAME" 
         Description="LOC_UNIT_DACIA_FALX_WARRIOR_DESCRIPTION"
         Domain="DOMAIN_LAND"
         FormationClass="FORMATION_CLASS_LAND_COMBAT"
         Cost="65"
         Maintenance="1"
         BaseMoves="2"
         Combat="36"
         ReplacesUnitType="UNIT_SWORDSMAN" />
</Units>

<!-- Connecting unit to civilization -->
<CivilizationUniqueUnits>
    <Row CivilizationType="CIVILIZATION_DACIA" UnitType="UNIT_DACIA_FALX_WARRIOR" />
</CivilizationUniqueUnits>

<!-- Adding unit abilities -->
<UnitAbilities>
    <Row UnitAbilityType="ABILITY_FALX_WARRIOR" Name="LOC_ABILITY_FALX_WARRIOR_NAME" Description="LOC_ABILITY_FALX_WARRIOR_DESCRIPTION" />
</UnitAbilities>

<UnitAbilityModifiers>
    <Row UnitAbilityType="ABILITY_FALX_WARRIOR" ModifierId="MODIFIER_FALX_WARRIOR_COMBAT_STRENGTH" />
</UnitAbilityModifiers>
```

## Important Schema Relationships

Understanding the relationships between key schema elements is crucial for effective modding:

1. **Civilizations → Traits**: Civilizations have unique abilities defined as traits
2. **Leaders → Traits**: Leaders have their own unique abilities
3. **Civilizations ↔ Leaders**: A many-to-many relationship via CivilizationLeaders
4. **Units → Civilizations**: Unique units are tied to specific civilizations
5. **Buildings → Civilizations**: Unique buildings are tied to specific civilizations
6. **Traits → Modifiers**: Traits are implemented through modifier effects
7. **Icons → Game Elements**: Visual representations are linked to game elements

## Schema Versioning and Updates

The Civilization VII schema may evolve with game updates and patches. When creating mods:

1. Always check for the latest schema definitions in your installation
2. Be aware that DLCs might extend or modify base schemas
3. Structure your mods to be resilient to minor schema changes
4. Test after game updates to ensure compatibility

## Cross-References

- For implementation guidance, see [Creating New Civilizations](civ7-creating-civilizations.md)
- For file organization, see [Civ7 Modding Architecture](civ7-modding-architecture.md)
- For examples from existing content, see [DLC and Community Mod Patterns](civ7-mod-patterns.md)

## Conclusion

The database schemas form the backbone of Civilization VII's data structure. By understanding these schemas, you can create mods that properly integrate with the game's systems and function correctly alongside other content.

For practical implementation of these schemas, refer to the other documents in this modding documentation series, particularly the guides on creating civilizations, leaders, and modifying existing content. 