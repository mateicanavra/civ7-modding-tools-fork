/**
 * @file mp-game-mode.ts		
 * @copyright 2024, Firaxis Games
 * @description Game mode selection screen.  
 */

import ContextManager from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import MultiplayerShellManager from '/core/ui/shell/mp-shell-logic/mp-shell-logic.js';
import { GameCreatorOpenedEvent, MainMenuReturnEvent } from '/core/ui/events/shell-events.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import DialogBoxManager from '/core/ui/dialog-box/manager-dialog-box.js';

class PanelMPGameMode extends Panel {

	private backButton!: HTMLElement;
	private loadButton!: HTMLElement;
	private createButton!: HTMLElement;
	private automatchButton!: HTMLElement;
	private cardContainer!: HTMLElement;

	private engineInputListener = this.onEngineInput.bind(this);
	private loadGameButtonListener = this.onLoadGame.bind(this);
	private backButtonListener = this.onBackButton.bind(this);
	private automatchCardListener = this.onAutomatch.bind(this);
	private createGameCardListener = this.onCreateGame.bind(this);

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToRight;
	}

	onInitialize(): void {
		super.onInitialize();

		this.backButton = MustGetElement(".back-button", this.Root);
		this.loadButton = MustGetElement(".load-game-button", this.Root);
		this.createButton = MustGetElement(".create-game-button", this.Root);
		this.automatchButton = MustGetElement(".automatch-button", this.Root);
		this.cardContainer = MustGetElement(".card-container", this.Root);

		const createButtonBgImg = document.createElement("div");
		createButtonBgImg.classList.add("absolute", "inset-0\\.5", "img-bg-card-buganda");
		waitForLayout(() => this.createButton.insertAdjacentElement("afterbegin", createButtonBgImg));

		if (UI.supportsAutoMatching()) {
			const automatchButtonBgImg = document.createElement("div");
			automatchButtonBgImg.classList.add("absolute", "inset-0\\.5", "img-bg-card-aksum");
			waitForLayout(() => this.automatchButton.insertAdjacentElement("afterbegin", automatchButtonBgImg));
		}
		else {
			this.automatchButton.classList.add("hidden");
		}
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
		this.createButton.addEventListener('action-activate', this.createGameCardListener);
		this.automatchButton.addEventListener('action-activate', this.automatchCardListener);
		this.backButton.addEventListener('action-activate', this.backButtonListener);
		this.loadButton.addEventListener('action-activate', this.loadGameButtonListener);
	}

	onDetach() {
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();

		FocusManager.setFocus(this.cardContainer);
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput()) {
			this.onClose();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}

		if (inputEvent.detail.name == 'shell-action-2') {
			this.onLoadGame();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private onCreateGame() {
		ContextManager.push('screen-mp-create-game', { singleton: true, createMouseGuard: true });

		window.dispatchEvent(new GameCreatorOpenedEvent());
	};

	private onAutomatch() {
		const gameParameter: GameSetupParameter | null = GameSetup.findGameParameter("Age");

		if (!gameParameter || !gameParameter.domain.possibleValues) {
			console.error("mp-game-mode.ts couldn't find the age parameter possible values");
			return;
		}

		const quickJoinItemsData = gameParameter.domain.possibleValues.map(({ value, name }) => ({
			label: Locale.compose(GameSetup.resolveString(name) ?? ""),
			type: value?.toString() ?? "",
		}));

		DialogBoxManager.createDialog_MultiOption({
			extensions: { dropdowns: [{ id: 'mp-quick-join__option', dropdownItems: JSON.stringify(quickJoinItemsData), label: "LOC_UI_MP_QUICK_JOIN_RULE_AGE" }] },
			title: Locale.compose("LOC_UI_MP_GAME_MODE_AUTOMATCH"),
			options: [
				{
					actions: ["sys-menu"],
					label: "LOC_GENERIC_CONFIRM",
					valueCallback: (_id: string, newValue: string) => {
						const selectedOptionIndex = Number.parseInt(newValue);
						const selectedGameType = quickJoinItemsData[selectedOptionIndex]?.type;
						if (selectedGameType) {
							MultiplayerShellManager.onAutomatch(selectedGameType);
							this.close();
						}
					}
				},
				{
					actions: ["cancel", "keyboard-escape"],
					label: "LOC_GENERIC_CANCEL",
				}
			]
		});
	};

	private onBackButton() {
		this.onClose();
	}

	private onLoadGame() {
		ContextManager.push("screen-save-load", { singleton: true, createMouseGuard: true, attributes: { "menu-type": "load", "server-type": MultiplayerShellManager.serverType, "save-type": SaveTypes.NETWORK_MULTIPLAYER } });
	}

	private onClose() {
		this.close();
		window.dispatchEvent(new MainMenuReturnEvent());
	}
}

Controls.define('screen-mp-game-mode', {
	createInstance: PanelMPGameMode,
	description: 'Game mode selection screen for Apple Arcade multiplayer.',
	classNames: ['mp-game-mode'],
	styles: ['fs://game/core/ui/shell/mp-game-mode/mp-game-mode.css'],
	content: ['fs://game/core/ui/shell/mp-game-mode/mp-game-mode.html'],
	attributes: []
});
