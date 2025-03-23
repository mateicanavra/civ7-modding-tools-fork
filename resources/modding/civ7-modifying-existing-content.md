# Modifying Existing Content in Civilization VII

## Overview

This guide provides strategies and techniques for modifying existing content in Civilization VII. Instead of creating new elements from scratch, we'll focus on how to adjust, rebalance, and extend the game's existing civilizations, leaders, units, buildings, and gameplay systems.

## Prerequisites

Before modifying existing content, ensure you have:

1. A basic understanding of the Civilization VII modding architecture (see [Modding Architecture](civ7-modding-architecture.md))
2. Familiarity with the relevant database schemas (see [Database Schemas](civ7-database-schemas.md))
3. Knowledge of the Age system (see [Age Modules](civ7-age-modules.md))
4. The game's base files for reference
5. A working knowledge of creating content (see [Creating Civilizations](civ7-creating-civilizations.md) and [Creating Leaders](civ7-creating-leaders.md))

## Planning Your Modifications

### Modification Approaches

There are several approaches to modifying existing content:

1. **Override Approach**: Completely replace existing definitions
2. **Addition Approach**: Add new attributes or abilities to existing elements
3. **Adjustment Approach**: Alter specific values or parameters
4. **Removal Approach**: Disable or remove existing features
5. **Hybrid Approach**: Combine multiple approaches for comprehensive modifications

### Design Principles for Modifications

When modifying existing content, consider these key principles:

1. **Compatibility**: Ensure modifications work with the base game and other mods
2. **Balance**: Make changes that improve gameplay without creating overpowered elements
3. **Purpose**: Have a clear goal for each modification
4. **Theme Consistency**: Maintain the thematic integrity of the original elements
5. **Age Appropriateness**: Respect the Age system when modifying content

## Folder Structure Setup

Organize your modification mod with a clear folder structure:

```
/your-mod-name/
├── civilization_overrides/   # Modifications to existing civilizations
├── leader_overrides/         # Modifications to existing leaders
├── unit_overrides/           # Modifications to existing units
├── building_overrides/       # Modifications to existing buildings
├── gameplay_overrides/       # Modifications to gameplay systems
├── text_overrides/           # Modified localization
└── your-mod-name.modinfo     # Mod metadata file
```

## Implementation Process

### 1. Creating the Modinfo File

The `.modinfo` file defines your mod's metadata and structure:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Mod id="your-mod-name" version="1" xmlns="ModInfo">
  <Properties>
    <Name>Your Mod Name</Name>
    <Description>Description of your modifications</Description>
    <Authors>Your Name</Authors>
    <Version>1.0.0</Version>
    <AffectsSavedGames>1</AffectsSavedGames>
  </Properties>
  <Dependencies>
    <Mod id="base-standard" title="LOC_MODULE_BASE_STANDARD_NAME"/>
    <!-- Add dependencies on any DLC content you're modifying -->
  </Dependencies>
  <ActionCriteria>
    <Criteria id="always">
      <AlwaysMet/>
    </Criteria>
  </ActionCriteria>
  <ActionGroups>
    <ActionGroup id="main-group" scope="game" criteria="always">
      <Actions>
        <UpdateDatabase>
          <Item>civilization_overrides/rome_modifications.xml</Item>
          <Item>leader_overrides/trajan_modifications.xml</Item>
          <!-- Add more files as needed -->
        </UpdateDatabase>
      </Actions>
    </ActionGroup>
  </ActionGroups>
</Mod>
```

### 2. Modifying Civilizations

To modify an existing civilization, create a file like `civilization_overrides/rome_modifications.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Database>
  <!-- Modify Civilization Trait -->
  <Traits>
    <Update>
      <Where TraitType="TRAIT_CIVILIZATION_ROME_ABILITY"/>
      <Set Description="LOC_TRAIT_CIVILIZATION_ROME_ABILITY_MODIFIED_DESCRIPTION"/>
    </Update>
  </Traits>
  
  <!-- Add New Trait to Existing Civilization -->
  <CivilizationTraits>
    <Row TraitType="TRAIT_ADDITIONAL_ROME_ABILITY" CivilizationType="CIVILIZATION_ROME"/>
  </CivilizationTraits>
  
  <!-- Modify Start Bias -->
  <StartBiasBiomes>
    <Delete>
      <Where CivilizationType="CIVILIZATION_ROME" BiomeType="BIOME_DESERT"/>
    </Delete>
    <Update>
      <Where CivilizationType="CIVILIZATION_ROME" BiomeType="BIOME_PLAINS"/>
      <Set Score="50"/>
    </Update>
    <Row CivilizationType="CIVILIZATION_ROME" BiomeType="BIOME_FOREST" Score="25"/>
  </StartBiasBiomes>
