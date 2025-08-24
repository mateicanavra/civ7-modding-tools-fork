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
class AdvancedStartInterfaceMode implements InterfaceMode.Handler {
	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, _context?: object) {
		// Do nothing.
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		// Do nothing.
	}

	canEnterMode(_parameters: any): boolean {
		// If placement is completed, there is no reason to enter this mode.
		if (!AdvancedStart.advancedStartClosed) {
			return true;
		}

		return false;
	}

	canLeaveMode(newMode: InterfaceMode.ModeId): boolean {
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