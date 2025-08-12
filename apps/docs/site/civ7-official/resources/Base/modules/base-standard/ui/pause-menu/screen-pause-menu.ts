/**
 * @file screen-pause-menu.ts
 * @copyright 2020-2025, Firaxis Games
 * @description In-game pause menu; should always be assessible.
 */

import { getPlayerCardInfo } from '/core/ui/utilities/utilities-liveops.js';
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import DialogManager, { DialogBoxAction, DialogBoxID, DialogSource } from '/core/ui/dialog-box/manager-dialog-box.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import SaveLoadData from '/core/ui/save-load/model-save-load.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { NetworkUtilities } from 'core/ui/utilities/utilities-network.js';
import { displayRequestUniqueId } from '/core/ui/context-manager/display-handler.js';
import { Focus } from '/core/ui/input/focus-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

import { LowerCalloutEvent } from '/base-standard/ui/tutorial/tutorial-events.js';

type ButtonListener = (event: ActionActivateEvent) => void;
enum Group {
	Primary,
	Secondary
}

/**
 * Pause menu based on screen-tech-tree-chooser.ts 
 */
export class ScreenPauseMenu extends Panel {

	private engineInputListener = this.onEngineInput.bind(this);
	private closeButtonListener: EventListener = () => { this.close(); }
	private buttonListener: ButtonListener = (_e) => { }; // Use for callbacks; needed here for scope reasons even though it's overwritten.
	private progressionListener = this.onClickedProgression.bind(this);
	private animationEndListener = this.onAnimationEnd.bind(this);
	private slot!: HTMLElement;
	private quickSaveButton: HTMLElement | null = null;
	private saveButton: HTMLElement | null = null;
	private loadButton: HTMLElement | null = null;
	private restartButton: HTMLElement | null = null;
	private currentLeft: HTMLElement | null = null;
	private currentRight: HTMLElement | null = null;
	private buttons = new Set<HTMLElement>();
	private dialogId: DialogBoxID = displayRequestUniqueId();
	private hasFocus: boolean = false;
	private hasAnimationEnded: boolean = false;

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToRight;
		this.enableOpenSound = true;
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "pause-menu");
	}

	onAttach() {
		super.onAttach();

		engine.on('LocalPlayerTurnBegin', this.onLocalPlayerTurnBegin, this);
		engine.on('LocalPlayerTurnEnd', this.onLocalPlayerTurnEnd, this);
		engine.on('StartSaveRequest', this.onStartSaveRequest, this);
		engine.on("SaveComplete", this.onSaveComplete, this);

		const progressionContainer = MustGetElement(".pause-menu__progression-container", this.Root);
		progressionContainer.classList.toggle("hidden", !Network.supportsSSO());
		if (Network.supportsSSO()) {
			const progressionHeader = document.createElement("progression-header");
			progressionHeader.classList.add("pause-menu__player-info", "self-center", "-mt-8", "mb-4");
			progressionHeader.setAttribute("player-card-style", "mini");
			const playerInfo = getPlayerCardInfo();
			progressionHeader.setAttribute("data-player-info", JSON.stringify(playerInfo));
			progressionHeader.addEventListener("action-activate", this.progressionListener);
			progressionContainer.appendChild(progressionHeader);

			const progressionHeaderNavHelp = document.createElement("fxs-nav-help");
			progressionHeaderNavHelp.classList.add("pause-menu__header-help", "absolute", "-mb-4");
			progressionHeaderNavHelp.setAttribute("action-key", "inline-shell-action-5");
			progressionContainer.appendChild(progressionHeaderNavHelp);
		}

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
		this.Root.addEventListener('animationend', this.animationEndListener);
		this.slot = MustGetElement(".pauselist", this.Root);

		this.addRow();
		this.addButton("LOC_GENERIC_RESUME", this.closeButtonListener, Group.Primary, "none");

		if (UI.getViewExperience() != UIViewExperience.Mobile) {
			this.addRetireButton();
		}

		this.adjustItems();
		this.addDivider();
		this.addRow();

		if (Online.Metaprogression.isPlayingActiveEvent()) {
			this.addButton("LOC_PAUSE_MENU_EVENT_RULES", this.onEventRules, Group.Primary);
		}

		this.addRestartOrJoinCodeButton(UI.getViewExperience() == UIViewExperience.Mobile ? Group.Primary : Group.Secondary);

		if (UI.getViewExperience() == UIViewExperience.Mobile) {
			this.addRetireButton();
		}

		this.adjustItems();
		this.addDivider();
		this.addRow();
		this.quickSaveButton = this.addButton("LOC_PAUSE_MENU_QUICK_SAVE", this.onQuickSaveGameButton, Group.Secondary);
		this.saveButton = this.addButton("LOC_PAUSE_MENU_SAVE", this.onSaveGameButton, Group.Primary, "none");


		this.adjustItems();
		this.addRow();
		if (!Configuration.getGame().isNetworkMultiplayer) {
			this.loadButton = this.addButton("LOC_PAUSE_MENU_LOAD", this.onLoadGameButton, Group.Primary, "none");
		}

		this.addButton("LOC_PAUSE_MENU_OPTIONS", this.onOptionsButton, Group.Secondary, "data-audio-options-activate");

		this.adjustItems();
		this.addDivider();

		if (Network.isMetagamingAvailable() || Network.supportsSSO()) {
			this.addRow();
			if (Network.isMetagamingAvailable()) {
				this.addButton("LOC_PROFILE_TAB_CHALLENGES", this.onChallenges, Group.Primary);
			}

			if (Network.supportsSSO()) {
				this.addButton("LOC_UI_MP_SOCIAL_BUTTON_LABEL", this.onSocialButton, Group.Secondary, "data-audio-social-activate");
			}

			this.addDivider();
		}

		this.adjustItems();
		this.addRow();
		this.addButton("LOC_PAUSE_MENU_QUIT_TO_MENU", this.onExitToMainMenuButton, Group.Primary);

		if (UI.canExitToDesktop()) {
			this.addButton("LOC_PAUSE_MENU_QUIT_TO_DESKTOP", this.onExitToDesktopButton, Group.Secondary);
		}

		this.addDivider();

		const bg = document.getElementById("pause-top");
		if (bg) {
			bg.setAttribute("headerimage", Icon.getPlayerBackgroundImage(GameContext.localPlayerID));
		}

		const gameInfo = MustGetElement(".pause-menu__game-info", this.Root);
		const { startAgeType, difficultyType, gameSpeedType } = Configuration.getGame();
		const ageName = GameInfo.Ages.lookup(startAgeType)?.Name;
		const difficultyName = GameInfo.Difficulties.lookup(difficultyType)?.Name;
		const gameSpeedName = GameInfo.GameSpeeds.lookup(gameSpeedType)?.Name;

		const turnCount = Locale.compose("LOC_ACTION_PANEL_CURRENT_TURN", Game.turn);

		const details = [turnCount];
		if (ageName) {
			details.push(Locale.compose(ageName));
		}

		if (gameSpeedName) {
			details.push(Locale.compose(gameSpeedName));
		}

		if (difficultyName) {
			details.push(Locale.compose(difficultyName));
		}

		gameInfo.textContent = details.join(" | ");

		const gameInfoMapSeed = this.Root.querySelector<HTMLElement>(".pause-menu__game-info-map-seed");
		if (gameInfoMapSeed) {
			/// get the map seed
			const seed: number = Configuration.getMap().mapSeed;
			const mapSeed = seed.toString();
			const mapSeedText = Locale.compose("LOC_MAPSEED_NAME") + " " + Locale.compose(mapSeed);
			if (mapSeedText) {
				gameInfoMapSeed.textContent = mapSeedText;
			}
		}

		this.realizeBuildInfoString();

		window.dispatchEvent(new LowerCalloutEvent({ closed: false }));

		// if the cursor is locked, unlock it now so we aren't navigating with a non-pointer cursor
		if (UI.isCursorLocked()) {
			UI.lockCursor(false);
		}

		// let the dialog box manager know we want to display shell dialog box only
		DialogManager.setSource(DialogSource.Shell);

		if (UI.getViewExperience() == UIViewExperience.Mobile) {
			const frame = MustGetElement(".pause", this.Root);
			frame.setAttribute("outside-safezone-mode", "full");
		}

		waitForLayout(() => {
			this.syncronizeButtonWidths();
		})

		Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.PauseMenu, MenuAction: TelemetryMenuActionType.Load });
	}

	addRetireButton() {
		// Only show the 'RETIRE' button if the user has played a single turn.
		if (Game.turn > 1) {
			const victoryManager: VictoryManagerLibrary = Game.VictoryManager;
			const playerDefeated: boolean = victoryManager.getLatestPlayerDefeat(GameContext.localPlayerID) != DefeatTypes.NO_DEFEAT;

			if (Game.AgeProgressManager.isAgeOver || playerDefeated) {
				this.addButton("LOC_PAUSE_MENU_NOMORETURNS", this.onNoMoreTurnsButton, Group.Secondary);
			}
			else if (!Configuration.getGame().isNetworkMultiplayer) {
				const retireButton = this.addButton("LOC_PAUSE_MENU_RETIRE", this.onRetireButton, Group.Secondary);
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				retireButton.classList.add("pause-retire-button");
				if (player && !player.isTurnActive) {
					this.updateRetireButton(retireButton, false);
				}
			}
		}
	}

	addRestartOrJoinCodeButton(group: Group) {
		if (Configuration.getGame().isNetworkMultiplayer) {
			if (Network.getLocalHostingPlatform() != HostingType.HOSTING_TYPE_GAMECENTER) {
				this.addButton(Locale.compose("LOC_PAUSE_MENU_COPY_JOIN_CODE", Network.getJoinCode()), this.onJoinCodeButton, group);
			}
		}
		else {
			this.restartButton = this.addButton("LOC_PAUSE_MENU_RESTART", this.onRestartGame, group);
			this.updateRestartButton(this.restartButton);
		}
	}

	onDetach() {
		Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.PauseMenu, MenuAction: TelemetryMenuActionType.Exit });

		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		this.Root.removeEventListener('animationend', this.animationEndListener);
		engine.off('LocalPlayerTurnBegin', this.onLocalPlayerTurnBegin, this);
		engine.off('LocalPlayerTurnEnd', this.onLocalPlayerTurnEnd, this);
		engine.off('StartSaveRequest', this.onStartSaveRequest, this);
		engine.off("SaveComplete", this.onSaveComplete, this);

		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		this.hasFocus = true;
		UI.toggleGameCenterAccessPoint(this.hasAnimationEnded);

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		Focus.setContextAwareFocus(this.slot, this.Root);
	}

	onLoseFocus() {
		this.hasFocus = false;
		UI.toggleGameCenterAccessPoint(false);

		NavTray.clear();
		super.onLoseFocus();
	}

	protected close() {
		this.hasFocus = false;
		this.hasAnimationEnded = false;
		UI.toggleGameCenterAccessPoint(false);
		
		DialogManager.setSource(DialogSource.Game);
		DisplayQueueManager.resume();

		super.close();
	}

	private onAnimationEnd() {
		this.hasAnimationEnded = true;
		UI.toggleGameCenterAccessPoint(this.hasFocus);
	}

	private onClickedProgression() {
		ContextManager.push("screen-profile-page", { singleton: true, createMouseGuard: true, panelOptions: { onlyChallenges: false, onlyLeaderboards: false, noCustomize: true } });
	}

	private onLocalPlayerTurnBegin() {
		const retireButton = this.Root.querySelector<HTMLElement>(".pause-retire-button");
		if (retireButton) {
			this.updateRetireButton(retireButton, true);
		}
	}

	private onLocalPlayerTurnEnd() {
		const retireButton = this.Root.querySelector<HTMLElement>(".pause-retire-button");
		if (retireButton) {
			this.updateRetireButton(retireButton, false);
		}
	}

	private onStartSaveRequest() {
		this.quickSaveButton?.classList.add("disabled");
		this.saveButton?.classList.add("disabled");
		this.loadButton?.classList.add("disabled");
	}

	private onSaveComplete() {
		this.quickSaveButton?.classList.remove("disabled");
		this.saveButton?.classList.remove("disabled");
		this.loadButton?.classList.remove("disabled");
	}

	private updateRetireButton(retireButton: HTMLElement, turnActive: boolean) {
		retireButton.classList.toggle("disabled", !turnActive);

		if (!turnActive) {
			retireButton.setAttribute("data-tooltip-content", "LOC_PAUSE_MENU_RETIRE_DISABLED");
		} else {
			retireButton.removeAttribute("data-tooltip-content");
		}
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.detail.name == "shell-action-5") {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
			if (Network.isMetagamingAvailable()) {
				ContextManager.push("screen-profile-page", { singleton: true, createMouseGuard: true, panelOptions: { onlyChallenges: false, onlyLeaderboards: false, noCustomize: true } });
			}
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
			this.close();
			this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		}
	}

	private getGroupRoot(group: Group) {
		if (group == Group.Secondary) {
			return this.currentRight;
		}
		return this.currentLeft;
	}

	/**
	 * Add a button to the list
	 * @param caption Localization key for the button caption.
	 * @param buttonListener Function to activate when button is selected
	 * @param group Which group to place the button in.
	 * @param activateSound activate sound to play when button is released
	 * @returns DOM element for the button.
	 */
	private addButton(caption: string, buttonListener: ButtonListener, group: Group, activateSound = "data-audio-pause-menu-activate"): HTMLElement {
		const target = this.getGroupRoot(group);
		const button: HTMLElement = document.createElement('fxs-button');
		{
			button.classList.add('pause-menu-button', 'mb-1\\.5', 'mx-1');
			button.setAttribute('caption', Locale.compose(caption));
			button.setAttribute("data-audio-group-ref", "pause-menu");
			button.setAttribute("data-audio-focus-ref", "data-audio-pause-menu-focus");
			button.setAttribute("data-audio-activate-ref", activateSound);
			// join button has already localized text in caption. Therefore, check here and do a different telemetry call with the LOC string as othere buttons have.
			if (buttonListener == this.onJoinCodeButton) {
				button.addEventListener('action-activate', () => { Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.PauseMenu, MenuAction: TelemetryMenuActionType.Select, Item: "LOC_PAUSE_MENU_COPY_JOIN_CODE" }); });
			} else {
				button.addEventListener('action-activate', () => { Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.PauseMenu, MenuAction: TelemetryMenuActionType.Select, Item: caption }); });
			}

			button.addEventListener('action-activate', (event: CustomEvent) => {
				event.preventDefault();
				event.stopPropagation();
				this.buttonListener = buttonListener;	// By using this member var to route the callback, the member var sets the scope. 
				this.buttonListener(event);
			});
		}

		if (target) {
			target.appendChild(button);
		} else {
			console.error(`No target element found for button: ${caption}`);
		}

		this.buttons.add(button);
		return button;
	}

	private addRow() {
		const outerDiv = document.createElement("div");
		outerDiv.classList.add("flex", "flex-row", "pause-menu__main-buttons", "justify-center", "mb-1\\.5");

		const leftCol = document.createElement("div");
		leftCol.classList.add("flex", "flex-col", "pauselist");
		outerDiv.appendChild(leftCol);
		this.currentLeft = leftCol;

		const rightCol = document.createElement("div");
		rightCol.classList.add("flex", "flex-col", "pauselist");
		outerDiv.appendChild(rightCol);
		this.currentRight = rightCol;

		this.slot.appendChild(outerDiv);
	}

	// if a row only has one button, do some layout adjustments
	private adjustItems() {
		if (UI.getViewExperience() == UIViewExperience.Mobile) {
			return;
		}

		if (this.currentLeft && this.currentRight) {
			if (this.currentLeft.children.length + this.currentRight.children.length < 2) {
				const outerDiv = this.currentLeft.parentElement;
				if (outerDiv) {
					outerDiv.classList.remove("justify-center");
				}
			}
		}
	}

	private addDivider() {
		const divider = document.createElement("div");
		divider.classList.add("pause-menu_button-divider-filigree", "flex", "h-4", "self-center", "mb-6");
		this.slot.appendChild(divider);
	}

	private syncronizeButtonWidths() {
		if (this.Root.isConnected) {
			let maxWidth = 350;
			for (let button of this.buttons) {
				const { width } = button.getBoundingClientRect();
				maxWidth = Math.max(maxWidth, width);
			}

			for (let button of this.buttons) {
				button.style.widthPX = maxWidth;
			}
		}
	}

	private onSocialButton() {
		NetworkUtilities.openSocialPanel();
	}

	private onOptionsButton() {
		ContextManager.push("screen-options", { singleton: true, createMouseGuard: true });
	}

	private onEventRules() {
		ContextManager.push("screen-pause-event-rules", { singleton: true, createMouseGuard: true });
	}

	private onChallenges() {
		ContextManager.push("screen-profile-page", { singleton: true, createMouseGuard: true, panelOptions: { onlyChallenges: true, onlyLeaderboards: false } });
	}

	private onNoMoreTurnsButton() {
		// NOTE: Handling situation where keys may not exist since they came in late.
		if (Locale.keyExists('LOC_PAUSE_MENU_CONFIRM_NOMORETURNS') && Locale.keyExists('LOC_PAUSE_MENU_NOMORETURNS')) {
			DialogManager.createDialog_ConfirmCancel({
				dialogId: this.dialogId,
				body: "LOC_PAUSE_MENU_CONFIRM_NOMORETURNS",
				title: "LOC_PAUSE_MENU_NOMORETURNS",
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						ContextManager.push("screen-endgame", { singleton: true, createMouseGuard: true });
						this.close();
						//DisplayQueueManager.add({ category: EndGameScreenCategory });
					}
				}
			});
		}
		else {
			ContextManager.push("screen-endgame", { singleton: true, createMouseGuard: true });
			this.close();
			//DisplayQueueManager.add({ category: EndGameScreenCategory });
		}
	}

	private onRetireButton() {
		DialogManager.createDialog_ConfirmCancel({
			dialogId: this.dialogId,
			body: "LOC_PAUSE_MENU_CONFIRM_RETIRE",
			title: "LOC_PAUSE_MENU_RETIRE",
			callback: (eAction: DialogBoxAction) => { if (eAction == DialogBoxAction.Confirm) { this.retireFromGame() } }
		});
	}

	private onExitToMainMenuButton() {
		DialogManager.createDialog_ConfirmCancel({
			dialogId: this.dialogId,
			body: "LOC_PAUSE_MENU_CONFIRM_QUIT_TO_MENU",
			title: "LOC_PAUSE_MENU_QUIT_TO_MENU",
			callback: (eAction: DialogBoxAction) => { if (eAction == DialogBoxAction.Confirm) { this.exitToMainMenu() } }
		});
	}

	private onQuickSaveGameButton() {
		this.close();
		SaveLoadData.handleQuickSave();
	}

	private onRestartGame() {
		if (this.restartButton?.getAttribute('disabled') != 'true') {
			DialogManager.createDialog_ConfirmCancel({
				dialogId: this.dialogId,
				body: "LOC_PAUSE_MENU_CONFIRM_RESTART_GAME",
				title: "LOC_PAUSE_MENU_RESTART",
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						this.restartButton?.setAttribute('disabled', 'true');
						Network.restartGame();
					}
				}
			});
		}
	}

	private updateRestartButton(restartButton: HTMLElement) {
		let disabledReason: string | null = null;

		const gameConfiguration = Configuration.getGame();
		const mapConfiguration = Configuration.getMap();

		if (gameConfiguration.previousAgeCount > 0) {
			disabledReason = "LOC_RESTART_DISABLED_REASON_START_AGE";
		}
		else if (mapConfiguration.script.toLowerCase().endsWith("civ7map")) {
			disabledReason = "LOC_RESTART_DISABLED_REASON_WORLDBUILDER_MAP";
		}
		else if (gameConfiguration.isNetworkMultiplayer) {
			disabledReason = "LOC_RESTART_DISABLED_REASON_NETWORK_MULTIPLAYER";
		}
		else if (gameConfiguration.isSavedGame) {
			disabledReason = "LOC_RESTART_DISABLED_REASON_SAVED_GAME";
		}

		if (disabledReason != null) {
			restartButton.setAttribute('disabled', 'true');
			const content = `{LOC_PAUSE_MENU_RESTART_DESCRIPTION}[N][[STYLE:text-negative]{${disabledReason}}[/STYLE]`;
			restartButton.setAttribute("data-tooltip-content", content);
		} else {
			restartButton.setAttribute("data-tooltip-content", "LOC_PAUSE_MENU_RESTART_DESCRIPTION");
		}
	}

	private onSaveGameButton() {
		const configSaveType: SaveTypes = GameStateStorage.getGameConfigurationSaveType();
		const configServerType: ServerType = Network.getServerType();

		ContextManager.push("screen-save-load", { singleton: true, createMouseGuard: true, attributes: { "menu-type": "save", "server-type": configServerType, "save-type": configSaveType } });
	}

	private onLoadGameButton() {
		const configSaveType: SaveTypes = GameStateStorage.getGameConfigurationSaveType();
		const configServerType: ServerType = Network.getServerType();

		const liveEventGame = Network.supportsSSO() && Online.LiveEvent.getLiveEventGameFlag();
		ContextManager.push("screen-save-load", { singleton: true, createMouseGuard: true, attributes: { "menu-type": "load", "server-type": configServerType, "save-type": configSaveType, "from-event": liveEventGame } });
	}

	private retireFromGame() {
		GameContext.sendRetireRequest();
		this.close();

		//! TEMPORARY - The game really should be paused from within GameCore and not reactively by the UI.
		//! This kludge will either become part of the end-game sequence OR be removed when properly handled in GameCore.
		GameContext.sendPauseRequest(true);
	}

	private exitToMainMenu() {
		if (Network.supportsSSO() && Online.LiveEvent.getLiveEventGameFlag()) {
			Online.LiveEvent.clearLiveEventGameFlag();
			Online.LiveEvent.clearLiveEventConfigKeys();
		}

		engine.call('exitToMainMenu');
	}

	private onExitToDesktopButton() {
		DialogManager.createDialog_ConfirmCancel({
			body: "LOC_PAUSE_MENU_CONFIRM_QUIT_TO_DESKTOP",
			title: "LOC_PAUSE_MENU_QUIT_TO_DESKTOP",
			callback: (eAction: DialogBoxAction) => { if (eAction == DialogBoxAction.Confirm) { this.exitToDesktop() } }
		});
	}

	private exitToDesktop() {
		engine.call('exitToDesktop');
	}

	private realizeBuildInfoString() {
		// Update the current version.
		const v: HTMLElement = MustGetElement('.build-info', this.Root);
		if (UI.getViewExperience() == UIViewExperience.Mobile) {
			v.classList.add("hidden");
		} else {
			v.innerHTML = Locale.compose('LOC_PAUSE_MENU_BUILD_INFO', BuildInfo.version.display);
		}
	}

	/// Copies the current join code to the clipboard
	private async onJoinCodeButton() {
		UI.setClipboardText(Network.getJoinCode());
	}
}

const ScreenPauseMenuTagName = 'screen-pause-menu';
declare global {
	interface HTMLElementTagNameMap {
		[ScreenPauseMenuTagName]: ComponentRoot<ScreenPauseMenu>;
	}
}

Controls.define(ScreenPauseMenuTagName, {
	createInstance: ScreenPauseMenu,
	description: 'Confirm decision to exit main menu.',
	classNames: ['pause-menu'],
	styles: ['fs://game/base-standard/ui/pause-menu/screen-pause-menu.css'],
	content: ['fs://game/base-standard/ui/pause-menu/screen-pause-menu.html']
});
