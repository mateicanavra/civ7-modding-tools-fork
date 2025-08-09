# Dacia Civilization - Technical Implementation Guide

This document outlines the technical implementation details for adding the Dacia civilization to Civilization VII, following the game's XML structure and modding patterns.

## 1. Directory Structure

Maintain the following directory structure for implementing the mod:

```
Dacia/
├── civilizations/
│   └── dacia/
│       ├── current.xml           # Main civilization definition
│       ├── game-effects.xml      # Civilization ability effects
│       ├── icons.xml             # Icon definitions
│       ├── legacy.xml            # Legacy/compatibility information
│       ├── localization.xml      # Text strings
│       ├── shell.xml             # UI elements
│       └── unlocks.xml           # Technology and civic unlocks
├── leaders/
│   ├── dacia-burebista/          # First leader
│   │   ├── current.xml           # Leader definition
│   │   ├── game-effects.xml      # Leader ability effects
│   │   └── localization.xml      # Leader text strings
│   └── dacia-decebalus/          # Second leader
│       ├── current.xml           # Leader definition
│       ├── game-effects.xml      # Leader ability effects
│       └── localization.xml      # Leader text strings
├── units/
│   └── dacia/
│       ├── current.xml           # Falx Warrior definition
│       ├── game-effects.xml      # Unit ability effects
│       ├── icons.xml             # Unit icons
│       └── localization.xml      # Unit text strings
├── constructibles/
│   └── dacia/
│       ├── mountain-sanctuary/   # Burebista's unique building
│       │   ├── current.xml       # Building definition
│       │   ├── game-effects.xml  # Building effects
│       │   └── localization.xml  # Building text
│       └── hill-fortress/        # Decebalus's unique district
│           ├── current.xml       # District definition
│           ├── game-effects.xml  # District effects
│           └── localization.xml  # District text
└── traditions/
    └── dacia/
        ├── zalmoxian-devotion/   # Burebista's unique tradition
        │   ├── current.xml       # Tradition definition
        │   ├── game-effects.xml  # Tradition effects
        │   └── localization.xml  # Tradition text
        └── tarabostes-warriors/  # Decebalus's unique tradition
            ├── current.xml       # Tradition definition
            ├── game-effects.xml  # Tradition effects
            └── localization.xml  # Tradition text
```

## 2. XML Implementation Guidelines

### 2.1 Civilization Definition (civilizations/dacia/current.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<GameData>
    <Civilizations>
        <Row>
            <Domain>StandardCivilizations</Domain>
            <CivilizationType>CIVILIZATION_DACIA</CivilizationType>
            <Name>LOC_CIVILIZATION_DACIA_NAME</Name>
            <Description>LOC_CIVILIZATION_DACIA_DESCRIPTION</Description>
            <Adjective>LOC_CIVILIZATION_DACIA_ADJECTIVE</Adjective>
            <StartingPosition>
                <BiasedTerrains>
                    <Item>TERRAIN_GRASS_HILLS</Item>
                    <Item>TERRAIN_PLAINS_HILLS</Item>
                    <Item>TERRAIN_PLAINS</Item>
                </BiasedTerrains>
                <BiasedFeatures>
                    <Item>FEATURE_FOREST</Item>
                </BiasedFeatures>
                <BiasedResources>
                    <Item>RESOURCE_HORSES</Item>
                    <Item>RESOURCE_IRON</Item>
                    <Item>RESOURCE_GOLD</Item>
                </BiasedResources>
            </StartingPosition>
            <Colors>
                <Primary>
                    <Red>0.8</Red>
                    <Green>0.35</Green>
                    <Blue>0.2</Blue>
                    <Alpha>1.0</Alpha>
                </Primary>
                <Secondary>
                    <Red>0.75</Red>
                    <Green>0.7</Green>
                    <Blue>0.6</Blue>
                    <Alpha>1.0</Alpha>
                </Secondary>
            </Colors>
            <Icons>
                <StandardIcon>ICON_CIVILIZATION_DACIA</StandardIcon>
                <PortraitIcon>ICON_CIVILIZATION_DACIA_PORTRAIT</PortraitIcon>
            </Icons>
            <CityNames>
                <Item>LOC_CITY_NAME_DACIA_1</Item>
                <Item>LOC_CITY_NAME_DACIA_2</Item>
                <Item>LOC_CITY_NAME_DACIA_3</Item>
                <Item>LOC_CITY_NAME_DACIA_4</Item>
                <Item>LOC_CITY_NAME_DACIA_5</Item>
                <Item>LOC_CITY_NAME_DACIA_6</Item>
                <Item>LOC_CITY_NAME_DACIA_7</Item>
                <Item>LOC_CITY_NAME_DACIA_8</Item>
                <Item>LOC_CITY_NAME_DACIA_9</Item>
                <Item>LOC_CITY_NAME_DACIA_10</Item>
                <Item>LOC_CITY_NAME_DACIA_11</Item>
                <Item>LOC_CITY_NAME_DACIA_12</Item>
            </CityNames>
            <Leaders>
                <Item>LEADER_DACIA_BUREBISTA</Item>
                <Item>LEADER_DACIA_DECEBALUS</Item>
            </Leaders>
        </Row>
    </Civilizations>
