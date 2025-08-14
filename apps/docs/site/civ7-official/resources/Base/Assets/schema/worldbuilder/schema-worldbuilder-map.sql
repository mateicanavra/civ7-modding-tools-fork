-- WorldBuilder/Age Transition Schema
-- 
-- When updating this file, adding a comment on the nature of the update
-- below is helpful.  Also, bump the version number at the bottom of 
-- this file!
--
-- Revision History
-- Version 8:
--  * Added OriginalName to City data.
-- Version 7: 
--  * Removed points awarded field from Victories.
-- Version 6: 
--  * Updated Victory Information.
-- Version 5:
--  * Added River information
-- Version 4:
--  * Added Player narrative tag points
-- Version 3:
--  * Added Player attribute points.
-- Version 2:
--  * Added Team Information.
--  * Added Unlock information.
--  * Added Victory information.
-- Version 1:
--	* First pass


DROP TABLE IF EXISTS "MetaData";
CREATE TABLE "MetaData" (
		"Name" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(Name));

DROP TABLE IF EXISTS "Map";
CREATE TABLE "Map" (
		"ID" TEXT NOT NULL,
		"Width" INTEGER,
		"Height" INTEGER,
		"TopLatitude" INTEGER,
		"BottomLatitude" INTEGER,
		"WrapX" BOOLEAN,
		"WrapY" BOOLEAN,
		"MapSizeType" TEXT,
		PRIMARY KEY(ID));

DROP TABLE IF EXISTS "MapAttributes";
CREATE TABLE "MapAttributes" (
		"Name" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(Name));
		
DROP TABLE IF EXISTS "Plots";
CREATE TABLE "Plots" (
		"ID" INTEGER NOT NULL,
		"TerrainType" TEXT NOT NULL,
		"BiomeType" TEXT,
		"ContinentType" TEXT,
		"Elevation" INTEGER,
		"IsImpassable" BOOLEAN,
		"Tag" INTEGER,
		PRIMARY KEY(ID));

DROP TABLE IF EXISTS "PlotAttributes";
CREATE TABLE "PlotAttributes" (
		"ID" INTEGER NOT NULL,
		"Type" TEXT NOT NULL,
		"Name" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(ID, Type, Name));

DROP TABLE IF EXISTS "PlotRivers";
CREATE TABLE "PlotRivers" (
		"ID" INTEGER NOT NULL,
		"Size" INTEGER,
		"Outflow" INTEGER,
		"NEInflow" BOOLEAN,
		"EInflow" BOOLEAN,
		"SEInflow" BOOLEAN,
		"SWInflow" BOOLEAN,
		"WInflow" BOOLEAN,
		"NWInflow" BOOLEAN,
		PRIMARY KEY(ID));

DROP TABLE IF EXISTS "PlotCliffs";
CREATE TABLE "PlotCliffs" (
		"ID" INTEGER NOT NULL,
		"IsNEOfCliff" BOOLEAN,
		"IsWOfCliff" BOOLEAN,
		"IsNWOfCliff" BOOLEAN,
		PRIMARY KEY(ID));
		
DROP TABLE IF EXISTS "PlotResources";
CREATE TABLE "PlotResources" (
		"ID" INTEGER NOT NULL,
		"ResourceType" TEXT,
		"ResourceCount" INTEGER,
		PRIMARY KEY(ID));

DROP TABLE IF EXISTS "PlotFeatures";
CREATE TABLE "PlotFeatures" (
		"ID" INTEGER NOT NULL,
		"FeatureType" TEXT,
		PRIMARY KEY(ID));
		
DROP TABLE IF EXISTS "PlotImprovements";
CREATE TABLE "PlotImprovements" (
		"ID" INTEGER NOT NULL,
		"ImprovementType" TEXT,
		"ImprovementOwner" INTEGER,		-- The owner ID in the database, not the game
		PRIMARY KEY(ID));

DROP TABLE IF EXISTS "PlotRoutes";
CREATE TABLE "PlotRoutes" (
		"ID" INTEGER NOT NULL,
		"RouteType" TEXT,
		"RouteAge" TEXT,
		"IsRoutePillaged" BOOLEAN,
		PRIMARY KEY(ID));

