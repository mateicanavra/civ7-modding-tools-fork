/**
 * @file legend-progress.ts
 * @copyright 2024, Firaxis Games
 * @description Meta progression info to show at the end of an age
 */

import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import ContextManager from '/core/ui/context-manager/context-manager.js'
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import LegendsManager, { EarnedProgressItem, ChallengeItem } from '/base-standard/ui/legends-manager/legends-manager.js';

class LegendProgressScreen extends Panel {

	onAttach() {
		super.onAttach();
		const currentlyPlayedLeader = Configuration.getPlayer(GameContext.localPlayerID).leaderName;
		let leaderName = currentlyPlayedLeader ? currentlyPlayedLeader.replace("LOC_", "") : "";
		leaderName = leaderName.replace("_NAME", "");
		this.Root.innerHTML = `<fxs-frame class="legends-progress-frame">
			<div class="legend-timeline-container"></div>
 			<div class="primary-window">
	 			<fxs-scrollable>
		 			<fxs-vslot class="legend-outermost-container">
						<div class="legend-title flex relative font-title self-center" data-l10n-id="LOC_END_GAME_LEGEND_PROGRESS"></div>
						<fxs-vslot class="legend-main-container">
							<fxs-hslot class="legend-top-container">
								<fxs-vslot class="legend-top-divider">
									<fxs-hslot class="legend-progress-outermost">
										<fxs-vslot class="legend-progress-outer">
											<div class="legend-subtitle relative self-center text-secondary font-title" data-l10n-id="LOC_END_GAME_PROGRESS_EARNED"></div>
											<fxs-scrollable class="legend-progress-scrollable">
												<fxs-vslot class="legend-progress-inner"></fxs-vslot>
											</fxs-scrollable>
										</fxs-vslot>
										<div class="legend-unlock-icons">
										</div>
										<fxs-vslot class="legend-unlocks">
											<div class="legend-unlock-title legend-rewards-unlocked font-body text-accent-2"></div>
										</fxs-vslot>										
									</fxs-hslot>
								</fxs-vslot>
							</fxs-hslot>
							<fxs-hslot class="legend-bottom-container">
								<fxs-vslot class="legend-challenge-list legend-foundation-completed">
									<div class="legend-foundation-title font-body text-accent-2"></div>
									<fxs-scrollable class="legend-challenge-scrollable legend-foundation-list"></fxs-scrollable>
								</fxs-vslot>
								<fxs-vslot class="legend-challenge-list legend-leader-completed">
									<div class="legend-leader-title font-body text-accent-2"></div>
									<fxs-scrollable class="legend-challenge-scrollable legend-leader-list"></fxs-scrollable>
								</fxs-vslot>
							</fxs-hslot>
							<fxs-hslot class="legend-button-container">
								<fxs-button class="legend-continue-button" caption="LOC_END_GAME_TRANSITION" action-key="inline-accept"></fxs-button>
							</fxs-hslot>							
						</fxs-vslot>
		 			</fxs-vslot>
	 			</fxs-scrollable>
 			</div>
		</fxs-frame>`;

		const legendsData = LegendsManager.getData();

		const earnedProgressList: HTMLElement = MustGetElement(".legend-progress-inner", this.Root);
		legendsData.progressItems.forEach(earnedItem => {
			earnedProgressList.appendChild(this.buildEarnedProgressItem(earnedItem));
		});

		const legendFoundationList: HTMLElement = MustGetElement(".legend-foundation-list", this.Root);
		let totalChallenges: number = 0;
		let totalXP: number = 0;

		legendsData.completedFoundationChallenge.forEach(progressItem => {
			totalChallenges = totalChallenges + 1;
			totalXP = totalXP + progressItem.points;
			legendFoundationList.appendChild(this.buildFoundationItem(progressItem));
		});

		const foundationPoints: HTMLElement = MustGetElement(".legend-foundation-title", this.Root);
		foundationPoints.innerHTML = Locale.compose("LOC_END_GAME_FOUNDATION_CHALLENGES_COMPLETED", totalChallenges, totalXP);

		const legendLeaderList: HTMLElement = MustGetElement(".legend-leader-list", this.Root);
		totalChallenges = 0;
		totalXP = 0;
		legendsData.completedLeaderChallenge.forEach(leaderItem => {
			totalChallenges = totalChallenges + 1;
			totalXP = totalXP + leaderItem.points;
			legendLeaderList.appendChild(this.buildLeaderItem(leaderItem));
		});

		const leaderPoints: HTMLElement = MustGetElement(".legend-leader-title", this.Root);
		leaderPoints.innerHTML = Locale.compose("LOC_END_GAME_LEADER_CHALLENGES_COMPLETED", totalChallenges, totalXP);

		let canTransition: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player && player.Ages) {
			if (Game.age != player.Ages.getLastAge()) {
				canTransition = true;
			}
		} else {
			if (!player) {
				console.error(`legend-progress: Could not get PlayerLibrary for ${GameContext.localPlayerID}`);
			} else {
				console.error(`legend-progress: Could not get PlayerAges for ${GameContext.localPlayerID}`);
			}
		}

