/**
 * @file interface-mode-cinematic.ts
 * @copyright 2021-2025, Firaxis Games
 * @description Cinematic interface mode handler.
 */

import ContextManager from '/core/ui/context-manager/context-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import PlotCursor from '/core/ui/input/plot-cursor.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import CinematicManager from '/base-standard/ui/cinematic/cinematic-manager.js';
import * as Civilopedia from '/base-standard/ui/civilopedia/model-civilopedia.js';

/**
 * Handler for INTERFACEMODE_CINEMATIC.
 */
class CinematicInterfaceMode implements InterfaceMode.Handler {
	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, _context?: object) {
		LensManager.setActiveLens('fxs-cinematic-lens');
		PlotCursor.hideCursor();
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		PlotCursor.showCursor();
	}

	canLeaveMode(_newMode: InterfaceMode.ModeId): boolean {
		// don't allow mode switches until the user exits the screen
		if (CinematicManager.isMovieInProgress()) {
			return false;
		}

		if (Civilopedia.instance.isOpen && ContextManager.hasInstanceOf("screen-civilopedia")) {
			return false;
		}

		return true;
	}
}

InterfaceMode.addHandler('INTERFACEMODE_CINEMATIC', new CinematicInterfaceMode());