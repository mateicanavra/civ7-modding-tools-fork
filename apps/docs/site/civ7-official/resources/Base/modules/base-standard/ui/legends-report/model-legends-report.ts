/**
 * model-legends-report.ts
 * @copyright 2024, Firaxis Games
 * @description Data model for legend progress and challenge information
 */

import UpdateGate from '/core/ui/utilities/utilities-update-gate.js'
import LegendsManager, { LegendsData } from '/base-standard/ui/legends-manager/legends-manager.js';

class LegendsReportModel {

	legendsData: LegendsData | null = null;

	_showRewards: boolean = false;

	private onUpdate?: (model: LegendsReportModel) => void;

	constructor() {
		this.updateGate.call('LegendsReportModel:constructor');
	}

	get showRewards(): boolean {
		return this._showRewards;
	}

	set showRewards(shouldShowRewards: boolean) {
		this._showRewards = shouldShowRewards;
		this.updateGate.call('LegendsReportModel:set showRewards');
	}

	set updateCallback(callback: (model: LegendsReportModel) => void) {
		this.onUpdate = callback;
	}

	private updateGate = new UpdateGate(() => {

		this.legendsData = LegendsManager.getData();

		this.onUpdate?.(this);
	});
}

const LegendsReport = new LegendsReportModel();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(LegendsReport);
	}

	engine.createJSModel('g_LegendsReportModel', LegendsReport);
	LegendsReport.updateCallback = updateModel;
});

export { LegendsReport as default };