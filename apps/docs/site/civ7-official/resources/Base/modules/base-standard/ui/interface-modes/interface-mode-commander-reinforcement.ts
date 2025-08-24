/**
 * @file interface-mode-commander-reinforcement.ts
 * @copyright 2024, Firaxis Games
 * @description Interface mode to handle visualization on units reinforcing a commander
 */

import { ReinforcementMapDecorationSupport } from '/base-standard/ui/interface-modes/support-reinforcement-map-decoration.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';

export class CommanderReinforcementInterfaceMode implements InterfaceMode.Handler {

	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {

	}

	static updateDisplay(unitID: ComponentID, path: UnitGetPathToResults) {
		if (ComponentID.isValid(unitID) && path) {
			ReinforcementMapDecorationSupport.manager.updateVisualization(path);
		} else {
			console.error("Failed find a unit or path in CommanderReinforcementInterfaceMode.updateDisplay().");
		}
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		ReinforcementMapDecorationSupport.manager.deactivate();
	}
}

InterfaceMode.addHandler('INTERFACEMODE_COMMANDER_REINFORCEMENT', new CommanderReinforcementInterfaceMode());