/**
 * @file interface-mode-radial-selection.ts
 * @copyright 2023, Firaxis Games
 * @description Interface mode to handle the radial selection
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
class RadialSelectionInterfaceMode {
    transitionTo(_oldMode, _newMode, _context) {
        ContextManager.push("panel-radial-menu", { singleton: true, createMouseGuard: false });
    }
    transitionFrom(_oldMode, _newMode) {
        ContextManager.pop("panel-radial-menu");
    }
}
InterfaceMode.addHandler('INTERFACEMODE_RADIAL_SELECTION', new RadialSelectionInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-radial-selection.js.map
