/**
 * @file interface-mode-focused-attack-land-melee.ts
 * @copyright 2024, Firaxis Games
 */

import FocusedAttackBaseInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-focused-attack-base.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'

/**
 * Handler for INTERFACEMODE_FOCUSED_ATTACK_LAND_MELEE.
 */
class FocusedAttackLandMeleeInterfaceMode extends FocusedAttackBaseInterfaceMode {

	initialize() {
		this.commandName = 'UNITCOMMAND_FOCUSED_ATTACK_LAND_MELEE';
		return super.initialize();
	}
}

InterfaceMode.addHandler('INTERFACEMODE_FOCUSED_ATTACK_LAND_MELEE', new FocusedAttackLandMeleeInterfaceMode());