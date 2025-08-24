/**
 * @file interface-mode-advanced-start.ts
 * @copyright 2023, Firaxis Games
 * @description Advanced placement mode handler.
 */
import AdvancedStart from '/base-standard/ui/advanced-start/model-advanced-start.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
/**
 * Handler for INTERFACEMODE_ADVANCED_START.
 */
class AdvancedStartInterfaceMode {
    transitionTo(_oldMode, _newMode, _context) {
        // Do nothing.
    }
    transitionFrom(_oldMode, _newMode) {
        // Do nothing.
    }
    canEnterMode(_parameters) {
        // If placement is completed, there is no reason to enter this mode.
        if (!AdvancedStart.advancedStartClosed) {
            return true;
        }
        return false;
    }
    canLeaveMode(newMode) {
        // we're allowed to be interrupted by cinematics
        if (newMode == "INTERFACEMODE_CINEMATIC" || newMode == "INTERFACEMODE_BONUS_PLACEMENT") {
            return true;
        }
        if (AdvancedStart.advancedStartClosed) {
            return true;
        }
        return false;
    }
}
InterfaceMode.addHandler('INTERFACEMODE_ADVANCED_START', new AdvancedStartInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-advanced-start.js.map