</GameData>
```

### 2.2 Civilization Game Effects (civilizations/dacia/game-effects.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<GameData>
    <CivilizationTraits>
        <Row>
            <CivilizationType>CIVILIZATION_DACIA</CivilizationType>
            <TraitType>TRAIT_CIVILIZATION_DACIA_CARPATHIAN_DEFENDERS</TraitType>
            <Name>LOC_TRAIT_CIVILIZATION_DACIA_CARPATHIAN_DEFENDERS_NAME</Name>
            <Description>LOC_TRAIT_CIVILIZATION_DACIA_CARPATHIAN_DEFENDERS_DESCRIPTION</Description>
        </Row>
    </CivilizationTraits>

    <GameEffects>
        <!-- Combat bonus on Hills and Forest tiles -->
        <Row>
            <EffectType>EFFECT_ADJUST_UNIT_COMBAT_STRENGTH</EffectType>
            <TargetType>UNIT_DEFINITION</TargetType>
            <TargetTags>
                <Item>MY_UNITS</Item>
            </TargetTags>
            <Conditions>
                <PlotFeature>FEATURE_FOREST</PlotFeature>
            </Conditions>
            <Amount>5</Amount>
            <Traits>
                <Item>TRAIT_CIVILIZATION_DACIA_CARPATHIAN_DEFENDERS</Item>
            </Traits>
        </Row>
        <Row>
            <EffectType>EFFECT_ADJUST_UNIT_COMBAT_STRENGTH</EffectType>
            <TargetType>UNIT_DEFINITION</TargetType>
            <TargetTags>
                <Item>MY_UNITS</Item>
            </TargetTags>
            <Conditions>
                <PlotTerrain>TERRAIN_GRASS_HILLS</PlotTerrain>
            </Conditions>
            <Amount>5</Amount>
            <Traits>
                <Item>TRAIT_CIVILIZATION_DACIA_CARPATHIAN_DEFENDERS</Item>
            </Traits>
        </Row>
        <Row>
            <EffectType>EFFECT_ADJUST_UNIT_COMBAT_STRENGTH</EffectType>
            <TargetType>UNIT_DEFINITION</TargetType>
            <TargetTags>
                <Item>MY_UNITS</Item>
            </TargetTags>
            <Conditions>
                <PlotTerrain>TERRAIN_PLAINS_HILLS</PlotTerrain>
            </Conditions>
            <Amount>5</Amount>
            <Traits>
                <Item>TRAIT_CIVILIZATION_DACIA_CARPATHIAN_DEFENDERS</Item>
            </Traits>
        </Row>

        <!-- Gold Mine bonus yields -->
        <Row>
            <EffectType>EFFECT_ADJUST_IMPROVEMENT_YIELD</EffectType>
            <TargetType>IMPROVEMENT_DEFINITION</TargetType>
            <Targets>
                <Item>IMPROVEMENT_MINE</Item>
            </Targets>
            <Conditions>
                <ResourceType>RESOURCE_GOLD</ResourceType>
            </Conditions>
            <YieldType>YIELD_PRODUCTION</YieldType>
            <Amount>1</Amount>
            <Traits>
                <Item>TRAIT_CIVILIZATION_DACIA_CARPATHIAN_DEFENDERS</Item>
            </Traits>
        </Row>
        <Row>
            <EffectType>EFFECT_ADJUST_IMPROVEMENT_YIELD</EffectType>
            <TargetType>IMPROVEMENT_DEFINITION</TargetType>
            <Targets>
                <Item>IMPROVEMENT_MINE</Item>
            </Targets>
            <Conditions>
                <ResourceType>RESOURCE_GOLD</ResourceType>
            </Conditions>
            <YieldType>YIELD_CULTURE</YieldType>
            <Amount>1</Amount>
            <Traits>
                <Item>TRAIT_CIVILIZATION_DACIA_CARPATHIAN_DEFENDERS</Item>
            </Traits>
        </Row>
        
        <!-- Faith from Mountain adjacency for Holy Sites -->
        <Row>
            <EffectType>EFFECT_ADJUST_DISTRICT_ADJACENCY_YIELD</EffectType>
            <TargetType>DISTRICT_DEFINITION</TargetType>
            <Targets>
                <Item>DISTRICT_HOLY_SITE</Item>
            </Targets>
            <Conditions>
                <AdjacentFeature>FEATURE_MOUNTAIN</AdjacentFeature>
            </Conditions>
            <YieldType>YIELD_FAITH</YieldType>
            <Amount>1</Amount>
            <Traits>
                <Item>TRAIT_CIVILIZATION_DACIA_CARPATHIAN_DEFENDERS</Item>
            </Traits>
        </Row>
    </GameEffects>
</GameData>
```

