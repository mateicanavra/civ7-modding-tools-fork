
PRAGMA user_version = 2;
 
 CREATE TABLE 'IconContexts' (
	'Context' TEXT NOT NULL,
	'AllowTinting' INTEGER DEFAULT 1,
	PRIMARY KEY('Context')
);
 
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
CREATE TRIGGER 'IconDefinitions_Insert' BEFORE INSERT ON IconDefinitions
BEGIN
	INSERT OR IGNORE INTO Icons VALUES (NEW.'ID', NEW.'Context');
END;

CREATE TABLE 'IconAliases' (
	'ID' TEXT NOT NULL,
	'Context' TEXT NOT NULL DEFAULT 'DEFAULT',
	'OtherID' TEXT NOT NULL,
	'OtherContext' TEXT NOT NULL DEFAULT 'DEFAULT',
	PRIMARY KEY('ID', 'Context'),
	FOREIGN KEY('OtherID', 'OtherContext') REFERENCES Icons('ID', 'Context') ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE 'ChatIconGroups' (
	'GroupID' TEXT NOT NULL,
	'IconID' TEXT NOT NULL,
	'SortIndex' INTEGER NOT NULL DEFAULT 100,
	PRIMARY KEY('GroupID')
);

CREATE TABLE 'ChatIcons' (
	'ID' TEXT NOT NULL,
	'Context' TEXT,
	'GroupID' TEXT NOT NULL DEFAULT 'DEFAULT',
	'GroupIndex' INTEGER NOT NULL DEFAULT 100,
	PRIMARY KEY('ID', 'Context'),
	FOREIGN KEY('ID', 'Context') REFERENCES Icons('ID', 'Context') ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY('GroupID') REFERENCES ChatIconGroups('GroupID') ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TRIGGER 'IconAliases_Insert' BEFORE INSERT ON IconAliases
BEGIN
	INSERT OR IGNORE INTO Icons VALUES (NEW.'ID', NEW.'Context');
END;
