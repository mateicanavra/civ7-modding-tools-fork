

CREATE TABLE IF NOT EXISTS MetaQueryTypes (
	MetaQueryType TEXT NOT NULL,
	PRIMARY KEY(MetaQueryType)
);


CREATE TABLE IF NOT EXISTS MetaQueries (
	MetaQueryID	TEXT NOT NULL,
	MetaQueryType TEXT NOT NULL,
	SQL	TEXT NOT NULL,
	PRIMARY KEY(MetaQueryID),
	FOREIGN KEY(MetaQueryType) REFERENCES MetaQueryTypes(MetaQueryType) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE IF NOT EXISTS 'QueryTypes' (
	"QueryType" TEXT NOT NULL,
	PRIMARY KEY('QueryType')
);

CREATE TABLE IF NOT EXISTS 'Queries' (
	"QueryID"	TEXT NOT NULL,
	"Type"	TEXT NOT NULL,
	"SQL"	TEXT NOT NULL,
	PRIMARY KEY('QueryID'),
	FOREIGN KEY('Type') REFERENCES 'QueryTypes'('QueryType') ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE 'QueryCriteria'(
	'QueryID' TEXT NOT NULL,
	'ConfigurationGroup' TEXT NOT NULL,
	'ConfigurationKey' TEXT NOT NULL,
	'Operator' TEXT NOT NULL DEFAULT 'Equals',
	'ConfigurationValue',
	FOREIGN KEY('QueryID') REFERENCES 'Queries'('QueryID')
);

CREATE TABLE 'QueryParameters'(
	'QueryID' TEXT NOT NULL,
	'Index' INTEGER NOT NULL,
	'ConfigurationGroup' TEXT NOT NULL,
	'ConfigurationKey' TEXT NOT NULL,
	PRIMARY KEY('QueryID', 'Index'),
	FOREIGN KEY('QueryID') REFERENCES 'Queries'('QueryID')
);

CREATE TABLE 'ParameterQueryCriteria'(
	'ParameterQueryID' TEXT NOT NULL,
	'ConfigurationGroup' TEXT NOT NULL,
	'ConfigurationKey' TEXT NOT NULL,
	'Operator' TEXT NOT NULL DEFAULT 'Equals',
	'ConfigurationValue'
);

CREATE TABLE 'ParameterQueryDependencies'(
	'ParameterQueryID' TEXT NOT NULL,
	'ConfigurationGroup' TEXT NOT NULL,
	'ConfigurationKey' TEXT NOT NULL,
	'Operator' TEXT NOT NULL DEFAULT 'Equals',
	'ConfigurationValue'
);


CREATE TABLE 'ParameterGroups'(
	'GroupID' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	PRIMARY KEY('GroupID')
);

CREATE TABLE 'Parameters'(
	'Key1' TEXT,
	'Key2' TEXT,
	'ParameterID' TEXT NOT NULL,								-- A semi-unique identifier of the parameter.  Semi-unique because it depends on Key1 and Key2.
	'Name' TEXT NOT NULL,										-- The name of the parameter.
	'Description' TEXT,											-- The description of the parameter (used for UI purposes, typically a tooltip).
	'Domain' TEXT NOT NULL,										-- The domain of values to use
	'Hash' BOOLEAN NOT NULL DEFAULT 0,							-- Whether or not to hash the value when writing to the config.  Only applies to the value, not other config entries.
	'Array' BOOLEAN NOT NULL DEFAULT 0,							-- Whether or not the value of the parameter is an array of 0-N values.
	'DefaultValue',												-- The default value to use, null allowed.
	'ConfigurationGroup' TEXT NOT NULL,							-- The map used to write all of the configuration values (e.g Game, Map, Player[id])
	'ConfigurationKey' TEXT NOT NULL,							-- The key used to write out the value of the parameter.
	'DomainConfigurationKey' TEXT,								-- [Optional] Write out the parameter's domain to the configuration.
	'PossibleValuesConfigurationKey' TEXT,						-- [Optional] Write out a comma delimited list of all possible values (including original domain).  This only applies to name-value domains.					
	'ValueConfigurationKey' TEXT,								-- [Optional] Write out the the unaltered value. This is primarily used when the parameter enables hashing but still needs to write the string.
	'ValueNameConfigurationKey' TEXT,							-- [Optional] Write out the name of the value as a localization bundle.	This only applies to name-value domains.
	'ValueHashConfigurationKey' TEXT,							-- [Optional] Write out the value to the configuration.  This is used when hash=0 but the value and the hash still need to be written. 
	'ValueDomainConfigurationKey' TEXT,							-- [Optional] Write out the original domain of the selected value. (This may not match the parameter's domain).
	'NameArrayConfigurationKey' TEXT,							-- [Optional] Include the name of the parameter in a comma delimited list so long as the value is not false or null.
	'GroupID' TEXT NOT NULL,									-- Used by the UI to determine how to triage the parameter.
	'Hidden' BOOLEAN NOT NULL DEFAULT 0,						-- Used by the UI to determine whether the parameter should be shown.  Parameter dependencies may override this.
	'ReadOnly' BOOLEAN NOT NULL DEFAULT 0,						-- Used by the UI to determine whether the parameter should be disabled. Parameter criteria may override this.
	'SupportsSinglePlayer' BOOLEAN NOT NULL DEFAULT 1,
	'SupportsLANMultiplayer' BOOLEAN NOT NULL DEFAULT 1,
	'SupportsInternetMultiplayer' BOOLEAN NOT NULL DEFAULT 1,
	'IsUGC' BOOLEAN NOT NULL DEFAULT 0,
	'ChangeableAfterGameStart' BOOLEAN NOT NULL DEFAULT 0,
	'ChangeableAfterAgeTransition' BOOLEAN NOT NULL DEFAULT 1,
	'UxHint' TEXT,												-- This column 'suggests' what kind of Ux should be used to display it. (e.x. 'SimpleSelectPanel', 'MultiSelectPanel').
	'SortIndex' INTEGER NOT NULL DEFAULT 100,
	FOREIGN key('GroupID') REFERENCES 'ParameterGroups'('GroupID')
);

CREATE TABLE 'ParameterCriteria'(
	'ParameterID' TEXT NOT NULL,
	'ConfigurationGroup' TEXT NOT NULL,
	'ConfigurationKey' TEXT NOT NULL,
	'Operator' TEXT NOT NULL DEFAULT 'Equals',
	'ConfigurationValue'
);

CREATE TABLE 'ParameterDependencies'(
	'ParameterID' TEXT NOT NULL,
	'ConfigurationGroup' TEXT NOT NULL,
	'ConfigurationKey' TEXT NOT NULL,
	'Operator' TEXT NOT NULL DEFAULT 'Equals',
	'ConfigurationValue'
);

CREATE TABLE 'DomainRanges'(
	'Domain' TEXT NOT NULL,
	'MinimumValue' INT NOT NULL DEFAULT 0,
	'MaximumValue' INT NOT NULL
);

CREATE TABLE 'DomainOverrides'(
	'Key1' TEXT,
	'Key2' TEXT,
	'ParameterID' TEXT,
	'DomainOverride' TEXT NOT NULL
);

CREATE TABLE 'DomainValues'(
	'Key1' TEXT,
	'Key2' TEXT,
	'Domain' TEXT NOT NULL,
	'Value' NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT,
	'Icon' TEXT,
	'SortIndex' INTEGER NOT NULL DEFAULT 100,
	PRIMARY KEY('Key1','Key2','Domain','Value')
);

CREATE TABLE 'DomainValueUnions'(
	'Key1' TEXT,
	'Key2' TEXT,
	'Domain' TEXT NOT NULL,
	'OtherDomain' TEXT NOT NULL,
	PRIMARY KEY('Key1','Key2','Domain','OtherDomain')
);

CREATE TABLE 'DomainValueFilters'(
	'Key1' TEXT,
	'Key2' TEXT,
	'Domain' TEXT NOT NULL,
	'Value' NOT NULL,
	'Filter' TEXT NOT NULL,
	PRIMARY KEY('Key1','Key2','Domain','Value')
);

-- When a setup parameter writes to the configuration..
-- Recursively match to the source rows and write the target values.
CREATE TABLE 'ConfigurationUpdates'(
	'Key1' TEXT,
	'Key2' TEXT,
	'SourceGroup' TEXT NOT NULL,
	'SourceKey' TEXT NOT NULL,
	'SourceValue' NOT NULL,
	'TargetGroup' TEXT NOT NULL,
	'TargetKey' TEXT NOT NULL,
	'TargetValue',
	'Hash' BOOLEAN NOT NULL DEFAULT 0,
	'Static' BOOLEAN NOT NULL DEFAULT 0
);