### 2.3 Leader Definition (Example for Decebalus)

```xml
<?xml version="1.0" encoding="utf-8"?>
<GameData>
    <Leaders>
        <Row>
            <LeaderType>LEADER_DACIA_DECEBALUS</LeaderType>
            <Name>LOC_LEADER_DACIA_DECEBALUS_NAME</Name>
            <InheritFrom>LEADER_DEFAULT</InheritFrom>
            <Portrait>
                <Background>BACKGROUND_MOUNTAINS</Background>
            </Portrait>
            <Civilizations>
                <Item>CIVILIZATION_DACIA</Item>
            </Civilizations>
            <LoadingInfo>
                <ForegroundImage>LEADER_DACIA_DECEBALUS_LOADING</ForegroundImage>
                <BackgroundImage>LOADING_BACKGROUND_MOUNTAINS</BackgroundImage>
                <LeaderQuote>LOC_LEADER_DACIA_DECEBALUS_QUOTE</LeaderQuote>
            </LoadingInfo>
        </Row>
    </Leaders>
</GameData>
```

### 2.4 Leader Game Effects (Example for Decebalus)

```xml
<?xml version="1.0" encoding="utf-8"?>
<GameData>
    <LeaderTraits>
        <Row>
            <LeaderType>LEADER_DACIA_DECEBALUS</LeaderType>
            <TraitType>TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE</TraitType>
            <Name>LOC_TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE_NAME</Name>
            <Description>LOC_TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE_DESCRIPTION</Description>
        </Row>
    </LeaderTraits>

    <GameEffects>
        <!-- Hills and Forest yield bonuses -->
        <Row>
            <EffectType>EFFECT_ADJUST_PLOT_YIELD</EffectType>
            <TargetType>PLOT_DEFINITION</TargetType>
            <Conditions>
                <PlotTerrain>TERRAIN_GRASS_HILLS</PlotTerrain>
                <IsWorked>true</IsWorked>
            </Conditions>
            <YieldType>YIELD_PRODUCTION</YieldType>
            <Amount>1</Amount>
            <Traits>
                <Item>TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE</Item>
            </Traits>
        </Row>
        <Row>
            <EffectType>EFFECT_ADJUST_PLOT_YIELD</EffectType>
            <TargetType>PLOT_DEFINITION</TargetType>
            <Conditions>
                <PlotTerrain>TERRAIN_PLAINS_HILLS</PlotTerrain>
                <IsWorked>true</IsWorked>
            </Conditions>
            <YieldType>YIELD_PRODUCTION</YieldType>
            <Amount>1</Amount>
            <Traits>
                <Item>TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE</Item>
            </Traits>
        </Row>
        <Row>
            <EffectType>EFFECT_ADJUST_PLOT_YIELD</EffectType>
            <TargetType>PLOT_DEFINITION</TargetType>
            <Conditions>
                <PlotFeature>FEATURE_FOREST</PlotFeature>
                <IsWorked>true</IsWorked>
            </Conditions>
            <YieldType>YIELD_PRODUCTION</YieldType>
            <Amount>1</Amount>
            <Traits>
                <Item>TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE</Item>
            </Traits>
        </Row>
        
        <!-- Appeal bonuses -->
        <Row>
            <EffectType>EFFECT_ADJUST_PLOT_APPEAL</EffectType>
            <TargetType>PLOT_DEFINITION</TargetType>
            <Conditions>
                <PlotTerrain>TERRAIN_GRASS_HILLS</PlotTerrain>
            </Conditions>
            <Amount>1</Amount>
            <Traits>
                <Item>TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE</Item>
            </Traits>
        </Row>
        <Row>
            <EffectType>EFFECT_ADJUST_PLOT_APPEAL</EffectType>
            <TargetType>PLOT_DEFINITION</TargetType>
            <Conditions>
                <PlotTerrain>TERRAIN_PLAINS_HILLS</PlotTerrain>
            </Conditions>
            <Amount>1</Amount>
            <Traits>
                <Item>TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE</Item>
            </Traits>
        </Row>
        <Row>
            <EffectType>EFFECT_ADJUST_PLOT_APPEAL</EffectType>
            <TargetType>PLOT_DEFINITION</TargetType>
            <Conditions>
                <PlotFeature>FEATURE_FOREST</PlotFeature>
            </Conditions>
            <Amount>1</Amount>
            <Traits>
                <Item>TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE</Item>
            </Traits>
        </Row>
        
        <!-- Free promotion for Melee and Anti-Cavalry units -->
        <Row>
            <EffectType>EFFECT_GRANT_FREE_PROMOTION</EffectType>
            <TargetType>UNIT_DEFINITION</TargetType>
            <TargetTags>
                <Item>CLASS_MELEE</Item>
                <Item>CLASS_ANTI_CAVALRY</Item>
            </TargetTags>
            <Traits>
                <Item>TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE</Item>
            </Traits>
        </Row>
        
        <!-- City combat strength from adjacent Hills -->
        <Row>
            <EffectType>EFFECT_ADJUST_CITY_COMBAT_STRENGTH</EffectType>
            <TargetType>CITY_DEFINITION</TargetType>
            <Conditions>
                <HasDistrict>DISTRICT_ENCAMPMENT</HasDistrict>
                <AdjacentTerrainCount>
                    <TerrainType>TERRAIN_GRASS_HILLS</TerrainType>
                    <TerrainType>TERRAIN_PLAINS_HILLS</TerrainType>
                    <CountType>TOTAL</CountType>
                </AdjacentTerrainCount>
            </Conditions>
            <AmountPerCount>2</AmountPerCount>
            <Traits>
                <Item>TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE</Item>
            </Traits>
        </Row>
        
        <!-- War weariness reduction -->
        <Row>
            <EffectType>EFFECT_ADJUST_WAR_WEARINESS</EffectType>
            <TargetType>PLAYER_DEFINITION</TargetType>
            <Amount>-25</Amount>
            <Traits>
                <Item>TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE</Item>
            </Traits>
        </Row>
    </GameEffects>

    <HistoricalAgendas>
        <Row>
            <LeaderType>LEADER_DACIA_DECEBALUS</LeaderType>
            <AgendaType>AGENDA_DACIA_DECEBALUS</AgendaType>
            <Name>LOC_AGENDA_DACIA_DECEBALUS_NAME</Name>
            <Description>LOC_AGENDA_DACIA_DECEBALUS_DESCRIPTION</Description>
        </Row>
    </HistoricalAgendas>
</GameData>
```

