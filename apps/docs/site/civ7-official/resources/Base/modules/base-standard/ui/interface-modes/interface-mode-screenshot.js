/**
 * @file interface-mode-screenshot.ts
 * @copyright 2021, Firaxis Games
 * @description Cinematic interface mode handler.
 */
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
/**
 * Handler for INTERFACEMODE_SCREENSHOT.
 */
class ScreenshotInterfaceMode {
    transitionTo(_oldMode, _newMode, _context) {
        // Do nothing.
    }
    transitionFrom(_oldMode, _newMode) {
        // Do nothing.
    }
}
InterfaceMode.addHandler('INTERFACEMODE_SCREENSHOT', new ScreenshotInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-screenshot.js.map
