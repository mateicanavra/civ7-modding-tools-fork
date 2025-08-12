/**
 * @file trade-layer
 * @copyright 2024, Firaxis Games
 * @description Lens layer that displays trade information
 */
import { TradeRoutesModel } from '/base-standard/ui/trade-route-chooser/trade-routes-model.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
const TRADE_RANGE_OUT_OF_RANGE_COLOR = 0x550000cd;
const TRADE_RANGE_AVAILABLE_COLOR = 0x5500cd00;
class TradeLensLayer {
    constructor() {
        this.tradeRangeOverlayGroup = WorldUI.createOverlayGroup("ContinentOverlayGroup", OVERLAY_PRIORITY.CONTINENT_LENS);
        this.tradeRangeOverlay = this.tradeRangeOverlayGroup.addPlotOverlay();
    }
    initLayer() { }
    initCities() {
        const routes = TradeRoutesModel.calculateProjectedTradeRoutes();
        // TODO: Calculate out of range map plots on the backend, and add them here
        const outOfRangePlots = [];
        const availableCities = [];
        for (const route of routes) {
            const cityPlots = route.city.getPurchasedPlots();
            if (cityPlots.length == 0) {
                cityPlots.push(route.cityPlotIndex);
            }
            for (const cityPlotIndex of cityPlots) {
                if (route.status === TradeRouteStatus.SUCCESS) {
                    availableCities.push(cityPlotIndex);
                }
                else {
                    outOfRangePlots.push(cityPlotIndex);
                }
            }
            this.tradeRangeOverlayGroup.setVisible(false);
            this.tradeRangeOverlay.clear();
            this.tradeRangeOverlay.addPlots(outOfRangePlots, { fillColor: TRADE_RANGE_OUT_OF_RANGE_COLOR });
            this.tradeRangeOverlay.addPlots(availableCities, { fillColor: TRADE_RANGE_AVAILABLE_COLOR });
        }
    }
    applyLayer() {
        this.initCities();
        this.tradeRangeOverlayGroup.setVisible(true);
        ContextManager.push("trade-route-chooser", { singleton: true });
    }
    removeLayer() {
        this.tradeRangeOverlayGroup.setVisible(false);
        ContextManager.pop("trade-route-chooser");
    }
}
LensManager.registerLensLayer('fxs-trade-layer', new TradeLensLayer());

//# sourceMappingURL=file:///base-standard/ui/lenses/layer/trade-layer.js.map
