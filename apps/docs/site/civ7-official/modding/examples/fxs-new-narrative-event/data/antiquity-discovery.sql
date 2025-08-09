--========================================================================================================================
--========================================================================================================================
	INSERT INTO Types
			(Type,									Kind)
	VALUES	-- Initial Event
			('DISCOVERY_FXS_FRAGRANT_BUSH',			'KIND_NARRATIVE_STORY'),
			('DISCOVERY_FXS_FRAGRANT_BUSH_A',		'KIND_NARRATIVE_STORY'),
			('DISCOVERY_FXS_FRAGRANT_BUSH_B',		'KIND_NARRATIVE_STORY'),
			('DISCOVERY_FXS_FRAGRANT_BUSH_C',		'KIND_NARRATIVE_STORY');
--========================================================================================================================
--========================================================================================================================
	INSERT INTO NarrativeStories
		(
			NarrativeStoryType,
			
			StoryTitle,
			Name,
			Description,
			Completion,

			Age,
			Queue,

			StartEveryone,
			FirstOnly,
			ForceChoice,

			Hidden,
			Activation,
			UIActivation,

			RequirementSetId
		)
	VALUES
		-----------------------------------------
		-- Initial Event
		-----------------------------------------
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH',
			
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_STORYTITLE',
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_NAME',
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_DESCRIPTION',
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_COMPLETION',

			'AGE_ANTIQUITY',
			'NARRATIVE_GROUP_DISCOVERY_CAMPFIRE_BASIC',

			1,
			1,
			1,

			0,
			'AUTO',
			'DISCOVERY',

			'REQSET_DISCOVERY_BASE_NARRATIVE'
		),
		-----------------------------------------
		-- Options
		-----------------------------------------
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_A',
			
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_A_STORYTITLE',
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_A_NAME',
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_A_DESCRIPTION',
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_A_COMPLETION',

			'AGE_ANTIQUITY',
			NULL,

			0,
			0,
			0,

			1,
			'LINKED',
			'DISCOVERY',

			'Met'
		),
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_B',
			
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_B_STORYTITLE',
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_B_NAME',
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_B_DESCRIPTION',
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_B_COMPLETION',

			'AGE_ANTIQUITY',
			NULL,

			0,
			0,
			0,

			1,
			'LINKED',
			'DISCOVERY',

			'Met'
		),
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_C',
			
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_C_STORYTITLE',
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_C_NAME',
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_C_DESCRIPTION',
			'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_C_COMPLETION',

			'AGE_ANTIQUITY',
			NULL,

			0,
			0,
			0,

			1,
			'LINKED',
			'DISCOVERY',

			'Met'
		);
--========================================================================================================================
--========================================================================================================================
	INSERT INTO NarrativeStoryOverrides
		(
			NarrativeStoryType,
			OverriddenStoryType
		)
	VALUES
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH',
			'DISCOVERY_BASE'
		);
--========================================================================================================================
--========================================================================================================================
	INSERT INTO NarrativeStory_Links
		(
			FromNarrativeStoryType,
			ToNarrativeStoryType,
			Priority,

			Name,
			Description
		)
	VALUES
		-----------------------------------------
		-- FROM: Initial Event
		-----------------------------------------
			(
				'DISCOVERY_FXS_FRAGRANT_BUSH',
				'DISCOVERY_FXS_FRAGRANT_BUSH_A',
				0,

				'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_A_NAME',
				'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_A_DESCRIPTION'
			),
			(
				'DISCOVERY_FXS_FRAGRANT_BUSH',
				'DISCOVERY_FXS_FRAGRANT_BUSH_B',
				1,

				'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_B_NAME',
				'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_B_DESCRIPTION'
			),
			(
				'DISCOVERY_FXS_FRAGRANT_BUSH',
				'DISCOVERY_FXS_FRAGRANT_BUSH_C',
				2,

				'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_C_NAME',
				'LOC_DISCOVERY_FXS_FRAGRANT_BUSH_C_DESCRIPTION'
			);
--========================================================================================================================
--========================================================================================================================
	INSERT INTO NarrativeRewardIcons
		(
			NarrativeStoryType,
			RewardIconType
		)
	VALUES
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_A',
			'YIELD_SCIENCE'
		),
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_B',
			'YIELD_CULTURE'
		),
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_C',
			'YIELD_HAPPINESS'
		);

	INSERT INTO NarrativeStory_TextReplacements
		(
			NarrativeStoryType,
			NarrativeStoryTextType,
			NarrativeTextReplacementType,
			Priority
		)
	VALUES
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_A',
			'REWARD',
			'REWARD',
			1
		),
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_B',
			'REWARD',
			'REWARD',
			1
		),
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_C',
			'REWARD',
			'REWARD',
			1
		);

	INSERT INTO NarrativeStory_Rewards
		(
			NarrativeStoryType,
			NarrativeRewardType,
			Activation
		)
	VALUES
		-- Predefined Reward to remove triggering Constructible
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH',
			'DISCOVERY_BASE_REWARD',
			'COMPLETE'
		),
		-- Custom Rewards
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_A',
			'DISCOVERY_FXS_FRAGRANT_BUSH_A_REWARD',
			'COMPLETE'
		),
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_B',
			'DISCOVERY_FXS_FRAGRANT_BUSH_B_REWARD',
			'COMPLETE'
		),
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_C',
			'DISCOVERY_FXS_FRAGRANT_BUSH_C_REWARD',
			'COMPLETE'
		);

	INSERT INTO NarrativeRewards
		(
			NarrativeRewardType,
			ModifierID
		)
	VALUES
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_A_REWARD',
			'DISCOVERY_FXS_FRAGRANT_BUSH_A_MODIFIER'
		),
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_B_REWARD',
			'DISCOVERY_FXS_FRAGRANT_BUSH_B_MODIFIER'
		),
		(
			'DISCOVERY_FXS_FRAGRANT_BUSH_C_REWARD',
			'DISCOVERY_FXS_FRAGRANT_BUSH_C_MODIFIER'
		);
--========================================================================================================================
--========================================================================================================================