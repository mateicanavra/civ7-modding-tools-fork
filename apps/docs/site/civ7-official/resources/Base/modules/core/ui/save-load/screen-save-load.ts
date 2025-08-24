/**
 * @file screen-save-load.ts
 * @copyright 2021 - 2025, Firaxis Games
 * @description Shell Load Game Menu, manage save games and load into a saved game.
 */

import DialogManager, { DialogBoxAction, DialogBoxID } from '/core/ui/dialog-box/manager-dialog-box.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import SaveLoadData, { DEFAULT_SAVE_GAME_INFO, QueryDoneEvent, SaveGameInfo, QueryDoneEventName } from '/core/ui/save-load/model-save-load.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { TabItem, TabSelectedEvent } from '/core/ui/components/fxs-tab-bar.js';
import { MustGetElement, MustGetElements } from '/core/ui/utilities/utilities-dom.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
import { FxsTextboxValidateVirtualKeyboard } from '/core/ui/components/fxs-textbox.js';
import { ActionConfirmEvent, ActionConfirmEventName } from '/core/ui/save-load/save-load-card.js';
import SystemMessageManager from '/core/ui/system-message/system-message-manager.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { DropdownItem, DropdownSelectionChangeEvent, DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import { FlipbookDefinition, FlipbookFrame } from '/core/ui/components/fxs-flipbook.js';
import { displayRequestUniqueId } from '/core/ui/context-manager/display-handler.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import { FxsScrollable } from '/core/ui/components/fxs-scrollable.js';

export const SaveLoadClosedEventName = 'save-load-closed' as const;
class SaveLoadClosedEvent extends CustomEvent<{}> {
	constructor() {
		super(SaveLoadClosedEventName, { bubbles: false, cancelable: true });
	}
}

enum PanelOperation {
	None,
	Query,
	Dialog,
	Save,
	Loading,
	Delete,
	Close,
}

enum SaveMenuType {
	LOAD = "load",
	SAVE = "save",
	LOAD_CONFIG = "load_config",
	SAVE_CONFIG = "save_config"
}

const mapMenuTypeToTitle = {
	[SaveMenuType.LOAD]: "LOC_SAVE_LOAD_TITLE_LOAD",
	[SaveMenuType.SAVE]: "LOC_SAVE_LOAD_TITLE_SAVE",
	[SaveMenuType.LOAD_CONFIG]: "LOC_SAVE_LOAD_TITLE_LOAD_CONFIG",
	[SaveMenuType.SAVE_CONFIG]: "LOC_SAVE_LOAD_TITLE_SAVE_CONFIG",
}

enum SaveTabType {
	CROSSPLAY = "crossplay",
	LOCAL = "local",
	TRANSITION = "transition",
	AUTOSAVE = "autosave",
	CONFIG = "config",
}

enum SortValue {
	ALPHA = 1,
	TIME_CREATED = 2,
}

const SORT_ITEMS: (DropdownItem & { value: number })[] = [
	{ label: 'LOC_TIME_CREATED_TITLE', value: SortValue.TIME_CREATED },
	{ label: 'LOC_GAMENAME_TITLE_SORT', value: SortValue.ALPHA },
]

const mapTabTypeToTitle = {
	[SaveTabType.CROSSPLAY]: "LOC_SAVE_LOAD_CROSSPLAYSAVES",
	[SaveTabType.LOCAL]: GameStateStorage.doesPlatformSupportLocalSaves() ? "LOC_SAVE_LOAD_LOCALSAVE" : "LOC_SAVE_LOAD_SAVES",
	[SaveTabType.TRANSITION]: "LOC_SAVE_LOAD_AGETRANSITIONSAVES",
	[SaveTabType.AUTOSAVE]: "LOC_SAVE_LOAD_AUTOSAVES",
	[SaveTabType.CONFIG]: "LOC_SAVE_LOAD_LOCALSAVE",
}

const mapTabTypeToSaveLocation = {
	[SaveTabType.CROSSPLAY]: SaveLocations.FIRAXIS_CLOUD,
	[SaveTabType.LOCAL]: SaveLocations.LOCAL_STORAGE,
	[SaveTabType.TRANSITION]: SaveLocations.LOCAL_STORAGE,
	[SaveTabType.AUTOSAVE]: SaveLocations.LOCAL_STORAGE,
	[SaveTabType.CONFIG]: SaveLocations.LOCAL_STORAGE,
}

const mapTabTypeToSaveFileType = {
	[SaveTabType.CROSSPLAY]: SaveFileTypes.GAME_STATE,
	[SaveTabType.LOCAL]: SaveFileTypes.GAME_STATE,
	[SaveTabType.TRANSITION]: SaveFileTypes.GAME_TRANSITION,
	[SaveTabType.AUTOSAVE]: SaveFileTypes.GAME_STATE,
	[SaveTabType.CONFIG]: SaveFileTypes.GAME_CONFIGURATION,
}

const mapTabTypeToSaveLocationCategories = {
	[SaveTabType.CROSSPLAY]: SaveLocationCategories.NORMAL,
	[SaveTabType.LOCAL]: SaveLocationCategories.NORMAL | SaveLocationCategories.QUICKSAVE,
	[SaveTabType.TRANSITION]: SaveLocationCategories.NORMAL,
	[SaveTabType.AUTOSAVE]: SaveLocationCategories.AUTOSAVE,
	[SaveTabType.CONFIG]: SaveLocationCategories.NORMAL,
}

const NO_SELECTION_INDEX = -2;
const SAVE_CARD_SELECTION_INDEX = -1;

// There exists a font issue in which the character &nnbsp being used is quite wide and not shown correctly.
// Instead just use regular &nbsp.
export function fixupNNBSP(dt: string) {
	return dt.replaceAll('\u202f', '\u00a0');
}

class ScreenSaveLoad extends Panel {
	readonly SMALL_SCREEN_MODE_MAX_HEIGHT = 768;

