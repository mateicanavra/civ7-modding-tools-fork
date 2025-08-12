/**
 * @file panel-age-rankings.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Panel which displays the top victory ranks for each victory in the specified age
 */

import AgeSummary from '/base-standard/ui/age-summary/model-age-summary-hub.js';
import AgeRankings from '/base-standard/ui/age-rankings/model-age-rankings.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import Panel from '/core/ui/panel-support.js';
import { PlayerData } from '/base-standard/ui/victory-manager/victory-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { getPlayerColorValues } from '/core/ui/utilities/utilities-color.js';


class PanelAgeRankings extends Panel {

	private selectedAgeType: string = "";
	private boundOnSelectedAgeChanged = this.onSelectedAgeChanged.bind(this);

	onAttach() {
		const currentAge = GameInfo.Ages.lookup(Game.age);
		if (!currentAge) {
			console.error(`panel-age-rankings: Failed to get current age for hash ${Game.age}`);
			return;
		}

		this.selectedAgeType = currentAge.AgeType;

		AgeSummary.selectedAgeChangedEvent.on(this.boundOnSelectedAgeChanged);

		this.render();

		super.onAttach();
		this.Root.addEventListener("focus", this.onFocus);
	}

	onDetach() {
		AgeSummary.selectedAgeChangedEvent.off(this.boundOnSelectedAgeChanged);
		this.Root.removeEventListener("focus", this.onFocus);
		super.onDetach();
	}

	private onFocus = () => {
		const firstFocusable = this.Root.querySelector(".age-rankings__item");
		if (firstFocusable) {
			FocusManager.setFocus(firstFocusable);
		}
	}

	private render() {
		while (this.Root.lastChild) {
			this.Root.removeChild(this.Root.lastChild);
		}
		const ageRankScrollable = document.createElement('fxs-scrollable');
		ageRankScrollable.classList.add('w-full')
		ageRankScrollable.setAttribute('handle-gamepad-pan', 'true');

		const ageRankWrapper = document.createElement('fxs-vslot');
		ageRankWrapper.classList.add('w-full', 'flow-row');
		const victoryData = AgeRankings.victoryData.get(this.selectedAgeType);
		if (!victoryData) {
			console.error('panel-age-rankings: Failed to get the victory data for the desired age');
			return;
		}

		const enabledLegacyPaths = Players.get(GameContext.localPlayerID)?.LegacyPaths?.getEnabledLegacyPaths();

		for (const victory of victoryData) {
			const legacyPath = enabledLegacyPaths?.find(lPath => lPath.legacyPath == Database.makeHash(victory.Type));
			if (!legacyPath) {
				continue;
			}
			const victoryContainer = document.createElement('fxs-activatable');
			victoryContainer.setAttribute("sound-disabled", "true");
			victoryContainer.classList.add('age-rankings__item', 'flex-auto', 'ml-8', 'mr-8', 'w-96');
			victoryContainer.setAttribute("tabindex", "-1");

			const victoryIcon = document.createElement('div');
			victoryIcon.classList.add('age-rankings_icon', 'size-52', 'bg-contain', 'bg-no-repeat', 'self-center', '-mb-10', '-mt-6');
			victoryIcon.style.backgroundImage = `url('${victory.Icon}')`;
			victoryContainer.appendChild(victoryIcon);

			const victoryName = document.createElement('div');
			victoryName.classList.add('age-rankings_title', 'self-center', 'font-title-lg', 'uppercase', 'tracking-150', 'mb-2', 'text-center', 'font-fit-shrink', 'h-16')
			victoryName.setAttribute('data-l10n-id', victory.Name);
			victoryContainer.appendChild(victoryName);

			const victoryDescription = document.createElement('div');
			victoryDescription.classList.add('self-center', 'font-body-sm', 'mb-2', 'h-56')
			victoryDescription.setAttribute('data-l10n-id', victory.Description);
			victoryContainer.appendChild(victoryDescription);

			const ageProgressWrapper = document.createElement('div');
			ageProgressWrapper.classList.add('flow-row', 'font-title-xs', 'uppercase', 'tracking-100', 'justify-center', 'break-words');
			const ageProgressTitle = document.createElement('div');
			ageProgressTitle.setAttribute('data-l10n-id', 'LOC_VICTORY_AGE_PROGRESS_TALLY');
			ageProgressTitle.classList.add('mr-3')
			const ageProgressTotal = document.createElement('div');
			ageProgressTotal.innerHTML = Locale.compose('LOC_UI_AGE_RANKINGS_POINTS',
				AgeRankings.getMilestonesCompleted(victory.Type),
				AgeRankings.getMaxMilestoneProgressionTotal(victory.Type));
			ageProgressWrapper.appendChild(ageProgressTitle);
			ageProgressWrapper.appendChild(ageProgressTotal);
			victoryContainer.appendChild(ageProgressWrapper)
			let hasShownLocalPlayer: boolean = false;

			// First Place
			const firstPlace = victory.playerData[0];
			if (firstPlace) {
				victoryContainer.appendChild(this.renderPlayer(firstPlace, victory.ClassType));
				hasShownLocalPlayer = hasShownLocalPlayer == false ? firstPlace.isLocalPlayer : true;
			}

			// Second Place
			const secondPlace = victory.playerData[1];
			if (secondPlace) {
				victoryContainer.appendChild(this.renderPlayer(secondPlace, victory.ClassType));
				hasShownLocalPlayer = hasShownLocalPlayer == false ? secondPlace.isLocalPlayer : true;
			}

			// Third Place
			const thirdPlace = victory.playerData[2];
			if (thirdPlace) {
				victoryContainer.appendChild(this.renderPlayer(thirdPlace, victory.ClassType));
				hasShownLocalPlayer = hasShownLocalPlayer == false ? thirdPlace.isLocalPlayer : true;
			}

			// If local player was not shown in the top 3 then add them as well
			if (!hasShownLocalPlayer) {
				const localPlayerData = victory.playerData.find((playerData) => {
					return playerData.isLocalPlayer;
				})

				if (localPlayerData) {
					victoryContainer.appendChild(this.renderPlayer(localPlayerData, victory.ClassType));
				}
			}

			ageRankWrapper.appendChild(victoryContainer);
		}
		ageRankScrollable.appendChild(ageRankWrapper);
		this.Root.appendChild(ageRankScrollable);
	}

