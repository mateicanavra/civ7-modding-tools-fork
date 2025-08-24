/**
 * @file interface-mode-coastal-raid.ts
 * @copyright 2024, Firaxis Games
 */
import PillageBaseInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-pillage-base.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
/**
 * Handler for INTERFACEMODE_COASTAL_RAID.
 */
class CoastalRaidInterfaceMode extends PillageBaseInterfaceMode {
    initialize() {
        this.operationName = 'UNITOPERATION_COASTAL_RAID';
        return super.initialize();
    }
}
InterfaceMode.addHandler('INTERFACEMODE_COASTAL_RAID', new CoastalRaidInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-coastal-raid.js.map