### 2.5 Unique Unit Definition (units/dacia/current.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<GameData>
    <Units>
        <Row>
            <UnitType>UNIT_DACIA_FALX_WARRIOR</UnitType>
            <Name>LOC_UNIT_DACIA_FALX_WARRIOR_NAME</Name>
            <Description>LOC_UNIT_DACIA_FALX_WARRIOR_DESCRIPTION</Description>
            <Domain>DOMAIN_LAND</Domain>
            <FormationClass>FORMATION_CLASS_LAND_COMBAT</FormationClass>
            <Cost>130</Cost>
            <Maintenance>2</Maintenance>
            <BaseMoves>2</BaseMoves>
            <Combat>40</Combat>
            <RangedCombat>0</RangedCombat>
            <Range>0</Range>
            <BaseSightRange>2</BaseSightRange>
            <ZoneOfControl>true</ZoneOfControl>
            <MandatoryPromotion>PROMOTION_CLASS_MELEE</MandatoryPromotion>
            <AdvisorType>ADVISOR_CONQUEST</AdvisorType>
            <ReplacedByUnitType>UNIT_MUSKETMAN</ReplacedByUnitType>
            <PrereqTech>TECH_IRON_WORKING</PrereqTech>
            <StrategicResource>RESOURCE_IRON</StrategicResource>
            <TraitType>TRAIT_CIVILIZATION_UNIT_DACIA_FALX_WARRIOR</TraitType>
        </Row>
    </Units>
    
    <UnitReplaces>
        <Row>
            <CivUniqueUnitType>UNIT_DACIA_FALX_WARRIOR</CivUniqueUnitType>
            <ReplacesUnitType>UNIT_SWORDSMAN</ReplacesUnitType>
        </Row>
    </UnitReplaces>
    
    <Traits>
        <Row>
            <TraitType>TRAIT_CIVILIZATION_UNIT_DACIA_FALX_WARRIOR</TraitType>
            <Name>LOC_TRAIT_CIVILIZATION_UNIT_DACIA_FALX_WARRIOR_NAME</Name>
            <Description>LOC_TRAIT_CIVILIZATION_UNIT_DACIA_FALX_WARRIOR_DESCRIPTION</Description>
        </Row>
    </Traits>