	private renderPlayer(player: PlayerData, victoryType: string): DocumentFragment {
		const fragment = document.createDocumentFragment();

		const playerContainer = document.createElement('div');
		playerContainer.classList.add('self-center', 'flex', 'flex-row', 'pointer-events-auto', 'mt-6');
		Databind.tooltip(playerContainer, player.playerName)
		playerContainer.setAttribute("style", getPlayerColorValues(player.playerID));

		const civLeader = document.createElement('div');
		civLeader.classList.add('size-20', 'relative');

		const civLeaderHexBGShadow = document.createElement('div');
		civLeaderHexBGShadow.classList.value = 'diplo-ribbon__portrait-hex-bg-shadow bg-contain bg-center bg-no-repeat inset-0 absolute';
		civLeader.appendChild(civLeaderHexBGShadow);

		const civLeaderHexBG = document.createElement('div');
		civLeaderHexBG.classList.value = 'diplo-ribbon__portrait-hex-bg bg-contain bg-center bg-no-repeat inset-0 absolute';
		civLeader.appendChild(civLeaderHexBG);

		const civLeaderHexBGFrame = document.createElement('div');
		civLeaderHexBGFrame.classList.value = 'diplo-ribbon__portrait-hex-bg-frame bg-contain bg-center bg-no-repeat inset-0 absolute';
		civLeader.appendChild(civLeaderHexBGFrame);

		const portrait = document.createElement("div");

		portrait.classList.add("diplo-ribbon__portrait-image", "absolute", "inset-0", "bg-contain", "bg-no-repeat", "bg-bottom");
		portrait.style.backgroundImage = `url('${player.leaderPortrait}')`;

		civLeader.appendChild(portrait);

		playerContainer.appendChild(civLeader);

		const scoreContainer = document.createElement('div');
		scoreContainer.classList.add('flex-initial', 'self-center');
		playerContainer.appendChild(scoreContainer);

		const scoreTextContainer = document.createElement('div');
		scoreTextContainer.classList.add('self-left', 'flex', 'flex-row');

		const scoreText = document.createElement('div');
		scoreText.classList.add('self-left', 'font-body', 'text-lg');
		scoreText.textContent = Locale.compose('LOC_UI_AGE_RANKINGS_POINTS', player.currentScore, player.maxScore);
		scoreTextContainer.appendChild(scoreText);

		if (player.isLocalPlayer) {
			const scoreYouText = document.createElement('div');
			scoreYouText.classList.add('self-left', 'font-body', 'text-lg', 'ml-4')
			scoreYouText.setAttribute('data-l10n-id', 'LOC_AGE_SCORE_YOU_TEXT');
			scoreTextContainer.appendChild(scoreYouText);
		}

		scoreContainer.appendChild(scoreTextContainer);

		const progressBacking = document.createElement('div');
		progressBacking.classList.add('self-center', 'h-6', 'w-40', 'border-2', 'border-primary-1', 'relative');
		scoreContainer.appendChild(progressBacking);

		const progressBar = document.createElement('div');
		progressBar.classList.add('self-center', 'h-5', 'w-full', 'bg-primary');
		progressBar.style.transformOrigin = "left";
		// prevents the bar to grow beyond the progress bar container
		let ratio = Math.min(1, ((player.maxScore != 0) ? player.currentScore / player.maxScore : 0));
		progressBar.style.transform = `scaleX(${ratio})`;
		progressBacking.appendChild(progressBar);
		const mileStonesPercents: number[] = AgeRankings.getMilestoneBarPercentages(victoryType);
		for (const percent of mileStonesPercents) {
			const line = document.createElement('div');
			line.classList.add('w-px', 'h-5', 'absolute', 'bg-primary-1');
			line.attributeStyleMap.set('left', CSS.percent(percent * 100));
			progressBacking.appendChild(line);
		}


		fragment.appendChild(playerContainer);
		return fragment;
	}

	private onSelectedAgeChanged(ageType: string) {
		this.selectedAgeType = ageType;
		this.render();
	}
}

Controls.define('panel-age-rankings', {
	createInstance: PanelAgeRankings,
	description: 'Panel which displays the victory rankings for a selected age',
	classNames: ['panel-age-rankings', 'flex-auto'],
	styles: ['fs://game/base-standard/ui/age-rankings/panel-age-rankings.css'],
	tabIndex: -1
});