	private engineInputListener = this.onEngineInput.bind(this);
	private tabBarSelectedListener = this.onTabBarSelected.bind(this);
	private backButtonActionActivateListener = this.onBackButtonActionActivate.bind(this);
	private deleteButtonActionActivateListener = this.onDeleteButtonActionActivate.bind(this);
	private overwriteButtonActionActivateListener = this.onOverwriteButtonActionActivate.bind(this);
	private loadButtonActionActivateListener = this.onLoadButtonActionActivate.bind(this);
	private saveButtonActionActivateListener = this.onSaveButtonActionActivate.bind(this);
	private queryDoneListener = this.onQueryDone.bind(this);
	private cardFocusListener = this.onCardFocus.bind(this);
	private cardActivateListener = this.onCardActivate.bind(this);
	private cardConfirmListener = this.onCardConfirm.bind(this);
	private cardEngineInputListener = this.onCardEngineInput.bind(this);
	private saveTextboxValidateVirtualKeyboardListener = this.onSaveTextboxValidateVirtualKeyboard.bind(this);
	private QrCompletedListener = this.onQrAccountLinked.bind(this);
	private accountUnlinkedListener = this.onQrAccountLinked.bind(this);
	private linkButtonActivateListener = this.onLinkButtonActivate.bind(this);
	private sortDropdownActivateListener = this.onSortDropdownActivate.bind(this);
	private sortDropdownSelectionChangeListener = this.onSortDropdownSelectionChange.bind(this);
	private sortDropdownFocusListener = this.onSortDropdownFocus.bind(this);
	private resizeListener = this.onResize.bind(this);

	private currentPanelOperation: PanelOperation = PanelOperation.None;
	private panelOperationTimeout: number = 0;
	private cloudSavesEnabled: boolean = Network.cloudSavesEnabled();
	private isLoggedIn: boolean = Network.isLoggedIn();
	private isFullAccountLinked: boolean = Network.isFullAccountLinked();
	private isLocalCrossplayEnabled = Network.getLocalCrossPlay() && Network.hasCrossPlatformSaveSupport();
	private selectedSaveIndex: number = -1;
	private selectedSortIndex: number = 0;
	private dialogId: DialogBoxID = displayRequestUniqueId();

	private frame: HTMLElement | null = null;
	private tabBar: HTMLElement | null = null;
	private slotGroup!: HTMLElement;
	private backButton: HTMLElement | null = null;
	private deleteButton: HTMLElement | null = null;
	private saveButton: HTMLElement | null = null;
	private loadButton: HTMLElement | null = null;
	private overwriteButton: HTMLElement | null = null;
	private buttonsContainer: HTMLElement | null = null;
	private actionButtonsContainer: HTMLElement | null = null;
	private sortDropdown: HTMLElement | null = null;
	private saveCardContainers: NodeListOf<HTMLElement> | null = null;
	private scrollables: NodeListOf<HTMLElement> | null = null;
	private loadCardLists: NodeListOf<HTMLElement> | null = null;
	private loadCards: HTMLElement[] = [];
	private saveCard: HTMLElement | null = null;
	private descriptionContent: HTMLElement | null = null;
	private descriptionTitle: HTMLElement | null = null;
	private descriptionThumnail: HTMLElement | null = null;
	private descriptionThumnailContainer: HTMLElement | null = null;
	private descriptionHeader: HTMLElement | null = null;
	private descriptionRequiredModsContainer: HTMLElement | null = null;
	private descriptionSaveType: HTMLElement | null = null;
	private descriptionMapDetailTextSaveType: HTMLElement | null = null;
	private descriptionMapDetailTextDifficulty: HTMLElement | null = null;
	private descriptionMapDetailTextSpeed: HTMLElement | null = null;
	private descriptionMapDetailTextRuleset: HTMLElement | null = null;
	private descriptionMapDetailTextMaptype: HTMLElement | null = null;
	private descriptionMapDetailTextMapsize: HTMLElement | null = null;
	private descriptionMapDetailTextVersion: HTMLElement | null = null;
	private descriptionMapDetailTextCreatedVersionGroup: HTMLElement | null = null;
	private descriptionMapDetailTextCreatedVersion: HTMLElement | null = null;
	private descriptionMapDetailTextCreatedTimeGroup: HTMLElement | null = null;
	private descriptionMapDetailTextCreatedTime: HTMLElement | null = null;
	private descriptionRequiredMods: HTMLElement | null = null;
	private missingServices: NodeListOf<HTMLElement> | null = null;
	private logedOuts: NodeListOf<HTMLElement> | null = null;
	private linkButtons: NodeListOf<HTMLElement> | null = null;
	private loadingContainer: HTMLElement | null = null;
	private loadingDescription: HTMLElement | null = null;
	private loadingAnimationContainer: HTMLElement | null = null;

