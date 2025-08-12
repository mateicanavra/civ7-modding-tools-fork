/**
 * @file mp-link-account.ts
 * @copyright 2020-2025, Firaxis Games
 * @description The Create/Link 2K Account screen
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import Panel from '/core/ui/panel-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
export class MpLinkAccount extends Panel {
    constructor(root) {
        super(root);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.QrLinkAndImageReadyListener = this.onQrLinkAndImageReady.bind(this);
        this.QrLinkCompletedListener = this.onQrLinkCompleted.bind(this);
        this.qrCodeImage = MustGetElement('.qr-code-image', this.Root);
        this.qrCodeText = MustGetElement('.qr-code-text', this.Root);
    }
    onInitialize() {
        super.onInitialize();
        this.Root.classList.add('mp-link-account', 'absolute', 'inset-0', 'flex', 'flex-row', 'justify-center', 'items-center');
    }
    onAttach() {
        super.onAttach();
        // disable clicking on the connection status icon while this popup is open
        const connStatus = document.querySelector('.connection-status');
        connStatus?.classList.add('no-mouse');
        const frame = MustGetElement(".mp-link-account__main-content", this.Root);
        this.Root.addEventListener('engine-input', this.engineInputListener);
        const closeButton = document.createElement('fxs-close-button');
        closeButton.classList.add("top-4", "-right-12");
        closeButton.addEventListener('action-activate', () => { this.close(); });
        frame.appendChild(closeButton);
        let goToUnlinkPortal = this.isAccountLinked();
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
        const connStatus = document.querySelector('.connection-status');
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
    isAccountLinked() {
        return Network.isLoggedIn() && Network.isAccountComplete() && Network.isFullAccountLinked();
    }
    setupQrLinkAndImage(useUnlink) {
        this.setupQrImage(useUnlink);
        this.setupQrLink(useUnlink);
        if (!useUnlink) {
            engine.on("QrAccountLinked", this.QrLinkCompletedListener);
        }
    }
    setupQrImage(useUnlink) {
        let qrCode = "";
        if (!useUnlink) {
            qrCode = Network.getQrCodeImage();
        }
        else {
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
            }
            else {
                if (qrCode && qrCode.length > 0) {
                    // HTML SVG tags need some assistance to resize to their parent <div>, so we add the magic sauce to the downloaded SVG.
                    const originalText = `<svg`;
                    const replacementText = `<svg x="0" y="0" width="100%" height="100%"`;
                    this.qrCodeImage.innerHTML = qrCode.replace(originalText, replacementText);
                }
                else {
                    console.error("mp-link-support: couldn't get QR code from server");
                    this.qrCodeImage.style.backgroundImage = ""; // show no image if QR code was unable to be fetched
                }
            }
        }
        else {
            console.error("mp-link-support: qr-code-image is missing");
        }
    }
    setupQrLink(useUnlink) {
        let verificationUrl = useUnlink ? Network.getQrTwoKPortalUrl() : Network.getQrVerificationUrl();
        let firstPartyType = Network.getLocalHostingPlatform();
        let isPCPlatform = firstPartyType == HostingType.HOSTING_TYPE_STEAM || firstPartyType == HostingType.HOSTING_TYPE_EOS;
        if (this.qrCodeText) {
            if (!verificationUrl || verificationUrl.length == 0) {
                console.error("mp-link-support: couldn't get URL from server");
                verificationUrl = Locale.compose("LOC_UI_LINK_ACCOUNT_QR_CODE_FETCH_FAILURE");
            }
            else {
                if (isPCPlatform) {
                    verificationUrl = '<span class="clickable-link">' + verificationUrl + '</span>';
                }
            }
            if (useUnlink) {
                // Go to the portal to unlink
                this.qrCodeText.innerHTML = Locale.compose("LOC_UI_GO_TO_PORTAL", verificationUrl);
            }
            else {
                if (Network.isLoggedIn()) {
                    if (!Network.isAccountLinked()) {
                        this.qrCodeText.innerHTML = Locale.compose("LOC_UI_LINK_ACCOUNT_QR_CODE", verificationUrl);
                    }
                    else if (!Network.isAccountComplete())
                        //Account is incomplete
                        this.qrCodeText.innerHTML = Locale.compose("LOC_UI_ACCOUNT_INCOMPLETE", verificationUrl);
                }
                else {
                }
            }
            let firstPartyType = Network.getLocalHostingPlatform();
            if (firstPartyType == HostingType.HOSTING_TYPE_STEAM || firstPartyType == HostingType.HOSTING_TYPE_EOS) {
            }
            this.qrCodeText.addEventListener('click', () => {
                if (useUnlink) {
                    Network.openTwoKPortalURL();
                }
                else {
                    Network.openVerificationURL();
                }
            });
        }
        else {
            console.error("mp-link-support: qr-code-text is missing");
        }
    }
    onQrLinkAndImageReady() {
        engine.off("QrLinkAndImageReady", this.QrLinkAndImageReadyListener);
        this.setupQrLinkAndImage(this.isAccountLinked());
    }
    onQrLinkCompleted() {
        engine.off("QrAccountLinked", this.QrLinkCompletedListener);
        this.close();
    }
    onEngineInput(inputEvent) {
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
Controls.define('screen-mp-link-account', {
    createInstance: MpLinkAccount,
    description: 'Screen to link your 2K account.',
    styles: ['fs://game/core/ui/shell/mp-link-account/mp-link-account.css'],
    content: ['fs://game/core/ui/shell/mp-link-account/mp-link-account.html'],
    tabIndex: -1,
});

//# sourceMappingURL=file:///core/ui/shell/mp-link-account/mp-link-account.js.map
