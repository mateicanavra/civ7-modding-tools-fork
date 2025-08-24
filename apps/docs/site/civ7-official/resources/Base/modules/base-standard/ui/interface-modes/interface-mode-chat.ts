/**
 * @file interface-mode-chat.ts
 * @copyright 2023, Firaxis Games
 * @description Chat interface mode handler.
 */

import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'

/**
 * Handler for INTERFACEMODE_CHAT
 */
class ChatInterfaceMode implements InterfaceMode.Handler {
	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, _context?: object) {
		// Do nothing.
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		// Do nothing.
	}
}

InterfaceMode.addHandler('INTERFACEMODE_CHAT', new ChatInterfaceMode());