</GameData>
```

### 2.6 Unique Unit Game Effects (units/dacia/game-effects.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<GameData>
    <GameEffects>
        <!-- Bonus strength against defensive units -->
        <Row>
            <EffectType>EFFECT_ADJUST_UNIT_COMBAT_STRENGTH</EffectType>
            <TargetType>UNIT_DEFINITION</TargetType>
            <TargetTags>
                <Item>UNIT_DACIA_FALX_WARRIOR</Item>
            </TargetTags>
            <Conditions>
                <EnemyHasPromotion>PROMOTION_DEFENSIVE</EnemyHasPromotion>
            </Conditions>
            <Amount>10</Amount>
            <Traits>
                <Item>TRAIT_CIVILIZATION_UNIT_DACIA_FALX_WARRIOR</Item>
            </Traits>
        </Row>
        
        <!-- Weakness to ranged attacks -->
        <Row>
            <EffectType>EFFECT_ADJUST_UNIT_COMBAT_STRENGTH</EffectType>
            <TargetType>UNIT_DEFINITION</TargetType>
            <TargetTags>
                <Item>UNIT_DACIA_FALX_WARRIOR</Item>
            </TargetTags>
            <Conditions>
                <EnemyAttackType>ATTACK_TYPE_RANGED</EnemyAttackType>
            </Conditions>
            <Amount>-5</Amount>
            <Traits>
                <Item>TRAIT_CIVILIZATION_UNIT_DACIA_FALX_WARRIOR</Item>
            </Traits>
        </Row>
    </GameEffects>
</GameData>
```

### 2.7 Unique Building - Mountain Sanctuary (constructibles/dacia/mountain-sanctuary/current.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<GameData>
    <Buildings>
        <Row>
            <BuildingType>BUILDING_DACIA_MOUNTAIN_SANCTUARY</BuildingType>
            <Name>LOC_BUILDING_DACIA_MOUNTAIN_SANCTUARY_NAME</Name>
            <Description>LOC_BUILDING_DACIA_MOUNTAIN_SANCTUARY_DESCRIPTION</Description>
            <PrereqDistrict>DISTRICT_HOLY_SITE</PrereqDistrict>
            <Cost>160</Cost>
            <Maintenance>2</Maintenance>
            <Housing>0</Housing>
            <Entertainment>1</Entertainment>
            <Citizens>0</Citizens>
            <PrereqCivic>CIVIC_MYSTICISM</PrereqCivic>
            <TraitType>TRAIT_CIVILIZATION_BUILDING_DACIA_MOUNTAIN_SANCTUARY</TraitType>
        </Row>
    </Buildings>
    
    <BuildingReplaces>
        <Row>
            <CivUniqueBuildingType>BUILDING_DACIA_MOUNTAIN_SANCTUARY</CivUniqueBuildingType>
            <ReplacesBuildingType>BUILDING_SHRINE</ReplacesBuildingType>
        </Row>
    </BuildingReplaces>
    
    <Traits>
        <Row>
            <TraitType>TRAIT_CIVILIZATION_BUILDING_DACIA_MOUNTAIN_SANCTUARY</TraitType>
            <Name>LOC_TRAIT_CIVILIZATION_BUILDING_DACIA_MOUNTAIN_SANCTUARY_NAME</Name>
            <Description>LOC_TRAIT_CIVILIZATION_BUILDING_DACIA_MOUNTAIN_SANCTUARY_DESCRIPTION</Description>
        </Row>
    </Traits>
