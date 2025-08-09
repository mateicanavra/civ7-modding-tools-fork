--========================================================================================================================
-- Create RequirementSets
--========================================================================================================================
		INSERT INTO RequirementSets
				(RequirementSetId,								RequirementSetType)
		VALUES	('REQSET_EVENT_FXS_THE_YONA_REQUISITE',			'REQUIREMENTSET_TEST_ALL'),
				('REQSET_EVENT_FXS_THE_YONA_NARRATIVE',			'REQUIREMENTSET_TEST_ALL'),
				('REQSET_EVENT_FXS_THE_YONA_A_NARRATIVE',		'REQUIREMENTSET_TEST_ALL'),
				('SUBREQSET_EVENT_FXS_THE_YONA_A_NARRATIVE',	'REQUIREMENTSET_TEST_ALL'),
				('REQSET_EVENT_FXS_THE_YONA_B_NARRATIVE',		'REQUIREMENTSET_TEST_ALL');

		INSERT INTO RequirementSetRequirements
				(RequirementSetId,								RequirementId)
		VALUES	('REQSET_EVENT_FXS_THE_YONA_REQUISITE',			'REQ_STORY_CIVILIZATION_MAURYA'),
				('REQSET_EVENT_FXS_THE_YONA_NARRATIVE',			'EVENT_FXS_THE_YONA_NARRATIVE_REQUIREMENT'),
				('REQSET_EVENT_FXS_THE_YONA_A_NARRATIVE',		'EVENT_FXS_THE_YONA_A_NARRATIVE_REQUIREMENT'),
				('SUBREQSET_EVENT_FXS_THE_YONA_A_NARRATIVE',	'EVENT_FXS_THE_YONA_A_HAS_MATHA_REQUIREMENT'),
				('REQSET_EVENT_FXS_THE_YONA_B_NARRATIVE',		'EVENT_FXS_THE_YONA_B_NARRATIVE_REQUIREMENT');
	-------------------------------------------
	-- Create Requirements
	-------------------------------------------
		INSERT INTO Requirements
				(RequirementId,											RequirementType)
		VALUES	('EVENT_FXS_THE_YONA_NARRATIVE_REQUIREMENT',			'REQUIREMENT_PLAYER_HAS_AT_LEAST_NUM_GOSSIPS'),
				('EVENT_FXS_THE_YONA_A_NARRATIVE_REQUIREMENT',			'REQUIREMENT_COLLECTION_COUNT_ATLEAST'),
				('EVENT_FXS_THE_YONA_A_HAS_MATHA_REQUIREMENT',			'REQUIREMENT_CITY_HAS_UNIQUE_QUARTER'),
				('EVENT_FXS_THE_YONA_B_NARRATIVE_REQUIREMENT',			'REQUIREMENT_PLAYER_HAS_AT_LEAST_NUM_GOSSIPS');

		INSERT INTO RequirementArguments
				(RequirementId,									Name,						Value)
		VALUES	('EVENT_FXS_THE_YONA_NARRATIVE_REQUIREMENT',	'GossipTypes',				'GOSSIP_TRADITION_ACTIVATED01,GOSSIP_PLAYERS_MEET02'),
				('EVENT_FXS_THE_YONA_NARRATIVE_REQUIREMENT',	'GOSSIP_PLAYERS_MEET02',	'Hash,OtherPlayer,Other,Hash,Civilization,CIVILIZATION_GREECE'),
				('EVENT_FXS_THE_YONA_NARRATIVE_REQUIREMENT',	'Amount',					2),

				('EVENT_FXS_THE_YONA_A_NARRATIVE_REQUIREMENT',	'Count',					2),
				('EVENT_FXS_THE_YONA_A_NARRATIVE_REQUIREMENT',	'CollectionType',			'COLLECTION_PLAYER_CITIES'),
				('EVENT_FXS_THE_YONA_A_NARRATIVE_REQUIREMENT',	'RequirementSetId',			'SUBREQSET_EVENT_FXS_THE_YONA_A_NARRATIVE'),

				('EVENT_FXS_THE_YONA_A_HAS_MATHA_REQUIREMENT',	'UniqueQuarterType',		'QUARTER_MATHA'),

				('EVENT_FXS_THE_YONA_B_NARRATIVE_REQUIREMENT',	'GossipTypes',				'GOSSIP_TRADE_ROUTE_STARTED01'),
				('EVENT_FXS_THE_YONA_B_NARRATIVE_REQUIREMENT',	'GOSSIP_PLAYERS_MEET02',	'Hash,OtherPlayer,Other,Hash,Civilization,CIVILIZATION_GREECE');