</Database>
```

### 3. Modifying Leaders

To modify an existing leader, create a file like `leader_overrides/trajan_modifications.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Database>
  <!-- Modify Leader Trait -->
  <Traits>
    <Update>
      <Where TraitType="TRAIT_LEADER_TRAJAN_ABILITY"/>
      <Set Description="LOC_TRAIT_LEADER_TRAJAN_ABILITY_MODIFIED_DESCRIPTION"/>
    </Update>
  </Traits>
  
  <!-- Add New Trait to Existing Leader -->
  <LeaderTraits>
    <Row LeaderType="LEADER_TRAJAN" TraitType="TRAIT_LEADER_ADDITIONAL_ABILITY"/>
  </LeaderTraits>
  
  <!-- Modify Leader Agenda -->
  <Agendas>
    <Update>
      <Where AgendaType="AGENDA_TRAJAN"/>
      <Set Description="LOC_AGENDA_TRAJAN_MODIFIED_DESCRIPTION"/>
    </Update>
  </Agendas>
  
  <!-- Modify Leader Categories -->
  <LeaderCategories>
    <Delete>
      <Where LeaderType="LEADER_TRAJAN" CategoryType="LEADER_CATEGORY_MILITARY"/>
    </Delete>
    <Row LeaderType="LEADER_TRAJAN" CategoryType="LEADER_CATEGORY_EXPANSION"/>
  </LeaderCategories>
</Database>
```

### 4. Modifying Units

To modify existing units, create a file like `unit_overrides/unit_modifications.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Database>
  <!-- Modify Unit Stats -->
  <Unit_Stats>
    <Update>
      <Where UnitType="UNIT_WARRIOR"/>
      <Set Combat="35"/>
    </Update>
  </Unit_Stats>
  
  <!-- Modify Unit Costs -->
  <Unit_Costs>
    <Update>
      <Where UnitType="UNIT_WARRIOR" YieldType="YIELD_PRODUCTION"/>
      <Set Cost="40"/>
    </Update>
  </Unit_Costs>
  
  <!-- Add New Type Tag to Existing Unit -->
  <TypeTags>
    <Row Type="UNIT_ROMAN_LEGION" Tag="UNIT_CLASS_NEW_CLASSIFICATION"/>
  </TypeTags>
  
  <!-- Modify Unit Maintenance -->
  <Units>
    <Update>
      <Where UnitType="UNIT_WARRIOR"/>
      <Set Maintenance="1"/>
    </Update>
  </Units>
</Database>
```

### 5. Modifying Buildings and Infrastructure

To modify existing buildings, create a file like `building_overrides/building_modifications.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Database>
  <!-- Modify Building Yields -->
  <Building_YieldChanges>
    <Update>
      <Where BuildingType="BUILDING_GRANARY" YieldType="YIELD_FOOD"/>
      <Set YieldChange="3"/>
    </Update>
    <Row BuildingType="BUILDING_GRANARY" YieldType="YIELD_PRODUCTION" YieldChange="1"/>
  </Building_YieldChanges>
  
  <!-- Modify Building Costs -->
  <Building_Costs>
    <Update>
      <Where BuildingType="BUILDING_GRANARY" YieldType="YIELD_PRODUCTION"/>
      <Set Cost="60"/>
    </Update>
  </Building_Costs>
  
  <!-- Modify Building Properties -->
  <Buildings>
    <Update>
      <Where BuildingType="BUILDING_GRANARY"/>
      <Set Description="LOC_BUILDING_GRANARY_MODIFIED_DESCRIPTION"/>
    </Update>
  </Buildings>
</Database>
```

### 6. Modifying Gameplay Systems

To modify core gameplay systems, create a file like `gameplay_overrides/gameplay_modifications.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Database>
  <!-- Modify Research Costs -->
  <TechnologyCosts>
    <Update>
      <Where TechnologyType="TECH_MINING"/>
      <Set Cost="70"/>
    </Update>
  </TechnologyCosts>
  
  <!-- Modify Civic Costs -->
  <CivicCosts>
    <Update>
      <Where CivicType="CIVIC_EARLY_EMPIRE"/>
      <Set Cost="65"/>
    </Update>
  </CivicCosts>
  
  <!-- Modify Global Parameters -->
  <GlobalParameters>
    <Update>
      <Where Name="COMBAT_EXPERIENCE_PER_KILL"/>
      <Set Value="6"/>
    </Update>
    <Update>
      <Where Name="CITY_GROWTH_RATE"/>
      <Set Value="1.5"/>
    </Update>
  </GlobalParameters>
