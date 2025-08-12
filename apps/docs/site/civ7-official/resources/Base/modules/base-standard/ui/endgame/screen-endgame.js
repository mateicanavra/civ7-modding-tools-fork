/**
 * @file screen-endgame.ts
 * @copyright 2023, Firaxis Games
 * @description Information to show at the end of a game.
 */
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { realizeCivHeraldry } from '/core/ui/utilities/utilities-color.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { EndResultsFinishedEventName } from '/base-standard/ui/end-results/end-results.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import { DisplayHandlerBase } from '/core/ui/context-manager/display-handler.js';
import { HidePlotTooltipEvent, ShowPlotTooltipEvent } from '/core/ui/tooltips/tooltip-manager.js';
var TransitionState;
(function (TransitionState) {
    TransitionState[TransitionState["Banner"] = 0] = "Banner";
    TransitionState[TransitionState["Animation"] = 1] = "Animation";
    TransitionState[TransitionState["EndResults"] = 2] = "EndResults";
    TransitionState[TransitionState["Summary"] = 3] = "Summary";
})(TransitionState || (TransitionState = {}));
var ContinueButtonType;
(function (ContinueButtonType) {
    ContinueButtonType[ContinueButtonType["ContinueGame"] = 0] = "ContinueGame";
    ContinueButtonType[ContinueButtonType["ExitToMainMenu"] = 1] = "ExitToMainMenu";
    ContinueButtonType[ContinueButtonType["TransitionAge"] = 2] = "TransitionAge";
})(ContinueButtonType || (ContinueButtonType = {}));
class EndGameScreen extends Panel {
    constructor(root) {
        super(root);
        this.navContainer = null;
        this.engineInputListener = this.onEngineInput.bind(this);
        this.activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);
        this.eventAnimationListener = this.playNextAnimation.bind(this);
        this.endResultsFinishedListener = this.onEndResultsFinished.bind(this);
        this.cinemaPanel = null;
        this.transitionState = TransitionState.Banner;
        this.continueButtonType = ContinueButtonType.ContinueGame;
        this.tabBar = null;
        this.summarySlot = null;
        this.endGameTabs = [
            { label: 'LOC_VICTORY_PROGRESS_REWARDS', id: 'rewards' },
            { label: 'LOC_END_GAME_OVERALL_SCORE', id: 'age-rankings' },
            { label: 'LOC_END_GAME_AGE_SCORES', id: 'legacy-points' },
            // TODO uncomment when Graphs are working
            // { label: 'LOC_END_GAME_RANKINGS', id: 'graphs' },
        ];
        this.endGameTabsFinalAge = [
            { label: 'LOC_END_GAME_OVERALL_SCORE', id: 'age-rankings' },
            { label: 'LOC_END_GAME_AGE_SCORES', id: 'legacy-points' },
            // TODO uncomment when Graphs are working
            // { label: 'LOC_END_GAME_RANKINGS', id: 'graphs' },
        ];
        /** Cache whether the OMT button is allowed to avoid rechecking. */
        this.oneMoreTurnAllowed = false;
    }
    buildBackgroundVignette() {
        const bgContainer = document.createElement('div');
        bgContainer.classList.add('age-ending__shading-container', 'absolute', 'inset-0');
        bgContainer.id = 'matte-anim-wrapper';
        bgContainer.innerHTML = `
			<div class="age-ending__painting-color-adjust absolute inset-0"></div>
			<div class="age-ending__painting-marble-overlay absolute inset-0"></div>
			<div class="age-ending__painting-bg-vignette absolute inset-0"></div>
			<div class="age-ending__painting-top-gradient"></div>
			<div class="age-ending__painting-bottom-gradient"></div>
		`;
        return bgContainer;
    }
    /**
     * Shows the summary screen for the end of the age.
     *
     * @param container container to add the summary screen to.
     * @param ageOver if the age is over or not.
     * @param playerDefeat if/how the player was defeated
     */
    buildAgeEndTransitionSummaryScreen(playerDefeat) {
        const summaryFragment = document.createDocumentFragment();
        const mainContainer = document.createElement('div');
        mainContainer.classList.add('age-summary__container', "absolute", "inset-0", "flex", "hidden");
        mainContainer.id = 'age-summary-container';
        // Matte Painting Shading
        const pastCivAnimColorAdjustment = document.createElement("div");
        pastCivAnimColorAdjustment.classList.add("screen-endgame__painting-color-adjust");
        summaryFragment.appendChild(pastCivAnimColorAdjustment);
        const pastCivAnimMarbleOverlay = document.createElement("div");
        pastCivAnimMarbleOverlay.classList.add("screen-endgame__painting-marble-overlay");
        summaryFragment.appendChild(pastCivAnimMarbleOverlay);
        const pastCivAnimVignette = document.createElement("div");
        pastCivAnimVignette.classList.add("screen-endgame__painting-bg-vignette");
        summaryFragment.appendChild(pastCivAnimVignette);
        const pastCivAnimTopGradient = document.createElement("div");
        pastCivAnimTopGradient.classList.add("screen-endgame__painting-top-gradient");
        summaryFragment.appendChild(pastCivAnimTopGradient);
        // Screen Title
        const titleWrapper = document.createElement('div');
        titleWrapper.classList.add("screen-endgame__title-wrapper");
        summaryFragment.appendChild(titleWrapper);
        const gameSummaryTitleText = document.createElement("div");
        gameSummaryTitleText.classList.add("screen-endgame__title-text", "font-title");
        gameSummaryTitleText.innerHTML = Locale.compose("LOC_END_GAME_OVERALL_SCORE");
        titleWrapper.appendChild(gameSummaryTitleText);
        const winTypeTitleHorizontalRule = document.createElement("div");
        winTypeTitleHorizontalRule.classList.add("screen-endgame__title-horizontal-rule");
        titleWrapper.appendChild(winTypeTitleHorizontalRule);
        // Game Summary Main Panel
        const gameSummaryPanelWrapper = document.createElement("fxs-frame");
        gameSummaryPanelWrapper.classList.add("screen-endgame__panel-wrapper", 'size-full', 'absolute', 'flow-column', 'justify-center', 'items-center');
        summaryFragment.appendChild(gameSummaryPanelWrapper);
        const gameSummaryPanelContainer = document.createElement("div");
        gameSummaryPanelContainer.classList.add("screen-endgame__panel-container", 'relative', 'h-full', 'max-w-full', 'min-w-full');
        gameSummaryPanelWrapper.appendChild(gameSummaryPanelContainer);
        const gameSummaryPanelBase = document.createElement("div");
        gameSummaryPanelBase.classList.add('relative');
        gameSummaryPanelContainer.appendChild(gameSummaryPanelBase);
        // Game Summary Panel Buttons
        const gameSummaryPanelButtonContainer = document.createElement("div");
        gameSummaryPanelButtonContainer.classList.add("screen-endgame__panel-button-container", 'absolute', 'right-0', 'bottom-0', 'flow-row');
        gameSummaryPanelContainer.appendChild(gameSummaryPanelButtonContainer);
        const gameSummaryPanelButtonContainerFrame = document.createElement("div");
        gameSummaryPanelButtonContainerFrame.classList.add("screen-endgame__panel-button-container-frame");
        gameSummaryPanelButtonContainer.appendChild(gameSummaryPanelButtonContainerFrame);
        const movieType = this.chooseTransitionMovie();
        if (movieType) {
            const gameSummaryPanelReplayAnimationButtonWrapper = document.createElement("div");
            gameSummaryPanelReplayAnimationButtonWrapper.classList.add("screen-endgame__panel-button-replay-anim-wrapper", 'mr-4');
            gameSummaryPanelButtonContainer.appendChild(gameSummaryPanelReplayAnimationButtonWrapper);
            const gameSummaryReplayAnimButton = document.createElement("fxs-button");
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
        const gameSummaryPanelOMTButtonWrapper = document.createElement("div");
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
                    const continueButton = document.createElement('fxs-button');
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
        const gameSummaryPanelContinueButtonWrapper = document.createElement("div");
        gameSummaryPanelContinueButtonWrapper.classList.add("screen-endgame__panel-button-continue-wrapper");
        gameSummaryPanelButtonContainer.appendChild(gameSummaryPanelContinueButtonWrapper);
        const canTransition = Game.AgeProgressManager.canTransitionToNextAge(GameContext.localPlayerID);
        // Allow age transition if the player has not been defeated.
        if (canTransition) {
            this.continueButtonType = ContinueButtonType.TransitionAge;
            const gameSummaryContinueButton = document.createElement("fxs-button");
            if (Network.isMetagamingAvailable()) {
                gameSummaryContinueButton.setAttribute('caption', 'LOC_END_GAME_LEGENDS');
            }
            else {
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
            const gameSummaryContinueButton = document.createElement("fxs-button");
            if (Network.isMetagamingAvailable()) {
                gameSummaryContinueButton.setAttribute('caption', 'LOC_END_GAME_LEGENDS');
            }
            else {
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
        gameSummaryRewards.classList.add('mb-25', 'mt-10');
        gameSummaryRewards.id = "rewards";
        this.summarySlot.appendChild(gameSummaryRewards);
        // Age Rank
        const gameSummaryAgeRank = document.createElement('panel-age-rankings');
        gameSummaryAgeRank.classList.add('flex', 'justify-center', 'item-center', 'mt-10', 'mb-25');
        gameSummaryAgeRank.id = 'age-rankings';
        this.summarySlot.appendChild(gameSummaryAgeRank);
        // Legacy Points
        const gameSummaryLegacyPoints = document.createElement('panel-victory-points');
        gameSummaryLegacyPoints.classList.add('summary__legacy-points', 'flow-column', 'justify-start', 'w-full', 'mt-16', 'mb-25');
        gameSummaryLegacyPoints.id = 'legacy-points';
        this.summarySlot.appendChild(gameSummaryLegacyPoints);
        // Graphs
        const gameSummaryGraphs = document.createElement('panel-end-result-graphs');
        gameSummaryGraphs.classList.add('flow-column', 'justify-center', 'w-full', 'mt-10', 'mb-25');
        gameSummaryGraphs.id = 'graphs';
        this.summarySlot.appendChild(gameSummaryGraphs);
        mainContainer.appendChild(summaryFragment);
        return mainContainer;
    }
    onGameSummaryTabBarSelected(event) {
        const slotGroup = MustGetElement('.summary-slot', this.Root);
        slotGroup.setAttribute('selected-slot', event.detail.selectedItem.id);
    }
    chooseTransitionMovie() {
        const localPlayer = GameContext.localPlayerID;
        if (localPlayer == PlayerIds.NO_PLAYER || localPlayer == PlayerIds.OBSERVER_ID) {
            return null;
        }
        const player = Players.get(GameContext.localPlayerID);
        if (!player) {
            console.error(`screen-endgame: chooseTransitionMovie(): Failed to find PlayerLibrary for ${GameContext.localPlayerID}`);
            return null;
        }
        const ageDefinition = GameInfo.Ages.lookup(Game.age);
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
        const firstPlaceVictories = new Set();
        let firstFirstPlaceVictoryType = null;
        let defeatType = null;
        const playerDefeat = Game.VictoryManager.getLatestPlayerDefeat(localPlayer);
        if (playerDefeat != DefeatTypes.NO_DEFEAT) {
            const defeatDefinition = GameInfo.Defeats.lookup(playerDefeat);
            if (defeatDefinition) {
                defeatType = defeatDefinition.DefeatType;
            }
        }
        else {
            const victories = Game.VictoryManager.getVictories();
            for (const value of victories) {
                if (player.team != value.team) {
                    // This victory was for a different team
                    continue;
                }
                if (value.place != 1) {
                    // Only consider victories you placed 1st in
                    continue;
                }
                const victoryDefinition = GameInfo.Victories.lookup(value.victory);
                if (!victoryDefinition) {
                    console.error('screen-endgame: chooseTransitionMovie(): Failed to find victory definition!');
                    continue;
                }
                if (!firstFirstPlaceVictoryType) {
                    firstFirstPlaceVictoryType = victoryDefinition.VictoryType;
                }
                firstPlaceVictories.add(victoryDefinition.VictoryType);
            }
            ;
        }
        // Legacy Path related EGM data.
        const isFinalAge = Game.AgeProgressManager.isFinalAge;
        const completedLegacyPaths = new Set();
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
        endGameMovies.sort((a, b) => {
            return b.Priority - a.Priority;
        });
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
    playNextAnimation(event) {
        switch (event.animationName) {
            case "age-ending-end-part-1":
                this.playTransitionPart1();
                break;
        }
    }
    replayAnimation() {
        const movieName = this.chooseTransitionMovie();
        if (movieName) {
            this.transitionState = TransitionState.Animation;
            const summaryContainer = this.Root.querySelector('#age-summary-container');
            summaryContainer?.classList.remove('age-summary_container--active');
            summaryContainer?.classList.add('hidden');
            const ageEndingContainer = this.Root.querySelector('#age-ending-container');
            ageEndingContainer?.classList.remove('age-ending__container--fade-in-vignette');
            if (this.cinemaPanel) {
                this.cinemaPanel.style.display = '';
                // TODO - Find better mechanism to control start, stop, restart.
                this.cinemaPanel.setAttribute('data-movie-id', '');
                this.cinemaPanel.setAttribute('data-movie-id', movieName);
            }
        }
    }
    justOneMoreTurn() {
        if (this.oneMoreTurnAllowed) {
            const args = {};
            const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.EXTEND_GAME, args, false);
            if (result.Success) {
                Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.EXTEND_GAME, args);
                DisplayQueueManager.closeMatching(EndGameScreenCategory);
            }
        }
    }
    playTransitionPart1() {
        const ageEndingPanel = this.Root.querySelector("#age-ending-panel");
        ageEndingPanel?.classList.add("age-ending__panel--fade-out-banner");
        ageEndingPanel?.classList.add("age-ending__panel--fade-out");
        this.transitionState = TransitionState.Banner;
    }
    onBannerFadedOut() {
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
    onMovieEnded() {
        if (this.cinemaPanel) {
            this.cinemaPanel.style.display = 'none';
        }
        this.showEndResultsScreen();
    }
    showEndResultsScreen() {
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
    onEndResultsFinished() {
        this.showEndGameScreen();
    }
    showEndGameScreen() {
        const summaryContainer = this.Root.querySelector('#age-summary-container');
        const ageEndingContainer = this.Root.querySelector("#age-ending-container");
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
        const playerDefeat = Game.VictoryManager.getLatestPlayerDefeat(GameContext.localPlayerID);
        this.Root.addEventListener('engine-input', this.engineInputListener);
        const fragment = document.createDocumentFragment();
        const contentContainer = document.createElement('div');
        contentContainer.classList.add('flex', 'flow-column', "flex", "flex-auto");
        realizeCivHeraldry(this.Root, GameContext.localPlayerID);
        const ageEndingContainer = document.createElement('div');
        ageEndingContainer.id = 'age-ending-container';
        {
            ageEndingContainer.classList.add('age-ending__container');
            const bgContainer = this.buildBackgroundVignette();
            ageEndingContainer.appendChild(bgContainer);
            this.cinemaPanel = document.createElement("fxs-movie");
            this.cinemaPanel.classList.add('absolute', 'inset-0');
            this.cinemaPanel.style.display = 'none';
            this.cinemaPanel.addEventListener('movie-ended', this.onMovieEnded.bind(this));
            ageEndingContainer.appendChild(this.cinemaPanel);
            const agePanel = document.createElement('age-transition-banner');
            agePanel.classList.add('age-ending__panel--pause-animations');
            ageEndingContainer.appendChild(agePanel);
            agePanel.addEventListener('age-transition-banner-faded-out', () => {
                this.onBannerFadedOut();
            });
        }
        contentContainer.appendChild(ageEndingContainer);
        const summaryContainer = this.buildAgeEndTransitionSummaryScreen(playerDefeat);
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
    transitionToNextAge() {
        if (Network.isConnectedToSSO() && !Autoplay.isActive) {
            ContextManager.push('screen-legends-report', { createMouseGuard: true, singleton: true });
        }
        else {
            engine.call('transitionToNextAge');
        }
    }
    exitToMainMenu() {
        if (Network.isConnectedToSSO()) {
            ContextManager.push('screen-legends-report', { createMouseGuard: true, singleton: true });
        }
        else {
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
    onEngineInput(inputEvent) {
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
                        this.cinemaPanel.setAttribute('data-movie-id', '');
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
                break;
        }
    }
    onActiveDeviceTypeChanged(event) {
        this.navContainer?.classList.toggle('hidden', event.detail.gamepadActive);
    }
}
const EndGameScreenCategory = 'EndgameScreen';
class EndGameScreenManager extends DisplayHandlerBase {
    constructor() {
        super(EndGameScreenCategory, 4000);
        this.endGameScreenElement = null;
        /** Track if we've already shown the end game screen to prevent redundant calls from edge cases
         *  For Example: Player gets defeated in MP but then the Age Ends for other players before they've transitioned out of the game
         */
        this.hasShownEndGameScreen = false;
    }
    show(_request) {
        if (this.hasShownEndGameScreen == true) {
            console.warn("screen-endgame: Attempted to push 'screen-endgame' element after it's already been pushed once");
            return;
        }
        // Make sure no other screens are open
        ContextManager.clear();
        // this might have to end up being more fancy if we want to hide this then show it again and continue from the same spot
        this.endGameScreenElement ?? (this.endGameScreenElement = ContextManager.push("screen-endgame", { singleton: true, createMouseGuard: true, attributes: { shouldDarken: false } }));
        this.hasShownEndGameScreen = true;
    }
    hide(_request, _options) {
        ContextManager.pop("screen-endgame");
        this.endGameScreenElement = null;
        this.hasShownEndGameScreen = false; // clear, so we can re-show if one-more-turn is pressed.
    }
}
Controls.define('screen-endgame', {
    createInstance: EndGameScreen,
    description: 'End-game sequence',
    classNames: ['fullscreen', 'flex', 'flow-column', 'justify-end', 'items-stretch', 'pointer-events-auto'],
    styles: ["fs://game/base-standard/ui/endgame/screen-endgame.css"],
});
const EndGameScreenManagerInstance = new EndGameScreenManager();
export { EndGameScreenManagerInstance as default, EndGameScreenCategory };
DisplayQueueManager.registerHandler(EndGameScreenManagerInstance);

//# sourceMappingURL=file:///base-standard/ui/endgame/screen-endgame.js.map
