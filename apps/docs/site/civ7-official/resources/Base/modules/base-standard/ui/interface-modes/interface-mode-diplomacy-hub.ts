/**
 * @file interface-mode-diplomacy-hub.ts
 * @copyright 2021-2023, Firaxis Games
 * @description Interface mode to handle diplomacy hub where available diplomacy actions with another leader are displayed.
 */

import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import LensManager from '/core/ui/lenses/lens-manager.js'
import PlotCursor from '/core/ui/input/plot-cursor.js';

/**
 * Handler for INTERFACEMODE_DIPLOMACY_HUB.
 */
class DiplomacyHubInterfaceMode implements InterfaceMode.Handler {
	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, _context?: object) {
		LensManager.setActiveLens('fxs-diplomacy-lens');
		PlotCursor.hideCursor();
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		PlotCursor.showCursor();
	}
}

InterfaceMode.addHandler('INTERFACEMODE_DIPLOMACY_HUB', new DiplomacyHubInterfaceMode());