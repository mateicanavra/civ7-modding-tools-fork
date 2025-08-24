/**
 * @file age-progression-warning-popup-manager.ts
 * @copyright 2025, Firaxis Games
 * @description Manages age progression popups that warn the player that the age is almost over
 */

import ContextManager from '/core/ui/context-manager/context-manager.js';
import { DisplayHandlerBase, DisplayHideOptions, IDisplayRequestBase } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';

export interface AgeProgressionPopupData extends IDisplayRequestBase {
	turnsRemaining: number;
}

export const AgeProgressionMiniBannerShowEventName = 'age-progression-mini-banner-show';
export class AgeProgressionMiniBannerShowEvent extends CustomEvent<{ numTurns: number }> {
	constructor(numTurns: number) {
		super(AgeProgressionMiniBannerShowEventName, { bubbles: false, cancelable: true, detail: { numTurns } });
	}
}

class AgeProgressionPopupManagerClass extends DisplayHandlerBase<AgeProgressionPopupData> {
	private static instance: AgeProgressionPopupManagerClass | null = null;

	private onAgeProgressionListener = this.onAgeProgression.bind(this);

	private _ageCountdownTimerValue: number = -1;
	private _currentAgeProgressionPopupData: AgeProgressionPopupData | null = null;

	get currentAgeProgressionPopupData(): AgeProgressionPopupData | null {
		return this._currentAgeProgressionPopupData;
	}

	constructor() {
		//make sure this shows up last
		super("AgeProgressionPopup", 999999999);

		if (AgeProgressionPopupManagerClass.instance) {
			console.error("Only one instance of the AgeProgressionPopup manager class can exist at a time!");
		}
		AgeProgressionPopupManagerClass.instance = this;

		this._ageCountdownTimerValue = Game.AgeProgressManager.getAgeCountdownLength;

		engine.on("AgeProgressionChanged", this.onAgeProgressionListener);
	}

	/**
	  * @implements {IDisplayQueue}
	  */
	show(request: AgeProgressionPopupData): void {
		this._currentAgeProgressionPopupData = request;
		if (this._ageCountdownTimerValue == request.turnsRemaining && this._ageCountdownTimerValue != 0) {
			ContextManager.push("panel-age-progression-warning-popup", { createMouseGuard: true, singleton: true });
		}
		else if (this._ageCountdownTimerValue > request.turnsRemaining) {
			window.dispatchEvent(new AgeProgressionMiniBannerShowEvent(request.turnsRemaining));
		}
	}

	/**
	  * @implements {IDisplayQueue}
	  */
	hide(_request: AgeProgressionPopupData, _options?: DisplayHideOptions): void {
		this._currentAgeProgressionPopupData = null;
		if (ContextManager.hasInstanceOf("panel-age-progression-warning-popup")) {
			ContextManager.pop("panel-age-progression-warning-popup");
		}
	}

	private onAgeProgression() {
		const ageCountdownStarted: boolean = Game.AgeProgressManager.ageCountdownStarted;
		if (ageCountdownStarted) {
			if (ContextManager.shouldShowPopup(GameContext.localPlayerID)) {
				const curAgeProgress: number = Game.AgeProgressManager.getCurrentAgeProgressionPoints();
				const maxAgeProgress: number = Game.AgeProgressManager.getMaxAgeProgressionPoints();
				const ageProgressionPopupData: AgeProgressionPopupData = {
					category: this.getCategory(),
					turnsRemaining: maxAgeProgress - curAgeProgress
				}
				if (this._currentAgeProgressionPopupData) {
					//flush out all queued "x turns remaining messages" so we don't get a bunch that play out in a row when people try speedrunning
					DisplayQueueManager.closeMatching(this.getCategory());
				}
				this.addDisplayRequest(ageProgressionPopupData);
			}
		}
	}

	closePopup = () => {
		if (this.currentAgeProgressionPopupData) {
			DisplayQueueManager.close(this.currentAgeProgressionPopupData);
		}
	}
}

const AgeProgressionPopupManager = new AgeProgressionPopupManagerClass();
export { AgeProgressionPopupManager as default };

DisplayQueueManager.registerHandler(AgeProgressionPopupManager);