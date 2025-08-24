/**
 * @file panel-age-score.ts
 * @copyright 2023, Firaxis Games
 * @description Panel intended to display an overview scores for all victory types for an age
 */

import AgeScores, { VictoryData, PlayerData } from '/base-standard/ui/age-scores/model-age-scores.js';

class PanelAgeScores extends Component {

	private ageScoresContainerClass: string = '.age-scores-container';

	private ageScoresContainer: Element | null = null;

	private rebuildAgeScoresListener: EventListener = () => { this.onRebuildAgeScores(); };

	private maximumPlacesToShow: number = 12;

	onAttach() {
		super.onAttach();

		this.ageScoresContainer = this.Root.querySelector(this.ageScoresContainerClass);
		if (!this.ageScoresContainer) {
			console.error(`panel-age-scores: Failed to find ${this.ageScoresContainerClass}`);
			return;
		}

		this.rebuildAgeScores();

		window.addEventListener('model-age-scores-rebuild-panel', this.rebuildAgeScoresListener);
	}

	onDetach() {
		window.removeEventListener('model-age-scores-rebuild-panel', this.rebuildAgeScoresListener);

		super.onDetach();
	}

	private onRebuildAgeScores() {
		this.rebuildAgeScores();
	}

	private rebuildAgeScores() {
		if (!this.ageScoresContainer) {
			console.error(`panel-age-scores: Failed to find ${this.ageScoresContainerClass}`);
			return;
		}

		// Remove old cards
		while (this.ageScoresContainer.hasChildNodes()) {
			this.ageScoresContainer.removeChild(this.ageScoresContainer.lastChild!);
		}

		// Add new cards
		AgeScores.victories.forEach((victoryData: VictoryData) => {
			this.createWinConditionCard(victoryData);
		});
	}

