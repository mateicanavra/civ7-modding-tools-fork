--========================================================================================================================
--========================================================================================================================
	INSERT INTO Types
			(Type,                          Kind)
	VALUES	-- Initial Event
			('EVENT_FXS_THE_YONA',    		'KIND_NARRATIVE_STORY'),
			-- Art and Architecture
			('EVENT_FXS_THE_YONA_A',		'KIND_NARRATIVE_STORY'),
			('EVENT_FXS_THE_YONA_AA',		'KIND_NARRATIVE_STORY'),
			('EVENT_FXS_THE_YONA_AB',		'KIND_NARRATIVE_STORY'),
			-- Trade and Philosophy
			('EVENT_FXS_THE_YONA_B',		'KIND_NARRATIVE_STORY'),
			('EVENT_FXS_THE_YONA_BA',		'KIND_NARRATIVE_STORY'),
			('EVENT_FXS_THE_YONA_BB',		'KIND_NARRATIVE_STORY'),
			-- Prepare for War
			('EVENT_FXS_THE_YONA_C',		'KIND_NARRATIVE_STORY');
--========================================================================================================================
--========================================================================================================================
	INSERT INTO NarrativeStories
		(
			NarrativeStoryType,
			
			StoryTitle,
			Name,
			Description,
			Completion,
			Imperative,

			Age,
			IsQuest,
			Hidden,
			Activation,
			UIActivation,

			ActivationRequirementSetId,
			RequirementSetId
		)
	VALUES
		-----------------------------------------
		-- Initial Event
		-----------------------------------------
			(
				'EVENT_FXS_THE_YONA',
				
				'LOC_EVENT_FXS_THE_YONA_STORYTITLE',
				'LOC_EVENT_FXS_THE_YONA_NAME',
				'LOC_EVENT_FXS_THE_YONA_DESCRIPTION',
				'LOC_EVENT_FXS_THE_YONA_COMPLETION',
				'LOC_EVENT_FXS_THE_YONA_IMPERATIVE',

				'AGE_ANTIQUITY',
				0,
				0,
				'REQUISITE',
				'STANDARD',

				'REQSET_EVENT_FXS_THE_YONA_REQUISITE',
				'REQSET_EVENT_FXS_THE_YONA_NARRATIVE'
			),
		-----------------------------------------
		-- Art and Architecture
		-----------------------------------------
			(
				'EVENT_FXS_THE_YONA_A',
				
				'LOC_EVENT_FXS_THE_YONA_A_STORYTITLE',
				'LOC_EVENT_FXS_THE_YONA_A_NAME',
				'LOC_EVENT_FXS_THE_YONA_A_DESCRIPTION',
				'LOC_EVENT_FXS_THE_YONA_A_COMPLETION',
				'LOC_EVENT_FXS_THE_YONA_A_IMPERATIVE',

				'AGE_ANTIQUITY',
				1,
				0,
				'LINKED',
				'STANDARD',

				NULL,
				'REQSET_EVENT_FXS_THE_YONA_A_NARRATIVE'
			),
			(
				'EVENT_FXS_THE_YONA_AA',
				
				'LOC_EVENT_FXS_THE_YONA_AA_STORYTITLE',
				'LOC_EVENT_FXS_THE_YONA_AA_NAME',
				'LOC_EVENT_FXS_THE_YONA_AA_DESCRIPTION',
				'LOC_EVENT_FXS_THE_YONA_AA_COMPLETION',
				NULL,

				'AGE_ANTIQUITY',
				0,
				1,
				'LINKED',
				'STANDARD',

				NULL,
				'Met'
			),
			(
				'EVENT_FXS_THE_YONA_AB',
				
				'LOC_EVENT_FXS_THE_YONA_AB_STORYTITLE',
				'LOC_EVENT_FXS_THE_YONA_AB_NAME',
				'LOC_EVENT_FXS_THE_YONA_AB_DESCRIPTION',
				'LOC_EVENT_FXS_THE_YONA_AB_COMPLETION',
				NULL,

				'AGE_ANTIQUITY',
				0,
				1,
				'LINKED',
				'STANDARD',

				NULL,
				'Met'
			),
		-----------------------------------------
		-- Trade and Philosophy
		-----------------------------------------
			(
				'EVENT_FXS_THE_YONA_B',
				
				'LOC_EVENT_FXS_THE_YONA_B_STORYTITLE',
				'LOC_EVENT_FXS_THE_YONA_B_NAME',
				'LOC_EVENT_FXS_THE_YONA_B_DESCRIPTION',
				'LOC_EVENT_FXS_THE_YONA_B_COMPLETION',
				'LOC_EVENT_FXS_THE_YONA_B_IMPERATIVE',

				'AGE_ANTIQUITY',
				1,
				0,
				'LINKED',
				'STANDARD',

				NULL,
				'REQSET_EVENT_FXS_THE_YONA_B_NARRATIVE'
			),
			(
				'EVENT_FXS_THE_YONA_BA',
				
				'LOC_EVENT_FXS_THE_YONA_BA_STORYTITLE',
				'LOC_EVENT_FXS_THE_YONA_BA_NAME',
				'LOC_EVENT_FXS_THE_YONA_BA_DESCRIPTION',
				'LOC_EVENT_FXS_THE_YONA_BA_COMPLETION',
				NULL,

				'AGE_ANTIQUITY',
				0,
				1,
				'LINKED',
				'STANDARD',

				NULL,
				'Met'
			),
			(
				'EVENT_FXS_THE_YONA_BB',
				
				'LOC_EVENT_FXS_THE_YONA_BB_STORYTITLE',
				'LOC_EVENT_FXS_THE_YONA_BB_NAME',
				'LOC_EVENT_FXS_THE_YONA_BB_DESCRIPTION',
				'LOC_EVENT_FXS_THE_YONA_BB_COMPLETION',
				NULL,

				'AGE_ANTIQUITY',
				0,
				1,
				'LINKED',
				'STANDARD',

				NULL,
				'Met'
			),
		-----------------------------------------
		-- Prepare for War
		-----------------------------------------
			(
				'EVENT_FXS_THE_YONA_C',
				
				'LOC_EVENT_FXS_THE_YONA_C_STORYTITLE',
				'LOC_EVENT_FXS_THE_YONA_C_NAME',
				'LOC_EVENT_FXS_THE_YONA_C_DESCRIPTION',
				'LOC_EVENT_FXS_THE_YONA_C_COMPLETION',
				NULL,

				'AGE_ANTIQUITY',
				0,
				1,
				'LINKED',
				'STANDARD',

				NULL,
				'Met'
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
				'EVENT_FXS_THE_YONA',
				'EVENT_FXS_THE_YONA_A',
				0,

				'LOC_EVENT_FXS_THE_YONA_A_NAME',
				'LOC_EVENT_FXS_THE_YONA_A_DESCRIPTION'
			),
			(
				'EVENT_FXS_THE_YONA',
				'EVENT_FXS_THE_YONA_B',
				1,

				'LOC_EVENT_FXS_THE_YONA_B_NAME',
				'LOC_EVENT_FXS_THE_YONA_B_DESCRIPTION'
			),
			(
				'EVENT_FXS_THE_YONA',
				'EVENT_FXS_THE_YONA_C',
				2,

				'LOC_EVENT_FXS_THE_YONA_C_NAME',
				'LOC_EVENT_FXS_THE_YONA_C_DESCRIPTION'
			),
		-----------------------------------------
		-- FROM: OPTION A
		-----------------------------------------
			(
				'EVENT_FXS_THE_YONA_A',
				'EVENT_FXS_THE_YONA_AA',
				0,

				'LOC_EVENT_FXS_THE_YONA_AA_NAME',
				'LOC_EVENT_FXS_THE_YONA_AA_DESCRIPTION'
			),
			(
				'EVENT_FXS_THE_YONA_A',
				'EVENT_FXS_THE_YONA_AB',
				1,

				'LOC_EVENT_FXS_THE_YONA_AB_NAME',
				'LOC_EVENT_FXS_THE_YONA_AB_DESCRIPTION'
			),
		-----------------------------------------
		-- FROM: OPTION B
		-----------------------------------------
			(
				'EVENT_FXS_THE_YONA_B',
				'EVENT_FXS_THE_YONA_BA',
				0,

				'LOC_EVENT_FXS_THE_YONA_BA_NAME',
				'LOC_EVENT_FXS_THE_YONA_BA_DESCRIPTION'
			),
			(
				'EVENT_FXS_THE_YONA_B',
				'EVENT_FXS_THE_YONA_BB',
				1,

				'LOC_EVENT_FXS_THE_YONA_BB_NAME',
				'LOC_EVENT_FXS_THE_YONA_BB_DESCRIPTION'
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
			'EVENT_FXS_THE_YONA_A',
			'QUEST'
		),
		(
			'EVENT_FXS_THE_YONA_B',
			'QUEST'
		),
		(
			'EVENT_FXS_THE_YONA_AA',
			'YIELD_HAPPINESS'
		),
		(
			'EVENT_FXS_THE_YONA_AB',
			'YIELD_CULTURE'
		),
		(
			'EVENT_FXS_THE_YONA_AB',
			'YIELD_SCIENCE'
		),
		(
			'EVENT_FXS_THE_YONA_BA',
			'UNIT'
		),
		(
			'EVENT_FXS_THE_YONA_BB',
			'GREATWORK'
		),
		(
			'EVENT_FXS_THE_YONA_C',
			'UNIT'
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
			'EVENT_FXS_THE_YONA_AB',
			'REWARD',
			'REWARD',
			1
		),
		(
			'EVENT_FXS_THE_YONA_AB',
			'REWARD',
			'REWARD',
			2
		),
		(
			'EVENT_FXS_THE_YONA_BA',
			'REWARD',
			'REWARD',
			1
		),
		(
			'EVENT_FXS_THE_YONA_BB',
			'REWARD',
			'REWARD',
			1
		),
		(
			'EVENT_FXS_THE_YONA_C',
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
		(
			'EVENT_FXS_THE_YONA_AA',
			'EVENT_FXS_THE_YONA_AA_REWARD',
			'COMPLETE'
		),
		(
			'EVENT_FXS_THE_YONA_AB',
			'EVENT_FXS_THE_YONA_AB_REWARD',
			'COMPLETE'
		),
		(
			'EVENT_FXS_THE_YONA_AB',
			'EVENT_FXS_THE_YONA_AB_REWARD2',
			'COMPLETE'
		),
		(
			'EVENT_FXS_THE_YONA_BA',
			'EVENT_FXS_THE_YONA_BA_REWARD',
			'COMPLETE'
		),
		(
			'EVENT_FXS_THE_YONA_BB',
			'EVENT_FXS_THE_YONA_BB_REWARD',
			'COMPLETE'
		),
		(
			'EVENT_FXS_THE_YONA_C',
			'EVENT_FXS_THE_YONA_C_REWARD',
			'COMPLETE'
		);

	INSERT INTO NarrativeRewards
		(
			NarrativeRewardType,
			ModifierID
		)
	VALUES
		(
			'EVENT_FXS_THE_YONA_AA_REWARD',
			'EVENT_FXS_THE_YONA_AA_MODIFIER'
		),
		(
			'EVENT_FXS_THE_YONA_AB_REWARD',
			'EVENT_FXS_THE_YONA_AB_MODIFIER'
		),
		(
			'EVENT_FXS_THE_YONA_AB_REWARD2',
			'EVENT_FXS_THE_YONA_AB_MODIFIER2'
		),
		(
			'EVENT_FXS_THE_YONA_BA_REWARD',
			'EVENT_FXS_THE_YONA_BA_MODIFIER'
		),
		(
			'EVENT_FXS_THE_YONA_BB_REWARD',
			'EVENT_FXS_THE_YONA_BB_MODIFIER'
		),
		(
			'EVENT_FXS_THE_YONA_C_REWARD',
			'EVENT_FXS_THE_YONA_C_MODIFIER'
		);
--========================================================================================================================
--========================================================================================================================