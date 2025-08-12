/**
 * @file interface-mode-diplomacy-hub.ts
 * @copyright 2021-2023, Firaxis Games
 * @description Interface mode to handle diplomacy hub where available diplomacy actions with another leader are displayed.
 */
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import PlotCursor from '/core/ui/input/plot-cursor.js';
/**
 * Handler for INTERFACEMODE_DIPLOMACY_HUB.
 */
class DiplomacyHubInterfaceMode {
    transitionTo(_oldMode, _newMode, _context) {
        LensManager.setActiveLens('fxs-diplomacy-lens');
        PlotCursor.hideCursor();
    }
    transitionFrom(_oldMode, _newMode) {
        PlotCursor.showCursor();
    }
}
InterfaceMode.addHandler('INTERFACEMODE_DIPLOMACY_HUB', new DiplomacyHubInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-diplomacy-hub.js.map
