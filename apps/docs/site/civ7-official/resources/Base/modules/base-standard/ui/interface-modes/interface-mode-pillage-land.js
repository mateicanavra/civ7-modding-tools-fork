/**
 * @file interface-mode-pillage-land.ts
 * @copyright 2024, Firaxis Games
 */
import PillageBaseInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-pillage-base.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
/**
 * Handler for INTERFACEMODE_PILLAGE.
 */
class PillageLandInterfaceMode extends PillageBaseInterfaceMode {
    initialize() {
        this.operationName = 'UNITOPERATION_PILLAGE';
        return super.initialize();
    }
}
InterfaceMode.addHandler('INTERFACEMODE_PILLAGE', new PillageLandInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-pillage-land.js.map
