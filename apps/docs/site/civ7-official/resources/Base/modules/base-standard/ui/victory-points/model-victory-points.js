/**
 * model-victory-points.ts
 * @copyright 2024, Firaxis Games
 * @description Victory Points data model
 */
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import VictoryManager from '/base-standard/ui/victory-manager/victory-manager.js';
class VictoryPointsModel {
    constructor() {
        this.scoreData = [];
        this.highestScore = 1;
        this.updateGate = new UpdateGate(() => {
            this.scoreData = VictoryManager.processedScoreData;
            this.scoreData.sort((a, b) => {
                return b.totalAgeScore - a.totalAgeScore;
            });
            this.highestScore = VictoryManager.getHighestAmountOfLegacyEarned();
            if (this.onUpdate) {
                this.onUpdate(this);
            }
        });
        VictoryManager.victoryManagerUpdateEvent.on(this.onVictoryManagerUpdate.bind(this));
        this.updateGate.call('constructor');
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    onVictoryManagerUpdate() {
        this.updateGate.call('onVictoryManagerUpdate');
    }
    legacyTypeToBgColor(legacyType) {
        switch (legacyType) {
            case CardCategories.CARD_CATEGORY_SCIENTIFIC:
                return 'bg-victory-science';
            case CardCategories.CARD_CATEGORY_CULTURAL:
                return 'bg-victory-culture';
            case CardCategories.CARD_CATEGORY_MILITARISTIC:
                return 'bg-victory-military';
            case CardCategories.CARD_CATEGORY_ECONOMIC:
                return 'bg-victory-economic';
            default:
                return '';
        }
    }
    legacyTypeToVictoryType(legacyType) {
        switch (legacyType) {
            case CardCategories.CARD_CATEGORY_SCIENTIFIC:
                return 'VICTORY_CLASS_SCIENCE';
            case CardCategories.CARD_CATEGORY_CULTURAL:
                return 'VICTORY_CLASS_CULTURE';
            case CardCategories.CARD_CATEGORY_MILITARISTIC:
                return 'VICTORY_CLASS_MILITARY';
            case CardCategories.CARD_CATEGORY_ECONOMIC:
                return 'VICTORY_CLASS_ECONOMIC';
            default:
                return '';
        }
    }
}
const VictoryPoints = new VictoryPointsModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(VictoryPoints);
    };
    engine.createJSModel('g_VictoryPoints', VictoryPoints);
    VictoryPoints.updateCallback = updateModel;
});
export { VictoryPoints as default };

//# sourceMappingURL=file:///base-standard/ui/victory-points/model-victory-points.js.map
