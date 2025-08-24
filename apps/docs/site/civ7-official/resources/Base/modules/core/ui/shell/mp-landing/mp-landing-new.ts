/**
 * @file mp-landing-new.ts		
 * @copyright 2023, Firaxis Games
 * @description Multiplayer landing screen.  
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import MultiplayerShellManager from '/core/ui/shell/mp-shell-logic/mp-shell-logic.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { MainMenuReturnEvent } from '/core/ui/events/shell-events.js';

// TODO move this logic on the main menu and remove this screen when the main menu is reworked and we have submenus
class PanelMPLanding extends Panel {

	private internetButton!: HTMLElement;
	private localButton!: HTMLElement;
	private wlanButton!: HTMLElement;
	private closeButton!: HTMLElement;
	private slotDiv!: HTMLElement;

	private closeButtonListener = this.onClose.bind(this);
	private localButtonListener = this.onLocal.bind(this);
	private wLanButtonListener = this.onWLan.bind(this);
	private internetButtonListener = this.onInternet.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private connectionStatusChangedListener = this.onConnectionStatusChanged.bind(this);

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToRight;
	}

	onInitialize() {
		this.internetButton = MustGetElement(".mp-landing-new__internet-button", this.Root);
		this.localButton = MustGetElement(".mp-landing-new__local-button", this.Root);
		this.wlanButton = MustGetElement(".mp-landing-new__wlan-button", this.Root);
		this.closeButton = MustGetElement(".mp-landing-new__close-button", this.Root);
		this.slotDiv = MustGetElement(".mp-landing-new__slot", this.Root);

		const internetButtonBgImg = document.createElement("div");
		internetButtonBgImg.classList.add("absolute", "inset-0\\.5", "img-bg-card-buganda");
		waitForLayout(() => this.internetButton.insertAdjacentElement("afterbegin", internetButtonBgImg));

		const localButtonBgImg = document.createElement("div");
		localButtonBgImg.classList.add("absolute", "inset-0\\.5", "img-bg-card-aksum");
		waitForLayout(() => this.localButton.insertAdjacentElement("afterbegin", localButtonBgImg));

		const wlanButtonBgImg = document.createElement("div");
		wlanButtonBgImg.classList.add("absolute", "inset-0\\.5", "img-bg-card-aksum");
		waitForLayout(() => this.wlanButton.insertAdjacentElement("afterbegin", wlanButtonBgImg));

		this.enableOpenSound = true;
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "audio-mp-landing");
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);

		this.internetButton.addEventListener('action-activate', this.internetButtonListener);
		this.internetButton.setAttribute("data-audio-group-ref", "audio-mp-landing");
		this.internetButton.setAttribute("data-audio-activate-ref", "data-audio-mp-internet");

		this.localButton.addEventListener('action-activate', this.localButtonListener);
		this.localButton.setAttribute("data-audio-group-ref", "audio-mp-landing");
		this.localButton.setAttribute("data-audio-activate-ref", "data-audio-mp-lan");

		this.wlanButton.addEventListener('action-activate', this.wLanButtonListener);
		this.wlanButton.setAttribute("data-audio-group-ref", "audio-mp-landing");
		this.wlanButton.setAttribute("data-audio-activate-ref", "data-audio-mp-lan");

		const isLANServerTypeSupported = Network.hasCapability(NetworkCapabilityTypes.LANServerType);
		const isWirelessServerTypeSupported = Network.hasCapability(NetworkCapabilityTypes.WirelessServerType);

		if (!isLANServerTypeSupported) {
			this.localButton.classList.add('hidden');
		}

		if (!isWirelessServerTypeSupported) {
			this.wlanButton.classList.add('hidden');
		} else if (Online.LiveEvent.getLiveEventGameFlag()) {
			this.wlanButton.setAttribute('disabled', 'true');
			this.wlanButton.setAttribute('data-tooltip-content', 'LOC_UI_EVENTS_MULTIPLAYER_NO_WIRELESS');
		}

		this.closeButton.addEventListener('action-activate', this.closeButtonListener);

		// Listen for the connection status changed message
		engine.on("ConnectionStatusChanged", this.connectionStatusChangedListener);

		if (!Network.isConnectedToMultiplayerService(ServerType.SERVER_TYPE_INTERNET)) {
			// If we're not connected to any multiplayer service,
			// so disable the internet button
			this.internetButton.setAttribute('disabled', 'true');

			// Begin our connection. We'll get a connection status event after we've connected.
			Network.connectToMultiplayerService(ServerType.SERVER_TYPE_INTERNET);
		}

		if (MultiplayerShellManager.skipToGameCreator) {
			// force this dialog to go directly via OnInternet Flow (Sony)
			this.onInternet();
		}

		if (!isLANServerTypeSupported && !isWirelessServerTypeSupported) {
			// force this dialog to go directly via OnInternet Flow (internet is the only option left)
			this.onInternet();
		}
	}

	onDetach() {
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();

		FocusManager.setFocus(this.slotDiv);
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	onClose() {
		// clear the live event flag as effectively cancelling it
		if (Network.supportsSSO() && Online.LiveEvent.getLiveEventGameFlag()) {
			Online.LiveEvent.clearLiveEventGameFlag();
			Online.LiveEvent.clearLiveEventConfigKeys();
		}

		this.close();
		window.dispatchEvent(new MainMenuReturnEvent());
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
	}

	private onConnectionStatusChanged(data: ConnectionStatusChangedData) {
		if (data.server == ServerType.SERVER_TYPE_INTERNET) {
			const internetButton: HTMLElement | null = this.Root.querySelector<HTMLElement>('.internet-button');
			if (internetButton) {
				internetButton.setAttribute('disabled', data.connected ? 'false' : 'true');
			} else {
				console.error("mp-landing: onConnectionStatusChanged(): Missing internet button.");
			}
		}
	}

	private onWLan() {
		this.close();
		MultiplayerShellManager.onGameBrowse(ServerType.SERVER_TYPE_WIRELESS);
	}

	private onInternet() {
		this.close();
		MultiplayerShellManager.onGameBrowse(ServerType.SERVER_TYPE_INTERNET);
	}

	private onLocal() {
		this.close();
		MultiplayerShellManager.onGameBrowse(ServerType.SERVER_TYPE_LAN);
	}
}

Controls.define('screen-mp-landing', {
	createInstance: PanelMPLanding,
	description: 'Landing screen for multiplayer.',
	classNames: ['mp-landing'],
	styles: ['fs://game/core/ui/shell/mp-landing/mp-landing-new.css'],
	content: ['fs://game/core/ui/shell/mp-landing/mp-landing-new.html'],
	attributes: []
});
