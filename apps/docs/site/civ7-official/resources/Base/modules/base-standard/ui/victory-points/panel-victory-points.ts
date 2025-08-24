/**
 * @file panel-victory-points.ts
 * @copyright 2024, Firaxis Games
 * @description Displays a bar graph representing previous and current age scores/victory points for all players
 */

import Panel from '/core/ui/panel-support.js';
import VictoryPoints from '/base-standard/ui/victory-points/model-victory-points.js';
import { PlayerScoreData } from '/base-standard/ui/victory-manager/victory-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { getPlayerColorValues } from '/core/ui/utilities/utilities-color.js';

class PanelVictoryPoints extends Panel {

	onAttach() {
		this.render();
		this.Root.addEventListener("focus", this.onFocus);
		super.onAttach();
	}

	onDetach() {
		this.Root.removeEventListener("focus", this.onFocus);

		super.onDetach();
	}

	private onFocus = () => {
		const firstFocusable = this.Root.querySelector(".player-score__item");
		if (firstFocusable) {
			FocusManager.setFocus(firstFocusable);
		}
	}

	private render() {
		// Destroy existing children
		while (this.Root.lastChild) {
			this.Root.removeChild(this.Root.lastChild);
		}
		const scrollableContainer = document.createElement('fxs-scrollable');
		scrollableContainer.setAttribute("handle-gamepad-pan", "true");

		const mainContainer = document.createElement('fxs-vslot');
		mainContainer.classList.add('flex', 'flex-col', 'self-center', 'w-full');

		for (const playerData of VictoryPoints.scoreData) {
			mainContainer.appendChild(this.renderPlayerData(playerData));
		}

		scrollableContainer.appendChild(mainContainer);
		this.Root.appendChild(scrollableContainer);
	}