	private createWinConditionCard(victoryData: VictoryData) {
		if (!this.ageScoresContainer) {
			console.error(`panel-age-scores: Failed to find ${this.ageScoresContainerClass}`);
			return;
		}

		const localPlayerVictoryPercent: string = Math.round(victoryData.localPlayerPercent * 100).toString();
		const victoryTypeTitle: string = victoryData.victoryName;

		// Build card base art

		const winTypeCardWrapper: HTMLDivElement = document.createElement("div");
		winTypeCardWrapper.classList.add("age-scores__card-wrapper");
		this.ageScoresContainer.appendChild(winTypeCardWrapper);

		const winTypeCardDropShadow: HTMLDivElement = document.createElement("div");
		winTypeCardDropShadow.classList.add("age-scores__card-drop-shadow");
		winTypeCardWrapper.appendChild(winTypeCardDropShadow);

		const winTypeCardBase: HTMLDivElement = document.createElement("div");
		winTypeCardBase.classList.add("age-scores__card-base");
		winTypeCardDropShadow.appendChild(winTypeCardBase);

		const winTypeCardFlavorImage: HTMLDivElement = document.createElement("div");
		winTypeCardFlavorImage.classList.add("age-scores__card-flavor-image");
		winTypeCardFlavorImage.style.backgroundImage = `url('${victoryData.victoryBackground}')`;
		winTypeCardBase.appendChild(winTypeCardFlavorImage);

		const winTypeCardFlavorImageGradientOverlay: HTMLDivElement = document.createElement("div");
		winTypeCardFlavorImageGradientOverlay.classList.add("age-scores__card-flavor-image-gradient-overlay");
		winTypeCardBase.appendChild(winTypeCardFlavorImageGradientOverlay);

		const winTypeCardFrame: HTMLDivElement = document.createElement("div");
		winTypeCardFrame.classList.add("age-scores__card-frame");
		winTypeCardFlavorImageGradientOverlay.appendChild(winTypeCardFrame);

		// Card Content Starts Here

		const winTypeCardContentWrapper: HTMLDivElement = document.createElement("div");
		winTypeCardContentWrapper.classList.add("age-scores__card-content-wrapper");
		winTypeCardFrame.appendChild(winTypeCardContentWrapper);

		// Victory Condition Title

		const winTypeCardTitleWrapper: HTMLDivElement = document.createElement("div");
		winTypeCardTitleWrapper.classList.add("age-scores__card-title-wrapper");
		winTypeCardContentWrapper.appendChild(winTypeCardTitleWrapper);

		const winTypeCardTitleText: HTMLDivElement = document.createElement("div");
		winTypeCardTitleText.classList.add("age-scores__card-title-text");
		winTypeCardTitleText.setAttribute('data-l10n-id', victoryTypeTitle);
		winTypeCardTitleWrapper.appendChild(winTypeCardTitleText);

		const winTypeCardTitleHorizontalRule: HTMLDivElement = document.createElement("div");
		winTypeCardTitleHorizontalRule.classList.add("age-scores__card-title-horizontal-rule");
		winTypeCardTitleWrapper.appendChild(winTypeCardTitleHorizontalRule);

		// Number Required to Meet Victory

		const winTypeCardVictoryRequirementWrapper: HTMLDivElement = document.createElement("div");
		winTypeCardVictoryRequirementWrapper.classList.add("age-scores__victory-requirement-wrapper");
		winTypeCardVictoryRequirementWrapper.setAttribute("data-tooltip-content", victoryData.victoryDescription);
		winTypeCardContentWrapper.appendChild(winTypeCardVictoryRequirementWrapper);

		const victReqOuterHexOutline: HTMLDivElement = document.createElement("div");
		victReqOuterHexOutline.classList.add("age-scores__vict-req-outer-hex");
		winTypeCardVictoryRequirementWrapper.appendChild(victReqOuterHexOutline);

		const victReqInnerHexOutline: HTMLDivElement = document.createElement("div");
		victReqInnerHexOutline.classList.add("age-scores__vict-req-inner-hex");
		victReqOuterHexOutline.appendChild(victReqInnerHexOutline);

		const victReqBaseRectangle: HTMLDivElement = document.createElement("div");
		victReqBaseRectangle.classList.add("age-scores__vict-req-base-rect");
		winTypeCardVictoryRequirementWrapper.appendChild(victReqBaseRectangle);

		const victReqBaseIconWrapper: HTMLDivElement = document.createElement("div");
		victReqBaseIconWrapper.classList.add("age-scores__vict-req-base-icon-wrapper");
		victReqBaseRectangle.appendChild(victReqBaseIconWrapper);

		const victReqBaseIcon: HTMLDivElement = document.createElement("div");
		victReqBaseIcon.classList.add("age-scores__vict-req-base-icon");
		victReqBaseIcon.style.backgroundImage = `url('${victoryData.victoryIcon}')`;
		victReqBaseRectangle.appendChild(victReqBaseIcon);

		const victReqBaseRectTextureOverlay: HTMLDivElement = document.createElement("div");
		victReqBaseRectTextureOverlay.classList.add("age-scores__vict-req-base-texture-overlay");
		victReqBaseRectangle.appendChild(victReqBaseRectTextureOverlay);

		const victReqBaseOrnamentTop: HTMLDivElement = document.createElement("div");
		victReqBaseOrnamentTop.classList.add("age-scores__vict-req-ornament-top");
		winTypeCardVictoryRequirementWrapper.appendChild(victReqBaseOrnamentTop);

		const victReqBaseOrnamentBottom: HTMLDivElement = document.createElement("div");
		victReqBaseOrnamentBottom.classList.add("age-scores__vict-req-ornament-bottom");
		winTypeCardVictoryRequirementWrapper.appendChild(victReqBaseOrnamentBottom);

		const victReqNumberValue: HTMLDivElement = document.createElement("div");
		victReqNumberValue.classList.add("age-scores__vict-req-number-value");
		victReqNumberValue.innerHTML = Locale.compose("LOC_AGE_SCORES_YOU", localPlayerVictoryPercent);
		winTypeCardVictoryRequirementWrapper.appendChild(victReqNumberValue);

		// Scores for the Top Three Players (2nd place first, 1st place in the middle, third place last --> like olympic medal stand)

		const winTypeCardTopThreeWrapper: HTMLDivElement = document.createElement("div");
		winTypeCardTopThreeWrapper.classList.add("age-scores__top-three-wrapper");
		winTypeCardContentWrapper.appendChild(winTypeCardTopThreeWrapper);

		// --- Second Place ---
		const secondPlacePlayerData: PlayerData = victoryData.playerData[1];
		if (secondPlacePlayerData) {
			winTypeCardTopThreeWrapper.appendChild(this.createSecondPlace(victoryData, secondPlacePlayerData));
		}

		// --- First Place ---
		const firstPlacePlayerData: PlayerData = victoryData.playerData[0];
		if (firstPlacePlayerData) {
			winTypeCardTopThreeWrapper.appendChild(this.createFirstPlace(victoryData, firstPlacePlayerData));
		}

		// --- Third Place ---
		const thirdPlacePlayerData: PlayerData = victoryData.playerData[2];
		if (thirdPlacePlayerData) {
			winTypeCardTopThreeWrapper.appendChild(this.createThirdPlace(victoryData, thirdPlacePlayerData));
		}

		// Scores for the Remaining Players

		const winTypeCardRemainderWrapper: HTMLDivElement = document.createElement("div");
		winTypeCardRemainderWrapper.classList.add("age-scores__remainder-wrapper");
		winTypeCardContentWrapper.appendChild(winTypeCardRemainderWrapper);

		const winTypeCardRemainderWrapperLineOne: HTMLDivElement = document.createElement("div");
		winTypeCardRemainderWrapperLineOne.classList.add("age-scores__remainder-wrapper-line");
		winTypeCardRemainderWrapper.appendChild(winTypeCardRemainderWrapperLineOne);


		victoryData.playerData.forEach((playerData: PlayerData, index: number) => {
			// Top 3 Players are already shown on the 'podium'
			if (index < 3) {
				return;
			}

			// Don't show more than the maximum runners up allowed
			if (index >= this.maximumPlacesToShow) {
				return;
			}

			winTypeCardRemainderWrapperLineOne.appendChild(this.createOtherPlace(victoryData, playerData));
		})
	}

