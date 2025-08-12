/**
 * @file interface-mode-resource-allocation.ts
 * @copyright 2022, Firaxis Games
 * @description Interface mode to handle resource allocation
 */

import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'

class ResourceAllocationInterfaceMode implements InterfaceMode.Handler {

	/** @interface Handler */
	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, _context?: object) {

	}

	/** @interface Handler */
	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {

	}

	/** @interface Handler  */
	canEnterMode(_parameters: any): boolean {
		return true;
	}

	/** @interface Handler  */
	canLeaveMode(_newMode: InterfaceMode.ModeId): boolean {
		return true;
	}
}

InterfaceMode.addHandler('INTERFACEMODE_RESOURCE_ALLOCATION', new ResourceAllocationInterfaceMode());