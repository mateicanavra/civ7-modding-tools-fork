-- Gameplay Setup Data Tables
-- These tables simplify and strongly type the commonly used setup parameter data for the game.
CREATE TABLE 'TagCategories' (
	'TagCategoryType' TEXT NOT NULL,
	'HideInDetails' BOOLEAN NOT NULL DEFAULT 0,
	PRIMARY KEY('TagCategoryType')
);

CREATE TABLE 'Tags' (
	'TagType' TEXT NOT NULL,
	'TagCategoryType' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT,
	'Style' TEXT,
	PRIMARY KEY('TagType'),
	FOREIGN KEY('TagCategoryType') REFERENCES 'TagCategories'('TagCategoryType')
);

CREATE TABLE 'Ages' (
	'Domain' TEXT NOT NULL DEFAULT 'StandardAges',
	'AgeType' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'PlayerCivilizationDomain' TEXT NOT NULL,
	'DefeatDomain' TEXT,
	'VictoryDomain' TEXT,
	'MapSizeDomain' TEXT,
	'MaxTurns' INTEGER,
	'FixedMaxTurns' BOOLEAN NOT NULL DEFAULT 0,
	'Banner' TEXT,
	'SortIndex' INTEGER NOT NULL,
	PRIMARY KEY('Domain', 'AgeType')
);

CREATE TABLE 'Defeats'(
	'Domain' TEXT NOT NULL DEFAULT 'StandardDefeats',
	'DefeatType' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'Visible' BOOLEAN NOT NULL DEFAULT 1,
	'ReadOnly' TEXT NOT NULL DEFAULT 0
);

CREATE TABLE 'Difficulties' (
	'Domain' TEXT NOT NULL DEFAULT 'StandardDifficulties',
	'DifficultyType' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT,
	'SortIndex' INTEGER NOT NULL,
	PRIMARY KEY('Domain', 'DifficultyType')
);