		const isPlayingActiveEvent = Online.Metaprogression.isPlayingActiveEvent();
		const shouldExitToMainMenu = isPlayingActiveEvent || !canTransition;

		// exit or age transition depending if live event game or not and if there is an age after this one.
		const transitionButton: HTMLElement = MustGetElement(".legend-continue-button", this.Root);
		transitionButton.setAttribute('caption', shouldExitToMainMenu ? 'LOC_END_GAME_EXIT' : 'LOC_END_GAME_TRANSITION');
		transitionButton.addEventListener('action-activate', () => {
			if (shouldExitToMainMenu) {
				UI.sendAudioEvent(Audio.getSoundTag('data-audio-age-end-closed'));
				engine.call('exitToMainMenu');
			} else {
				UI.sendAudioEvent(Audio.getSoundTag('data-audio-age-end-closed'));
				engine.call('transitionToNextAge');
			}
		});

		if (isPlayingActiveEvent) {
			var legendButtonContainer = MustGetElement(".legend-button-container", this.Root);
			var leaderboardButton: HTMLElement = document.createElement("fxs-button");
			leaderboardButton.setAttribute('caption', "LOC_PROFILE_TAB_LEADERBOARDS");
			leaderboardButton.setAttribute('action-key', "inline-accept");
			leaderboardButton.addEventListener('action-activate', () => {
				ContextManager.push('screen-profile-page', { singleton: true, createMouseGuard: true, panelOptions: { onlyChallenges: false, onlyLeaderboards: true } })
			})

			legendButtonContainer.appendChild(leaderboardButton);
		}

		const unlockIcons: HTMLElement = MustGetElement(".legend-unlock-icons", this.Root);
		const unlockTitles: HTMLElement = MustGetElement(".legend-unlocks", this.Root);

		legendsData.unlockedFoundationRewards.forEach(item => {
			const unlock = document.createElement("div");
			unlock.classList.add("legend-unlock-icon");
			unlock.style.backgroundImage = "url('" + item.url + "')";
			unlockIcons.appendChild(unlock);

			const title = document.createElement("div");
			title.classList.add("legend-unlock-title");
			title.classList.add("font-body", "text-accent-2");
			title.innerHTML = Locale.compose(item.title);
			unlockTitles.appendChild(title);
		});

		legendsData.unlockedLeaderRewards.forEach(item => {
			const unlock = document.createElement("div");
			unlock.classList.add("legend-unlock-icon");
			unlock.style.backgroundImage = "url('" + item.url + "')";
			unlockIcons.appendChild(unlock);

			const title = document.createElement("div");
			title.classList.add("legend-unlock-title");
			title.classList.add("font-body", "text-accent-2");
			title.innerHTML = Locale.compose(item.title);
			unlockTitles.appendChild(title);
		});

