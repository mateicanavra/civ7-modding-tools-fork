/**
 * @file model-radial-menu.ts
 * @copyright 2024, Firaxis Games
 * @description Model for the radial menu
 */
import ContextManager from "/core/ui/context-manager/context-manager.js";
import { InputEngineEventName } from "/core/ui/input/input-support.js";
import ViewManager from "/core/ui/views/view-manager.js";
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { TutorialLevel } from "/base-standard/ui/tutorial/tutorial-item.js";
class RadialMenuModel {
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    isAtLeastOneCity() {
        const player = Players.get(GameContext.localPlayerID);
        if (!player) {
            console.error("model-radial-menu: canUseRadialMenu(): No local player available.");
            return true;
        }
        const cities = player.Cities?.getCities();
        if (!cities) {
            console.error("model-radial-menu: canUseRadialMenu(): No cities available for local player.");
            return true;
        }
        return cities.length > 0;
    }
    isTutorialDisabled() {
        return Configuration.getUser().tutorialLevel <= TutorialLevel.WarningsOnly;
    }
    constructor() {
        this.canUseRadialMenu = false;
        this.engineInputListener = this.onEngineInput.bind(this);
        this.interfaceModeChangedListener = this.onInterfaceModeChanged.bind(this);
        this.updateGate = new UpdateGate(() => {
            this.update();
        });
        window.addEventListener(InputEngineEventName, this.engineInputListener);
        window.addEventListener('interface-mode-changed', this.interfaceModeChangedListener);
        engine.on('update-tutorial-level', this.onUpdateTutorialLevel, this);
        engine.on('CityInitialized', this.onCityInitialized, this);
        this.updateGate.call('init');
    }
    update() {
        this.canUseRadialMenu = this.isAtLeastOneCity() || this.isTutorialDisabled();
        if (this.onUpdate) {
            this.onUpdate(this);
        }
    }
    onEngineInput(inputEvent) {
        if (!this.handleEngineInput(inputEvent)) {
            inputEvent.preventDefault();
            inputEvent.stopImmediatePropagation();
        }
    }
    onCityInitialized() {
        this.updateGate.call('onCityInitialized');
    }
    onUpdateTutorialLevel() {
        this.updateGate.call('onUpdateTutorialLevel');
    }
    onInterfaceModeChanged() {
        if ((!ViewManager.isRadialSelectionAllowed || !this.canUseRadialMenu) && ContextManager.hasInstanceOf("panel-radial-menu")) {
            ContextManager.pop("panel-radial-menu");
        }
    }
    /**
     * @returns true if still live, false if input should stop.
     */
    handleEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            // Ignore everything but FINISH events
            return true;
        }
        if (!ViewManager.isRadialSelectionAllowed || !ContextManager.isEmpty || !this.canUseRadialMenu) {
            //We should only be able to raise the radial menu when the view allows it and no screen is open
            return true;
        }
        switch (inputEvent.detail.name) {
            case 'toggle-radial-menu':
                ContextManager.push("panel-radial-menu", { singleton: true, createMouseGuard: true });
                return false;
            default:
                break;
        }
        return true;
    }
}
const RadialMenu = new RadialMenuModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(RadialMenu);
    };
    engine.createJSModel('g_RadialMenu', RadialMenu);
    RadialMenu.updateCallback = updateModel;
    engine.synchronizeModels();
});
export { RadialMenu as default };
//# sourceMappingURL=file:///core/ui/radial-menu/model-radial-menu.js.map
