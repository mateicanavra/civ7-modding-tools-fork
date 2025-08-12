/**
 * @file collection-content.ts
 * @copyright 2024, Firaxis Games
 * @description Screen containning the collection-content.
 */

import ContextManager from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { CollectionContent } from '/core/ui/shell/collection/collection-content.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

export class ScreenStoreLauncher extends Panel {

	private backButton!: HTMLElement;
	private redeemButton!: HTMLElement;
	private collectionContent!: ComponentRoot<CollectionContent>;

	private backButtonActivateListener = this.onBackButtonActivate.bind(this);
	private redeemButtonActivateListener = this.onRedeemButtonActivate.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);

	constructor(root: ComponentRoot) {
		super(root);
	};

	onInitialize(): void {
		super.onInitialize();

		this.backButton = MustGetElement(".collection-cancel-button", this.Root);
		this.redeemButton = MustGetElement(".collection-redeem-button", this.Root);
		this.collectionContent = MustGetElement(".collection-content", this.Root);
		this.enableOpenSound = true;
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "collections");
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener("engine-input", this.engineInputListener);
		this.redeemButton.addEventListener("action-activate", this.redeemButtonActivateListener);
		this.redeemButton.setAttribute("data-audio-group-ref", "collections");
		this.redeemButton.setAttribute("data-audio-activate-ref", "data-audio-redeem-activate");
		this.backButton.addEventListener("action-activate", this.backButtonActivateListener);
	}

	onDetach() {
		super.onDetach();
		Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.Extras, MenuAction: TelemetryMenuActionType.Exit });
		this.Root.removeEventListener("engine-input", this.engineInputListener);
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		FocusManager.setFocus(this.collectionContent);

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
		NavTray.addOrUpdateShellAction2("LOC_GENERIC_REDEEMCODE");
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	override setPanelOptions(_panelOptions: object): void {
		const pendingContentSelection = (_panelOptions as any).selectedContent ?? null;
		this.collectionContent.whenComponentCreated((component) => component.setPendingContentSelection(pendingContentSelection));
	}


	private onEngineInput(inputEvent: InputEngineEvent) {
		if (this.handleEngineInput(inputEvent)) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private handleEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return false;
		}

		if (inputEvent.isCancelInput()) {
			this.close();
			return true;
		}
		else if (inputEvent.detail.name == "shell-action-2") {
			this.onRedeemButtonActivate();
			return true;
		}

		return false;
	}

	private onBackButtonActivate() {
		this.close();
	}

	private onRedeemButtonActivate() {
		ContextManager.push('screen-twok-code-redemption', { singleton: true, createMouseGuard: true });
	}
}

Controls.define('screen-store-launcher', {
	createInstance: ScreenStoreLauncher,
	classNames: ['screen-store-launcher', 'fullscreen', 'flow-column', 'justify-center', 'items-center', 'flex-1'],
	content: ['fs://game/core/ui/shell/store-launcher/screen-store-launcher.html'],
	attributes: [],
});