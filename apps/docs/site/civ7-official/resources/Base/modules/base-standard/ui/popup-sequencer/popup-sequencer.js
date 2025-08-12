/**
 * @file popup-sequencer.ts
 * @copyright 2025, Firaxis Games
 * @description Provides a lightweight interface to the Display Queue so that simple popups can participate.
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { DisplayHandlerBase } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
class PopupSequencerClass extends DisplayHandlerBase {
    constructor() {
        super("PopupSequencer", 6000);
        this.currentPopupData = null;
        this.closePopup = (screenId) => {
            if (this.currentPopupData && this.currentPopupData.screenId == screenId) {
                DisplayQueueManager.close(this.currentPopupData);
            }
            else {
                if (this.currentPopupData) {
                    console.error(`PopupSquencer: tried to close ${screenId}, but topmost screen is ${this.currentPopupData.screenId}`);
                }
            }
            this.currentPopupData = null;
        };
        if (PopupSequencerClass.instance) {
            console.error("Only one instance of the PopupSequencerClass can exist at a time!");
        }
        PopupSequencerClass.instance = this;
        this.currentPopupData = null;
    }
    isShowing() {
        if (this.currentPopupData) {
            return ContextManager.hasInstanceOf(this.currentPopupData.screenId);
        }
        return false;
    }
    /**
      * @implements {IDisplayQueue}
      */
    show(request) {
        this.currentPopupData = request;
        if (request.showCallback) {
            request.showCallback(request.userData);
        }
        ContextManager.push(request.screenId, request.properties);
    }
    /**
      * @implements {IDisplayQueue}
      */
    hide(_request, _options) {
        ContextManager.pop(this.currentPopupData?.screenId);
        this.currentPopupData = null;
        if (DisplayQueueManager.findAll(this.getCategory()).length === 1) {
            this.currentPopupData = null;
        }
    }
}
PopupSequencerClass.instance = null;
const PopupSequencer = new PopupSequencerClass();
export { PopupSequencer as default };
DisplayQueueManager.registerHandler(PopupSequencer);

//# sourceMappingURL=file:///base-standard/ui/popup-sequencer/popup-sequencer.js.map
