/**
 * @file interface-mode-bonus-placement.ts
 * @copyright 2023, Firaxis Games
 * @description Bonus placement mode handler.
 */
import AdvancedStart from '/base-standard/ui/advanced-start/model-advanced-start.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
/**
 * Handler for INTERFACEMODE_BONUS_PLACEMENT.
 */
class BonusPlacementInterfaceMode {
    constructor() {
        this.previousLens = 'fxs-default-lens';
    }
    transitionTo(_oldMode, _newMode, _context) {
        this.previousLens = LensManager.getActiveLens();
        LensManager.setActiveLens("fxs-settler-lens");
    }
    transitionFrom(_oldMode, _newMode) {
        LensManager.setActiveLens(this.previousLens);
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
        if (newMode == "INTERFACEMODE_CINEMATIC" || newMode == "INTERFACEMODE_ADVANCED_START") {
            return true;
        }
        if (AdvancedStart.advancedStartClosed) {
            return true;
        }
        return false;
    }
}
InterfaceMode.addHandler('INTERFACEMODE_BONUS_PLACEMENT', new BonusPlacementInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-bonus-placement.js.map
