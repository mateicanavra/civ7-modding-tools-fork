/**
 * @file screen-tech-civic-complete.ts
 * @copyright 2022, Firaxis Games
 * @description Displays info for recently completed tech/civic
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import TechCivicPopupManager, { ProgressionTreeTypes } from '/base-standard/ui/tech-civic-complete/tech-civic-popup-manager.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { getUnlockTargetDescriptions, getUnlockTargetIcon, getUnlockTargetName } from '/base-standard/ui/utilities/utilities-textprovider.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import Panel from '/core/ui/panel-support.js';
import { formatStringArrayAsNewLineText } from '/core/ui/utilities/utilities-core-textprovider.js';
import { TreeNodesSupport } from '/base-standard/ui/tree-grid/tree-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
var ScrollDirection;
(function (ScrollDirection) {
    ScrollDirection[ScrollDirection["Left"] = 0] = "Left";
    ScrollDirection[ScrollDirection["Right"] = 1] = "Right";
})(ScrollDirection || (ScrollDirection = {}));
class ScreenTechCivicComplete extends Panel {
    constructor() {
        super(...arguments);
        this.unlockedItems = [];
        // TODO: To use a fxs-scrollable-horizontal instead of the following arrows and a scrolling handled locally by the screen
        this.leftScrollArrow = null;
        this.rightScrollArrow = null;
        this.currentScrollOffset = 0;
        this.unlockedItemDefinitions = [];
        this.firstVisibleUnlockedItemIndex = 0; // Index of the first / left most visible unlocked item. Use on Gamepad mode only.
        this.unlockedItemFocusListener = this.onUnlockedItemFocus.bind(this);
        this.treeType = ProgressionTreeTypes.CULTURE;
        this.modalFrame = document.createElement('fxs-modal-frame');
        this.buttonSlot = document.createElement('fxs-vslot');
        this.unlockedItemsContainer = document.createElement('fxs-hslot');
        this.unlockItemsParentWrapper = document.createElement('fxs-scrollable');
        this.popupData = TechCivicPopupManager.currentTechCivicPopupData;
        this.nodeDefinition = this.popupData?.node;
        this.tooltipsFocused = false;
        this.engineInputListener = this.onEngineInput.bind(this);
        this.onChangePolicies = () => {
            TechCivicPopupManager.closePopup();
            ContextManager.push("screen-policies", { singleton: true, createMouseGuard: true });
        };
        this.onLeftScrollArrow = () => {
            this.scrollUnlockedItems(ScrollDirection.Left);
        };
        this.onRightScrollArrow = () => {
            this.scrollUnlockedItems(ScrollDirection.Right);
        };
    }
    onInitialize() {
        super.onInitialize();
        if (!this.popupData) {
            console.error("screen-tech-civic-complete: TechCivicPopupData was null/undefined.");
            delayByFrame(() => { TechCivicPopupManager.closePopup(); }, 3);
            return;
        }
        if (!this.popupData.node) {
            console.error("screen-tech-civic-complete: TechCivicPopupData.node was null/undefined.");
            delayByFrame(() => { TechCivicPopupManager.closePopup(); }, 3);
            return;
        }
        const node = Game.ProgressionTrees.getNode(GameContext.localPlayerID, this.popupData.node.ProgressionTreeNodeType);
        if (!node) {
            console.error("screen-tech-civic-complete: Unable to get a ProgressionTreeNode object for ProgressionTreeNodeType: ", this.popupData.node.ProgressionTreeNodeType);
            delayByFrame(() => { TechCivicPopupManager.closePopup(); }, 3);
            return;
        }
        else {
            this.node = node;
        }
        this.treeType = this.popupData.treeType;
        this.updateItemsUnlockedByNode();
        this.render();
    }
    onAttach() {
        super.onAttach();
        const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        if (this.treeType == ProgressionTreeTypes.CULTURE) {
            UI.sendAudioEvent(Audio.getSoundTag('data-audio-showing-civic', 'audio-tech-civic-complete'));
            if (TechCivicPopupManager.isFirstCivic) {
                TechCivicPopupManager.isFirstCivic = false;
            }
        }
        else {
            UI.sendAudioEvent(Audio.getSoundTag('data-audio-showing-tech', 'audio-tech-civic-complete'));
            if (TechCivicPopupManager.isFirstTech) {
                TechCivicPopupManager.isFirstTech = false;
            }
        }
        const quote = GameInfo.TypeQuotes.lookup(this.nodeDefinition.ProgressionTreeNodeType);
        if (quote && quote.QuoteAudio) {
            UI.sendAudioEvent(quote.QuoteAudio);
        }
        this.Root.classList.toggle("pt-8", isMobileViewExperience);
        this.Root.addEventListener('engine-input', this.engineInputListener);
    }
    onDetach() {
        Sound.play("Stop_Quote");
        if (this.treeType == ProgressionTreeTypes.CULTURE) {
            UI.sendAudioEvent(Audio.getSoundTag('data-audio-hiding-civic', 'audio-tech-civic-complete'));
        }
        else {
            UI.sendAudioEvent(Audio.getSoundTag('data-audio-hiding-tech', 'audio-tech-civic-complete'));
        }
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        super.onDetach();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu' || inputEvent.detail.name == 'accept') {
            TechCivicPopupManager.closePopup();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        else if (inputEvent.detail.name == 'shell-action-1' && this.treeType === ProgressionTreeTypes.CULTURE) {
            this.onChangePolicies();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        else if (inputEvent.detail.name == 'shell-action-2') {
            this.toggleTooltips();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
        NavTray.addOrUpdateGenericOK();
        NavTray.addOrUpdateShellAction2("LOC_SHELL_ACTION_4_HELP");
        if (this.treeType === ProgressionTreeTypes.CULTURE) {
            NavTray.addOrUpdateShellAction1("LOC_TECH_CIVIC_CHANGE_POLICIES");
        }
        if (!this.tooltipsFocused) {
            FocusManager.setFocus(this.Root);
        }
        else {
            FocusManager.setFocus(this.unlockedItemsContainer);
        }
    }
    onLoseFocus() {
        NavTray.clear();
    }
    toggleTooltips() {
        if (this.tooltipsFocused) {
            FocusManager.setFocus(this.Root);
        }
        else {
            FocusManager.setFocus(this.unlockedItemsContainer);
        }
        this.tooltipsFocused = !this.tooltipsFocused;
    }
    updateItemsUnlockedByNode() {
        this.unlockedItemDefinitions = [];
        const treeNodeUnlocks = TreeNodesSupport.getValidNodeUnlocks(this.node);
        const removableUnlocks = TreeNodesSupport.getRepeatedUniqueUnits(treeNodeUnlocks);
        for (let i of this.node.unlockIndices) {
            const unlockInfo = GameInfo.ProgressionTreeNodeUnlocks[i];
            if (unlockInfo?.Hidden || unlockInfo.UnlockDepth != this.node.depthUnlocked) {
                continue;
            }
            //Is this a unit, and has it been permanently disabled?
            if (unlockInfo.TargetKind == "KIND_UNIT") {
                const player = Players.get(GameContext.localPlayerID);
                if (player?.Units?.isBuildPermanentlyDisabled(unlockInfo.TargetType)) {
                    continue;
                }
                if (removableUnlocks.includes(unlockInfo.TargetType)) {
                    continue;
                }
            }
            const unlockName = getUnlockTargetName(unlockInfo.TargetType, unlockInfo.TargetKind);
            const unlockDescriptions = getUnlockTargetDescriptions(unlockInfo.TargetType, unlockInfo.TargetKind);
            const unlockFullDesc = formatStringArrayAsNewLineText(unlockDescriptions);
            if (!unlockFullDesc && !unlockName) {
                continue;
            }
            this.unlockedItemDefinitions.push(unlockInfo);
        }
    }
    createUnlockedItem(unlockInfo, index, isOverflow) {
        const unlockedItem = document.createElement("div");
        unlockedItem.classList.add("relative", "size-12", 'bg-center', 'bg-contain', 'bg-no-repeat', 'pointer-events-auto', 'mx-1', 'group');
        unlockedItem.setAttribute("tabindex", index.toString());
        unlockedItem.addEventListener('focus', this.unlockedItemFocusListener);
        const unlockDescriptions = getUnlockTargetDescriptions(unlockInfo.TargetType, unlockInfo.TargetKind);
        const unlockName = getUnlockTargetName(unlockInfo.TargetType, unlockInfo.TargetKind);
        unlockDescriptions.unshift(unlockName);
        const unlockTooltip = formatStringArrayAsNewLineText(unlockDescriptions);
        unlockedItem.setAttribute("data-tooltip-content", unlockTooltip);
        if (isOverflow) {
            //Manually set the position so we can animate them
            // const leftOffset = ScreenTechCivicComplete.UNLOCKED_ITEM_LEFT_OFFSET * index;
            // unlockedItem.style.left = leftOffset.toString() + "rem";
            // this.unlockedItems.push(unlockedItem);
        }
        const unlockIcon = getUnlockTargetIcon(unlockInfo.TargetType, unlockInfo.TargetKind);
        unlockedItem.style.backgroundImage = `url(${unlockIcon})`;
        const unlockGlow = document.createElement("div");
        unlockGlow.classList.value = "absolute -inset-0\\.5 opacity-0 bg-center bg-contain bg-no-repeat group-hover\\:opacity-100 group-focus\\:opacity-100 transition-opacity";
        unlockGlow.style.backgroundImage = `url(memento_circle-focus)`;
        unlockedItem.appendChild(unlockGlow);
        return unlockedItem;
    }
    scrollUnlockedItems(direction) {
        const totalIconsWidth = ScreenTechCivicComplete.UNLOCKED_ITEM_LEFT_OFFSET * this.unlockedItemDefinitions.length;
        let leftOffsetDelta = ScreenTechCivicComplete.UNLOCKED_ITEM_LEFT_OFFSET;
        if (direction == ScrollDirection.Left) {
            if (this.currentScrollOffset - ScreenTechCivicComplete.UNLOCKED_ITEM_LEFT_OFFSET < 0) {
                //Only scroll to the right enough to show the first icon
                leftOffsetDelta = -parseFloat(this.unlockedItems[0].style.left);
            }
        }
        else {
            const currentRightBounds = this.currentScrollOffset + ScreenTechCivicComplete.UNLOCKED_ITEMS_CONTAINER_WIDTH + ScreenTechCivicComplete.UNLOCKED_ITEMS_EXTRA_OFFSET;
            if ((currentRightBounds + ScreenTechCivicComplete.UNLOCKED_ITEM_LEFT_OFFSET) > totalIconsWidth) {
                //Only scroll to the left enough to show the last icon
                leftOffsetDelta = currentRightBounds + ScreenTechCivicComplete.UNLOCKED_ITEM_LEFT_OFFSET - totalIconsWidth;
            }
        }
        const step = (direction == ScrollDirection.Left) ? 1 : -1;
        leftOffsetDelta *= step;
        this.currentScrollOffset += -leftOffsetDelta;
        this.firstVisibleUnlockedItemIndex += -step;
        if (this.firstVisibleUnlockedItemIndex < 0
            || this.firstVisibleUnlockedItemIndex > (this.unlockedItemDefinitions.length - ScreenTechCivicComplete.UNLOCKED_ITEMS_VISIBLE_NUMBER)) {
            console.error("screen-tech-civic-complete: scrollUnlockedItems(): Incoherent first visible item index");
        }
        // this.unlockedItems.forEach(icon => {
        // 	const newLeftOffset = parseFloat(icon.style.left) + leftOffsetDelta;
        // 	icon.style.left = newLeftOffset.toString() + "rem";
        // });
        const leftDisabled = this.currentScrollOffset <= 0;
        this.leftScrollArrow?.setAttribute("disabled", leftDisabled.toString());
        const newRightBounds = this.currentScrollOffset + ScreenTechCivicComplete.UNLOCKED_ITEMS_CONTAINER_WIDTH + ScreenTechCivicComplete.UNLOCKED_ITEMS_EXTRA_OFFSET;
        const rightDisabled = (newRightBounds >= totalIconsWidth);
        this.rightScrollArrow?.setAttribute('disabled', rightDisabled.toString());
    }
    onUnlockedItemFocus(event) {
        const target = event.target;
        if (target == null) {
            console.error("screen-tech-civic-complete: onUnlockedIconBGFocus(): Invalid event target. It should be an HTMLElement");
            return;
        }
        // TODO: check to see if we need all this still
        const indexStr = target.getAttribute("tabindex");
        if (indexStr == null || indexStr === "-1") {
            console.error("screen-tech-civic-complete: onItemFocus(): Invalid tabindex attribute");
            return;
        }
        const index = parseInt(indexStr);
        // Automatic scrolling if we are reaching the limits of the visible unlocked items
        if (index < this.firstVisibleUnlockedItemIndex) {
            this.scrollUnlockedItems(ScrollDirection.Left);
        }
        else if (index >= this.firstVisibleUnlockedItemIndex + ScreenTechCivicComplete.UNLOCKED_ITEMS_VISIBLE_NUMBER) {
            this.scrollUnlockedItems(ScrollDirection.Right);
        }
    }
    /**
     *
     * @returns
     * <fxs-vslot class="flex flex-col items-center pb-1 px-1">
     * 		<div data-l10n-id="${unlocksTitle}" class="self-center text-sm text-accent-2 font-title tracking-100"></div>
     * 		<fxs-hslot>
     *			<fxs-activatable class="img-arrow"></fxs-activatable>
     *			<div><!-- Unlock Items --></div>
     *			<fxs-activatable class="img-arrow -scale-y-100"></fxs-activatable>
     * 		</fxs-hslot>
     * </fxs-vslot>
     */
    renderUnlockedItemsSection(unlocksTitle) {
        const unlockedItemsSlot = document.createElement("fxs-vslot");
        unlockedItemsSlot.classList.add("flex", "flex-col", "items-center", "mx-1", "mb-6");
        const unlockedItemsTitle = document.createElement("div");
        unlockedItemsTitle.classList.add("self-center", "mb-4", "text-sm", "text-accent-2", "font-title", "tracking-100", 'uppercase');
        unlockedItemsTitle.textContent = Locale.compose(unlocksTitle, this.unlockedItemDefinitions.length);
        const unlockItemsContainerSlot = document.createElement("fxs-hslot");
        unlockItemsContainerSlot.classList.add("max-w-full", "flex", "flex-auto", "items-center", "justify-center", "px-4");
        const leftArrowButton = document.createElement("fxs-activatable");
        leftArrowButton.classList.add("hidden", "img-arrow");
        leftArrowButton.addEventListener("action-activate", this.onLeftScrollArrow);
        const rightArrowbutton = document.createElement("fxs-activatable");
        rightArrowbutton.classList.add("hidden", "img-arrow", "-scale-x-100");
        rightArrowbutton.addEventListener("action-activate", this.onRightScrollArrow);
        this.unlockedItemsContainer.classList.add("flex", "flex-auto", "items-center", "justify-center", "overflow-x-scroll");
        this.unlockedItemsContainer.setAttribute("tabindex", "-1");
        unlockItemsContainerSlot.appendChild(leftArrowButton);
        unlockItemsContainerSlot.appendChild(this.unlockedItemsContainer);
        unlockItemsContainerSlot.appendChild(rightArrowbutton);
        unlockedItemsSlot.appendChild(unlockedItemsTitle);
        unlockedItemsSlot.appendChild(unlockItemsContainerSlot);
        return unlockedItemsSlot;
    }
    render() {
        const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        const popupData = {
            [ProgressionTreeTypes.TECH]: {
                title: "LOC_TECH_CIVIC_TECH_UNLOCKED",
                unlocksTitle: "LOC_TECH_CIVIC_UNLOCKED_BY_TECH"
            },
            [ProgressionTreeTypes.CULTURE]: {
                title: "LOC_TECH_CIVIC_CIVIC_UNLOCKED",
                unlocksTitle: "LOC_TECH_CIVIC_UNLOCKED_BY_CIVIC"
            }
        };
        const { title, unlocksTitle } = popupData[this.treeType];
        const iconUrl = `url(${Icon.getCultureIconFromProgressionTreeNodeDefinition(this.nodeDefinition)})`;
        this.modalFrame.dataset.modalStyle = "special";
        this.modalFrame.innerHTML = `
			<fxs-header class="text-secondary font-title uppercase text-lg tracking-150" title="${title}" filigree-style="small"></fxs-header>
			<div class="relative flex items-center justify-center">
				<div class="absolute inset-0 flex items-center justify-center">
					<img src="fs://game/popup_icon_glow" />
				</div>
				<div class="absolute inset-x-0 flex justify-between">
					<div class="img-popup-icon-decor"></div>
					<div class="img-popup-icon-decor -scale-x-100"></div>
				</div>
				<div class="relative size-38">
					<div class="absolute inset-0 size-38 img-popup-icon-wood-bk"></div>
					<div class="absolute inset-8 bg-center bg-no-repeat bg-contain" style="background-image: ${iconUrl}"></div>
				</div>
			</div>
			<div class="flex items-center justify-center mt-5 mb-3\\.5 img-popup-header-bk h-16">
				<div data-l10n-id="${this.nodeDefinition.Name}" class="text-accent-2 text-base uppercase font-title tracking-100"></div>
			</div>
		`;
        if (isMobileViewExperience) {
            const closeButton = document.createElement("fxs-close-button");
            closeButton.addEventListener("action-activate", TechCivicPopupManager.closePopup);
            closeButton.classList.add("top-2", "right-0\\.5");
            this.modalFrame.appendChild(closeButton);
        }
        else {
            const okButton = document.createElement("fxs-button");
            okButton.setAttribute("caption", "LOC_GENERIC_OK");
            okButton.addEventListener("action-activate", TechCivicPopupManager.closePopup);
            Databind.if(okButton, `!{{g_NavTray.isTrayRequired}}`);
            this.buttonSlot.appendChild(okButton);
        }
        this.buttonSlot.classList.add('flex', 'mt-6', 'mx-4', 'mb-4');
        if (this.treeType === ProgressionTreeTypes.CULTURE) {
            const changePoliciesButton = document.createElement("fxs-button");
            Databind.if(changePoliciesButton, `!{{g_NavTray.isTrayRequired}}`);
            changePoliciesButton.classList.add('mb-2');
            changePoliciesButton.setAttribute("caption", "LOC_TECH_CIVIC_CHANGE_POLICIES");
            changePoliciesButton.addEventListener("action-activate", this.onChangePolicies);
            changePoliciesButton.setAttribute("data-audio-group-ref", "audio-tech-civic-complete");
            this.buttonSlot.insertAdjacentElement('afterbegin', changePoliciesButton);
        }
        // Unsure if this can actually occur in a real game, but adding a check just in case so we don't show an empty section
        const numUnlockedItems = this.unlockedItemDefinitions.length;
        if (numUnlockedItems > 0) {
            const unlockedItemsSection = this.renderUnlockedItemsSection(unlocksTitle);
            let isOverflow = false;
            const totalIconsWidth = ScreenTechCivicComplete.UNLOCKED_ITEM_LEFT_OFFSET * this.unlockedItemDefinitions.length;
            if (totalIconsWidth > ScreenTechCivicComplete.UNLOCKED_ITEMS_CONTAINER_WIDTH) {
                this.unlockedItemsContainer.classList.add("overflow");
                isOverflow = true;
            }
            for (let i = 0; i < numUnlockedItems; i++) {
                const unlockedItem = this.createUnlockedItem(this.unlockedItemDefinitions[i], i, isOverflow);
                this.unlockedItemsContainer.appendChild(unlockedItem);
            }
            this.unlockItemsParentWrapper.appendChild(unlockedItemsSection);
        }
        const quote = GameInfo.TypeQuotes.lookup(this.nodeDefinition.ProgressionTreeNodeType);
        if (quote && Locale.keyExists(quote.Quote)) {
            const quoteContainer = document.createElement("fxs-vslot");
            let quoteHTML = `<fxs-inner-frame class="min-h-32 mx-4 p-3">
					<div class="absolute -top-1\\.5 img-popup-middle-decor"></div>
					<span class="text-accent-3 text-base" data-l10n-id="${quote.Quote}"></span>`;
            if (quote.QuoteAuthor && Locale.keyExists(quote.QuoteAuthor)) {
                quoteHTML += `<span class="text-accent-3 text-base" data-l10n-id="${quote.QuoteAuthor}"></span>`;
            }
            quoteHTML += `</fxs-inner-frame>`;
            quoteContainer.innerHTML = quoteHTML;
            this.unlockItemsParentWrapper.appendChild(quoteContainer);
        }
        this.unlockItemsParentWrapper.setAttribute("attached-scrollbar", "true");
        this.unlockItemsParentWrapper.classList.add("shrink");
        this.unlockItemsParentWrapper.appendChild(this.buttonSlot);
        this.modalFrame.appendChild(this.unlockItemsParentWrapper);
        this.Root.appendChild(this.modalFrame);
    }
}
//Used to position and animate unlocked items
ScreenTechCivicComplete.UNLOCKED_ITEM_WIDTH = 13;
ScreenTechCivicComplete.UNLOCKED_ITEM_PADDING = 1;
ScreenTechCivicComplete.UNLOCKED_ITEM_LEFT_OFFSET = ScreenTechCivicComplete.UNLOCKED_ITEM_WIDTH + ScreenTechCivicComplete.UNLOCKED_ITEM_PADDING;
ScreenTechCivicComplete.UNLOCKED_ITEMS_CONTAINER_WIDTH = 60;
ScreenTechCivicComplete.UNLOCKED_ITEMS_EXTRA_OFFSET = 4; //Extra offset to allow the last item to be fully displayed + some deadspace to better communicate there is nothing else in the list
ScreenTechCivicComplete.UNLOCKED_ITEMS_VISIBLE_NUMBER = Math.floor(ScreenTechCivicComplete.UNLOCKED_ITEMS_CONTAINER_WIDTH / (ScreenTechCivicComplete.UNLOCKED_ITEM_WIDTH + ScreenTechCivicComplete.UNLOCKED_ITEM_PADDING)); // How many items we can see before having to scroll. Use on Gamepad mode only.
Controls.define('screen-tech-civic-complete', {
    createInstance: ScreenTechCivicComplete,
    description: 'Screen for displaying info for recently completed techs/civics.',
    styles: ["fs://game/base-standard/ui/tech-civic-complete/screen-tech-civic-complete.css"],
    tabIndex: -1
});

//# sourceMappingURL=file:///base-standard/ui/tech-civic-complete/screen-tech-civic-complete.js.map
