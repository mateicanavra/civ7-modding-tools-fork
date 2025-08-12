/**
 * @file end-results.ts
 * @copyright 2024, Firaxis Games
 * @description Displays the game results for age progression
 */
export const EndResultsFinishedEventName = 'end-results-finished';
export class EndResultsFinishedEvent extends CustomEvent {
    constructor() {
        super(EndResultsFinishedEventName, { bubbles: false, cancelable: true });
    }
}
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { realizePlayerColors } from '/core/ui/utilities/utilities-color.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import Panel from '/core/ui/panel-support.js';
import EndGame from '/base-standard/ui/endgame/model-endgame.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
class EndResultsScreen extends Panel {
    constructor() {
        super(...arguments);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.continueButton = null;
    }
    onAttach() {
        super.onAttach();
        realizePlayerColors(this.Root, GameContext.localPlayerID);
        this.Root.classList.add("screen-end-results", "flex", "w-full", "h-full", "absolute");
        const player = Players.get(GameContext.localPlayerID);
        if (!player) {
            console.error(`end-results: Failed to find PlayerLibrary for ${GameContext.localPlayerID}`);
            return;
        }
        // First assume we have a defeat
        let titleString = "LOC_UI_PLAIN_DEFEAT";
        let mainGraphicURL = "url('fs://game/final_defeat-bg.png')";
        let textColorClass = "text-primary-1";
        let revealSound = "data-audio-final-defeat";
        // If we don't have a defeat, it doesn't necessarily mean we have won. We have won only if victory manager
        // specifically say we have won, otherwise we lost
        const playerDefeat = Game.VictoryManager.getLatestPlayerDefeat(GameContext.localPlayerID);
        if (playerDefeat == DefeatTypes.NO_DEFEAT) {
            const scores = EndGame.playerScores;
            scores.sort((a, b) => { return a.currentAgeScore >= b.currentAgeScore ? -1 : 1; });
            for (let i = 0; i < scores.length; i++) {
                if (GameContext.localPlayerID == scores[i].id) {
                    for (let j = 0; j < scores[i].victories.length; j++) {
                        if (scores[i].victories[j].claimed && scores[i].victories[j].place == 1) {
                            titleString = "LOC_UI_PLAIN_VICTORY";
                            mainGraphicURL = "url('fs://game/final_victory-bg.png')";
                            textColorClass = "text-secondary";
                            revealSound = "data-audio-final-victory";
                        }
                    }
                }
            }
        }
        Audio.playSound(revealSound, "audio-final-victory-defeat");
        Audio.playSound("data-audio-stop-banner-sound", "age-transition");
        const borderLeft = document.createElement("div");
        borderLeft.classList.add("end-results-menu-border", "end-results-menu-border-left", "top-10", "left-8", "pointer-events-none", "absolute");
        this.Root.appendChild(borderLeft);
        const borderRight = document.createElement("div");
        borderRight.classList.add("end-results-menu-border", "end-results-menu-border-right", "-scale-x-100", "top-10", "right-8", "pointer-events-none", "absolute");
        this.Root.appendChild(borderRight);
        const containerBg = document.createElement("div");
        containerBg.classList.add("end-results-container-background", "w-full", "h-full");
        this.Root.appendChild(containerBg);
        const mainContainer = document.createElement("div");
        mainContainer.classList.add("end-results-main-container", "relative", "flex", "self-center", "top-16");
        containerBg.appendChild(mainContainer);
        const outerVslot = document.createElement("fxs-vslot");
        outerVslot.classList.add("end-results-outer-vslot", "w-full");
        mainContainer.appendChild(outerVslot);
        const mainVslot = document.createElement("fxs-vslot");
        mainVslot.classList.add("end-results-main-vslot", "w-full");
        outerVslot.appendChild(mainVslot);
        let leaderPortrait = Icon.getLeaderPortraitIcon(player.leaderType);
        let leaderIcon = Icon.getCivSymbolFromCivilizationType(player.civilizationType);
        mainVslot.innerHTML = `
			<div class="end-results-portrait-bg absolute bg-cover bg-no-repeat"></div>
			<div class="relative self-center">
				<div class="end-results-bg-main bg-cover bg-no-repeat" style="background-image: ${mainGraphicURL}"></div>
				<div class="end-results-title absolute font-title ${textColorClass} self-center uppercase" data-l10n-id="${titleString}"></div>
				<div class="end-results-portrait absolute bg-cover bg-no-repeat" style="background-image: url('${leaderPortrait}')"></div>
				<div class="end-results-portrait-overlay-back absolute bg-cover bg-no-repeat w-16 h-16"></div>
				<div class="end-results-portrait-overlay-middle absolute bg-cover bg-no-repeat w-16 h-16"></div>
				<div class="end-results-portrait-overlay-icon absolute bg-cover bg-no-repeat w-16 h-16" style="background-image: url('${leaderIcon}')"></div>
			</div>
			<div class="end-results-text font-title-2xl ${textColorClass} self-center" data-l10n-id="${player.leaderName}"></div>
		`;
        this.continueButton = document.createElement("fxs-button");
        this.continueButton.classList.add("w-1\\/2", "self-center");
        this.continueButton.setAttribute("caption", "LOC_GENERIC_CONTINUE");
        this.continueButton.setAttribute("action-key", "inline-accept");
        this.continueButton.addEventListener('action-activate', () => {
            this.close();
        });
        outerVslot.appendChild(this.continueButton);
        this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
    }
    onDetach() {
        super.onDetach();
        WorldUI.clearBackground();
        this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
    }
    close() {
        super.close();
        window.dispatchEvent(new EndResultsFinishedEvent());
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        if (this.continueButton) {
            FocusManager.setFocus(this.continueButton);
        }
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
            this.close();
        }
    }
}
Controls.define("screen-end-results", {
    createInstance: EndResultsScreen,
    description: 'Screen showing the results of the just-played age',
    styles: ['fs://game/base-standard/ui/end-results/end-results.css']
});

//# sourceMappingURL=file:///base-standard/ui/end-results/end-results.js.map
