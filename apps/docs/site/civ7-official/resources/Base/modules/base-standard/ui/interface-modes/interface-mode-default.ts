/**
 * @file interface-mode-default.ts
 * @copyright 2021 - 2023, Firaxis Games
 * @description Default interface mode handler.
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import LensManager from '/core/ui/lenses/lens-manager.js'

/**
 * Handler for INTERFACEMODE_DEFAULT.
 */
class DefaultInterfaceMode implements InterfaceMode.Handler {
	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, _context?: object) {
		UI.Player.deselectAllUnits();
		UI.Player.deselectAllCities();

		LensManager.setActiveLens('fxs-default-lens');
		FocusManager.SetWorldFocused();
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		// Do nothing.
	}

	allowsHotKeys(): boolean {
		return true;
	}
}

InterfaceMode.addHandler('INTERFACEMODE_DEFAULT', new DefaultInterfaceMode());