DROP TABLE IF EXISTS "PlotOwners";
CREATE TABLE "PlotOwners" (
		"ID" INTEGER NOT NULL,
		"Owner" INTEGER,				-- The owner ID in the database, not the game
		"CityOwner" INTEGER,			-- The city ID in the database, not the game
		"CityWorking" INTEGER,			-- The city ID in the database, not the game
		PRIMARY KEY(ID));

DROP TABLE IF EXISTS "RevealedPlots";
CREATE TABLE "RevealedPlots" (
		"ID" INTEGER NOT NULL,
		"Player" INTEGER,
		PRIMARY KEY(ID, Player));

DROP TABLE IF EXISTS "HistoricMoments";
CREATE TABLE "HistoricMoments" (
		"RowId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		"MomentType" INTEGER NOT NULL,
		"Age" INTEGER NOT NULL,
		"Turn" INTEGER NOT NULL,
		"PlotIndex" INTEGER NOT NULL,
		"ActingPlayer" INTEGER NOT NULL,
		"TargetPlayer" INTEGER,
		"UnitType" INTEGER,
		"ConstructibleType" INTEGER,
		"ConstructibleType2" INTEGER,
		"NamedRiverType" INTEGER,
		"IndependentType" INTEGER,
		"NamedVolcanoType" INTEGER,
		"SiteAge" INTEGER NOT NULL);

DROP TABLE IF EXISTS "StartPositions";
CREATE TABLE "StartPositions" (
		"Plot" INTEGER NOT NULL,
		"Type" STRING NOT NULL,
		"Value" STRING NOT NULL,
		PRIMARY KEY("Plot"));

DROP TABLE IF EXISTS "Units";
CREATE TABLE "Units" (
		"ID" INTEGER NOT NULL,
		"UnitType" TEXT NOT NULL,
		"Owner" INTEGER NOT NULL,		-- The owner ID in the database, not the game
		"Plot"	INTEGER NOT NULL,
		"Name"	TEXT,
		PRIMARY KEY(ID));

DROP TABLE IF EXISTS "UnitShadows";
CREATE TABLE "UnitShadows" (
		"ID" INTEGER NOT NULL,
		"Domain" INTEGER NOT NULL,
		"CoreClass" INTEGER NOT NULL,
		"Tag" INTEGER NOT NULL,
		"Owner" INTEGER NOT NULL,		-- The owner ID in the database, not the game
		"Plot"	INTEGER NOT NULL,
		"IsInCommander"	BOOLEAN NOT NULL,
		PRIMARY KEY(ID));

DROP TABLE IF EXISTS "UnitAttributes";
CREATE TABLE "UnitAttributes" (
		"ID" INTEGER NOT NULL,
		"Type" TEXT NOT NULL,
		"Name" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(ID, Type, Name));

DROP TABLE IF EXISTS "Cities";
CREATE TABLE "Cities" (
		"Owner" INTEGER NOT NULL,		-- The owner ID in the database, not the game
		"Plot"	INTEGER NOT NULL,
		"OriginalName"	TEXT NOT NULL,
		"Name" TEXT NOT NULL,
		"Civilization" INTEGER NOT NULL,
		"OriginalOwner" INTEGER NOT NULL,
		"IsCapital" BOOLEAN NOT NULL,
		PRIMARY KEY(Plot));
		
DROP TABLE IF EXISTS "CityAttributes";
CREATE TABLE "CityAttributes" (
		"ID" INTEGER NOT NULL,
		"Type" TEXT NOT NULL,
		"Name" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(ID, Type, Name));

DROP TABLE IF EXISTS "CityConnections";
CREATE TABLE "CityConnections" (
		"Owner1" INTEGER NOT NULL,		-- The owner ID in the database, not the game
		"CityID1" INTEGER NOT NULL,		-- The city ID in the database, not the game
		"Owner2" INTEGER NOT NULL,		-- The owner ID in the database, not the game
		"CityID2" INTEGER NOT NULL,		-- The city ID in the database, not the game
		"DomainType" TEXT NOT NULL,
		PRIMARY KEY(Owner1, CityID1, Owner2, CityID2));

