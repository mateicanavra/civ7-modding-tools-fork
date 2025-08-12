/**
 * model-age-summary-hub.ts
 * @copyright 2024, Firaxis Games
 * @description Age Summary data model
 */
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
class AgeSummaryModel {
    constructor() {
        this.ageName = "";
        this.ageData = [];
        this.selectedAgeType = "";
        this.selectedAgeChangedEvent = new LiteEvent();
        this.updateGate = new UpdateGate(() => {
            // Current Age
            const currentAge = GameInfo.Ages.lookup(Game.age);
            if (!currentAge) {
                console.error(`model-age-summary-hub: Failed to get current age for hash ${Game.age}`);
                return;
            }
            const currentAgeChronoIndex = currentAge.ChronologyIndex;
            for (const age of GameInfo.Ages) {
                if (age.$hash == currentAge.$hash) {
                    this.ageName = Locale.compose('LOC_AGE_BANNER_TEXT_TOP', age.Name);
                }
                const ageData = {
                    name: age.Name,
                    type: age.AgeType,
                    isCurrent: age.$hash == Game.age,
                    isSelected: false,
                    isDisabled: age.ChronologyIndex > currentAgeChronoIndex
                };
                this.ageData.push(ageData);
            }
            if (this.onUpdate) {
                this.onUpdate(this);
            }
        });
        this.updateGate.call('constructor');
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    selectAgeType(type) {
        for (const age of this.ageData) {
            age.isSelected = type == age.type;
            if (age.isSelected) {
                this.selectedAgeType = age.type;
                this.selectedAgeChangedEvent.trigger(age.type);
            }
        }
    }
    selectCurrentAge() {
        const currentAge = GameInfo.Ages.lookup(Game.age);
        if (!currentAge) {
            console.error(`model-age-summary-hub: selectCurrentAge() Failed to get current age for hash ${Game.age}`);
            return;
        }
        this.selectAgeType(currentAge.AgeType);
    }
}
const AgeSummary = new AgeSummaryModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(AgeSummary);
    };
    engine.createJSModel('g_AgeSummary', AgeSummary);
    AgeSummary.updateCallback = updateModel;
});
export { AgeSummary as default };

//# sourceMappingURL=file:///base-standard/ui/age-summary/model-age-summary-hub.js.map
