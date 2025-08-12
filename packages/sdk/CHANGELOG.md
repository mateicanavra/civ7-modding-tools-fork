# Change Log
All notable changes to this project will be documented in this file.

## [1.0] - 2025-03-01

### Added

- Initial release

## [1.1] - 2025-03-02

### Added

- import custom files, for example sql, added example
- contants
  - PLUNDER
- Database nodes
  - improvements
  - districtFreeConstructibles
  - constructibleValidResources
  - constructibleValidBiomes
  - constructibleValidFeatures
  - constructibleValidTerrains
  - constructiblePlunders
  - startBiasBiomes
  - startBiasTerrains
  - startBiasResources
  - startBiasRivers
  - startBiasFeatureClasses
  - startBiasAdjacentToCoasts
  - visArtCivilizationBuildingCultures
  - visArtCivilizationUnitCultures
- ImportFileBuilder properties
  - actionGroups,
  - actionGroupActions
- CivilizationBuilder properties
  - startBiasBiomes
  - startBiasTerrains
  - startBiasResources
  - startBiasRiver
  - startBiasFeatureClasses
  - startBiasAdjacentToCoast
  - visArtCivilizationBuildingCultures
  - visArtCivilizationUnitCulture
- ConstructibleBuilder properties
  - improvement
  - districtFreeConstructibles
  - constructibleValidResources
  - constructibleValidBiomes
  - constructibleValidFeatures
  - constructibleValidTerrains
  - constructiblePlunders



## [1.2] - 2025-03-06

### Added

- new UniqueQuarterBuilder
- unique quarter example
- autobinding improvements to civilization
- autobinding quarters to civilization
- Database nodes
  - uniqueQuarters
  - uniqueQuarterModifiers
  - gameModifiers

### Fixed

- age transition
- civilization legacy



## [1.2.3] - 2025-03-08

### Added

- NPM support: now you can install this package from npm

### Updated
- almost all node attributes are now optional
- constants
  - REQUIREMENT
  - COLLECTION
  - EFFECT
  - UNIT_CLASS
- UnitBuilder
  - unitUpgrade
  - unitAdvisories
- Database
  - unitUpgrades
  - unitAdvisories

### Fixed

- fixed multiple civilization unlocks


## [1.3.0] - 2025-03-15

### Added
- **CivilizationUnlockBuilder**
    - Added an example to `examples/civilization.ts`
- **LeaderUnlockBuilder**
    - Added an example to `examples/civilization.ts`
- **Constants**
    - `CIVILIZATION_DOMAIN`
        - Added `.from(AGE)` method
- **Nodes**
    - `CityNameNode`
    - `LeaderCivilizationBiasNode`
    - `LeaderUnlockNode`

### Fixed
- Skip empty files during mod generation

### Updated
- **DatabaseNode**
    - Added `cityNames`
- **CivilizationBuilder**
    - Generates and auto-binds city names based on localizations
- **ProgressionTreeNodeBuilder**
    - Added the ability to hide bindings
- Reworked civilization unlocks
- **ModifierBuilder**
  - `isDetached: boolean`
    - modifiers not attached to a specific entity but added to the game-effects file, such as cascade modifiers
- **ConstructibleBuilder**
    - `adjacencyYieldChanges`
    - If `building` or `improvement` is not provided, it is auto-detected based on `constructibleType`



