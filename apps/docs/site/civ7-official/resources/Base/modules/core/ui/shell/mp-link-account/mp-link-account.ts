/**
 * @file mp-link-account.ts
 * @copyright 2020-2025, Firaxis Games
 * @description The Create/Link 2K Account screen
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import Panel from '/core/ui/panel-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

export class MpLinkAccount extends Panel {

	private engineInputListener = this.onEngineInput.bind(this);
	private QrLinkAndImageReadyListener = this.onQrLinkAndImageReady.bind(this);
	private QrLinkCompletedListener = this.onQrLinkCompleted.bind(this);

	private qrCodeImage: HTMLElement;
	private qrCodeText: HTMLElement;

	constructor(root: ComponentRoot) {
		super(root);

		this.qrCodeImage = MustGetElement('.qr-code-image', this.Root);
		this.qrCodeText = MustGetElement('.qr-code-text', this.Root);
	}

	onInitialize(): void {
		super.onInitialize();

		this.Root.classList.add('mp-link-account', 'absolute', 'inset-0', 'flex', 'flex-row', 'justify-center', 'items-center');
	}

	onAttach() {
		super.onAttach();

		// disable clicking on the connection status icon while this popup is open
		const connStatus = document.querySelector<HTMLElement>('.connection-status');
		connStatus?.classList.add('no-mouse');

		const frame = MustGetElement(".mp-link-account__main-content", this.Root);

		this.Root.addEventListener('engine-input', this.engineInputListener);

		const closeButton: HTMLElement = document.createElement('fxs-close-button');
		closeButton.classList.add("top-4", "-right-12");
		closeButton.addEventListener('action-activate', () => { this.close(); });
		frame.appendChild(closeButton);

		let goToUnlinkPortal: boolean = this.isAccountLinked();

		if (goToUnlinkPortal) {
			this.setupQrLinkAndImage(goToUnlinkPortal);
		}
		else if (Network.isQrCodeAndLinkReady()) {
			Network.sendQrStatusQuery();
			this.setupQrLinkAndImage(goToUnlinkPortal);
		}
		else {
			this.qrCodeText.innerHTML = Locale.compose("LOC_UI_LINK_ACCOUNT_QR_CODE_FETCH");
			Network.tryFetchQRLinkCode();
			engine.on("QrLinkAndImageReady", this.QrLinkAndImageReadyListener);
		}
	}

	onDetach() {
		this.Root.removeEventListener('engine-input', this.engineInputListener);
		engine.off("QrAccountLinked", this.QrLinkCompletedListener);
		engine.off("QrLinkAndImageReady", this.QrLinkAndImageReadyListener);

		const connStatus = document.querySelector<HTMLElement>('.connection-status');
		if (connStatus) {
			connStatus.classList.remove('no-mouse');
		}

		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		FocusManager.setFocus(this.Root);

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private isAccountLinked() {
		return Network.isLoggedIn() && Network.isAccountComplete() && Network.isFullAccountLinked();
	}

	private setupQrLinkAndImage(useUnlink: boolean) {
		this.setupQrImage(useUnlink);
		this.setupQrLink(useUnlink);

		if (!useUnlink) {
			engine.on("QrAccountLinked", this.QrLinkCompletedListener);
		}
	}

	private setupQrImage(useUnlink: boolean) {

		let qrCode: string = "";
		if (!useUnlink) {
			qrCode = Network.getQrCodeImage();
		} else {
			qrCode = "fs://game/UnlinkPortalQRCode.png";
		}

		if (this.qrCodeImage) {
			if (useUnlink) {
				const imgElement = document.createElement('img');
				imgElement.src = qrCode;
				imgElement.style.width = '100%';
				imgElement.style.height = '100%';

				this.qrCodeImage.innerHTML = '';
				this.qrCodeImage.appendChild(imgElement);
			} else {
				if (qrCode && qrCode.length > 0) {
					// HTML SVG tags need some assistance to resize to their parent <div>, so we add the magic sauce to the downloaded SVG.
					const originalText: string = `<svg`;
					const replacementText: string = `<svg x="0" y="0" width="100%" height="100%"`;
					this.qrCodeImage.innerHTML = qrCode.replace(originalText, replacementText);
				} else {
					console.error("mp-link-support: couldn't get QR code from server");
					this.qrCodeImage.style.backgroundImage = "";	// show no image if QR code was unable to be fetched
				}
			}
		} else {
			console.error("mp-link-support: qr-code-image is missing");
		}
	}

	private setupQrLink(useUnlink: boolean) {
		let verificationUrl: string = useUnlink ? Network.getQrTwoKPortalUrl() : Network.getQrVerificationUrl();
		let firstPartyType: HostingType = Network.getLocalHostingPlatform();
		let isPCPlatform: boolean = firstPartyType == HostingType.HOSTING_TYPE_STEAM || firstPartyType == HostingType.HOSTING_TYPE_EOS

		if (this.qrCodeText) {
			if (!verificationUrl || verificationUrl.length == 0) {
				console.error("mp-link-support: couldn't get URL from server");
				verificationUrl = Locale.compose("LOC_UI_LINK_ACCOUNT_QR_CODE_FETCH_FAILURE");
			} else {
				if (isPCPlatform) {
					verificationUrl = '<span class="clickable-link">' + verificationUrl + '</span>';
				}
			}

			if (useUnlink) {
				// Go to the portal to unlink
				this.qrCodeText.innerHTML = Locale.compose("LOC_UI_GO_TO_PORTAL", verificationUrl);
			} else {
				if (Network.isLoggedIn()) {
					if (!Network.isAccountLinked()) {
						this.qrCodeText.innerHTML = Locale.compose("LOC_UI_LINK_ACCOUNT_QR_CODE", verificationUrl);
					} else if (!Network.isAccountComplete())
						//Account is incomplete
						this.qrCodeText.innerHTML = Locale.compose("LOC_UI_ACCOUNT_INCOMPLETE", verificationUrl);
				} else {
				}
			}

			let firstPartyType: HostingType = Network.getLocalHostingPlatform();
			if (firstPartyType == HostingType.HOSTING_TYPE_STEAM || firstPartyType == HostingType.HOSTING_TYPE_EOS) {

			}

			this.qrCodeText.addEventListener('click', () => {
				if (useUnlink) {
					Network.openTwoKPortalURL();
				} else {
					Network.openVerificationURL();
				}
			});

		} else {
			console.error("mp-link-support: qr-code-text is missing");
		}
	}

	private onQrLinkAndImageReady() {
		engine.off("QrLinkAndImageReady", this.QrLinkAndImageReadyListener);
		this.setupQrLinkAndImage(this.isAccountLinked());
	}

	private onQrLinkCompleted() {
		engine.off("QrAccountLinked", this.QrLinkCompletedListener);
		this.close();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput()) {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'screen-mp-link-account': ComponentRoot<MpLinkAccount>;
	}
}

Controls.define('screen-mp-link-account', {
	createInstance: MpLinkAccount,
	description: 'Screen to link your 2K account.',
	styles: ['fs://game/core/ui/shell/mp-link-account/mp-link-account.css'],
	content: ['fs://game/core/ui/shell/mp-link-account/mp-link-account.html'],
	tabIndex: -1,
});
