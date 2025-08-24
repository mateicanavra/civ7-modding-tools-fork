/**
 * @file interface-mode-call-to-arms
 * @copyright 2023, Firaxis Games
 * @description Interface mode to ally call to arms.
 */

import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import LensManager from '/core/ui/lenses/lens-manager.js'

/**
 * Handler for INTERFACEMODE_CALL_TO_ARMS.
 */
class CallToArmsInterfaceMode implements InterfaceMode.Handler {
	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, _context?: object) {
		LensManager.setActiveLens('fxs-diplomacy-lens');
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		// Do nothing.
	}

	canLeaveMode(_newMode: InterfaceMode.ModeId): boolean {
		return true;
	}
}

InterfaceMode.addHandler('INTERFACEMODE_CALL_TO_ARMS', new CallToArmsInterfaceMode());