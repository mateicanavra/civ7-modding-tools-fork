/**
 * @file settlement-recommendations-layer.ts
 * @copyright 2024, Firaxis Games
 * @description Lens layer to recommended settlement locations for settler units
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
import PlotIconsManager from '/core/ui/plot-icons/plot-icons-manager.js';
// TODO: 3 is an arbitrary number of suggestions. Figure out a better way or what number of reccomendations we want.
const SETTLEMENT_RECCOMENDATION_COUNT = 3;
export class SettlementRecommendationsLayer {
    constructor() {
        this.settlementRecommendations = [];
    }
    initLayer() {
    }
    applyLayer() {
        const player = Players.get(GameContext.localPlayerID);
        if (!player) {
            console.error("settler-recommendations-layer: No player found with id", GameContext.localPlayerID);
            return;
        }
        this.settlementRecommendations = [];
        const plotIndexSet = new Set();
        const units = player.Units?.getUnits();
        if (units) {
            for (let i = 0; i < units.length; i++) {
                const { type, location } = units[i];
                const isSettlerUnit = GameInfo.Units.lookup(type)?.FoundCity;
                if (isSettlerUnit) {
                    const plotIndex = GameplayMap.getIndexFromLocation(location);
                    if (plotIndex >= 0) {
                        plotIndexSet.add(plotIndex);
                    }
                }
            }
        }
        const cities = player.Cities?.getCities();
        if (cities) {
            for (let i = 0; i < cities.length; i++) {
                const { location } = cities[i];
                const plotIndex = GameplayMap.getIndexFromLocation(location);
                if (plotIndex >= 0) {
                    plotIndexSet.add(plotIndex);
                }
            }
        }
        plotIndexSet.forEach((plotIndex) => {
            const location = GameplayMap.getLocationFromIndex(plotIndex);
            const suggestions = player.AI?.getBestSettleLocationsForSettler(SETTLEMENT_RECCOMENDATION_COUNT, location);
            if (suggestions) {
                suggestions.forEach((suggestion) => {
                    const suggestionPlotIndex = GameplayMap.getIndexFromLocation(location);
                    const isDuplicate = this.settlementRecommendations.some(existing => GameplayMap.getIndexFromLocation(existing.location) === suggestionPlotIndex);
                    if (!isDuplicate) {
                        this.settlementRecommendations.push(suggestion);
                        suggestion.factors.sort((a, b) => (a.positive && !b.positive ? -1 : 1));
                    }
                });
            }
        });
        this.settlementRecommendations.forEach(({ location }) => {
            PlotIconsManager.addPlotIcon('plot-icon-suggested-settlement', location);
        });
    }
    removeLayer() {
        PlotIconsManager.removePlotIcons('plot-icon-suggested-settlement');
    }
    getRecommendationResult(x, y) {
        return this.settlementRecommendations.find((recommendation) => recommendation.location.x === x && recommendation.location.y === y);
    }
}
SettlementRecommendationsLayer.instance = new SettlementRecommendationsLayer();
LensManager.registerLensLayer('fxs-settlement-recommendations-layer', SettlementRecommendationsLayer.instance);

//# sourceMappingURL=file:///base-standard/ui/lenses/layer/settlement-recommendations-layer.js.map
