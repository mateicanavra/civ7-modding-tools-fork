/**
 * @file interface-mode-coordinated-attack.ts
 * @copyright 2021, Firaxis Games
 */
import FocusedAttackBaseInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-focused-attack-base.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
/**
 * Handler for INTERFACEMODE_FOCUSED_AIR_TO_LAND.
 */
class FocusedAttackAirToLandInterfaceMode extends FocusedAttackBaseInterfaceMode {
    initialize() {
        this.commandName = 'UNITCOMMAND_FOCUSED_ATTACK_AIR_TO_LAND';
        return super.initialize();
    }
}
InterfaceMode.addHandler('INTERFACEMODE_FOCUSED_ATTACK_AIR_TO_LAND', new FocusedAttackAirToLandInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-focused-attack-air-to-land.js.map
