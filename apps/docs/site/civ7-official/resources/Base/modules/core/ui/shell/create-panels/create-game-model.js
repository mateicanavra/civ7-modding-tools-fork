/**
 * @file create-game-nav-model.ts
 * @copyright 2024, Firaxis Games
 * @description Model for game creation navigation info
 */
import ContextManager from "/core/ui/context-manager/context-manager.js";
import { NextCreationAction } from "/core/ui/shell/create-panels/game-creator-types.js";
import { StartCampaignEvent, GameCreatorClosedEvent } from "/core/ui/events/shell-events.js";
import { ScreenProfilePageExternalStatus } from "/core/ui/profile-page/screen-profile-page.js";
import { Audio } from "/core/ui/audio-base/audio-support.js";
class CreateGameModelImpl {
    constructor() {
        this._categories = [];
        this.openPanel = null;
        this.currentPanelIndex = 0;
        this.createGameRoot = null;
        this.panelList = [];
        this._isFirstTimeCreateGame = false;
    }
    get categories() {
        return this._categories;
    }
    get activeCategory() {
        return this.currentPanel.category;
    }
    get currentPanel() {
        return this.panelList[this.currentPanelIndex];
    }
    get selectedLeader() {
        return this._selectedLeader;
    }
    set selectedLeader(value) {
        this._selectedLeader = value;
    }
    get selectedAge() {
        return this._selectedAge;
    }
    set selectedAge(value) {
        this._selectedAge = value;
    }
    get selectedCiv() {
        return this._selectedCiv;
    }
    set selectedCiv(value) {
        this._selectedCiv = value;
    }
    get isLastPanel() {
        return this.currentPanelIndex >= this.panelList.length - 1;
    }
    get nextActionStartsGame() {
        return this.currentPanel != undefined && this.currentPanel.nextAction == NextCreationAction.StartGame;
    }
    get isFirstTimeCreateGame() {
        return this._isFirstTimeCreateGame;
    }
    set isFirstTimeCreateGame(value) {
        this._isFirstTimeCreateGame = value;
    }
    getAgeBackgroundName(ageId) {
        return `${ageId.toLowerCase().replace("age_", "age-sel_")}_full`;
    }
    getCivBackgroundName(civId) {
        return `bg-panel-${civId.replace("CIVILIZATION_", "").toLowerCase()}`;
    }
    onInviteAccepted() {
        ContextManager.popUntil("main-menu");
        window.dispatchEvent(new GameCreatorClosedEvent());
    }
    isCurrentPanel(name) {
        if (this.panelList[this.currentPanelIndex].category === name) {
            return true;
        }
        return false;
    }
    showPanelByName(name) {
        const newIndex = this.panelList.findIndex(p => p.panel === name);
        if (newIndex >= 0 && newIndex != this.currentPanelIndex) {
            this.popPanel();
            this.currentPanelIndex = newIndex;
            this.showPanel();
        }
    }
    showPanelFor(category) {
        const newIndex = this.panelList.findIndex(p => p.category === category);
        if (newIndex >= 0 && newIndex != this.currentPanelIndex) {
            this.popPanel();
            this.currentPanelIndex = newIndex;
            this.showPanel();
        }
    }
    showNextPanel(opts) {
        this.popPanel();
        if (this.currentPanel.nextAction === NextCreationAction.StartGame) {
            Audio.playSound("data-audio-create-continue", "game-creator-3");
            this.startGame();
        }
        else {
            // If a panel to skip is specified and it's the next panel, skip it
            if (opts?.skip && this.panelList[this.currentPanelIndex++].panel == opts.skip) {
                this.currentPanelIndex++;
            }
            Audio.playSound("data-audio-create-continue", "game-creator-2");
            this.currentPanelIndex++;
            this.showPanel();
        }
    }
    showPreviousPanel() {
        this.popPanel();
        if (this.currentPanelIndex > 0) {
            this.currentPanelIndex--;
            this.showPanel();
        }
        else {
            // back to main menu
            ContextManager.popUntil("main-menu");
            window.dispatchEvent(new GameCreatorClosedEvent());
        }
        Audio.playSound("data-audio-back-activate");
    }
    setCreateGameRoot(element) {
        this.createGameRoot = element;
    }
    setPanelList(panelList) {
        this.panelList = panelList;
        // Only keep first entry for each category, maintaining array order
        this._categories = this.panelList.map(panel => panel.category).filter((cat, idx, arr) => cat !== undefined && arr.indexOf(cat) === idx);
    }
    startGame() {
        this.isFirstTimeCreateGame = false;
        ScreenProfilePageExternalStatus.isGameCreationDomainInitialized = false;
        window.dispatchEvent(new StartCampaignEvent());
        engine.call('startGame');
    }
    setBackground(background, forceDisplay) {
        if (background != this.currentBackground || forceDisplay) {
            WorldUI.clearBackground();
            WorldUI.addBackgroundLayer("age_sel_bg_ramp", {}); // default values are correct, Fill/CenterX/CenterY
            if (background) {
                WorldUI.addMaskedBackgroundLayer(background, "age_sel_bg_mask", { stretch: StretchMode.UniformFill, alignY: AlignMode.Maximum }); // uniform anchored at bottom
            }
            this.currentBackground = background;
        }
    }
    launchFirstPanel() {
        if (this.panelList.length === 0) {
            console.error("game-creator: couldn't find a panel to launch");
            return;
        }
        this.currentPanelIndex = 0;
        this.showPanel();
    }
    popPanel() {
        if (this.openPanel) {
            ContextManager.pop(this.openPanel);
            this.openPanel = null;
            ScreenProfilePageExternalStatus.isGameCreationDomainInitialized = false;
        }
    }
    showPanel() {
        const pushPanelOpts = { singleton: true, createMouseGuard: false, targetParent: this.createGameRoot, panelOptions: this.currentPanel.panelOptions };
        this.openPanel = ContextManager.push(this.currentPanel.panel, pushPanelOpts);
        ScreenProfilePageExternalStatus.isGameCreationDomainInitialized = true;
    }
}
export const CreateGameModel = new CreateGameModelImpl();

//# sourceMappingURL=file:///core/ui/shell/create-panels/create-game-model.js.map
