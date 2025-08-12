/**
 * @file interface-mode-default.ts
 * @copyright 2021 - 2023, Firaxis Games
 * @description Default interface mode handler.
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
/**
 * Handler for INTERFACEMODE_DEFAULT.
 */
class DefaultInterfaceMode {
    transitionTo(_oldMode, _newMode, _context) {
        UI.Player.deselectAllUnits();
        UI.Player.deselectAllCities();
        LensManager.setActiveLens('fxs-default-lens');
        FocusManager.SetWorldFocused();
    }
    transitionFrom(_oldMode, _newMode) {
        // Do nothing.
    }
    allowsHotKeys() {
        return true;
    }
}
InterfaceMode.addHandler('INTERFACEMODE_DEFAULT', new DefaultInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-default.js.map