	private createFirstPlace(victoryData: VictoryData, playerData: PlayerData): DocumentFragment {
		const fragment: DocumentFragment = document.createDocumentFragment();

		const placeWrapper: HTMLDivElement = document.createElement("div");
		placeWrapper.classList.add("age-scores__first-place-wrapper");
		placeWrapper.style.setProperty('--player-color-primary', playerData.primaryColor);
		placeWrapper.style.setProperty('--player-color-secondary', playerData.secondaryColor);
		fragment.appendChild(placeWrapper);

		const thermoEndcap: HTMLDivElement = document.createElement("div");
		thermoEndcap.classList.add("age-scores__first-thermo-end-cap");
		placeWrapper.appendChild(thermoEndcap);

		const thermoTrack: HTMLDivElement = document.createElement("div");
		thermoTrack.classList.add("age-scores__first-thermo-track");
		placeWrapper.appendChild(thermoTrack);

		const thermoFill: HTMLDivElement = document.createElement("div");
		thermoFill.classList.add("age-scores__first-thermo-fill");
		thermoFill.style.backgroundColor = playerData.primaryColor;
		placeWrapper.appendChild(thermoFill);

		const thermoValue: HTMLDivElement = document.createElement("div");
		thermoValue.classList.add("age-scores__first-thermo-value");
		thermoValue.innerHTML = playerData.score.toString();
		thermoFill.appendChild(thermoValue);

		const thermoIcon: HTMLDivElement = document.createElement("div");
		thermoIcon.classList.add("age-scores__first-thermo-icon");
		thermoIcon.style.backgroundImage = `url('${victoryData.victoryIcon}')`;
		thermoFill.appendChild(thermoIcon);

		const civIcon: HTMLDivElement = document.createElement("div");
		civIcon.classList.add("age-scores__first-civ-icon");
		civIcon.style.backgroundImage = `url('${playerData.civIcon}')`;
		thermoFill.appendChild(civIcon);

		const civHexWrapper: HTMLDivElement = document.createElement("div");
		civHexWrapper.classList.add("age-scores__first-civ-hex-wrapper");
		civHexWrapper.setAttribute("data-tooltip-content", playerData.leaderName);
		placeWrapper.appendChild(civHexWrapper);

		const civHexOutline: HTMLDivElement = document.createElement("div");
		civHexOutline.classList.add("age-scores__first-civ-hex-outline");
		civHexWrapper.appendChild(civHexOutline);

		const civHexInner: HTMLDivElement = document.createElement("div");
		civHexInner.classList.add("age-scores__first-civ-hex-inner");
		civHexOutline.appendChild(civHexInner);

		const leaderPortrait: HTMLDivElement = document.createElement("div");
		leaderPortrait.classList.add("age-scores__first-civ-leader");
		leaderPortrait.style.backgroundImage = `url('${playerData.leaderPortrait}')`
		civHexInner.appendChild(leaderPortrait);

		const placeLabel: HTMLDivElement = document.createElement("div");
		placeLabel.classList.add("age-scores__first-place-label");
		placeLabel.setAttribute('data-l10n-id', playerData.rankString);
		placeWrapper.appendChild(placeLabel);

		return fragment;
	}

