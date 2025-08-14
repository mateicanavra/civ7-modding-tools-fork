CREATE TABLE 'XrVersion'(
	'Type' TEXT NOT NULL,
	'Value' INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY('Type', 'Value')
);

CREATE TABLE 'CompositorAtlas'(
	'AtlasID' TEXT NOT NULL,
	'Transform' TEXT DEFAULT NULL,
	'CreateOn' TEXT DEFAULT NULL,
	'Socket' TEXT DEFAULT NULL,
	'Options' TEXT DEFAULT NULL,
	'ResolutionScale' TEXT DEFAULT NULL,
	PRIMARY KEY('AtlasID')
);

CREATE TABLE 'CompositorRegions'(
	'AtlasID' TEXT NOT NULL,
	'RegionID' TEXT NOT NULL,
	'Dimensions' TEXT DEFAULT NULL,
	'Resolution' TEXT DEFAULT NULL,
	'Socket' TEXT DEFAULT NULL,
	'Space' TEXT DEFAULT NULL,
	'Transform' TEXT DEFAULT NULL,
	'Options' TEXT DEFAULT NULL,
	PRIMARY KEY('AtlasID', 'RegionID')
);

CREATE TABLE 'CompositorResources'(
	'AtlasID' TEXT NOT NULL,
	'SectionID' TEXT DEFAULT NULL,
	'Type' TEXT NOT NULL,
	'Path' TEXT NOT NULL,
	PRIMARY KEY('AtlasID', 'Type', 'Path')
);

CREATE TABLE 'TransformSockets'(
	'ID' TEXT NOT NULL,
	'Scene' TEXT DEFAULT NULL,
	'Laterality' TEXT DEFAULT NULL,
	'Space' TEXT NOT NULL,
	'Transform' TEXT NOT NULL,
	PRIMARY KEY('ID', 'Scene', 'Laterality')
);