/**
 * @file screen-dlc-viewer.ts
 * @copyright 2023-2024, Firaxis Games
 * @description Shows selected DLC.
 */
import Panel from '/core/ui/panel-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
const bForceShowPromoLoadingSpinner = false; // PROMO_TODO: remove this when promo loading spinner is fully implemented by UI.
class PanelDLCViewer extends Panel {
    constructor(root) {
        super(root);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.backButtonListener = this.close.bind(this);
        this.owned = true;
        this.scrollable = null;
    }
    onInitialize() {
        // Image
        const imageURL = this.Root.getAttribute('imageUrl');
        const dlcImage = MustGetElement(".dlc-image", this.Root);
        if (imageURL && !bForceShowPromoLoadingSpinner) {
            this.hidePromoLoadingSpinner();
        }
        else {
            this.showPromoLoadingSpinner();
        }
        dlcImage.style.backgroundImage = imageURL ? `url(${imageURL})` : '';
        // Title
        const contentTitle = this.Root.getAttribute('contentTitle');
        const dlcName = MustGetElement(".dlc-name", this.Root);
        dlcName.setAttribute('title', contentTitle ? contentTitle : '');
        // Content
        const contentDescription = this.Root.getAttribute('contentDescription');
        const dlcText = MustGetElement(".dlc-text", this.Root);
        dlcText.innerHTML = Locale.stylize(contentDescription);
        // Cancel / Back button
        const backButton = MustGetElement('.cancel', this.Root);
        backButton.addEventListener("action-activate", this.backButtonListener);
        this.scrollable = MustGetElement(".dlc-viewer-scrollable", this.Root);
        // Ownership conditions
        const owned = this.Root.getAttribute('owned');
        if (owned != 'true') {
            this.owned = false;
            const buyButton = MustGetElement(".buy", this.Root);
            buyButton.classList.remove("hidden");
            backButton.setAttribute('caption', 'LOC_GENERIC_CANCEL');
            buyButton.addEventListener('action-activate', this.buyPromo.bind(this));
        }
    }
    // PROMO_TODO: We will want to make this animated like the one in loading screen. Waiting on UI/UX design and implementation: https://2kfxs.atlassian.net/browse/IGP-103673
    showPromoLoadingSpinner() {
        console.log("Showing Promo Loading Spinner!");
    }
    // PROMO_TODO: We will want to make this animated like the one in loading screen. Waiting on UI/UX design and implementation: https://2kfxs.atlassian.net/browse/IGP-103673
    hidePromoLoadingSpinner() {
        console.log("Hiding Promo Loading Spinner!");
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('engine-input', this.engineInputListener);
    }
    onDetach() {
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
        if (!this.owned) {
            NavTray.addOrUpdateShellAction1("LOC_UI_STORE_BUY");
        }
        FocusManager.setFocus(this.Root);
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    close() {
        super.close();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.name == 'scroll-pan') {
            this.scrollable?.dispatchEvent(InputEngineEvent.CreateNewEvent(inputEvent));
            return;
        }
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.detail.name == 'shell-action-1') {
            if (!this.owned) {
                this.buyPromo();
            }
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        if (inputEvent.isCancelInput()) {
            this.close();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    buyPromo() {
        const contentID = this.Root.getAttribute('contentID');
        if (!contentID) {
            console.error("screen-dlc-viewer: onAttach: contentID is not valid");
            return;
        }
        Online.Promo.interactWithPromo(PromoAction.Interact, contentID, "2K Store launcher screen", -1);
    }
}
Controls.define('screen-dlc-viewer', {
    createInstance: PanelDLCViewer,
    description: 'Shows the details of the selected DLC',
    classNames: ['dlc-viewer', 'absolute', 'bottom-0', 'h-full', 'w-full'],
    styles: ['fs://game/core/ui/shell/store-launcher/2k-code-redemption.css'],
    content: ['fs://game/core/ui/shell/store-launcher/screen-dlc-viewer.html'],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/shell/store-launcher/screen-dlc-viewer.js.map
