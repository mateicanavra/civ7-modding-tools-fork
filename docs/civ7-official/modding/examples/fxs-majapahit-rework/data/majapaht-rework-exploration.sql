--========================================================================================================================
-- This file is for changes to thing that exist ONLY in the Exploration Age
-- So changes to the Civ Ability and Civics
-- Changes to unique units would probably be here too
--========================================================================================================================
-- Rearrange Civics
-- I'm swapping Nusantara and Gamelan in the tree
--========================================================================================================================
	-- Begin by deleting all the Civic Prereqs from Majapahit Civics
	-------------------------------------------
		DELETE FROM ProgressionTreePrereqs
		WHERE Node IN(
			'NODE_CIVIC_EX_MAJAPAHIT_NUSUNTARA',
			'NODE_CIVIC_EX_MAJAPAHIT_GAMELAN',
			'NODE_CIVIC_EX_MAJAPAHIT_WAYANG',
			'NODE_CIVIC_EX_MAJAPAHIT_ALIRAN_KEPERCAYAAN'
		);
	-------------------------------------------
	-- Then add our new Civic requirements!
	-------------------------------------------
		INSERT INTO ProgressionTreePrereqs
				(Node, 										PrereqNode)
		VALUES	('NODE_CIVIC_EX_MAJAPAHIT_GAMELAN',			'NODE_CIVIC_EX_MAJAPAHIT_WAYANG'),
				('NODE_CIVIC_EX_MAJAPAHIT_GAMELAN',			'NODE_CIVIC_EX_MAJAPAHIT_ALIRAN_KEPERCAYAAN'),
				('NODE_CIVIC_EX_MAJAPAHIT_NUSUNTARA',		'NODE_CIVIC_EX_MAJAPAHIT_GAMELAN');
	-------------------------------------------
	-- Because Gamelan and Nusantara have swapped
	-- We need to update their costs
	-------------------------------------------
		UPDATE ProgressionTreeNodes
		SET Cost = 1200
		WHERE ProgressionTreeNodeType = 'NODE_CIVIC_EX_MAJAPAHIT_GAMELAN';

		UPDATE ProgressionTreeNodes
		SET Cost = 2000
		WHERE ProgressionTreeNodeType = 'NODE_CIVIC_EX_MAJAPAHIT_NUSUNTARA';
--========================================================================================================================
-- Adjust Unlocks
-- For simplicity's sake, I'm deleting all the old unlocks
-- Then just reassigning as needed.
--========================================================================================================================
	DELETE FROM ProgressionTreeNodeUnlocks WHERE ProgressionTreeNodeType IN
	(
		'NODE_CIVIC_EX_MAJAPAHIT_WAYANG',
		'NODE_CIVIC_EX_MAJAPAHIT_ALIRAN_KEPERCAYAAN',
		'NODE_CIVIC_EX_MAJAPAHIT_NUSUNTARA',
		'NODE_CIVIC_EX_MAJAPAHIT_GAMELAN'
	);
	-------------------------------------------
	-- One downside to SQL is columns need to be consistent in a statement.
	-- I needed an extra column for Borobudur's unlock
	-- So it's simpler to handle it as a separate statement.
	-------------------------------------------
	INSERT INTO ProgressionTreeNodeUnlocks
			(TargetType,				TargetKind,				ProgressionTreeNodeType,			UnlockDepth,	AIIgnoreUnlockValue)
	VALUES	('WONDER_BOROBUDUR',		'KIND_CONSTRUCTIBLE',	'NODE_CIVIC_EX_MAJAPAHIT_GAMELAN',	2,				1);
	-------------------------------------------
	INSERT INTO ProgressionTreeNodeUnlocks
			(TargetType,				TargetKind,				ProgressionTreeNodeType,						UnlockDepth)
	VALUES	('BUILDING_CANDI_BENTAR',	'KIND_CONSTRUCTIBLE',	'NODE_CIVIC_EX_MAJAPAHIT_WAYANG',				1),
			('BUILDING_MERU',			'KIND_CONSTRUCTIBLE',	'NODE_CIVIC_EX_MAJAPAHIT_ALIRAN_KEPERCAYAAN',	1),

			('MOD_WAYANG_OVERBUILD_PRODUCTION',					'KIND_MODIFIER',	'NODE_CIVIC_EX_MAJAPAHIT_WAYANG',				1),
			('MOD_ALIRAN_KEPERCAYAAN_CONVERT_EXTRA_CULTURE',	'KIND_MODIFIER',	'NODE_CIVIC_EX_MAJAPAHIT_ALIRAN_KEPERCAYAAN',	1),
			('MOD_NUSUNTARA_COAST_ADJACENCY',					'KIND_MODIFIER',	'NODE_CIVIC_EX_MAJAPAHIT_GAMELAN',				1),
			('MOD_EX_SETTLEMENT_CAP_INCREASE',					'KIND_MODIFIER',	'NODE_CIVIC_EX_MAJAPAHIT_GAMELAN',				1),
			('MOD_NUSUNTARA_SEA_VS_LAND',						'KIND_MODIFIER',	'NODE_CIVIC_EX_MAJAPAHIT_NUSUNTARA',			1),
			('MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION',		'KIND_MODIFIER',	'NODE_CIVIC_EX_MAJAPAHIT_NUSUNTARA',			1),

			('TRADITION_NEGARAKERTAGAMA',						'KIND_TRADITION',	'NODE_CIVIC_EX_MAJAPAHIT_ALIRAN_KEPERCAYAAN',	2),
			('TRADITION_PANJI',									'KIND_TRADITION',	'NODE_CIVIC_EX_MAJAPAHIT_WAYANG',				2),
			('TRADITION_SUBAK',									'KIND_TRADITION',	'NODE_CIVIC_EX_MAJAPAHIT_GAMELAN',				2);
--========================================================================================================================
-- New Unique Ability
--========================================================================================================================
	-- Remove the old modifier
	DELETE FROM TraitModifiers WHERE ModifierId = 'TRAIT_MOD_NEGARA_SPECIALIST_CAP_INCREASE';

	-- Add the new ones!
	INSERT INTO TraitModifiers
			(TraitType,							ModifierId)
	VALUES	('TRAIT_MAJAPAHIT_ABILITY',			'MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD'),
			('TRAIT_MAJAPAHIT_ABILITY',			'MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_ISLAND');
--========================================================================================================================
--========================================================================================================================