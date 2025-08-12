/**
 * @file interface-mode-coordinated-attack.ts
 * @copyright 2021, Firaxis Games
 */
import FocusedAttackBaseInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-focused-attack-base.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
/**
 * Handler for INTERFACEMODE_FOCUSED_AIR_BOMB.
 */
class FocusedAttackAirBombInterfaceMode extends FocusedAttackBaseInterfaceMode {
    initialize() {
        this.commandName = 'UNITCOMMAND_FOCUSED_ATTACK_AIR_BOMB';
        return super.initialize();
    }
}
InterfaceMode.addHandler('INTERFACEMODE_FOCUSED_ATTACK_AIR_BOMB', new FocusedAttackAirBombInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-focused-attack-air-bomb.js.map