--========================================================================================================================
-- Create the ModifierType
--========================================================================================================================
	INSERT INTO Types
			(Type,											Kind)
	VALUES	('EVENT_FXS_THE_YONA_AA_MODIFIER_TYPE',			'KIND_MODIFIER'),
			('EVENT_FXS_THE_YONA_AB_MODIFIER_TYPE',			'KIND_MODIFIER'),
			('EVENT_FXS_THE_YONA_AB_MODIFIER2_TYPE',		'KIND_MODIFIER'),
			('EVENT_FXS_THE_YONA_BA_MODIFIER_TYPE',			'KIND_MODIFIER'),
			('EVENT_FXS_THE_YONA_BB_MODIFIER_TYPE',			'KIND_MODIFIER'),
			('EVENT_FXS_THE_YONA_C_MODIFIER_TYPE',			'KIND_MODIFIER');

	INSERT INTO DynamicModifiers
			(ModifierType,									CollectionType,						EffectType)
	VALUES	('EVENT_FXS_THE_YONA_AA_MODIFIER_TYPE',			'COLLECTION_PLAYER_CITIES',			'EFFECT_CITY_ADJUST_CONSTRUCTIBLE_YIELD'),
			('EVENT_FXS_THE_YONA_AB_MODIFIER_TYPE',			'COLLECTION_PLAYER_CITIES',			'EFFECT_CITY_ADJUST_CONSTRUCTIBLE_YIELD'),
			('EVENT_FXS_THE_YONA_AB_MODIFIER2_TYPE',		'COLLECTION_PLAYER_CITIES',			'EFFECT_CITY_ADJUST_CONSTRUCTIBLE_YIELD'),
			('EVENT_FXS_THE_YONA_BA_MODIFIER_TYPE',			'COLLECTION_PLAYER_CAPITAL_CITY',	'EFFECT_CITY_GRANT_UNIT'),
			('EVENT_FXS_THE_YONA_BB_MODIFIER_TYPE',			'COLLECTION_OWNER',					'EFFECT_GRANT_GREAT_WORK'),
			('EVENT_FXS_THE_YONA_C_MODIFIER_TYPE',			'COLLECTION_PLAYER_CAPITAL_CITY',	'EFFECT_CITY_GRANT_UNIT');
--========================================================================================================================
-- Create the Modifiers
--========================================================================================================================
	INSERT INTO Modifiers
			(
				ModifierId,
				ModifierType,
				Permanent
			)
	VALUES  (
				'EVENT_FXS_THE_YONA_AA_MODIFIER',
				'EVENT_FXS_THE_YONA_AA_MODIFIER_TYPE',
				1
			),
			(
				'EVENT_FXS_THE_YONA_AB_MODIFIER',
				'EVENT_FXS_THE_YONA_AB_MODIFIER_TYPE',
				1
			),
			(
				'EVENT_FXS_THE_YONA_AB_MODIFIER2',
				'EVENT_FXS_THE_YONA_AB_MODIFIER2_TYPE',
				1
			),
			(
				'EVENT_FXS_THE_YONA_BA_MODIFIER',
				'EVENT_FXS_THE_YONA_BA_MODIFIER_TYPE',
				1
			),
			(
				'EVENT_FXS_THE_YONA_BB_MODIFIER',
				'EVENT_FXS_THE_YONA_BB_MODIFIER_TYPE',
				1
			),
			(
				'EVENT_FXS_THE_YONA_C_MODIFIER',
				'EVENT_FXS_THE_YONA_C_MODIFIER_TYPE',
				1
			);
--========================================================================================================================
-- Create ModifierArguments + ModifierStrings
--========================================================================================================================
	INSERT INTO ModifierArguments
			(ModifierId,						Name,					Value)
	VALUES	('EVENT_FXS_THE_YONA_AA_MODIFIER',	'YieldType',			'YIELD_HAPPINESS'),
			('EVENT_FXS_THE_YONA_AA_MODIFIER',	'Amount',				2),
			('EVENT_FXS_THE_YONA_AA_MODIFIER',	'ConstructibleClass',	'WONDER'),

			('EVENT_FXS_THE_YONA_AB_MODIFIER',	'YieldType',			'YIELD_SCIENCE'),
			('EVENT_FXS_THE_YONA_AB_MODIFIER',	'Amount',				2),
			('EVENT_FXS_THE_YONA_AB_MODIFIER',	'ConstructibleType',	'BUILDING_DHARAMSHALA'),

			('EVENT_FXS_THE_YONA_AB_MODIFIER2',	'YieldType',			'YIELD_CULTURE'),
			('EVENT_FXS_THE_YONA_AB_MODIFIER2',	'Amount',				2),
			('EVENT_FXS_THE_YONA_AB_MODIFIER2',	'ConstructibleType',	'BUILDING_VIHARA'),

			('EVENT_FXS_THE_YONA_BA_MODIFIER',	'UnitType',				'UNIT_NAGARIKA'),
			('EVENT_FXS_THE_YONA_BA_MODIFIER',	'Amount',				1),

			('EVENT_FXS_THE_YONA_BB_MODIFIER',	'ObjectType',			'GREATWORKOBJECT_WRITING'),
			('EVENT_FXS_THE_YONA_BB_MODIFIER',	'Amount',				1),

			('EVENT_FXS_THE_YONA_C_MODIFIER',	'UnitTag',				'UNIT_CLASS_INFANTRY'),
			('EVENT_FXS_THE_YONA_C_MODIFIER',	'Amount',				1);
--========================================================================================================================
--========================================================================================================================