/**
 * @file panel-city-capture-chooser.ts
 * @copyright 2024, Firaxis Games
 * @description The menu for a newly captured city.
 */
import CityCaptureChooserModel from '/base-standard/ui/city-capture-chooser/model-city-capture-chooser.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { InterfaceMode, InterfaceModeChangedEventName } from '/core/ui/interface-modes/interface-modes.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { GetNextCityID, GetPrevCityID } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { NavigateInputEventName } from '/core/ui/input/input-support.js';
class CityCaptureChooserScreen extends Panel {
    constructor(root) {
        super(root);
        this.selectedButton = null;
        this.onConfirmListener = this.onConfirm.bind(this);
        this.onPrevArrowListener = this.onPrevArrow.bind(this);
        this.onNextArrowListener = this.onNextArrow.bind(this);
        this.onCitySelectionChangedListener = this.onCitySelectionChanged.bind(this);
        this.keepSettlementSelectedListener = this.keepSettlementSelected.bind(this);
        this.razeSettlementSelectedListener = this.razeSettlementSelected.bind(this);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.navigateInputEventListener = this.onNavigateInput.bind(this);
        this.viewReceiveFocusListener = this.onViewReceiveFocus.bind(this);
        this.onInterfaceModeChanged = () => {
            if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION" && CityCaptureChooserModel.canDisplayPanel) {
                this.setHidden(false);
                this.setFocus();
                NavTray.clear();
                NavTray.addOrUpdateGenericBack();
            }
            else {
                this.setHidden(true);
            }
        };
        this.animateInType = this.animateOutType = AnchorType.RelativeToRight;
    }
    onInitialize() {
        this.confirmButton = MustGetElement(".city-capture__confirm", this.Root);
        this.keepButton = MustGetElement(".keep-button", this.Root);
        this.razeButton = MustGetElement(".raze-button", this.Root);
        this.prevArrow = MustGetElement(".cap-chooser__prev-arrow", this.Root);
        this.nextArrow = MustGetElement(".cap-chooser__next-arrow", this.Root);
        this.turnsToRazeText = MustGetElement(".cap-chooser__turns-to-raze", this.Root);
        this.keepText = MustGetElement(".cap-chooser__keep-text", this.Root);
        this.razeText = MustGetElement(".cap-chooser__raze-text", this.Root);
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
        this.Root.addEventListener(NavigateInputEventName, this.navigateInputEventListener);
        this.Root.addEventListener('view-receive-focus', this.viewReceiveFocusListener);
        engine.on('CitySelectionChanged', this.onCitySelectionChangedListener, this);
        const celebrationSubsystemFrame = MustGetElement(".city-capture-subsystem-frame", this.Root);
        celebrationSubsystemFrame.addEventListener('subsystem-frame-close', () => { this.onClose(); });
        window.addEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
        delayByFrame(this.onInterfaceModeChanged);
        this.prevArrow.addEventListener("action-activate", this.onPrevArrowListener);
        this.nextArrow.addEventListener("action-activate", this.onNextArrowListener);
        this.confirmButton.addEventListener("action-activate", this.onConfirmListener);
        this.keepButton.addEventListener("action-activate", this.keepSettlementSelectedListener);
        this.razeButton.addEventListener("action-activate", this.razeSettlementSelectedListener);
        Databind.classToggle(this.confirmButton, 'hidden', `g_NavTray.isTrayRequired`);
        Databind.classToggle(this.prevArrow, 'hidden', `g_NavTray.isTrayRequired`);
        Databind.classToggle(this.nextArrow, 'hidden', `g_NavTray.isTrayRequired`);
    }
    onDetach() {
        engine.off('CitySelectionChanged', this.onCitySelectionChangedListener, this);
        this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
        this.Root.removeEventListener(NavigateInputEventName, this.navigateInputEventListener);
        this.Root.removeEventListener('view-receive-focus', this.viewReceiveFocusListener);
        window.removeEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
        super.onDetach();
    }
    onViewReceiveFocus() {
        this.setFocus();
    }
    setFocus() {
        const focusElement = MustGetElement('.cap-chooser__choice-container', this.Root);
        FocusManager.setFocus(focusElement);
    }
    keepSettlementSelected() {
        if (this.selectedButton) {
            this.selectedButton.setAttribute("selected", "false");
        }
        this.selectedButton = this.keepButton;
        this.selectedButton.setAttribute("selected", "true");
        this.confirmButton.setAttribute("disabled", "false");
        NavTray.addOrUpdateShellAction1("LOC_UI_RESOURCE_ALLOCATION_CONFIRM");
    }
    razeSettlementSelected() {
        if (this.selectedButton) {
            this.selectedButton.setAttribute("selected", "false");
        }
        this.selectedButton = this.razeButton;
        this.selectedButton.setAttribute("selected", "true");
        this.confirmButton.setAttribute("disabled", "false");
        NavTray.addOrUpdateShellAction1("LOC_UI_RESOURCE_ALLOCATION_CONFIRM");
    }
    onConfirm() {
        if (this.selectedButton == this.keepButton) {
            CityCaptureChooserModel.sendKeepRequest();
            InterfaceMode.switchToDefault();
        }
        else if (this.selectedButton == this.razeButton) {
            CityCaptureChooserModel.sendRazeRequest();
            InterfaceMode.switchToDefault();
        }
    }
    onCitySelectionChanged(data) {
        if (!data.selected) {
            return;
        }
        const c = Cities.get(data.cityID);
        if (!c || c.owner != GameContext.localPlayerID) {
            return;
        }
        else if (c.isJustConqueredFrom) {
            this.setHidden(false);
            this.setFocus();
        }
        else {
            this.setHidden(true);
        }
    }
    onPrevArrow() {
        if (CityCaptureChooserModel.cityID) {
            const prevCityId = GetPrevCityID(CityCaptureChooserModel.cityID);
            if (ComponentID.isValid(prevCityId)) {
                UI.Player.selectCity(prevCityId);
            }
        }
    }
    onNextArrow() {
        if (CityCaptureChooserModel.cityID) {
            const nextCityId = GetNextCityID(CityCaptureChooserModel.cityID);
            if (ComponentID.isValid(nextCityId)) {
                UI.Player.selectCity(nextCityId);
            }
        }
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (this.Root.classList.contains("hidden")) {
            return;
        }
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
            this.onClose();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        if (inputEvent.detail.name == "shell-action-1") {
            if (this.selectedButton) {
                this.onConfirm();
            }
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    onNavigateInput(event) {
        if (event.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (this.Root.classList.contains("hidden")) {
            return;
        }
        const direction = event.getDirection();
        switch (direction) {
            case InputNavigationAction.PREVIOUS:
                this.onPrevArrow();
                break;
            case InputNavigationAction.NEXT:
                this.onNextArrow();
                break;
        }
    }
    setHidden(hidden) {
        this.Root.classList.toggle("hidden", hidden);
        if (!hidden) {
            this.update();
        }
    }
    update() {
        const header = MustGetElement(".cap-chooser__city-name", this.Root);
        if (CityCaptureChooserModel.cityID) {
            const selectedCity = Cities.get(CityCaptureChooserModel.cityID);
            if (!selectedCity) {
                console.error(`panel-city-capture-chooser: update - No city found for city ID ${CityCaptureChooserModel.cityID}!`);
                return;
            }
            const cityYields = selectedCity.Yields;
            if (!cityYields) {
                console.error(`panel-city-capture-chooser: update - No city yields found for city ID ${CityCaptureChooserModel.cityID}!`);
                return;
            }
            header.setAttribute("title", selectedCity.name);
            const allYieldContainer = MustGetElement(".cap-chooser__city-yield-container", this.Root);
            while (allYieldContainer.hasChildNodes()) {
                allYieldContainer.removeChild(allYieldContainer.firstChild);
            }
            for (const yieldType in YieldTypes) {
                if (yieldType == "NO_YIELD")
                    continue;
                const yieldContainer = document.createElement("div");
                yieldContainer.classList.value = "flex flex-col items-center mx-2";
                const yieldIcon = document.createElement("fxs-icon");
                yieldIcon.setAttribute("data-icon-id", yieldType);
                yieldIcon.setAttribute("data-icon-context", "DEFAULT");
                yieldIcon.classList.add("size-10");
                yieldContainer.appendChild(yieldIcon);
                const yieldNumber = document.createElement("div");
                yieldNumber.classList.value = "font-body-sm";
                yieldNumber.setAttribute("data-l10n-id", Math.round(cityYields.getNetYield(yieldType)).toString());
                yieldContainer.appendChild(yieldNumber);
                allYieldContainer.appendChild(yieldContainer);
            }
            const cityReligion = selectedCity.Religion;
            if (!cityReligion) {
                console.error(`panel-city-capture-chooser: update - City with id ${CityCaptureChooserModel.cityID} has no religion library!`);
                return;
            }
            const keepOperationResult = CityCaptureChooserModel.getKeepCanStartResult();
            if (!keepOperationResult) {
                console.error("panel-city-capture-chooser: update() - no canstart result for a city keeping operation!");
                return;
            }
            this.keepText.innerHTML = Locale.stylize(keepOperationResult.AdditionalDescription?.[0] ?? "");
            const razeOperationResult = CityCaptureChooserModel.getRazeCanStartResult();
            if (!razeOperationResult) {
                console.error("panel-city-capture-chooser: update() - no canstart result for a city razing operation!");
                return;
            }
            if (razeOperationResult.Success) {
                const turnsToRaze = selectedCity.getTurnsUntilRazed;
                this.razeText.innerHTML = Locale.stylize(razeOperationResult.AdditionalDescription?.[0] ?? "");
                this.turnsToRazeText.innerHTML = turnsToRaze.toString();
            }
            else {
                this.razeButton.setAttribute("disabled", "true");
                this.razeText.setAttribute("data-l10n-id", razeOperationResult.FailureReasons?.[0] ?? "");
                this.razeText.classList.add("font-bold");
                MustGetElement(".img-turn-icon", this.razeButton).classList.add("hidden");
            }
        }
    }
    onClose() {
        InterfaceMode.switchToDefault();
    }
}
Controls.define('panel-city-capture-chooser', {
    createInstance: CityCaptureChooserScreen,
    description: '',
    classNames: ['city-capture-chooser', 'flex', 'flex-col'],
    styles: ["fs://game/base-standard/ui/city-capture-chooser/panel-city-capture-chooser.css"],
    content: ["fs://game/base-standard/ui/city-capture-chooser/panel-city-capture-chooser.html"],
    attributes: []
});

//# sourceMappingURL=file:///base-standard/ui/city-capture-chooser/panel-city-capture-chooser.js.map
