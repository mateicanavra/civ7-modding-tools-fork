/**
 * @file leader-select-panel.ts
 * @copyright 2020-2025, Firaxis Games
 * @description Allows the player to select the desired leader for a new game
 */
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { getLeaderData, getMementoData, OwnershipAction } from '/core/ui/shell/create-panels/leader-select-model.js';
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import LeaderSelectModelManager from '/core/ui/shell/leader-select/leader-select-model-manager.js';
import { GameCreationPanelBase } from '/core/ui/shell/create-panels/game-creation-panel-base.js';
import { CreateGameModel } from '/core/ui/shell/create-panels/create-game-model.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import { getRewardType, UnlockableRewardType } from '/core/ui/utilities/utilities-liveops.js';
import LiveEventManager from "/core/ui/shell/live-event-logic/live-event-logic.js";
import { GetCivilizationData } from "/core/ui/shell/create-panels/age-civ-select-model.js";
import { Focus } from '/core/ui/input/focus-support.js';
import { GameCreationPromoManager } from '/core/ui/shell/create-panels/game-creation-promo-manager.js';
class LeaderSelectPanel extends GameCreationPanelBase {
    constructor(root) {
        super(root);
        this.leaderData = [];
        this.leaderList = document.createElement("fxs-spatial-slot");
        this.leaderButtons = [];
        this.selectedNameEle = document.createElement("p");
        this.selectedTagsListEle = document.createElement("p");
        this.selectedAbilityTitleEle = document.createElement("p");
        this.selectedAbilityTextEle = document.createElement("p");
        this.additionalLeaderInfo = document.createElement("div");
        this.learnMore = document.createElement('learn-more');
        this.mementosSection = document.createElement("div");
        this.mementoSlotEles = [];
        this.unlocksHeader = document.createElement("fxs-header");
        this.unlockListEle = document.createElement("div");
        this.unlockEles = [];
        this.nextLevelUnlockEle = document.createElement("p");
        this.isAccountLoginPending = false;
        this.leaderButtonListener = this.selectLeaderHandler.bind(this);
        this.leaderFocusListener = this.focusLeaderHandler.bind(this);
    }
    onInitialize() {
        super.onInitialize();
        const fragment = this.createLayoutFragment(true);
        // Leader selection
        const leaderSelectHeader = document.createElement("fxs-header");
        leaderSelectHeader.setAttribute("title", "LOC_LEADER_SELECT_TITLE");
        leaderSelectHeader.classList.add("mt-4");
        this.mainContent.appendChild(leaderSelectHeader);
        const leaderListScroll = document.createElement("fxs-scrollable");
        leaderListScroll.setAttribute("attached-scrollbar", "true");
        leaderListScroll.setAttribute("handle-gamepad-pan", "false");
        leaderListScroll.classList.add("flex-auto", "mr-3");
        this.mainContent.appendChild(leaderListScroll);
        this.leaderList.classList.add("flex", "flex-row", "flex-wrap", "mx-3", "py-2");
        leaderListScroll.appendChild(this.leaderList);
        this.mainContent.appendChild(this.buildBottomNavBar());
        // Leader info
        this.selectedAbilityTitleEle.classList.add("font-title-lg", "text-accent-2", "font-bold");
        this.detailContent.appendChild(this.selectedAbilityTitleEle);
        this.selectedNameEle.classList.add("leader-select-panel-leader-name", "font-title", "text-secondary", "font-bold", "uppercase", "text-center");
        this.detailContent.appendChild(this.selectedNameEle);
        this.selectedTagsListEle.classList.add("font-body-base", "text-accent-4");
        this.detailContent.appendChild(this.selectedTagsListEle);
        const selectFiligree = document.createElement("div");
        selectFiligree.classList.add("filigree-shell-small", "mt-4");
        this.detailContent.appendChild(selectFiligree);
        this.learnMore.classList.add('mx-12', "top-1\\/2", "max-w-128", "hidden");
        this.randomLeaderContent.appendChild(this.learnMore);
        const leaderDetailScroll = document.createElement("fxs-scrollable");
        leaderDetailScroll.style.setProperty('--mask-padding', '0px');
        leaderDetailScroll.style.setProperty('--content-padding', '1px');
        leaderDetailScroll.setAttribute("attached-scrollbar", "true");
        leaderDetailScroll.setAttribute("handle-gamepad-pan", "true");
        leaderDetailScroll.classList.add("flex-auto", "stretch-self");
        this.detailContent.appendChild(leaderDetailScroll);
        leaderDetailScroll.componentCreatedEvent.on(scrollable => scrollable.setEngineInputProxy(this.Root));
        this.selectedAbilityTextEle.classList.add("leader-select-panel-section", "font-body-base", "text-accent-2", "mx-2");
        leaderDetailScroll.appendChild(this.selectedAbilityTextEle);
        if (Online.Metaprogression.supportsMemento()) {
            this.mementosSection.classList.add("flex", "flex-col", "w-full");
            leaderDetailScroll.appendChild(this.mementosSection);
            const mementosHeader = document.createElement("fxs-header");
            mementosHeader.setAttribute("title", "LOC_LEADER_MEMENTOS_TITLE");
            mementosHeader.setAttribute("filigree-style", "small");
            mementosHeader.classList.add("mt-10", "uppercase", "font-title-base", "text-secondary");
            this.mementosSection.appendChild(mementosHeader);
            const mementoSlotsContainer = document.createElement("div");
            mementoSlotsContainer.classList.add("flex", "flex-row", "items-start", "justify-center");
            this.mementosSection.appendChild(mementoSlotsContainer);
            for (const [slotIndex, mementoSlotData] of getMementoData().entries()) {
                const mementoSlotEle = document.createElement("memento-slot");
                mementoSlotEle.componentCreatedEvent.on(component => component.slotData = mementoSlotData);
                mementoSlotEle.addEventListener("action-activate", this.showMementoEditor.bind(this, slotIndex));
                this.mementoSlotEles.push(mementoSlotEle);
                mementoSlotsContainer.appendChild(mementoSlotEle);
            }
        }
        this.additionalLeaderInfo.classList.add("leader-select-panel-section", "flex", "flex-col", "items-center");
        leaderDetailScroll.appendChild(this.additionalLeaderInfo);
        this.unlocksHeader.setAttribute("title", "LOC_CREATE_GAME_AGE_UNLOCK_TITLE");
        this.unlocksHeader.setAttribute("filigree-style", "small");
        this.unlocksHeader.classList.add("mt-10", "uppercase", "font-title-base", "text-secondary");
        this.additionalLeaderInfo.appendChild(this.unlocksHeader);
        this.unlockListEle.classList.add("flex", "flex-col", "font-body-base", "w-full", "px-2", "text-accent-2");
        this.additionalLeaderInfo.appendChild(this.unlockListEle);
        if (Network.supportsSSO()) {
            const nextLevelUnlockHeader = document.createElement("fxs-header");
            nextLevelUnlockHeader.setAttribute("title", "LOC_CREATE_GAME_NEXT_UNLOCK_TITLE");
            nextLevelUnlockHeader.setAttribute("filigree-style", "small");
            nextLevelUnlockHeader.classList.add("mt-10", "uppercase", "font-title-base", "text-secondary");
            this.additionalLeaderInfo.appendChild(nextLevelUnlockHeader);
            this.nextLevelUnlockEle.classList.add("font-body-base", "text-accent-2", "flex", "flex-row", "max-w-full", "items-center");
            this.additionalLeaderInfo.appendChild(this.nextLevelUnlockEle);
        }
        this.Root.appendChild(fragment);
    }
    onAttach() {
        super.onAttach();
        engine.on("FinishedGameplayContentChange", this.handleContentChange, this);
        engine.on("QrAccountLinked", this.handleContentChange, this);
        engine.on("OwnershipAuthorizationChanged", this.handleContentChange, this);
        engine.on("SPoPHeartbeatReceived", this.handleAccountLogin, this);
        engine.on("SPoPComplete", this.handleAccountLogin, this);
        this.handleContentChange();
    }
    onDetach() {
        super.onDetach();
        LeaderSelectModelManager.clearFilter();
        engine.off("FinishedGameplayContentChange", this.handleContentChange, this);
        engine.off("QrAccountLinked", this.handleContentChange, this);
        engine.off("OwnershipAuthorizationChanged", this.handleContentChange, this);
        engine.off("SPoPHeartbeatReceived", this.handleAccountLogin, this);
        engine.off("SPoPComplete", this.handleAccountLogin, this);
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        this.updateMementoData();
        this.selectGameParamHero();
        this.updateNavTray();
        if (Online.Metaprogression.supportsMemento()) {
            NavTray.addOrUpdateShellAction2("LOC_EDIT_MEMENTOS_TITLE");
        }
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    onEngineInput(event) {
        super.onEngineInput(event);
        if (event.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (event.detail.name === "shell-action-2") {
            if (CreateGameModel.selectedLeader?.isLocked) {
                this.showUnlockLeaderScreen();
            }
            else {
                if (Online.Metaprogression.supportsMemento()) {
                    this.showMementoEditor(0);
                }
            }
            event.stopPropagation();
            event.preventDefault();
        }
    }
    onContinue() {
        super.onContinue();
        const isLocked = CreateGameModel.selectedLeader?.isLocked ?? false;
        if (isLocked) {
            return false;
        }
        LeaderSelectModelManager.pickLeader();
        return true;
    }
    handleAccountLogin() {
        if (Network.isWaitingForValidHeartbeat()) {
            return;
        }
        if (this.isAccountLoginPending) {
            this.learnMore.whenComponentCreated((component) => {
                if (Network.isFullAccountLinked()) {
                    component.tooltip = "";
                    component.reason = "LOC_LOCKED_GENERIC";
                    component.action = undefined;
                }
                else {
                    component.tooltip = "LOC_UI_LINK_ACCOUNT_LINK";
                }
            });
            this.isAccountLoginPending = false;
            this.showUnlockLeaderScreen();
        }
    }
    handleContentChange() {
        // Refresh leader buttons
        this.leaderData = getLeaderData();
        this.createLeaderButtons();
        // Restore leader selection
        const selectedLeaderId = CreateGameModel.selectedLeader?.leaderID;
        if (selectedLeaderId) {
            const foundLeader = this.leaderButtons.find(b => b.maybeComponent?.leaderData?.leaderID == selectedLeaderId);
            if (foundLeader) {
                this.selectLeader(foundLeader);
            }
        }
    }
    updateMementoData() {
        for (const [index, mementoSlotData] of getMementoData().entries()) {
            const mementoComponent = this.mementoSlotEles[index]?.maybeComponent;
            if (mementoComponent) {
                mementoComponent.slotData = mementoSlotData;
            }
        }
    }
    createLeaderButtons() {
        for (const oldButton of this.leaderButtons) {
            oldButton.remove();
        }
        this.leaderButtons.length = 0;
        const supportsDLC = UI.supportsDLC();
        const showUnownedContent = Configuration.getUser().showUnownedContent;
        for (const [index, leader] of this.leaderData.entries()) {
            if (leader.isLocked && (!supportsDLC || !showUnownedContent)) {
                continue; // skip the creation of a dlc leader-button on apple arcade
            }
            const leaderButton = document.createElement('leader-button');
            leaderButton.whenComponentCreated((leaderButton) => leaderButton.leaderData = leader);
            leaderButton.setAttribute("tabindex", index.toString());
            leaderButton.setAttribute("data-audio-group-ref", "leader-select");
            if (leader.leaderID == "RANDOM") {
                leaderButton.setAttribute("data-audio-activate-ref", "data-audio-leader-shuffle-select");
            }
            else {
                leaderButton.setAttribute("data-audio-activate-ref", "data-audio-leader-select");
            }
            leaderButton.setAttribute("data-audio-focus-ref", "data-audio-focus");
            leaderButton.classList.add("m-1");
            if (leader.icon) {
                leaderButton.setAttribute("data-icon", leader.icon);
            }
            leaderButton.addEventListener('action-activate', this.leaderButtonListener);
            leaderButton.addEventListener('focus', this.leaderFocusListener);
            this.leaderButtons.push(leaderButton);
            this.leaderList.appendChild(leaderButton);
        }
        // Select the first leader button when it gets attached
        this.selectGameParamHero();
    }
    selectGameParamHero() {
        // First check to see if a leader is already selected.  If so, reselect it.
        if (this.selectedLeaderEle) {
            this.selectLeader(this.selectedLeaderEle);
            return;
        }
        const leaderId = GameSetup.findPlayerParameter(GameContext.localPlayerID, "PlayerLeader")?.value?.value;
        // Then try to load leader matching current leader in game setup params
        if (leaderId && leaderId !== "RANDOM") {
            const foundLeader = this.leaderButtons.find(b => b.maybeComponent?.leaderData?.leaderID == leaderId);
            if (foundLeader) {
                this.selectLeader(foundLeader);
                return;
            }
        }
        // If it wasn't found, default to the first item
        this.selectLeader(this.leaderButtons[0]);
    }
    focusLeaderHandler(evt) {
        if (ActionHandler.isGamepadActive) {
            this.selectLeader(evt.target);
        }
    }
    selectLeaderHandler(evt) {
        if (ActionHandler.isGamepadActive) {
            this.showNextPanel();
        }
        else {
            this.selectLeader(evt.target);
        }
    }
    selectLeader(leaderButton) {
        const leaderData = leaderButton?.maybeComponent?.leaderData;
        if (leaderButton) {
            Focus.setContextAwareFocus(leaderButton, this.Root);
        }
        if (leaderData) {
            if (this.selectedLeaderEle != leaderButton) {
                if (this.selectedLeaderEle) {
                    this.selectedLeaderEle.component.isSelected = false;
                }
                this.selectedLeaderEle = leaderButton;
                leaderButton.whenComponentCreated((component) => component.isSelected = true);
            }
            const localPlayerID = GameContext.localPlayerID;
            const gameConfig = Configuration.editGame();
            const playerConfig = Configuration.editPlayer(localPlayerID);
            if (gameConfig && playerConfig) {
                GameSetup.setPlayerParameterValue(localPlayerID, 'PlayerLeader', leaderData.leaderID);
            }
            else {
                console.error("leader-select-panel: Game or player config was unable to be edited - leader was not set");
            }
            if (this.selectedLeaderEle) {
                CreateGameModel.selectedLeader = this.selectedLeaderEle.maybeComponent?.leaderData;
            }
            this.swapLeaderInfo();
        }
        // special case of restricted leader-civ pairing, used for LeaderMixNMatch live event
        // TODO: refactor so that don't require direct database query
        if (LiveEventManager.restrictToPreferredCivs()) {
            const civLeaderPairingData = (Database.query('config', 'select * from LeaderCivParings') ?? []);
            const civFixed = civLeaderPairingData.find(row => row.LeaderType == leaderData.leaderID);
            const civID = civFixed?.CivilizationType ?? '';
            const localPlayerID = GameContext.localPlayerID;
            const gameConfig = Configuration.editGame();
            const playerConfig = Configuration.editPlayer(localPlayerID);
            if (gameConfig && playerConfig) {
                GameSetup.setPlayerParameterValue(localPlayerID, 'PlayerCivilization', civID);
                const civData = GetCivilizationData();
                const civFixedData = civData.find(entry => entry.civID == civID);
                CreateGameModel.selectedCiv = civFixedData;
            }
            else {
                console.error("civ-select-panel: Game or player config was unable to be edited - civilization was not set");
            }
        }
    }
    showUnlockLeaderScreen() {
        const leaderData = CreateGameModel.selectedLeader;
        if (!leaderData || !leaderData.ownershipData) {
            return;
        }
        switch (leaderData.ownershipData.action) {
            case OwnershipAction.LinkAccount:
                if (!Network.isLoggedIn()) {
                    this.isAccountLoginPending = true;
                    DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_LOGIN_ACCOUNT"), title: Locale.compose("LOC_UI_LOGIN_ACCOUNT_TITLE") });
                    Network.attemptLogin();
                }
                else if (!Network.isFullAccountLinked() && Network.canDisplayQRCode()) {
                    ContextManager.push("screen-mp-link-account", { singleton: true, createMouseGuard: true });
                }
                break;
            case OwnershipAction.IncludedWith:
                this.showStoreScreen(leaderData.leaderID);
                break;
        }
    }
    swapLeaderInfo() {
        if (this.selectedLeaderEle) {
            const leaderData = CreateGameModel.selectedLeader;
            if (leaderData) {
                const isRandom = leaderData.leaderID == "RANDOM";
                this.mementosSection.classList.toggle("hidden", leaderData.isLocked);
                const isOwned = leaderData.isOwned || !leaderData.ownershipData || leaderData.ownershipData.action == OwnershipAction.None;
                this.learnMore.classList.toggle("hidden", !leaderData.isLocked);
                this.learnMore.whenComponentCreated((component) => {
                    component.contentName = leaderData.name;
                    var reason = leaderData.ownershipData?.reason;
                    var tooltip = "";
                    var action;
                    if (leaderData.ownershipData) {
                        if (leaderData.ownershipData.action == OwnershipAction.IncludedWith) {
                            // Content pack names get loaded asynchronously, so default to the generic "Leader Locked" reason until the name is loaded
                            reason = "LOC_LOCKED_GENERIC";
                            GameCreationPromoManager.getContentPackTitleFor(leaderData.leaderID).then((contentPack) => {
                                if (contentPack) {
                                    component.contentPack = contentPack;
                                    component.reason = leaderData.ownershipData?.reason;
                                    component.action = this.showUnlockLeaderScreen.bind(this);
                                }
                            });
                        }
                        else if (leaderData.ownershipData.action == OwnershipAction.LinkAccount) {
                            if (Network.isFullAccountLinked()) {
                                reason = "LOC_LOCKED_GENERIC";
                            }
                            else if (Network.isLoggedIn()) {
                                tooltip = "LOC_UI_LINK_ACCOUNT_LINK";
                                action = this.showUnlockLeaderScreen.bind(this);
                            }
                            else {
                                tooltip = "LOC_UI_LOGIN_ACCOUNT_TITLE";
                                action = this.showUnlockLeaderScreen.bind(this);
                            }
                        }
                    }
                    component.tooltip = tooltip;
                    component.action = action;
                    component.reason = reason;
                });
                if (leaderData.isLocked) {
                    LeaderSelectModelManager.setGrayscaleFilter();
                    this.disableNavigation();
                    if (isOwned) {
                        NavTray.removeShellAction2();
                    }
                    else {
                        NavTray.addOrUpdateShellAction2("LOC_CREATE_GAME_LEARN_MORE");
                    }
                }
                else {
                    LeaderSelectModelManager.clearFilter();
                    this.enableNavigation();
                    if (Online.Metaprogression.supportsMemento()) {
                        NavTray.addOrUpdateShellAction2("LOC_EDIT_MEMENTOS_TITLE");
                    }
                }
                this.additionalLeaderInfo.classList.toggle('hidden', isRandom);
                this.selectedNameEle.innerHTML = leaderData.name;
                this.selectedAbilityTextEle.innerHTML = leaderData.abilityText;
                this.selectedAbilityTitleEle.innerHTML = leaderData.abilityTitle;
                this.selectedTagsListEle.innerHTML = leaderData.tags.join(" ");
                for (const oldUnlockItemEle of this.unlockEles) {
                    oldUnlockItemEle.remove();
                }
                const allUnlocks = leaderData.unlocks.concat(leaderData.ageUnlocks);
                this.unlocksHeader.classList.toggle('hidden', allUnlocks.length == 0);
                for (const unlockItem of allUnlocks) {
                    const unlockItemEle = document.createElement("p");
                    unlockItemEle.innerHTML = unlockItem;
                    this.unlockEles.push(unlockItemEle);
                    this.unlockListEle.appendChild(unlockItemEle);
                }
                if (leaderData.nextReward) {
                    const reward = leaderData.nextReward;
                    const rewardType = getRewardType(reward.gameItemID);
                    this.nextLevelUnlockEle.innerHTML = `
						<div class="font-title-base text-accent-1 m-1">${reward.level.toString()}</div>
						<div class="m-1 bg-contain bg-no-repeat h-14 w-14" style="background-image: url('${reward.reward}')"></div>
						<div class="leader-select-panel-next-level-unlock flex flex-col m-1 flex-auto">
							<div class="font-title-lg text-header-4 uppercase" data-l10n-id="${reward.title}"></div>
							<div class="font-body-base text-accent-1" data-l10n-id="${reward.desc}"></div>
							${rewardType == UnlockableRewardType.Memento ? `<div class="font-body-sm text-accent-1" data-l10n-id="LOC_${reward.gameItemID}_FUNCTIONAL_DESCRIPTION"></div>` : ""}
						</div>
					`;
                }
                LeaderSelectModelManager.showLeaderModels(leaderData.leaderID);
            }
        }
    }
    showMementoEditor(slotIndex) {
        ContextManager.push("memento-editor", { singleton: true, createMouseGuard: true, panelOptions: { slotIndex } });
    }
    ;
}
Controls.define('leader-select-panel', {
    createInstance: LeaderSelectPanel,
    description: 'Select the leader',
    classNames: ["size-full", "relative", 'flex', 'flex-col'],
    requires: ['leader-button'],
    styles: ['fs://game/core/ui/shell/create-panels/leader-select-panel.css'],
    tabIndex: -1,
});

//# sourceMappingURL=file:///core/ui/shell/create-panels/leader-select-panel.js.map
