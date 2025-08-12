/**
 * @file screen-endgame.ts
 * @copyright 2023, Firaxis Games
 * @description Information to show at the end of a game.
 */

import { Audio } from '/core/ui/audio-base/audio-support.js';
import { ActiveDeviceTypeChangedEvent, ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { realizeCivHeraldry } from '/core/ui/utilities/utilities-color.js';
import ContextManager from '/core/ui/context-manager/context-manager.js'
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js'
import { EndResultsFinishedEventName } from '/base-standard/ui/end-results/end-results.js'
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import { IDisplayRequestBase, DisplayHandlerBase, DisplayHideOptions } from '/core/ui/context-manager/display-handler.js';
import { TabItem, TabSelectedEvent } from '/core/ui/components/fxs-tab-bar.js';
import { HidePlotTooltipEvent, ShowPlotTooltipEvent } from '/core/ui/tooltips/tooltip-manager.js'

enum TransitionState {
	Banner,
	Animation,
	EndResults,
	Summary
}

enum ContinueButtonType {
	ContinueGame,
	ExitToMainMenu,
	TransitionAge
}

class EndGameScreen extends Panel {

	private navContainer: HTMLElement | null = null;

	private engineInputListener: EventListener = this.onEngineInput.bind(this)
	private activeDeviceTypeListener: EventListener = this.onActiveDeviceTypeChanged.bind(this);

	private eventAnimationListener: EventListener = this.playNextAnimation.bind(this);
	private endResultsFinishedListener: EventListener = this.onEndResultsFinished.bind(this);

	private cinemaPanel: HTMLElement | null = null;

	private transitionState: TransitionState = TransitionState.Banner;
	private continueButtonType: ContinueButtonType = ContinueButtonType.ContinueGame;
	private tabBar: HTMLElement | null = null;
	private summarySlot: HTMLElement | null = null;
	private endGameTabs: TabItem[] = [
		{ label: 'LOC_VICTORY_PROGRESS_REWARDS', id: 'rewards' },
		{ label: 'LOC_END_GAME_OVERALL_SCORE', id: 'age-rankings' },
		{ label: 'LOC_END_GAME_AGE_SCORES', id: 'legacy-points' },
		// TODO uncomment when Graphs are working
		// { label: 'LOC_END_GAME_RANKINGS', id: 'graphs' },
	];
	private endGameTabsFinalAge: TabItem[] = [
		{ label: 'LOC_END_GAME_OVERALL_SCORE', id: 'age-rankings' },
		{ label: 'LOC_END_GAME_AGE_SCORES', id: 'legacy-points' },
		// TODO uncomment when Graphs are working
		// { label: 'LOC_END_GAME_RANKINGS', id: 'graphs' },
	];

	/** Cache whether the OMT button is allowed to avoid rechecking. */
	private oneMoreTurnAllowed = false;

	constructor(root: ComponentRoot) {
		super(root);
	}

	private buildBackgroundVignette(): HTMLElement {
		const bgContainer: HTMLElement = document.createElement('div');
		bgContainer.classList.add('age-ending__shading-container', 'absolute', 'inset-0');
		bgContainer.id = 'matte-anim-wrapper';

		bgContainer.innerHTML = `
			<div class="age-ending__painting-color-adjust absolute inset-0"></div>
			<div class="age-ending__painting-marble-overlay absolute inset-0"></div>
			<div class="age-ending__painting-bg-vignette absolute inset-0"></div>
			<div class="age-ending__painting-top-gradient"></div>
			<div class="age-ending__painting-bottom-gradient"></div>
		`;
		return bgContainer
	}

	/**
	 * Shows the summary screen for the end of the age.
	 * 
	 * @param container container to add the summary screen to.
	 * @param ageOver if the age is over or not.
	 * @param playerDefeat if/how the player was defeated
	 */
	private buildAgeEndTransitionSummaryScreen(playerDefeat: DefeatType): HTMLElement {
		const summaryFragment: DocumentFragment = document.createDocumentFragment();
		const mainContainer: HTMLElement = document.createElement('div');
		mainContainer.classList.add('age-summary__container', "absolute", "inset-0", "flex", "hidden");
		mainContainer.id = 'age-summary-container';

		// Matte Painting Shading

		const pastCivAnimColorAdjustment: HTMLDivElement = document.createElement("div");
		pastCivAnimColorAdjustment.classList.add("screen-endgame__painting-color-adjust");
		summaryFragment.appendChild(pastCivAnimColorAdjustment);

		const pastCivAnimMarbleOverlay: HTMLDivElement = document.createElement("div");
		pastCivAnimMarbleOverlay.classList.add("screen-endgame__painting-marble-overlay");
		summaryFragment.appendChild(pastCivAnimMarbleOverlay);

		const pastCivAnimVignette: HTMLDivElement = document.createElement("div");
		pastCivAnimVignette.classList.add("screen-endgame__painting-bg-vignette");
		summaryFragment.appendChild(pastCivAnimVignette);

		const pastCivAnimTopGradient: HTMLDivElement = document.createElement("div");
		pastCivAnimTopGradient.classList.add("screen-endgame__painting-top-gradient");
		summaryFragment.appendChild(pastCivAnimTopGradient);

		// Screen Title

		const titleWrapper: HTMLDivElement = document.createElement('div');
		titleWrapper.classList.add("screen-endgame__title-wrapper");
		summaryFragment.appendChild(titleWrapper);

		const gameSummaryTitleText: HTMLDivElement = document.createElement("div");
		gameSummaryTitleText.classList.add("screen-endgame__title-text", "font-title");
		gameSummaryTitleText.innerHTML = Locale.compose("LOC_END_GAME_OVERALL_SCORE");
		titleWrapper.appendChild(gameSummaryTitleText);

		const winTypeTitleHorizontalRule: HTMLDivElement = document.createElement("div");
		winTypeTitleHorizontalRule.classList.add("screen-endgame__title-horizontal-rule");
		titleWrapper.appendChild(winTypeTitleHorizontalRule);

		// Game Summary Main Panel

		const gameSummaryPanelWrapper = document.createElement("fxs-frame");
		gameSummaryPanelWrapper.classList.add("screen-endgame__panel-wrapper", 'size-full', 'absolute', 'flow-column', 'justify-center', 'items-center');
		summaryFragment.appendChild(gameSummaryPanelWrapper);

		const gameSummaryPanelContainer: HTMLDivElement = document.createElement("div");
		gameSummaryPanelContainer.classList.add("screen-endgame__panel-container", 'relative', 'h-full', 'max-w-full', 'min-w-full');
		gameSummaryPanelWrapper.appendChild(gameSummaryPanelContainer);

		const gameSummaryPanelBase: HTMLDivElement = document.createElement("div");
		gameSummaryPanelBase.classList.add('relative');
		gameSummaryPanelContainer.appendChild(gameSummaryPanelBase);

		// Game Summary Panel Buttons

		const gameSummaryPanelButtonContainer: HTMLDivElement = document.createElement("div");
		gameSummaryPanelButtonContainer.classList.add("screen-endgame__panel-button-container", 'absolute', 'right-0', 'bottom-0', 'flow-row');
		gameSummaryPanelContainer.appendChild(gameSummaryPanelButtonContainer);

		const gameSummaryPanelButtonContainerFrame: HTMLDivElement = document.createElement("div");
		gameSummaryPanelButtonContainerFrame.classList.add("screen-endgame__panel-button-container-frame");
		gameSummaryPanelButtonContainer.appendChild(gameSummaryPanelButtonContainerFrame);


		const movieType = this.chooseTransitionMovie();
		if (movieType) {
			const gameSummaryPanelReplayAnimationButtonWrapper: HTMLDivElement = document.createElement("div");
			gameSummaryPanelReplayAnimationButtonWrapper.classList.add("screen-endgame__panel-button-replay-anim-wrapper", 'mr-4');
			gameSummaryPanelButtonContainer.appendChild(gameSummaryPanelReplayAnimationButtonWrapper);

			const gameSummaryReplayAnimButton: HTMLElement = document.createElement("fxs-button");
			gameSummaryReplayAnimButton.setAttribute('caption', 'LOC_END_GAME_REPLAY');
			gameSummaryReplayAnimButton.setAttribute('action-key', "inline-shell-action-1");
			gameSummaryReplayAnimButton.addEventListener('action-activate', () => {
				this.replayAnimation();
				if (this.tabBar) {
					FocusManager.setFocus(this.tabBar);
				}
			});
			gameSummaryPanelReplayAnimationButtonWrapper.appendChild(gameSummaryReplayAnimButton);
		}

		const gameSummaryPanelOMTButtonWrapper: HTMLDivElement = document.createElement("div");
		gameSummaryPanelOMTButtonWrapper.classList.add("screen-endgame__panel-button-omt-wrapper", 'mr-4');
		gameSummaryPanelButtonContainer.appendChild(gameSummaryPanelOMTButtonWrapper);
		// Allow just one more turn if the player is alive and the config allows it.
		// NOTE: The player can be 'alive' AND defeated.  This happens w/ global defeats such as turn limit.
		this.oneMoreTurnAllowed = false;
		if (Players.isAlive(GameContext.localPlayerID)) {
			if (playerDefeat == DefeatTypes.NO_DEFEAT || GameInfo.Defeats.lookup(playerDefeat)?.AllowOneMoreTurn) {
				// Query GameCore as well.
				const args = {};
				const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.EXTEND_GAME, args, false);
				if (result.Success) {
					this.oneMoreTurnAllowed = true;
					const continueButton: HTMLElement = document.createElement('fxs-button');
					this.continueButtonType = ContinueButtonType.ContinueGame;
					continueButton.setAttribute('caption', 'LOC_END_GAME_CONTINUE');
					continueButton.setAttribute('action-key', "inline-shell-action-2");
					continueButton.addEventListener('action-activate', () => {
						this.justOneMoreTurn();
					});
					gameSummaryPanelOMTButtonWrapper.appendChild(continueButton);
				}
			}
		}

		const gameSummaryPanelContinueButtonWrapper: HTMLDivElement = document.createElement("div");
		gameSummaryPanelContinueButtonWrapper.classList.add("screen-endgame__panel-button-continue-wrapper");
		gameSummaryPanelButtonContainer.appendChild(gameSummaryPanelContinueButtonWrapper);

		const canTransition = Game.AgeProgressManager.canTransitionToNextAge(GameContext.localPlayerID);

		// Allow age transition if the player has not been defeated.
		if (canTransition) {
			this.continueButtonType = ContinueButtonType.TransitionAge;
			const gameSummaryContinueButton: HTMLElement = document.createElement("fxs-button");
			if (Network.isMetagamingAvailable()) {
				gameSummaryContinueButton.setAttribute('caption', 'LOC_END_GAME_LEGENDS');
			} else {
				gameSummaryContinueButton.setAttribute('caption', 'LOC_END_GAME_TRANSITION');
			}
			gameSummaryContinueButton.setAttribute('action-key', 'inline-sys-menu');
			gameSummaryContinueButton.addEventListener('action-activate', () => {
				this.transitionToNextAge();
			});
			gameSummaryPanelContinueButtonWrapper.appendChild(gameSummaryContinueButton);
		}
		else {
			this.continueButtonType = ContinueButtonType.ExitToMainMenu;
			const gameSummaryContinueButton: HTMLElement = document.createElement("fxs-button");
			if (Network.isMetagamingAvailable()) {
				gameSummaryContinueButton.setAttribute('caption', 'LOC_END_GAME_LEGENDS');
			} else {
				gameSummaryContinueButton.setAttribute('caption', 'LOC_END_GAME_EXIT');
			}
			gameSummaryContinueButton.setAttribute('action-key', 'inline-sys-menu');
			gameSummaryContinueButton.addEventListener('action-activate', () => {
				this.exitToMainMenu();
			});
			gameSummaryPanelContinueButtonWrapper.appendChild(gameSummaryContinueButton);
		}

		// Info Display Area
		this.tabBar = document.createElement('fxs-tab-bar');
		this.tabBar.classList.add('screen-endgame__tab-bar', 'self-center', 'w-full');
		this.tabBar.setAttribute("tab-items", JSON.stringify(Game.AgeProgressManager.isFinalAge ? this.endGameTabsFinalAge : this.endGameTabs));
		this.tabBar.setAttribute("tab-item-class", "px-5");
		this.tabBar.addEventListener("tab-selected", this.onGameSummaryTabBarSelected.bind(this));
		gameSummaryPanelBase.appendChild(this.tabBar);

		// Info Display Area
		this.summarySlot = document.createElement('fxs-slot-group');
		this.summarySlot.classList.add('summary-slot', 'flow-column', 'items-center', 'flex-auto', 'mx-10');
		gameSummaryPanelBase.appendChild(this.summarySlot);
		// rewards
		const gameSummaryRewards = document.createElement('panel-player-rewards');
		gameSummaryRewards.classList.add('mb-25', 'mt-10')
		gameSummaryRewards.id = "rewards";
		this.summarySlot.appendChild(gameSummaryRewards);
		// Age Rank
		const gameSummaryAgeRank = document.createElement('panel-age-rankings');
		gameSummaryAgeRank.classList.add('flex', 'justify-center', 'item-center', 'mt-10', 'mb-25');
		gameSummaryAgeRank.id = 'age-rankings'
		this.summarySlot.appendChild(gameSummaryAgeRank);
		// Legacy Points
		const gameSummaryLegacyPoints = document.createElement('panel-victory-points');
		gameSummaryLegacyPoints.classList.add('summary__legacy-points', 'flow-column', 'justify-start', 'w-full', 'mt-16', 'mb-25');
		gameSummaryLegacyPoints.id = 'legacy-points'
		this.summarySlot.appendChild(gameSummaryLegacyPoints);
		// Graphs
		const gameSummaryGraphs = document.createElement('panel-end-result-graphs');
		gameSummaryGraphs.classList.add('flow-column', 'justify-center', 'w-full', 'mt-10', 'mb-25');
		gameSummaryGraphs.id = 'graphs'
		this.summarySlot.appendChild(gameSummaryGraphs);

		mainContainer.appendChild(summaryFragment);

		return mainContainer
	}

	private onGameSummaryTabBarSelected(event: TabSelectedEvent) {
		const slotGroup = MustGetElement('.summary-slot', this.Root);
		slotGroup.setAttribute('selected-slot', event.detail.selectedItem.id);
	}

	private chooseTransitionMovie(): string | null {

		const localPlayer = GameContext.localPlayerID;
		if (localPlayer == PlayerIds.NO_PLAYER || localPlayer == PlayerIds.OBSERVER_ID) {
			return null;
		}

		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!player) {
			console.error(`screen-endgame: chooseTransitionMovie(): Failed to find PlayerLibrary for ${GameContext.localPlayerID}`);
			return null;
		}

		const ageDefinition: AgeDefinition | null = GameInfo.Ages.lookup(Game.age);
		if (!ageDefinition) {
			console.error('screen-endgame: current age definition lookup failed');
			return null;
		}

		const civilizationDefinition = GameInfo.Civilizations.lookup(player.civilizationType);
		if (!civilizationDefinition) {
			console.error(`screen-endgame: Could not find definition for player leader - ${player.civilizationType}.`);
			return null;
		}

		const leaderDefinition = GameInfo.Leaders.lookup(player.leaderType);
		if (!leaderDefinition) {
			console.error(`screen-endgame: Could not find definition for player leader - ${player.leaderType}.`);
			return null;
		}

		const ageType = ageDefinition.AgeType;
		const civilizationType = civilizationDefinition.CivilizationType;
		const leaderType = leaderDefinition.LeaderType;
		const firstPlaceVictories = new Set<string>();
		let firstFirstPlaceVictoryType: string | null = null;
		let defeatType: string | null = null;
		const playerDefeat = Game.VictoryManager.getLatestPlayerDefeat(localPlayer);
		if (playerDefeat != DefeatTypes.NO_DEFEAT) {
			const defeatDefinition = GameInfo.Defeats.lookup(playerDefeat);
			if (defeatDefinition) {
				defeatType = defeatDefinition.DefeatType;
			}
		}
		else {
			const victories: VictoryManagerLibrary_VictoryInfo[] = Game.VictoryManager.getVictories();
			for (const value of victories) {
				if (player.team != value.team) {
					// This victory was for a different team
					continue;
				}

				if (value.place != 1) {
					// Only consider victories you placed 1st in
					continue;
				}

				const victoryDefinition: VictoryDefinition | null = GameInfo.Victories.lookup(value.victory);
				if (!victoryDefinition) {
					console.error('screen-endgame: chooseTransitionMovie(): Failed to find victory definition!');
					continue;
				}

				if (!firstFirstPlaceVictoryType) {
					firstFirstPlaceVictoryType = victoryDefinition.VictoryType;
				}

				firstPlaceVictories.add(victoryDefinition.VictoryType);
			};
		}

		// Legacy Path related EGM data.
		const isFinalAge = Game.AgeProgressManager.isFinalAge;
		const completedLegacyPaths = new Set<string>();
		let lastCompletedLegacyPath = '';

		const playerCompletedLegacyPaths = player.LegacyPaths?.getCompletedLegacyPaths();
		if (playerCompletedLegacyPaths) {
			for (const path of playerCompletedLegacyPaths) {
				const legacyPath = GameInfo.LegacyPaths.lookup(path);
				if (legacyPath) {
					completedLegacyPaths.add(legacyPath.LegacyPathType);
					lastCompletedLegacyPath = legacyPath.LegacyPathType;
				}
			}
		}

		const gameUnlocks = Game.Unlocks;

		// Get initial set of valid movies.
		let endGameMovies = GameInfo.EndGameMovies.filter(egm => {
			if (egm.AgeType && egm.AgeType != ageType) {
				return false;
			}
			else if (egm.CivilizationType && egm.CivilizationType != civilizationType) {
				return false;
			}
			else if (egm.LeaderType && egm.LeaderType != leaderType) {
				return false;
			}
			else if (egm.DefeatType && egm.DefeatType != defeatType) {
				return false;
			}
			else if (egm.IsFinalAge != null && egm.IsFinalAge != isFinalAge) {
				return false;
			}
			else if (egm.CompletedLegacyPath != null && !completedLegacyPaths.has(egm.CompletedLegacyPath)) {
				return false;
			}
			else if (egm.LastCompletedLegacyPath != null && egm.LastCompletedLegacyPath != lastCompletedLegacyPath) {
				return false;
			}
			else if (egm.VictoryType && egm.VictoryType != firstFirstPlaceVictoryType) {
				return false;
			}
			else if (egm.VictoryType && !firstPlaceVictories.has(egm.VictoryType)) {
				return false;
			}
			else if (egm.UnlockType && gameUnlocks.isUnlockedForPlayer(egm.UnlockType, localPlayer)) {
				return false;
			}
			else {
				return true;
			}
		});

		if (endGameMovies.length == 0) {
			console.debug("No end-game movies meet the necessary criteria.");
			return null;
		}

		// Sort desc by priority!
		endGameMovies.sort((a: EndGameMovieDefinition, b: EndGameMovieDefinition) => {
			return b.Priority - a.Priority;
		})


		// Now that we've filtered and sorted the list.  Grab the first one and send it!
		const movieToShow = endGameMovies[0];
		if (movieToShow) {
			console.debug("Picking the first end-game movie in the following list:");
			for (const movie of endGameMovies) {
				console.debug(` * ${movie.MovieType}`);
			}

			return movieToShow.MovieType;
		}
		else {
			return null;
		}
	}

	private playNextAnimation(event: AnimationEvent) {
		switch (event.animationName) {
			case "age-ending-end-part-1":
				this.playTransitionPart1();
				break
		}
	}

	private replayAnimation() {
		const movieName = this.chooseTransitionMovie();
		if (movieName) {
			this.transitionState = TransitionState.Animation;
			const summaryContainer: HTMLElement | null = this.Root.querySelector('#age-summary-container');
			summaryContainer?.classList.remove('age-summary_container--active');
			summaryContainer?.classList.add('hidden');
			const ageEndingContainer: HTMLElement | null = this.Root.querySelector('#age-ending-container');
			ageEndingContainer?.classList.remove('age-ending__container--fade-in-vignette');

			if (this.cinemaPanel) {
				this.cinemaPanel.style.display = '';

				// TODO - Find better mechanism to control start, stop, restart.
				this.cinemaPanel.setAttribute('data-movie-id', '')
				this.cinemaPanel.setAttribute('data-movie-id', movieName);
			}
		}
	}

	private justOneMoreTurn() {
		if (this.oneMoreTurnAllowed) {
			const args = {};
			const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.EXTEND_GAME, args, false);
			if (result.Success) {
				Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.EXTEND_GAME, args);
				DisplayQueueManager.closeMatching(EndGameScreenCategory);
			}
		}
	}

	private playTransitionPart1() {
		const ageEndingPanel: HTMLElement | null = this.Root.querySelector("#age-ending-panel");

		ageEndingPanel?.classList.add("age-ending__panel--fade-out-banner");
		ageEndingPanel?.classList.add("age-ending__panel--fade-out");
		this.transitionState = TransitionState.Banner;
	}

	private onBannerFadedOut() {

		const el = this.Root.querySelector('age-transition-banner');
		if (el) {
			el.remove();
		}

		if (this.cinemaPanel) {
			const movieName = this.chooseTransitionMovie();
			if (movieName && !Game.AgeProgressManager.isExtendedGame) {
				this.cinemaPanel.style.display = '';
				this.cinemaPanel.setAttribute('data-movie-id', movieName);
			}
			else {
				this.showEndResultsScreen();
			}
		}
		else {
			this.showEndResultsScreen();
		}
	}

	private onMovieEnded() {
		if (this.cinemaPanel) {
			this.cinemaPanel.style.display = 'none';
		}

		this.showEndResultsScreen();
	}

	private showEndResultsScreen() {
		const localPlayerId = GameContext.localPlayerID;
		const canTransition = Game.AgeProgressManager.canTransitionToNextAge(localPlayerId);

		if (canTransition) {
			this.showEndGameScreen();
			return;
		}
		else {
			ContextManager.push("screen-end-results", { singleton: true, createMouseGuard: true });
			this.transitionState = TransitionState.EndResults;
		}
	}

	private onEndResultsFinished() {
		this.showEndGameScreen();
	}

	private showEndGameScreen() {
		const summaryContainer: HTMLElement | null = this.Root.querySelector('#age-summary-container');
		const ageEndingContainer: HTMLElement | null = this.Root.querySelector("#age-ending-container");

		ageEndingContainer?.classList.add('age-ending__container--fade-in-vignette');
		summaryContainer?.classList.add('age-summary_container--active');
		summaryContainer?.classList.remove('hidden');

		UI.sendAudioEvent('age-end-summary');
		Audio.playSound("data-audio-stop-banner-sound", "age-transition");

		if (this.summarySlot) {
			FocusManager.setFocus(this.summarySlot);
		}
		this.transitionState = TransitionState.Summary;
	}

	onAttach() {
		super.onAttach();
		window.dispatchEvent(new HidePlotTooltipEvent());
		InterfaceMode.switchToDefault();
		if (Autoplay.isActive && !Game.AgeProgressManager.isFinalAge) {
			this.transitionToNextAge();
		}
		const playerDefeat: DefeatType = Game.VictoryManager.getLatestPlayerDefeat(GameContext.localPlayerID);

		this.Root.addEventListener('engine-input', this.engineInputListener);

		const fragment = document.createDocumentFragment();

		const contentContainer: HTMLElement = document.createElement('div');
		contentContainer.classList.add('flex', 'flow-column', "flex", "flex-auto");

		realizeCivHeraldry(this.Root, GameContext.localPlayerID);
		const ageEndingContainer: HTMLElement = document.createElement('div');
		ageEndingContainer.id = 'age-ending-container';
		{
			ageEndingContainer.classList.add('age-ending__container');

			const bgContainer: HTMLElement = this.buildBackgroundVignette();
			ageEndingContainer.appendChild(bgContainer);

			this.cinemaPanel = document.createElement("fxs-movie");
			this.cinemaPanel.classList.add('absolute', 'inset-0');
			this.cinemaPanel.style.display = 'none';
			this.cinemaPanel.addEventListener('movie-ended', this.onMovieEnded.bind(this));
			ageEndingContainer.appendChild(this.cinemaPanel);

			const agePanel: HTMLElement = document.createElement('age-transition-banner');
			agePanel.classList.add('age-ending__panel--pause-animations');
			ageEndingContainer.appendChild(agePanel);

			agePanel.addEventListener('age-transition-banner-faded-out', () => {
				this.onBannerFadedOut();
			});
		}
		contentContainer.appendChild(ageEndingContainer);

		const summaryContainer: HTMLElement = this.buildAgeEndTransitionSummaryScreen(playerDefeat);
		contentContainer.appendChild(summaryContainer);

		this.Root.addEventListener("animationend", this.eventAnimationListener);

		fragment.appendChild(contentContainer);
		this.Root.appendChild(fragment);

		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		window.addEventListener(EndResultsFinishedEventName, this.endResultsFinishedListener);

		// If in autotest we don't want to be stuck on this screen
		if (ContextManager.noUserInput()) {
			this.exitToMainMenu();
		}
	}

	private transitionToNextAge() {
		if (Network.isConnectedToSSO() && !Autoplay.isActive) {
			ContextManager.push('screen-legends-report', { createMouseGuard: true, singleton: true });
		} else {
			engine.call('transitionToNextAge');
		}
	}

	private exitToMainMenu() {
		if (Network.isConnectedToSSO()) {
			ContextManager.push('screen-legends-report', { createMouseGuard: true, singleton: true });
		} else {
			UI.sendAudioEvent(Audio.getSoundTag('data-audio-age-end-closed'));
			engine.call('exitToMainMenu');
		}
	}

	onDetach() {
		this.Root.removeEventListener('engine-input', this.engineInputListener);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		window.removeEventListener(EndResultsFinishedEventName, this.endResultsFinishedListener);
		this.Root.removeEventListener("animationend", this.eventAnimationListener);
		if (this.tabBar) {
			this.tabBar.removeEventListener("tab-selected", this.onGameSummaryTabBarSelected.bind(this));
		}
		// TODO detach tab bar
		super.onDetach();

		window.dispatchEvent(new ShowPlotTooltipEvent());
	}

	onReceiveFocus() {
		super.onReceiveFocus();
		NavTray.clear();
		if (this.tabBar) {
			FocusManager.setFocus(this.tabBar);
		}
	}

	onLoseFocus() {
		super.onLoseFocus();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		switch (inputEvent.detail.name) {
			case 'accept':
			case 'cancel':
			case 'keyboard-escape':
				if (this.transitionState == TransitionState.Animation || this.transitionState == TransitionState.Banner) {
					const el = this.Root.querySelector('age-transition-banner');
					if (el) {
						el.remove();
					}

					if (this.cinemaPanel) {
						this.cinemaPanel.setAttribute('data-movie-id', '')
					}
					this.showEndResultsScreen();
					inputEvent.stopPropagation();
					inputEvent.preventDefault();
				}
				break;
			case 'sys-menu':
				if (this.transitionState == TransitionState.Summary) {

					switch (this.continueButtonType) {
						case ContinueButtonType.ContinueGame:
							DisplayQueueManager.closeMatching(EndGameScreenCategory);
							break;
						case ContinueButtonType.ExitToMainMenu:
							this.exitToMainMenu();
							break;
						case ContinueButtonType.TransitionAge:
							this.transitionToNextAge();
							break;
					}
				}
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				break;
			case 'shell-action-1':
				if (this.transitionState == TransitionState.Summary) {
					this.replayAnimation();
				}
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				break;
			case 'shell-action-2':
				if (this.oneMoreTurnAllowed) {
					if (this.transitionState == TransitionState.Summary) {
						this.justOneMoreTurn();
					}
					inputEvent.stopPropagation();
					inputEvent.preventDefault();
				}
				break;
			case "shell-action-3":
				const slotGroup = MustGetElement('.summary-slot', this.Root);
				const currentTab = slotGroup.getAttribute('selected-slot');
				if (currentTab && currentTab == 'graphs') {
					const dropdown = this.Root.querySelector(".graph-dropdown");
					if (dropdown) {
						dropdown.dispatchEvent(new CustomEvent("action-activate"));
					}
					inputEvent.stopPropagation();
					inputEvent.preventDefault();
				}
				break
		}
	}

	private onActiveDeviceTypeChanged(event: ActiveDeviceTypeChangedEvent) {
		this.navContainer?.classList.toggle('hidden', event.detail.gamepadActive);
	}
}