</GameData>
```

### 2.8 Unique District - Hill Fortress (constructibles/dacia/hill-fortress/current.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<GameData>
    <Districts>
        <Row>
            <DistrictType>DISTRICT_DACIA_HILL_FORTRESS</DistrictType>
            <Name>LOC_DISTRICT_DACIA_HILL_FORTRESS_NAME</Name>
            <Description>LOC_DISTRICT_DACIA_HILL_FORTRESS_DESCRIPTION</Description>
            <Cost>50</Cost>
            <Maintenance>1</Maintenance>
            <Housing>2</Housing>
            <Entertainment>1</Entertainment>
            <RequiresPlacement>true</RequiresPlacement>
            <RequiresPopulation>false</RequiresPopulation>
            <PlacementRequires>
                <Item>TERRAIN_GRASS_HILLS</Item>
                <Item>TERRAIN_PLAINS_HILLS</Item>
            </PlacementRequires>
            <PrereqTech>TECH_BRONZE_WORKING</PrereqTech>
            <TraitType>TRAIT_CIVILIZATION_DISTRICT_DACIA_HILL_FORTRESS</TraitType>
        </Row>
    </Districts>
    
    <DistrictReplaces>
        <Row>
            <CivUniqueDistrictType>DISTRICT_DACIA_HILL_FORTRESS</CivUniqueDistrictType>
            <ReplacesDistrictType>DISTRICT_ENCAMPMENT</ReplacesDistrictType>
        </Row>
    </DistrictReplaces>
    
    <Traits>
        <Row>
            <TraitType>TRAIT_CIVILIZATION_DISTRICT_DACIA_HILL_FORTRESS</TraitType>
            <Name>LOC_TRAIT_CIVILIZATION_DISTRICT_DACIA_HILL_FORTRESS_NAME</Name>
            <Description>LOC_TRAIT_CIVILIZATION_DISTRICT_DACIA_HILL_FORTRESS_DESCRIPTION</Description>
        </Row>
    </Traits>
</GameData>
```

### 2.9 Localization (Example for Civilization and Leaders)

