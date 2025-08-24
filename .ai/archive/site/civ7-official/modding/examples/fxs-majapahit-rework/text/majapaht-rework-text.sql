	INSERT OR REPLACE INTO LocalizedText
		(Tag,	Language,	Text)
--========================================================================================================================
-- Non-specific
--========================================================================================================================
	VALUES
		(
			'LOC_LOADING_CIV_TIPS_TEXT_MAJAPAHIT', 'en_US',
			"The Nusantara Civic requires island Cities to have eight Buildings to generate Treasure Fleets. Condense those Buildings into four Quarters to save precious space and gain extra benefits from your other bonuses."
		),
--========================================================================================================================
-- Unique Ability
--========================================================================================================================
		(
			'LOC_TRAIT_MAJAPAHIT_ABILITY_NAME', 'en_US',
			'Sumpah Palapa'
		),
		(
			'LOC_CIVILIZATION_MAJAPAHIT_DESCRIPTION', 'en_US',
			'+1[icon:YIELD_FOOD] Food on Quarters on or adjacent to Coast. This increases to +2[icon:YIELD_FOOD] Food if the Settlement is on an Island (a landmass with a maximum of 15 tiles). Can generate Treasure Fleets on Islands after completing the Nusantara Civic.'
		),
		(
			'LOC_TRAIT_MAJAPAHIT_ABILITY_DESCRIPTION', 'en_US',
			'[BLIST][LI][B]+1[icon:YIELD_FOOD] Food[/B] on [B]Quarters on or adjacent to Coast.[/B] This increases to [B]+2[icon:YIELD_FOOD] Food[/B] if the Settlement is on an [B]Island[/B] (a landmass with a maximum of 15 tiles)[LI]Can generate [B]Treasure Fleets[/B] on [B]Islands[/B] after completing the [B]Nusantara Civic[/B][LI][B]+30% [icon:YIELD_PRODUCTION] Production [/B]towards constructing [B]Borobudur[/B].[/BLIST]'
		),
--========================================================================================================================
-- Traditions
--========================================================================================================================
		(
			'LOC_TRADITION_PANJI_DESCRIPTION', 'en_US',
			'+1[icon:YIELD_CULTURE] Culture on Quarters on or adjacent to Coast in Cities. This increases to +2[icon:YIELD_CULTURE] Culture if the City is on an Island.'
		),
		(
			'LOC_TRADITION_NEGARAKERTAGAMA_DESCRIPTION', 'en_US',
			'The Palace and City Hall gain a +1[icon:YIELD_HAPPINESS] Happiness Adjacency from Quarters.'
		),
--========================================================================================================================
-- Civic Bonuses
--========================================================================================================================
		(
			'LOC_MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION_DESCRIPTION', 'en_US',
			'Cities on Islands with at least 8 Urban Population generate Treasure Fleets worth 2 Treasure Fleet points each.'
		);
--========================================================================================================================
--========================================================================================================================