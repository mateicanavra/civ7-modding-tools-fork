/**
 * @file screen-legends-report.ts
 * @copyright 2024, Firaxis Games
 * @description Screen showing breakdown of legend progress during Age Transition
 */

import LegendsManager, { ChallengeItem, UnlockedItem } from '/base-standard/ui/legends-manager/legends-manager.js';
import LegendsReport from '/base-standard/ui/legends-report/model-legends-report.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import Panel from '/core/ui/panel-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js'
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';

const STARTING_INNER_HTML = `
<fxs-frame class="w-full h-full">
	<fxs-vslot class="w-full h-full">
		<fxs-header class="legends-report-title self-center mb-14 uppercase font-title text-2xl" title-style="h1" title="LOC_UI_LEGENDS_REPORT_TITLE"></fxs-header>
		<fxs-scrollable class="legends-report-scrollable -mt-6">
			<fxs-hslot class='progress-container flex flex-auto self-center'></fxs-hslot>
			<p class="no-challenge-warning self-center text-xl uppercase" data-l10n-id="LOC_UI_LEGENDS_REPORT_NO_CHALLENGES" data-bind-if="!{{g_LegendsReportModel.showRewards}}"></p>
			<p class="no-reward-warning self-center text-xl uppercase" data-l10n-id="LOC_UI_LEGENDS_REPORT_NO_REWARDS" data-bind-if="{{g_LegendsReportModel.showRewards}}"></p>
		</fxs-scrollable>
		<fxs-button class="legends-report-continue-button mt-6 w-128 self-end" action-key="inline-accept" caption="LOC_AGE_LOADOUT_CONTINUE"></fxs-button>
	</fxs-vslot>
</fxs-frame>`;

enum ContinueButtonState {
	SHOW_REWARDS,
	CONTINUE_AGE_TRANSTIION,
	EXIT_TO_MAIN_MENU
}

class ScreenLegendsReport extends Panel {

	private continueButton!: HTMLDivElement;

	private foundationChallengesDiv: HTMLElement | null = null;
	private leaderChallengesDiv: HTMLElement | null = null;

	private foundationRewardsDiv!: HTMLElement;
	private leaderRewardsDiv!: HTMLElement;

	private continueButtonState: ContinueButtonState = ContinueButtonState.SHOW_REWARDS;
	private leaderMeter = document.createElement('fxs-ring-meter');
	private foundationMeter = document.createElement('fxs-ring-meter');

	private engineInputListener = this.onEngineInput.bind(this);

	onInitialize() {
		super.onInitialize();

		this.render();
	}

	onAttach() {
		super.onAttach();
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "audio-legend-report");

		this.continueButton = MustGetElement(".legends-report-continue-button", this.Root);
		LegendsReport.showRewards = false;
		this.continueButtonState = ContinueButtonState.SHOW_REWARDS;

		const legendsData = LegendsManager.getData();
		const leaderData = legendsData.progressItems.find((data) => {
			return data.leader != "FOUNDATION";
		});

		// if this leader has no data, make the continue button work
		if (!leaderData) {
			const canTransition = Game.AgeProgressManager.canTransitionToNextAge(GameContext.localPlayerID);
			const isPlayingActiveEvent = Online.Metaprogression.isPlayingActiveEvent();
			const shouldExitToMainMenu = isPlayingActiveEvent || !canTransition;

			if (shouldExitToMainMenu) {
				this.continueButtonState = ContinueButtonState.EXIT_TO_MAIN_MENU;
				this.continueButton.setAttribute("caption", "LOC_END_GAME_EXIT");
			} else {
				this.continueButtonState = ContinueButtonState.CONTINUE_AGE_TRANSTIION;
				this.continueButton.setAttribute("caption", "LOC_END_GAME_TRANSITION");
			}
		}