	private createSecondPlace(victoryData: VictoryData, playerData: PlayerData): DocumentFragment {
		const fragment: DocumentFragment = document.createDocumentFragment();

		const placeWrapper: HTMLDivElement = document.createElement("div");
		placeWrapper.classList.add("age-scores__second-place-wrapper");
		placeWrapper.style.setProperty('--player-color-primary', playerData.primaryColor);
		placeWrapper.style.setProperty('--player-color-secondary', playerData.secondaryColor);
		fragment.appendChild(placeWrapper);

		const thermoEndcap: HTMLDivElement = document.createElement("div");
		thermoEndcap.classList.add("age-scores__second-thermo-end-cap");
		placeWrapper.appendChild(thermoEndcap);

		const thermoTrack: HTMLDivElement = document.createElement("div");
		thermoTrack.classList.add("age-scores__second-thermo-track");
		placeWrapper.appendChild(thermoTrack);

		const thermoFill: HTMLDivElement = document.createElement("div");
		thermoFill.classList.add("age-scores__second-thermo-fill");
		thermoFill.style.backgroundColor = playerData.primaryColor;
		placeWrapper.appendChild(thermoFill);

		const thermoValue: HTMLDivElement = document.createElement("div");
		thermoValue.classList.add("age-scores__second-thermo-value");
		thermoValue.innerHTML = playerData.score.toString();
		thermoFill.appendChild(thermoValue);

		const thermoIcon: HTMLDivElement = document.createElement("div");
		thermoIcon.classList.add("age-scores__second-thermo-icon");
		thermoIcon.style.backgroundImage = `url('${victoryData.victoryIcon}')`;
		thermoFill.appendChild(thermoIcon);

		const civIcon: HTMLDivElement = document.createElement("div");
		civIcon.classList.add("age-scores__second-civ-icon");
		civIcon.style.backgroundImage = `url('${playerData.civIcon}')`;
		civIcon.style.filter = `fxs-color-tint(${playerData.secondaryColor})`;
		thermoFill.appendChild(civIcon);

		const civHexWrapper: HTMLDivElement = document.createElement("div");
		civHexWrapper.classList.add("age-scores__second-civ-hex-wrapper");
		civHexWrapper.setAttribute("data-tooltip-content", playerData.leaderName);
		placeWrapper.appendChild(civHexWrapper);

		const civHexOutline: HTMLDivElement = document.createElement("div");
		civHexOutline.classList.add("age-scores__second-civ-hex-outline");
		civHexWrapper.appendChild(civHexOutline);

		const civHexInner: HTMLDivElement = document.createElement("div");
		civHexInner.classList.add("age-scores__second-civ-hex-inner");
		civHexOutline.appendChild(civHexInner);

		const leaderPortrait: HTMLDivElement = document.createElement("div");
		leaderPortrait.classList.add("age-scores__second-civ-leader");
		leaderPortrait.style.backgroundImage = `url('${playerData.leaderPortrait}')`
		civHexInner.appendChild(leaderPortrait);

		const placeLabel: HTMLDivElement = document.createElement("div");
		placeLabel.classList.add("age-scores__second-place-label");
		placeLabel.setAttribute('data-l10n-id', playerData.rankString);
		placeWrapper.appendChild(placeLabel);

		return fragment;
	}

	private createThirdPlace(victoryData: VictoryData, playerData: PlayerData): DocumentFragment {
		const fragment: DocumentFragment = document.createDocumentFragment();

		const placeWrapper: HTMLDivElement = document.createElement("div");
		placeWrapper.classList.add("age-scores__third-place-wrapper");
		placeWrapper.style.setProperty('--player-color-primary', playerData.primaryColor);
		placeWrapper.style.setProperty('--player-color-secondary', playerData.secondaryColor);
		fragment.appendChild(placeWrapper);

		const thermoEndcap: HTMLDivElement = document.createElement("div");
		thermoEndcap.classList.add("age-scores__third-thermo-end-cap");
		placeWrapper.appendChild(thermoEndcap);

		const thermoTrack: HTMLDivElement = document.createElement("div");
		thermoTrack.classList.add("age-scores__third-thermo-track");
		placeWrapper.appendChild(thermoTrack);

		const thermoFill: HTMLDivElement = document.createElement("div");
		thermoFill.classList.add("age-scores__third-thermo-fill");
		thermoFill.style.backgroundColor = playerData.primaryColor;
		placeWrapper.appendChild(thermoFill);

		const thermoValue: HTMLDivElement = document.createElement("div");
		thermoValue.classList.add("age-scores__third-thermo-value");
		thermoValue.innerHTML = playerData.score.toString();
		thermoFill.appendChild(thermoValue);

		const thermoIcon: HTMLDivElement = document.createElement("div");
		thermoIcon.classList.add("age-scores__third-thermo-icon");
		thermoIcon.style.backgroundImage = `url('${victoryData.victoryIcon}')`;
		thermoFill.appendChild(thermoIcon);

		const civIcon: HTMLDivElement = document.createElement("div");
		civIcon.classList.add("age-scores__third-civ-icon");
		civIcon.style.backgroundImage = `url('${playerData.civIcon}')`;
		civIcon.style.filter = `fxs-color-tint(${playerData.secondaryColor})`;
		thermoFill.appendChild(civIcon);

		const civHexWrapper: HTMLDivElement = document.createElement("div");
		civHexWrapper.classList.add("age-scores__third-civ-hex-wrapper");
		civHexWrapper.setAttribute("data-tooltip-content", playerData.leaderName);
		placeWrapper.appendChild(civHexWrapper);

		const civHexOutline: HTMLDivElement = document.createElement("div");
		civHexOutline.classList.add("age-scores__third-civ-hex-outline");
		civHexWrapper.appendChild(civHexOutline);

		const civHexInner: HTMLDivElement = document.createElement("div");
		civHexInner.classList.add("age-scores__third-civ-hex-inner");
		civHexOutline.appendChild(civHexInner);

		const leaderPortrait: HTMLDivElement = document.createElement("div");
		leaderPortrait.classList.add("age-scores__third-civ-leader");
		leaderPortrait.style.backgroundImage = `url('${playerData.leaderPortrait}')`
		civHexInner.appendChild(leaderPortrait);

		const placeLabel: HTMLDivElement = document.createElement("div");
		placeLabel.classList.add("age-scores__third-place-label");
		placeLabel.setAttribute('data-l10n-id', playerData.rankString);
		placeWrapper.appendChild(placeLabel);

		return fragment;
	}

