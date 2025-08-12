/**
 * @file panel-religion-picker.ts
 * @copyright 2023-2025, Firaxis Games
 * @description Religion Picker
 */
import { ScreenGeneralChooser } from '/base-standard/ui/general-chooser/screen-general-chooser.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import DialogBoxManager from '/core/ui/dialog-box/manager-dialog-box.js';
import { TextBoxTextEditStopEventName } from '/core/ui/components/fxs-textbox.js';
class ScreenReligionPicker extends ScreenGeneralChooser {
    constructor() {
        super(...arguments);
        this.religionConfirmButtonListener = this.onConfirm.bind(this);
        this.religionNameActivatedListener = this.onReligionNameActivated.bind(this);
        this.onReligionNameTextEntryStoppedListener = this.onReligionNameTextEntryStopped.bind(this);
        this.selectedReligionType = "";
        this.selectedReligionEntry = null;
        this.hasSelectedCustomReligion = false;
    }
    onInitialize() {
        this.religionConfirmButton = MustGetElement('.religion-picker_confirm', this.Root);
        this.religionInfoNameContainer = MustGetElement(".religion-picker_religion-info-name-edit-container", this.Root);
        this.religionInfoNameTextBox = MustGetElement(".religion-picker_religion-info-name", this.religionInfoNameContainer);
        this.religionInfoNameEditButton = MustGetElement('.religion-picker_religion-info-name-edit', this.religionInfoNameContainer);
        this.religionNameRegularContainer = MustGetElement(".religion-picker_religion-name-regular", this.Root);
        this.createCloseButton = false;
        this.enableOpenSound = true;
        this.enableCloseSound = true;
    }
    onAttach() {
        super.onAttach();
        const religionSubsystemFrame = MustGetElement(".religion-picker_religion-window", this.Root);
        religionSubsystemFrame.addEventListener('subsystem-frame-close', () => { this.close(); });
        this.religionConfirmButton.addEventListener('action-activate', this.religionConfirmButtonListener);
        this.religionInfoNameTextBox.addEventListener(TextBoxTextEditStopEventName, this.onReligionNameTextEntryStoppedListener);
        const player = Players.get(GameContext.localPlayerID);
        if (!player) {
            console.error("panel-religion-picker: onAttach() - No player object found!");
            return;
        }
        this.playerObject = player;
        const pReligion = player.Religion;
        if (!pReligion) {
            console.error("panel-religion-picker: onAttach() - Player object had no religion!");
            return;
        }
        Databind.classToggle(this.religionConfirmButton, 'hidden', `g_NavTray.isTrayRequired`);
        this.buildReligionContainer();
    }
    onDetach() {
        this.religionConfirmButton.removeEventListener('action-activate', this.religionConfirmButtonListener);
        this.religionInfoNameTextBox.removeEventListener(TextBoxTextEditStopEventName, this.onReligionNameTextEntryStoppedListener);
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        const focusElement = MustGetElement('.religion-picker_religions', this.Root);
        FocusManager.setFocus(focusElement);
    }
    getHolyCityName() {
        if (!this.playerObject.Cities) {
            console.error("panel-religion-picker: getHolyCityName() - playerObject.Cities is undefined!");
            return "";
        }
        const foundCity = this.playerObject.Cities.getCities().find((city) => {
            return (city.Constructibles?.hasConstructible("BUILDING_TEMPLE", false) || city.Constructibles?.hasConstructible("BUILDING_MOSQUE", false));
        });
        return foundCity?.name ?? "";
    }
    onReligionNameActivated() {
        if (this.hasSelectedCustomReligion && this.religionInfoNameTextBox.getAttribute("enabled") == "false") {
            this.toggleEditReligionName();
        }
    }
    toggleEditReligionName() {
        const inputEnabled = this.religionInfoNameTextBox.getAttribute("enabled") == "true";
        this.religionInfoNameEditButton.setAttribute("is-confirm", (!inputEnabled).toString());
        if (ActionHandler.isGamepadActive) {
            if (UI.canDisplayKeyboard()) {
                this.religionInfoNameTextBox.setAttribute("activated", (!inputEnabled).toString());
            }
            else {
                this.religionInfoNameTextBox.setAttribute("enabled", (!inputEnabled).toString());
                if (inputEnabled && ActionHandler.isGamepadActive) {
                    this.onConfirm();
                }
            }
        }
        else {
            this.religionInfoNameTextBox.setAttribute("enabled", (!inputEnabled).toString());
            this.religionConfirmButton.setAttribute("disabled", (!inputEnabled || this.religionInfoNameTextBox.getAttribute("value")?.length == 0).toString());
        }
    }
    createReligionEntries(entryContainer) {
        let index = 0;
        for (const religion of GameInfo.Religions) {
            const newEntry = document.createElement("fxs-activatable");
            newEntry.classList.value = "religion-entry flex flex-col relative items-center w-16 h-24 mt-5 mx-9 mb-2\\.5";
            const newEntryIcon = document.createElement("div");
            newEntryIcon.classList.value = "religion-entry-icon size-16 bg-contain bg-no-repeat relative mb-2";
            const iconLink = UI.getIconCSS(religion.ReligionType, "RELIGION_DECO");
            newEntryIcon.style.backgroundImage = iconLink;
            newEntry.appendChild(newEntryIcon);
            if (!religion.RequiresCustomName) {
                const newEntryText = document.createElement("div");
                newEntryText.classList.value = "text-center font-body-sm text-accent-2 font-fit-shrink";
                newEntryText.setAttribute("data-l10n-id", religion.Name);
                newEntry.appendChild(newEntryText);
            }
            this.tagEntry(newEntry);
            newEntry.setAttribute("religion-name", religion.Name);
            newEntry.setAttribute("religion-type", religion.ReligionType);
            newEntry.setAttribute("religion-is-custom", religion.RequiresCustomName.toString());
            newEntry.setAttribute("religion-icon", iconLink);
            newEntry.setAttribute("tabindex", index.toString());
            const religionAlreadyTaken = Game.Religion.hasBeenFounded(religion.ReligionType);
            if (religionAlreadyTaken) {
                newEntry.setAttribute('data-tooltip-content', Locale.compose("LOC_UI_ESTABLISH_RELIGION_RELIGION_ALREADY_TAKEN"));
                newEntry.setAttribute("disabled", "true");
            }
            else {
                const religionSelectedBorder = document.createElement("div");
                religionSelectedBorder.classList.add("religion-selected-border", "size-full", "mt-0\\.5");
                newEntryIcon.appendChild(religionSelectedBorder);
                const religionSelectedGlow = document.createElement("div");
                religionSelectedGlow.classList.add("religion-selected-glow", "size-full", "absolute", "opacity-90");
                newEntryIcon.appendChild(religionSelectedGlow);
            }
            if (religion.RequiresCustomName) {
                newEntry.classList.add("custom-entry");
            }
            else {
                newEntry.classList.add("traditional-entry");
            }
            newEntry.setAttribute("data-audio-group-ref", "audio-panel-religion-picker");
            newEntry.setAttribute("data-audio-activate-ref", "none");
            entryContainer.appendChild(newEntry);
            index++;
        }
    }
    entrySelected(entryElement) {
        const religionName = entryElement.getAttribute("religion-name");
        if (!religionName) {
            console.error("panel-religion-picker: entrySelected - religion attribute religion-name not found.");
            return;
        }
        const religionType = entryElement.getAttribute("religion-type");
        if (!religionType) {
            console.error("panel-religion-picker: entrySelected - religion attribute religion-type not found.");
            return;
        }
        const religionIconLink = entryElement.getAttribute("religion-icon");
        if (!religionIconLink) {
            console.error("panel-religion-picker: entrySelected - religion attribute religion-icon not found.");
            return;
        }
        const religionIsCustom = entryElement.getAttribute("religion-is-custom");
        if (!religionIsCustom) {
            console.error("panel-religion-picker: entrySelected - religion attribute religion-is-custom not found.");
            return;
        }
        const religionIcon = MustGetElement('.religion-picker_religion-info-icon-container_religion', this.Root);
        religionIcon.style.backgroundImage = religionIconLink;
        if (this.selectedReligionEntry) {
            this.selectedReligionEntry.classList.remove("entry-selected");
        }
        this.selectedReligionEntry = entryElement;
        this.selectedReligionEntry.classList.add("entry-selected");
        this.selectedReligionType = religionType;
        const religionIconGlow = MustGetElement(".religion-picker_religion-info-icon-container_glow", this.Root);
        religionIconGlow.classList.remove("hidden");
        if (religionIsCustom == "true") {
            this.religionNameRegularContainer.classList.add("hidden");
            this.religionInfoNameContainer.classList.remove("hidden");
            this.religionInfoNameTextBox.setAttribute("value", Locale.compose("LOC_UI_NAME_YOUR_RELIGION"));
            this.religionInfoNameTextBox.setAttribute("show-keyboard-on-activate", "true");
            this.religionInfoNameEditButton.setAttribute("disabled", "false");
            this.religionInfoNameEditButton.classList.remove("hidden");
            this.religionConfirmButton.setAttribute("disabled", "true");
            this.hasSelectedCustomReligion = true;
            if (ActionHandler.isGamepadActive) {
                this.toggleEditReligionName();
            }
        }
        else if (religionIsCustom == "false") {
            this.religionNameRegularContainer.classList.remove("hidden");
            this.religionInfoNameContainer.classList.add("hidden");
            this.religionNameRegularContainer.setAttribute("data-l10n-id", religionName);
            if (this.religionInfoNameTextBox.getAttribute("enabled") == "true") {
                this.toggleEditReligionName();
            }
            this.hasSelectedCustomReligion = false;
            this.religionConfirmButton.setAttribute("disabled", "false");
            if (ActionHandler.isGamepadActive) {
                this.goToBeliefChooser();
            }
        }
    }
    onConfirm() {
        const customReligionName = this.hasSelectedCustomReligion ? this.religionInfoNameTextBox.getAttribute("value") : null;
        const matchRegex = /[|<>\[\]]/;
        if (customReligionName && customReligionName.match(matchRegex)) {
            DialogBoxManager.createDialog_Confirm({
                title: "LOC_UI_TEXT_ENTRY_DENIAL"
            });
            return;
        }
        if (Game.Religion.hasBeenFounded(this.selectedReligionType)) {
            DialogBoxManager.createDialog_Confirm({
                title: "LOC_UI_ESTABLISH_RELIGION_RELIGION_ALREADY_TAKEN"
            });
            return;
        }
        this.goToBeliefChooser();
    }
    goToBeliefChooser() {
        const customReligionName = this.hasSelectedCustomReligion ? this.religionInfoNameTextBox.getAttribute("value") : '';
        ContextManager.push("panel-belief-picker", {
            singleton: true, attributes: {
                "selectedReligionType": this.selectedReligionType,
                "customReligionName": customReligionName,
            }
        });
        this.close();
    }
    buildReligionContainer() {
        this.religionInfoNameTextBox.setAttribute("value", Locale.compose("LOC_UI_ESTABLISH_RELIGION_TITLE"));
        this.religionInfoNameTextBox.setAttribute("enabled", "false");
        this.religionInfoNameTextBox.addEventListener('action-activate', this.religionNameActivatedListener);
        this.religionInfoNameTextBox.addEventListener('fxs-textbox-validate-virtual-keyboard', this.religionConfirmButtonListener);
        const religionInfoFounderName = MustGetElement('.religion-picker_religion-info-founder-name', this.Root);
        religionInfoFounderName.setAttribute("data-l10n-id", Locale.compose("LOC_UI_ESTABLISH_RELIGION_FOUNDER", this.playerObject.name));
        const religioninfoHolyCityName = MustGetElement('.religion-picker_religion-info-city-name', this.Root);
        religioninfoHolyCityName.setAttribute("data-l10n-id", Locale.compose("LOC_UI_ESTABLISH_RELIGION_HOLY_CITY", this.getHolyCityName()));
        const religionsContainer = MustGetElement('.religion-picker_religions', this.Root);
        this.createReligionEntries(religionsContainer);
        this.religionInfoNameEditButton.addEventListener('action-activate', () => {
            this.toggleEditReligionName();
        });
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
    }
    onReligionNameTextEntryStopped(event) {
        if (event.detail.confirmed) {
            if (ActionHandler.isGamepadActive) {
                this.onConfirm();
            }
            else {
                this.religionConfirmButton.setAttribute("disabled", "false");
                this.religionInfoNameTextBox.setAttribute("enabled", "false");
                this.religionInfoNameEditButton.setAttribute("is-confirm", "false");
            }
        }
        else {
            if (ActionHandler.isGamepadActive) {
                this.religionInfoNameTextBox.setAttribute("enabled", 'false');
                this.selectedReligionEntry?.classList.remove("entry-selected");
                const focusElement = MustGetElement('.religion-picker_religions', this.Root);
                FocusManager.setFocus(focusElement);
            }
        }
    }
}
Controls.define('panel-religion-picker', {
    createInstance: ScreenReligionPicker,
    description: 'Religion picker',
    classNames: ['panel-religion-picker', 'absolute', 'bottom-0', 'top-44', 'pointer-events-auto', 'left-0', 'w-200'],
    styles: ["fs://game/base-standard/ui/panel-religion-picker/panel-religion-picker.css"],
    content: ['fs://game/base-standard/ui/panel-religion-picker/panel-religion-picker.html'],
    attributes: []
});

//# sourceMappingURL=file:///base-standard/ui/panel-religion-picker/panel-religion-picker.js.map
