-- Hall of Fame Schema
pragma user_version(1);
-- This table contains statements to assist with migrating data during a database upgrade.
-- @SQL is the statement to run.
-- @MinVersion is the minimal old database version to run the SQL.
-- @MaxVersion is the maximum old database version to run the SQL.
-- @SortIndex is the column used to sort the statements.
CREATE TABLE Migrations(
	'SQL' TEXT NOT NULL,
	'MinVersion' INTEGER NOT NULL,
	'MaxVersion' INTEGER NOT NULL,
	'SortIndex' INTEGER NOT NULL DEFAULT 0
);
-- Root table specifying rulesets.
CREATE TABLE 'Rulesets' ('Ruleset' TEXT NOT NULL PRIMARY KEY);
-- List of types for a given ruleset.
CREATE TABLE 'RulesetTypes' (
	'Ruleset' TEXT NOT NULL,
	'Type' TEXT NOT NULL,
	'Kind' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Icon' TEXT,
	PRIMARY KEY('Ruleset', 'Type'),
	FOREIGN KEY('Ruleset') REFERENCES 'Rulesets'('Ruleset') ON DELETE CASCADE ON UPDATE CASCADE
);
-- Root table specifying games.
CREATE TABLE 'Games' (
	'GameID' INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	'Ruleset' TEXT NOT NULL,
	'GameMode' INTEGER,
	'TurnCount' INTEGER NOT NULL,
	'GameSpeedType' TEXT NOT NULL,
	'MapSizeType' TEXT NOT NULL,
	'Map' TEXT NOT NULL,
	'StartAgeType' TEXT NOT NULL,
	'StartTurn' INTEGER NOT NULL DEFAULT 1,
	'VictorTeamID' INTEGER,
	'VictoryType' TEXT,
	'LastPlayed' INTEGER NOT NULL,
	FOREIGN KEY('Ruleset') REFERENCES 'Rulesets'('Ruleset') ON DELETE CASCADE ON UPDATE CASCADE
);
-- Extended data for 'Player' game objects.
CREATE TABLE 'GamePlayers' (
	'PlayerObjectID' INTEGER NOT NULL,
	'IsLocal' BOOLEAN NOT NULL DEFAULT 0,
	'IsAI' BOOLEAN NOT NULL DEFAULT 0,
	'IsMajor' BOOLEAN NOT NULL DEFAULT 1,
	-- Non-Major players often have NULL for leader type.
	'LeaderType' TEXT,
	'LeaderName' TEXT,
	'CivilizationType' TEXT,
	'CivilizationName' TEXT,
	'DifficultyType' TEXT,
	'Score' NUMERIC NOT NULL DEFAULT 0,
	'PlayerID' INTEGER NOT NULL,
	'TeamId' INTEGER NOT NULL,
	PRIMARY KEY('PlayerObjectID'),
	FOREIGN KEY('PlayerObjectID') REFERENCES 'GameObjects'('ObjectID') ON DELETE CASCADE ON UPDATE CASCADE
);
-- Referenced game objects.
-- Only the game id, kind, and name are required.
-- Everything else is used to define the object being referenced.
CREATE TABLE 'GameObjects' (
	'ObjectID' INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	'GameID' INTEGER NOT NULL,
	'PlayerObjectID' INTEGER,
	'Type' TEXT NOT NULL,
	'Name' TEXT,
	'PlotIndex' INTEGER,
	'ExtraData' TEXT,
	'Icon' TEXT,
	FOREIGN KEY('GameID') REFERENCES 'Games'('GameID') ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY('PlayerObjectID') REFERENCES 'GamePlayers'('PlayerObjectID') ON DELETE CASCADE ON UPDATE CASCADE
);
-- Statistics indexed by ruleset rather than a specific game object.
CREATE TABLE 'RulesetDataPointValues' (
	'DataPoint' TEXT NOT NULL,
	'Ruleset' TEXT NOT NULL,
	'Type' TEXT,
	'ValueObjectID' INTEGER,
	'ValueString' TEXT,
	'ValueNumeric' NUMERIC,
	FOREIGN KEY('Ruleset') REFERENCES 'Rulesets'('Ruleset') ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY('ValueObjectID') REFERENCES 'GameObjects'('ObjectID') ON DELETE CASCADE ON UPDATE CASCADE
);
-- Statistics indexed by specific games.
CREATE TABLE 'GameDataPointValues' (
	'DataPoint' TEXT NOT NULL,
	'GameID' INTEGER NOT NULL,
	'Type' TEXT,
	'ValueObjectID' INTEGER,
	'ValueString' TEXT,
	'ValueNumeric' NUMERIC,
	FOREIGN KEY('GameID') REFERENCES 'Games'('GameID') ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY('ValueObjectID') REFERENCES 'GameObjects'('ObjectID') ON DELETE CASCADE ON UPDATE CASCADE
);
-- Statistics indexed by specific game objects.
CREATE TABLE 'ObjectDataPointValues' (
	'DataPoint' TEXT NOT NULL,
	'ObjectID' INTEGER NOT NULL,
	'Type' TEXT,
	'ValueObjectID' INTEGER,
	'ValueString' TEXT,
	'ValueNumeric' NUMERIC,
	FOREIGN KEY('ObjectID') REFERENCES 'GameObjects'('ObjectID') ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY('ValueObjectID') REFERENCES 'GameObjects'('ObjectID') ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE 'DataSets' (
	'DataSetID' INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	'DataSet' TEXT NOT NULL,
	'Ruleset' TEXT,
	'GameID' INTEGER,
	'ObjectID' INTEGER,
	'Type' TEXT,
	FOREIGN KEY('Ruleset') REFERENCES 'Rulesets'('Ruleset') ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY('GameID') REFERENCES 'Games'('GameID') ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY('ObjectID') REFERENCES 'GameObjects'('ObjectID') ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE 'DataSetValues' (
	'DataSetID' INTEGER NOT NULL,
	'X' INTEGER NOT NULL,
	'Y' NUMERIC,
	PRIMARY KEY('DataSetID', 'X'),
	FOREIGN KEY('DataSetID') REFERENCES 'DataSets'('DataSetID') ON DELETE CASCADE ON UPDATE CASCADE
) WITHOUT ROWID;
-- Additional Indices for Performance
CREATE INDEX GameDataPointValues_DataPointGameId on GameDataPointValues(DataPoint, GameID);
CREATE INDEX GameObjects_GameID on GameObjects(GameID);
CREATE INDEX ObjectDataPointValues_DataPointObjectID on ObjectDataPointValues(DataPoint, ObjectID);
CREATE INDEX RulesetDataPointValues_DataPointRuleset on RulesetDataPointValues(DataPoint, Ruleset);
CREATE INDEX DataSets_DataSetObjectId on DataSets(DataSet, ObjectID);