		const unlocksTitle: HTMLElement = MustGetElement(".legend-rewards-unlocked", this.Root);
		unlocksTitle.innerHTML = Locale.compose("LOC_END_GAME_REWARDS_UNLOCKED", legendsData.unlockedFoundationRewards.length + legendsData.unlockedLeaderRewards.length);
	}

	onDetach() {
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();
		NavTray.clear();

		const transitionButton: HTMLElement = MustGetElement(".legend-continue-button", this.Root);
		FocusManager.setFocus(transitionButton);
	}

	onLoseFocus() {
		super.onLoseFocus();
	}

	private buildEarnedProgressItem(item: EarnedProgressItem): DocumentFragment {
		const fragment = document.createDocumentFragment();

		const itemSlot = document.createElement("fxs-hslot");
		itemSlot.classList.add("legend-progress-item");

		const portrait = document.createElement("progression-portrait");
		portrait.classList.add("legend-progress-portrait");
		portrait.setAttribute("leader", item.leader);
		itemSlot.appendChild(portrait);

		const itemCenter = document.createElement("fxs-vslot");
		itemCenter.classList.add("legend-progress-item-center");

		const titleBar = document.createElement("fxs-hslot");
		titleBar.classList.add("legend-progress-item-titlebar");

		const itemTitle = document.createElement("div");
		itemTitle.classList.add("legend-progress-item-title");
		itemTitle.classList.add("font-body", "text-accent-2");
		itemTitle.innerHTML = Locale.compose(item.title);
		titleBar.appendChild(itemTitle);

		const newLevel = document.createElement("div");
		newLevel.classList.add("legend-progress-item-newlevel");
		newLevel.classList.add("font-body", "text-accent-2");
		newLevel.innerHTML = Locale.compose("LOC_END_GAME_NEW_LEVEL");
		titleBar.appendChild(newLevel);
		itemCenter.appendChild(titleBar);

		const itemBarContainer = document.createElement("fxs-hslot");
		itemBarContainer.classList.add("legend-progress-item-bar-container");

		const currentLevel = document.createElement("div");
		currentLevel.classList.add("legend-progress-item-bar-number");
		currentLevel.classList.add("font-body", "text-accent-2");
		currentLevel.innerHTML = item.startLevel.toString();
		itemBarContainer.appendChild(currentLevel);

		const bar = document.createElement("fxs-hslot");
		bar.classList.add("legend-progress-item-bar");

		const totalWidth: number = 24;
		const levelRatio: number = totalWidth / (item.nextLevelXP - item.previousLevelXP);

		let existingWidth: number = item.previousXP < item.previousLevelXP ? 0 : levelRatio * (item.previousXP - item.previousLevelXP)

		const existingXP = document.createElement("div");
		existingXP.classList.add("legend-progress-bar-filler");
		existingXP.style.width = existingWidth.toString() + "vw";
		existingXP.style.backgroundColor = "black";
		existingXP.classList.add("progress-bar-slide");
		bar.appendChild(existingXP);

		const newXP = document.createElement("div");
		newXP.classList.add("legend-progress-bar-filler");

		let newWidth: number = item.previousXP < item.previousLevelXP ? levelRatio * (item.gainedXP + item.previousXP - item.previousLevelXP) : levelRatio * item.gainedXP;
		newXP.style.width = newWidth.toString() + "vw";
		newXP.style.backgroundColor = "green";
		bar.appendChild(newXP);

		itemBarContainer.appendChild(bar);

		const nextLevel = document.createElement("div");
		nextLevel.classList.add("legend-progress-item-bar-number");
		nextLevel.classList.add("font-body", "text-accent-2");
		nextLevel.innerHTML = item.nextLevel.toString();
		itemBarContainer.appendChild(nextLevel);
		itemCenter.appendChild(itemBarContainer);

		const xp = document.createElement("div");
		xp.classList.add("legend-progress-item-xp");
		xp.classList.add("font-body", "text-accent-2");
		xp.innerHTML = Locale.compose("LOC_END_GAME_XP_RATIO", item.previousXP + item.gainedXP, item.nextLevelXP);
		itemCenter.appendChild(xp);
		itemSlot.appendChild(itemCenter);

		const unlockIcons = document.createElement("div");
		unlockIcons.classList.add("legend-progress-item-locks");

		// TODO: figure out appropriate unlock icons to show here
		const unlock = document.createElement("div");
		unlock.classList.add("legend-profile-badge");
		unlock.style.backgroundImage = "url('fs://game/ba_default')";
		unlockIcons.appendChild(unlock);

		itemSlot.appendChild(unlockIcons);

		fragment.appendChild(itemSlot);
		return fragment;
	}

	private buildFoundationItem(item: ChallengeItem): DocumentFragment {
		const fragment = document.createDocumentFragment();

		const itemSlot = document.createElement("fxs-hslot");
		itemSlot.classList.add("legend-challenge-foundation-item");

		const pointsStr: string = Locale.compose("LOC_END_GAME_ADD_XP", item.points);
		itemSlot.innerHTML = `<fxs-vslot class="legend-challenge-foundation-item-left text-accent-2">
								<div class="legend-challenge-foundation-item-title">${item.title}</div>
								<div class="legend-challenge-foundation-item-description font-title text-xs">${item.description}</div>
							  </fxs-vslot>
							  <div class="legend-challenge-foundation-item-xp text-base">${pointsStr}</div>`;

		fragment.appendChild(itemSlot);
		return fragment;
	}

	private buildLeaderItem(item: ChallengeItem): DocumentFragment {
		const fragment = document.createDocumentFragment();

		const itemSlot = document.createElement("fxs-hslot");
		itemSlot.classList.add("legend-challenge-leader-item");

		const pointsStr: string = Locale.compose("LOC_END_GAME_ADD_XP", item.points);
		itemSlot.innerHTML = `<div class="legend-challenge-leader-description text-xs">${item.title}</div>
							  <div class="legend-challenge-leader-xp text-xs">${pointsStr}</div>`;

		fragment.appendChild(itemSlot);
		return fragment;
	}
}

Controls.define('screen-legend-progress', {
	createInstance: LegendProgressScreen,
	description: 'End of age metaprogression',
	classNames: ['fullscreen', 'flex', 'flow-column', 'justify-end', 'items-stretch'],
	styles: ["fs://game/base-standard/ui/legend-progress/legend-progress.css"],
});
