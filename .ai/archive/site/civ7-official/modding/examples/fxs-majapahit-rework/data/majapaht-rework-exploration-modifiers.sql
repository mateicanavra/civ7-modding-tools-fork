--========================================================================================================================
-- Create the ModifierType
--========================================================================================================================
INSERT INTO Types
		(Type,													Kind)
VALUES	('MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION_TYPE',	'KIND_MODIFIER'),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_MODIFIER_TYPE',	'KIND_MODIFIER'),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_TYPE',			'KIND_MODIFIER'),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_ISLAND_TYPE',	'KIND_MODIFIER');

INSERT INTO DynamicModifiers
		(ModifierType,											CollectionType,					EffectType)
VALUES	('MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION_TYPE',	'COLLECTION_PLAYER_CITIES',		'EFFECT_ADJUST_CITY_AUTO_TREASURE_FLEET'),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_MODIFIER_TYPE',	'COLLECTION_CITY_PLOT_YIELDS',	'EFFECT_PLOT_ADJUST_YIELD'),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_TYPE',			'COLLECTION_PLAYER_CITIES',		'EFFECT_ATTACH_MODIFIERS'),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_ISLAND_TYPE',	'COLLECTION_PLAYER_CITIES',		'EFFECT_ATTACH_MODIFIERS');
--========================================================================================================================
-- Create the Modifiers
--========================================================================================================================
INSERT INTO Modifiers
		(
			ModifierId,
			ModifierType,
			SubjectRequirementSetId
		)
VALUES  (
			'MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION',
			'MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION_TYPE',
			'MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION_SUBJECT_REQUIREMENTS'
		),
		(
			'MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_MODIFIER',
			'MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_MODIFIER_TYPE',
			'MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_MODIFIER_SUBJECT_REQUIREMENTS'
		),
		(
			'MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD',
			'MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_TYPE',
			NULL
		),
		(
			'MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_ISLAND',
			'MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_ISLAND_TYPE',
			'MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_ISLAND_SUBJECT_REQUIREMENTS'
		);
--========================================================================================================================
-- Create ModifierArguments + ModifierStrings
--========================================================================================================================
INSERT INTO ModifierArguments
		(ModifierId,										Name,			Value)
VALUES	('MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION',		'VP',			2),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_MODIFIER',	'YieldType',	'YIELD_FOOD'),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_MODIFIER',	'Amount',		1),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD',			'ModifierId',	'MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_MODIFIER'),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_ISLAND',		'ModifierId',	'MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_MODIFIER');

INSERT INTO ModifierStrings
		(Context,			ModifierId,										Text)
VALUES	('Description',		'MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION',	'LOC_MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION_DESCRIPTION');
--========================================================================================================================
-- Create Requirements
-- We're technically creating fewer Requirements here than in the XML

-- The GameEffects XML creates a brand new requirement for each RequirementSet even if they're identical
-- We're creating fewer requirement (eliminating the identical ones) and assigning them to multiple RequirementSets instead.
--========================================================================================================================
INSERT INTO RequirementSets
		(RequirementSetId,															RequirementSetType)
VALUES	('MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION_SUBJECT_REQUIREMENTS',		'REQUIREMENTSET_TEST_ALL'),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_MODIFIER_SUBJECT_REQUIREMENTS',		'REQUIREMENTSET_TEST_ALL'),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_ISLAND_SUBJECT_REQUIREMENTS',		'REQUIREMENTSET_TEST_ALL');

INSERT INTO RequirementSetRequirements
		(RequirementSetId,															RequirementId)
VALUES	('MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION_SUBJECT_REQUIREMENTS',		'FXS_MAJAPAHIT_REWORK_IS_ISLAND_REQUIREMENT'),
		('MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION_SUBJECT_REQUIREMENTS',		'FXS_MAJAPAHIT_REWORK_IS_CITY_REQUIREMENT'),
		('MOD_FXS_NUSUNTARA_TREASURE_FLEET_GENERATION_SUBJECT_REQUIREMENTS',		'FXS_MAJAPAHIT_REWORK_8_URBAN_REQUIREMENT'),

		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_MODIFIER_SUBJECT_REQUIREMENTS',		'FXS_MAJAPAHIT_REWORK_IS_QUARTER_REQUIREMENT'),
		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_MODIFIER_SUBJECT_REQUIREMENTS',		'FXS_MAJAPAHIT_REWORK_ADJACENT_TO_COAST_REQUIREMENT'),

		('MOD_FXS_TRAIT_MAJAPAHIT_QUARTER_FOOD_ISLAND_SUBJECT_REQUIREMENTS',		'FXS_MAJAPAHIT_REWORK_IS_ISLAND_REQUIREMENT');
-------------------------------------------
-- We're gonna be creating a number of
-- identical requirements in majapaht-rework-persistent-modifiers.sql

-- So it's important to add 'OR IGNORE' or 'OR REPLACE'
-- to prevent conflicts
-------------------------------------------
INSERT OR IGNORE INTO Requirements
		(RequirementId,											RequirementType)
VALUES	('FXS_MAJAPAHIT_REWORK_IS_ISLAND_REQUIREMENT',			'REQUIREMENT_CITY_IS_ISLAND'),
		('FXS_MAJAPAHIT_REWORK_IS_CITY_REQUIREMENT',			'REQUIREMENT_CITY_IS_CITY'),
		('FXS_MAJAPAHIT_REWORK_8_URBAN_REQUIREMENT',			'REQUIREMENT_CITY_POPULATION'),
		('FXS_MAJAPAHIT_REWORK_IS_QUARTER_REQUIREMENT',			'REQUIREMENT_PLOT_IS_QUARTER'),
		('FXS_MAJAPAHIT_REWORK_ADJACENT_TO_COAST_REQUIREMENT',	'REQUIREMENT_PLOT_ADJACENT_TO_COAST');

INSERT OR IGNORE INTO RequirementArguments
		(RequirementId,											Name,					Value)
VALUES	('FXS_MAJAPAHIT_REWORK_IS_ISLAND_REQUIREMENT',			'Tiles',				15),
		('FXS_MAJAPAHIT_REWORK_8_URBAN_REQUIREMENT',			'MinUrbanPopulation',	8);
--========================================================================================================================
--========================================================================================================================