DROP TABLE IF EXISTS "Districts";
CREATE TABLE "Districts" (
		"DistrictType" TEXT NOT NULL,
		"Owner" INTEGER NOT NULL,		-- The owner ID in the database, not the game
		"CityID" INTEGER NOT NULL,		-- The city ID in the database, not the game, can also be -1 if not owned by a city
		"Plot"	INTEGER NOT NULL,
		PRIMARY KEY(Plot));

DROP TABLE IF EXISTS "DistrictAttributes";
CREATE TABLE "DistrictAttributes" (
		"ID" INTEGER NOT NULL,
		"Type" TEXT NOT NULL,
		"Name" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(ID, Type, Name));

DROP TABLE IF EXISTS "Constructibles";
CREATE TABLE "Constructibles" (
		"ConstructibleType" TEXT NOT NULL,
		"Owner" INTEGER NOT NULL,		-- The owner ID in the database, not the game
		"DistrictID" INTEGER NOT NULL,	-- The district ID in the database, not the game
		"Plot"	INTEGER NOT NULL,
		PRIMARY KEY(ConstructibleType, DistrictID));

DROP TABLE IF EXISTS "Players";
CREATE TABLE "Players" (
		"ID" INTEGER NOT NULL,
		"TeamID" INTEGER NOT NULL,
		"CivilizationType" TEXT,
		"LeaderType" TEXT,
		"CivilizationLevelType" TEXT,
		"AgendaType" TEXT,
		"Status" TEXT,
		"Handicap" TEXT,
		"StartingPosition" TEXT,
		"Color" TEXT,
		"Initialized" BOOLEAN,
		PRIMARY KEY(ID));

DROP TABLE IF EXISTS "PlayerAttributes";
CREATE TABLE "PlayerAttributes" (
		"ID" INTEGER NOT NULL,
		"Type" TEXT NOT NULL,
		"Name" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(ID, Type, Name));

DROP TABLE IF EXISTS "PlayerAttributePoints";
CREATE TABLE "PlayerAttributePoints" (
		"PlayerID" INTEGER NOT NULL,
		"AttributeType" TEXT NOT NULL,
		"Available" INTEGER NOT NULL,
		"Spent" INTEGER NOT NULL,
		PRIMARY KEY(PlayerID, AttributeType));

DROP TABLE IF EXISTS "PlayerWorkers";
CREATE TABLE "PlayerWorkers" (
		"PlayerID" INTEGER NOT NULL,
		"PlotID" INTEGER NOT NULL,
		"Placed" INTEGER NOT NULL,
		PRIMARY KEY(PlayerID, PlotID));

DROP TABLE IF EXISTS "ProgressionTreeNodes";
CREATE TABLE "ProgressionTreeNodes" (
		"ID" INTEGER NOT NULL,
		"TreeType" TEXT NOT NULL,
		"NodeType" TEXT NOT NULL,
		"Depth" INTEGER NOT NULL,
		"RepeatedDepth" INTEGER NOT NULL,
		"Progress" FLOAT NOT NULL,
		PRIMARY KEY(ID, TreeType, NodeType));

DROP TABLE IF EXISTS "PlayerNarrativeTagPoints";
CREATE TABLE "PlayerNarrativeTagPoints" (
		"PlayerID" INTEGER NOT NULL,
		"NarrativeTagType" TEXT NOT NULL,
		"Value" INTEGER NOT NULL,
		PRIMARY KEY(PlayerID, NarrativeTagType));

DROP TABLE IF EXISTS "PlayerUniqueGreatWorks";
CREATE TABLE "PlayerUniqueGreatWorks" (
		"PlayerID" INTEGER NOT NULL,
		"GreatWorkType" INTEGER NOT NULL,
		"Age" INTEGER NOT NULL,
		"TurnCreated" INTEGER NOT NULL,
		PRIMARY KEY(PlayerID, GreatWorkType));

DROP TABLE IF EXISTS "ModProperties";
CREATE TABLE "ModProperties" (
		"Name" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(Name, Value));

DROP TABLE IF EXISTS "ModComponents";
CREATE TABLE "ModComponents" (
		"Type" TEXT NOT NULL,
		"ID" TEXT NOT NULL,
		PRIMARY KEY(Type, ID));