		// Attach the event listener here, there are early exits in render() that could make it inoperable.
		this.continueButton.addEventListener("action-activate", this.onContinueButton.bind(this));
		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
	}

	onDetach() {
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		const progressContainer = MustGetElement(".progress-container", this.Root);
		FocusManager.setFocus(progressContainer);
	}

	private render() {
		this.Root.innerHTML = STARTING_INNER_HTML;

		const legendsData = LegendsManager.getData();

		const fragment = document.createDocumentFragment();

		// Foundation Progress
		const foundationData = legendsData.progressItems.find((data) => {
			return data.leader == "FOUNDATION";
		});

		if (!foundationData) {
			console.error('screen-legends-reports: Failed to find Foundation legends data!');
			return;
		}

		const foundationContainer = document.createElement('div');
		foundationContainer.classList.add('flex', 'flex-col', "items-center", "w-1\\/2");
		fragment.appendChild(foundationContainer);

		const foundationTitle = document.createElement('p');
		foundationTitle.classList.add('self-center', 'font-title', 'text-xl', "uppercase", "text-gradient-secondary", "mb-4");
		foundationTitle.setAttribute('data-l10n-id', foundationData.title);
		foundationTitle.setAttribute('tabindex', '-1');
		foundationContainer.appendChild(foundationTitle);

		this.foundationMeter.classList.add('legends-ring', 'h-64', 'w-64', 'bg-contain', 'bg-center', 'flex', "items-center", "justify-center");
		this.foundationMeter.setAttribute("min-value", foundationData.previousLevelXP.toString());
		this.foundationMeter.setAttribute("max-value", foundationData.nextLevelXP.toString());
		this.foundationMeter.setAttribute("value", (foundationData.previousXP + foundationData.gainedXP).toString());
		if (foundationData.previousLevelXP != (foundationData.previousXP + foundationData.gainedXP)) {
			this.foundationMeter.setAttribute("data-audio-fill-sound", "data-audio-ring-animate-start");
		}
		foundationContainer.appendChild(this.foundationMeter);

		const foundationIcon = document.createElement("div");
		foundationIcon.classList.add("size-52", "img-ba-default");
		this.foundationMeter.appendChild(foundationIcon);

		const foundationLevelCircle = document.createElement("div");
		foundationLevelCircle.classList.add("ring-level-circle", "bg-contain", "bg-no-repeat", "size-12", "flex", "justify-center", "absolute", "-bottom-2", "z-1")
		this.foundationMeter.appendChild(foundationLevelCircle);

		const foundationLevel = document.createElement('p');
		foundationLevel.classList.add('font-body', 'text-xl', 'self-center');
		foundationLevel.textContent = foundationData.startLevel.toString();
		foundationLevelCircle.appendChild(foundationLevel);

		const foundationExperience = document.createElement('p');
		foundationExperience.classList.add("font-title", 'text-xl', 'self-center', 'my-4');
		foundationExperience.textContent = Locale.compose('LOC_PROFILE_QUEST_PROGRESS', foundationData.gainedXP + foundationData.previousXP, foundationData.nextLevelXP);
		foundationContainer.appendChild(foundationExperience);

		// Foundation Challenges
		this.foundationChallengesDiv = this.createChallenges(
			legendsData.completedFoundationChallenge,
			"LOC_UI_LEGENDS_REPORT_PLUS_FOUNDATION_XP");
		foundationContainer.appendChild(this.foundationChallengesDiv);

		// Foundation Rewards
		this.foundationRewardsDiv = this.createRewards(
			legendsData.unlockedFoundationRewards);
		foundationContainer.appendChild(this.foundationRewardsDiv);

		// Leader Progress
		const leaderData = legendsData.progressItems.find((data) => {
			return data.leader != "FOUNDATION";
		});

		if (!leaderData) {
			console.error('screen-legends-reports: Failed to find Foundation legends data!');
			return;
		}

		const leaderContainer = document.createElement('div');
		leaderContainer.classList.add('flex', 'flex-col', "items-center", "w-1\\/2");
		fragment.appendChild(leaderContainer);

		const leaderTitle = document.createElement('p');
		leaderTitle.classList.add('self-center', 'font-title', 'text-xl', "uppercase", "text-gradient-secondary", "mb-4");
		leaderTitle.setAttribute('data-l10n-id', leaderData.title);
		leaderTitle.setAttribute('tabindex', '-1');
		leaderContainer.appendChild(leaderTitle);

		this.leaderMeter.classList.add('legends-ring', 'h-64', 'w-64', 'bg-contain', 'bg-center', 'flex', "items-center", "justify-center");
		this.leaderMeter.setAttribute("min-value", leaderData.previousLevelXP.toString());
		this.leaderMeter.setAttribute("max-value", leaderData.nextLevelXP.toString());
		this.leaderMeter.setAttribute("value", (leaderData.previousXP + leaderData.gainedXP).toString());
		if (leaderData.previousLevelXP != (leaderData.previousXP + leaderData.gainedXP)) {
			this.leaderMeter.setAttribute("data-audio-fill-sound", "data-audio-ring-animate-start");
		}
		leaderContainer.appendChild(this.leaderMeter);

		const leaderIcon = document.createElement("fxs-icon");
		leaderIcon.setAttribute("data-icon-id", leaderData.leader);
		leaderIcon.setAttribute("data-icon-context", "CIRCLE_MASK");
		leaderIcon.classList.add("size-64");
		this.leaderMeter.appendChild(leaderIcon);

		const leaderLevelCircle = document.createElement("div");
		leaderLevelCircle.classList.add("ring-level-circle", "bg-contain", "bg-no-repeat", "size-12", "flex", "justify-center", "absolute", "-bottom-2", "z-1")
		this.leaderMeter.appendChild(leaderLevelCircle);

		const leaderLevel = document.createElement('p');
		leaderLevel.classList.add('font-body', 'text-xl', "self-center");
		leaderLevel.textContent = leaderData.startLevel.toString();
		leaderLevelCircle.appendChild(leaderLevel);

		const leaderExperience = document.createElement('p');
		leaderExperience.classList.add("font-title", 'text-xl', 'self-center', 'my-4');
		leaderExperience.textContent = Locale.compose('LOC_PROFILE_QUEST_PROGRESS', leaderData.gainedXP + leaderData.previousXP, leaderData.nextLevelXP);
		leaderContainer.appendChild(leaderExperience);

		// Leader Challenges
		this.leaderChallengesDiv = this.createChallenges(
			legendsData.completedLeaderChallenge,
			"LOC_UI_LEGENDS_REPORT_PLUS_LEADER_XP");
		leaderContainer.appendChild(this.leaderChallengesDiv);

		// Leader Rewards
		this.leaderRewardsDiv = this.createRewards(
			legendsData.unlockedLeaderRewards);
		leaderContainer.appendChild(this.leaderRewardsDiv);

		const noChallengeWarning = MustGetElement(".no-challenge-warning", this.Root);
		noChallengeWarning.classList.toggle("hidden", legendsData.completedFoundationChallenge.length != 0 || legendsData.completedLeaderChallenge.length != 0);

		const noRewardWarning = MustGetElement(".no-reward-warning", this.Root);
		noRewardWarning.classList.toggle("hidden", legendsData.unlockedFoundationRewards.length != 0 || legendsData.unlockedLeaderRewards.length != 0);

		const progressContainer = MustGetElement(".progress-container", this.Root);
		progressContainer.appendChild(fragment);
	}

	private createChallenges(challenges: ChallengeItem[], xpString: string) {
		const ChallengesDiv = document.createElement("div");
		ChallengesDiv.classList.add("self-center", "mx-4")

		const challengesContainer = document.createElement('fxs-vslot');
		challengesContainer.classList.add('flex', 'flex-col');
		ChallengesDiv.appendChild(challengesContainer);

		for (const challenge of challenges) {
			challengesContainer.appendChild(this.createChallengeEntry(challenge, xpString));
		}

		return ChallengesDiv;
	}

	private createChallengeEntry(challenge: ChallengeItem, xpString: string) {
		const challengesItem = document.createElement('div');
		challengesItem.role = "paragraph";
		challengesItem.setAttribute('tabindex', '-1');
		challengesItem.classList.add('challenges-item', 'flex', "mb-8", "pointer-events-auto");
		const toolTipText = `<div class="uppercase font-bold" data-l10n-id="${challenge.title}"></div>
			<div data-l10n-id="${challenge.description}"></div>`;
		challengesItem.setAttribute('data-tooltip-content', toolTipText);

		const challengesHighlight = document.createElement('div');
		challengesHighlight.classList.add("challenges-highlight", "flex");
		challengesItem.appendChild(challengesHighlight);

		const challengesTextContainer = document.createElement('div');
		challengesTextContainer.classList.add('flex', 'flex-col');
		challengesHighlight.appendChild(challengesTextContainer);

		const challengeName = document.createElement('div');
		challengeName.classList.add("w-96", "break-words", "text-right", "font-title", "mb-2", "text-lg", "font-bold");
		challengeName.textContent = challenge.title;
		challengesTextContainer.appendChild(challengeName);

		const challengeDescription = document.createElement('div');
		challengeDescription.classList.add("w-96", "break-words", "text-right");
		challengeDescription.textContent = challenge.description;
		challengesTextContainer.appendChild(challengeDescription);

		const challengePoints = document.createElement('div');
		challengePoints.classList.add("font-title", "self-center", "font-bold", "text-2xl", "px-4");
		challengePoints.textContent = Locale.compose(xpString, challenge.points);
		challengesHighlight.appendChild(challengePoints);

		return challengesItem;
	}

	private createRewards(unlockedItems: UnlockedItem[]): HTMLElement {
		const RewardsDiv = document.createElement("div");
		RewardsDiv.classList.add("self-center", "mx-4", "hidden")

		const rewardsContainer = document.createElement('fxs-spatial-slot');
		rewardsContainer.classList.add('flex', 'flex-row', "flex-wrap", "justify-center");
		RewardsDiv.appendChild(rewardsContainer);

		for (const unlock of unlockedItems) {
			rewardsContainer.appendChild(this.createRewardEntry(unlock));
		}

		return RewardsDiv;
	}

	private createRewardEntry(unlock: UnlockedItem) {
		const rewardsItem = document.createElement('div');
		rewardsItem.setAttribute("tabindex", "-1")
		const toolTipText = `<div class="uppercase font-bold" data-l10n-id="${unlock.title}"></div>
			<div data-l10n-id="${unlock.description}"></div>`;
		rewardsItem.setAttribute('data-tooltip-content', toolTipText);
		rewardsItem.classList.add("rewards-item", "pointer-events-auto", "m-1", "p-1");

		const rewardIcon = document.createElement('img');
		rewardIcon.src = unlock.url;
		rewardIcon.height = Layout.pixelsToScreenPixels(96);

		rewardsItem.appendChild(rewardIcon);

		return rewardsItem;
	}

	private stopMeterSounds() {
		const leaderMeterSoundPlaying = this.leaderMeter.getAttribute("anim-sound-playing");
		const foundationMeterSoundPlaying = this.foundationMeter.getAttribute("anim-sound-playing");
		if ((leaderMeterSoundPlaying == "true") || (foundationMeterSoundPlaying == "true")) {
			Audio.playSound("data-audio-ring-animate-stop")
			this.leaderMeter.setAttribute("anim-sound-playing", "false");
			this.foundationMeter.setAttribute("anim-sound-playing", "false");
		}
	}

	private onContinueButton() {
		switch (this.continueButtonState) {
			case ContinueButtonState.SHOW_REWARDS:
				this.foundationChallengesDiv?.remove();
				this.leaderChallengesDiv?.remove();
				this.foundationRewardsDiv.classList.remove("hidden");
				this.leaderRewardsDiv.classList.remove("hidden");
				LegendsReport.showRewards = true;
				break;
			case ContinueButtonState.CONTINUE_AGE_TRANSTIION:
				this.stopMeterSounds()
				this.playAnimateOutSound();
				engine.call('transitionToNextAge');
				return;
			case ContinueButtonState.EXIT_TO_MAIN_MENU:
				this.stopMeterSounds()
				this.playAnimateOutSound();
				engine.call('exitToMainMenu');
				return;
			default:
				this.stopMeterSounds();
				console.error(`screen-legends-report: onContinueButton: Failed to handle button state ${this.continueButtonState}`);
				return;
		}

		// Determine next step
		const canTransition = Game.AgeProgressManager.canTransitionToNextAge(GameContext.localPlayerID);

		const isPlayingActiveEvent = Online.Metaprogression.isPlayingActiveEvent();
		const shouldExitToMainMenu = isPlayingActiveEvent || !canTransition;

		if (shouldExitToMainMenu) {
			this.continueButtonState = ContinueButtonState.EXIT_TO_MAIN_MENU;
			this.continueButton.setAttribute("caption", "LOC_END_GAME_EXIT");
		} else {
			this.continueButtonState = ContinueButtonState.CONTINUE_AGE_TRANSTIION;
			this.continueButton.setAttribute("caption", "LOC_END_GAME_TRANSITION");
		}
	}

	protected onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}
		if (inputEvent.detail.name == "accept") {
			this.onContinueButton();
			FocusManager.setFocus(this.continueButton);
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}
}

Controls.define('screen-legends-report', {
	createInstance: ScreenLegendsReport,
	description: 'Screen showing breakdown of legend progress during Age Transition',
	classNames: ['screen-legends-report', 'flex-auto', "font-body", "text-base"],
	styles: ['fs://game/base-standard/ui/legends-report/screen-legends-report.css']
});