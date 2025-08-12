/**
 * @file screen-government-picker.ts
 * @copyright 2023 - 2025, Firaxis Games
 * @description Interface for choosing your government
 */
import { ScreenGeneralChooser } from '/base-standard/ui/general-chooser/screen-general-chooser.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { realizePlayerColors } from '/core/ui/utilities/utilities-color.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { Focus } from '/core/ui/input/focus-support.js';
class ScreenGovernment extends ScreenGeneralChooser {
    constructor() {
        super(...arguments);
        this.confirmButtonListener = this.confirmChooseGovernment.bind(this);
        this.closeButtonEventListener = this.onClose.bind(this);
        this.currentlySelectedChoice = null;
    }
    onInitialize() {
        this.createCloseButton = false;
        this.closeButton = MustGetElement("fxs-close-button", this.Root);
        this.confirmButton = MustGetElement('.government-picker-confirm-button', this.Root);
    }
    onAttach() {
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.closeButton.setAttribute("data-audio-group-ref", "audio-policy-chooser");
        super.onAttach();
        this.closeButton.addEventListener('action-activate', this.closeButtonEventListener);
        this.closeButton.setAttribute("data-audio-activate-ref", "data-audio-close-selected");
        this.confirmButton.addEventListener('action-activate', this.confirmButtonListener);
        this.confirmButton.setAttribute("data-audio-group-ref", "audio-policy-chooser");
        this.confirmButton.setAttribute("data-audio-activate-ref", "data-audio-government-confirmed");
        const localPlayer = GameContext.localPlayerID;
        if (Players.isValid(localPlayer)) {
            realizePlayerColors(this.Root, localPlayer);
        }
        Databind.classToggle(this.confirmButton, 'hidden', `g_NavTray.isTrayRequired`);
        this.Root.setAttribute("data-audio-group-ref", "audio-policy-chooser");
    }
    onDetach() {
        this.closeButton.removeEventListener('action-activate', this.closeButtonEventListener);
        super.onDetach();
    }
    onClose() {
        this.close(UIViewChangeMethod.PlayerInteraction);
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        const focusElement = MustGetElement('.government-picker__main-container', this.Root);
        if (focusElement) {
            Focus.setContextAwareFocus(focusElement, this.Root);
        }
    }
    createEntries(entryContainer) {
        const localPlayerID = GameContext.localPlayerID;
        if (!Players.isValid(localPlayerID)) {
            console.error("screen-government-picker: createEntries() - GameContext.localPlayerID is not a valid player!");
            return;
        }
        const player = Players.get(localPlayerID);
        if (player == null || player.Culture == undefined) {
            console.error("screen-government-picker: createEntries() - Couldn't get local player!");
            return;
        }
        const playerHappiness = player.Happiness;
        if (playerHappiness == undefined) {
            console.error("screen-government-picker: createEntries() - No player happiness!");
            return;
        }
        const goldenAgeDuration = playerHappiness.getGoldenAgeDuration();
        //create a button for each government that we can choose from
        for (const startingGovernmentDef of GameInfo.StartingGovernments) {
            const governmentType = startingGovernmentDef.GovernmentType;
            const governmentDef = GameInfo.Governments.lookup(governmentType);
            if (!governmentDef) {
                console.error(`screen-government-picker: createEntries() - no government def found for government type ${governmentType}`);
                return;
            }
            const governmentItem = document.createElement("fxs-chooser-item");
            governmentItem.classList.add("government-chooser-item", "text-accent-2", "flex", "items-center", "flex-col", "grow", "mb-6", "w-full", "border", "border-primary-3");
            governmentItem.setAttribute("data-audio-group-ref", "audio-policy-chooser");
            governmentItem.setAttribute("data-audio-activate-ref", "data-audio-government-clicked");
            governmentItem.setAttribute("show-color-bg", "false");
            governmentItem.setAttribute("show-frame-on-hover", "false");
            const governmentItemContentContainer = document.createElement("div");
            governmentItemContentContainer.classList.value = "flex flex-col items-center w-full relative";
            governmentItem.appendChild(governmentItemContentContainer);
            const headerContainer = document.createElement("div");
            headerContainer.classList.value = "w-full mx-px mt-px mb-2";
            governmentItemContentContainer.appendChild(headerContainer);
            const headerBG = document.createElement("div");
            headerBG.classList.value = "absolute size-full bg-primary-3 opacity-20";
            headerContainer.appendChild(headerBG);
            const headerText = document.createElement("fxs-header");
            headerText.setAttribute("filigree-style", "h4");
            headerText.setAttribute("title", governmentDef.Name);
            headerText.classList.add("pt-3", "pb-2");
            headerContainer.appendChild(headerText);
            const bodyContainer = document.createElement("div");
            bodyContainer.classList.value = "w-full px-3 flex flex-col items-center";
            governmentItemContentContainer.appendChild(bodyContainer);
            const governmentCelebrationTypes = Game.Culture.GetCelebrationTypesForGovernment(governmentDef.GovernmentType);
            for (const celebrationChoice of governmentCelebrationTypes) {
                const celebrationItemDef = GameInfo.GoldenAges.lookup(celebrationChoice);
                if (!celebrationItemDef) {
                    console.error(`screen-government-picker: createEntries - No golden age definition found for ${celebrationChoice}!`);
                    return;
                }
                const celebrationChoiceContainer = document.createElement("div");
                celebrationChoiceContainer.classList.value = "flex items-center mb-5 max-w-3\\/4";
                const celebrationItemImage = document.createElement("div");
                celebrationItemImage.classList.value = "bg-no-repeat bg-center bg-contain size-8 mr-3";
                celebrationItemImage.style.backgroundImage = `url(${UI.getIconURL(celebrationItemDef.GoldenAgeType)})`;
                celebrationChoiceContainer.appendChild(celebrationItemImage);
                const celebrationItemDesc = document.createElement("div");
                celebrationItemDesc.classList.value = "font-body-base";
                celebrationItemDesc.innerHTML = Locale.stylize(celebrationItemDef.Description, goldenAgeDuration);
                celebrationChoiceContainer.appendChild(celebrationItemDesc);
                bodyContainer.appendChild(celebrationChoiceContainer);
            }
            this.tagEntry(governmentItem);
            governmentItem.setAttribute("gov-type", governmentType);
            entryContainer.appendChild(governmentItem);
        }
    }
    /**
     * Called by the base general chooser when the user chooses an item in the list.
     * @param {element} entryElement - The HTML element chosen.
     */
    entrySelected(entryElement) {
        if (this.currentlySelectedChoice) {
            this.currentlySelectedChoice.setAttribute("selected", "false");
        }
        entryElement.setAttribute("selected", "true");
        entryElement.setAttribute("no-border", "false");
        this.currentlySelectedChoice = entryElement;
        this.confirmButton.removeAttribute("disabled");
        NavTray.addOrUpdateShellAction1("LOC_UI_RESOURCE_ALLOCATION_CONFIRM");
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
            this.close();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        if (inputEvent.detail.name == 'shell-action-1') {
            if (this.currentlySelectedChoice) {
                Audio.playSound("data-audio-government-confirmed", "audio-policy-chooser");
                this.confirmChooseGovernment();
            }
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    confirmChooseGovernment() {
        if (!this.currentlySelectedChoice) {
            console.error("screen-government-picker: confirmChooseGovernment() - no government choice currently selected!");
            return;
        }
        const governmentType = this.currentlySelectedChoice.getAttribute("gov-type");
        if (governmentType) {
            const governmentDef = GameInfo.Governments.lookup(governmentType);
            if (!governmentDef) {
                console.error(`screen-government-picker: confirmChooseGovernment() - no government def found for government type ${governmentType}`);
                return;
            }
            const args = {
                GovernmentType: governmentDef.$index,
                Action: PlayerOperationParameters.Activate
            };
            const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.CHANGE_GOVERNMENT, args, false);
            if (result.Success) {
                Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.CHANGE_GOVERNMENT, args);
                this.close();
            }
        }
    }
}
Controls.define('screen-government-picker', {
    createInstance: ScreenGovernment,
    description: 'Government picker',
    classNames: ['screen-government-picker', 'fullscreen', "flex", "items-center", "justify-center"],
    styles: ['fs://game/base-standard/ui/screen-government-picker/screen-government-picker.css'],
    content: ['fs://game/base-standard/ui/screen-government-picker/screen-government-picker.html'],
    tabIndex: -1
});

//# sourceMappingURL=file:///base-standard/ui/screen-government-picker/screen-government-picker.js.map
