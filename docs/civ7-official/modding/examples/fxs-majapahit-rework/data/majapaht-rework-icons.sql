--========================================================================================================================
-- UPDATE ICONS
-- Civic modifier unlocks should have icons to represent what they unlock
-- Just setting them here.

-- Note the "OR REPLACE". This allows us to update ALIRAN_KEPERCAYAAN
-- but also add a new icon entry for NUSUNTARA in a single statement.
--========================================================================================================================
	INSERT OR REPLACE INTO IconAliases
			(ID, 												OtherID)
	VALUES	('MOD_ALIRAN_KEPERCAYAAN_CONVERT_EXTRA_CULTURE',	'MOD_UNIT_UPGRADE'),
			('MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION',		'MOD_UNLOCK_TREASURE_FLEET');
--========================================================================================================================
--========================================================================================================================