```xml
<?xml version="1.0" encoding="utf-8"?>
<GameData>
    <Localization>
        <!-- Civilization -->
        <Row Tag="LOC_CIVILIZATION_DACIA_NAME" Language="en_US">
            <Text>Dacia</Text>
        </Row>
        <Row Tag="LOC_CIVILIZATION_DACIA_DESCRIPTION" Language="en_US">
            <Text>Dacian Kingdom</Text>
        </Row>
        <Row Tag="LOC_CIVILIZATION_DACIA_ADJECTIVE" Language="en_US">
            <Text>Dacian</Text>
        </Row>
        
        <!-- Civilization Trait -->
        <Row Tag="LOC_TRAIT_CIVILIZATION_DACIA_CARPATHIAN_DEFENDERS_NAME" Language="en_US">
            <Text>Carpathian Defenders</Text>
        </Row>
        <Row Tag="LOC_TRAIT_CIVILIZATION_DACIA_CARPATHIAN_DEFENDERS_DESCRIPTION" Language="en_US">
            <Text>Units receive +5 Combat Strength when fighting in Hills or Forest terrain. Gold Mines provide +1 Production and +1 Culture. +1 Faith from Mountain adjacency for Holy Sites.</Text>
        </Row>
        
        <!-- Leaders -->
        <Row Tag="LOC_LEADER_DACIA_BUREBISTA_NAME" Language="en_US">
            <Text>Burebista</Text>
        </Row>
        <Row Tag="LOC_LEADER_DACIA_BUREBISTA_QUOTE" Language="en_US">
            <Text>Unite under one banner, and we shall create an empire that rivals even Rome itself. Our mountains hold gold, our people possess courage, and our gods grant wisdom.</Text>
        </Row>
        <Row Tag="LOC_LEADER_DACIA_DECEBALUS_NAME" Language="en_US">
            <Text>Decebalus</Text>
        </Row>
        <Row Tag="LOC_LEADER_DACIA_DECEBALUS_QUOTE" Language="en_US">
            <Text>Our mountains are our fortresses, our weapons are our pride, and our spirit is unbreakable. Let Rome send its legions—they will find only defeat in our lands.</Text>
        </Row>
        
        <!-- Leader Traits -->
        <Row Tag="LOC_TRAIT_LEADER_DACIA_BUREBISTA_UNIFIER_NAME" Language="en_US">
            <Text>Unifier of Tribes</Text>
        </Row>
        <Row Tag="LOC_TRAIT_LEADER_DACIA_BUREBISTA_UNIFIER_DESCRIPTION" Language="en_US">
            <Text>New settlements founded within 6 tiles of the Capital receive a free Builder. Completing a Tradition tree grants a free Military Policy slot in all cities. +2 Loyalty per turn in cities with at least one Tradition policy active.</Text>
        </Row>
        <Row Tag="LOC_TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE_NAME" Language="en_US">
            <Text>Dacian Resistance</Text>
        </Row>
        <Row Tag="LOC_TRAIT_LEADER_DACIA_DECEBALUS_RESISTANCE_DESCRIPTION" Language="en_US">
            <Text>Hills and Forest tiles provide +1 Appeal and +1 Production when worked. Melee and Anti-Cavalry units receive a free promotion when created. Cities with Encampment districts gain +2 Combat Strength per adjacent Hill tile. War weariness generates 25% more slowly.</Text>
        </Row>
        
        <!-- Agendas -->
        <Row Tag="LOC_AGENDA_DACIA_BUREBISTA_NAME" Language="en_US">
            <Text>Tribal Consolidator</Text>
        </Row>
        <Row Tag="LOC_AGENDA_DACIA_BUREBISTA_DESCRIPTION" Language="en_US">
            <Text>Respects civilizations that focus on internal development and have high Population. Dislikes those who expand aggressively by founding many cities.</Text>
        </Row>
        <Row Tag="LOC_AGENDA_DACIA_DECEBALUS_NAME" Language="en_US">
            <Text>Mountain Guardian</Text>
        </Row>
        <Row Tag="LOC_AGENDA_DACIA_DECEBALUS_DESCRIPTION" Language="en_US">
            <Text>Respects civilizations who control mountain passes and hills. Dislikes those who expand into mountainous territory near his borders.</Text>
        </Row>
        
        <!-- City Names -->
        <Row Tag="LOC_CITY_NAME_DACIA_1" Language="en_US">
            <Text>Sarmizegetusa</Text>
        </Row>
        <Row Tag="LOC_CITY_NAME_DACIA_2" Language="en_US">
            <Text>Apulum</Text>
        </Row>
        <Row Tag="LOC_CITY_NAME_DACIA_3" Language="en_US">
            <Text>Napoca</Text>
        </Row>
        <Row Tag="LOC_CITY_NAME_DACIA_4" Language="en_US">
            <Text>Porolissum</Text>
        </Row>
        <Row Tag="LOC_CITY_NAME_DACIA_5" Language="en_US">
            <Text>Sucidava</Text>
        </Row>
        <Row Tag="LOC_CITY_NAME_DACIA_6" Language="en_US">
            <Text>Buridava</Text>
        </Row>
        <Row Tag="LOC_CITY_NAME_DACIA_7" Language="en_US">
            <Text>Cumidava</Text>
        </Row>
        <Row Tag="LOC_CITY_NAME_DACIA_8" Language="en_US">
            <Text>Piroboridava</Text>
        </Row>
        <Row Tag="LOC_CITY_NAME_DACIA_9" Language="en_US">
            <Text>Genucla</Text>
        </Row>
        <Row Tag="LOC_CITY_NAME_DACIA_10" Language="en_US">
            <Text>Dierna</Text>
        </Row>
        <Row Tag="LOC_CITY_NAME_DACIA_11" Language="en_US">
            <Text>Tibiscum</Text>
        </Row>
        <Row Tag="LOC_CITY_NAME_DACIA_12" Language="en_US">
            <Text>Drobeta</Text>
        </Row>
    </Localization>
</GameData>
```

## 3. ModInfo File Updates