</Database>
```

### 7. Modifying Text and Localization

Create localization files in `text_overrides/modified_text.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<GameData>
  <LocalizedText>
    <!-- Modified Trait Description -->
    <Row Tag="LOC_TRAIT_CIVILIZATION_ROME_ABILITY_MODIFIED_DESCRIPTION" Language="en_US">
      <Text>Modified description of Rome's civilization ability.</Text>
    </Row>
    
    <!-- Modified Leader Ability -->
    <Row Tag="LOC_TRAIT_LEADER_TRAJAN_ABILITY_MODIFIED_DESCRIPTION" Language="en_US">
      <Text>Modified description of Trajan's leader ability.</Text>
    </Row>
    
    <!-- Modified Agenda -->
    <Row Tag="LOC_AGENDA_TRAJAN_MODIFIED_DESCRIPTION" Language="en_US">
      <Text>Modified description of Trajan's agenda.</Text>
    </Row>
    
    <!-- Modified Building Description -->
    <Row Tag="LOC_BUILDING_GRANARY_MODIFIED_DESCRIPTION" Language="en_US">
      <Text>Modified description of the Granary building.</Text>
    </Row>
  </LocalizedText>
</GameData>
```

## Advanced Modification Techniques

### Modifying Traits and Abilities through Modifiers

To modify how traits and abilities function, you can update their modifier connections:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Database>
  <!-- Delete an existing modifier from a trait -->
  <TraitModifiers>
    <Delete>
      <Where TraitType="TRAIT_CIVILIZATION_ROME_ABILITY" ModifierId="MODIFIER_ROME_ORIGINAL_EFFECT"/>
    </Delete>
  </TraitModifiers>
  
  <!-- Add a new modifier to a trait -->
  <TraitModifiers>
    <Row TraitType="TRAIT_CIVILIZATION_ROME_ABILITY" ModifierId="MODIFIER_ROME_NEW_EFFECT"/>
  </TraitModifiers>
  
  <!-- Define the new modifier -->
  <Modifiers>
    <Row ModifierId="MODIFIER_ROME_NEW_EFFECT" 
         ModifierType="MODIFIER_PLAYER_CITIES_ADJUST_BUILDING_PRODUCTION"/>
  </Modifiers>
  
  <ModifierArguments>
    <Row ModifierId="MODIFIER_ROME_NEW_EFFECT" 
         Name="BuildingType" Value="BUILDING_ALL"/>
    <Row ModifierId="MODIFIER_ROME_NEW_EFFECT" 
         Name="Amount" Value="15"/>
  </ModifierArguments>
</Database>
```

### Creating Overrides for Age-Specific Content

When modifying Age-specific content, ensure your changes respect the Age system:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Database>
  <!-- Modify Age-specific unit for balance -->
  <Unit_Stats>
    <Update>
      <Where UnitType="UNIT_ANTIQUITY_WARRIOR"/>
      <Set Combat="30"/>
    </Update>
    <Update>
      <Where UnitType="UNIT_EXPLORATION_MUSKETMAN"/>
      <Set Combat="50"/>
    </Update>
  </Unit_Stats>
  
  <!-- Adjust Age transitions by modifying requirements -->
  <Requirements>
    <Update>
      <Where RequirementId="REQUIREMENT_GAME_IN_ANTIQUITY_AGE"/>
      <Set RequirementType="REQUIREMENT_GAME_AGE_MATCHES_MODIFIED"/>
    </Update>
  </Requirements>
