/**
 * @file interface-mode-diplomacy-dialog.ts
 * @copyright 2021-2023, Firaxis Games
 * @description Interface mode to handle diplomacy dialogs.
 */

import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import LensManager from '/core/ui/lenses/lens-manager.js'
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import PlotCursor from '/core/ui/input/plot-cursor.js';

/**
 * Handler for INTERFACEMODE_DIPLOMACY_DIALOG.
 */
class DiplomacyDialogInterfaceMode implements InterfaceMode.Handler {
	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, _context?: object) {
		LensManager.setActiveLens('fxs-diplomacy-lens');
		PlotCursor.hideCursor();
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		PlotCursor.showCursor();
	}

	canLeaveMode(_newMode: InterfaceMode.ModeId): boolean {
		if (DisplayQueueManager.isSuspended() || DiplomacyManager.isEmpty()) {
			return true;
		}
		return false;
	}
}

InterfaceMode.addHandler('INTERFACEMODE_DIPLOMACY_DIALOG', new DiplomacyDialogInterfaceMode());