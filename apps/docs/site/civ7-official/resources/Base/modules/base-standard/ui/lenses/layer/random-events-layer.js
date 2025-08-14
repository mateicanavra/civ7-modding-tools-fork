/**
 * @file random-events-layer.ts
 * @copyright 2024, Firaxis Games
 * @description Lens layer to show tiles which are susceptible to random events like eruptions or floods
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
import PlotIconsManager from '/core/ui/plot-icons/plot-icons-manager.js';
export class RandomEventsLayer {
    constructor() {
        this.plotRandomEvents = [];
    }
    initLayer() {
    }
    applyLayer() {
        const player = Players.get(GameContext.localPlayerID);
        const playerDiplomacy = player?.Diplomacy;
        if (!playerDiplomacy) {
            console.error("random-events-layer: Unable to find local player diplomacy!");
            return;
        }
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const plotIndex = GameplayMap.getIndexFromXY(x, y);
                const canSufferEruption = MapFeatures.canSufferEruptionAt(plotIndex);
                const featureClassIndex = GameplayMap.getFeatureClassType(x, y);
                const isFloodPlains = GameInfo.FeatureClasses.lookup(featureClassIndex)?.FeatureClassType === 'FEATURE_CLASS_FLOODPLAIN';
                const location = { x, y };
                if (!playerDiplomacy.isValidLandClaimLocation(location, true) || GameplayMap.isWater(x, y)) {
                    continue;
                }
                if (canSufferEruption) {
                    this.plotRandomEvents.push({
                        location,
                        eventClass: 'CLASS_VOLCANO'
                    });
                }
                if (isFloodPlains) {
                    this.plotRandomEvents.push({
                        location,
                        eventClass: 'CLASS_FLOOD'
                    });
                }
            }
        }
        this.plotRandomEvents.forEach(({ location, eventClass }) => {
            const attributes = new Map([
                ['data-event-class', eventClass],
            ]);
            PlotIconsManager.addPlotIcon('plot-icon-random-event', location, attributes);
        });
    }
    removeLayer() {
        PlotIconsManager.removePlotIcons('plot-icon-random-event');
    }
    getRandomEventResult(x, y) {
        return this.plotRandomEvents.find((event) => event.location.x === x && event.location.y === y);
    }
}
RandomEventsLayer.instance = new RandomEventsLayer();
LensManager.registerLensLayer('fxs-random-events-layer', RandomEventsLayer.instance);

//# sourceMappingURL=file:///base-standard/ui/lenses/layer/random-events-layer.js.map
