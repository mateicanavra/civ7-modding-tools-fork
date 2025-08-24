/**
 * @file interface-mode-city-purchase.ts
 * @copyright 2022, Firaxis Games
 * @description Interface mode to handle visualization when a city or town is purchasing production
 */
import { CityDecorationSupport } from '/base-standard/ui/interface-modes/support-city-decoration.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
class CityPurchaseInterfaceMode {
    constructor() {
        this.requestedCityID = null;
        this.citySelectionChangedListener = () => { this.onCitySelectionChanged(); };
        CityDecorationSupport.manager.initializeOverlay();
    }
    transitionTo(_oldMode, _newMode, context) {
        this.requestedCityID = null;
        const cityPurchaseContext = context;
        if (cityPurchaseContext == undefined) {
            console.error("Failed to pass context object into the CityPurchaseInterfaceMode context.");
            InterfaceMode.switchToDefault();
            return;
        }
        if (cityPurchaseContext.CityID == undefined || ComponentID.isInvalid(cityPurchaseContext.CityID)) {
            console.error("Failed to pass CityID into the CityPurchaseInterfaceMode context.");
            InterfaceMode.switchToDefault();
            return;
        }
        this.requestedCityID = cityPurchaseContext.CityID;
        this.updateDisplay();
        engine.on('CitySelectionChanged', this.citySelectionChangedListener);
    }
    updateDisplay() {
        if (this.requestedCityID != null && ComponentID.isValid(this.requestedCityID)) {
            CityDecorationSupport.manager.decoratePlots(this.requestedCityID);
        }
    }
    onCitySelectionChanged() {
        let selectedCityID = UI.Player.getHeadSelectedCity();
        if (selectedCityID) {
            this.updateDisplay();
        }
    }
    transitionFrom(_oldMode, _newMode) {
        CityDecorationSupport.manager.clearDecorations();
        engine.off('CitySelectionChanged', this.citySelectionChangedListener);
    }
    /** @interface Handler  */
    canEnterMode(parameters) {
        const cityID = parameters?.CityID;
        return (cityID && ComponentID.isValid(cityID));
    }
    handleInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return true;
        }
        switch (inputEvent.detail.name) {
            case "shell-action-2":
                InterfaceMode.switchTo("INTERFACEMODE_CITY_PRODUCTION", { CityID: UI.Player.getHeadSelectedCity() });
                return false;
        }
        return true;
    }
}
InterfaceMode.addHandler('INTERFACEMODE_CITY_PURCHASE', new CityPurchaseInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-city-purchase.js.map
