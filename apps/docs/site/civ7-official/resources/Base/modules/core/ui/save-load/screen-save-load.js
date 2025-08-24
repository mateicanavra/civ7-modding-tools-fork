/**
 * @file screen-save-load.ts
 * @copyright 2021 - 2025, Firaxis Games
 * @description Shell Load Game Menu, manage save games and load into a saved game.
 */
import DialogManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import SaveLoadData, { DEFAULT_SAVE_GAME_INFO, QueryDoneEventName } from '/core/ui/save-load/model-save-load.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { MustGetElement, MustGetElements } from '/core/ui/utilities/utilities-dom.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
import { ActionConfirmEventName } from '/core/ui/save-load/save-load-card.js';
import SystemMessageManager from '/core/ui/system-message/system-message-manager.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import { displayRequestUniqueId } from '/core/ui/context-manager/display-handler.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
export const SaveLoadClosedEventName = 'save-load-closed';
class SaveLoadClosedEvent extends CustomEvent {
    constructor() {
        super(SaveLoadClosedEventName, { bubbles: false, cancelable: true });
    }
}
var PanelOperation;
(function (PanelOperation) {
    PanelOperation[PanelOperation["None"] = 0] = "None";
    PanelOperation[PanelOperation["Query"] = 1] = "Query";
    PanelOperation[PanelOperation["Dialog"] = 2] = "Dialog";
    PanelOperation[PanelOperation["Save"] = 3] = "Save";
    PanelOperation[PanelOperation["Loading"] = 4] = "Loading";
    PanelOperation[PanelOperation["Delete"] = 5] = "Delete";
    PanelOperation[PanelOperation["Close"] = 6] = "Close";
})(PanelOperation || (PanelOperation = {}));
var SaveMenuType;
(function (SaveMenuType) {
    SaveMenuType["LOAD"] = "load";
    SaveMenuType["SAVE"] = "save";
    SaveMenuType["LOAD_CONFIG"] = "load_config";
    SaveMenuType["SAVE_CONFIG"] = "save_config";
})(SaveMenuType || (SaveMenuType = {}));
const mapMenuTypeToTitle = {
    [SaveMenuType.LOAD]: "LOC_SAVE_LOAD_TITLE_LOAD",
    [SaveMenuType.SAVE]: "LOC_SAVE_LOAD_TITLE_SAVE",
    [SaveMenuType.LOAD_CONFIG]: "LOC_SAVE_LOAD_TITLE_LOAD_CONFIG",
    [SaveMenuType.SAVE_CONFIG]: "LOC_SAVE_LOAD_TITLE_SAVE_CONFIG",
};
var SaveTabType;
(function (SaveTabType) {
    SaveTabType["CROSSPLAY"] = "crossplay";
    SaveTabType["LOCAL"] = "local";
    SaveTabType["TRANSITION"] = "transition";
    SaveTabType["AUTOSAVE"] = "autosave";
    SaveTabType["CONFIG"] = "config";
})(SaveTabType || (SaveTabType = {}));
var SortValue;
(function (SortValue) {
    SortValue[SortValue["ALPHA"] = 1] = "ALPHA";
    SortValue[SortValue["TIME_CREATED"] = 2] = "TIME_CREATED";
})(SortValue || (SortValue = {}));
const SORT_ITEMS = [
    { label: 'LOC_TIME_CREATED_TITLE', value: SortValue.TIME_CREATED },
    { label: 'LOC_GAMENAME_TITLE_SORT', value: SortValue.ALPHA },
];
const mapTabTypeToTitle = {
    [SaveTabType.CROSSPLAY]: "LOC_SAVE_LOAD_CROSSPLAYSAVES",
    [SaveTabType.LOCAL]: GameStateStorage.doesPlatformSupportLocalSaves() ? "LOC_SAVE_LOAD_LOCALSAVE" : "LOC_SAVE_LOAD_SAVES",
    [SaveTabType.TRANSITION]: "LOC_SAVE_LOAD_AGETRANSITIONSAVES",
    [SaveTabType.AUTOSAVE]: "LOC_SAVE_LOAD_AUTOSAVES",
    [SaveTabType.CONFIG]: "LOC_SAVE_LOAD_LOCALSAVE",
};
const mapTabTypeToSaveLocation = {
    [SaveTabType.CROSSPLAY]: SaveLocations.FIRAXIS_CLOUD,
    [SaveTabType.LOCAL]: SaveLocations.LOCAL_STORAGE,
    [SaveTabType.TRANSITION]: SaveLocations.LOCAL_STORAGE,
    [SaveTabType.AUTOSAVE]: SaveLocations.LOCAL_STORAGE,
    [SaveTabType.CONFIG]: SaveLocations.LOCAL_STORAGE,
};
const mapTabTypeToSaveFileType = {
    [SaveTabType.CROSSPLAY]: SaveFileTypes.GAME_STATE,
    [SaveTabType.LOCAL]: SaveFileTypes.GAME_STATE,
    [SaveTabType.TRANSITION]: SaveFileTypes.GAME_TRANSITION,
    [SaveTabType.AUTOSAVE]: SaveFileTypes.GAME_STATE,
    [SaveTabType.CONFIG]: SaveFileTypes.GAME_CONFIGURATION,
};
const mapTabTypeToSaveLocationCategories = {
    [SaveTabType.CROSSPLAY]: SaveLocationCategories.NORMAL,
    [SaveTabType.LOCAL]: SaveLocationCategories.NORMAL | SaveLocationCategories.QUICKSAVE,
    [SaveTabType.TRANSITION]: SaveLocationCategories.NORMAL,
    [SaveTabType.AUTOSAVE]: SaveLocationCategories.AUTOSAVE,
    [SaveTabType.CONFIG]: SaveLocationCategories.NORMAL,
};
const NO_SELECTION_INDEX = -2;
const SAVE_CARD_SELECTION_INDEX = -1;
// There exists a font issue in which the character &nnbsp being used is quite wide and not shown correctly.
// Instead just use regular &nbsp.
export function fixupNNBSP(dt) {
    return dt.replaceAll('\u202f', '\u00a0');
}
class ScreenSaveLoad extends Panel {
    constructor(root) {
        super(root);
        this.SMALL_SCREEN_MODE_MAX_HEIGHT = 768;
        this.engineInputListener = this.onEngineInput.bind(this);
        this.tabBarSelectedListener = this.onTabBarSelected.bind(this);
        this.backButtonActionActivateListener = this.onBackButtonActionActivate.bind(this);
        this.deleteButtonActionActivateListener = this.onDeleteButtonActionActivate.bind(this);
        this.overwriteButtonActionActivateListener = this.onOverwriteButtonActionActivate.bind(this);
        this.loadButtonActionActivateListener = this.onLoadButtonActionActivate.bind(this);
        this.saveButtonActionActivateListener = this.onSaveButtonActionActivate.bind(this);
        this.queryDoneListener = this.onQueryDone.bind(this);
        this.cardFocusListener = this.onCardFocus.bind(this);
        this.cardActivateListener = this.onCardActivate.bind(this);
        this.cardConfirmListener = this.onCardConfirm.bind(this);
        this.cardEngineInputListener = this.onCardEngineInput.bind(this);
        this.saveTextboxValidateVirtualKeyboardListener = this.onSaveTextboxValidateVirtualKeyboard.bind(this);
        this.QrCompletedListener = this.onQrAccountLinked.bind(this);
        this.accountUnlinkedListener = this.onQrAccountLinked.bind(this);
        this.linkButtonActivateListener = this.onLinkButtonActivate.bind(this);
        this.sortDropdownActivateListener = this.onSortDropdownActivate.bind(this);
        this.sortDropdownSelectionChangeListener = this.onSortDropdownSelectionChange.bind(this);
        this.sortDropdownFocusListener = this.onSortDropdownFocus.bind(this);
        this.resizeListener = this.onResize.bind(this);
        this.currentPanelOperation = PanelOperation.None;
        this.panelOperationTimeout = 0;
        this.cloudSavesEnabled = Network.cloudSavesEnabled();
        this.isLoggedIn = Network.isLoggedIn();
        this.isFullAccountLinked = Network.isFullAccountLinked();
        this.isLocalCrossplayEnabled = Network.getLocalCrossPlay() && Network.hasCrossPlatformSaveSupport();
        this.selectedSaveIndex = -1;
        this.selectedSortIndex = 0;
        this.dialogId = displayRequestUniqueId();
        this.frame = null;
        this.tabBar = null;
        this.backButton = null;
        this.deleteButton = null;
        this.saveButton = null;
        this.loadButton = null;
        this.overwriteButton = null;
        this.buttonsContainer = null;
        this.actionButtonsContainer = null;
        this.sortDropdown = null;
        this.saveCardContainers = null;
        this.scrollables = null;
        this.loadCardLists = null;
        this.loadCards = [];
        this.saveCard = null;
        this.descriptionContent = null;
        this.descriptionTitle = null;
        this.descriptionThumnail = null;
        this.descriptionThumnailContainer = null;
        this.descriptionHeader = null;
        this.descriptionRequiredModsContainer = null;
        this.descriptionSaveType = null;
        this.descriptionMapDetailTextSaveType = null;
        this.descriptionMapDetailTextDifficulty = null;
        this.descriptionMapDetailTextSpeed = null;
        this.descriptionMapDetailTextRuleset = null;
        this.descriptionMapDetailTextMaptype = null;
        this.descriptionMapDetailTextMapsize = null;
        this.descriptionMapDetailTextVersion = null;
        this.descriptionMapDetailTextCreatedVersionGroup = null;
        this.descriptionMapDetailTextCreatedVersion = null;
        this.descriptionMapDetailTextCreatedTimeGroup = null;
        this.descriptionMapDetailTextCreatedTime = null;
        this.descriptionRequiredMods = null;
        this.missingServices = null;
        this.logedOuts = null;
        this.linkButtons = null;
        this.loadingContainer = null;
        this.loadingDescription = null;
        this.loadingAnimationContainer = null;
        this.animateInType = this.animateOutType = AnchorType.RelativeToRight;
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "save-load");
    }
    onAttach() {
        super.onAttach();
        engine.on('QueryComplete', this.onQueryComplete, this);
        engine.on('SaveComplete', this.onSaveDone, this);
        engine.on('LoadComplete', this.onLoadComplete, this);
        engine.on('RemoveComplete', this.onRemoveComplete, this);
        window.addEventListener(QueryDoneEventName, this.queryDoneListener);
        window.addEventListener('resize', this.resizeListener);
        this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
        if (Network.isConnectedToSSO()) {
            engine.on("QrAccountLinked", this.QrCompletedListener);
            engine.on("AccountUnlinked", this.accountUnlinkedListener);
        }
    }
    onInitialize() {
        this.selectedSortIndex = this.getSortIndexByUserOption();
        this.Root.innerHTML = this.render();
        this.frame = MustGetElement("fxs-frame", this.Root);
        this.tabBar = MustGetElement("fxs-tab-bar", this.Root);
        this.slotGroup = MustGetElement("fxs-slot-group", this.Root);
        this.sortDropdown = MustGetElement(".screen-save__sort-dropdown", this.Root);
        this.backButton = MustGetElement(".screen-save__back-button", this.Root);
        this.deleteButton = MustGetElement(".screen-save__delete-button", this.Root);
        this.overwriteButton = MustGetElement(".screen-save__overwrite-button", this.Root);
        this.saveButton = MustGetElement(".screen-save__save-button", this.Root);
        this.loadButton = MustGetElement(".screen-save__load-button", this.Root);
        this.buttonsContainer = MustGetElement(".screen-save__buttons", this.Root);
        this.actionButtonsContainer = MustGetElement(".screen-save__buttons__actions", this.Root);
        this.descriptionContent = MustGetElement(".screen-save__description__content", this.Root);
        this.descriptionTitle = MustGetElement(".screen-save__description__title", this.Root);
        this.descriptionThumnail = MustGetElement(".screen-save__description__thumnail", this.Root);
        this.descriptionThumnailContainer = MustGetElement(".screen-save__description__thumnail-container", this.Root);
        this.descriptionHeader = MustGetElement(".screen-save__description__header", this.Root);
        this.descriptionRequiredModsContainer = MustGetElement(".screen-save__description__required-mods__container", this.Root);
        this.descriptionSaveType = MustGetElement(".screen-save__description__save-type", this.Root);
        this.descriptionMapDetailTextSaveType = MustGetElement(".screen-save__description__save-type-value", this.Root);
        this.descriptionMapDetailTextDifficulty = MustGetElement(".screen-save__description__difficulty-value", this.Root);
        this.descriptionMapDetailTextSpeed = MustGetElement(".screen-save__description__speed-value", this.Root);
        this.descriptionMapDetailTextRuleset = MustGetElement(".screen-save__description__ruleset-value", this.Root);
        this.descriptionMapDetailTextMaptype = MustGetElement(".screen-save__description__maptype-value", this.Root);
        this.descriptionMapDetailTextMapsize = MustGetElement(".screen-save__description__mapsize-value", this.Root);
        this.descriptionMapDetailTextVersion = MustGetElement(".screen-save__description__version-value", this.Root);
        this.descriptionMapDetailTextCreatedVersionGroup = MustGetElement(".screen-save__description__created-version", this.Root);
        this.descriptionMapDetailTextCreatedVersion = MustGetElement(".screen-save__description__created-version-value", this.Root);
        this.descriptionMapDetailTextCreatedTimeGroup = MustGetElement(".screen-save__description__created-time", this.Root);
        this.descriptionMapDetailTextCreatedTime = MustGetElement(".screen-save__description__created-time-value", this.Root);
        const descriptionScrollable = MustGetElement(".screen-save__description__scrollable", this.Root);
        descriptionScrollable.whenComponentCreated((component) => {
            component.setEngineInputProxy(this.Root);
        });
        this.descriptionRequiredMods = MustGetElement(".screen-save__description__required-mods", this.Root);
        this.loadingContainer = MustGetElement(".screen-save__loading", this.Root);
        this.loadingDescription = MustGetElement(".screen-save__loading__description", this.Root);
        this.loadingAnimationContainer = MustGetElement(".loading-animation-container", this.Root);
        this.saveCardContainers = MustGetElements(".screen-save__save-div", this.Root);
        this.scrollables = MustGetElements(".screen-save__list__scrollable", this.Root);
        this.loadCardLists = MustGetElements(".screen-save__list__load-card", this.Root);
        this.missingServices = MustGetElements(".screen-save__crossplay__missing-service", this.Root);
        this.logedOuts = MustGetElements(".screen-save__crossplay__loged-out", this.Root);
        this.linkButtons = this.Root.querySelectorAll(".screen-save__crossplay__loged-out__link-button");
        this.tabBar.addEventListener("tab-selected", this.tabBarSelectedListener);
        this.deleteButton.addEventListener("action-activate", this.deleteButtonActionActivateListener);
        this.overwriteButton.addEventListener("action-activate", this.overwriteButtonActionActivateListener);
        this.loadButton.addEventListener("action-activate", this.loadButtonActionActivateListener);
        this.saveButton.addEventListener("action-activate", this.saveButtonActionActivateListener);
        this.backButton.addEventListener("action-activate", this.backButtonActionActivateListener);
        this.sortDropdown.addEventListener("action-activate", this.sortDropdownActivateListener);
        this.sortDropdown.addEventListener(DropdownSelectionChangeEventName, this.sortDropdownSelectionChangeListener);
        this.sortDropdown.addEventListener("focus", this.sortDropdownFocusListener);
        Databind.classToggle(this.buttonsContainer, "opacity-0", "g_NavTray.isTrayRequired");
        Databind.classToggle(this.buttonsContainer, "h-4", "g_NavTray.isTrayRequired"); // height to leave empty space for the navtray
        this.updateSortDropdown();
        this.updateActionButtonsContainer();
        this.updateDeleteButton();
        this.updateLoadButton();
        this.updateOverwriteButton();
        this.updateDescriptionContent();
        this.showLoadingAnimation();
    }
    onDetach() {
        clearTimeout(this.panelOperationTimeout);
        window.removeEventListener(QueryDoneEventName, this.queryDoneListener);
        window.removeEventListener('resize', this.resizeListener);
        this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
        engine.off("QrAccountLinked", this.QrCompletedListener);
        engine.off("AccountUnlinked", this.accountUnlinkedListener);
        engine.off('QueryComplete', this.onQueryComplete, this);
        engine.off('SaveComplete', this.onSaveDone, this);
        engine.off('LoadComplete', this.onLoadComplete, this);
        engine.off('RemoveComplete', this.onRemoveComplete, this);
        super.onDetach();
        window.dispatchEvent(new SaveLoadClosedEvent());
    }
    onReceiveFocus() {
        this.focusSlotGroup();
        this.updateNavTray();
        super.onReceiveFocus();
    }
    onSortDropdownFocus() {
        this.focusSlotGroup();
        this.updateNavTray();
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    onResize() {
        this.updateDescriptionContent();
        this.updateFrame();
    }
    onAttributeChanged(name, _oldValue, _newValue) {
        switch (name) {
            case "menu-type":
                this.updateSaveCardContainer();
                this.updateTabBar();
                this.updateFrame();
                this.updateOverwriteButton();
                this.updateLoadButton();
                this.updateSaveButton();
                this.updateNavTray();
                break;
            case "save-type":
                this.updateNavTray();
                break;
        }
    }
    close() {
        if (!this.startOperation(PanelOperation.Close)) {
            return;
        }
        SaveLoadData.clearQueries();
        // clear live event flags, if any
        if (Network.supportsSSO() && Online.LiveEvent.getLiveEventGameFlag()) {
            Online.LiveEvent.clearLiveEventGameFlag();
        }
        super.close();
    }
    getTabItems() {
        const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
        const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? "0");
        const tabItems = [];
        if ([SaveMenuType.LOAD_CONFIG, SaveMenuType.SAVE_CONFIG].includes(saveType)) {
            tabItems.push({
                id: SaveTabType.CONFIG,
                label: mapTabTypeToTitle[SaveTabType.CONFIG],
            });
            return tabItems;
        }
        tabItems.push({
            id: SaveTabType.LOCAL,
            label: mapTabTypeToTitle[SaveTabType.LOCAL],
        });
        if (saveType == SaveMenuType.LOAD) {
            tabItems.push({
                id: SaveTabType.AUTOSAVE,
                label: mapTabTypeToTitle[SaveTabType.AUTOSAVE],
            });
        }
        if (serverType != ServerType.SERVER_TYPE_WIRELESS && this.isLocalCrossplayEnabled) {
            tabItems.push({ id: SaveTabType.CROSSPLAY, label: mapTabTypeToTitle[SaveTabType.CROSSPLAY] });
        }
        return tabItems;
    }
    getThumnail(hostAge) {
        const ageParameter = GameSetup.findGameParameter('Age');
        const bannerName = GameSetup.findString('Banner');
        const hostAgeParameter = ageParameter?.domain.possibleValues?.find((possibleValue) => possibleValue.value?.toString() == hostAge);
        const banner = hostAgeParameter?.additionalProperties?.find((additionalProperty) => additionalProperty.name == bannerName)?.value;
        if (typeof (banner) == 'string') {
            return `fs://game/${banner}`;
        }
        return 'fs://game/Skyline_Sm';
    }
    getNewSaveNameDefault() {
        const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
        if ([SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(saveType)) {
            return "";
        }
        else if (saveType == SaveMenuType.SAVE_CONFIG) {
            return Locale.compose("LOC_SAVE_GAME_CONFIG_DEFAULT");
        }
        const player = Players.get(GameContext.localPlayerID);
        const leader = GameInfo.Leaders.lookup(player?.leaderType ?? "");
        const leaderName = Locale.compose(leader?.Name ?? "LOC_LEADER_NONE_NAME");
        const leaderLastName = leaderName.split(" ").slice(-1).pop();
        const age = GameInfo.Ages.lookup(Game.age);
        const ageName = Locale.compose(age?.Name ?? "LOC_AGE_ANTIQUITY_NAME");
        const shortAgeName = ageName.slice(0, 3);
        const turn = Game.turn;
        return `${leaderLastName}${shortAgeName}${turn}`;
    }
    getIsAtMaxSaveCount() {
        const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
        const saveType = Number.parseInt(this.Root.getAttribute("save-type") ?? "0");
        return Network.isAtMaxSaveCount({
            Location: mapTabTypeToSaveLocation[selectedSlot],
            LocationCategories: mapTabTypeToSaveLocationCategories[selectedSlot],
            Type: saveType,
            ContentType: mapTabTypeToSaveFileType[selectedSlot],
        });
    }
    getSortIndexByUserOption() {
        const sortValue = Configuration.getUser().saveLoadSortDefault;
        return SORT_ITEMS.findIndex(({ value }) => value == sortValue);
    }
    getCurrentSaveGameInfo() {
        const saveType = Number.parseInt(this.Root.getAttribute("save-type") ?? "0");
        const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
        const saveName = this.saveCard?.getAttribute("value") || this.getNewSaveNameDefault();
        const { gameName, ruleSetName, gameSpeedName, difficultyName } = Configuration.getGame();
        const { mapSizeTypeName, mapSizeName } = Configuration.getMap();
        return {
            ...DEFAULT_SAVE_GAME_INFO,
            gameName: gameName ?? "",
            hostDifficultyName: difficultyName ?? "",
            gameSpeedName: gameSpeedName ?? "",
            rulesetName: ruleSetName ?? "",
            mapScriptName: mapSizeTypeName ?? "",
            mapSizeName: mapSizeName ?? "",
            savedByVersion: BuildInfo.version.display,
            isCurrentGame: true,
            fileName: saveName,
            displayName: saveName,
            type: saveType,
            location: mapTabTypeToSaveLocation[selectedSlot],
            contentType: mapTabTypeToSaveFileType[selectedSlot],
        };
    }
    getSelectedSaveGameInfo() {
        const saveMenuType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
        if (this.selectedSaveIndex == SAVE_CARD_SELECTION_INDEX && [SaveMenuType.SAVE, SaveMenuType.SAVE_CONFIG].includes(saveMenuType)) {
            return this.getCurrentSaveGameInfo();
        }
        if (this.selectedSaveIndex >= 0 && this.selectedSaveIndex < SaveLoadData.saves.length) {
            return SaveLoadData.saves[this.selectedSaveIndex];
        }
        return DEFAULT_SAVE_GAME_INFO;
    }
    isCrossplayReady() {
        return Network.isConnectedToNetwork() && this.cloudSavesEnabled && this.isLoggedIn && this.isFullAccountLinked && this.isLocalCrossplayEnabled;
    }
    createLoadCards(saveTabType) {
        return SaveLoadData.saves.map((save, index) => {
            const elem = document.createElement("save-load-chooser-item");
            elem.classList.add("screen-save__load-card", "mr-3");
            elem.classList.toggle("mb-3", index < SaveLoadData.saves.length - 1);
            elem.setAttribute("tabindex", "-1");
            elem.setAttribute("index", `${index}`);
            elem.setAttribute("type", "load");
            elem.setAttribute("saveTabType", `${saveTabType}`);
            elem.setAttribute('select-highlight', 'true');
            elem.setAttribute("node", JSON.stringify({
                primaryIcon: saveTabType == SaveTabType.CONFIG ? "" : save.civIconUrl,
                secondaryIcon: saveTabType == SaveTabType.CONFIG ? "" : save.leaderIconUrl,
                primaryColor: save.civBackgroundColor,
                secondaryColor: save.civForegroundColor,
                name: save.gameName,
                description1: [SaveTabType.TRANSITION, SaveTabType.CONFIG].includes(saveTabType) ? '' : `${Locale.unpack(save.hostAgeName)} | ${Locale.compose("LOC_SAVE_LOAD_TURN", save.currentTurn)} | ${save.currentTurnDate}`,
                description2: saveTabType == SaveTabType.CONFIG ? '' : save.saveActionName,
                time: save.saveTimeDayName,
                hour: fixupNNBSP(save.saveTimeHourName),
            }));
            return elem;
        });
    }
    createSaveCard(saveTabType) {
        const menuType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
        const elem = document.createElement("save-load-chooser-item");
        elem.classList.add("screen-save__save-card", "mr-3", "mb-3");
        elem.classList.toggle("hidden", [SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(menuType));
        elem.setAttribute("tabindex", "-1");
        elem.setAttribute("index", `${SAVE_CARD_SELECTION_INDEX}`);
        elem.setAttribute("type", "save");
        elem.setAttribute("saveTabType", `${saveTabType}`);
        elem.setAttribute('select-highlight', 'true');
        elem.setAttribute("node", JSON.stringify({
            initialValue: this.getNewSaveNameDefault()
        }));
        return elem;
    }
    renderMissingService() {
        return `
			<div class="font-body text-base text-accent-4" data-l10n-id="LOC_SAVE_LOAD_CROSSPLAY_MISSING_2K_CLOUD_SERVICE_1"></div>
			<div class="font-body text-base text-accent-4" data-l10n-id="LOC_SAVE_LOAD_CROSSPLAY_MISSING_2K_CLOUD_SERVICE_2"></div>
		`;
    }
    renderLogedOut(saveTabType) {
        // check online status to determine what message to put on.
        let isConnectedToNetwork = Network.isConnectedToNetwork();
        let isLoggedIn = Network.isLoggedIn();
        let isFullyLinked = Network.isFullAccountLinked();
        let isLinked = Network.isAccountLinked();
        let isComplete = Network.isAccountComplete();
        if (!isConnectedToNetwork || (!Network.isConnectedToSSO() && !Network.isAuthenticated())) {
            return `
			<fxs-vslot class="flex flow-column items-center mb-3" data-navrule-down="stop">
				<div class="font-body text-base text-accent-4" data-l10n-id="LOC_UI_OFFLINE_ACCOUNT_TITLE"></div>
				<div class="font-body text-base text-accent-4" data-l10n-id="LOC_UI_CONNECTION_FAILED"></div>
			</fxs-vslot>
		`;
        }
        else if (!isLoggedIn) {
            return `
			<fxs-vslot class="flex flow-column items-center mb-3" data-navrule-down="stop">
				<div class="font-body text-base text-accent-4" data-l10n-id="LOC_UI_LOGIN_ACCOUNT_TITLE"></div>
			</fxs-vslot>
		`;
        }
        else if (isLinked && !isComplete) {
            return `
			<fxs-vslot class="flex flow-column items-center mb-3" data-navrule-down="stop">
				<div class="font-body text-base text-accent-4" data-l10n-id="LOC_SAVE_LOAD_CROSSPLAY_MISSING_SSO_1_A"></div>
				<div class="font-body text-base text-accent-4" data-l10n-id="LOC_SAVE_LOAD_CROSSPLAY_MISSING_SSO_2"></div>
			</fxs-vslot>
			<fxs-button tabindex="-1" class="screen-save__crossplay__loged-out__link-button" saveTabType="${saveTabType}" caption="LOC_SAVE_LOAD_COMPLETE_2K_ACCOUNT"></fxs-button>
		`;
        }
        else if (!isFullyLinked) {
            return `
			<fxs-vslot class="flex flow-column items-center mb-3" data-navrule-down="stop">
				<div class="font-body text-base text-accent-4" data-l10n-id="LOC_SAVE_LOAD_CROSSPLAY_MISSING_SSO_1"></div>
				<div class="font-body text-base text-accent-4" data-l10n-id="LOC_SAVE_LOAD_CROSSPLAY_MISSING_SSO_2"></div>
			</fxs-vslot>
			<fxs-button tabindex="-1" class="screen-save__crossplay__loged-out__link-button" saveTabType="${saveTabType}" caption="LOC_SAVE_LOAD_CONNECT_2K_ACCOUNT"></fxs-button>
		`;
        }
        else {
            return '';
        }
    }
    render() {
        const menuType = this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD;
        return `
			<fxs-frame class="screen-save__frame flow-column h-full w-full">
				<fxs-header class="text-center font-title-2xl text-secondary" filigree-style="none" title="${mapMenuTypeToTitle[menuType]}"></fxs-header>
				<div class="flow-column flex-auto mt-6">
					<div class="flow-row flex-auto relative">
						<div class="screen-save__list__content flow-column h-full w-2\\/3">
							<div class="flow-row justify-center mr-8 px-2">
								<fxs-tab-bar tab-for=".screen-save__list__content" alt-controls="false" class="flex-1" tab-item-class="mx-4" tab-items='${JSON.stringify(this.getTabItems())}'></fxs-tab-bar>
							</div>
							<div class="relative flex-auto flow-column mt-4 mr-8">
								<fxs-slot-group class="flex-auto flow-column">
									${this.getTabItems().map(item => `
										<fxs-vslot ignore-prior-focus="true" disable-focus-allowed="true" id="${item.id}" class="absolute inset-0 flow-column justify-center screen-save__list__slot">
											<fxs-scrollable class="screen-save__list__scrollable w-full flex-auto" saveTabType="${item.id}" handle-gamepad-pan="false">
												<div class="screen-save__save-div" saveTabType="${item.id}"></div>
												<div class="screen-save__list__load-card mb-0" saveTabType="${item.id}"></div>
											</fxs-scrollable>
											<div class="screen-save__crossplay__missing-service hidden w-full flex flow-column justify-center items-center" saveTabType="${item.id}"></div>
											<div class="screen-save__crossplay__loged-out hidden w-full flex flow-column justify-center items-center" saveTabType="${item.id}"></div>
										</fxs-vslot>
									`).join("")}
								</fxs-slot-group>
								<div class="screen-save__loading absolute inset-0 flow-column justify-center items-center transition-opacity opacity-0 pointer-events-none" tabindex="-1">
									<div class="absolute -inset-y-1 -inset-x-4 bg-accent-6 opacity-45" style="border-radius: 4px;"></div>
									<div class="loading-animation-container relative inset-0 flow-row justify-center items-center"></div>
									<div class="screen-save__loading__description font-body text-base text-center text-accent-2 mt-4 z-1"></div>
								</div>
							</div>
						</div>
						<div class="flow-column w-1\\/3">
							<div class="screen-save__sort-dropdow-container flow-row items-end">
								<fxs-dropdown 
									class="screen-save__sort-dropdown"
									no-selection-caption="LOC_SORT_DROPDOWN_NO_SELECTION"
									selection-caption="LOC_SORT_DROPDOWN_SELECTION"
									disabled-cursor-allowed="true"
									dropdown-items='${JSON.stringify(SORT_ITEMS)}'
									selected-item-index="0"
									label-class="font-fit-shrink truncate"
									action-key="inline-shell-action-2"
									nav-help-side-reversed="true"
								></fxs-dropdown>
							</div>
							<fxs-inner-frame class="flex-auto flow-column py-4 px-6 mt-4">
								
								<div class="screen-save__description__content flex-auto w-full flex flow-column">
									<div class="flow-row justify-center">
										<fxs-header filigree-style="h2" class="screen-save__description__title normal-case text-center font-title-xl text-secondary flex flex-auto" text-class="max-h-18" font-fit-mode="shrink" wrap="break" title="${DEFAULT_SAVE_GAME_INFO.gameName}"></fxs-header>
									</div>
									
									<fxs-scrollable class="w-full flex-auto screen-save__description__scrollable" handle-gamepad-pan="true">
										<div class="flow-column items-center w-full mt-3">
											<div class="screen-save__description__thumnail-container w-full h-44 flow-row mb-5">
												<div class="screen-save__description__thumnail bg-bottom bg-cover bg-no-repeat mx-4 flex-auto" style="background-image:url('${this.getThumnail(DEFAULT_SAVE_GAME_INFO.hostAge)}');"></div>
											</div>
											<div class="screen-save__description__save-type w-full flow-row justify-center">
												<div class="screen-save__description__save-type-value font-body text-base text-accent-2 mb-3">${Locale.compose(DEFAULT_SAVE_GAME_INFO.saveActionName)}</div>
											</div>
											<div class="flex flow-column w-full">
												<div class="flex flow-column items-center mb-5 w-full">
													<fxs-header class="screen-save__description__header capitalize mb-5 font-title-base text-secondary" filigree-style="h4" title="LOC_SAVE_LOAD_DETAILS_MAP_INFO_TITLE"></fxs-header>
													<div class="screen-save__description__map-details flow-column w-full">
														<div role="paragraph" class="screen-save__description__difficulty w-full flow-row justify-center items-center pointer-events-auto">
															<div class="screen-save__description__difficulty-label font-body text-accent-2 flex-1 text-right font-fit-shrink truncate" data-l10n-id="LOC_SAVE_LOAD_DETAILS_DIFFICULTY"></div>
															<div class="screen-save__description__difficulty-value font-body text-base text-accent-2 ml-2 flex-1 flow-row items-end font-fit-shrink truncate">${Locale.unpack(DEFAULT_SAVE_GAME_INFO.hostDifficultyName)}</div>
														</div>
														<div role="paragraph" class="screen-save__description__speed w-full flow-row justify-center items-center pointer-events-auto">
															<div class="screen-save__description__speed-label font-body text-accent-2 flex-1 text-right font-fit-shrink truncate" data-l10n-id="LOC_SAVE_LOAD_DETAILS_SPEED"></div>
															<div class="screen-save__description__speed-value font-body text-base text-accent-2 ml-2 flex-1 flow-row items-end font-fit-shrink truncate">${Locale.unpack(DEFAULT_SAVE_GAME_INFO.gameSpeedName)}</div>
														</div>
														<div role="paragraph" class="screen-save__description__ruleset w-full flow-row justify-center items-center pointer-events-auto">
															<div class="screen-save__description__ruleset-label font-body text-accent-2 flex-1 text-right font-fit-shrink truncate" data-l10n-id="LOC_SAVE_LOAD_DETAILS_RULE_SET"></div>
															<div class="screen-save__description__ruleset-value font-body text-base text-accent-2 ml-2 flex-1 flow-row items-end font-fit-shrink truncate">${Locale.unpack(DEFAULT_SAVE_GAME_INFO.rulesetName)}</div>
														</div>
														<div role="paragraph" class="screen-save__description__maptype w-full flow-row justify-center items-center pointer-events-auto">
															<div class="screen-save_description__maptype-label font-body text-accent-2 flex-1 text-right font-fit-shrink truncate" data-l10n-id="LOC_SAVE_LOAD_DETAILS_MAP_TYPE"></div>
															<div class="screen-save__description__maptype-value font-body text-base text-accent-2 ml-2 flex-1 flow-row items-end font-fit-shrink truncate">${Locale.unpack(DEFAULT_SAVE_GAME_INFO.mapScriptName)}</div>
														</div>
														<div role="paragraph" class="screen-save__description__mapsize w-full flow-row justify-center items-center pointer-events-auto">
															<div class="screen-save_description__mapsize-label font-body text-accent-2 flex-1 text-right font-fit-shrink truncate" data-l10n-id="LOC_SAVE_LOAD_DETAILS_MAP_SIZE"></div>
															<div class="screen-save__description__mapsize-value font-body text-base text-accent-2 ml-2 flex-1 flow-row items-end font-fit-shrink truncate">${Locale.unpack(DEFAULT_SAVE_GAME_INFO.mapSizeName)}</div>
														</div>
														<div role="paragraph" class="screen-save__description__created-time w-full flow-row justify-center items-center pointer-events-auto">
															<div class="screen-save__description__created-time-label font-body text-accent-2 flex-1 text-right font-fit-shrink truncate" data-l10n-id="LOC_SAVE_LOAD_DETAILS_CREATED_TIME"></div>
															<div class="screen-save__description__created-time-value font-body text-base text-accent-2 ml-2 flex-1 flow-row items-end font-fit-shrink truncate">${DEFAULT_SAVE_GAME_INFO.createdTime}</div>
														</div>
														<div role="paragraph" class="screen-save__description__created-version w-full flow-row justify-center items-center pointer-events-auto">
															<div class="screen-save__description__created-version-label font-body text-accent-2 flex-1 text-right font-fit-shrink truncate" data-l10n-id="LOC_SAVE_LOAD_DETAILS_CREATED_BY_VERSION"></div>
															<div class="screen-save__description__created-version-value font-body text-base text-accent-2 ml-2 flex-1 flow-row items-end font-fit-shrink truncate">${DEFAULT_SAVE_GAME_INFO.createdByVersion}</div>
														</div>
														<div role="paragraph" class="screen-save__description__version w-full flow-row justify-center items-center pointer-events-auto">
															<div class="screen-save__description__version-label font-body text-accent-2 flex-1 text-right font-fit-shrink truncate" data-l10n-id="LOC_SAVE_LOAD_DETAILS_SAVED_BY_VERSION"></div>
															<div class="screen-save__description__version-value font-body text-base text-accent-2 ml-2 flex-1 flow-row items-end font-fit-shrink truncate">${DEFAULT_SAVE_GAME_INFO.savedByVersion}</div>
														</div>
													</div>
												</div>
												<div class="screen-save__description__required-mods__container flex flow-column items-center">
													<fxs-header class="capitalize mb-5 font-title-base text-secondary" filigree-style="h4" title="LOC_SAVE_LOAD_DETAILS_ADDITIONAL_CONTENT_TITLE" font-fit-mode="shrink" font-min-size="11px"></fxs-header>
													<p class="screen-save__description__required-mods font-body text-base text-center text-accent-2 w-full">${Locale.stylize(DEFAULT_SAVE_GAME_INFO.requiredModsString)}</p>
												</div>
											</div>
										</div>
									</fxs-scrollable>
								</div>
							</fxs-inner-frame>
						</div>
					</div>
					<div class="screen-save__buttons flow-row items-end h-19">
						<fxs-button 
							class="screen-save__button screen-save__back-button mr-4" 
							caption="LOC_SAVE_LOAD_BACK_BUTTON"
							action-key="inline-cancel"
							data-audio-group-ref="save-load"
							data-audio-activate-ref="none"
						></fxs-button>
						<div class="screen-save__buttons__actions flex flow-row flex-auto items-end">
							<div class="flex flow-row flex-auto">
								<fxs-button 
									class="screen-save__button screen-save__delete-button disabled mr-4" 
									caption="LOC_SAVE_LOAD_DELETE_BUTTON"
									data-audio-group-ref="save-load"
									data-audio-activate-ref="data-audio-delete-activated"
									action-key="inline-shell-action-1"
								></fxs-button>
								<fxs-button
									class="screen-save__button screen-save__overwrite-button disabled mr-4" 
									caption="LOC_SAVE_LOAD_OVERWRITE_BUTTON"
									data-audio-group-ref="save-load"
									data-audio-activate-ref="data-audio-overwrite-activated"
								></fxs-button>
							</div>
							<fxs-hero-button 
								class="screen-save__button screen-save__load-button disabled" 
								caption="LOC_SAVE_LOAD_LOAD_BUTTON"
								data-audio-group-ref="save-load"
								data-audio-activate-ref="data-audio-load-activated"
								action-key="inline-accept"
							></fxs-hero-button>
							<fxs-hero-button 
								class="screen-save__button screen-save__save-button" 
								caption="LOC_SAVE_LOAD_SAVE_BUTTON"
								action-key="inline-accept"
								data-audio-group-ref="save-load"
								data-audio-activate-ref="data-audio-save-activated"
							></fxs-hero-button>
						</div>
					</div>
				</div>
			</fxs-frame>
		`;
    }
    onCardFocus({ target }) {
        this.selectedSaveIndex = parseInt((target).getAttribute("index") ?? `${SAVE_CARD_SELECTION_INDEX}`);
        this.updateCardSelection();
        this.updateDescriptionContent();
        this.updateLoadButton();
        this.updateOverwriteButton();
        this.updateDeleteButton();
        this.updateSaveButton();
        this.updateNavTray();
    }
    onCardActivate(event) {
        const { target } = event;
        if (ActionHandler.isGamepadActive) {
            const { isAutosave, isQuicksave, isCurrentGame } = this.getSelectedSaveGameInfo();
            const menuType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
            if ([SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(menuType)) {
                this.onLoadButtonActionActivate(event);
            }
            else {
                if (isCurrentGame) {
                    if (UI.canDisplayKeyboard()) {
                        target.querySelector("fxs-textbox")?.setAttribute("activated", "true");
                    }
                    else {
                        this.onSaveButtonActionActivate(event);
                    }
                }
                else if (!isAutosave && !isQuicksave) {
                    this.onOverwriteButtonActionActivate(event);
                }
            }
        }
        else if (target.getAttribute("index") == `${SAVE_CARD_SELECTION_INDEX}`) {
            const input = target.querySelector("input");
            input?.focus();
            input?.setSelectionRange(-1, -1); // set the cursor at the end of the input value
        }
        else {
            target.focus();
        }
    }
    onCardConfirm(event) {
        const { isAutosave, isQuicksave, isCurrentGame } = this.getSelectedSaveGameInfo();
        const menuType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
        if ([SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(menuType)) {
            this.onLoadButtonActionActivate(event);
        }
        else if (!isCurrentGame && !isAutosave && !isQuicksave) {
            this.onOverwriteButtonActionActivate(event);
        }
    }
    onEngineInput(inputEvent) {
        if (!this.handleEngineInput(inputEvent)) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        ;
    }
    handleEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return true;
        }
        if (inputEvent.isCancelInput()) {
            this.close();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
            return false;
        }
        switch (inputEvent.detail.name) {
            case 'cancel':
            case 'keyboard-escape':
                this.close();
                return false;
        }
        return true;
    }
    onCardEngineInput(event) {
        if (!this.handleCardEngineInput(event)) {
            event.stopPropagation();
            event.preventDefault();
        }
        ;
    }
    handleCardEngineInput(event) {
        const { detail: { status, name, x, y } } = event;
        if (status != InputActionStatuses.FINISH) {
            return true;
        }
        const { isCurrentGame } = this.getSelectedSaveGameInfo();
        switch (name) {
            case 'shell-action-1':
                if (!isCurrentGame) {
                    this.onDeleteButtonActionActivate(event);
                }
                return false;
            case 'shell-action-2':
                this.sortDropdown?.dispatchEvent(new ActionActivateEvent(x, y));
                return false;
        }
        return true;
    }
    onSaveTextboxValidateVirtualKeyboard(event) {
        this.onSaveButtonActionActivate(event);
    }
    onLinkButtonActivate(_event) {
        if (Network.canDisplayQRCode()) {
            ContextManager.push("screen-mp-link-account", { singleton: true, createMouseGuard: true });
        }
    }
    onQrAccountLinked() {
        ContextManager.pop("screen-mp-link-account");
        this.cloudSavesEnabled = Network.cloudSavesEnabled();
        this.isLoggedIn = Network.isLoggedIn();
        this.isFullAccountLinked = Network.isFullAccountLinked();
        this.isLocalCrossplayEnabled = Network.getLocalCrossPlay() && Network.hasCrossPlatformSaveSupport();
        this.updateTabTypeMissingService(SaveTabType.CROSSPLAY);
        this.updateTabTypeLogedOut(SaveTabType.CROSSPLAY);
        this.updateTabTypeScrollable(SaveTabType.CROSSPLAY);
        this.updateActionButtonsContainer();
        this.startQuery();
        this.updateNavTray();
    }
    onQueryDone(_event) {
        this.sortSaveGames(SaveLoadData.saves);
        this.updateSaveCardContainer();
        this.resetPanelOperation();
        this.focusSlotGroup();
    }
    updateControls(isClear = false) {
        this.updateLoadCardList(isClear);
        this.updateSaveCard();
        this.updateTabBar();
        this.updateLoadingContainer();
        this.updateLoadingDescription();
        this.updateDeleteButton();
        this.updateLoadButton();
        this.updateOverwriteButton();
        this.updateSaveButton();
        this.updateBackButton();
        this.updateSortDropdown();
    }
    onRemoveComplete({ result }) {
        clearTimeout(this.panelOperationTimeout);
        if (result == SerializerResult.RESULT_PENDING) {
            return;
        }
        switch (result) {
            case SerializerResult.RESULT_OK:
                this.currentPanelOperation = PanelOperation.None;
                this.startQuery();
                break;
            default:
                this.resetPanelOperation();
                this.createGenericDeleteErrorConfirm();
        }
    }
    onQueryComplete({ result }) {
        switch (result) {
            case SerializerResult.RESULT_PENDING:
                return;
            case SerializerResult.RESULT_OK:
                break;
            default:
                this.createGenericQueryErrorConfirm();
        }
    }
    onSaveDone({ result }) {
        if (this.currentPanelOperation != PanelOperation.Save) {
            // this can happen in the main menu with the task scheduler updating the cloud saves
            // in that case just ignore the save event
            return;
        }
        clearTimeout(this.panelOperationTimeout);
        if (result == SerializerResult.RESULT_PENDING) {
            return;
        }
        switch (result) {
            case SerializerResult.RESULT_INVALID_CHARACTERS:
                this.resetPanelOperation();
                this.createSaveInvalidCharactersConfirm();
                break;
            case SerializerResult.RESULT_SAVE_LOCATION_FULL:
                this.resetPanelOperation();
                SaveLoadData.createLocationFullConfirm();
                break;
            case SerializerResult.RESULT_SAVE_QUOTA_EXCEEDED: // Xbox only, save failed
                this.resetPanelOperation();
                SaveLoadData.createQuotaExceededConfirm();
                break;
            case SerializerResult.RESULT_SAVE_ALREADY_EXISTS:
                this.currentPanelOperation = PanelOperation.None;
                this.createOverwriteConfirmationDialog();
                break;
            case SerializerResult.RESULT_OK:
                this.currentPanelOperation = PanelOperation.None;
                if (this.Root.getAttribute("from-invite")) {
                    SystemMessageManager.acceptInviteAfterSaveComplete();
                }
                this.close();
                break;
            default:
                this.resetPanelOperation();
                this.createGenericSaveErrorConfirm();
        }
    }
    onLoadComplete({ result }) {
        clearTimeout(this.panelOperationTimeout);
        if (result == SerializerResult.RESULT_PENDING) {
            return;
        }
        switch (result) {
            case SerializerResult.RESULT_VERSION_MISMATCH:
                this.createVersionMismatchLoadErrorConfirm();
                break;
            case SerializerResult.RESULT_OK:
                this.currentPanelOperation = PanelOperation.None;
                this.close();
                break;
            default:
                console.warn(`screen-save-load: generic error on load on unhandled error code: ${result}`);
                this.createGenericLoadErrorConfirm();
                break;
        }
    }
    onTabBarSelected(event) {
        const { detail: { selectedItem: { id } } } = event;
        this.slotGroup?.setAttribute("selected-slot", id);
        this.selectedSaveIndex = NO_SELECTION_INDEX;
        this.updateDescriptionContent();
        this.updateSortDropdown();
        this.updateTabTypeMissingService(id);
        this.updateTabTypeLogedOut(id);
        this.updateTabTypeScrollable(id);
        this.updateActionButtonsContainer();
        this.updateNavTray();
        this.updateSaveCardContainer();
        if (id == SaveTabType.CROSSPLAY && !this.isCrossplayReady()) {
            this.focusSlotGroup();
            this.updateNavTray();
        }
        else {
            this.startQuery(true);
        }
    }
    onBackButtonActionActivate(_event) {
        this.close();
    }
    onDeleteButtonActionActivate(event) {
        if (this.currentPanelOperation != PanelOperation.None) {
            return;
        }
        this.createDeleteConfirmationDialog();
        event.stopPropagation();
        event.preventDefault();
    }
    onLoadButtonActionActivate(event) {
        if (this.currentPanelOperation != PanelOperation.None) {
            return;
        }
        const currentSaveGameInfo = this.getSelectedSaveGameInfo();
        const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? "0");
        // Do not load if missing mods.
        const hasMissingMods = currentSaveGameInfo.missingMods.length > 0;
        const hasUnownedMods = currentSaveGameInfo.unownedMods.length > 0;
        let canLoad = !hasMissingMods;
        // Ignore ownership for MP.
        if (canLoad) {
            switch (serverType) {
                case ServerType.SERVER_TYPE_LAN:
                case ServerType.SERVER_TYPE_WIRELESS:
                case ServerType.SERVER_TYPE_INTERNET:
                case ServerType.SERVER_TYPE_HOTSEAT:
                case ServerType.SERVER_TYPE_FIRAXIS_CLOUD:
                    canLoad = true;
                    break;
                case ServerType.SERVER_TYPE_NONE:
                    canLoad = !hasUnownedMods;
                    break;
                default:
                    console.warn(`Unknown server type - ${serverType}.`);
                    canLoad = !hasUnownedMods;
                    break;
            }
        }
        const { isGameStarted } = Configuration.getGame();
        if (!canLoad) {
            let dialogBody = `{LOC_SAVE_LOAD_CONTENT_ERROR}`;
            const MAX_MODS_TO_SHOW = 10;
            if (currentSaveGameInfo.missingMods.length + currentSaveGameInfo.unownedMods.length <= MAX_MODS_TO_SHOW) {
                dialogBody += '[BLIST]';
                for (let mod of currentSaveGameInfo.missingMods) {
                    dialogBody += `[LI]&nbsp;${mod}`;
                }
                for (let mod of currentSaveGameInfo.unownedMods) {
                    dialogBody += `[LI]&nbsp;${mod}`;
                }
                dialogBody += '[/LIST]';
            }
            DialogManager.createDialog_Confirm({
                dialogId: this.dialogId,
                body: dialogBody,
                title: "LOC_SAVE_LOAD_CONTENT_ERROR_TITLE",
                canClose: false,
            });
        }
        else if (isGameStarted) {
            this.createLoadConfirmationDialog();
        }
        else {
            this.loadSave(currentSaveGameInfo, serverType);
        }
        event.stopPropagation();
        event.preventDefault();
    }
    loadSave(saveGameInfo, serverType) {
        if (!this.startOperation(PanelOperation.Loading)) {
            return;
        }
        if (SaveLoadData.handleLoadSave(saveGameInfo, serverType)) {
            this.panelOperationTimeout = setTimeout(() => {
                this.resetPanelOperation();
                this.createGenericLoadErrorConfirm();
            }, 10000); // 10sec of loading before giving back the control to the user
        }
        else {
            this.resetPanelOperation();
            this.createGenericLoadErrorConfirm();
        }
        ;
    }
    onOverwriteButtonActionActivate(event) {
        if (this.currentPanelOperation != PanelOperation.None) {
            return;
        }
        this.createOverwriteConfirmationDialog();
        event.stopPropagation();
        event.preventDefault();
    }
    onSaveButtonActionActivate(event) {
        const isAtMaxSaveCount = this.getIsAtMaxSaveCount();
        if (isAtMaxSaveCount || this.currentPanelOperation != PanelOperation.None) {
            return;
        }
        this.startSave();
        event.stopPropagation();
        event.preventDefault();
    }
    onSortDropdownActivate(_event) {
        waitForLayout(() => this.updateNavTray());
    }
    onSortDropdownSelectionChange({ detail: { selectedIndex } }) {
        this.selectedSortIndex = selectedIndex;
        this.saveSelectedSortValueToUserOption();
        this.sortSaveGames(SaveLoadData.saves);
        this.updateLoadCardList();
        this.focusSlotGroup();
    }
    focusSlotGroup() {
        FocusManager.setFocus(this.slotGroup);
        if (!ActionHandler.isGamepadActive) {
            const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
            const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
            if ([SaveMenuType.SAVE, SaveMenuType.SAVE_CONFIG].includes(saveType)) {
                this.saveCard?.focus();
            }
            else {
                const loadCardList = Array.from(this.loadCardLists ?? []).find(loadCardList => loadCardList.getAttribute("saveTabType") == selectedSlot);
                loadCardList?.firstChild?.focus();
            }
        }
        this.updateNavTray();
    }
    saveSelectedSortValueToUserOption() {
        Configuration.getUser().setSaveLoadSortDefault(SORT_ITEMS[this.selectedSortIndex]?.value ?? SortValue.TIME_CREATED);
    }
    resetPanelOperation() {
        this.currentPanelOperation = PanelOperation.None;
        this.updateControls();
    }
    startOperation(operation) {
        if (![PanelOperation.None, PanelOperation.Query].includes(this.currentPanelOperation)) {
            return false;
        }
        this.currentPanelOperation = operation;
        this.updateControls();
        return true;
    }
    startQuery(isReset = false) {
        if (!this.startOperation(PanelOperation.Query)) {
            return;
        }
        const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
        const saveType = Number.parseInt(this.Root.getAttribute("save-type") ?? "0");
        SaveLoadData.querySaveGameList(mapTabTypeToSaveLocation[selectedSlot], selectedSlot == SaveTabType.TRANSITION ? SaveTypes.WORLDBUILDER_MAP : saveType, mapTabTypeToSaveLocationCategories[selectedSlot], mapTabTypeToSaveFileType[selectedSlot], { isOverwriteQueryIds: true });
        this.updateControls(isReset);
        FocusManager.setFocus(this.loadingContainer);
        this.updateNavTray();
    }
    startDelete() {
        if (!this.startOperation(PanelOperation.Delete)) {
            return;
        }
        const focusedSaveGameInfo = this.getSelectedSaveGameInfo();
        FocusManager.setFocus(this.loadingContainer);
        this.updateNavTray();
        if (SaveLoadData.handleDelete(focusedSaveGameInfo)) {
            this.panelOperationTimeout = setTimeout(() => {
                this.resetPanelOperation();
                this.createGenericDeleteErrorConfirm();
            }, 10000); // 10sec of deleting before giving back the control to the user
        }
        else {
            this.resetPanelOperation();
            this.createGenericDeleteErrorConfirm();
        }
    }
    startSave() {
        if (!this.startOperation(PanelOperation.Save)) {
            return;
        }
        const saveType = Number.parseInt(this.Root.getAttribute("save-type") ?? "0");
        const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
        const fileName = this.saveCard?.getAttribute("value") || this.getNewSaveNameDefault();
        FocusManager.setFocus(this.loadingContainer);
        this.updateNavTray();
        if (SaveLoadData.handleSave(fileName, saveType, mapTabTypeToSaveLocation[selectedSlot], mapTabTypeToSaveFileType[selectedSlot])) {
            this.panelOperationTimeout = setTimeout(() => {
                this.resetPanelOperation();
                this.createGenericSaveErrorConfirm();
            }, 10000); // 10sec of saving before giving back the control to the user
        }
        else {
            this.resetPanelOperation();
            this.createGenericSaveErrorConfirm();
        }
    }
    startOverwriting() {
        if (!this.startOperation(PanelOperation.Save)) {
            return;
        }
        const { fileName, displayName, location, type, contentType } = this.getSelectedSaveGameInfo();
        const saveFileName = location == SaveLocations.LOCAL_STORAGE ? fileName : displayName;
        FocusManager.setFocus(this.loadingContainer);
        this.updateNavTray();
        if (SaveLoadData.handleOverwrite(saveFileName, type, location, contentType)) {
            this.panelOperationTimeout = setTimeout(() => {
                this.resetPanelOperation();
                this.createGenericSaveErrorConfirm();
            }, 10000); // 10sec of saving before giving back the control to the user
        }
        else {
            this.resetPanelOperation();
            this.createGenericSaveErrorConfirm();
        }
    }
    createSaveInvalidCharactersConfirm() {
        DialogManager.createDialog_Confirm({
            body: "LOC_SAVE_LOAD_SAVE_ERROR_INVALID_CHARACTERS",
            title: "LOC_SAVE_LOAD_SAVE_ERROR_TITLE",
        });
    }
    createGenericDeleteErrorConfirm() {
        DialogManager.createDialog_Confirm({
            body: "LOC_SAVE_LOAD_DELETE_ERROR",
            title: "LOC_SAVE_LOAD_DELETE_ERROR_TITLE",
        });
    }
    createGenericQueryErrorConfirm() {
        DialogManager.createDialog_Confirm({
            body: "LOC_SAVE_LOAD_QUERY_ERROR",
            title: "LOC_SAVE_LOAD_QUERY_ERROR_TITLE",
        });
    }
    createGenericSaveErrorConfirm() {
        DialogManager.createDialog_Confirm({
            body: "LOC_SAVE_LOAD_SAVE_ERROR",
            title: "LOC_SAVE_LOAD_SAVE_ERROR_TITLE",
        });
    }
    createVersionMismatchLoadErrorConfirm() {
        DialogManager.createDialog_Confirm({
            body: "LOC_LOAD_GAME_ERROR_UNKNOWN_VERSION",
            title: "LOC_SAVE_LOAD_UNABLE_TO_LOAD_TITLE",
        });
    }
    createGenericLoadErrorConfirm() {
        DialogManager.createDialog_Confirm({
            body: "LOC_SAVE_LOAD_UNABLE_TO_LOAD_BODY",
            title: "LOC_SAVE_LOAD_UNABLE_TO_LOAD_TITLE",
        });
    }
    createDeleteConfirmationDialog() {
        if (!this.startOperation(PanelOperation.Dialog)) {
            return;
        }
        const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
        DialogManager.createDialog_MultiOption({
            dialogId: this.dialogId,
            body: Locale.compose("LOC_SAVE_LOAD_DELETE_DIALOG", [SaveMenuType.LOAD_CONFIG, SaveMenuType.SAVE_CONFIG].includes(saveType) ? "LOC_SAVE_LOAD_CONFIG_TEXT" : "LOC_SAVE_LOAD_GAME_TEXT"),
            title: "LOC_SAVE_LOAD_DELETE_DIALOG_TITLE",
            canClose: false,
            options: [
                {
                    actions: ["accept"],
                    label: "LOC_SAVE_LOAD_DELETE_BUTTON",
                    callback: (eAction) => {
                        if (eAction == DialogBoxAction.Confirm) {
                            this.currentPanelOperation = PanelOperation.None;
                            this.startDelete();
                            UI.sendAudioEvent('save-load-delete-confirm');
                        }
                    },
                },
                {
                    actions: ["cancel", "keyboard-escape"],
                    label: "LOC_GENERIC_CANCEL",
                    callback: () => this.resetPanelOperation(),
                }
            ],
        });
    }
    createOverwriteConfirmationDialog() {
        if (!this.startOperation(PanelOperation.Dialog)) {
            return;
        }
        const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
        DialogManager.createDialog_MultiOption({
            dialogId: this.dialogId,
            body: Locale.compose("LOC_SAVE_LOAD_CONFIRM_OVERWRITE_BODY", [SaveMenuType.LOAD_CONFIG, SaveMenuType.SAVE_CONFIG].includes(saveType) ? "LOC_SAVE_LOAD_CONFIG_TEXT" : "LOC_SAVE_LOAD_GAME_TEXT"),
            title: "LOC_SAVE_LOAD_CONFIRM_OVERWRITE_TITLE",
            canClose: false,
            options: [
                {
                    actions: ["accept"],
                    label: "LOC_SAVE_LOAD_OVERWRITE_BUTTON",
                    callback: (eAction) => {
                        if (eAction == DialogBoxAction.Confirm) {
                            this.currentPanelOperation = PanelOperation.None;
                            this.startOverwriting();
                        }
                    }
                },
                {
                    actions: ["cancel", "keyboard-escape"],
                    label: "LOC_GENERIC_CANCEL",
                    callback: () => this.resetPanelOperation(),
                }
            ],
        });
    }
    createLoadConfirmationDialog() {
        if (!this.startOperation(PanelOperation.Dialog)) {
            return;
        }
        DialogManager.createDialog_MultiOption({
            dialogId: this.dialogId,
            body: "LOC_SAVE_LOAD_CONFIRM_LOAD_BODY",
            title: "LOC_SAVE_LOAD_CONFIRM_LOAD_TITLE",
            canClose: false,
            options: [
                {
                    actions: ["accept"],
                    label: "LOC_SAVE_LOAD_LOAD_BUTTON",
                    callback: (eAction) => {
                        if (eAction == DialogBoxAction.Confirm) {
                            this.currentPanelOperation = PanelOperation.None;
                            const currentSaveGameInfo = this.getSelectedSaveGameInfo();
                            const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? "0");
                            this.loadSave(currentSaveGameInfo, serverType);
                        }
                    },
                },
                {
                    actions: ["cancel", "keyboard-escape"],
                    label: "LOC_GENERIC_CANCEL",
                    callback: () => this.resetPanelOperation(),
                }
            ],
        });
    }
    sortSaveGames(savegames) {
        savegames.sort((a, b) => {
            switch (SORT_ITEMS[this.selectedSortIndex]?.value ?? SortValue.TIME_CREATED) {
                case SortValue.ALPHA:
                    return a.gameName.localeCompare(b.gameName);
                case SortValue.TIME_CREATED:
                    return b.saveTime - a.saveTime;
                default:
                    return 0;
            }
        });
    }
    updateNavTray() {
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
        const currentFocus = FocusManager.getFocus();
        this.Root.classList.toggle("trigger-nav-help", currentFocus.classList.contains("screen-save__list__slot") || currentFocus.classList.contains("save-load-chooser-item") || currentFocus.classList.contains("screen-save__crossplay__loged-out__link-button"));
        if (!ActionHandler.isGamepadActive || FocusManager.getFocus().tagName !== "SAVE-LOAD-CHOOSER-ITEM") {
            return;
        }
        const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
        const menuType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
        const { isAutosave, isQuicksave, isCurrentGame, } = this.getSelectedSaveGameInfo();
        const isAtMaxSaveCount = this.getIsAtMaxSaveCount();
        if (selectedSlot == SaveTabType.CROSSPLAY && !this.isCrossplayReady()) {
            return;
        }
        if ([SaveMenuType.SAVE, SaveMenuType.SAVE_CONFIG].includes(menuType)) {
            if (isCurrentGame && !isAtMaxSaveCount) {
                NavTray.addOrUpdateAccept("LOC_SAVE_LOAD_SAVE_NAVTRAY");
            }
            else if (!isCurrentGame) {
                if (!isAutosave && !isQuicksave) {
                    NavTray.addOrUpdateAccept("LOC_SAVE_LOAD_OVERWRITE_NAVTRAY");
                }
                NavTray.addOrUpdateShellAction1("LOC_SAVE_LOAD_DELETE_NAVTRAY");
            }
        }
        else if ([SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(menuType)) {
            NavTray.addOrUpdateAccept("LOC_SAVE_LOAD_LOAD_NAVTRAY");
            NavTray.addOrUpdateShellAction1("LOC_SAVE_LOAD_DELETE_NAVTRAY");
        }
    }
    updateLoadCardList(isClear = false) {
        const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
        const loadCardList = Array.from(this.loadCardLists ?? []).find(loadCardList => loadCardList.getAttribute("saveTabType") == selectedSlot);
        const fromEvent = this.Root.getAttribute("from-event") == "true";
        if (loadCardList) {
            while (loadCardList.firstChild) {
                loadCardList.removeChild(loadCardList.firstChild);
            }
            this.loadCards = [];
            if (!isClear) {
                this.loadCards = this.createLoadCards(selectedSlot);
                this.loadCards.forEach(loadCard => {
                    const saveGameInfo = SaveLoadData.saves[Number(loadCard.getAttribute("index"))];
                    if (fromEvent && saveGameInfo.isLiveEventGame) { // live event save when loading event saves
                        loadCardList.appendChild(loadCard);
                    }
                    else if (!fromEvent && !saveGameInfo.isLiveEventGame) { // normal save when loading normal saves
                        loadCardList.appendChild(loadCard);
                    }
                });
            }
        }
        this.loadCards.forEach(loadCard => {
            loadCard.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
            loadCard.addEventListener("action-activate", this.cardActivateListener);
            loadCard.addEventListener(ActionConfirmEventName, this.cardConfirmListener);
            loadCard.addEventListener(InputEngineEventName, this.cardEngineInputListener);
            loadCard.addEventListener("focusin", this.cardFocusListener);
        });
        this.updateCardSelection();
    }
    updateSortDropdown() {
        const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
        this.sortDropdown?.setAttribute("selected-item-index", `${this.selectedSortIndex}`);
        this.sortDropdown?.classList.toggle("hidden", selectedSlot == SaveTabType.CROSSPLAY && !this.isCrossplayReady());
        this.sortDropdown?.setAttribute("disabled", this.loadCards.length == 0 ? "true" : "false");
    }
    updateTabTypeMissingService(tabType) {
        const missingService = Array.from(this.missingServices ?? []).find(missingService => missingService.getAttribute("saveTabType") == tabType);
        if (tabType != SaveTabType.CROSSPLAY || this.cloudSavesEnabled) {
            if (missingService && missingService.firstChild) {
                missingService.childNodes.forEach(child => child?.remove());
            }
        }
        else if (missingService) {
            missingService.innerHTML = this.renderMissingService();
        }
        missingService?.classList.toggle("hidden", tabType != SaveTabType.CROSSPLAY || this.cloudSavesEnabled);
    }
    updateTabTypeLogedOut(tabType) {
        const logedOut = Array.from(this.logedOuts ?? []).find(logedOut => logedOut.getAttribute("saveTabType") == tabType);
        if (tabType != SaveTabType.CROSSPLAY || !this.cloudSavesEnabled || this.isFullAccountLinked) {
            if (logedOut && logedOut.firstChild) {
                logedOut.childNodes.forEach(child => child?.remove());
            }
        }
        else if (logedOut) {
            logedOut.innerHTML = this.renderLogedOut(tabType);
        }
        logedOut?.classList.toggle("hidden", tabType != SaveTabType.CROSSPLAY || !this.cloudSavesEnabled || this.isFullAccountLinked);
        waitForLayout(() => {
            this.linkButtons = this.Root.querySelectorAll(".screen-save__crossplay__loged-out__link-button");
            this.linkButtons.forEach(linkButton => {
                linkButton.addEventListener("action-activate", this.linkButtonActivateListener);
            });
        });
    }
    updateTabTypeScrollable(tabType) {
        Array.from(this.scrollables ?? []).find(scrollable => scrollable.getAttribute("saveTabType") == tabType)?.classList.toggle("hidden", tabType == SaveTabType.CROSSPLAY && !this.isCrossplayReady());
    }
    updateActionButtonsContainer() {
        const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
        this.actionButtonsContainer?.classList.toggle("opacity-0", selectedSlot == SaveTabType.CROSSPLAY && !this.isCrossplayReady());
    }
    updateFrame() {
        const saveType = this.Root.getAttribute("menu-type");
        this.frame?.setAttribute("title", mapMenuTypeToTitle[saveType ?? SaveMenuType.LOAD]);
        this.frame?.setAttribute("outside-safezone-mode", window.innerHeight > Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT) ? "vertical" : "full");
    }
    updateTabBar() {
        this.tabBar?.setAttribute("tab-items", JSON.stringify(this.getTabItems()));
        this.tabBar?.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
    }
    updateSaveCardContainer(isClear = false) {
        const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
        const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
        const saveCardContainer = Array.from(this.saveCardContainers ?? []).find(loadCardContainer => loadCardContainer.getAttribute("saveTabType") == selectedSlot);
        if (saveCardContainer) {
            while (saveCardContainer.firstChild) {
                saveCardContainer.removeChild(saveCardContainer.firstChild);
            }
        }
        if (!isClear && [SaveMenuType.SAVE, SaveMenuType.SAVE_CONFIG].includes(saveType) && (selectedSlot != SaveTabType.CROSSPLAY || this.isCrossplayReady())) {
            if (saveCardContainer) {
                this.saveCard = this.createSaveCard(selectedSlot);
                saveCardContainer.appendChild(this.saveCard);
            }
            this.saveCard?.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
            this.saveCard?.addEventListener("action-activate", this.cardActivateListener);
            this.saveCard?.addEventListener("focusin", this.cardFocusListener);
            this.saveCard?.addEventListener(InputEngineEventName, this.cardEngineInputListener);
            this.saveCard?.addEventListener("fxs-textbox-validate-virtual-keyboard", this.saveTextboxValidateVirtualKeyboardListener);
        }
    }
    updateSaveCard() {
        const isAtMaxSaveCount = this.getIsAtMaxSaveCount();
        this.saveCard?.setAttribute("disabled", isAtMaxSaveCount ? "true" : "false");
        this.saveCard?.setAttribute("data-tooltip-content", isAtMaxSaveCount ? "LOC_SAVE_LOAD_SAVE_DISABLED_DESCRIPTION" : "");
    }
    updateCardSelection() {
        this.saveCard?.setAttribute("selected", this.selectedSaveIndex == SAVE_CARD_SELECTION_INDEX ? "true" : "false");
        this.loadCards?.forEach(loadCard => {
            loadCard.setAttribute("selected", this.selectedSaveIndex == Number.parseInt(loadCard.getAttribute("index") ?? "") ? "true" : "false");
        });
    }
    updateSaveButton() {
        const isAtMaxSaveCount = this.getIsAtMaxSaveCount();
        const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
        const focusedSaveGameInfo = this.getSelectedSaveGameInfo();
        const { isCurrentGame } = focusedSaveGameInfo;
        this.saveButton?.setAttribute("disabled", (isAtMaxSaveCount || this.currentPanelOperation != PanelOperation.None) ? "true" : "false");
        this.saveButton?.classList.toggle("hidden", !isCurrentGame || [SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(saveType));
        this.saveButton?.setAttribute("data-tooltip-content", isAtMaxSaveCount ? "LOC_SAVE_LOAD_SAVE_DISABLED_DESCRIPTION" : "");
    }
    updateBackButton() {
        this.backButton?.setAttribute("disabled", [PanelOperation.None, PanelOperation.Query].includes(this.currentPanelOperation) ? "false" : "true");
    }
    updateDeleteButton() {
        const focusedSaveGameInfo = this.getSelectedSaveGameInfo();
        const { isCurrentGame } = focusedSaveGameInfo;
        this.deleteButton?.classList.toggle("hidden", isCurrentGame);
        this.deleteButton?.setAttribute("disabled", (Number.isNaN(focusedSaveGameInfo.ID) || this.currentPanelOperation != PanelOperation.None) ? "true" : "false");
    }
    updateOverwriteButton() {
        const focusedSaveGameInfo = this.getSelectedSaveGameInfo();
        const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
        const { isAutosave, isQuicksave, isCurrentGame } = focusedSaveGameInfo;
        this.overwriteButton?.classList.toggle("hidden", isAutosave || isQuicksave || isCurrentGame || [SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(saveType));
        this.overwriteButton?.setAttribute("disabled", (Number.isNaN(focusedSaveGameInfo.ID) || this.currentPanelOperation != PanelOperation.None) ? "true" : "false");
    }
    updateLoadButton() {
        const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD);
        const focusedSaveGameInfo = this.getSelectedSaveGameInfo();
        this.loadButton?.classList.toggle("hidden", [SaveMenuType.SAVE, SaveMenuType.SAVE_CONFIG].includes(saveType));
        const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? "0");
        // Do not load if missing mods.
        const hasMissingMods = focusedSaveGameInfo.missingMods.length > 0;
        const hasUnownedMods = focusedSaveGameInfo.unownedMods.length > 0;
        let canLoad = !hasMissingMods;
        if (canLoad) {
            switch (serverType) {
                // Ignore ownership for MP.
                case ServerType.SERVER_TYPE_LAN:
                case ServerType.SERVER_TYPE_WIRELESS:
                case ServerType.SERVER_TYPE_INTERNET:
                case ServerType.SERVER_TYPE_HOTSEAT:
                case ServerType.SERVER_TYPE_FIRAXIS_CLOUD:
                    canLoad = true;
                    break;
                case ServerType.SERVER_TYPE_NONE:
                    canLoad = !hasUnownedMods;
                    break;
                default:
                    console.warn(`Unknown server type - ${serverType}.`);
                    canLoad = !hasUnownedMods;
                    break;
            }
        }
        const buttonDisabled = Number.isNaN(focusedSaveGameInfo.ID) || this.currentPanelOperation != PanelOperation.None || !canLoad;
        this.loadButton?.setAttribute("disabled", buttonDisabled ? "true" : "false");
    }
    updateDescriptionContent() {
        const focusedSaveGameInfo = this.getSelectedSaveGameInfo();
        const menuType = this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD;
        const { requiredModsString, hostAge, gameName, saveActionName, hostDifficultyName, gameSpeedName, rulesetName, mapScriptName, mapSizeName, savedByVersion, createdByVersion, displayCreatedTime } = focusedSaveGameInfo;
        if (this.descriptionRequiredMods) {
            this.descriptionRequiredMods.innerHTML = Locale.stylize(requiredModsString);
        }
        if (this.descriptionSaveType) {
            this.descriptionSaveType.classList.toggle("hidden", [SaveMenuType.LOAD_CONFIG, SaveMenuType.SAVE_CONFIG].includes(menuType) || window.innerHeight > Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT));
        }
        if (this.descriptionMapDetailTextSaveType) {
            this.descriptionMapDetailTextSaveType.innerHTML = Locale.compose(saveActionName);
        }
        if (this.descriptionMapDetailTextDifficulty) {
            this.descriptionMapDetailTextDifficulty.innerHTML = Locale.unpack(hostDifficultyName);
        }
        if (this.descriptionMapDetailTextSpeed) {
            this.descriptionMapDetailTextSpeed.innerHTML = Locale.unpack(gameSpeedName);
        }
        if (this.descriptionMapDetailTextRuleset) {
            this.descriptionMapDetailTextRuleset.innerHTML = Locale.unpack(rulesetName);
        }
        if (this.descriptionMapDetailTextMaptype) {
            this.descriptionMapDetailTextMaptype.innerHTML = Locale.unpack(mapScriptName);
        }
        if (this.descriptionMapDetailTextMapsize) {
            this.descriptionMapDetailTextMapsize.innerHTML = Locale.unpack(mapSizeName);
        }
        if (this.descriptionMapDetailTextCreatedVersionGroup) {
            this.descriptionMapDetailTextCreatedVersionGroup.style.display = (createdByVersion) ? '' : 'none';
        }
        if (this.descriptionMapDetailTextCreatedVersion) {
            this.descriptionMapDetailTextCreatedVersion.innerHTML = createdByVersion ?? '';
        }
        if (this.descriptionMapDetailTextCreatedTimeGroup) {
            this.descriptionMapDetailTextCreatedTimeGroup.style.display = (displayCreatedTime) ? '' : 'none';
        }
        if (this.descriptionMapDetailTextCreatedTime) {
            this.descriptionMapDetailTextCreatedTime.innerHTML = fixupNNBSP(displayCreatedTime ?? '');
        }
        if (this.descriptionMapDetailTextVersion) {
            this.descriptionMapDetailTextVersion.innerHTML = savedByVersion;
        }
        this.descriptionThumnail?.style.setProperty("background-image", `url('${this.getThumnail(hostAge)}')`);
        this.descriptionThumnailContainer?.classList.toggle("h-44", window.innerHeight > Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT));
        this.descriptionThumnailContainer?.classList.toggle("h-32", window.innerHeight <= Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT));
        this.descriptionThumnailContainer?.classList.toggle("hidden", [SaveMenuType.LOAD_CONFIG, SaveMenuType.SAVE_CONFIG].includes(menuType) || window.innerHeight <= Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT));
        this.descriptionHeader?.classList.toggle("hidden", [SaveMenuType.LOAD_CONFIG, SaveMenuType.SAVE_CONFIG].includes(menuType));
        this.descriptionRequiredModsContainer?.classList.toggle("hidden", [SaveMenuType.LOAD_CONFIG, SaveMenuType.SAVE_CONFIG].includes(menuType) || !UI.supportsDLC());
        this.descriptionTitle?.setAttribute("title", gameName);
        this.descriptionTitle?.setAttribute("filigree-style", window.innerHeight > Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT) ? "h2" : "none");
        this.descriptionTitle?.classList.add("text-secondary", window.innerHeight > Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT) ? "font-title-xl" : "font-title-lg");
        window.innerHeight > Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT) ? this.descriptionTitle?.firstElementChild?.classList.remove("items-center") : this.descriptionTitle?.firstElementChild?.classList.add("w-full");
        this.descriptionContent?.classList.toggle("opacity-0", Number.isNaN(focusedSaveGameInfo.ID));
    }
    updateLoadingContainer() {
        this.loadingContainer?.classList.toggle("opacity-100", [PanelOperation.Delete, PanelOperation.Save, PanelOperation.Query, PanelOperation.Loading].includes(this.currentPanelOperation));
        this.loadingContainer?.classList.toggle("opacity-0", [PanelOperation.None, PanelOperation.Close, PanelOperation.Dialog].includes(this.currentPanelOperation));
    }
    updateLoadingDescription() {
        if (!this.loadingDescription) {
            return;
        }
        const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
        switch (this.currentPanelOperation) {
            case PanelOperation.Query:
                this.loadingDescription.textContent = Locale.compose("LOC_SAVE_LOAD_LOADING", mapTabTypeToTitle[selectedSlot]);
                break;
            case PanelOperation.Delete:
                this.loadingDescription.textContent = Locale.compose("LOC_SAVE_LOAD_DELETING", mapTabTypeToTitle[selectedSlot]);
                break;
            case PanelOperation.Save:
                this.loadingDescription.textContent = Locale.compose("LOC_SAVE_LOAD_SAVING", mapTabTypeToTitle[selectedSlot]);
                break;
            default:
                this.loadingDescription.textContent = "";
                break;
        }
    }
    showLoadingAnimation() {
        if (this.loadingAnimationContainer) {
            const flipbook = document.createElement("fxs-flipbook");
            const atlas = [
                {
                    src: 'fs://game/hourglasses01.png',
                    spriteWidth: 128,
                    spriteHeight: 128,
                    size: 512
                },
                {
                    src: 'fs://game/hourglasses02.png',
                    spriteWidth: 128,
                    spriteHeight: 128,
                    size: 512
                },
                {
                    src: 'fs://game/hourglasses03.png',
                    spriteWidth: 128,
                    spriteHeight: 128,
                    size: 1024,
                    nFrames: 13
                }
            ];
            const flipbookDefinition = {
                fps: 30,
                preload: true,
                atlas: atlas
            };
            flipbook.setAttribute("data-flipbook-definition", JSON.stringify(flipbookDefinition));
            this.loadingAnimationContainer.appendChild(flipbook);
        }
        else {
            console.error("screen-save-load: Unable to find container for loading gif.");
        }
    }
}
Controls.define('screen-save-load', {
    createInstance: ScreenSaveLoad,
    description: 'Save/load and manage saved games.',
    classNames: ['screen-save-load', 'fullscreen', 'flow-column', 'justify-center', 'items-center', 'flex-1'],
    styles: ['fs://game/core/ui/save-load/screen-save-load.css'],
    attributes: [
        {
            name: 'menu-type'
        },
        {
            name: 'server-type'
        },
        {
            name: 'save-type'
        },
        {
            name: 'from-invite'
        },
        {
            name: 'from-event'
        },
    ]
});

//# sourceMappingURL=file:///core/ui/save-load/screen-save-load.js.map
