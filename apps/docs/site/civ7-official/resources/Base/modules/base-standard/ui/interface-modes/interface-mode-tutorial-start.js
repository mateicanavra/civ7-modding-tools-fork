/**
 * @file interface-mode-tutorial-start.ts
 * @copyright 2023, Firaxis Games
 * @description Handles the start of a game when using a tutorial's
 */
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
/**
 * Handler for INTERFACEMODE_TUTORIAL_START.
 */
class TutorialStartInterfaceMode {
    /** Handle a transition from a different mode to the currently registered mode. */
    transitionTo(_oldMode, _newMode) {
    }
    /** Handle a transition going from the currently registered interface mode to a different mode. */
    transitionFrom(_oldMode, _newMode) {
    }
}
InterfaceMode.addHandler('INTERFACEMODE_TUTORIAL_START', new TutorialStartInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-tutorial-start.js.map
