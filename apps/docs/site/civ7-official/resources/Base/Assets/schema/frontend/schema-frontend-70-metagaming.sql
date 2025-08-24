-- Metagaming Configuration Tables

-- This table configures Legend Path entries, their appearance in the UI and their binding to DNA statistics.
CREATE TABLE 'LegendPaths'(
	'LegendPathType' TEXT NOT NULL,
	'LegendPathName' TEXT NOT NULL,
	'DNAChallengeStatisticID' TEXT NOT NULL,
	'SortIndex' INTEGER DEFAULT 0,
	PRIMARY KEY('LegendPathType')
);

-- This table configures Challenge events to send to DNA (NOT CHALLENGES THEMSELVES!).
CREATE TABLE 'ChallengeEvents'(
	'ChallengeEventType' TEXT NOT NULL,
	'DNAEventID' TEXT NOT NULL,
	'CompletesChallengeType' TEXT, -- Which DNA one-shot challenge this event sets as complete, if applicable
	PRIMARY KEY('ChallengeEventType'),
	FOREIGN KEY('CompletesChallengeType') REFERENCES 'Challenges'('ChallengeType')
);

-- This table configures the Challenges whose statistics are affected by posting challenge events.
CREATE TABLE 'ChallengeEventChallengeStatEffects'(
	'ChallengeEventType' TEXT NOT NULL,
	'ChallengeType' TEXT NOT NULL,
	PRIMARY KEY('ChallengeEventType', 'ChallengeType'),
	FOREIGN KEY ('ChallengeEventType') REFERENCES 'ChallengeEvents'('ChallengeEventType'),
	FOREIGN KEY('ChallengeType') REFERENCES 'Challenges'('ChallengeType')
);

-- This table configures in-game Challenges.
CREATE TABLE 'Challenges'(
	'ChallengeType' TEXT NOT NULL,
	'DNAChallengeID' TEXT NOT NULL,
	'DNAStatisticID' TEXT,
	'ChallengeClass' TEXT NOT NULL,
	'ChallengeCategory' TEXT NOT NULL,
	'Difficulty' INTEGER NOT NULL,
	'SortIndex' INTEGER DEFAULT 0,
	'Hidden' BOOLEAN NOT NULL DEFAULT 0,
	'MaxCompletions' INTEGER DEFAULT 1,
	'AllowRewardWhenHidden' BOOLEAN NOT NULL DEFAULT 0,
	PRIMARY KEY ('ChallengeType')
);

-- This table configures the types of rewards that completing a challenge may net the player.
CREATE TABLE 'ChallengeRewardTypes'(
	'RewardType' TEXT NOT NULL,
	PRIMARY KEY('RewardType')
);

-- This table configures the actual rewards for completing specified challenges.
-- These are only for showing the player in the Your Progress screen, the actual rewards are governed by DNA.
CREATE TABLE 'ChallengesRewards'(
	'ChallengeType' TEXT NOT NULL,
	'RewardType' TEXT NOT NULL,
	'Reward' TEXT NOT NULL, -- may be reference to Rewards if RewardType == UnlockableReward
	PRIMARY KEY('ChallengeType', 'RewardType', 'Reward'),
	FOREIGN KEY('ChallengeType') REFERENCES 'Challenges'('ChallengeType'),
	FOREIGN KEY('RewardType') REFERENCES 'ChallengeRewardTypes'('RewardType')
);

-- This table  contains the levels thresholds and dnaID for all LegendPaths
CREATE TABLE 'LegendPathsLevels'(
    'LegendPathType' TEXT NOT NULL,
    'Level' INTEGER NOT NULL,
    'Threshold' INTEGER NOT NULL,
    'DnaId' TEXT NOT NULL,
    PRIMARY KEY('LegendPathType', 'Level'),
    FOREIGN KEY('LegendPathType') REFERENCES 'LegendPaths'('LegendPathType')
);
-- This table configures the actual rewards for completing levels in legend paths.
-- These are only for showing the player in the Your Progress screen, the actual rewards are governed by DNA.

CREATE TABLE 'LegendPathsRewards'(
    'LegendPathType' TEXT NOT NULL,
    'Level' INTEGER NOT NULL,
    'Reward' TEXT NOT NULL,
    PRIMARY KEY('LegendPathType', 'Level', 'Reward'),
    FOREIGN KEY('LegendPathType', 'Level') REFERENCES 'LegendPathsLevels'('LegendPathType', 'Level')
);

-- This table configures the rewards for completing or winning live events.
-- These is for additional info shown to the player in the customization screen, the actual rewards are governed by DNA, they should match up in metagaming_live_events cloud data.

CREATE TABLE 'LiveEventRewards'(
    'Type' TEXT NOT NULL,
    'Event' TEXT NOT NULL,
    'Reward' TEXT NOT NULL,
    PRIMARY KEY('Type', 'Event', 'Reward')
);

-- This table contains the dna ids for the entitlements granted.
-- These are only for showing the player whats unlocked, the actual entitlements are governed by DNA.
CREATE TABLE 'Rewards'(
	'GameItemID' TEXT NOT NULL,
	'DNAItemID' TEXT NOT NULL,
	'CustomData' TEXT NOT NULL,
	'Type' TEXT NOT NULL,
	'Name' TEXT NOT NULL,
	'Description' TEXT NOT NULL,
	'SortIndex' INTEGER NOT NULL,
	'UnlockCondition' TEXT,
	'AllowNotification' BOOLEAN,
	PRIMARY KEY('GameItemID', 'DNAItemID', 'CustomData', 'Type')
);

-- This table contains the challenge configurations
CREATE TABLE 'ChallengeCategoryData'(
	'Id' TEXT NOT NULL,
	'Name' TEXT,
	'LocName' TEXT,
	'IconUrl' TEXT,
	'SortIndex' INTEGER,
	PRIMARY KEY('Id')
);

-- This table contains the live events custom leader-civ configurations
CREATE TABLE 'LeaderCivParings'(
	'LeaderType' TEXT NOT NULL,
	'CivilizationType' TEXT NOT NULL,
	'ReasonType' TEXT,
	PRIMARY KEY('LeaderType')
);