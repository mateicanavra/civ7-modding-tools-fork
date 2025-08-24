/**
 * @file interface-mode-call-to-arms
 * @copyright 2023, Firaxis Games
 * @description Interface mode to ally call to arms.
 */
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
/**
 * Handler for INTERFACEMODE_CALL_TO_ARMS.
 */
class CallToArmsInterfaceMode {
    transitionTo(_oldMode, _newMode, _context) {
        LensManager.setActiveLens('fxs-diplomacy-lens');
    }
    transitionFrom(_oldMode, _newMode) {
        // Do nothing.
    }
    canLeaveMode(_newMode) {
        return true;
    }
}
InterfaceMode.addHandler('INTERFACEMODE_CALL_TO_ARMS', new CallToArmsInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-call-to-arms.js.map
