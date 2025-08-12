/**
 * @file interface-mode-peace-deal
 * @copyright 2023, Firaxis Games
 * @description Interface mode to handle diplomacy peace deals.
 */
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
/**
 * Handler for INTERFACEMODE_PEACE_DEAL.
 */
class PeaceDealInterfaceMode {
    transitionTo(_oldMode, _newMode, _context) {
        LensManager.setActiveLens('fxs-diplomacy-lens');
    }
    transitionFrom(_oldMode, _newMode) {
        // Do nothing.
    }
    canLeaveMode(_newMode) {
        if (DisplayQueueManager.isSuspended() || DiplomacyManager.currentDiplomacyDealData == null) {
            return true;
        }
        return false;
    }
}
InterfaceMode.addHandler('INTERFACEMODE_PEACE_DEAL', new PeaceDealInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-peace-deal.js.map
