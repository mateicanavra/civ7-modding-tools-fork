INSERT INTO Types
        (Type,                                              Kind)
VALUES  ('FXS_CYLINDER_SEALS_MOD_PALACE_FOOD_TYPE',         'KIND_MODIFIER'),
        ('FXS_CYLINDER_SEALS_MOD_PALACE_GOLD_TYPE',         'KIND_MODIFIER'),
        ('FXS_ORACLE_BONES_MOD_PALACE_HAPPINESS_TYPE',      'KIND_MODIFIER'),
        ('FXS_ORACLE_BONES_MOD_PALACE_CULTURE_TYPE',        'KIND_MODIFIER');

INSERT INTO DynamicModifiers
        (ModifierType,                                      CollectionType,        EffectType)
VALUES  ('FXS_CYLINDER_SEALS_MOD_PALACE_FOOD_TYPE',         'COLLECTION_OWNER',    'EFFECT_PLAYER_ADJUST_CONSTRUCTIBLE_YIELD'),
        ('FXS_CYLINDER_SEALS_MOD_PALACE_GOLD_TYPE',         'COLLECTION_OWNER',    'EFFECT_PLAYER_ADJUST_CONSTRUCTIBLE_YIELD'),
        ('FXS_ORACLE_BONES_MOD_PALACE_HAPPINESS_TYPE',      'COLLECTION_OWNER',    'EFFECT_PLAYER_ADJUST_CONSTRUCTIBLE_YIELD'),
        ('FXS_ORACLE_BONES_MOD_PALACE_CULTURE_TYPE',        'COLLECTION_OWNER',    'EFFECT_PLAYER_ADJUST_CONSTRUCTIBLE_YIELD');

INSERT INTO Modifiers
        (ModifierId,                                ModifierType)
VALUES  ('FXS_CYLINDER_SEALS_MOD_PALACE_FOOD',      'FXS_CYLINDER_SEALS_MOD_PALACE_FOOD_TYPE'),
        ('FXS_CYLINDER_SEALS_MOD_PALACE_GOLD',      'FXS_CYLINDER_SEALS_MOD_PALACE_GOLD_TYPE'),
        ('FXS_ORACLE_BONES_MOD_PALACE_HAPPINESS',   'FXS_ORACLE_BONES_MOD_PALACE_HAPPINESS_TYPE'),
        ('FXS_ORACLE_BONES_MOD_PALACE_CULTURE',     'FXS_ORACLE_BONES_MOD_PALACE_CULTURE_TYPE');

INSERT INTO ModifierArguments
        (ModifierId,                                Name,                   Value)
VALUES  ('FXS_CYLINDER_SEALS_MOD_PALACE_FOOD',      'ConstructibleType',    'BUILDING_PALACE'),
        ('FXS_CYLINDER_SEALS_MOD_PALACE_FOOD',      'YieldType',            'YIELD_FOOD'),
        ('FXS_CYLINDER_SEALS_MOD_PALACE_FOOD',      'Amount',               2),
        ('FXS_CYLINDER_SEALS_MOD_PALACE_GOLD',      'ConstructibleType',    'BUILDING_PALACE'),
        ('FXS_CYLINDER_SEALS_MOD_PALACE_GOLD',      'YieldType',            'YIELD_GOLD'),
        ('FXS_CYLINDER_SEALS_MOD_PALACE_GOLD',      'Amount',               3),
        ('FXS_ORACLE_BONES_MOD_PALACE_HAPPINESS',   'ConstructibleType',    'BUILDING_PALACE'),
        ('FXS_ORACLE_BONES_MOD_PALACE_HAPPINESS',   'YieldType',            'YIELD_HAPPINESS'),
        ('FXS_ORACLE_BONES_MOD_PALACE_HAPPINESS',   'Amount',               3),
        ('FXS_ORACLE_BONES_MOD_PALACE_CULTURE',     'ConstructibleType',    'BUILDING_PALACE'),
        ('FXS_ORACLE_BONES_MOD_PALACE_CULTURE',     'YieldType',            'YIELD_CULTURE'),
        ('FXS_ORACLE_BONES_MOD_PALACE_CULTURE',     'Amount',               1);

INSERT INTO ModifierStrings
        (Context,               ModifierId,                             Text)
VALUES  ('Description',         'FXS_CYLINDER_SEALS_MOD_PALACE_GOLD',      'LOC_TRADITION_FXS_CYLINDER_SEALS_DESCRIPTION'),
        ('Description',         'FXS_ORACLE_BONES_MOD_PALACE_CULTURE',     'LOC_TRADITION_FXS_ORACLE_BONES_DESCRIPTION');