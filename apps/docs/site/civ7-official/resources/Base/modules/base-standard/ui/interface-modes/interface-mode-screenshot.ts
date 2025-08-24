/**
 * @file interface-mode-screenshot.ts
 * @copyright 2021, Firaxis Games
 * @description Cinematic interface mode handler.
 */

import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'

/**
 * Handler for INTERFACEMODE_SCREENSHOT.
 */
class ScreenshotInterfaceMode implements InterfaceMode.Handler {
	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, _context?: object) {
		// Do nothing.
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		// Do nothing.
	}
}

InterfaceMode.addHandler('INTERFACEMODE_SCREENSHOT', new ScreenshotInterfaceMode());