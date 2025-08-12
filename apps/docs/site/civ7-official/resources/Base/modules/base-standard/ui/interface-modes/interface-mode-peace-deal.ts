/**
 * @file interface-mode-peace-deal
 * @copyright 2023, Firaxis Games
 * @description Interface mode to handle diplomacy peace deals.
 */

import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import LensManager from '/core/ui/lenses/lens-manager.js'
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';

/**
 * Handler for INTERFACEMODE_PEACE_DEAL.
 */
class PeaceDealInterfaceMode implements InterfaceMode.Handler {
	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, _context?: object) {
		LensManager.setActiveLens('fxs-diplomacy-lens');
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		// Do nothing.
	}

	canLeaveMode(_newMode: InterfaceMode.ModeId): boolean {
		if (DisplayQueueManager.isSuspended() || DiplomacyManager.currentDiplomacyDealData == null) {
			return true;
		}
		return false;
	}
}

InterfaceMode.addHandler('INTERFACEMODE_PEACE_DEAL', new PeaceDealInterfaceMode());