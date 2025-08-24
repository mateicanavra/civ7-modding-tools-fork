/**
 * @file model-tutorial-inspector.ts
 * @copyright 2020-2022, Firaxis Games
 */

import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js'
import TutorialItem, { TutorialItemState } from '/base-standard/ui/tutorial/tutorial-item.js'


interface TutorialInspectorItem {
	ID: string;
	status: string;
	eState: TutorialItemState;
	isActive: boolean;
	isCompleted: boolean;
	hasEventListeners: boolean;
	activateLabel: string;
	index: number;
	calloutHiddenText: string;
}

class TutorialInspectorModel {

	private items: TutorialInspectorItem[] = [];
	private _OnUpdate?: (model: TutorialInspectorModel) => void;

	constructor() {
		engine.whenReady.then(() => {
			waitUntilValue(() => { return TutorialManager; }).then(() => {
				// Listen to any status events coming from the Tutorial Manager: 
				TutorialManager.statusChanged.on(() => {
					this.update();
				});
				this.update();
			});
		})
	}

	set updateCallback(callback: (model: TutorialInspectorModel) => void) {
		this._OnUpdate = callback;
	}

	/**
	 * Create a list of activating events as a string
	 * @param {TutorailItem} item 
	 * @returns {string} Comma separated list of events that will activate this tutorial item.
	 */
	private activatingEventsToString(item: TutorialItem): string {
		let events: string = "";
		item.activationEngineEvents.forEach((event) => {
			if (events.length > 0) events += ",";
			events += event;
		});
		item.activationCustomEvents.forEach((event) => {
			if (events.length > 0) events += ",";
			events += event;
		});
		return events;
	}

	update() {
		this.items = [];

		TutorialManager.items.forEach(item => {

			this.items.push({
				ID: item.skip ? `(${item.ID})` : item.ID,	// place in () if skipped
				eState: item.eState,
				isActive: item.isActive,
				isCompleted: item.isCompleted,
				status: TutorialItemState[item.eState],
				hasEventListeners: item.activationEngineEvents.length > 0,
				activateLabel: Locale.compose(this.activatingEventsToString(item)),
				index: this.items.length,
				calloutHiddenText: (item.isActive ? (item.isHidden ? "HIDDEN " : "VISIBLE") : "")
			})

		});

		if (this._OnUpdate) {
			this._OnUpdate(this);
		}
	}
}

const TutorialData = new TutorialInspectorModel();
engine.whenReady.then(() => {
	const updateModel = () => {
		engine.updateWholeModel(TutorialData);
	}
	engine.createJSModel('g_TutorialInspector', TutorialData);
	TutorialData.updateCallback = updateModel;
});

export { TutorialData as default };
