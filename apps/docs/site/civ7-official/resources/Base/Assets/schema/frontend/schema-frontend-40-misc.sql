-- Misc Configuration Tables
-- These tables don't fall into the other categories but are needed in the configuration database.

-- This table is used to break up credits into different sets.  Used for expansions/dlc/packages.
CREATE TABLE 'Credits'(
	'Package' TEXT NOT NULL,
	'DisplayName' TEXT NOT NULL,
	'Credits' TEXT NOT NULL,
	'SortOrder' INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE 'Movies'(
	'MovieType' TEXT NOT NULL,
	'Resolution' INTEGER NOT NULL,
	'Locale' TEXT NOT NULL,
	'Url' TEXT NOT NULL,
	'Audio' TEXT,
	'StopAudio' TEXT,
	'Subtitles' TEXT,
	'UseCoverFitMode' BOOLEAN NOT NULL DEFAULT 0,
	PRIMARY KEY('MovieType', 'Resolution', 'Locale')
);

-- This table is used to determine which intro movie to use along with any logo replacements.
CREATE TABLE 'Logos'(
	'IntroCinematic' TEXT,
	'MainMenuTransition' TEXT,
	'Priority' INTEGER NOT NULL DEFAULT 0
);

-- This table determines which Gamecore module to use.
CREATE TABLE 'GameCores'(
	'GameCore' TEXT NOT NULL,
	'PackageId' TEXT,
	'DllPrefix' TEXT NOT NULL,
	PRIMARY KEY('GameCore')
);

-- This table is used to define start positions in world builder maps that may not have had the start position baked in.
-- This table also exists in the gameplay database so it may be redundant and possibly removed.
CREATE TABLE 'MapStartPositions' (
	'Map' TEXT NOT NULL,		-- A reference to Maps::File
	'Plot' INTEGER NOT NULL,
	'Type' TEXT NOT NULL,
	'Value' TEXT
);

CREATE TABLE 'DisplayQueuePriorities' (
	'Category' TEXT NOT NULL,
	'Priority' INTEGER NOT NULL,
	PRIMARY KEY('Category')
);

-- Populate with default GameCore DLL.
INSERT INTO "GameCores"("GameCore", "DllPrefix") VALUES("Base","GameCore_Base");
