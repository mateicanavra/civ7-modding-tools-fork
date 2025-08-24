/**
 * @file age-progression-warning-popup-manager.ts
 * @copyright 2025, Firaxis Games
 * @description Manages age progression popups that warn the player that the age is almost over
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { DisplayHandlerBase } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
export const AgeProgressionMiniBannerShowEventName = 'age-progression-mini-banner-show';
export class AgeProgressionMiniBannerShowEvent extends CustomEvent {
    constructor(numTurns) {
        super(AgeProgressionMiniBannerShowEventName, { bubbles: false, cancelable: true, detail: { numTurns } });
    }
}
class AgeProgressionPopupManagerClass extends DisplayHandlerBase {
    get currentAgeProgressionPopupData() {
        return this._currentAgeProgressionPopupData;
    }
    constructor() {
        //make sure this shows up last
        super("AgeProgressionPopup", 999999999);
        this.onAgeProgressionListener = this.onAgeProgression.bind(this);
        this._ageCountdownTimerValue = -1;
        this._currentAgeProgressionPopupData = null;
        this.closePopup = () => {
            if (this.currentAgeProgressionPopupData) {
                DisplayQueueManager.close(this.currentAgeProgressionPopupData);
            }
        };
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
    show(request) {
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
    hide(_request, _options) {
        this._currentAgeProgressionPopupData = null;
        if (ContextManager.hasInstanceOf("panel-age-progression-warning-popup")) {
            ContextManager.pop("panel-age-progression-warning-popup");
        }
    }
    onAgeProgression() {
        const ageCountdownStarted = Game.AgeProgressManager.ageCountdownStarted;
        if (ageCountdownStarted) {
            if (ContextManager.shouldShowPopup(GameContext.localPlayerID)) {
                const curAgeProgress = Game.AgeProgressManager.getCurrentAgeProgressionPoints();
                const maxAgeProgress = Game.AgeProgressManager.getMaxAgeProgressionPoints();
                const ageProgressionPopupData = {
                    category: this.getCategory(),
                    turnsRemaining: maxAgeProgress - curAgeProgress
                };
                if (this._currentAgeProgressionPopupData) {
                    //flush out all queued "x turns remaining messages" so we don't get a bunch that play out in a row when people try speedrunning
                    DisplayQueueManager.closeMatching(this.getCategory());
                }
                this.addDisplayRequest(ageProgressionPopupData);
            }
        }
    }
}
AgeProgressionPopupManagerClass.instance = null;
const AgeProgressionPopupManager = new AgeProgressionPopupManagerClass();
export { AgeProgressionPopupManager as default };
DisplayQueueManager.registerHandler(AgeProgressionPopupManager);

//# sourceMappingURL=file:///base-standard/ui/age-progression-warning-popup/age-progression-warning-popup-manager.js.map