	constructor(root: ComponentRoot) {
		super(root);
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
		this.descriptionThumnailContainer = MustGetElement(".screen-save__description__thumnail-container", this.Root)
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

		const descriptionScrollable = MustGetElement<ComponentRoot<FxsScrollable>>(".screen-save__description__scrollable", this.Root);
		descriptionScrollable.whenComponentCreated((component) => {
			component.setEngineInputProxy(this.Root)
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
		this.overwriteButton.addEventListener("action-activate", this.overwriteButtonActionActivateListener)
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

	private onResize() {
		this.updateDescriptionContent();
		this.updateFrame();
	}

	onAttributeChanged(name: string, _oldValue: string | null, _newValue: string | null) {
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
		if (!this.startOperation(PanelOperation.Close)) { return; }
		SaveLoadData.clearQueries();
		// clear live event flags, if any
		if (Network.supportsSSO() && Online.LiveEvent.getLiveEventGameFlag()) {
			Online.LiveEvent.clearLiveEventGameFlag();
		}
		super.close();
	}

	private getTabItems(): TabItem[] {
		const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
		const serverType: ServerType = Number.parseInt(this.Root.getAttribute("server-type") ?? "0");
		const tabItems: TabItem[] = [];
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

	private getThumnail(hostAge: string): string {
		const ageParameter: GameSetupParameter | null = GameSetup.findGameParameter('Age');
		const bannerName: number = GameSetup.findString('Banner');
		const hostAgeParameter: GameSetupDomainValue | undefined = ageParameter?.domain.possibleValues?.find((possibleValue) => possibleValue.value?.toString() == hostAge);
		const banner: GameSetupParameterValue | undefined = hostAgeParameter?.additionalProperties?.find((additionalProperty) => additionalProperty.name == bannerName)?.value;
		if (typeof (banner) == 'string') {
			return `fs://game/${banner}`;
		}
		return 'fs://game/Skyline_Sm';
	}

	private getNewSaveNameDefault(): string {
		const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
		if ([SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(saveType)) {
			return "";
		} else if (saveType == SaveMenuType.SAVE_CONFIG) {
			return Locale.compose("LOC_SAVE_GAME_CONFIG_DEFAULT");
		}
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const leader: LeaderDefinition | null = GameInfo.Leaders.lookup(player?.leaderType ?? "");
		const leaderName: string = Locale.compose(leader?.Name ?? "LOC_LEADER_NONE_NAME");
		const leaderLastName: string | undefined = leaderName.split(" ").slice(-1).pop();
		const age: AgeDefinition | null = GameInfo.Ages.lookup(Game.age);
		const ageName: string = Locale.compose(age?.Name ?? "LOC_AGE_ANTIQUITY_NAME");
		const shortAgeName: string = ageName.slice(0, 3);
		const turn: number = Game.turn;
		return `${leaderLastName}${shortAgeName}${turn}`;
	}

	private getIsAtMaxSaveCount(): boolean {
		const selectedSlot: SaveTabType = this.slotGroup?.getAttribute("selected-slot") as SaveTabType ?? SaveTabType.LOCAL;
		const saveType: SaveTypes = Number.parseInt(this.Root.getAttribute("save-type") ?? "0") as SaveTypes;
		return Network.isAtMaxSaveCount({
			Location: mapTabTypeToSaveLocation[selectedSlot],
			LocationCategories: mapTabTypeToSaveLocationCategories[selectedSlot],
			Type: saveType,
			ContentType: mapTabTypeToSaveFileType[selectedSlot],
		})
	}

	private getSortIndexByUserOption(): number {
		const sortValue = Configuration.getUser().saveLoadSortDefault;
		return SORT_ITEMS.findIndex(({ value }) => value == sortValue);
	}

	private getCurrentSaveGameInfo(): SaveGameInfo {
		const saveType: SaveTypes = Number.parseInt(this.Root.getAttribute("save-type") ?? "0") as SaveTypes;
		const selectedSlot: SaveTabType = this.slotGroup?.getAttribute("selected-slot") as SaveTabType ?? SaveTabType.LOCAL;
		const saveName: string = this.saveCard?.getAttribute("value") || this.getNewSaveNameDefault();
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
		}
	}

	private getSelectedSaveGameInfo(): SaveGameInfo {
		const saveMenuType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
		if (this.selectedSaveIndex == SAVE_CARD_SELECTION_INDEX && [SaveMenuType.SAVE, SaveMenuType.SAVE_CONFIG].includes(saveMenuType)) {
			return this.getCurrentSaveGameInfo();
		}
		if (this.selectedSaveIndex >= 0 && this.selectedSaveIndex < SaveLoadData.saves.length) {
			return SaveLoadData.saves[this.selectedSaveIndex];
		}
		return DEFAULT_SAVE_GAME_INFO;
	}

	private isCrossplayReady(): boolean {
		return Network.isConnectedToNetwork() && this.cloudSavesEnabled && this.isLoggedIn && this.isFullAccountLinked && this.isLocalCrossplayEnabled;
	}

	private createLoadCards(saveTabType: SaveTabType): HTMLElement[] {
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
		})
	}

	private createSaveCard(saveTabType: SaveTabType): HTMLElement {
		const menuType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
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

	private renderMissingService() {
		return `
			<div class="font-body text-base text-accent-4" data-l10n-id="LOC_SAVE_LOAD_CROSSPLAY_MISSING_2K_CLOUD_SERVICE_1"></div>
			<div class="font-body text-base text-accent-4" data-l10n-id="LOC_SAVE_LOAD_CROSSPLAY_MISSING_2K_CLOUD_SERVICE_2"></div>
		`
	}

	private renderLogedOut(saveTabType: SaveTabType): string {
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
		`
		}
		else if (!isLoggedIn) {
			return `
			<fxs-vslot class="flex flow-column items-center mb-3" data-navrule-down="stop">
				<div class="font-body text-base text-accent-4" data-l10n-id="LOC_UI_LOGIN_ACCOUNT_TITLE"></div>
			</fxs-vslot>
		`
		}
		else if (isLinked && !isComplete) {
			return `
			<fxs-vslot class="flex flow-column items-center mb-3" data-navrule-down="stop">
				<div class="font-body text-base text-accent-4" data-l10n-id="LOC_SAVE_LOAD_CROSSPLAY_MISSING_SSO_1_A"></div>
				<div class="font-body text-base text-accent-4" data-l10n-id="LOC_SAVE_LOAD_CROSSPLAY_MISSING_SSO_2"></div>
			</fxs-vslot>
			<fxs-button tabindex="-1" class="screen-save__crossplay__loged-out__link-button" saveTabType="${saveTabType}" caption="LOC_SAVE_LOAD_COMPLETE_2K_ACCOUNT"></fxs-button>
		`
		}
		else if (!isFullyLinked) {
			return `
			<fxs-vslot class="flex flow-column items-center mb-3" data-navrule-down="stop">
				<div class="font-body text-base text-accent-4" data-l10n-id="LOC_SAVE_LOAD_CROSSPLAY_MISSING_SSO_1"></div>
				<div class="font-body text-base text-accent-4" data-l10n-id="LOC_SAVE_LOAD_CROSSPLAY_MISSING_SSO_2"></div>
			</fxs-vslot>
			<fxs-button tabindex="-1" class="screen-save__crossplay__loged-out__link-button" saveTabType="${saveTabType}" caption="LOC_SAVE_LOAD_CONNECT_2K_ACCOUNT"></fxs-button>
		`
		}
		else {
			return '';
		}
	}

	private render(): string {
		const menuType = this.Root.getAttribute("menu-type") as SaveMenuType ?? SaveMenuType.LOAD;
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
		`
	}

	private onCardFocus({ target }: FocusEvent) {
		this.selectedSaveIndex = parseInt(((target) as HTMLElement).getAttribute("index") ?? `${SAVE_CARD_SELECTION_INDEX}`);
		this.updateCardSelection();
		this.updateDescriptionContent();
		this.updateLoadButton();
		this.updateOverwriteButton();
		this.updateDeleteButton();
		this.updateSaveButton();
		this.updateNavTray();
	}

	private onCardActivate(event: ActionActivateEvent) {
		const { target } = event;
		if (ActionHandler.isGamepadActive) {
			const { isAutosave, isQuicksave, isCurrentGame } = this.getSelectedSaveGameInfo();
			const menuType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
			if ([SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(menuType)) {
				this.onLoadButtonActionActivate(event);
			} else {
				if (isCurrentGame) {
					if (UI.canDisplayKeyboard()) {
						(target as HTMLElement).querySelector("fxs-textbox")?.setAttribute("activated", "true");
					} else {
						this.onSaveButtonActionActivate(event);
					}
				} else if (!isAutosave && !isQuicksave) {
					this.onOverwriteButtonActionActivate(event);
				}
			}
		} else if ((target as HTMLElement).getAttribute("index") == `${SAVE_CARD_SELECTION_INDEX}`) {
			const input: HTMLInputElement | null = (target as HTMLElement).querySelector("input");
			input?.focus()
			input?.setSelectionRange(-1, -1); // set the cursor at the end of the input value
		} else {
			(target as HTMLElement).focus();
		}
	}

	private onCardConfirm(event: ActionConfirmEvent) {
		const { isAutosave, isQuicksave, isCurrentGame } = this.getSelectedSaveGameInfo();
		const menuType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
		if ([SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(menuType)) {
			this.onLoadButtonActionActivate(event);
		} else if (!isCurrentGame && !isAutosave && !isQuicksave) {
			this.onOverwriteButtonActionActivate(event);
		}
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (!this.handleEngineInput(inputEvent)) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		};
	}

	private handleEngineInput(inputEvent: InputEngineEvent): boolean {
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

	private onCardEngineInput(event: InputEngineEvent) {
		if (!this.handleCardEngineInput(event)) {
			event.stopPropagation();
			event.preventDefault();
		};
	}

	private handleCardEngineInput(event: InputEngineEvent): boolean {
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

	private onSaveTextboxValidateVirtualKeyboard(event: FxsTextboxValidateVirtualKeyboard) {
		this.onSaveButtonActionActivate(event);
	}

	private onLinkButtonActivate(_event: ActionActivateEvent) {
		if (Network.canDisplayQRCode()) {
			ContextManager.push("screen-mp-link-account", { singleton: true, createMouseGuard: true });
		}
	}

	private onQrAccountLinked() { // here we only handle the Completed state of onSsoAccountLinkingEvent (AppOwnership_TwoKDNA.cpp)
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

	private onQueryDone(_event: QueryDoneEvent) {
		this.sortSaveGames(SaveLoadData.saves);
		this.updateSaveCardContainer();
		this.resetPanelOperation();
		this.focusSlotGroup();
	}

	private updateControls(isClear: boolean = false) {
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

	private onRemoveComplete({ result }: LoadSaveResultData) {
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

	private onQueryComplete({ result }: LoadSaveResultData) {
		switch (result) {
			case SerializerResult.RESULT_PENDING:
				return;
			case SerializerResult.RESULT_OK:
				break;
			default:
				this.createGenericQueryErrorConfirm();
		}
	}

	private onSaveDone({ result }: LoadSaveResultData) {
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

	private onLoadComplete({ result }: LoadSaveResultData) {
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

	private onTabBarSelected(event: TabSelectedEvent) {
		const { detail: { selectedItem: { id } } } = event;

		this.slotGroup?.setAttribute("selected-slot", id);

		this.selectedSaveIndex = NO_SELECTION_INDEX;

		this.updateDescriptionContent();
		this.updateSortDropdown();
		this.updateTabTypeMissingService(id as SaveTabType);
		this.updateTabTypeLogedOut(id as SaveTabType);
		this.updateTabTypeScrollable(id as SaveTabType);
		this.updateActionButtonsContainer();
		this.updateNavTray();
		this.updateSaveCardContainer();
		if (id == SaveTabType.CROSSPLAY && !this.isCrossplayReady()) {
			this.focusSlotGroup();
			this.updateNavTray();
		} else {
			this.startQuery(true);
		}
	}

	private onBackButtonActionActivate(_event: CustomEvent) {
		this.close();
	}

	private onDeleteButtonActionActivate(event: CustomEvent) {
		if (this.currentPanelOperation != PanelOperation.None) { return; }
		this.createDeleteConfirmationDialog();
		event.stopPropagation();
		event.preventDefault();
	}

	private onLoadButtonActionActivate(event: CustomEvent) {
		if (this.currentPanelOperation != PanelOperation.None) { return; }
		const currentSaveGameInfo = this.getSelectedSaveGameInfo();
		const serverType: ServerType = Number.parseInt(this.Root.getAttribute("server-type") ?? "0");

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
		} else {
			this.loadSave(currentSaveGameInfo, serverType);
		}

		event.stopPropagation();
		event.preventDefault();
	}

	private loadSave(saveGameInfo: SaveGameInfo, serverType: ServerType) {
		if (!this.startOperation(PanelOperation.Loading)) { return; }
		if (SaveLoadData.handleLoadSave(saveGameInfo, serverType)) {
			this.panelOperationTimeout = setTimeout(() => {
				this.resetPanelOperation();
				this.createGenericLoadErrorConfirm();
			}, 10000); // 10sec of loading before giving back the control to the user
		} else {
			this.resetPanelOperation();
			this.createGenericLoadErrorConfirm();
		};
	}

	private onOverwriteButtonActionActivate(event: CustomEvent) {
		if (this.currentPanelOperation != PanelOperation.None) { return; }
		this.createOverwriteConfirmationDialog();
		event.stopPropagation();
		event.preventDefault();
	}

	private onSaveButtonActionActivate(event: CustomEvent) {
		const isAtMaxSaveCount = this.getIsAtMaxSaveCount();
		if (isAtMaxSaveCount || this.currentPanelOperation != PanelOperation.None) { return; }
		this.startSave();
		event.stopPropagation();
		event.preventDefault();
	}

	private onSortDropdownActivate(_event: ActionActivateEvent) {
		waitForLayout(() => this.updateNavTray());
	}

	private onSortDropdownSelectionChange({ detail: { selectedIndex } }: DropdownSelectionChangeEvent) {
		this.selectedSortIndex = selectedIndex;
		this.saveSelectedSortValueToUserOption();
		this.sortSaveGames(SaveLoadData.saves);
		this.updateLoadCardList();
		this.focusSlotGroup();
	}

	private focusSlotGroup() {
		FocusManager.setFocus(this.slotGroup);
		if (!ActionHandler.isGamepadActive) {
			const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
			const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
			if ([SaveMenuType.SAVE, SaveMenuType.SAVE_CONFIG].includes(saveType)) {
				(this.saveCard as HTMLElement | undefined)?.focus();
			} else {
				const loadCardList = Array.from(this.loadCardLists ?? []).find(loadCardList => loadCardList.getAttribute("saveTabType") == selectedSlot);
				(loadCardList?.firstChild as HTMLElement | null | undefined)?.focus();
			}
		}
		this.updateNavTray();
	}

	private saveSelectedSortValueToUserOption() {
		Configuration.getUser().setSaveLoadSortDefault(SORT_ITEMS[this.selectedSortIndex]?.value ?? SortValue.TIME_CREATED);
	}

	private resetPanelOperation() {
		this.currentPanelOperation = PanelOperation.None;
		this.updateControls();
	}

	private startOperation(operation: PanelOperation): boolean {
		if (![PanelOperation.None, PanelOperation.Query].includes(this.currentPanelOperation)) { return false; }
		this.currentPanelOperation = operation;
		this.updateControls();
		return true;
	}

	private startQuery(isReset: boolean = false) {
		if (!this.startOperation(PanelOperation.Query)) { return; }
		const selectedSlot: SaveTabType = this.slotGroup?.getAttribute("selected-slot") as SaveTabType ?? SaveTabType.LOCAL;
		const saveType: SaveTypes = Number.parseInt(this.Root.getAttribute("save-type") ?? "0") as SaveTypes;
		SaveLoadData.querySaveGameList(
			mapTabTypeToSaveLocation[selectedSlot],
			selectedSlot == SaveTabType.TRANSITION ? SaveTypes.WORLDBUILDER_MAP : saveType,
			mapTabTypeToSaveLocationCategories[selectedSlot],
			mapTabTypeToSaveFileType[selectedSlot],
			{ isOverwriteQueryIds: true }
		);
		this.updateControls(isReset);
		FocusManager.setFocus(this.loadingContainer!);
		this.updateNavTray();
	}

	private startDelete() {
		if (!this.startOperation(PanelOperation.Delete)) { return; }
		const focusedSaveGameInfo = this.getSelectedSaveGameInfo();
		FocusManager.setFocus(this.loadingContainer!);
		this.updateNavTray();

		if (SaveLoadData.handleDelete(focusedSaveGameInfo)) {
			this.panelOperationTimeout = setTimeout(() => {
				this.resetPanelOperation();
				this.createGenericDeleteErrorConfirm();
			}, 10000); // 10sec of deleting before giving back the control to the user
		} else {
			this.resetPanelOperation();
			this.createGenericDeleteErrorConfirm();
		}
	}

	private startSave() {
		if (!this.startOperation(PanelOperation.Save)) { return; }
		const saveType: SaveTypes = Number.parseInt(this.Root.getAttribute("save-type") ?? "0") as SaveTypes;
		const selectedSlot: SaveTabType = this.slotGroup?.getAttribute("selected-slot") as SaveTabType ?? SaveTabType.LOCAL;
		const fileName: string = this.saveCard?.getAttribute("value") || this.getNewSaveNameDefault();
		FocusManager.setFocus(this.loadingContainer!);
		this.updateNavTray();

		if (SaveLoadData.handleSave(fileName, saveType, mapTabTypeToSaveLocation[selectedSlot], mapTabTypeToSaveFileType[selectedSlot])) {
			this.panelOperationTimeout = setTimeout(() => {
				this.resetPanelOperation();
				this.createGenericSaveErrorConfirm();
			}, 10000); // 10sec of saving before giving back the control to the user
		} else {
			this.resetPanelOperation();
			this.createGenericSaveErrorConfirm();
		}
	}

	private startOverwriting() {
		if (!this.startOperation(PanelOperation.Save)) { return; }
		const { fileName, displayName, location, type, contentType } = this.getSelectedSaveGameInfo();
		const saveFileName: string = location == SaveLocations.LOCAL_STORAGE ? fileName : displayName;
		FocusManager.setFocus(this.loadingContainer!);
		this.updateNavTray();

		if (SaveLoadData.handleOverwrite(saveFileName, type, location, contentType)) {
			this.panelOperationTimeout = setTimeout(() => {
				this.resetPanelOperation();
				this.createGenericSaveErrorConfirm();
			}, 10000); // 10sec of saving before giving back the control to the user
		} else {
			this.resetPanelOperation();
			this.createGenericSaveErrorConfirm();
		}
	}

	private createSaveInvalidCharactersConfirm() {
		DialogManager.createDialog_Confirm({
			body: "LOC_SAVE_LOAD_SAVE_ERROR_INVALID_CHARACTERS",
			title: "LOC_SAVE_LOAD_SAVE_ERROR_TITLE",
		})
	}



	private createGenericDeleteErrorConfirm() {
		DialogManager.createDialog_Confirm({
			body: "LOC_SAVE_LOAD_DELETE_ERROR",
			title: "LOC_SAVE_LOAD_DELETE_ERROR_TITLE",
		})
	}

	private createGenericQueryErrorConfirm() {
		DialogManager.createDialog_Confirm({
			body: "LOC_SAVE_LOAD_QUERY_ERROR",
			title: "LOC_SAVE_LOAD_QUERY_ERROR_TITLE",
		})
	}

	private createGenericSaveErrorConfirm() {
		DialogManager.createDialog_Confirm({
			body: "LOC_SAVE_LOAD_SAVE_ERROR",
			title: "LOC_SAVE_LOAD_SAVE_ERROR_TITLE",
		})
	}

	private createVersionMismatchLoadErrorConfirm() {
		DialogManager.createDialog_Confirm({
			body: "LOC_LOAD_GAME_ERROR_UNKNOWN_VERSION",
			title: "LOC_SAVE_LOAD_UNABLE_TO_LOAD_TITLE",
		})
	}

	private createGenericLoadErrorConfirm() {
		DialogManager.createDialog_Confirm({
			body: "LOC_SAVE_LOAD_UNABLE_TO_LOAD_BODY",
			title: "LOC_SAVE_LOAD_UNABLE_TO_LOAD_TITLE",
		})
	}

	private createDeleteConfirmationDialog() {
		if (!this.startOperation(PanelOperation.Dialog)) { return; }
		const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
		DialogManager.createDialog_MultiOption({
			dialogId: this.dialogId,
			body: Locale.compose("LOC_SAVE_LOAD_DELETE_DIALOG", [SaveMenuType.LOAD_CONFIG, SaveMenuType.SAVE_CONFIG].includes(saveType) ? "LOC_SAVE_LOAD_CONFIG_TEXT" : "LOC_SAVE_LOAD_GAME_TEXT"),
			title: "LOC_SAVE_LOAD_DELETE_DIALOG_TITLE",
			canClose: false,
			options: [
				{
					actions: ["accept"],
					label: "LOC_SAVE_LOAD_DELETE_BUTTON",
					callback: (eAction: DialogBoxAction) => {
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
		})
	}

	private createOverwriteConfirmationDialog() {
		if (!this.startOperation(PanelOperation.Dialog)) { return; }
		const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
		DialogManager.createDialog_MultiOption({
			dialogId: this.dialogId,
			body: Locale.compose("LOC_SAVE_LOAD_CONFIRM_OVERWRITE_BODY", [SaveMenuType.LOAD_CONFIG, SaveMenuType.SAVE_CONFIG].includes(saveType) ? "LOC_SAVE_LOAD_CONFIG_TEXT" : "LOC_SAVE_LOAD_GAME_TEXT"),
			title: "LOC_SAVE_LOAD_CONFIRM_OVERWRITE_TITLE",
			canClose: false,
			options: [
				{
					actions: ["accept"],
					label: "LOC_SAVE_LOAD_OVERWRITE_BUTTON",
					callback: (eAction: DialogBoxAction) => {
						if (eAction == DialogBoxAction.Confirm) {
							this.currentPanelOperation = PanelOperation.None;
							this.startOverwriting()
						}
					}
				},
				{
					actions: ["cancel", "keyboard-escape"],
					label: "LOC_GENERIC_CANCEL",
					callback: () => this.resetPanelOperation(),
				}
			],
		})
	}

	private createLoadConfirmationDialog() {
		if (!this.startOperation(PanelOperation.Dialog)) { return; }
		DialogManager.createDialog_MultiOption({
			dialogId: this.dialogId,
			body: "LOC_SAVE_LOAD_CONFIRM_LOAD_BODY",
			title: "LOC_SAVE_LOAD_CONFIRM_LOAD_TITLE",
			canClose: false,
			options: [
				{
					actions: ["accept"],
					label: "LOC_SAVE_LOAD_LOAD_BUTTON",
					callback: (eAction: DialogBoxAction) => {
						if (eAction == DialogBoxAction.Confirm) {
							this.currentPanelOperation = PanelOperation.None;
							const currentSaveGameInfo = this.getSelectedSaveGameInfo();
							const serverType: ServerType = Number.parseInt(this.Root.getAttribute("server-type") ?? "0");
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
		})
	}

	private sortSaveGames(savegames: SaveGameInfo[]) {
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

	private updateNavTray() {
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		const currentFocus = FocusManager.getFocus();

		this.Root.classList.toggle("trigger-nav-help", currentFocus.classList.contains("screen-save__list__slot") || currentFocus.classList.contains("save-load-chooser-item") || currentFocus.classList.contains("screen-save__crossplay__loged-out__link-button"));

		if (!ActionHandler.isGamepadActive || FocusManager.getFocus().tagName !== "SAVE-LOAD-CHOOSER-ITEM") {
			return;
		}
		const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
		const menuType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
		const {
			isAutosave,
			isQuicksave,
			isCurrentGame,
		} = this.getSelectedSaveGameInfo();
		const isAtMaxSaveCount = this.getIsAtMaxSaveCount();

		if (selectedSlot == SaveTabType.CROSSPLAY && !this.isCrossplayReady()) {
			return;
		}

		if ([SaveMenuType.SAVE, SaveMenuType.SAVE_CONFIG].includes(menuType)) {
			if (isCurrentGame && !isAtMaxSaveCount) {
				NavTray.addOrUpdateAccept("LOC_SAVE_LOAD_SAVE_NAVTRAY");
			} else if (!isCurrentGame) {
				if (!isAutosave && !isQuicksave) {
					NavTray.addOrUpdateAccept("LOC_SAVE_LOAD_OVERWRITE_NAVTRAY");
				}
				NavTray.addOrUpdateShellAction1("LOC_SAVE_LOAD_DELETE_NAVTRAY");
			}
		} else if ([SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(menuType)) {
			NavTray.addOrUpdateAccept("LOC_SAVE_LOAD_LOAD_NAVTRAY");
			NavTray.addOrUpdateShellAction1("LOC_SAVE_LOAD_DELETE_NAVTRAY");
		}
	}

	private updateLoadCardList(isClear: boolean = false) {
		const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
		const loadCardList = Array.from(this.loadCardLists ?? []).find(loadCardList => loadCardList.getAttribute("saveTabType") == selectedSlot);
		const fromEvent = this.Root.getAttribute("from-event") == "true";
		if (loadCardList) {
			while (loadCardList.firstChild) {
				loadCardList.removeChild(loadCardList.firstChild!);
			}
			this.loadCards = [];
			if (!isClear) {
				this.loadCards = this.createLoadCards(selectedSlot as SaveTabType);
				this.loadCards.forEach(loadCard => {
					const saveGameInfo: SaveGameInfo = SaveLoadData.saves[Number(loadCard.getAttribute("index"))];
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

	private updateSortDropdown() {
		const selectedSlot = this.slotGroup?.getAttribute("selected-slot") ?? SaveTabType.LOCAL;
		this.sortDropdown?.setAttribute("selected-item-index", `${this.selectedSortIndex}`);
		this.sortDropdown?.classList.toggle("hidden", selectedSlot == SaveTabType.CROSSPLAY && !this.isCrossplayReady());
		this.sortDropdown?.setAttribute("disabled", this.loadCards.length == 0 ? "true" : "false");
	}

	private updateTabTypeMissingService(tabType: SaveTabType) {
		const missingService = Array.from(this.missingServices ?? []).find(missingService => missingService.getAttribute("saveTabType") == tabType);
		if (tabType != SaveTabType.CROSSPLAY || this.cloudSavesEnabled) {
			if (missingService && missingService.firstChild) {
				missingService.childNodes.forEach(child => child?.remove());
			}
		} else if (missingService) {
			missingService.innerHTML = this.renderMissingService();
		}
		missingService?.classList.toggle("hidden", tabType != SaveTabType.CROSSPLAY || this.cloudSavesEnabled);
	}

	private updateTabTypeLogedOut(tabType: SaveTabType) {
		const logedOut = Array.from(this.logedOuts ?? []).find(logedOut => logedOut.getAttribute("saveTabType") == tabType);
		if (tabType != SaveTabType.CROSSPLAY || !this.cloudSavesEnabled || this.isFullAccountLinked) {
			if (logedOut && logedOut.firstChild) {
				logedOut.childNodes.forEach(child => child?.remove());
			}
		} else if (logedOut) {
			logedOut.innerHTML = this.renderLogedOut(tabType);
		}
		logedOut?.classList.toggle("hidden", tabType != SaveTabType.CROSSPLAY || !this.cloudSavesEnabled || this.isFullAccountLinked);
		waitForLayout(() => {
			this.linkButtons = this.Root.querySelectorAll(".screen-save__crossplay__loged-out__link-button");
			this.linkButtons.forEach(linkButton => {
				linkButton.addEventListener("action-activate", this.linkButtonActivateListener);
			})
		});
	}

	private updateTabTypeScrollable(tabType: SaveTabType) {
		Array.from(this.scrollables ?? []).find(scrollable => scrollable.getAttribute("saveTabType") == tabType)?.classList.toggle("hidden", tabType == SaveTabType.CROSSPLAY && !this.isCrossplayReady());
	}

	private updateActionButtonsContainer() {
		const selectedSlot: SaveTabType = this.slotGroup?.getAttribute("selected-slot") as SaveTabType ?? SaveTabType.LOCAL;
		this.actionButtonsContainer?.classList.toggle("opacity-0", selectedSlot == SaveTabType.CROSSPLAY && !this.isCrossplayReady());
	}

	private updateFrame() {
		const saveType = this.Root.getAttribute("menu-type");
		this.frame?.setAttribute("title", mapMenuTypeToTitle[saveType as SaveMenuType ?? SaveMenuType.LOAD]);
		this.frame?.setAttribute("outside-safezone-mode", window.innerHeight > Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT) ? "vertical" : "full");
	}

	private updateTabBar() {
		this.tabBar?.setAttribute("tab-items", JSON.stringify(this.getTabItems()));
		this.tabBar?.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
	}

	private updateSaveCardContainer(isClear: boolean = false) {
		const selectedSlot = this.slotGroup?.getAttribute("selected-slot") as SaveTabType ?? SaveTabType.LOCAL;
		const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
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

	private updateSaveCard() {
		const isAtMaxSaveCount = this.getIsAtMaxSaveCount();
		this.saveCard?.setAttribute("disabled", isAtMaxSaveCount ? "true" : "false");
		this.saveCard?.setAttribute("data-tooltip-content", isAtMaxSaveCount ? "LOC_SAVE_LOAD_SAVE_DISABLED_DESCRIPTION" : "");
	}

	private updateCardSelection() {
		this.saveCard?.setAttribute("selected", this.selectedSaveIndex == SAVE_CARD_SELECTION_INDEX ? "true" : "false");
		this.loadCards?.forEach(loadCard => {
			loadCard.setAttribute("selected", this.selectedSaveIndex == Number.parseInt(loadCard.getAttribute("index") ?? "") ? "true" : "false");
		});
	}

	private updateSaveButton() {
		const isAtMaxSaveCount = this.getIsAtMaxSaveCount();
		const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
		const focusedSaveGameInfo = this.getSelectedSaveGameInfo();
		const { isCurrentGame } = focusedSaveGameInfo;
		this.saveButton?.setAttribute("disabled", (isAtMaxSaveCount || this.currentPanelOperation != PanelOperation.None) ? "true" : "false");
		this.saveButton?.classList.toggle("hidden", !isCurrentGame || [SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(saveType));
		this.saveButton?.setAttribute("data-tooltip-content", isAtMaxSaveCount ? "LOC_SAVE_LOAD_SAVE_DISABLED_DESCRIPTION" : "");
	}

	private updateBackButton() {
		this.backButton?.setAttribute("disabled", [PanelOperation.None, PanelOperation.Query].includes(this.currentPanelOperation) ? "false" : "true");
	}

	private updateDeleteButton() {
		const focusedSaveGameInfo = this.getSelectedSaveGameInfo();
		const { isCurrentGame } = focusedSaveGameInfo;
		this.deleteButton?.classList.toggle("hidden", isCurrentGame);
		this.deleteButton?.setAttribute("disabled", (Number.isNaN(focusedSaveGameInfo.ID) || this.currentPanelOperation != PanelOperation.None) ? "true" : "false");
	}

	private updateOverwriteButton() {
		const focusedSaveGameInfo = this.getSelectedSaveGameInfo();
		const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
		const { isAutosave, isQuicksave, isCurrentGame } = focusedSaveGameInfo;
		this.overwriteButton?.classList.toggle("hidden", isAutosave || isQuicksave || isCurrentGame || [SaveMenuType.LOAD, SaveMenuType.LOAD_CONFIG].includes(saveType));
		this.overwriteButton?.setAttribute("disabled", (Number.isNaN(focusedSaveGameInfo.ID) || this.currentPanelOperation != PanelOperation.None) ? "true" : "false");
	}

	private updateLoadButton() {
		const saveType = (this.Root.getAttribute("menu-type") ?? SaveMenuType.LOAD) as SaveMenuType;
		const focusedSaveGameInfo = this.getSelectedSaveGameInfo();
		this.loadButton?.classList.toggle("hidden", [SaveMenuType.SAVE, SaveMenuType.SAVE_CONFIG].includes(saveType));

		const serverType: ServerType = Number.parseInt(this.Root.getAttribute("server-type") ?? "0");

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

		const buttonDisabled: boolean = Number.isNaN(focusedSaveGameInfo.ID) || this.currentPanelOperation != PanelOperation.None || !canLoad;
		this.loadButton?.setAttribute("disabled", buttonDisabled ? "true" : "false");
	}

	private updateDescriptionContent() {
		const focusedSaveGameInfo = this.getSelectedSaveGameInfo();
		const menuType = this.Root.getAttribute("menu-type") as SaveMenuType ?? SaveMenuType.LOAD;
		const {
			requiredModsString,
			hostAge,
			gameName,
			saveActionName,
			hostDifficultyName,
			gameSpeedName,
			rulesetName,
			mapScriptName,
			mapSizeName,
			savedByVersion,
			createdByVersion,
			displayCreatedTime
		} = focusedSaveGameInfo;
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
		window.innerHeight > Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT) ? this.descriptionTitle?.firstElementChild?.classList.remove("items-center") : this.descriptionTitle?.firstElementChild?.classList.add("w-full")
		this.descriptionContent?.classList.toggle("opacity-0", Number.isNaN(focusedSaveGameInfo.ID));
	}

	private updateLoadingContainer() {
		this.loadingContainer?.classList.toggle("opacity-100", [PanelOperation.Delete, PanelOperation.Save, PanelOperation.Query, PanelOperation.Loading].includes(this.currentPanelOperation));
		this.loadingContainer?.classList.toggle("opacity-0", [PanelOperation.None, PanelOperation.Close, PanelOperation.Dialog].includes(this.currentPanelOperation));
	}

	private updateLoadingDescription() {
		if (!this.loadingDescription) {
			return;
		}
		const selectedSlot: SaveTabType = this.slotGroup?.getAttribute("selected-slot") as SaveTabType ?? SaveTabType.LOCAL;
		switch (this.currentPanelOperation) {
			case PanelOperation.Query:
				this.loadingDescription!.textContent = Locale.compose("LOC_SAVE_LOAD_LOADING", mapTabTypeToTitle[selectedSlot]);
				break;
			case PanelOperation.Delete:
				this.loadingDescription!.textContent = Locale.compose("LOC_SAVE_LOAD_DELETING", mapTabTypeToTitle[selectedSlot]);
				break;
			case PanelOperation.Save:
				this.loadingDescription!.textContent = Locale.compose("LOC_SAVE_LOAD_SAVING", mapTabTypeToTitle[selectedSlot]);
				break;
			default:
				this.loadingDescription!.textContent = "";
				break;
		}
	}

	private showLoadingAnimation() {
		if (this.loadingAnimationContainer) {
			const flipbook = document.createElement("fxs-flipbook");
			const atlas: FlipbookFrame[] = [
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
			]
			const flipbookDefinition: FlipbookDefinition = {
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

declare global {
	interface HTMLElementEventMap {
		[SaveLoadClosedEventName]: SaveLoadClosedEvent;
	}
}