</Database>
```

### Compatibility Patching

When creating mods that might conflict with other mods, use conditional patching:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Mod id="your-compatibility-patch" version="1" xmlns="ModInfo">
  <Properties>
    <Name>Compatibility Patch</Name>
    <Description>Ensures compatibility between Mod A and Mod B</Description>
    <Authors>Your Name</Authors>
    <Version>1.0.0</Version>
  </Properties>
  <Dependencies>
    <Mod id="mod-a" title="Mod A"/>
    <Mod id="mod-b" title="Mod B"/>
  </Dependencies>
  <ActionCriteria>
    <Criteria id="both-mods-active">
      <ModInUse>mod-a</ModInUse>
      <ModInUse>mod-b</ModInUse>
    </Criteria>
  </ActionCriteria>
  <ActionGroups>
    <ActionGroup id="reconciliation" scope="game" criteria="both-mods-active">
      <Actions>
        <UpdateDatabase>
          <Item>compatibility_patches/mod_a_b_reconciliation.xml</Item>
        </UpdateDatabase>
      </Actions>
    </ActionGroup>
  </ActionGroups>
</Mod>
```

## Real-World Examples

### Rome Rebalanced

The community mod "Rome Rebalanced" demonstrates these principles in action:

#### Approach
The mod focused on adjusting Rome's abilities to make them more historically accurate while preserving game balance.

#### Key Files
```
/rome-rebalanced/
├── civilization_overrides/   # Adjustments to Rome's traits
├── leader_overrides/         # Modifications to Trajan's abilities
├── unit_overrides/           # Rebalancing of the Legion unit
├── text_overrides/           # Updated descriptions
└── rome-rebalanced.modinfo   # Mod metadata
```

#### Implementation Highlights
- Modified Rome's "All Roads Lead to Rome" ability to scale with Age progression
- Adjusted Trajan's expansion bonuses to be more powerful in early game but less dominant later
- Rebalanced the Legion unit to be stronger but more expensive
- Added secondary bonuses to several Roman buildings to encourage different playstyles

### Comprehensive Balance Patch

Another example is the "Comprehensive Balance Patch" community mod:

#### Approach
This mod made sweeping changes to many civilizations, units, and buildings to improve overall game balance.

#### Key Files
```
/balance-patch/
├── civilization_overrides/   # Adjustments to multiple civilizations
├── unit_overrides/           # Global unit rebalancing
├── building_overrides/       # Building cost and yield adjustments
├── gameplay_overrides/       # Core gameplay modifications
└── balance-patch.modinfo     # Mod metadata
```

#### Implementation Highlights
- Standardized combat strength progression across all unit types
- Adjusted building costs to follow a more consistent curve
- Modified several overpowered civilization abilities
- Rebalanced resource yields to make all strategic resources equally valuable
- Adjusted terrain yields to make all biomes viable for different strategies

## Testing Your Modifications

1. **Install the Mod:**
   - Place your mod folder in the Civilization VII mods directory
   - Enable the mod in the game's mod menu

2. **Initial Testing:**
   - Start a new game with the civilizations/leaders you've modified
   - Verify that your changes appear correctly
   - Test that modified abilities function as intended
   - Check for any unintended side effects

3. **Compatibility Testing:**
   - Test your mod alone with the base game
   - Test your mod with official DLC content
   - If possible, test with popular community mods

4. **Performance Testing:**
   - Ensure your modifications don't introduce performance issues
   - Particularly important for mods that make systemic changes

5. **Troubleshooting Common Issues:**
   - Changes not appearing: Check XML syntax and file references
   - Game crashes: Look for conflicts with base game definitions
   - Balance issues: Iteratively adjust values based on testing

## Best Practices for Modifying Content

1. **Document Your Changes:** Keep detailed notes of what you've modified and why.

2. **Use Clear Commenting:** Include comments in your XML files explaining your changes.

3. **Version Control:** Use version numbers in your mod files to track iterations.

4. **Incremental Changes:** Test small changes before making large overhauls.

5. **Respect Original Design:** Try to understand why the original design choices were made before changing them.

6. **Maintain Theming:** Ensure your changes fit the historical and thematic context of the elements you're modifying.

7. **Gather Feedback:** Share your mod with the community to get testing feedback.

## Conclusion

Modifying existing content in Civilization VII provides an opportunity to refine the game to your preferences, rebalance elements you find too weak or too strong, and create a more personalized gaming experience. By carefully planning your modifications and following good modding practices, you can create high-quality mods that enhance the game while maintaining compatibility with other content.

For additional guidance, refer to:
- [Modding Architecture](civ7-modding-architecture.md)
- [Database Schemas](civ7-database-schemas.md)
- [Creating Civilizations](civ7-creating-civilizations.md)
- [Creating Leaders](civ7-creating-leaders.md)
- [DLC and Community Mod Patterns](civ7-mod-patterns.md)
