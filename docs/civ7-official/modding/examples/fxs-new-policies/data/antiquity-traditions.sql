INSERT INTO Types
        (Type,                              Kind)
VALUES  ('TRADITION_FXS_CYLINDER_SEALS',    'KIND_TRADITION'),
        ('TRADITION_FXS_ORACLE_BONES',      'KIND_TRADITION');

INSERT INTO Traditions
        (TraditionType,                     Name,                                        Description)
VALUES  ('TRADITION_FXS_CYLINDER_SEALS',    'LOC_TRADITION_FXS_CYLINDER_SEALS_NAME',     'LOC_TRADITION_FXS_CYLINDER_SEALS_DESCRIPTION'),
        ('TRADITION_FXS_ORACLE_BONES',      'LOC_TRADITION_FXS_ORACLE_BONES_NAME',       'LOC_TRADITION_FXS_ORACLE_BONES_DESCRIPTION');

INSERT INTO ProgressionTreeNodeUnlocks
        (
            ProgressionTreeNodeType,
            TargetKind,
            TargetType,
            UnlockDepth   
        )
VALUES  (
            'NODE_CIVIC_AQ_MAIN_CHIEFDOM',
            'KIND_TRADITION',
            'TRADITION_FXS_CYLINDER_SEALS',
            1
        ),
        (
            'NODE_CIVIC_AQ_MAIN_CHIEFDOM',
            'KIND_TRADITION',
            'TRADITION_FXS_ORACLE_BONES',
            1
        );

INSERT INTO TraditionModifiers
        (TraditionType,                     ModifierId)
VALUES  ('TRADITION_FXS_CYLINDER_SEALS',    'FXS_CYLINDER_SEALS_MOD_PALACE_FOOD'),
        ('TRADITION_FXS_CYLINDER_SEALS',    'FXS_CYLINDER_SEALS_MOD_PALACE_GOLD'),
        ('TRADITION_FXS_ORACLE_BONES',      'FXS_ORACLE_BONES_MOD_PALACE_HAPPINESS'),
        ('TRADITION_FXS_ORACLE_BONES',      'FXS_ORACLE_BONES_MOD_PALACE_CULTURE');