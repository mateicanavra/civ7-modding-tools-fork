--========================================================================================================================
-- Create the ModifierType
--========================================================================================================================
	INSERT INTO Types
			(Type,												Kind)
	VALUES	('DISCOVERY_FXS_FRAGRANT_BUSH_A_MODIFIER_TYPE',		'KIND_MODIFIER'),
			('DISCOVERY_FXS_FRAGRANT_BUSH_B_MODIFIER_TYPE',		'KIND_MODIFIER'),
			('DISCOVERY_FXS_FRAGRANT_BUSH_C_MODIFIER_TYPE',		'KIND_MODIFIER');

	INSERT INTO DynamicModifiers
			(ModifierType,										CollectionType,			EffectType)
	VALUES	('DISCOVERY_FXS_FRAGRANT_BUSH_A_MODIFIER_TYPE',		'COLLECTION_OWNER',		'EFFECT_PLAYER_GRANT_YIELD_DISCOVERY'),
			('DISCOVERY_FXS_FRAGRANT_BUSH_B_MODIFIER_TYPE',		'COLLECTION_OWNER',		'EFFECT_PLAYER_GRANT_YIELD_DISCOVERY'),
			('DISCOVERY_FXS_FRAGRANT_BUSH_C_MODIFIER_TYPE',		'COLLECTION_OWNER',		'EFFECT_PLAYER_GRANT_YIELD_DISCOVERY');
--========================================================================================================================
-- Create the Modifiers
--========================================================================================================================
	INSERT INTO Modifiers
			(
				ModifierId,
				ModifierType,
				RunOnce,
				Permanent
			)
	VALUES  (
				'DISCOVERY_FXS_FRAGRANT_BUSH_A_MODIFIER',
				'DISCOVERY_FXS_FRAGRANT_BUSH_A_MODIFIER_TYPE',
				1,
				1
			),
			(
				'DISCOVERY_FXS_FRAGRANT_BUSH_B_MODIFIER',
				'DISCOVERY_FXS_FRAGRANT_BUSH_B_MODIFIER_TYPE',
				1,
				1
			),
			(
				'DISCOVERY_FXS_FRAGRANT_BUSH_C_MODIFIER',
				'DISCOVERY_FXS_FRAGRANT_BUSH_C_MODIFIER_TYPE',
				1,
				1
			);
--========================================================================================================================
-- Create ModifierArguments + ModifierStrings
--========================================================================================================================
	INSERT INTO ModifierArguments
			(ModifierId,								Name,					Value)
	VALUES	('DISCOVERY_FXS_FRAGRANT_BUSH_A_MODIFIER',	'YieldType',			'YIELD_SCIENCE'),
			('DISCOVERY_FXS_FRAGRANT_BUSH_A_MODIFIER',	'MultiplierType',		'REWARD_TYPE_MINOR'),

			('DISCOVERY_FXS_FRAGRANT_BUSH_B_MODIFIER',	'YieldType',			'YIELD_CULTURE'),
			('DISCOVERY_FXS_FRAGRANT_BUSH_B_MODIFIER',	'MultiplierType',		'REWARD_TYPE_MINOR'),

			('DISCOVERY_FXS_FRAGRANT_BUSH_C_MODIFIER',	'YieldType',			'YIELD_HAPPINESS'),
			('DISCOVERY_FXS_FRAGRANT_BUSH_C_MODIFIER',	'MultiplierType',		'REWARD_TYPE_MINOR');
--========================================================================================================================
--========================================================================================================================