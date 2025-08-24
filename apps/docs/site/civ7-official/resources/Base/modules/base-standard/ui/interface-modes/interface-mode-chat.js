/**
 * @file interface-mode-chat.ts
 * @copyright 2023, Firaxis Games
 * @description Chat interface mode handler.
 */
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
/**
 * Handler for INTERFACEMODE_CHAT
 */
class ChatInterfaceMode {
    transitionTo(_oldMode, _newMode, _context) {
        // Do nothing.
    }
    transitionFrom(_oldMode, _newMode) {
        // Do nothing.
    }
}
InterfaceMode.addHandler('INTERFACEMODE_CHAT', new ChatInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-chat.js.map
