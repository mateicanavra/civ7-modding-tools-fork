/**
 * @file interface-mode-diplomacy-project-reaction.ts
 * @copyright 2023, Firaxis Games
 * @description Interface mode to handle diplomacy project reactions.
 */
import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import PlotCursor from '/core/ui/input/plot-cursor.js';
/**
 * Handler for INTERFACEMODE_DIPLOMACY_PROJECT_REACTION.
 */
class DiplomacyProjectReactionInterfaceMode {
    transitionTo(_oldMode, _newMode, _context) {
        LensManager.setActiveLens('fxs-diplomacy-lens');
        PlotCursor.hideCursor();
    }
    transitionFrom(_oldMode, _newMode) {
        if (!DisplayQueueManager.isSuspended()) {
            DiplomacyManager.currentProjectReactionData = null;
        }
        PlotCursor.showCursor();
    }
    canLeaveMode(_newMode) {
        return true;
    }
}
InterfaceMode.addHandler('INTERFACEMODE_DIPLOMACY_PROJECT_REACTION', new DiplomacyProjectReactionInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-diplomacy-project-reaction.js.map
