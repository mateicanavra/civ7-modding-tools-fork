/**
 * @file interface-mode-resource-allocation.ts
 * @copyright 2022, Firaxis Games
 * @description Interface mode to handle resource allocation
 */
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
class ResourceAllocationInterfaceMode {
    /** @interface Handler */
    transitionTo(_oldMode, _newMode, _context) {
    }
    /** @interface Handler */
    transitionFrom(_oldMode, _newMode) {
    }
    /** @interface Handler  */
    canEnterMode(_parameters) {
        return true;
    }
    /** @interface Handler  */
    canLeaveMode(_newMode) {
        return true;
    }
}
InterfaceMode.addHandler('INTERFACEMODE_RESOURCE_ALLOCATION', new ResourceAllocationInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-resource-allocation.js.map
