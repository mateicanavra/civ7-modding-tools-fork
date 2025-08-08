	INSERT OR REPLACE INTO LocalizedText
		(Tag,	Language,	Text)
--========================================================================================================================
-- Event Start (A)
--========================================================================================================================
	VALUES
		(
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_STORYTITLE', 'en_US',
			'Invigorating Leaves'
		),
		(
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_COMPLETION', 'en_US',
			"A forager proudly shares her discovery. A bush whose leaves—she claims—are invigorating when consumed. She dubs it “tea”, and suggests drinking an infusion, or simply chewing the leaves."
		),
	----------------------------------
	-- Option A
	----------------------------------
		(
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_A_NAME', 'en_US',
			'Drink the infusion.'
		),
		(
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_A_DESCRIPTION', 'en_US',
			"{1_reward}."
		),
	----------------------------------
	-- Option B
	----------------------------------
		(
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_B_NAME', 'en_US',
			'Chew the leaves.'
		),
		(
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_B_DESCRIPTION', 'en_US',
			"{1_reward}."
		),
	----------------------------------
	-- Option C
	----------------------------------
		(
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_C_NAME', 'en_US',
			'Decline. It might be poisonous.'
		),
		(
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_C_DESCRIPTION', 'en_US',
			"{1_reward}."
		);
--========================================================================================================================
--========================================================================================================================