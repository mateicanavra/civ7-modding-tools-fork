/**
 * @file giftbos-popup.ts
 * @copyright 2023-2024, Firaxis Games
 * @description Handles giftbox popup.
 */
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent } from "/core/ui/input/input-support.js";
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import RewardsNotificationManager from "/core/ui/rewards-notifications/rewards-notification-manager.js";
class GiftboxPopup extends Panel {
    constructor(root) {
        super(root);
        this.continueButtonListener = () => { this.ClosePopup(); };
        this.engineInputListener = this.onEngineInput.bind(this);
        this.inputHandler = this.Root;
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "gift-box");
    }
    onAttach() {
        super.onAttach();
        this.inputHandler.addEventListener("engine-input", this.engineInputListener);
        const continueButton = this.Root.querySelector('.continue');
        if (continueButton) {
            continueButton.addEventListener('action-activate', this.continueButtonListener);
            continueButton.setAttribute('data-audio-group-ref', 'collections');
            continueButton.setAttribute('data-audio-activate-ref', 'data-audio-popup-cancel-activate');
            this.rewardsScrollable.whenComponentCreated(c => c.setEngineInputProxy(continueButton));
        }
        this.displayRewards();
    }
    onInitialize() {
        this.rewardsScrollable = MustGetElement('.rewards-scrollable', this.Root);
        this.rewardsScrollable.setAttribute("tabindex", "-1");
    }
    onDetach() {
        const continueButtonListener = this.Root.querySelector('.continue');
        continueButtonListener?.removeEventListener('action-activate', this.continueButtonListener);
        this.inputHandler.removeEventListener("engine-input", this.engineInputListener);
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        FocusManager.setFocus(this.rewardsScrollable);
        this.generalNavTrayUpdate();
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    generalNavTrayUpdate() {
        NavTray.clear();
        NavTray.addOrUpdateGenericAccept();
    }
    displayRewards() {
        const allRewards = Online.UserProfile.getRewardEntries();
        const newItems = Online.UserProfile.getNewlyUnlockedItems();
        if (newItems.length > 0) {
            this.rewardsScrollable?.setAttribute("handle-gamepad-pan", "true");
            const rewardsScrollableBox = document.createElement('div');
            rewardsScrollableBox.classList.add('rewards-scrollable-inner-box', 'relative', 'min-h-1\\/2', 'flow-column', 'grow');
            const rewardsScrollableBoxBG = document.createElement('div');
            rewardsScrollableBoxBG.classList.add('giftbox-scrollable-bg', 'absolute', 'w-full', 'h-full', 'inset-0', 'bg-cover', 'bg-no-repeat', 'pointer-events-none');
            rewardsScrollableBox.appendChild(rewardsScrollableBoxBG);
            newItems.forEach(dnaItemID => {
                const item = allRewards.find((r) => r.dnaItemID === dnaItemID);
                if (item) {
                    // display reward item
                    const rewardContainer = document.createElement('fxs-vslot');
                    rewardContainer.classList.add('flex-auto', 'items-center');
                    const rewardDisplay = document.createElement('fxs-hslot');
                    rewardDisplay.classList.add('flex', 'flex-auto', 'reward-display', 'items-center', 'h-24', 'w-full', 'px-3', 'pt-3', 'pb-3');
                    let iconURL = "fs://game/" + item.iconName;
                    if (Online.UserProfile.getUnlockableRewardTypeIDString(item.type) == "UNLOCKABLEREWARD_TYPE_BANNER") {
                        iconURL = 'fs://game/prof_banner.png';
                    }
                    const rewardIcon = document.createElement('div');
                    rewardIcon.classList.add('reward-display__reward-icon', 'h-18', 'w-18', 'inset-0', 'bg-cover', 'bg-no-repeat', 'pointer-events-none');
                    rewardIcon.style.setProperty("background-image", `url(${iconURL})`);
                    rewardDisplay.appendChild(rewardIcon);
                    const rewardText = document.createElement('fxs-vslot');
                    rewardText.classList.add('reward-display__reward-text-container', 'flex', 'flex-auto', 'w-full', 'px-2', 'justify-top');
                    const rewardName = document.createElement('div');
                    rewardName.classList.add('reward-display__reward-text-name', 'text-base', 'font-title', 'text-accent-3', 'tracking-100', 'text-2xs', 'uppercase', 'text-left', 'mb-2');
                    rewardName.innerHTML = Locale.stylize(item.name);
                    rewardText.appendChild(rewardName);
                    const rewardDescription = document.createElement('div');
                    rewardDescription.classList.add('reward-display__reward-text-description', 'text-base', 'font-body', 'text-accent-3', 'tracking-100', 'text-2xs', 'text-left', 'mb-2');
                    rewardDescription.innerHTML = Locale.stylize(item.description);
                    rewardText.appendChild(rewardDescription);
                    rewardDisplay.appendChild(rewardText);
                    const RewardDivider = document.createElement('div');
                    RewardDivider.classList.add('filigree-divider-inner-frame', 'w-full', 'mt-2', 'mb-2');
                    rewardContainer.appendChild(rewardDisplay);
                    rewardContainer.appendChild(RewardDivider);
                    rewardsScrollableBox?.appendChild(rewardContainer);
                }
            });
            this.rewardsScrollable?.appendChild(rewardsScrollableBox);
        }
    }
    onEngineInput(inputEvent) {
        if (this.handleEngineInput(inputEvent)) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    handleEngineInput(inputEvent) {
        if (inputEvent.detail.name == 'scroll-pan') {
            this.rewardsScrollable?.dispatchEvent(InputEngineEvent.CreateNewEvent(inputEvent));
            return false;
        }
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return false;
        }
        if (inputEvent.detail.name == 'accept' || inputEvent.isCancelInput()) {
            this.ClosePopup();
            return true;
        }
        return false;
    }
    ClosePopup() {
        Online.UserProfile.clearNewlyUnlockedItems();
        RewardsNotificationManager.setNotificationVisibility(Online.UserProfile.getNewlyUnlockedItems().length > 0);
        this.close();
    }
}
Controls.define('screen-giftbox-popup', {
    createInstance: GiftboxPopup,
    description: 'Handles giftbox notifications.',
    classNames: ['giftbox-popup'],
    styles: ['fs://game/core/ui/shell/gift-notifications/giftbox-popup.css'],
    content: ['fs://game/core/ui/shell/gift-notifications/giftbox-popup.html'],
    attributes: []
});

//# sourceMappingURL=file:///core/ui/shell/gift-notifications/giftbox-popup.js.map