DROP TABLE IF EXISTS "ModComponent_Properties";
CREATE TABLE "ModComponent_Properties" (
		"Type" TEXT NOT NULL,
		"ID" TEXT NOT NULL,
		"Name" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(Type, ID, Name, Value));

DROP TABLE IF EXISTS "ModComponent_Items";
CREATE TABLE "ModComponent_Items" (
		"Type" TEXT NOT NULL,
		"ID" TEXT NOT NULL,
		"Name" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(Type, ID, Name, Value));

DROP TABLE IF EXISTS "ModSettings";
CREATE TABLE "ModSettings" (
		"Type" TEXT NOT NULL,
		"ID" TEXT NOT NULL,
		PRIMARY KEY(Type, ID));

DROP TABLE IF EXISTS "ModSettings_Properties";
CREATE TABLE "ModSettings_Properties" (
		"Type" TEXT NOT NULL,
		"ID" TEXT NOT NULL,
		"Name" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(Type, ID, Name, Value));

DROP TABLE IF EXISTS "ModSettings_Items";
CREATE TABLE "ModSettings_Items" (
		"Type" TEXT NOT NULL,
		"ID" TEXT NOT NULL,
		"Name" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(Type, ID, Name, Value));

DROP TABLE IF EXISTS "ModText";
CREATE TABLE "ModText" (
		"Language" TEXT NOT NULL,
		"ID" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(Language, ID));

DROP TABLE IF EXISTS "ModDependencies";
CREATE TABLE "ModDependencies" (
		"ID" TEXT NOT NULL,
		"Title" TEXT NOT NULL,
		PRIMARY KEY(ID));

DROP TABLE IF EXISTS "GameAttributes";
CREATE TABLE "GameAttributes" (
		"ID" TEXT NOT NULL,
		"Value" TEXT,
		PRIMARY KEY(ID));

-- Age Transition specific information
DROP TABLE IF EXISTS "Victories";
CREATE TABLE "Victories" (
		"Age" TEXT NOT NULL,
		"VictoryClass" TEXT NOT NULL,
		"TeamID" INTEGER NOT NULL,
		"Turn" INTEGER NOT NULL,
		"Place" INTEGER NOT NULL,
		PRIMARY KEY("Age", "VictoryClass", "TeamID"));;	

DROP TABLE IF EXISTS "Unlocks";
CREATE TABLE "Unlocks" (
		"UnlockHash" INTEGER NOT NULL,
		"PlayerID" INTEGER NOT NULL,
		PRIMARY KEY ("UnlockHash", "PlayerID"),
		FOREIGN KEY("PlayerID") REFERENCES "Players"("ID") ON DELETE CASCADE ON UPDATE CASCADE);

DROP TABLE IF EXISTS "RiverInstance";
CREATE TABLE "RiverInstance" (
		"ID" INTEGER NOT NULL,
		"Type" TEXT NOT NULL,
		"DiscoveringCiv" TEXT,
		"CustomName" TEXT,
		PRIMARY KEY(ID));

DROP TABLE IF EXISTS "RiverPlot";
CREATE TABLE "RiverPlot" (
		"ID" INTEGER NOT NULL,
		"PlotIndex" INTEGER NOT NULL,
		PRIMARY KEY(ID, PlotIndex));

DROP TABLE IF EXISTS "RiverFloodplain";
CREATE TABLE "RiverFloodplain" (
		"ID" INTEGER NOT NULL,
		"PlotIndex" INTEGER NOT NULL,
		PRIMARY KEY(ID, PlotIndex));

DROP TABLE IF EXISTS "FeatureVolcano";
CREATE TABLE "FeatureVolcano" (
		"ID" INTEGER NOT NULL,
		"PlotIndex" INTEGER NOT NULL,
		"CollectionType" INTEGER NOT NULL,
		"NamedVolcanoType" INTEGER NOT NULL,
		"FeatureType" INTEGER NOT NULL,
		"CustomName" TEXT,
		PRIMARY KEY(ID, PlotIndex));

-- User version is written at the end.
PRAGMA user_version(7);