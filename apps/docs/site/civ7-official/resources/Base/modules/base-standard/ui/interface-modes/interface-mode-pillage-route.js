/**
 * @file interface-mode-pillage-route.ts
 * @copyright 2024, Firaxis Games
 */
import PillageBaseInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-pillage-base.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
/**
 * Handler for INTERFACEMODE_PILLAGE_ROUTE.
 */
class PillageRouteInterfaceMode extends PillageBaseInterfaceMode {
    initialize() {
        this.operationName = 'UNITOPERATION_PILLAGE_ROUTE';
        return super.initialize();
    }
}
InterfaceMode.addHandler('INTERFACEMODE_PILLAGE_ROUTE', new PillageRouteInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-pillage-route.js.map
