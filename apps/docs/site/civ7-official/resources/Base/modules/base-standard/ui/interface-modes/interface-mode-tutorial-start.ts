/**
 * @file interface-mode-tutorial-start.ts
 * @copyright 2023, Firaxis Games
 * @description Handles the start of a game when using a tutorial's
 */

import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';


/**
 * Handler for INTERFACEMODE_TUTORIAL_START.
 */
class TutorialStartInterfaceMode implements InterfaceMode.Handler {

	/** Handle a transition from a different mode to the currently registered mode. */
	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId): void {
	}

	/** Handle a transition going from the currently registered interface mode to a different mode. */
	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId): void {
	}

}

InterfaceMode.addHandler('INTERFACEMODE_TUTORIAL_START', new TutorialStartInterfaceMode());