	private renderPlayerData(data: PlayerScoreData): HTMLElement {
		const playerContainer = document.createElement('fxs-activatable');
		playerContainer.setAttribute("sound-disabled", "true");
		playerContainer.classList.add('player-score__item', 'flex', 'flex-row', 'self-end', 'pt-5', 'w-full', 'px-12');
		playerContainer.setAttribute("tabindex", "-1");

		const leaderNameContainer = document.createElement("div");
		leaderNameContainer.classList.add("w-full", "flow-column", "items-end", "justify-center", "mb-2");

		const nameHslot = document.createElement('fxs-hslot');
		nameHslot.classList.add("self-center");

		const leaderName = document.createElement('div');
		leaderName.classList.add('font-title', 'text-sm', 'tracking-100', 'text-accent-2', 'text-center', "max-w-full");
		leaderName.classList.toggle("uppercase", !data.isHumanPlayer || !Configuration.getGame().isAnyMultiplayer);
		leaderName.setAttribute('data-l10n-id', data.playerName);
		const leaderNameFirstChild = leaderName.firstChild;
		if (leaderNameFirstChild instanceof HTMLElement) {
			leaderNameFirstChild.classList?.add("font-fit-shrink", "whitespace-nowrap", "max-w-full");
			leaderNameFirstChild.removeAttribute("cohinline");
		}

		// For MP, if it's the same platform, show the first name as the first-party name and icon, otherwise it's the 2K name and icon.
		if (Configuration.getGame().isAnyMultiplayer && data.isHumanPlayer) {
			const leaderHostIcon = document.createElement("div");
			leaderHostIcon.classList.add("mr-2");

			if (data.isSameHostPlatform) {
				leaderName.setAttribute('data-l10n-id', data.playerNameFirstParty);

				leaderHostIcon.innerHTML = data.playerHostingIcon;
			} else {
				// If it's not the same platform and there's a valid 2K Account name, show that.
				if (data.playerNameT2GP != "") {
					leaderHostIcon.innerHTML = Locale.stylize(`[ICON:PLATFORM_T2G]`);
					leaderName.setAttribute('data-l10n-id', data.playerNameT2GP);
				} else {
					// Not the same platform and no valid 2K name (shouldn't be possible), so fall back.
					leaderHostIcon.innerHTML = Locale.stylize(`[ICON:PLATFORM_UNK]`);
					leaderName.setAttribute('data-l10n-id', data.playerName);
				}
			}
			nameHslot.appendChild(leaderHostIcon);
		}

		nameHslot.appendChild(leaderName);
		leaderNameContainer.appendChild(nameHslot);

		// If this is the same host platform, add a second entry with the 2K Account info.
		if (Configuration.getGame().isAnyMultiplayer && data.isSameHostPlatform && data.isHumanPlayer && data.playerNameT2GP != "") {
			const secNameHslot = document.createElement('fxs-hslot');
			secNameHslot.classList.add("ml-4", "self-center");	// Leave a little space so platform icons aren't jammed against text.
			const secLeaderName = document.createElement('div');
			secLeaderName.classList.add('font-title', 'text-sm', 'tracking-100', 'text-accent-2', 'text-center', "max-w-full");
			secLeaderName.classList.toggle("uppercase", !data.isHumanPlayer);
			secLeaderName.setAttribute('data-l10n-id', data.playerNameT2GP);

			const leaderHostIcon = document.createElement("div");
			leaderHostIcon.classList.add("mr-2\\.5");
			leaderHostIcon.innerHTML = Locale.stylize(`[ICON:PLATFORM_T2G]`);

			secNameHslot.appendChild(leaderHostIcon);
			secNameHslot.appendChild(secLeaderName);
			nameHslot.appendChild(secNameHslot);

			// If we're showing two names, hang the YOU sign off of the second name.
			if (data.isLocalPlayer) {
				const youText = document.createElement('div');
				youText.classList.add('font-body', 'text-xs', 'self-center', 'text-accent-2', 'uppercase', 'ml-4');
				youText.setAttribute('data-l10n-id', 'LOC_AGE_SCORE_YOU_TEXT');
				secNameHslot.appendChild(youText);
			}
		} else {
			// Otherwise, put YOU on the first and only name (valid for non-MP).
			if (data.isLocalPlayer) {
				const youText = document.createElement('div');
				youText.classList.add('font-body', 'text-xs', 'self-center', 'text-accent-2', 'uppercase', 'ml-4');
				youText.setAttribute('data-l10n-id', 'LOC_AGE_SCORE_YOU_TEXT');
				nameHslot.appendChild(youText);
			}
		}

		const civLeader = document.createElement('div');
		civLeader.classList.add('size-22', 'relative');


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
		portrait.style.backgroundImage = `url('${UI.getIconURL(data.leaderPortrait, 'LEADER')}')`;

		civLeader.appendChild(portrait);

		const civLeaderContainer = document.createElement("div");
		civLeaderContainer.classList.add("flow-row");
		civLeaderContainer.setAttribute("style", getPlayerColorValues(data.playerID));
		civLeaderContainer.appendChild(civLeader);

		playerContainer.appendChild(civLeaderContainer);

		const scoreVslot = document.createElement('fxs-vslot');
		scoreVslot.classList.add('flex-auto');

		const scoreBacking = document.createElement('div');
		scoreBacking.classList.add('w-full', 'h-13', 'self-center', 'bg-primary-3');
		scoreVslot.appendChild(leaderNameContainer);
		scoreVslot.appendChild(scoreBacking);
		playerContainer.appendChild(scoreVslot);

		const scoreContainer = document.createElement('div');
		scoreContainer.classList.add('w-full', 'h-full', 'relative');
		scoreBacking.appendChild(scoreContainer);

		const highestScore = VictoryPoints.highestScore;
		let scoreLocationFromLeft = 0;
		for (const legacyData of data.legactPointData) {
			if (legacyData.value > 0) {
				const legacyScore = document.createElement('div');
				legacyScore.classList.add('h-full', 'absolute', 'flex', 'justify-center', 'items-center', VictoryPoints.legacyTypeToBgColor(legacyData.category));
				const legacyScoreLength = (legacyData.value / highestScore) * 100;
				legacyScore.attributeStyleMap.set('width', CSS.percent(legacyScoreLength));
				legacyScore.attributeStyleMap.set('left', CSS.percent(scoreLocationFromLeft));

				const legacyIcon = document.createElement('img');
				legacyIcon.classList.add('size-22');
				legacyIcon.src = UI.getIconURL(VictoryPoints.legacyTypeToVictoryType(legacyData.category));
				legacyScore.appendChild(legacyIcon);

				scoreContainer.appendChild(legacyScore);
				scoreLocationFromLeft += legacyScoreLength;
			}
		}
		const totalScore = document.createElement('div');
		totalScore.classList.add('self-end', 'font-body-lg', 'mr-4', 'ml-4', 'w-32', 'flex', 'items-end', 'mb-3', 'h-full');
		totalScore.textContent = data.totalAgeScore.toString();
		playerContainer.appendChild(totalScore);

		return playerContainer;
	}
}

Controls.define('panel-victory-points', {
	createInstance: PanelVictoryPoints,
	description: 'Displays a bar graph representing previous and current age scores/victory points for all players',
	classNames: ['panel-victory-points', 'flex-auto', 'justify-center'],
	tabIndex: -1
});