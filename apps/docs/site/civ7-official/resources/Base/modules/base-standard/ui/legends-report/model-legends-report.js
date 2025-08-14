/**
 * model-legends-report.ts
 * @copyright 2024, Firaxis Games
 * @description Data model for legend progress and challenge information
 */
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import LegendsManager from '/base-standard/ui/legends-manager/legends-manager.js';
class LegendsReportModel {
    constructor() {
        this.legendsData = null;
        this._showRewards = false;
        this.updateGate = new UpdateGate(() => {
            this.legendsData = LegendsManager.getData();
            this.onUpdate?.(this);
        });
        this.updateGate.call('LegendsReportModel:constructor');
    }
    get showRewards() {
        return this._showRewards;
    }
    set showRewards(shouldShowRewards) {
        this._showRewards = shouldShowRewards;
        this.updateGate.call('LegendsReportModel:set showRewards');
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
}
const LegendsReport = new LegendsReportModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(LegendsReport);
    };
    engine.createJSModel('g_LegendsReportModel', LegendsReport);
    LegendsReport.updateCallback = updateModel;
});
export { LegendsReport as default };

//# sourceMappingURL=file:///base-standard/ui/legends-report/model-legends-report.js.map
