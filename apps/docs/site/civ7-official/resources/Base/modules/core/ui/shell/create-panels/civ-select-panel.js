/**
 * @file civ-select-panel.ts
 * @copyright 2020-2025, Firaxis Games
 * @description Allows the player to select the desired civilization for a new game
 */
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { GetAgeMap, GetCivilizationData } from '/core/ui/shell/create-panels/age-civ-select-model.js';
import { GameCreationPanelBase } from '/core/ui/shell/create-panels/game-creation-panel-base.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { CreateGameModel } from '/core/ui/shell/create-panels/create-game-model.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import LiveEventManager from '/core/ui/shell/live-event-logic/live-event-logic.js';
import { GameCreationPromoManager } from '/core/ui/shell/create-panels/game-creation-promo-manager.js';
class CivSelectPanel extends GameCreationPanelBase {
    constructor(root) {
        super(root);
        this.learnMore = document.createElement('learn-more');
        this.civUnlocks = [];
        this.civBonuses = [];
        this.historicalCivs = [];
        this.tutorialPopup = null;
        this.civEles = [];
        this.civData = [];
        this.civFocusListener = this.focusCiv.bind(this);
        this.civItemListener = this.selectCiv.bind(this);
        this.ageMap = GetAgeMap();
    }
    onInitialize() {
        super.onInitialize();
        const fragment = this.createLayoutFragment(true);
        // Header
        const civAgeSelectHeader = document.createElement("fxs-header");
        civAgeSelectHeader.setAttribute("title", "LOC_AGE_CIV_SELECT_TITLE");
        civAgeSelectHeader.classList.add("mt-4", "z-1");
        this.mainContent.appendChild(civAgeSelectHeader);
        // Age selection
        this.mainContent.appendChild(this.createAgeSelector());
        // Civ Selection
        const civListScroll = document.createElement("fxs-scrollable");
        civListScroll.setAttribute("attached-scrollbar", "true");
        civListScroll.classList.add("flex-auto", "mr-3", "py-2");
        civListScroll.setAttribute("handle-gamepad-pan", "false");
        this.mainContent.appendChild(civListScroll);
        this.civSelectListEle = document.createElement("fxs-spatial-slot");
        this.civSelectListEle.classList.add("flex", "flex-row", "flex-wrap", "mx-4");
        civListScroll.appendChild(this.civSelectListEle);
        this.mainContent.appendChild(this.buildBottomNavBar());
        // Selected civ details
        this.civName = document.createElement('p');
        this.civName.classList.add("civ-select-panel-civ-name", "font-title", "text-secondary", "font-bold", "uppercase", "text-center", "font-fit-shrink");
        this.detailContent.appendChild(this.civName);
        this.civTags = document.createElement('p');
        this.civTags.classList.add("font-body-base", "text-accent-4");
        this.detailContent.appendChild(this.civTags);
        this.civHistoricalChoice = document.createElement('p');
        this.civHistoricalChoice.classList.add("flex", "flex-row", "items-center", "mt-6", "pointer-events-auto");
        this.detailContent.appendChild(this.civHistoricalChoice);
        const civHistoricalChoiceIcon = this.createHistoricalChoiceIcon();
        this.civHistoricalChoice.appendChild(civHistoricalChoiceIcon);
        this.historicalChoiceText = document.createElement('div');
        this.historicalChoiceText.classList.add("font-body-lg", "text-accent-3");
        this.historicalChoiceText.setAttribute("data-l10n-id", "LOC_CREATE_GAME_RECOMMENDED_CHOICE");
        this.civHistoricalChoice.appendChild(this.historicalChoiceText);
        this.learnMore.classList.add("ml-4", "mt-16", "mb-2", "max-w-128", "self-stretch", "hidden");
        this.detailContent.appendChild(this.learnMore);
        const civDetailScroll = document.createElement("fxs-scrollable");
        civDetailScroll.style.setProperty('--mask-padding', '0px');
        civDetailScroll.style.setProperty('--content-padding', '1px');
        civDetailScroll.setAttribute("attached-scrollbar", "true");
        civDetailScroll.setAttribute("handle-gamepad-pan", "true");
        civDetailScroll.classList.add("flex-auto", "self-stretch");
        this.detailContent.appendChild(civDetailScroll);
        civDetailScroll.componentCreatedEvent.on(scrollable => scrollable.setEngineInputProxy(this.Root));
        this.additionalCivInfo = document.createElement("div");
        this.additionalCivInfo.classList.add("flex", "flex-col", "items-center", "w-full");
        civDetailScroll.appendChild(this.additionalCivInfo);
        this.civAbilityTitle = document.createElement('div');
        this.civAbilityTitle.role = "paragraph";
        this.civAbilityTitle.classList.add("font-body-base", "text-accent-2", "font-bold", "mt-6", "pointer-events-auto");
        this.additionalCivInfo.appendChild(this.civAbilityTitle);
        this.civAbilityText = document.createElement('div');
        this.civAbilityText.role = "paragraph";
        this.civAbilityText.classList.add("font-body-base", "text-accent-2", "w-full", "pointer-events-auto");
        this.additionalCivInfo.appendChild(this.civAbilityText);
        const bonusesHeader = document.createElement("fxs-header");
        bonusesHeader.setAttribute("title", "LOC_CREATE_CIV_UNIQUE_BONUSES_SUBTITLE");
        bonusesHeader.setAttribute("filigree-style", "small");
        bonusesHeader.classList.add("mt-9", "uppercase", "font-title-base", "text-secondary");
        this.additionalCivInfo.appendChild(bonusesHeader);
        this.civBonusesContainer = document.createElement('div');
        this.civBonusesContainer.classList.add("flex", "flex-col", "w-full");
        this.additionalCivInfo.appendChild(this.civBonusesContainer);
        this.civUnlocksHeader = document.createElement("fxs-header");
        this.civUnlocksHeader.setAttribute("title", "LOC_CREATE_GAME_AGE_UNLOCK_TITLE");
        this.civUnlocksHeader.setAttribute("filigree-style", "small");
        this.civUnlocksHeader.classList.add("mt-10", "uppercase", "font-title-base", "text-secondary");
        this.additionalCivInfo.appendChild(this.civUnlocksHeader);
        this.civUnlocksContainer = document.createElement('div');
        this.civUnlocksContainer.classList.add("flex", "flex-col", "w-full", "font-body-base", "text-accent-2");
        this.additionalCivInfo.appendChild(this.civUnlocksContainer);
        fragment.appendChild(this.buildLeaderBox());
        this.Root.appendChild(fragment);
    }
    onAttach() {
        super.onAttach();
        engine.on("FinishedGameplayContentChange", this.handleContentChange, this);
        engine.on("QrAccountLinked", this.handleContentChange, this);
        engine.on("OwnershipAuthorizationChanged", this.handleContentChange, this);
        this.updateCivData();
        this.showQuoteSubtitles();
        // tabindex get added on control init, need to wait till its attached to change it
        this.ageSelector.removeAttribute('tabindex');
    }
    onDetach() {
        this.tutorialPopup?.remove();
        super.onDetach();
        engine.off("FinishedGameplayContentChange", this.handleContentChange, this);
        engine.off("QrAccountLinked", this.handleContentChange, this);
        engine.off("OwnershipAuthorizationChanged", this.handleContentChange, this);
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        this.selectGameParamCiv();
        this.updateNavTray();
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    onActiveDeviceTypeChanged() {
        super.onActiveDeviceTypeChanged();
        for (const historicalCiv of this.historicalCivs) {
            if (ActionHandler.isGamepadActive) {
                historicalCiv.ele.setAttribute("data-tooltip-content", historicalCiv.reason);
            }
            else {
                historicalCiv.ele.removeAttribute("data-tooltip-content");
            }
        }
    }
    onNavigateInput(event) {
        super.onNavigateInput(event);
        if (event.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        const direction = event.getDirection();
        if (direction == InputNavigationAction.SHELL_PREVIOUS) {
            this.ageSelector.component.selectPrevious();
            event.stopPropagation();
            event.preventDefault();
        }
        else if (direction == InputNavigationAction.SHELL_NEXT) {
            this.ageSelector.component.selectNext();
            event.stopPropagation();
            event.preventDefault();
        }
    }
    onEngineInput(event) {
        super.onEngineInput(event);
        if (event.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (event.detail.name === "shell-action-2") {
            if (CreateGameModel.selectedCiv?.isLocked) {
                this.showStoreScreen(CreateGameModel.selectedCiv.civID);
                event.stopPropagation();
                event.preventDefault();
            }
        }
    }
    updateCivData() {
        this.civData = GetCivilizationData();
        if (UI.isNonPreferredCivsDisabled()) {
            for (let civ of this.civData) {
                if (!civ.isHistoricalChoice && !civ.isLocked) {
                    civ.isLocked = true;
                    civ.unlockCondition = ""; // TODO when data is available
                }
            }
        }
        this.generateCivButtons();
        this.refreshSelection();
    }
    getAgeSelectorBgName(ageId) {
        return `url("fs://game/${ageId.toLowerCase().replace("age_", "shell_")}-select.png")`;
    }
    setPanelOptions(panelOptions) {
        this.ageSelector.setAttribute("disabled", panelOptions.noAge ? "true" : "");
    }
    createAgeSelector() {
        const ageParameter = GameSetup.findGameParameter('Age');
        const ages = [...ageParameter?.domain.possibleValues ?? []];
        const sortedAges = ages.sort((a, b) => a.sortIndex - b.sortIndex);
        const ageItems = [];
        this.ageSelector = document.createElement('fxs-selector-ornate');
        this.ageSelector.setAttribute("enable-shell-nav", "true");
        this.ageSelector.style.marginTop = Layout.pixels(-26);
        this.ageSelector.classList.add('mx-6', "mb-3");
        if (LiveEventManager.skipAgeSelect()) { // handle case where age is already fixed, e.g. live events
            for (const [, age] of sortedAges.entries()) {
                const ageId = age.value;
                const startAgeHash = Configuration.getGame().getValue("StartAge");
                if (startAgeHash == Database.makeHash(ageId)) {
                    CreateGameModel.selectedAge = this.ageMap.get(ageId);
                }
            }
        }
        for (const [index, age] of sortedAges.entries()) {
            const name = GameSetup.resolveString(age.name) || "";
            const description = GameSetup.resolveString(age.description) || "";
            const ageId = age.value;
            if (ageId === CreateGameModel.selectedAge?.type) {
                this.ageSelector.setAttribute("selected-item-index", index.toString());
            }
            ageItems.push({ label: name, description: description, image: this.getAgeSelectorBgName(ageId) });
        }
        this.ageSelector.componentCreatedEvent.on((component) => component.updateSelectorItems(ageItems));
        this.ageSelector.addEventListener("dropdown-selection-change", (ev) => {
            const selectedAge = sortedAges[ev.detail.selectedIndex].value;
            GameSetup.setGameParameterValue('Age', selectedAge);
            CreateGameModel.selectedAge = this.ageMap.get(selectedAge);
            CreateGameModel.setBackground(CreateGameModel.getAgeBackgroundName(selectedAge));
            this.selectedCivEle = undefined;
            this.updateLeaderBox();
            this.updateCivData();
        });
        return this.ageSelector;
    }
    createHistoricalChoiceIcon() {
        const outerRing = document.createElement('div');
        outerRing.classList.add("img-historical-choice", "w-8", "h-8", "mr-1\\.5", "relative");
        this.civHistoricalChoice.appendChild(outerRing);
        const iconEle = document.createElement("fxs-icon");
        iconEle.classList.add("absolute", "-inset-1\\.5", "w-auto", "h-auto");
        iconEle.setAttribute("data-icon-context", "LEADER");
        iconEle.setAttribute("data-icon-id", CreateGameModel.selectedLeader?.icon ?? "");
        outerRing.appendChild(iconEle);
        return outerRing;
    }
    generateCivButtons() {
        for (const oldCivEle of this.civEles) {
            oldCivEle.remove();
        }
        this.civEles.length = 0;
        const showUnownedContent = Configuration.getUser().showUnownedContent;
        for (const [index, civ] of this.civData.entries()) {
            if (civ.isLocked && !showUnownedContent) {
                continue;
            }
            const civEle = document.createElement("civ-button");
            civEle.classList.add("relative");
            civEle.setAttribute("tabIndex", (index + 1).toString());
            civEle.addEventListener('action-activate', this.civItemListener);
            civEle.addEventListener('focus', this.civFocusListener);
            civEle.setAttribute("data-audio-group-ref", "civ-select");
            civEle.setAttribute("data-audio-activate-ref", "data-audio-civ-select");
            civEle.whenComponentCreated(c => c.civData = civ);
            if (civ.isHistoricalChoice) {
                const historicalChoiceIcon = this.createHistoricalChoiceIcon();
                historicalChoiceIcon.classList.add("absolute", "-top-2", "-right-2", "pointer-events-auto");
                civEle.appendChild(historicalChoiceIcon);
                historicalChoiceIcon.setAttribute("data-tooltip-content", civ.historicalChoiceReason ?? "");
                this.historicalCivs.push({ ele: civEle, reason: civ.historicalChoiceReason ?? "" });
            }
            this.civEles.push(civEle);
            this.civSelectListEle.appendChild(civEle);
        }
    }
    refreshSelection() {
        waitForLayout(() => {
            this.selectGameParamCiv();
        });
    }
    selectGameParamCiv() {
        // Check to see if a civ is already selected.  If so, select that one.
        if (this.selectedCivEle) {
            this.selectCivInfo(this.selectedCivEle);
            return;
        }
        const civId = GameSetup.findPlayerParameter(GameContext.localPlayerID, "PlayerCivilization")?.value?.value;
        if (civId) {
            this.selectCivInfo(this.civEles.find(b => b.maybeComponent?.civData?.civID == civId));
        }
        else {
            this.selectCivInfo(this.civEles[0]);
        }
    }
    focusCiv(event) {
        if (ActionHandler.isGamepadActive) {
            this.selectCivInfo(event.target);
        }
    }
    selectCiv(event) {
        if (ActionHandler.isGamepadActive) {
            this.showNextPanel();
        }
        else {
            this.selectCivInfo(event.target);
        }
    }
    handleContentChange() {
        this.updateCivData();
        // Restore civ selection
        const selectedCivId = CreateGameModel.selectedCiv?.civID;
        if (selectedCivId) {
            const foundCiv = this.civEles.find(b => b.maybeComponent?.civData?.civID == selectedCivId);
            if (foundCiv) {
                this.selectCivInfo(foundCiv);
            }
        }
    }
    selectCivInfo(civButton) {
        if (civButton) {
            FocusManager.setFocus(civButton);
            if (ActionHandler.isGamepadActive && FocusManager.getFocus() != civButton) {
                FocusManager.setFocus(civButton);
            }
            if (this.selectedCivEle != civButton) {
                if (this.selectedCivEle) {
                    this.selectedCivEle.component.isSelected = false;
                }
                this.selectedCivEle?.classList.remove('selected');
                this.selectedCivEle = civButton;
                this.selectedCivEle.classList.add('selected');
                this.selectedCivEle.component.isSelected = true;
                CreateGameModel.selectedCiv = this.selectedCivEle?.maybeComponent?.civData;
                const localPlayerID = GameContext.localPlayerID;
                const gameConfig = Configuration.editGame();
                const playerConfig = Configuration.editPlayer(localPlayerID);
                if (gameConfig && playerConfig) {
                    GameSetup.setPlayerParameterValue(localPlayerID, 'PlayerCivilization', CreateGameModel.selectedCiv.civID);
                }
                else {
                    console.error("civ-select-panel: Game or player config was unable to be edited - civilization was not set");
                }
                this.swapCivInfo();
                this.updateLeaderBox();
            }
        }
    }
    swapCivInfo() {
        const selectedCiv = CreateGameModel.selectedCiv;
        if (selectedCiv) {
            if (selectedCiv.civID == "RANDOM") {
                const ageType = CreateGameModel.selectedAge?.type;
                if (ageType) {
                    CreateGameModel.setBackground(CreateGameModel.getAgeBackgroundName(ageType));
                }
            }
            else {
                CreateGameModel.setBackground(CreateGameModel.getCivBackgroundName(selectedCiv.civID));
            }
            this.additionalCivInfo.classList.toggle('hidden', selectedCiv.civID == "RANDOM");
            this.civName.innerHTML = selectedCiv.name;
            this.civTags.innerHTML = selectedCiv.tags.join(" ");
            this.civHistoricalChoice.classList.toggle("hidden", !selectedCiv.isHistoricalChoice);
            this.civHistoricalChoice.setAttribute("data-tooltip-content", selectedCiv.historicalChoiceReason ?? "");
            this.historicalChoiceText.setAttribute("data-l10n-id", selectedCiv.historicalChoiceType ?? "");
            this.learnMore.classList.toggle("hidden", !selectedCiv.isLocked);
            this.learnMore.whenComponentCreated((component) => {
                component.contentName = selectedCiv.name;
                component.action = () => this.showStoreScreen(CreateGameModel.selectedCiv?.civID);
                // Content pack names get loaded asynchronously, so default to the generic "Leader Locked" reason until the name is loaded
                component.reason = "LOC_LOCKED_GENERIC";
                GameCreationPromoManager.getContentPackTitleFor(selectedCiv.civID).then((contentPack) => {
                    if (contentPack) {
                        component.contentPack = contentPack;
                        component.reason = "LOC_LOCKED_INCLUDED_WITH_CONTENT";
                    }
                });
            });
            if (selectedCiv.isLocked) {
                this.disableNavigation();
                NavTray.addOrUpdateShellAction2("LOC_CREATE_GAME_LEARN_MORE");
            }
            else {
                this.enableNavigation();
            }
            this.civAbilityTitle.innerHTML = selectedCiv.abilityTitle;
            this.civAbilityText.innerHTML = selectedCiv.abilityText;
            for (const oldBonus of this.civBonuses) {
                oldBonus.remove();
            }
            for (const bonus of selectedCiv.bonuses) {
                const bonusEle = document.createElement('civ-select-bonus');
                bonusEle.classList.add("my-4");
                bonusEle.componentCreatedEvent.on((ele) => ele.setBonusData(bonus));
                this.civBonuses.push(bonusEle);
                this.civBonusesContainer.appendChild(bonusEle);
            }
            for (const oldUnlock of this.civUnlocks) {
                oldUnlock.remove();
            }
            this.civUnlocksHeader.classList.toggle('hidden', selectedCiv.unlocks.length == 0);
            for (const unlock of selectedCiv.unlocks) {
                const unlockEle = document.createElement('p');
                unlockEle.innerHTML = unlock;
                this.civUnlocks.push(unlockEle);
                this.civUnlocksContainer.appendChild(unlockEle);
            }
        }
    }
}
Controls.define('civ-select-panel', {
    createInstance: CivSelectPanel,
    description: 'Select the civ',
    requires: ['civ-button'],
    classNames: ["size-full", "relative", 'flex', 'flex-col'],
    styles: ["fs://game/core/ui/shell/create-panels/civ-select-panel.css"],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/shell/create-panels/civ-select-panel.js.map
