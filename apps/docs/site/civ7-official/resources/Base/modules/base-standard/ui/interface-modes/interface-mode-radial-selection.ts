/**
 * @file interface-mode-radial-selection.ts
 * @copyright 2023, Firaxis Games
 * @description Interface mode to handle the radial selection 
 */

import ContextManager from '/core/ui/context-manager/context-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'


class RadialSelectionInterfaceMode implements InterfaceMode.Handler {

	transitionTo(_oldMode: string, _newMode: string, _context?: InterfaceMode.Context | undefined) {
		ContextManager.push("panel-radial-menu", { singleton: true, createMouseGuard: false });
	}

	transitionFrom(_oldMode: string, _newMode: string) {
		ContextManager.pop("panel-radial-menu");
	}
}

InterfaceMode.addHandler('INTERFACEMODE_RADIAL_SELECTION', new RadialSelectionInterfaceMode());