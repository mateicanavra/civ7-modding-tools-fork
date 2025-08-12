/**
 * @file hexgrid-layer
 * @copyright 2022-2024, Firaxis Games
 * @description Lens layer that displays the hex grid for the map
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
const hexGridColor = 0x60000000;
class HexGridLensLayer {
    constructor() {
        this.group = WorldUI.createOverlayGroup("HexGirdLensLayerGroup", OVERLAY_PRIORITY.HEX_GRID);
        this.overlay = this.group.addHexGridOverlay();
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    }
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
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-grid-layer') {
            LensManager.toggleLayer('fxs-hexgrid-layer');
        }
    }
}
LensManager.registerLensLayer('fxs-hexgrid-layer', new HexGridLensLayer());

//# sourceMappingURL=file:///base-standard/ui/lenses/layer/hexgrid-layer.js.map
