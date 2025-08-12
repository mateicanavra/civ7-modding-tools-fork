-- Modding Framework Schema
-- 
-- Revision History
-- Version 5:
--  * Added EpicMods table where Epic-DLC mods are located
-- Version 4:
--  * Mods.Disabled is now nullable where NULL == 'let the app decide'.
-- Version 3:
--  * ActionFileReferences and ActionUriReferences merged into a more flexible ActionItems.
--  * Added item properties.
-- Version 2:
--  * Removed explicit scopes
-- Version 1:
--	* First pass

-- Generate Schema

-- A table containing all of the files 'discovered' by the modding framework.
-- A locally unique identifier representing the file.
-- @ScannedFileRowId is the locally unique identifier to the file.
-- @Path is the path to the file.
-- @LastWriteTime represents the time stamp the file was written.  Used to invalidate mods and other data.
CREATE TABLE ScannedFiles(
	'ScannedFileRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL ,
	'Path' TEXT UNIQUE, 
	'LastWriteTime' INTEGER NOT NULL
);

-- Track any additional files associated with a mod.
-- @ScannedFileRowId is the specific scanned file associated.
-- @Path is the path to the file.
-- @LastWriteTime represents the time stamp the file was written.  Used to invalidate mods and other data.
CREATE TABLE AdditionalScannedFiles(
	'ScannedFileRowId' INTEGER NOT NULL,
	'Path' TEXT NOT NULL, 
	'LastWriteTime' INTEGER NOT NULL,
	PRIMARY KEY(ScannedFileRowId, Path)
	FOREIGN KEY(ScannedFileRowId) REFERENCES ScannedFiles(ScannedFileRowId) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Primary table of all discovered mods
-- @ModRowId is a locally unique identifier representing a discovered mod.
-- @FileId is a reference to the .modinfo file discovered in ScannedFiles.
-- @ModId is a globally unique identifier representing the mod.
-- @Version is an integer value > 0.  Values of 0 or less are considered invalid.
-- @EnabledStatus 0 = Automatic, 1 = ExplicitEnable, -1 = ExplicitDisable
-- @LastRetrieved is a times tamp for when the mod was discovered.
CREATE TABLE Mods(
	'ModRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	'ScannedFileRowId' INTEGER NOT NULL, 
	'ModId' TEXT NOT NULL,
	'Version' INTEGER NOT NULL,
	'Disabled' BOOLEAN,
	FOREIGN KEY(ScannedFileRowId) REFERENCES ScannedFiles(ScannedFileRowId) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table of all discovered epic mods
-- @ModRowId is a locally unique identifier representing a discovered mod.
-- @FileId is a reference to the .modinfo file discovered in ScannedFiles.
-- @ModId is a globally unique identifier representing the mod.
-- @Version is an integer value > 0.  Values of 0 or less are considered invalid.
-- @LastRetrieved is a times tamp for when the mod was discovered.
CREATE TABLE EpicMods(
	'ModRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	'ScannedFileRowId' INTEGER NOT NULL, 
	'ModId' TEXT NOT NULL,
	'Version' INTEGER NOT NULL,
	FOREIGN KEY(ScannedFileRowId) REFERENCES ScannedFiles(ScannedFileRowId) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Name/Value pair representing properties of a mod.
-- @ModRowId represents the specific mod instance this file is a member of.
-- @Name is the name of the property.
-- @Value is the value of the property.
CREATE TABLE ModProperties(
	'ModRowId' INTEGER NOT NULL, 
	'Name' TEXT NOT NULL, 
	'Value' TEXT, 
	PRIMARY KEY ('ModRowId', 'Name'), 
	FOREIGN KEY ('ModRowId') REFERENCES Mods('ModRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- A table describing the relationship of one mod package to another.
-- @ModRowId represents the mod instance initiating the relationship
-- @OtherModId represents the other mod (note that this is the ModId and not ModRowId)
-- @Relationship represents the kind of relationship.
-- @OtherModTitle represents the name of the other mod (used for situations where the mod does not exist).
CREATE TABLE ModRelationships(
	'ModRowId' INTEGER NOT NULL, 
	'OtherModId' TEXT NOT NULL, 
	'Relationship' TEXT NOT NULL, 
	'OtherModTitle' TEXT, 
	FOREIGN KEY('ModRowId') REFERENCES Mods('ModRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- Asset Packages
-- These are defined by an asset dependency file, which has references to all the
-- art, audio and other binary assets.

-- Primary table of all discovered asset packages
-- @AssetPackageRowId is a locally unique identifier representing a discovered mod.
-- @FileId is a reference to the .dep file discovered in ScannedFiles.
-- @AssetPackageId is a globally unique identifier representing the assets.
-- @Version is an integer value > 0.  Values of 0 or less are considered invalid.
-- @EnabledStatus 0 = Automatic, 1 = ExplicitEnable, -1 = ExplicitDisable
-- @LastRetrieved is a times tamp for when the mod was discovered.
CREATE TABLE AssetPackages(
	'AssetPackageRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	'ScannedFileRowId' INTEGER NOT NULL, 
	'AssetPackageId' TEXT NOT NULL,
	'Version' INTEGER NOT NULL,
	'Disabled' BOOLEAN NOT NULL DEFAULT 1,
	FOREIGN KEY(ScannedFileRowId) REFERENCES ScannedFiles(ScannedFileRowId) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Criteria
-- @CriteriaRowId is the unique id associated with the criteria.
-- @ModRowId is the specific mod associated with the criteria.
-- @CriteriaId is the user friendly identifier of the criteria.
CREATE TABLE Criteria(
	'CriteriaRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	'ModRowId' INTEGER NOT NULL,
	'CriteriaId' TEXT NOT NULL,
	'Any' BOOLEAN NOT NULL DEFAULT 0,
	FOREIGN KEY ('ModRowId') REFERENCES Mods('ModRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- Individual criterion of criteria.
-- @CriterionRowId is the unique id associated with the criterion
-- @CriteriaRowId is the criteria which the criterion is associated with.
-- @CriteriaType is the type of criterion.
CREATE TABLE Criterion(
	'CriterionRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	'CriteriaRowId' INTEGER NOT NULL,
	'CriterionType' TEXT NOT NULL,
	'Inverse' BOOLEAN NOT NULL DEFAULT 0,
	FOREIGN KEY ('CriteriaRowId') REFERENCES Criteria('CriteriaRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- Properties of a criterion.
-- @CriterionRowId is the criterion which the property is associated with
-- @Name is the name of the property.
-- @Value is the value of the property (as text).
CREATE TABLE CriterionProperties(
	'CriterionRowId' INTEGER NOT NULL, 
	'Name' TEXT NOT NULL, 
	'Value' TEXT NOT NULL, 
	PRIMARY KEY ('CriterionRowId', 'Name'), 
	FOREIGN KEY ('CriterionRowId') REFERENCES Criterion('CriterionRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- All action groups in a mod.
-- @ActionGroupRowId is the locally unique id of the action group.
-- @ModRowId is the mod containing the action group.
-- @ActionGroupId is an optional string identifier for the group unique within the mod.
-- @Scope is the scope of the action group; Setup and InGame are the only allowed options currently.
-- @CriteriaRowId is the reference to the action group criteria, if provided.
CREATE TABLE ActionGroups(
	'ActionGroupRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	'ModRowId' INTEGER NOT NULL,
	'ActionGroupId' TEXT,
	'Scope' TEXT NOT NULL,
	'CriteriaRowId' INTEGER,
	FOREIGN KEY('CriteriaRowId') REFERENCES Criteria('CriteriaRowId') ON DELETE CASCADE ON UPDATE CASCADE
);	

-- Properties of an action group.
-- @ActionGroupRowId is the action group which the property is associated with
-- @Name is the name of the property.
-- @Value is the value of the property (as text).
CREATE TABLE ActionGroupProperties(
	'ActionGroupRowId' INTEGER NOT NULL, 
	'Name' TEXT NOT NULL, 
	'Value' TEXT NOT NULL, 
	PRIMARY KEY ('ActionGroupRowId', 'Name'), 
	FOREIGN KEY ('ActionGroupRowId') REFERENCES ActionGroups('ActionGroupRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- A table describing the relationship of one mod action group to another.
-- @ActionGroupRowId represents the action group instance initiating the relationship.
-- @OtherModId represents the other mod (note that this is the ModId and not ModRowId).
-- @OtherActionGroupId represents the other mod's action group (note that this is ActionGroupId and not ActionGroupRowId).
-- @Relationship represents the kind of relationship.
CREATE TABLE ActionGroupRelationships(
	'ActionGroupRowId' INTEGER NOT NULL, 
	'OtherModId' TEXT NOT NULL,
	'OtherActionGroupId' TEXT NOT NULL,
	'Relationship' TEXT NOT NULL,
	FOREIGN KEY('ActionGroupRowId') REFERENCES ActionGroups('ActionGroupRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- All actions in a mod.
-- @ActionRowId is the locally unique id of the action.
-- @ModRowId is the mod containing the action.
-- @ActionType is the type of the action.
CREATE TABLE Actions(
	'ActionRowId' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	'ActionGroupRowId' INTEGER NOT NULL,
	'ActionType' TEXT NOT NULL,
	FOREIGN KEY('ActionGroupRowId') REFERENCES ActionGroups('ActionGroupRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- Name/Value pair representing properties of an action.
-- @ActionRowId represents the specific action instance this file is a member of.
-- @Name is the name of the property.
-- @Value is the value of the property.
CREATE TABLE ActionProperties(
	'ActionRowId' INTEGER NOT NULL,
	'Name' TEXT NOT NULL,
	'Value' TEXT NOT NULL,
	PRIMARY KEY ('ActionRowId', 'Name'),
	FOREIGN KEY ('ActionRowId') REFERENCES Actions('ActionRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- This table contains all items associated with the action.
-- @ActionRowId is the locally unique identifier referring to the mod action.
-- @Item is a string value that represents the item.
-- @Arrangement represents the order in which the file was originally passed in.
CREATE TABLE ActionItems(
	'ActionRowId' INTEGER NOT NULL,
	'Arrangement' INTEGER NOT NULL,
	'Item' TEXT,
	PRIMARY KEY('ActionRowId', 'Arrangement'),
	FOREIGN KEY('ActionRowId') REFERENCES Actions('ActionRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- This table contains additional properties associated with an item.
-- @ActionRowId is the locally unique identifier referring to the mod action.
-- @Arrangement represents the order in which the file was originally passed in.
-- @Name is a string name of the property.
-- @Value is a string value that represents the item property.
CREATE TABLE ActionItemProperties(
	'ActionRowId' INTEGER NOT NULL,
	'Arrangement' INTEGER NOT NULL,
	'Name' TEXT NOT NULL,
	'Value' TEXT NOT NULL,
	PRIMARY KEY('ActionRowId', 'Arrangement', 'Name'),
	FOREIGN KEY('ActionRowId', 'Arrangement') REFERENCES ActionItems('ActionRowId', 'Arrangement') ON DELETE CASCADE ON UPDATE CASCADE
);
		
-- This table contains localized versions of descriptive strings used by the modinfo
-- @ModRowId is mod instance that owns the string.
-- @Tag is the key that is used to reference the string.
-- @Locale represents what locale the text is localized for.
-- @Text is the actual text.
CREATE TABLE LocalizedText(
	'ModRowId' INTEGER NOT NULL,
	'Tag' TEXT NOT NULL,
	'Locale' TEXT NOT NULL,
	'Text' TEXT NOT NULL,
	PRIMARY KEY('ModRowId', 'Tag', 'Locale'),
	FOREIGN KEY('ModRowId') REFERENCES Mods('ModRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- This table contains statements to assist with migrating data during a database upgrade.
-- @SQL is the statement to run.
-- @MinVersion is the minimal old database version to run the SQL.
-- @MaxVersion is the maximum old database version to run the SQL.
-- @SortIndex is the column used to sort the statements.
CREATE TABLE Migrations(
	'SQL' TEXT NOT NULL,
	'MinVersion' INTEGER NOT NULL,
	'MaxVersion' INTEGER NOT NULL,
	'SortIndex' INTEGER NOT NULL
);

-- This table contains a list of mods that should ignore compatibility warnings.
-- @ModRowId is the unique id associated with a mod.
CREATE TABLE ModCompatibilityWhitelist(
	'ModRowId' INTEGER NOT NULL,
	'GameVersion' TEXT NOT NULL,
	PRIMARY KEY ('ModRowId'),	
	FOREIGN KEY ('ModRowId') REFERENCES Mods('ModRowId') ON DELETE CASCADE ON UPDATE CASCADE
);

-- Data Migrations.

-- User version is written at the end.
PRAGMA user_version(5);