const EndGameScreenCategory = 'EndgameScreen' as const

class EndGameScreenManager extends DisplayHandlerBase {

	endGameScreenElement: HTMLElement | null = null;

	/** Track if we've already shown the end game screen to prevent redundant calls from edge cases
	 *  For Example: Player gets defeated in MP but then the Age Ends for other players before they've transitioned out of the game
	 */
	hasShownEndGameScreen: boolean = false;

	constructor() {
		super(EndGameScreenCategory, 4000);
	}

	public show(_request: IDisplayRequestBase) {
		if (this.hasShownEndGameScreen == true) {
			console.warn("screen-endgame: Attempted to push 'screen-endgame' element after it's already been pushed once");
			return;
		}

		// Make sure no other screens are open
		ContextManager.clear();
		// this might have to end up being more fancy if we want to hide this then show it again and continue from the same spot
		this.endGameScreenElement ??= ContextManager.push("screen-endgame", { singleton: true, createMouseGuard: true, attributes: { shouldDarken: false } });
		this.hasShownEndGameScreen = true;
	}

	public hide(_request: IDisplayRequestBase, _options: DisplayHideOptions) {
		ContextManager.pop("screen-endgame");
		this.endGameScreenElement = null;
		this.hasShownEndGameScreen = false;			// clear, so we can re-show if one-more-turn is pressed.
	}
}

Controls.define('screen-endgame', {
	createInstance: EndGameScreen,
	description: 'End-game sequence',
	classNames: ['fullscreen', 'flex', 'flow-column', 'justify-end', 'items-stretch', 'pointer-events-auto'],
	styles: ["fs://game/base-standard/ui/endgame/screen-endgame.css"],
});

const EndGameScreenManagerInstance = new EndGameScreenManager();
export { EndGameScreenManagerInstance as default, EndGameScreenCategory }

DisplayQueueManager.registerHandler(EndGameScreenManagerInstance);