-- ! NEEDS WORK
-- This table needs to be cleaned up to be more flexible.
CREATE TABLE 'GameModeItems' (
	'GameModeType' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT,
	'Icon' TEXT,
	'UnitIcon' TEXT,
	'UnitDescription' TEXT,
	'UnitName' TEXT,
	'Portrait' TEXT,
	'Background' TEXT,
	'SortIndex' INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE 'GameSpeeds' (
	'Domain' TEXT NOT NULL DEFAULT 'StandardGameSpeeds',
	'GameSpeedType' TEXT NOT NULL,
	'Name' TEXT,
	'Description' TEXT,
	'SortIndex' INTEGER NOT NULL,
	PRIMARY KEY('Domain', 'GameSpeedType')
);

CREATE TABLE 'Maps' (
	'Domain' TEXT NOT NULL DEFAULT 'StandardMaps',
	'File' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT,
	'Image' TEXT,
	'StaticMap' BOOLEAN NOT NULL DEFAULT 0,
	'WorldBuilderOnly' BOOLEAN NOT NULL DEFAULT 0,
	'SortIndex' INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY ('Domain', 'File')
);

-- This is similar to MapSupportedValues but is leader specific and domain agnostic.
CREATE TABLE 'MapLeaders' (
	'Map' TEXT NOT NULL,		-- A reference to Maps::File
	'LeaderType' TEXT NOT NULL,	-- A leader type (ignoring domain)
	PRIMARY KEY ('Map', 'LeaderType')
);

CREATE TABLE 'MapSizes' (
	'Domain' TEXT NOT NULL DEFAULT 'StandardMapSizes',
	'MapSizeType' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT,
	'MinPlayers' INTEGER NOT NULL DEFAULT 2,
	'MaxPlayers' INTEGER NOT NULL DEFAULT 2,
	'MaxHumans' INTEGER NOT NULL DEFAULT 2,
	'DefaultPlayers' INTEGER NOT NULL DEFAULT 2,
	'SortIndex' INTEGER NOT NULL,
	PRIMARY KEY('Domain','MapSizeType')
);

CREATE TABLE 'Rulesets' (
	'RulesetType' TEXT NOT NULL,
 	'Name' TEXT NOT NULL,
	'Description' TEXT,
	'LongDescription' TEXT,
	'SupportsSinglePlayer' BOOLEAN NOT NULL DEFAULT 1,
	'SupportsMultiPlayer' BOOLEAN NOT NULL DEFAULT 1,
	'SortIndex' INTEGER NOT NULL DEFAULT 100,
	'IsScenario' BOOLEAN NOT NULL DEFAULT 0,
	'GameCore' TEXT NOT NULL DEFAULT 'Base',
	PRIMARY KEY('RulesetType')
);

-- This table provides a list of playable civilizations for a given age.
-- Additional info about the civilization entry is also provided with ways to override it.
CREATE TABLE 'Civilizations' (
	'Domain' TEXT NOT NULL,
	'CivilizationType' TEXT NOT NULL,
	'CivilizationName' TEXT NOT NULL,
	'CivilizationFullName' TEXT NOT NULL,
	'CivilizationDescription' TEXT NOT NULL,
	'CivilizationIcon' TEXT,
	'SortIndex' INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY('Domain', 'CivilizationType')
);

-- This table provides a list of items that are associated with a given civilization.
-- This can be things like unique units, abilities etc.
CREATE TABLE 'CivilizationItems' (
	'CivilizationDomain' TEXT NOT NULL,
	'CivilizationType' TEXT NOT NULL,
	'Type' TEXT NOT NULL,
	'Kind' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'Icon' TEXT,
	'SortIndex' INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY('CivilizationDomain', 'CivilizationType', 'Type')
);

-- This table represents various tags that can be used as filters and chips.
CREATE TABLE 'CivilizationTags' (
	'CivilizationDomain' TEXT NOT NULL,
	'CivilizationType' TEXT NOT NULL,
	'TagType' TEXT NOT NULL,
	PRIMARY KEY('CivilizationDomain', 'CivilizationType', 'TagType'),
	FOREIGN KEY('TagType') REFERENCES 'Tags'('TagType')
);

-- This table represents things the civilization selection unlocks in various ages of the game.
CREATE TABLE 'CivilizationUnlocks' (
	'CivilizationDomain' TEXT NOT NULL,
	'CivilizationType' TEXT NOT NULL,
	'AgeDomain' TEXT,
	'AgeType' TEXT,
	'Type' TEXT NOT NULL,
	'Kind' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'Icon' TEXT,
	'SortIndex' INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE 'Crises' (
	'Domain' TEXT DEFAULT 'StandardCrises',
	'AgeCrisisEventType' TEXT NOT NULL,
	'AgeType' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'Category' TEXT NOT NULL,
	'Icon' TEXT,
	'SortIndex' INTEGER NOT NULL DEFAULT 0,
	Primary Key('Domain', 'AgeCrisisEventType')
);

-- This table establishes a bias for a particular civilization for a given leader.
CREATE TABLE 'PreviousCivilizationBias' (
	'PreviousCivilizationDomain' TEXT NOT NULL,
	'PreviousCivilizationType' TEXT NOT NULL,
	'CivilizationDomain' TEXT NOT NULL,
	'CivilizationType' TEXT NOT NULL,
	'Bias' INTEGER DEFAULT 100,
	'ReasonType' TEXT NOT NULL,
	'ReasonDescription' TEXT
);

CREATE TABLE 'Leaders' (
	'Domain' TEXT DEFAULT 'StandardLeaders',
	'LeaderType' TEXT NOT NULL,
	'LeaderName' TEXT NOT NULL,
	'LeaderDescription' TEXT NOT NULL,
	'LeaderIcon' TEXT NOT NULL,
	'SortIndex' INTEGER,
	PRIMARY KEY('Domain', 'LeaderType')
);

-- This table establishes a bias for a particular civilization for a given leader.
CREATE TABLE 'LeaderCivilizationBias' (
	'LeaderDomain' TEXT DEFAULT 'StandardLeaders',
	'LeaderType' TEXT NOT NULL,
	'CivilizationDomain' TEXT NOT NULL,
	'CivilizationType' TEXT NOT NULL,
	'Bias' INTEGER DEFAULT 100,
	'ReasonType' TEXT NOT NULL,
	'ReasonDescription' TEXT,
	'ChoiceType' TEXT
);

-- This table provides a list of items that are associated with a given civilization.
-- This can be things like unique units, abilities etc.
CREATE TABLE 'LeaderItems' (
	'LeaderDomain' TEXT DEFAULT 'StandardLeaders',
	'LeaderType' TEXT NOT NULL,
	'Type' TEXT NOT NULL,
	'Kind' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'Icon' TEXT,
	'SortIndex' INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY('LeaderDomain', 'LeaderType', 'Type')
);

-- This table represents various tags that can be used as filters and chips.
CREATE TABLE 'LeaderTags' (
	'LeaderDomain' TEXT DEFAULT 'StandardLeaders',
	'LeaderType' TEXT NOT NULL,
	'TagType' TEXT NOT NULL,
	PRIMARY KEY('LeaderDomain', 'LeaderType', 'TagType'),
	FOREIGN KEY('TagType') REFERENCES 'Tags'('TagType')
);

-- This table represents things the leader selection unlocks in various ages of the game.
CREATE TABLE 'LeaderUnlocks' (
	'LeaderDomain' TEXT DEFAULT 'StandardLeaders',
	'LeaderType' TEXT NOT NULL,
	'AgeDomain' TEXT,
	'AgeType' TEXT,
	'Type' TEXT NOT NULL,
	'Kind' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'Icon' TEXT,
	'SortIndex' INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE 'LeaderQuotes' (
	'LeaderDomain' TEXT DEFAULT 'StandardLeaders',
	'LeaderType' TEXT NOT NULL,
	'Quote' TEXT NOT NULL,
	PRIMARY KEY('LeaderDomain', 'LeaderType')
);

CREATE TABLE 'LegacyPaths' (
	'Domain' TEXT DEFAULT 'StandardLegacyPaths',
	'LegacyPathType' TEXT NOT NULL,
	'AgeType' TEXT NOT NULL,
	'Category' TEXT NOT NULL,
	'LegacyPathClassType' TEXT NOT NULL,
	'LegacyPathClassName' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'Icon' TEXT,
	'SortIndex' INTEGER NOT NULL DEFAULT 0,
	Primary Key('Domain', 'LegacyPathType')
);

CREATE TABLE 'Mementos' (
	'Domain' TEXT DEFAULT 'StandardMementos',
	'Type' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'Icon' TEXT,
	'SortIndex' INTEGER NOT NULL DEFAULT 0,
	'FunctionalDescription' TEXT NOT NULL,
	'Tier' TEXT NOT NULL DEFAULT 'Minor',
	'LeaderSpecific' TEXT DEFAULT 'NO_LEGEND_PATH',
	'UnlockTitle' TEXT NOT NULL,
	'UnlockReason' TEXT,
	'Hidden' BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE 'MementoSlots' (
	'Domain' TEXT DEFAULT 'StandardMementoSlots',
	'Id' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'UnlockTitle' TEXT NOT NULL,
	'ParameterId' TEXT NOT NULL
);

CREATE TABLE 'NaturalWonders' (
	'Domain' TEXT DEFAULT 'StandardNaturalWonders',
	'FeatureType' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'Icon' TEXT,
	'SortIndex' INTEGER NOT NULL DEFAULT 0,
	Primary Key('Domain', 'FeatureType')
);

CREATE TABLE 'TurnPhases' (
	'Domain' TEXT NOT NULL DEFAULT 'StandardTurnPhases',
	'TurnPhaseType' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'SortIndex' INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE 'TurnTimers' (
	'Domain' TEXT NOT NULL DEFAULT 'StandardTurnTimers',
	'TurnTimerType' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'SortIndex' INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE 'Victories'(
	'Domain' TEXT NOT NULL DEFAULT 'StandardVictories',
	'VictoryType' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'Icon' TEXT,
	'Visible' BOOLEAN NOT NULL DEFAULT 1,
	'ReadOnly' BOOLEAN NOT NULL DEFAULT 0,
	'EnabledByDefault' BOOLEAN NOT NULL DEFAULT 1
);

-- Rulesets, Ages, and Maps have the ability to override a parameter's domain with another.
CREATE TABLE 'DomainOverridesByAge'(
	'AgeType' TEXT NOT NULL,			-- The age type
	'PlayerID' INTEGER,					-- Optional: The player slot.
	'ParameterID' TEXT NOT NULL,		-- The parameterID to replace the domain.
	'Domain' TEXT NOT NULL				-- The new domain.  This is a REPLACEMENT not a Union.
);

CREATE TABLE 'DomainOverridesByMap'(
	'Map' TEXT NOT NULL,				-- The map file
	'PlayerID' INTEGER,					-- Optional: The player slot.
	'ParameterID' TEXT NOT NULL,		-- The parameterID to replace the domain.
	'Domain' TEXT NOT NULL				-- The new domain.  This is a REPLACEMENT not a Union.
);

CREATE TABLE 'DomainOverridesByRuleset'(
	'RulesetType' TEXT NOT NULL,		-- The ruleset type.
	'PlayerID' INTEGER,					-- Optional: The player slot.
	'ParameterID' TEXT NOT NULL,		-- The parameterID to replace the domain.
	'Domain' TEXT NOT NULL				-- The new domain.  This is a REPLACEMENT not a Union.
);

-- These tables are meant to restrict domains, rather than replace them.
-- Restriction is done via set intersecting.
-- Restrict parameter values based on what map is selected.
CREATE TABLE 'SupportedValuesByAge'(
	'AgeType' TEXT NOT NULL,			-- The primary key of Ages.
	'PlayerID' INTEGER,					-- Optional: The player slot.
	'Domain' TEXT NOT NULL,				-- The domain of the value.
	'Value' TEXT NOT NULL				-- The domain value to intersect with.
);

CREATE TABLE 'SupportedValuesByMap'(
	'Map' TEXT NOT NULL,				-- The primary key of Maps.
	'PlayerID' INTEGER,					-- Optional: The player slot.
	'Domain' TEXT NOT NULL,				-- The domain of the value.
	'Value' TEXT NOT NULL				-- The domain value to intersect with.
);

CREATE TABLE 'SupportedValuesByRuleset'(
	'RulesetType' TEXT NOT NULL,		-- The ruleset type.
	'PlayerID' INTEGER,					-- Optional: The player slot.
	'Domain' TEXT NOT NULL,				-- The domain of the value.
	'Value' TEXT NOT NULL				-- The domain value to intersect with.
);

CREATE TABLE 'SupportedValuesByPlayerLeader'(
	'LeaderDomain' TEXT NOT NULL,		-- The leader domain.
	'LeaderType' TEXT NOT NULL,			-- The leader type.
	'PlayerID' INTEGER,					-- Optional: The player slot.
	'Domain' TEXT NOT NULL,				-- The domain of the value.
	'Value' TEXT NOT NULL				-- The domain value to intersect with.
);

CREATE TABLE 'UnSupportedValuesByAge'(
	'AgeType' TEXT NOT NULL,			-- The primary key of Ages.
	'PlayerID' INTEGER,					-- Optional: The player slot.
	'Domain' TEXT NOT NULL,				-- The domain of the value.
	'Value' TEXT NOT NULL				-- The domain value to intersect with.
);

CREATE TABLE 'UnSupportedValuesByMap'(
	'Map' TEXT NOT NULL,				-- The primary key of Maps.
	'PlayerID' INTEGER,					-- Optional: The player slot.
	'Domain' TEXT NOT NULL,				-- The domain of the value.
	'Value' TEXT NOT NULL				-- The domain value to difference with.
);

CREATE TABLE 'UnSupportedValuesByRuleset'(
	'RulesetType' TEXT NOT NULL,		-- The ruleset type.
	'PlayerID' INTEGER,					-- Optional: The player slot.
	'Domain' TEXT NOT NULL,				-- The domain of the value.
	'Value' TEXT NOT NULL				-- The domain value to difference with.
);

CREATE TABLE 'UnSupportedValuesByPlayerLeader'(
	'LeaderDomain' TEXT NOT NULL,		-- The leader domain.
	'LeaderType' TEXT NOT NULL,			-- The leader type.
	'PlayerID' INTEGER,					-- Optional: The player slot.
	'Domain' TEXT NOT NULL,				-- The domain of the value.
	'Value' TEXT NOT NULL				-- The domain value to difference with.
);

-- This table is meant for defining telemetry events sent up to 2K Telemetry-K.
CREATE TABLE 'TwoKTelemetryEvents'(
	'EventName' TEXT NOT NULL				-- The event name.
);

CREATE TABLE 'LiveEvents' (
	'LiveEventType' TEXT NOT NULL,
	'ConfigurationKey' TEXT NOT NULL,
	PRIMARY KEY('LiveEventType')
);

CREATE TABLE 'OwnershipConditions' (
	'ItemType' TEXT NOT NULL,			-- The Leader/Civ type for the content
	'Action' TEXT NOT NULL				-- The action to take to gain ownership of the content
);