	private createOtherPlace(victoryData: VictoryData, playerData: PlayerData): HTMLDivElement {
		const remainderProfileBackground: HTMLDivElement = document.createElement("div");
		remainderProfileBackground.classList.add("age-scores__remainder-profile-background");

		const remainderProfilePortraitBG: HTMLDivElement = document.createElement("div");
		remainderProfilePortraitBG.classList.add("age-scores__remainder-profile-portrait-bg");
		remainderProfilePortraitBG.style.setProperty('--player-color-primary', playerData.primaryColor);
		remainderProfilePortraitBG.style.setProperty('--player-color-secondary', playerData.secondaryColor);
		remainderProfileBackground.appendChild(remainderProfilePortraitBG);

		const remainderProfilePortraitFrame: HTMLDivElement = document.createElement("div");
		remainderProfilePortraitFrame.classList.add("age-scores__remainder-profile-portrait-frame");
		remainderProfilePortraitBG.appendChild(remainderProfilePortraitFrame);

		const remainderProfilePortraitLeaderImage: HTMLDivElement = document.createElement("div");
		remainderProfilePortraitLeaderImage.classList.add("age-scores__remainder-profile-portrait-leader-image");
		remainderProfilePortraitLeaderImage.style.backgroundImage = `url('${playerData.leaderPortrait}')`
		remainderProfilePortraitFrame.appendChild(remainderProfilePortraitLeaderImage);

		const remainderProfileLabel: HTMLDivElement = document.createElement("div");
		remainderProfileLabel.classList.add("age-scores__remainder-profile-label");
		remainderProfileLabel.setAttribute('data-l10n-id', playerData.rankString);
		remainderProfileBackground.appendChild(remainderProfileLabel);

		const remainderProfileScoreAndIconWrapper: HTMLDivElement = document.createElement("div");
		remainderProfileScoreAndIconWrapper.classList.add("age-scores__remainder-score-and-icon-wrapper");
		remainderProfileBackground.appendChild(remainderProfileScoreAndIconWrapper);

		const remainderProfileScore: HTMLDivElement = document.createElement("div");
		remainderProfileScore.classList.add("age-scores__remainder-score");
		remainderProfileScore.innerHTML = playerData.score.toString();
		remainderProfileScoreAndIconWrapper.appendChild(remainderProfileScore);

		const remainderProfileIcon: HTMLDivElement = document.createElement("div");
		remainderProfileIcon.classList.add("age-scores__remainder-icon");
		remainderProfileIcon.style.backgroundImage = `url('${victoryData.victoryIcon}')`;
		remainderProfileScoreAndIconWrapper.appendChild(remainderProfileIcon);

		return remainderProfileBackground;
	}
}

Controls.define('panel-age-scores', {
	createInstance: PanelAgeScores,
	description: 'Age Scores Panel.',
	styles: ['fs://game/base-standard/ui/age-scores/panel-age-scores.css'],
	content: ['fs://game/base-standard/ui/age-scores/panel-age-scores.html'],
	attributes: []
});