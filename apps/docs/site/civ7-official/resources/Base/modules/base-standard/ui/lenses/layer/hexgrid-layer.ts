/**
 * @file hexgrid-layer
 * @copyright 2022-2024, Firaxis Games
 * @description Lens layer that displays the hex grid for the map
 */

import LensManager, { ILensLayer } from '/core/ui/lenses/lens-manager.js';
import { LayerHotkeyEvent } from '/core/ui/input/hotkey-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';

const hexGridColor = 0x60000000;

class HexGridLensLayer implements ILensLayer {

	private group: WorldUI.OverlayGroup = WorldUI.createOverlayGroup("HexGirdLensLayerGroup", OVERLAY_PRIORITY.HEX_GRID);
	private overlay: WorldUI.HexGridOverlay = this.group.addHexGridOverlay();

	private onLayerHotkeyListener = this.onLayerHotkey.bind(this);

	initLayer() {
		this.overlay.setColor(hexGridColor);

		window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
	}

	applyLayer() {
		this.group.setVisible(true);
	}

	removeLayer() {
		this.group.setVisible(false);
	}

	private onLayerHotkey(hotkey: LayerHotkeyEvent) {
		if (hotkey.detail.name == 'toggle-grid-layer') {
			LensManager.toggleLayer('fxs-hexgrid-layer');
		}
	}
}

declare global {
	interface LensLayerTypeMap {
		'fxs-hexgrid-layer': HexGridLensLayer
	}
}

LensManager.registerLensLayer('fxs-hexgrid-layer', new HexGridLensLayer());