Update the Dacia.modinfo file to reference all the new files:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Mod id="com.dacia.civilization">
    <Properties>
        <Name>Dacia Civilization</Name>
        <Teaser>Adds the Dacia civilization to Civilization VII</Teaser>
        <Description>This mod adds the Dacia civilization to Civilization VII, including two unique leaders (Burebista and Decebalus), their unique abilities, units, and buildings. Experience the ancient kingdom of Dacia with its rich history and distinctive cultural elements.</Description>
        <Authors>Mod Author</Authors>
        <SpecialThanks>Civilization VII Modding Community</SpecialThanks>
        <AffectsSavedGames>true</AffectsSavedGames>
        <SupportsSinglePlayer>true</SupportsSinglePlayer>
        <SupportsMultiplayer>true</SupportsMultiplayer>
        <SupportsHotSeat>true</SupportsHotSeat>
        <CompatibleVersions>1.0</CompatibleVersions>
        <Category>Civilizations</Category>
        <Version>1.0.0</Version>
    </Properties>
    <Files>
        <!-- Civilization Files -->
        <File>Dacia/civilizations/dacia/current.xml</File>
        <File>Dacia/civilizations/dacia/game-effects.xml</File>
        <File>Dacia/civilizations/dacia/icons.xml</File>
        <File>Dacia/civilizations/dacia/legacy.xml</File>
        <File>Dacia/civilizations/dacia/localization.xml</File>
        <File>Dacia/civilizations/dacia/shell.xml</File>
        <File>Dacia/civilizations/dacia/unlocks.xml</File>
        
        <!-- Leader Files - Burebista -->
        <File>Dacia/leaders/dacia-burebista/current.xml</File>
        <File>Dacia/leaders/dacia-burebista/game-effects.xml</File>
        <File>Dacia/leaders/dacia-burebista/localization.xml</File>
        
        <!-- Leader Files - Decebalus -->
        <File>Dacia/leaders/dacia-decebalus/current.xml</File>
        <File>Dacia/leaders/dacia-decebalus/game-effects.xml</File>
        <File>Dacia/leaders/dacia-decebalus/localization.xml</File>
        
        <!-- Units -->
        <File>Dacia/units/dacia/current.xml</File>
        <File>Dacia/units/dacia/game-effects.xml</File>
        <File>Dacia/units/dacia/icons.xml</File>
        <File>Dacia/units/dacia/localization.xml</File>
        
        <!-- Constructibles - Burebista -->
        <File>Dacia/constructibles/dacia/mountain-sanctuary/current.xml</File>
        <File>Dacia/constructibles/dacia/mountain-sanctuary/game-effects.xml</File>
        <File>Dacia/constructibles/dacia/mountain-sanctuary/localization.xml</File>
        
        <!-- Constructibles - Decebalus -->
        <File>Dacia/constructibles/dacia/hill-fortress/current.xml</File>
        <File>Dacia/constructibles/dacia/hill-fortress/game-effects.xml</File>
        <File>Dacia/constructibles/dacia/hill-fortress/localization.xml</File>
        
        <!-- Traditions - Burebista -->
        <File>Dacia/traditions/dacia/zalmoxian-devotion/current.xml</File>
        <File>Dacia/traditions/dacia/zalmoxian-devotion/game-effects.xml</File>
        <File>Dacia/traditions/dacia/zalmoxian-devotion/localization.xml</File>
        
        <!-- Traditions - Decebalus -->
        <File>Dacia/traditions/dacia/tarabostes-warriors/current.xml</File>
        <File>Dacia/traditions/dacia/tarabostes-warriors/game-effects.xml</File>
        <File>Dacia/traditions/dacia/tarabostes-warriors/localization.xml</File>
        
        <!-- Dependency Files -->
        <File>Dacia.dep</File>
    </Files>
    <Dependencies>
        <Dependency id="base-game" version="1.0" />
    </Dependencies>
</Mod>
```

## 4. Implementation Notes and Recommendations

1. **Effect Types:** The `EffectType` values used in game-effects.xml files are critical for proper functionality. The examples provided align with expected Civ 7 patterns, but you may need to adjust based on actual game implementation.

2. **Testing Approach:** Implement the basic civilization first, then add leaders, followed by unique units and buildings. Test each component before proceeding to the next to isolate any issues.

3. **Art Assets:** For a complete implementation, you would need to create:
   - Civilization icon (multiple sizes)
   - Leader portraits
   - Unit models and icons
   - Building/district icons

4. **Balance Considerations:**
   - Combat bonuses are set at +5 for terrain, which is significant but not overwhelming
   - Additional yields are generally +1, which is standard for civilization bonuses
   - Unique units are slightly stronger than standard units but have drawbacks
   - Leader bonuses are designed to encourage different playstyles

5. **Technical Limitations:**
   - Some effects may require custom JavaScript if they cannot be implemented through standard XML
   - Leader animations and 3D assets aren't covered here as they require more advanced tools

## 5. Implementation Priorities

For initial testing, implement the components in this order:

1. Base civilization definition and traits
2. Decebalus leader (as he's the more combat-focused, straightforward leader)
3. Falx Warrior unique unit
4. Hill Fortress unique district
5. Burebista leader
6. Mountain Sanctuary unique building
7. Traditions and remaining elements

This approach ensures you can test the most fundamental components first before adding more complex gameplay systems. 