/**
 * @file appeal-layer
 * @copyright 2022, Firaxis Games
 * @description Lens layer to show settling appeal of a plots
 */
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
const HexToFloat4 = (hex, alpha = 1) => {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    return { x: r / 255, y: g / 255, z: b / 255, w: Math.min(1, Math.max(0, alpha)) };
};
const SETTLEMENT_BLOCKED_COLOR = HexToFloat4(0x690909, .6);
const SETTLEMENT_OKAY_COLOR = HexToFloat4(0xB49E28, .6);
const SETTLEMENT_GOOD_COLOR = HexToFloat4(0x28EEBE, .45);
class AppealLensLayer {
    constructor() {
        this.cityAddedToMapListener = () => { this.onCityAddedToMap(); };
        this.appealOverlayGroup = WorldUI.createOverlayGroup("AppealOverlayGroup", OVERLAY_PRIORITY.SETTLER_LENS);
        this.appealOverlay = this.appealOverlayGroup.addPlotOverlay();
        this.blockedPlots = [];
        this.bestPlots = [];
        this.okayPlots = [];
    }
    clearOverlay() {
        this.appealOverlayGroup.clearAll();
        this.appealOverlay.clear();
        this.blockedPlots = [];
        this.bestPlots = [];
        this.okayPlots = [];
        engine.off('CityInitialized', this.cityAddedToMapListener);
    }
    initLayer() {
    }
    applyLayer() {
        this.clearOverlay();
        engine.on('CityInitialized', this.cityAddedToMapListener);
        const localPlayer = Players.get(GameContext.localPlayerID);
        const localPlayerDiplomacy = localPlayer?.Diplomacy;
        if (!localPlayerDiplomacy) {
            console.error("appeal-layer: Unable to find local player diplomacy!");
            return;
        }
        const isInPlacementMode = InterfaceMode.isInInterfaceMode("INTERFACEMODE_BONUS_PLACEMENT");
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const plotCoord = { x, y };
                if (isInPlacementMode) {
                    if (!GameplayMap.isPlotInAdvancedStartRegion(GameContext.localPlayerID, x, y)) {
                        this.blockedPlots.push(plotCoord);
                        continue;
                    }
                }
                // Not a valid land claim location
                if (!localPlayerDiplomacy.isValidLandClaimLocation(plotCoord, true)) {
                    if (GameplayMap.isWater(x, y)) {
                        continue;
                    }
                    this.blockedPlots.push(plotCoord);
                    continue;
                }
                // Too Close to Village -- DISABLE FOR NOW (EFB 3/7/23), may want to add non-colored UI overlay (such as Loyalty in VI)
                // const distanceToNearestIndependentPower: number = Game.IndependentPowers.getDistanceToNearestIndependent(plotCoord);
                // if (distanceToNearestIndependentPower <= this.villageLowerAffinityRange) {
                // 	this.okayPlots.push(plotCoord);
                // 	continue;
                // }
                if (GameplayMap.isFreshWater(x, y)) {
                    this.bestPlots.push(plotCoord);
                    continue;
                }
                this.okayPlots.push(plotCoord);
            }
        }
        this.appealOverlay.addPlots(this.blockedPlots, { fillColor: SETTLEMENT_BLOCKED_COLOR });
        this.appealOverlay.addPlots(this.bestPlots, { fillColor: SETTLEMENT_GOOD_COLOR });
        this.appealOverlay.addPlots(this.okayPlots, { fillColor: SETTLEMENT_OKAY_COLOR });
    }
    onCityAddedToMap() {
        this.applyLayer();
    }
    removeLayer() {
        this.clearOverlay();
    }
}
LensManager.registerLensLayer('fxs-appeal-layer', new AppealLensLayer());

//# sourceMappingURL=file:///base-standard/ui/lenses/layer/appeal-layer.js.map
