/**
 * @file interface-mode-coordinated-attack.ts
 * @copyright 2021, Firaxis Games
 */

import FocusedAttackBaseInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-focused-attack-base.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'

/**
 * Handler for INTERFACEMODE_FOCUSED_AIR_TO_AIR.
 */
class FocusedAttackAirToAirInterfaceMode extends FocusedAttackBaseInterfaceMode {

	initialize() {
		this.commandName = 'UNITCOMMAND_FOCUSED_ATTACK_AIR_TO_AIR';
		return super.initialize();
	}
}

InterfaceMode.addHandler('INTERFACEMODE_FOCUSED_ATTACK_AIR_TO_AIR', new FocusedAttackAirToAirInterfaceMode());