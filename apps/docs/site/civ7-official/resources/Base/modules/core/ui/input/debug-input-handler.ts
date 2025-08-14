/**
 * @file debug-input-handler
 * @copyright 2021, Firaxis Games
 * @description Handle debug input such as the tuner.
 */
import Cursor from '/core/ui/input/cursor.js'


class DebugInputSingleton {
	sendTunerActionA(): boolean {
		if (!UI.isInGame()) {
			return true;
		}
		const plotCoords: PlotCoord | null = Camera.pickPlotFromPoint(Cursor.position.x, Cursor.position.y);
		if (plotCoords) {
			return window.dispatchEvent(new CustomEvent('tuner-user-action-a', { cancelable: true, detail: { plotCoords: plotCoords } }));
		}
		return true;
	}

	sendTunerActionB(): boolean {
		if (!UI.isInGame()) {
			return true;
		}
		const plotCoords: PlotCoord | null = Camera.pickPlotFromPoint(Cursor.position.x, Cursor.position.y);
		if (plotCoords) {
			return window.dispatchEvent(new CustomEvent('tuner-user-action-b', { cancelable: true, detail: { plotCoords: plotCoords } }));
		}
		return true;
	}
}

const DebugInput = new DebugInputSingleton();
export { DebugInput as default };
