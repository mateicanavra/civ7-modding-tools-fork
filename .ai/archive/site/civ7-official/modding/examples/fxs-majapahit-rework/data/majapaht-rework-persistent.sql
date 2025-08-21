--========================================================================================================================
-- This file is for changes that will persist across Ages
-- Basically just the changes to the Majapahit Traditions
-- Changes to unique buildings or Borobudur (the Wonder) would probably be here too
--========================================================================================================================
-- Delete old modifiers
--========================================================================================================================
	DELETE FROM TraditionModifiers
	WHERE TraditionType IN ('TRADITION_PANJI', 'TRADITION_NEGARAKERTAGAMA');
--========================================================================================================================
-- Now that the old stuff is deleted, we can add new modifiers
--========================================================================================================================
	-- Panji
	-------------------------------------------
		INSERT INTO TraditionModifiers
				(TraditionType,				ModifierId)
		VALUES	('TRADITION_PANJI',			'MOD_FXS_TRADITION_PANJI_QUARTER_CULTURE'),
				('TRADITION_PANJI',			'MOD_FXS_TRADITION_PANJI_QUARTER_CULTURE_ISLAND');
	-------------------------------------------
	-- Negarakertagama
	-------------------------------------------
		INSERT INTO TraditionModifiers
				(TraditionType,					ModifierId)
		VALUES	('TRADITION_NEGARAKERTAGAMA',	'MOD_FXS_TRADITION_NEGARAKERTAGAMA_ADJACENCY');
--========================================================================================================================
-- While the adjacency is ACTIVATED with a modifier,
-- It is still handled as a separate system,
-- so we define it here.

-- Adjacency Yield Changes
--========================================================================================================================
		INSERT INTO Adjacency_YieldChanges
			(
				ID,
				YieldType,
				YieldChange,
				TilesRequired,
				AdjacentQuarter
			)
		VALUES
			(
				'FXS_NegarakertagamaQuarterHappiness',
				'YIELD_HAPPINESS',
				1,
				1,
				1 -- When working with SQL, you need to use 1/0 instead of True/False.
			);

		INSERT INTO Constructible_Adjacencies
				(ConstructibleType,		YieldChangeId,						RequiresActivation)
		SELECT	ConstructibleType,		'FXS_NegarakertagamaQuarterHappiness',	1
		FROM Constructibles WHERE ConstructibleType IN ('BUILDING_PALACE', 'BUILDING_CITY_HALL');
--========================================================================================================================
--========================================================================================================================