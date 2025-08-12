/**
 * @file screen-reward-unlocked.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Screen for displaying info for recently unlocked rewards.
 */
import { UnlockPopupManager } from "/base-standard/ui/unlocks/unlocks-manager.js";
import Panel from "/core/ui/panel-support.js";
import FocusManager from '/core/ui/input/focus-manager.js';
class ScreenRewardUnlocked extends Panel {
    constructor() {
        super(...arguments);
        this.popupData = UnlockPopupManager.currentUnlockedRewardData;
        this.closeButton = document.createElement('fxs-button');
    }
    onInitialize() {
        super.onInitialize();
        this.render();
        this.enableOpenSound = true;
        this.Root.setAttribute("data-audio-group-ref", "audio-reward-unlocked");
        this.Root.classList.add("absolute");
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('engine-input', this.onEngineInput);
    }
    onDetach() {
        this.Root.removeEventListener('engine-input', this.onEngineInput);
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        FocusManager.setFocus(this.closeButton);
    }
    onLoseFocus() {
        super.onLoseFocus();
    }
    render() {
        this.popupData = UnlockPopupManager.currentUnlockedRewardData;
        if (!this.popupData) {
            console.error('screen-reward-unlocked: there was not data for the unlock');
            UnlockPopupManager.closePopup();
            return;
        }
        const civBackgroundURL = UI.getIconCSS(this.popupData.icon, "BACKGROUND");
        const civIcons = UI.getIconURL(this.popupData.icon);
        const modalFrame = document.createElement('fxs-modal-frame');
        const headerWrapper = document.createElement('div');
        headerWrapper.classList.add('relative');
        const header = document.createElement('fxs-header');
        header.setAttribute('title', 'LOC_CIVILIZATION_UNLOCKED');
        header.setAttribute('filigree-style', 'small');
        header.classList.add('font-title', 'uppercase', 'tracking-150', 'text-lg', 'text-gradient-secondary');
        const headerGlow = document.createElement('div');
        headerGlow.classList.add('absolute', 'inset-0', 'opacity-25', 'img-popup_icon_glow');
        headerWrapper.appendChild(headerGlow);
        headerWrapper.appendChild(header);
        const descriptionContainer = document.createElement('div');
        descriptionContainer.classList.add('flex', 'justify-center', 'text-center');
        const description = document.createElement('p');
        description.classList.add('font-body', 'text-sm', 'min-w-96', 'max-w-128', 'my-5', 'text-accent-2');
        if (this.popupData.requirements.length > 0 && this.popupData.requirements[0].narrative) {
            let subString = "";
            const localPlayer = Players.get(GameContext.localPlayerID);
            if (localPlayer) {
                subString = Locale.compose(localPlayer.civilizationAdjective);
            }
            const narrString = Locale.compose(this.popupData.requirements[0].narrative, subString);
            description.setAttribute('data-l10n-id', narrString);
        }
        else {
            description.setAttribute('data-l10n-id', 'LOC_CIVILIZATION_UNLOCKED_NEXT_AGE');
        }
        descriptionContainer.appendChild(description);
        const unlockedRewardWrapper = document.createElement('div');
        unlockedRewardWrapper.classList.add('flex', 'justify-center', 'mb-8', 'opacity-75');
        const unlockIcon = document.createElement('img');
        unlockIcon.classList.add('size-24', 'mt-4');
        unlockIcon.src = civIcons;
        const unlockedCivWrapper = document.createElement('div');
        unlockedCivWrapper.classList.add('flex-auto', 'h-52', 'bg-cover', 'bg-center', 'bg-no-repeat', 'bg-primary', 'border-2', 'border-secondary-2', 'flow-column', 'justify-between', 'items-center');
        unlockedCivWrapper.style.backgroundImage = civBackgroundURL;
        const unlockNameContainer = document.createElement('div');
        unlockNameContainer.classList.add('reward-unlocked__bg-gradient', 'text-center', 'w-full', 'relative', 'min-h-16');
        const unlockNameFiligree = document.createElement('div');
        unlockNameFiligree.classList.add('reward-unlocked__filigree', 'filigree-divider-h3', 'absolute', '-top-5', '-mt-0\\.5');
        const unlockNameText = document.createElement('div');
        unlockNameText.classList.add('text-xl', 'uppercase', 'font-title', 'text-center', 'tracking-150', 'font-bold', 'pt-5');
        unlockNameText.setAttribute('data-l10n-id', this.popupData.name);
        unlockNameContainer.appendChild(unlockNameFiligree);
        unlockNameContainer.appendChild(unlockNameText);
        unlockedCivWrapper.appendChild(unlockIcon);
        unlockedCivWrapper.appendChild(unlockNameContainer);
        unlockedRewardWrapper.appendChild(unlockedCivWrapper);
        const progressMetWrapper = document.createElement('div');
        const textBox = document.createElement('div');
        textBox.classList.add('min-w-96', 'max-w-128', 'flow-column', 'items-center', 'justify-center', 'mb-8', 'relative', 'min-h-24');
        // middle decor
        const middleDecor = document.createElement('div');
        middleDecor.classList.add('absolute', '-top-1', 'h-4', 'w-16', 'bg-center', 'bg-no-repeat', 'bg-contain');
        middleDecor.style.backgroundImage = 'url(fs://game/popup_middle_decor.png)';
        // top border
        const topBorder = document.createElement('div');
        topBorder.classList.add('reward-unlocked__border-bar', 'absolute', 'top-0', 'h-6', 'w-full');
        // bottom-border
        const bottomBorder = document.createElement('div');
        bottomBorder.classList.add('reward-unlocked__border-bar', '-scale-y-100', 'absolute', 'bottom-0', 'h-6', 'w-full');
        textBox.appendChild(middleDecor);
        textBox.appendChild(topBorder);
        textBox.appendChild(bottomBorder);
        for (const requirementMet of this.popupData.requirements) {
            const textWrapper = document.createElement('div');
            textWrapper.classList.value = 'flex items-center flex-auto px-2';
            const progressText = document.createElement('div');
            progressText.classList.add('font-body', 'text-sm', 'flex-auto');
            progressText.setAttribute('data-l10n-id', requirementMet.description);
            const completedCheck = document.createElement('img');
            completedCheck.classList.add('size-6', 'mr-3');
            completedCheck.setAttribute('src', 'shell_circle-checkmark');
            textWrapper.appendChild(completedCheck);
            textWrapper.appendChild(progressText);
            textBox.appendChild(textWrapper);
        }
        progressMetWrapper.appendChild(textBox);
        this.closeButton.setAttribute('caption', 'LOC_GENERIC_CONTINUE');
        this.closeButton.setAttribute('action-key', 'inline-accept');
        this.closeButton.addEventListener('action-activate', UnlockPopupManager.closePopup);
        modalFrame.appendChild(headerWrapper);
        modalFrame.appendChild(descriptionContainer);
        modalFrame.appendChild(unlockedRewardWrapper);
        modalFrame.appendChild(progressMetWrapper);
        modalFrame.appendChild(this.closeButton);
        this.Root.appendChild(modalFrame);
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
            UnlockPopupManager.closePopup();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
}
Controls.define('screen-reward-unlocked', {
    createInstance: ScreenRewardUnlocked,
    description: 'Screen for displaying info for recently unlocked rewards.',
    styles: ["fs://game/base-standard/ui/unlocks/screen-reward-unlocked.css"]
});

//# sourceMappingURL=file:///base-standard/ui/unlocks/screen-reward-unlocked.js.map
